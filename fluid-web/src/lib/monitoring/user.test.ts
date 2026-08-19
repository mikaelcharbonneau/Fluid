import { describe, expect, it } from "vitest";
import { pseudonymousUserId } from "./user";

describe("pseudonymousUserId", () => {
  it("is deterministic for the same input", async () => {
    const a = await pseudonymousUserId("user-123");
    const b = await pseudonymousUserId("user-123");
    expect(a).toBe(b);
  });

  it("differs for different inputs", async () => {
    const a = await pseudonymousUserId("user-123");
    const b = await pseudonymousUserId("user-456");
    expect(a).not.toBe(b);
  });

  it("never contains the original id as a substring", async () => {
    const id = "user-123-super-secret-id";
    const hash = await pseudonymousUserId(id);
    expect(hash).not.toContain(id);
    expect(hash).not.toContain("user-123");
  });

  it("is a short hex string", async () => {
    const hash = await pseudonymousUserId("user-123");
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });
});
