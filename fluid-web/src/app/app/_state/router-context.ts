"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import { createContext, useContext } from "react";
import type { AppRoute } from "./routes";

// ---------------------------------------------------------------------
// Router provider
// ---------------------------------------------------------------------
export interface RouterContextValue {
  route: AppRoute;
  navigate: (route: AppRoute, query?: Record<string, string>) => void;
  direction: "fwd" | "back";
}

export const RouterCtx = createContext<RouterContextValue | null>(null);

export function useRouter(): RouterContextValue {
  const context = useContext(RouterCtx);
  if (!context) throw new Error("useRouter must be used inside RouterProvider");
  return context;
}
