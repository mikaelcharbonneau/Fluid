// Fail fast with a clear message when a required environment variable is
// missing, instead of letting downstream libraries throw cryptic errors.
// References to `process.env.NEXT_PUBLIC_*` must stay literal so Next.js can
// inline them into the client bundle at build time.
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. See .env.example.`);
  }
  return value;
}
