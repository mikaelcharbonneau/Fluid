"use client";

// Split out of the original Prototype.tsx's tweaks-panel block (#175): the
// hook itself is tiny and the app frame needs it on every route, while the
// ~400 lines of panel chrome it used to sit beside are review-only and now
// load lazily via _state/dev-tools.
import React from "react";

export function useTweaks<T extends object>(defaults: T) {
  const [values, setValues] = React.useState<T>(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits: keyof T | Partial<T>, val?: T[keyof T]) => {
    const edits: Partial<T> = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits
      : { [keyOrEdits]: val } as Partial<T>;
    setValues((prev) => ({ ...prev, ...edits }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', { detail: edits }));
  }, []);
  return [values, setTweak] as const;
}
