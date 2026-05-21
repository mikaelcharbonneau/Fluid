import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { brandBasicsSchema, createBrandStrategy } from "@/lib/agents/brand-workflow";
import { createBrand } from "@/lib/db/brands";
import { checkRateLimit } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const userId = user.id;

  const { success, reset } = await checkRateLimit(userId);
  if (!success) {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = brandBasicsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const strategy = await createBrandStrategy(parsed.data);
    const brand = await createBrand(supabase, userId, {
      basics: parsed.data,
      strategy,
      name: strategy.suggestedNames[0] ?? "Untitled brand",
    });

    return NextResponse.json({ strategy, brandId: brand.id });
  } catch (error) {
    logger.error({ err: error, userId }, "Failed to create brand strategy");
    return NextResponse.json({ error: "Unable to create brand strategy." }, { status: 500 });
  }
}
