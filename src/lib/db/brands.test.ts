import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrand, deleteBrand, getBrandById, listBrandsForUser } from "./brands";

// Builds a Supabase client stub whose query builder is chainable: every method
// returns the builder, and awaiting the builder resolves to `result`. This
// mirrors the postgrest-js fluent API so we can assert how each query is scoped.
function makeSupabase(result: { data: unknown; error: unknown }) {
  const builder = {
    from: vi.fn(() => builder),
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    single: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (onFulfilled: (value: unknown) => unknown) => Promise.resolve(result).then(onFulfilled),
  };
  return builder;
}

const asClient = (builder: ReturnType<typeof makeSupabase>) =>
  builder as unknown as SupabaseClient;

describe("brand data access ownership", () => {
  it("scopes getBrandById to the requesting user", async () => {
    const sb = makeSupabase({ data: { id: "brand-9" }, error: null });
    const row = await getBrandById(asClient(sb), "user-1", "brand-9");

    expect(sb.from).toHaveBeenCalledWith("Brand");
    expect(sb.eq).toHaveBeenCalledWith("id", "brand-9");
    expect(sb.eq).toHaveBeenCalledWith("userId", "user-1");
    expect(sb.maybeSingle).toHaveBeenCalled();
    expect(row).toEqual({ id: "brand-9" });
  });

  it("returns null when getBrandById finds no owned row", async () => {
    const sb = makeSupabase({ data: null, error: null });
    expect(await getBrandById(asClient(sb), "user-1", "missing")).toBeNull();
  });

  it("scopes listBrandsForUser to the requesting user, newest first", async () => {
    const sb = makeSupabase({ data: [{ id: "b1" }], error: null });
    const rows = await listBrandsForUser(asClient(sb), "user-2");

    expect(sb.from).toHaveBeenCalledWith("Brand");
    expect(sb.eq).toHaveBeenCalledWith("userId", "user-2");
    expect(sb.order).toHaveBeenCalledWith("createdAt", { ascending: false });
    expect(rows).toEqual([{ id: "b1" }]);
  });

  it("only reports a delete as successful when a row owned by the user was removed", async () => {
    const empty = makeSupabase({ data: [], error: null });
    expect(await deleteBrand(asClient(empty), "user-3", "brand-x")).toBe(false);

    const removed = makeSupabase({ data: [{ id: "brand-x" }], error: null });
    expect(await deleteBrand(asClient(removed), "user-3", "brand-x")).toBe(true);
    expect(removed.eq).toHaveBeenCalledWith("id", "brand-x");
    expect(removed.eq).toHaveBeenCalledWith("userId", "user-3");
  });

  it("stamps the owner, a generated id, and updatedAt when creating a brand", async () => {
    const sb = makeSupabase({ data: { id: "new-id" }, error: null });
    const row = await createBrand(asClient(sb), "user-7", {
      basics: { about: "a", audience: "b", competitors: [] },
      strategy: { suggestedNames: ["Acme"], recommendedStyle: "modern" } as never,
      name: "Acme",
    });

    expect(sb.from).toHaveBeenCalledWith("Brand");
    expect(sb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-7",
        name: "Acme",
        about: "a",
        audience: "b",
        id: expect.any(String),
        selectedName: null,
        updatedAt: expect.any(String),
      }),
    );
    expect(sb.single).toHaveBeenCalled();
    expect(row).toEqual({ id: "new-id" });
  });

  it("propagates database errors", async () => {
    const sb = makeSupabase({ data: null, error: new Error("db down") });
    await expect(listBrandsForUser(asClient(sb), "user-1")).rejects.toThrow("db down");
  });
});
