import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Issue #169 fix step 7: block a new file-wide `/* eslint-disable */` or
// `// @ts-nocheck` from landing in application source the same way
// Prototype.jsx accumulated one, undetected, for who knows how long.
// Deliberately NOT an ESLint rule: eslint-plugin-eslint-comments' rule
// covers rule-scoped disables but not a bare, no-rules-listed
// `/* eslint-disable */`, and this needs to catch @ts-nocheck too — a
// single small check here covers both without adding a plugin.
const SRC_DIR = path.join(process.cwd(), "src");

const BLANKET_ESLINT_DISABLE = /(^|\n)\s*\/\*\s*eslint-disable\s*\*\//;
const TS_NOCHECK = /(^|\n)\s*\/\/\s*@ts-nocheck\b/;

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("no blanket suppressions", () => {
  const files = listSourceFiles(SRC_DIR);

  it("found source files to check (sanity check the scan itself works)", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("no file has a file-wide `/* eslint-disable */` (no specific rules listed)", () => {
    const offenders = files.filter((f) => BLANKET_ESLINT_DISABLE.test(fs.readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(SRC_DIR, f))).toEqual([]);
  });

  it("no file has `@ts-nocheck`", () => {
    const offenders = files.filter((f) => TS_NOCHECK.test(fs.readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(SRC_DIR, f))).toEqual([]);
  });
});
