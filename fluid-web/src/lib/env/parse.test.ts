import { describe, expect, it } from "vitest";
import { z } from "zod";
import { EnvValidationError, parseEnv } from "./parse";

const schema = z.object({
  FOO: z.string().min(3).optional(),
  BAR: z.string().url().optional(),
});

describe("parseEnv", () => {
  it("returns the parsed data when valid", () => {
    expect(parseEnv("server", schema, { FOO: "abc", BAR: "https://example.com" })).toEqual({
      FOO: "abc",
      BAR: "https://example.com",
    });
  });

  it("throws EnvValidationError naming the offending variable when invalid", () => {
    try {
      parseEnv("server", schema, { FOO: "ab" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError);
      expect((err as Error).message).toContain("FOO");
      expect((err as Error).message).toContain("server environment");
    }
  });

  it("never includes the invalid value itself in the error message", () => {
    try {
      parseEnv("public", schema, { BAR: "not-a-url-but-looks-like-a-leaked-token-xyz789" });
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).not.toContain("not-a-url-but-looks-like-a-leaked-token-xyz789");
    }
  });
});
