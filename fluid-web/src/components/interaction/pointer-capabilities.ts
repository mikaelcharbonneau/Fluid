"use client";

import { useSyncExternalStore } from "react";

// Coarse pointers (touch) and reduced-motion preferences both disable the
// custom cursor and magnetic-button effects — matching the original
// public/scripts/*.js behavior exactly. useSyncExternalStore (rather than
// useState+useEffect, which the react-hooks/set-state-in-effect lint rule
// flags for exactly this shape) gives us the client-only matchMedia read
// with a safe server snapshot, with no extra render-then-setState pass.
// subscribe is a no-op: like the original scripts, this never reacts to the
// media query changing mid-session, only to a fresh mount.
const noopSubscribe = () => () => {};
const getServerSnapshot = () => false;

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.matchMedia(query).matches,
    getServerSnapshot,
  );
}

export function usePointerCapabilities(): { coarse: boolean; reduce: boolean } {
  const coarse = useMediaQuery("(pointer: coarse)");
  const reduce = useMediaQuery("(prefers-reduced-motion: reduce)");
  return { coarse, reduce };
}
