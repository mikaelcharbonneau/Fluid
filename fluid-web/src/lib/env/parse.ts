import type { ZodError, ZodType } from "zod";

// Thrown by parseEnv. Message names the offending variables and what's
// wrong with their format — never their value.
export class EnvValidationError extends Error {
  constructor(scope: "public" | "server", zodError: ZodError) {
    const lines = zodError.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
    super(`Invalid ${scope} environment configuration:\n${lines.join("\n")}`);
    this.name = "EnvValidationError";
  }
}

export function parseEnv<T>(scope: "public" | "server", schema: ZodType<T>, source: Record<string, string | undefined>): T {
  const result = schema.safeParse(source);
  if (!result.success) throw new EnvValidationError(scope, result.error);
  return result.data;
}
