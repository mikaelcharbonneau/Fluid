import type { BrandRow } from "@/lib/db/brands";
import type { BrandView } from "@/components/brands/types";

// Maps a Brand row to a plain, client-serializable shape.
export function toBrandView(brand: BrandRow): BrandView {
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
    strategy: brand.strategy,
    createdAt: toIso(brand.createdAt),
  };
}

// PostgREST returns `timestamp without time zone` values as naive ISO strings
// with no offset; they are stored in UTC, so append `Z` before normalizing.
function toIso(value: string): string {
  const hasTz = value.endsWith("Z") || /[+-]\d\d:?\d\d$/.test(value);
  return new Date(hasTz ? value : `${value}Z`).toISOString();
}
