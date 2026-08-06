import { createAdminClient } from "@/lib/supabase/admin";
<<<<<<< HEAD
import { styleContext, delegatedChoices, getStep2, paletteBasis } from "@/lib/ai/step2";
import { researchCategory, getResearch } from "@/lib/ai/research";
import { generateCreativePlatform, getPlatform } from "@/lib/ai/platform";
import { generateLogoSketches, type LogoSketch } from "@/lib/ai/sketches";
import { generateLogoFinalists } from "@/lib/ai/refine";
import { chosenBrandName } from "@/lib/brands";
import { startClock } from "@/lib/ai/budget";
import { designStyleById, getLogoConfig, markTypeById, type LogoConfig } from "@/lib/logo-styles";
=======
import { generateReferenceCroquisBoard } from "@/lib/ai/sketch-board";
import { chosenBrandName } from "@/lib/brands";
import { startClock } from "@/lib/ai/budget";
import { normalizeMarkTypes, normalizeStandaloneStyles } from "@/lib/logo-styles";
import { BOARD_SIZE, planBoard, type LikedReference } from "@/lib/logo-board";
import { captionReferenceImage, readCaption, visualPrinciples } from "@/lib/ai/caption-reference";
import { referenceImageUrl } from "@/lib/logo-reference-query";
>>>>>>> 526f552e43aa092f99e217410cabf41e6b9dbf9f
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

<<<<<<< HEAD
function inputStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 20)
    : [];
}

