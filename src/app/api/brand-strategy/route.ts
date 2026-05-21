import { NextResponse } from "next/server";
import { createBrandStrategy } from "@/lib/agents/brand-workflow";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const strategy = await createBrandStrategy(payload);

    return NextResponse.json({
      strategy,
      mode: process.env.OPENAI_API_KEY ? "agent" : "demo",
      setupRequired: !process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create brand strategy.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
