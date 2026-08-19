"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import { PR } from "../_kit/react";

// ---------------------------------------------------------------------
// Router provider
// ---------------------------------------------------------------------
export const RouterCtx = PR.createContext(null);

export const useRouter = () => PR.useContext(RouterCtx);