function parseSketchConfig(value: unknown): LogoConfig {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const stringValue = (entry: unknown) => typeof entry === "string" ? entry.trim() : "";
  return {
    mark_type: markTypeById(stringValue(raw.mark_type))?.id ?? null,
    design_style: designStyleById(stringValue(raw.design_style))?.id ?? null,
    standalone_style: stringValue(raw.standalone_style).slice(0, 80) || null,
    instructions: stringValue(raw.instructions).slice(0, 1000) || null,
=======
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
>>>>>>> 526f552e43aa092f99e217410cabf41e6b9dbf9f
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

<<<<<<< HEAD
async function saveBrandData(brandId: string, data: Record<string, unknown>) {
  const admin = createAdminClient();
  const { error } = await admin.from("brands").update({ data }).eq("id", brandId);
  if (error) throw new Error(error.message);
}

async function runResearch(job: GenerationJob, brand: BrandRecord) {
  const data = brand.data ?? {};
  const cachedResearch = getResearch(data);
  const cachedPlatform = getPlatform(data);
  if (cachedResearch && cachedPlatform) {
    return { research: cachedResearch, platform: cachedPlatform, cached: true };
  }

  const clock = startClock("job/logo_research", 240_000);
  let research = cachedResearch;
  const brandName = chosenBrandName(brand);
  if (!research) {
    await markProviderStarted(job.id, "provider: category research", 15);
    try {
      research = await researchCategory(
        {
          brief: String(brand.brief),
          name: brandName,
          audience: brand.audience ?? null,
          competitors: brand.competitors ?? null,
          delegated: delegatedChoices(brand),
        },
        120_000,
      );
    } catch (error) {
      // Research improves the result but should not discard the whole job.
      console.error("Category research failed; continuing without it:", error);
      research = null;
    }
    clock.lap("research");
    if (research) await saveBrandData(brand.id, { ...data, research });
  }

  const context = styleContext(research ? { ...brand, data: { ...data, research } } : brand);
  let platform = cachedPlatform;
  if (!platform) {
    await markProviderStarted(job.id, "provider: creative platform", 70);
    clock.guard("write the creative platform", 60_000);
    platform = await generateCreativePlatform({
      brief: String(brand.brief),
      name: brandName,
      audience: brand.audience ?? null,
      competitors: brand.competitors ?? null,
      styleContext: context,
    });
  }
  await saveBrandData(brand.id, { ...data, ...(research ? { research } : {}), creative_platform: platform });
  return { research, platform };
}

async function runSketches(job: GenerationJob, brand: BrandRecord) {
  const data = brand.data ?? {};
  const config = parseSketchConfig(job.input.config);
  if (!config.mark_type) {
    throw new NonRetryableGenerationError("Choose a logo type before sketching concepts.");
  }
  const platform = getPlatform(data);
  if (!platform) {
    throw new NonRetryableGenerationError("Research must finish before sketching concepts.");
  }
  const priorConfig = data.logo_config as LogoConfig | null | undefined;
  const configChanged = priorConfig !== null && priorConfig !== undefined && (
    priorConfig.mark_type !== config.mark_type ||
    priorConfig.design_style !== config.design_style ||
    priorConfig.standalone_style !== config.standalone_style
  );
  const reset = job.input.reset === true || configChanged;
  const priorAll = (data.logo_sketches as LogoSketch[] | undefined) ?? [];
  const prior = reset ? [] : priorAll;
  const likedIds = inputStrings(job.input.likedIds);
  const liked = prior.filter((sketch) => likedIds.includes(sketch.id));

  await markProviderStarted(job.id, "provider: drawing concept", 20);
  const drawn = await generateLogoSketches({
    brandId: brand.id,
    brief: String(brand.brief),
    name: chosenBrandName(brand),
    platform,
    styleContext: styleContext(brand),
    config,
    likedSketches: liked.length ? liked : null,
    avoidNames: prior.map((sketch) => sketch.name),
    clock: startClock("job/logo_sketches", 240_000),
  });
  const sketches = [...prior, ...drawn];
  await setGenerationProgress(job.id, "saving concepts", 90);
  await saveBrandData(brand.id, {
    ...data,
    logo_config: config,
    logo_sketches: sketches,
    logo_sketch_likes: reset ? [] : likedIds,
  });
  return { platform, sketches, research: getResearch(data) };
}

async function runRefine(job: GenerationJob, brand: BrandRecord) {
  const data = brand.data ?? {};
  const platform = getPlatform(data);
  const sketches = (data.logo_sketches as LogoSketch[] | undefined) ?? [];
  const likedIds = inputStrings(job.input.likedIds);
  const liked = sketches.filter((sketch) => likedIds.includes(sketch.id));
  if (!platform || sketches.length === 0) {
    throw new NonRetryableGenerationError("Sketch concepts first, then refine the ones you like.");
  }
  if (liked.length === 0) {
    throw new NonRetryableGenerationError("Like at least one sketch to guide the refinement.");
  }
  const palette = data.palette as { colors?: { hex?: string }[] } | undefined;
  const paletteColors = palette?.colors?.map((color) => color.hex).filter((hex): hex is string => !!hex)
    ?? paletteBasis(getStep2(data))
    ?? undefined;
  await markProviderStarted(job.id, "provider: developing finalists", 15);
  const finalists = await generateLogoFinalists({
    brandId: brand.id,
    brief: String(brand.brief),
    name: chosenBrandName(brand),
    platform,
    liked,
    styleContext: styleContext(brand),
    config: getLogoConfig(data),
    paletteColors,
    clock: startClock("job/logo_refine", 270_000),
  });
  await setGenerationProgress(job.id, "saving finalists", 90);
  await saveBrandData(brand.id, {
    ...data,
    logo_finalists: finalists,
    logo_sketch_likes: likedIds,
    logos: finalists.map((finalist) => ({
      name: finalist.name,
      descriptor: finalist.idea,
      svg: finalist.svg ?? "",
      image_url: finalist.image_url,
    })),
  });
  return { finalists };
=======
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
      ? {
          imagePath,
          imageUrl: referenceImageUrl(imagePath),
          caption,
          visualPrinciples: visualPrinciples(caption),
        }
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
>>>>>>> 526f552e43aa092f99e217410cabf41e6b9dbf9f
}

function retryable(error: unknown, job: GenerationJob) {
  if (error instanceof NonRetryableGenerationError) return false;
  if (job.provider_started_at) return false;
  const message = error instanceof Error ? error.message : "";
<<<<<<< HEAD
  return !/missing|choose|add a brief|must finish|first, then|at least one/i.test(message);
=======
  return !/missing|choose|add a brief|explored/i.test(message);
>>>>>>> 526f552e43aa092f99e217410cabf41e6b9dbf9f
}

async function runJob(job: GenerationJob) {
  const brand = await loadBrand(job);
<<<<<<< HEAD
  switch (job.action) {
    case "logo_research": return runResearch(job, brand);
    case "logo_sketches": return runSketches(job, brand);
    case "logo_refine": return runRefine(job, brand);
  }
}

// Claims and runs at most one job. A Vercel Cron invokes this entry point; the
// DB lease makes another invocation recover an interrupted worker safely.
=======
  return runBoard(job, brand);
}

>>>>>>> 526f552e43aa092f99e217410cabf41e6b9dbf9f
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
