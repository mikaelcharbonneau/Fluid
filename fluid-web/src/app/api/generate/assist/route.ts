import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAssist, type AssistTask, type AssistOption } from "@/lib/ai/assist";

export const runtime = "nodejs";
export const maxDuration = 30;

const TASKS: AssistTask[] = [
  "brief_shorter", "brief_punchier", "brief_sharper",
  "audience", "competitors",
  "pick_style", "pick_palette", "pick_font",
];

// POST /api/generate/assist — small inline AI helpers for the wizard.
// Body: { brandId, task, options? }. Returns { text } | { items } | { choice }.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    brandId?: unknown; task?: unknown; options?: unknown;
  };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const task = body.task as AssistTask;
  if (!brandId) {
    return NextResponse.json({ error: "Missing brandId." }, { status: 400 });
  }
  if (!TASKS.includes(task)) {
    return NextResponse.json({ error: "Unknown task." }, { status: 400 });
  }

  const options = Array.isArray(body.options)
    ? (body.options as AssistOption[]).filter((o) => o && typeof o.id === "string")
    : undefined;

  const { data: brand, error: loadError } = await supabase
    .from("brands")
    .select("id, brief, audience, competitors")
    .eq("id", brandId)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!brand) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!String(brand.brief ?? "").trim()) {
    return NextResponse.json(
      { error: "Add a brand description first." },
      { status: 400 },
    );
  }

  try {
    const result = await runAssist({
      task,
      brief: String(brand.brief),
      audience: brand.audience as string | null,
      competitors: brand.competitors as string | null,
      options,
    });
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Assist failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
