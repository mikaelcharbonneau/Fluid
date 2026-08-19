"use client";

import { useEffect, useRef } from "react";
import { usePointerCapabilities } from "./pointer-capabilities";

// Port of the `[data-magnetic]` block in public/scripts/*.js: the element
// nudges toward the cursor on hover, snapping back on mouseleave. Returns a
// ref to attach to the element that should move.
export function useMagnetic<T extends HTMLElement>(strength = 0.3) {
  const ref = useRef<T>(null);
  const { coarse, reduce } = usePointerCapabilities();

  useEffect(() => {
    if (coarse || reduce) return;
    const el = ref.current;
    if (!el) return;

    const onMouseMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * strength;
      const y = (e.clientY - r.top - r.height / 2) * strength;
      el.style.transform = `translate(${x}px,${y}px)`;
    };
    const onMouseLeave = () => {
      el.style.transform = "";
    };

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onMouseLeave);
    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [coarse, reduce, strength]);

  return ref;
}
