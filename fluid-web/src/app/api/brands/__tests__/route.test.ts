// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authGetUserMock, fromMock, supabaseClientMock } = vi.hoisted(() => {
  const authGetUserMock = vi.fn();
  const fromMock = vi.fn();
  const supabaseClientMock = {
    auth: { getUser: authGetUserMock },
    from: fromMock,
  };
  return { authGetUserMock, fromMock, supabaseClientMock };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabaseClientMock,
}));

import { GET, POST } from "../route";

describe("GET /api/brands", () => {
  beforeEach(() => {
    authGetUserMock.mockReset();
    fromMock.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    authGetUserMock.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/not authenticated/i);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns the signed-in user's brands", async () => {
    authGetUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    const order = vi.fn().mockResolvedValue({ data: [{ id: "b1" }], error: null });
    const select = vi.fn(() => ({ order }));
    fromMock.mockReturnValue({ select });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.brands).toEqual([{ id: "b1" }]);
  });

  it("returns 500 when the query errors", async () => {
    authGetUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } });
    fromMock.mockReturnValue({ select: vi.fn(() => ({ order })) });

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/brands", () => {
  beforeEach(() => {
    authGetUserMock.mockReset();
    fromMock.mockReset();
  });

  function req(body: unknown) {
    return new Request("http://localhost/api/brands", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when there is no session", async () => {
    authGetUserMock.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ brief: "hi" }));
    expect(res.status).toBe(401);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("creates a brand scoped to the signed-in user and strips unwritable fields", async () => {
    authGetUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    const single = vi.fn().mockResolvedValue({ data: { id: "b1", brief: "hi" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    fromMock.mockReturnValue({ insert });

    const res = await POST(req({ brief: "hi", user_id: "attacker-controlled" }));
    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({ brief: "hi", user_id: "u1" });
  });

  it("returns 500 when the insert errors", async () => {
    authGetUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } });
    fromMock.mockReturnValue({ insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })) });

    const res = await POST(req({ brief: "hi" }));
    expect(res.status).toBe(500);
  });

  it("tolerates an unparseable body", async () => {
    authGetUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    const single = vi.fn().mockResolvedValue({ data: { id: "b1" }, error: null });
    fromMock.mockReturnValue({ insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })) });

    const res = await POST(new Request("http://localhost/api/brands", { method: "POST", body: "not json" }));
    expect(res.status).toBe(201);
  });
});
