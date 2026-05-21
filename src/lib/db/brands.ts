import type { Prisma } from "@prisma/client";
import { prisma } from "./client";
import type { BrandBasics, BrandStrategy } from "@/types/brand";

export interface CreateBrandInput {
  basics: BrandBasics;
  strategy: BrandStrategy;
  name: string;
  selectedName?: string;
  selectedStyle?: string;
  selectedLogo?: string;
}

export function createBrand(userId: string, input: CreateBrandInput) {
  const { basics, strategy, name, selectedName, selectedStyle, selectedLogo } = input;

  return prisma.brand.create({
    data: {
      userId,
      name,
      about: basics.about,
      audience: basics.audience,
      difference: basics.difference,
      competitors: basics.competitors,
      styleDirection: basics.styleDirection,
      strategy: strategy as unknown as Prisma.InputJsonValue,
      selectedName: selectedName ?? strategy.suggestedNames[0],
      selectedStyle: selectedStyle ?? strategy.recommendedStyle,
      selectedLogo,
    },
  });
}

export function listBrandsForUser(userId: string) {
  return prisma.brand.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// Ownership is enforced here: a brand is only returned when it belongs to userId.
export function getBrandById(userId: string, id: string) {
  return prisma.brand.findFirst({ where: { id, userId } });
}

export async function deleteBrand(userId: string, id: string) {
  const result = await prisma.brand.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
