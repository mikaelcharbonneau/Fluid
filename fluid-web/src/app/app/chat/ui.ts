// The four repeated surfaces from the design, as style builders.
//
// The design draws every control inline, and these four shapes carry the whole
// visual language: a selectable card, its tick, a primary action, a chip. They
// live here so a selected card in the naming step and a selected card in the
// voice step cannot drift apart.

import type { CSSProperties } from "react";

export const INK = "#000";
export const PAPER = "#FAFAFB";
export const CARD = "#FFFFFF";
export const HAIRLINE = "rgba(0,0,0,.10)";
export const MUTED = "rgba(0,0,0,.52)";
export const FAINT = "rgba(0,0,0,.34)";
export const CORAL = "#FD7947";
export const MONO = "'JetBrains Mono',monospace";
export const DISPLAY = "Metropolis,Inter,sans-serif";

export function card(selected: boolean): CSSProperties {
  return {
    background: CARD,
    borderRadius: 16,
    padding: 10,
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    boxShadow: selected
      ? "0 0 0 2px #000,0 6px 18px rgba(0,0,0,.08)"
      : `inset 0 0 0 1px ${HAIRLINE},0 1px 2px rgba(0,0,0,.04)`,
    transition: "box-shadow 160ms cubic-bezier(.22,.61,.36,1)",
  };
}

export function tick(selected: boolean): CSSProperties {
  return {
    width: 18,
    height: 18,
    borderRadius: 99,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: selected ? INK : "transparent",
    boxShadow: selected ? "none" : "inset 0 0 0 1px rgba(0,0,0,.14)",
    flex: "0 0 18px",
  };
}

/** The primary action. `enabled: false` is visibly inert, not just ignored. */
export function cta(enabled: boolean): CSSProperties {
  return {
    padding: "9px 16px",
    borderRadius: 10,
    fontSize: 12.5,
    fontWeight: 600,
    background: enabled ? INK : "#EDEDEF",
    color: enabled ? "#fff" : FAINT,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

export function chip(selected: boolean): CSSProperties {
  return {
    padding: "9px 14px",
    borderRadius: 99,
    fontSize: 13,
    fontWeight: 600,
    background: selected ? INK : CARD,
    color: selected ? "#fff" : "rgba(0,0,0,.72)",
    boxShadow: selected ? "none" : "inset 0 0 0 1px rgba(0,0,0,.12)",
    transition: "background 140ms,color 140ms",
  };
}

/** The white panel several widgets sit inside. */
export function panel(radius = 18): CSSProperties {
  return {
    background: CARD,
    borderRadius: radius,
    boxShadow: `0 2px 6px rgba(0,0,0,.06),inset 0 0 0 1px ${HAIRLINE}`,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
}

export const softButton: CSSProperties = {
  padding: "6px 11px",
  borderRadius: 9,
  background: "#F0F0F2",
  color: "rgba(0,0,0,.72)",
  fontSize: 11.5,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

export const ghostButton: CSSProperties = {
  padding: "9px 14px",
  borderRadius: 10,
  background: "transparent",
  color: MUTED,
  fontSize: 12.5,
  fontWeight: 600,
};

export const label: CSSProperties = {
  fontFamily: MONO,
  fontSize: 9.5,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "rgba(0,0,0,.42)",
};
