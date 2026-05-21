import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, findMany, deleteMany, create } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  deleteMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock("./client", () => ({
  prisma: {
    brand: { findFirst, findMany, deleteMany, create },
  },
}));

import { deleteBrand, getBrandById, listBrandsForUser } from "./brands";

describe("brand data access ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes getBrandById to the requesting user", async () => {
    findFirst.mockResolvedValue(null);
    await getBrandById("user-1", "brand-9");
    expect(findFirst).toHaveBeenCalledWith({ where: { id: "brand-9", userId: "user-1" } });
  });

  it("scopes listBrandsForUser to the requesting user", async () => {
    findMany.mockResolvedValue([]);
    await listBrandsForUser("user-2");
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-2" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("only reports a delete as successful when a row owned by the user was removed", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    expect(await deleteBrand("user-3", "brand-x")).toBe(false);

    deleteMany.mockResolvedValue({ count: 1 });
    expect(await deleteBrand("user-3", "brand-x")).toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "brand-x", userId: "user-3" } });
  });
});
