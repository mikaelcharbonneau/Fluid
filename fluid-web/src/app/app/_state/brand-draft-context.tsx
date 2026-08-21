"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";

// Loosely typed on purpose: `draft`/`user`/`billing` carry whatever shape
// the API returns for a brand/session/subscription record, which this
// legacy module never validated at the boundary. `any` here documents that
// honestly rather than asserting a precision the code never had — #175
// gets a real chance to type this properly once brand state moves out of
// this file into its own module.
interface BrandDraftContextValue {
  brands: any[];
  user: any;
  billing: any;
  refreshBalance: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const BrandDraftCtx = React.createContext<BrandDraftContextValue | null>(null);

export const useBrandDraft = () => (React.useContext(BrandDraftCtx) || {}) as BrandDraftContextValue;
