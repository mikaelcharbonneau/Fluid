import { createAdminClient } from "@/lib/supabase/admin";
import { generateReferenceCroquisBoard } from "@/lib/ai/sketch-board";
import { chosenBrandName } from "@/lib/brands";
import { startClock } from "@/lib/ai/budget";
import { normalizeMarkTypes, normalizeStandaloneStyles } from "@/lib/logo-styles";
import { BOARD_SIZE, planBoard, type LikedReference } from "@/lib/logo-board";
import { captionReferenceImage, readCaption, visualPrinciples } from "@/lib/ai/caption-reference";
import { referenceImageUrl } from "@/lib/logo-reference-query";
import {
  claimGenerationJob,
  completeGenerationJob,
  failGenerationJob,
  markProviderStarted,
  setGenerationProgress,
  type GenerationJob,
} from "./queue";

type BrandRecord = {
  id: string;
  user_id: string;
  brief: string | null;
  audience?: string | null;
  competitors?: string | null;
  name?: string | null;
  name_choice?: string | null;
  style_id?: string | null;
  data: Record<string, unknown> | null;
};

class NonRetryableGenerationError extends Error {}

function boardInput(value: unknown) {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const config = raw.config && typeof raw.config === "object" && !Array.isArray(raw.config)
    ? raw.config as Record<string, unknown>
    : {};
  return {
    markTypes: normalizeMarkTypes(config.mark_types),
    styles: normalizeStandaloneStyles(config.standalone_styles),
    instructions: typeof config.instructions === "string" ? config.instructions.trim().slice(0, 1_000) : "",
    reset: raw.reset === true,
  };
}

async function loadBrand(job: GenerationJob): Promise<BrandRecord> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("brands")
    .select("id, user_id, brief, audience, competitors, name, name_choice, style_id, data")
    .eq("id", job.brand_id)
    .eq("user_id", job.user_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new NonRetryableGenerationError("Brand no longer exists.");
  if (!String(data.brief ?? "").trim()) {
    throw new NonRetryableGenerationError("Add a brief before generating.");
  }
  return data as BrandRecord;
}

async function loadLikedReferences(data: Record<string, unknown>): Promise<LikedReference[]> {
  const likedPaths = Array.isArray(data.logo_reference_likes)
    ? data.logo_reference_likes.filter((item): item is string => typeof item === "string")
    : [];
  if (!likedPaths.length) return [];

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("logo_references")
    .select("image_path, caption")
    .in("image_path", likedPaths);
  if (error) throw new Error(error.message);
  const captions = new Map(
    ((rows ?? []) as { image_path: string; caption: unknown }[]).map((row) => [row.image_path, row.caption]),
  );
  return (await Promise.all(likedPaths.map(async (imagePath) => {
    let caption = readCaption(captions.get(imagePath));
    if (!caption?.visual_principles) {
      const refreshed = await captionReferenceImage(referenceImageUrl(imagePath)).catch(() => null);
      if (refreshed) {
        caption = refreshed;
        await admin
          .from("logo_references")
          .update({ caption: refreshed, updated_at: new Date().toISOString() })
          .eq("image_path", imagePath);
      }
    }
    return caption
      ? { imagePath, caption, visualPrinciples: visualPrinciples(caption) }
      : null;
  }))).filter((reference): reference is LikedReference => reference !== null);
}

async function runBoard(job: GenerationJob, brand: BrandRecord) {
  const data = brand.data ?? {};
  const input = boardInput(job.input);
  if (!input.markTypes.length) {
    throw new NonRetryableGenerationError("Choose a logo type before sketching concepts.");
  }

  const references = await loadLikedReferences(data);
  const savedOffset = Number(data.logo_reference_batch_offset);
  const batchOffset = input.reset || !Number.isInteger(savedOffset) || savedOffset < 0 ? 0 : savedOffset;
  const batch = references.slice(batchOffset, batchOffset + BOARD_SIZE);
  if (!batch.length) {
    throw new NonRetryableGenerationError("You've explored every liked reference.");
  }

  const clock = startClock("job/logo_board", 280_000);
  await markProviderStarted(job.id, "provider: board generation", 10);
  const slots = planBoard(input.styles, input.markTypes, batch, BOARD_SIZE);
  await setGenerationProgress(job.id, "rendering six reference-led croquis", 35);
  const drawn = await generateReferenceCroquisBoard({
    brandId: brand.id,
    brief: String(brand.brief),
    name: chosenBrandName(brand),
    slots,
    clock,
  });

  await setGenerationProgress(job.id, "saving concepts", 90);
  const admin = createAdminClient();
  const nextPatch = {
    logo_board: drawn,
    logo_board_likes: [],
    logo_reference_batch_offset: batchOffset + batch.length,
    logo_reference_batch_paths: batch.map((reference) => reference.imagePath),
    logo_board_config: {
      mark_types: input.markTypes,
      standalone_styles: input.styles,
      instructions: input.instructions || null,
    },
  };
  const { error } = await admin.rpc("brands_merge_data", { p_id: brand.id, p_patch: nextPatch });
  if (error) throw new Error(error.message);

  return {
    board: drawn,
    drawn: drawn.length,
    requested: slots.length,
    briefed: batch.length,
    batchOffset,
    remaining: Math.max(0, references.length - batchOffset - batch.length),
  };
}

function retryable(error: unknown, job: GenerationJob) {
  if (error instanceof NonRetryableGenerationError) return false;
  if (job.provider_started_at) return false;
  const message = error instanceof Error ? error.message : "";
  return !/missing|choose|add a brief|explored/i.test(message);
}

async function runJob(job: GenerationJob) {
  const brand = await loadBrand(job);
  return runBoard(job, brand);
}

export async function runOneGenerationJob() {
  const job = await claimGenerationJob();
  if (!job) return null;
  try {
    const result = await runJob(job);
    await completeGenerationJob(job.id, result);
    return { id: job.id, status: "succeeded" };
  } catch (error) {
    console.error(`Generation job ${job.id} failed:`, error);
    const admin = createAdminClient();
    const { data: latest } = await admin
      .from("generation_jobs")
      .select("provider_started_at")
      .eq("id", job.id)
      .maybeSingle();
    await failGenerationJob(
      job.id,
      error,
      retryable(error, { ...job, provider_started_at: latest?.provider_started_at ?? null }),
    );
    return { id: job.id, status: "failed" };
  }
}
