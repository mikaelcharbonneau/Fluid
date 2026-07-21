import fs from "node:fs";
import path from "node:path";

// Reads a pre-extracted HTML body fragment (server-side, at render time) so
// the marketing / signup / login pages can be SSR'd byte-for-byte identical to
// the original Fluid design export. Fragments live in src/app/_fragments/.
export function fragment(
  name: "marketing" | "signup" | "login" | "reset-request" | "reset-set",
): string {
  const file = path.join(process.cwd(), "src", "app", "_fragments", `${name}.html`);
  return fs.readFileSync(file, "utf8");
}
