import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_ENV_VARS } from "./schema";

const envExample = fs.readFileSync(path.join(process.cwd(), ".env.example"), "utf8");

describe(".env.example", () => {
  it("documents every variable in the env schema", () => {
    const missing = ALL_ENV_VARS.filter((v) => !envExample.includes(v.name));
    expect(missing.map((v) => v.name)).toEqual([]);
  });

  it("never assigns a value to a credential-shaped variable (only documents non-secret defaults)", () => {
    // Model names / prompt ids are safe to show inline as documentation
    // (e.g. `OPENAI_TEXT_MODEL=gpt-5.6-luna`). Anything with KEY/SECRET/
    // TOKEN in its name must stay blank — a non-blank line there would mean
    // someone pasted a real credential into the example file.
    const credentialNames = ALL_ENV_VARS.filter((v) => /KEY|SECRET|TOKEN/.test(v.name)).map((v) => v.name);
    const suspicious = envExample
      .split("\n")
      .map((l) => l.trim())
      .filter((line) => credentialNames.some((name) => new RegExp(`^#?\\s*${name}=\\S`).test(line)));
    expect(suspicious).toEqual([]);
  });
});
