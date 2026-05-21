import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandBasics, BrandStrategy } from "@/types/brand";

const TABLE = "Brand";

// A row in the Brand table as returned by PostgREST: `strategy` is parsed JSON,
// and timestamps come back as naive ISO strings (the columns are `timestamp
// without time zone`, stored in UTC).
export interface BrandRow {
  id: string;
  userId: string;
  name: string;
  about: string;
  audience: string;
  difference: string | null;
  competitors: string[];
  styleDirection: string | null;
  strategy: BrandStrategy;
  selectedName: string | null;
  selectedStyle: string | null;
  selectedLogo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandInput {
  basics: BrandBasics;
  strategy: BrandStrategy;
  name: string;
  selectedName?: string;
  selectedStyle?: string;
  selectedLogo?: string;
}

export async function createBrand(
  supabase: SupabaseClient,
  userId: string,
  input: CreateBrandInput,
): Promise<BrandRow> {
  const { basics, strategy, name, selectedName, selectedStyle, selectedLogo } = input;
  // The `id` and `updatedAt` columns have no database default, so they are set
  // here on insert.
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      id: crypto.randomUUID(),
      userId,
      name,
      about: basics.about,
      audience: basics.audience,
      difference: basics.difference ?? null,
      competitors: basics.competitors,
      styleDirection: basics.styleDirection ?? null,
      strategy,
      selectedName: selectedName ?? strategy.suggestedNames[0],
      selectedStyle: selectedStyle ?? strategy.recommendedStyle,
      selectedLogo: selectedLogo ?? null,
      updatedAt: now,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BrandRow;
}

export async function listBrandsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<BrandRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false });

  if (error) throw error;
  return (data ?? []) as BrandRow[];
}

// Ownership is enforced here — a brand is only returned when it belongs to
// userId — and RLS enforces the same rule at the database level.
export async function getBrandById(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<BrandRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .eq("userId", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as BrandRow | null) ?? null;
}

export async function deleteBrand(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("userId", userId)
    .select("id");

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
