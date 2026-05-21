import type { z } from "zod";
import type { brandBasicsSchema, brandStrategyOutputSchema } from "@/lib/agents/brand-workflow";

export type BrandBasics = z.infer<typeof brandBasicsSchema>;
export type BrandStrategy = z.infer<typeof brandStrategyOutputSchema>;
