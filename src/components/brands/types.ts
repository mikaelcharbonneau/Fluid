import type { BrandStrategy } from "@/types/brand";

export interface BrandView {
  id: string;
  name: string;
  about: string;
  audience: string;
  difference: string | null;
  competitors: string[];
  styleDirection: string | null;
  selectedName: string | null;
  selectedStyle: string | null;
  selectedLogo: string | null;
  strategy: BrandStrategy;
  createdAt: string;
}
