import { describe, expect, it } from "vitest";
import { chosenBrandName, sanitizeBrandInput } from "./brands";

describe("chosenBrandName", () => {
  it("returns the explicit name_choice when set", () => {
    expect(chosenBrandName({ name_choice: "Acme", name: "Acme", brief: "acme" })).toBe("Acme");
  });

  it("returns null when there is no name_choice and name is the brief placeholder", () => {
    const brief = "a friendly coffee shop for remote workers";
    expect(
      chosenBrandName({ name_choice: null, name: "A friendly coffee shop", brief }),
    ).toBeNull();
  });

  it("returns null when name is empty or the literal placeholder", () => {
    expect(chosenBrandName({ name: "", brief: "" })).toBeNull();
    expect(chosenBrandName({ name: "Untitled brand", brief: "" })).toBeNull();
  });

  it("recovers name when it differs from the brief placeholder (dropped name_choice)", () => {
    expect(
      chosenBrandName({ name_choice: null, name: "Fluid Labs", brief: "a design tool for startups" }),
    ).toBe("Fluid Labs");
  });

  it("trims whitespace on name_choice", () => {
    expect(chosenBrandName({ name_choice: "  Acme  ", name: "", brief: "" })).toBe("Acme");
  });
});

describe("sanitizeBrandInput", () => {
  it("returns an empty object for non-object input", () => {
    expect(sanitizeBrandInput(null)).toEqual({});
    expect(sanitizeBrandInput("hello")).toEqual({});
    expect(sanitizeBrandInput(undefined)).toEqual({});
  });

  it("only keeps whitelisted, writable keys", () => {
    const out = sanitizeBrandInput({
      name: "Acme",
      user_id: "should-be-dropped",
      created_at: "should-be-dropped",
      brief: "a brief",
    });
    expect(out).toEqual({ name: "Acme", brief: "a brief" });
  });

  it("drops an invalid status and keeps a valid one", () => {
    expect(sanitizeBrandInput({ status: "archived" }).status).toBeUndefined();
    expect(sanitizeBrandInput({ status: "live" }).status).toBe("live");
    expect(sanitizeBrandInput({ status: "draft" }).status).toBe("draft");
  });

  it("coerces a numeric-looking step and drops out-of-range or non-integer steps", () => {
    expect(sanitizeBrandInput({ step: "3" }).step).toBe(3);
    expect(sanitizeBrandInput({ step: 0 }).step).toBeUndefined();
    expect(sanitizeBrandInput({ step: 6 }).step).toBeUndefined();
    expect(sanitizeBrandInput({ step: 2.5 }).step).toBeUndefined();
    expect(sanitizeBrandInput({ step: "not-a-number" }).step).toBeUndefined();
  });

  it("leaves undefined fields absent rather than null", () => {
    expect(sanitizeBrandInput({})).toEqual({});
  });
});
