import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Prototype.jsx (now .tsx — see issue #169) is a 9,000-line port of the
    // original design-export bundle with no prior type coverage at all.
    // Getting it under `strict` TypeScript meant annotating hundreds of
    // untyped legacy parameters/objects as `any` — explicit, not implicit,
    // and a real improvement over the blanket `@ts-nocheck` it replaced,
    // but still `any` throughout. Scoping the exception to this one file
    // (rather than disabling the rule project-wide, or re-adding a blanket
    // `/* eslint-disable */` here) keeps every other rule enforced and
    // keeps the exception narrow and visible, per #169's own fix step 2.
    // Follow-up modules extracted from this file in #175 should not carry
    // this override forward — type them properly as they're split out.
    files: ["src/app/app/Prototype.tsx", "src/types/prototype-window.d.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
