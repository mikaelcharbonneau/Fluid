import type { createClient } from "@/lib/supabase/server";
import {
  readAxes,
  type ReferenceTaste,
  type LogoReferenceRow,
} from "@/lib/logo-reference-query";

// Step 4 records which catalogued references the client liked and disliked.
// Look those rows up and read their refinement axes back off them — that is
// the styling information the generators need, and the client never had to
// touch a slider to give it.
//
// Best-effort: the reference gallery is an aid, so a failure here must not stop
// concepts being drawn. It just means one less hint.
export async function loadReferenceTaste(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: Record<string, unknown>,
): Promise<ReferenceTaste | null> {
  const paths = (key: string) =>
    Array.isArray(data[key])
      ? (data[key] as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
  const likedPaths = paths("logo_reference_likes");
  const dislikedPaths = paths("logo_reference_dislikes");
  if (!likedPaths.length && !dislikedPaths.length) return null;

  try {
    const { data: rows } = await supabase
      .from("logo_references")
      .select("name, mark_type, image_path, attributes, industry, sort_order, aspect_ratio, refinement")
      .in("image_path", [...likedPaths, ...dislikedPaths]);
    const all = (rows ?? []) as LogoReferenceRow[];
    if (!all.length) return null;

    const taste = readAxes(
      all.filter((r) => likedPaths.includes(r.image_path)),
      all.filter((r) => dislikedPaths.includes(r.image_path)),
    );
    return taste.axes.length ? taste : null;
  } catch {
    return null;
  }
}
