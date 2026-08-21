"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.


// ------------------------------------------------------------------
// 12-bootstrap
// ------------------------------------------------------------------

// Default brand accent + prototype tweaks (persisted by useTweaks).
export interface ProtoTweaks {
  brand: string;
  showQuickJump: boolean;
}

export const PROTO_DEFAULTS: ProtoTweaks = /*EDITMODE-BEGIN*/{
  "brand": "Signature",
  "showQuickJump": false
}/*EDITMODE-END*/;

export const BRAND_TO_ATTR = { Signature: '', Rare: 'rare', Solid: 'solid' };

export const BRAND_NOTE = {
  Signature: 'Signature treatment — the gradient appears in the wordmark, the app icon and across decorative accents.',
  Rare:      'Rare — the gradient is kept only as the app-icon signature; the wordmark and every accent go quiet and monochrome.',
  Solid:     'Solid — a single proprietary accent (coral) replaces the rainbow everywhere but the app-icon signature.',
};
