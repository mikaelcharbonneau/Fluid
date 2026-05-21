import type { Brand } from "@prisma/client";
import type { BrandStrategy } from "@/types/brand";
import type { BrandView } from "@/components/brands/types";

// Maps a Prisma Brand row to a plain, client-serializable shape.
export function toBrandView(brand: Brand): BrandView {
  return {
    id: brand.id,
    name: brand.name,
    about: brand.about,
    audience: brand.audience,
    difference: brand.difference,
    competitors: brand.competitors,
    styleDirection: brand.styleDirection,
    selectedName: brand.selectedName,
    selectedStyle: brand.selectedStyle,
    selectedLogo: brand.selectedLogo,
    strategy: brand.strategy as unknown as BrandStrategy,
    createdAt: brand.createdAt.toISOString(),
  };
}
