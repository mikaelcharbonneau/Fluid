"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

// Asset resolver — logical bundle paths live under /public/assets/<path>.
// Mirrors the original window.__assets Proxy (path -> inlined blob URL).
export const __assets: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_t, key) {
    return typeof key === "string" ? "/assets/" + key : undefined;
  },
});
