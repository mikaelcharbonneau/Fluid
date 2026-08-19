"use client";

import type { CSSProperties } from "react";

// #171: the product's selection cards, route tiles and upload targets were
// clickable `div`s — unreachable without a pointer and unannounced to screen
// readers. They are real `<button>`s now, which brings along a pile of UA
// styling (centred text, its own font, a border, inline-block layout) that
// would visibly change every one of those cards.
//
// CARD_BUTTON_RESET strips exactly that back to what a `div` renders like, so
// the conversion is a semantics change and not a visual one. Spread it first,
// then the card's own style.
export const CARD_BUTTON_RESET: CSSProperties = {
  appearance: "none",
  margin: 0,
  padding: 0,
  border: 0,
  font: "inherit",
  color: "inherit",
  textAlign: "left",
  background: "none",
  width: "100%",
};
