import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  brandBasicsSchema,
  brandStrategyOutputSchema,
  createBrandStrategy,
} from "./brand-workflow";

describe("brandBasicsSchema", () => {
  it("rejects empty required fields", () => {
    const result = brandBasicsSchema.safeParse({ about: "", audience: "" });
    expect(result.success).toBe(false);
  });

  it("accepts valid input and defaults competitors to an empty array", () => {
    const result = brandBasicsSchema.safeParse({ about: "A tool", audience: "Designers" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.competitors).toEqual([]);
    }
  });
});

describe("createBrandStrategy (demo path)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("OPENAI_API_KEY", "");
  });

  it("returns a strategy matching the output schema when no API key is set", async () => {
    const strategy = await createBrandStrategy({
      about: "A focused analytics tool",
      audience: "Operations teams",
      competitors: [],
    });

    expect(() => brandStrategyOutputSchema.parse(strategy)).not.toThrow();
    expect(strategy.suggestedNames.length).toBeGreaterThanOrEqual(4);
  });

  it("clamps very long user input in the demo output", async () => {
    const longAudience = "x".repeat(500);
    const strategy = await createBrandStrategy({
      about: "Something",
      audience: longAudience,
      competitors: [],
    });

    expect(strategy.positioning).not.toContain("x".repeat(200));
  });
});
