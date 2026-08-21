"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import type { AppUser, BillingStatus, DashboardBrand } from "./types";

export interface BrandDraftContextValue {
  brands: DashboardBrand[];
  user: AppUser | null;
  billing: BillingStatus | null;
  refreshBalance: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const BrandDraftCtx = React.createContext<BrandDraftContextValue | null>(null);

const EMPTY_CONTEXT: BrandDraftContextValue = {
  brands: [],
  user: null,
  billing: null,
  refreshBalance: async () => undefined,
  refresh: async () => undefined,
};

export function useBrandDraft(): BrandDraftContextValue {
  return React.useContext(BrandDraftCtx) ?? EMPTY_CONTEXT;
}
