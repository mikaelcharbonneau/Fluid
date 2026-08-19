// Characterization tests for a handful of pure functions that used to live in
// the single-file Prototype.tsx, written for #169's type safety pass and kept
// pointed at their new home in _kit/brand.tsx after #175 split that file into
// per-route modules — the assertions below are unchanged, which is most of
// what makes them useful here: they are the evidence the split moved this
// logic without altering it.
//
// They also lock down the brand-name resolution specifically: src/lib/brands's
// chosenBrandName is a deliberate duplicate of resolveBrandName/
// deriveBrandName (its own comments say so), and the two silently drifting
// apart is exactly the kind of regression a characterization test exists to
// catch.
import { describe, expect, it } from "vitest";
import { deriveBrandName, escHtml, kitSlug, resolveBrandName } from "./brand";

describe("deriveBrandName", () => {
  it("takes the first four words of the brief, capitalized", () => {
    expect(deriveBrandName("a friendly coffee shop for remote workers")).toBe(
      "A friendly coffee shop",
    );
  });

  it("returns the placeholder for an empty or missing brief", () => {
    expect(deriveBrandName("")).toBe("Untitled brand");
    expect(deriveBrandName(null)).toBe("Untitled brand");
    expect(deriveBrandName(undefined)).toBe("Untitled brand");
  });

  it("collapses internal whitespace", () => {
    expect(deriveBrandName("  a   design   tool  ")).toBe("A design tool");
  });
});

describe("resolveBrandName", () => {
  it("returns the explicit name_choice when set", () => {
    expect(resolveBrandName({ name_choice: "Acme", name: "Acme", brief: "acme" })).toBe("Acme");
  });

  it("returns null when name is still the brief-derived placeholder", () => {
    const brief = "a friendly coffee shop for remote workers";
    expect(resolveBrandName({ name_choice: null, name: "A friendly coffee shop", brief })).toBeNull();
  });

  it("returns null for an empty name or the literal placeholder", () => {
    expect(resolveBrandName({ name: "", brief: "" })).toBeNull();
    expect(resolveBrandName({ name: "Untitled brand", brief: "" })).toBeNull();
  });

  it("recovers a name that differs from the brief placeholder (dropped name_choice)", () => {
    expect(
      resolveBrandName({ name_choice: null, name: "Fluid Labs", brief: "a design tool for startups" }),
    ).toBe("Fluid Labs");
  });

  it("handles a null/undefined brand", () => {
    expect(resolveBrandName(null)).toBeNull();
    expect(resolveBrandName(undefined)).toBeNull();
  });

  it("stays in step with src/lib/brands.ts's chosenBrandName for the same input", async () => {
    // The two are meant to be identical logic, duplicated on purpose (see
    // both files' comments) because Prototype.tsx can't import server-side
    // code. If this test and brands.test.ts's equivalent cases ever
    // disagree, the two copies have drifted — fix whichever one is wrong.
    const { chosenBrandName } = await import("@/lib/brands");
    const cases = [
      { name_choice: "Acme", name: "Acme", brief: "acme" },
      { name_choice: null, name: "A friendly coffee shop", brief: "a friendly coffee shop for remote workers" },
      { name: "", brief: "" },
      { name: "Untitled brand", brief: "" },
      { name_choice: null, name: "Fluid Labs", brief: "a design tool for startups" },
    ];
    for (const brand of cases) {
      expect(resolveBrandName(brand)).toBe(chosenBrandName(brand));
    }
  });
});

describe("kitSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(kitSlug("Acme Brand Kit")).toBe("acme-brand-kit");
  });

  it("strips non-alphanumeric characters", () => {
    expect(kitSlug("Café & Co.!")).toBe("caf-co");
  });

  it("falls back to 'brand' for empty input", () => {
    expect(kitSlug("")).toBe("brand");
    expect(kitSlug(null)).toBe("brand");
  });

  it("trims leading/trailing hyphens", () => {
    expect(kitSlug("  --Acme--  ")).toBe("acme");
  });
});

describe("escHtml", () => {
  it("escapes &, <, >, and \" (not single quotes — the source regex doesn't match those)", () => {
    expect(escHtml(`<script>alert("hi") & bye</script>`)).toBe(
      "&lt;script&gt;alert(&quot;hi&quot;) &amp; bye&lt;/script&gt;",
    );
  });

  it("passes plain text through unchanged", () => {
    expect(escHtml("Fluid — from idea to identity")).toBe("Fluid — from idea to identity");
  });

  it("treats null/undefined as an empty string", () => {
    expect(escHtml(null)).toBe("");
    expect(escHtml(undefined)).toBe("");
  });
});
