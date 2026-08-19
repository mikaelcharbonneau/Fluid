// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInMock, supabaseClientMock } = vi.hoisted(() => {
  const signInMock = vi.fn();
  const supabaseClientMock = { auth: { signInWithPassword: signInMock } };
  return { signInMock, supabaseClientMock };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabaseClientMock,
}));

import { POST } from "../route";

function req(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    signInMock.mockReset();
  });

  it("returns 400 when email or password is missing", async () => {
    const res = await POST(req({ email: "a@b.com" }));
    expect(res.status).toBe(400);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty body", async () => {
    const res = await POST(new Request("http://localhost/api/auth/login", { method: "POST", body: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 with a generic message on invalid credentials", async () => {
    signInMock.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const res = await POST(req({ email: "a@b.com", password: "wrong" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    // Never leak the provider's raw error message to the client.
    expect(body.error).not.toContain("Invalid login credentials");
  });

  it("returns ok on success", async () => {
    signInMock.mockResolvedValue({ error: null });
    const res = await POST(req({ email: "a@b.com", password: "correct" }));
    expect(res.status).toBe(200);
    expect(signInMock).toHaveBeenCalledWith({ email: "a@b.com", password: "correct" });
  });
});
