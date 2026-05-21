import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Readiness probe: verifies the database is reachable. Returns 503 when the
// database cannot be queried so orchestrators can route traffic away from an
// instance that is up but not ready to serve.
export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    logger.error({ err: error }, "Readiness check database probe failed");
    return NextResponse.json({ status: "error", database: "down", timestamp }, { status: 503 });
  }

  return NextResponse.json({ status: "ok", database: "up", timestamp });
}
