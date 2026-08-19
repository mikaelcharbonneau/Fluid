"use client";

import { useEffect, useRef } from "react";
import { usePointerCapabilities } from "./pointer-capabilities";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Faithful port of the custom-cursor block shared by public/scripts/
// marketing.js, login.js, signup.js, and reset-password.js: a dot that
// tracks the pointer exactly and a ring that eases toward it, both
// disabled for coarse (touch) pointers and reduced-motion preferences.
//
// Only marketing.js also hides the native cursor (`body.custom-cursor` ->
// `cursor: none` in marketing.css) — the auth pages keep the native pointer
// visible alongside the ring/dot. `hideNativeCursor` reproduces that one
// real difference between the two call sites.
export function CustomCursor({ hideNativeCursor = false }: { hideNativeCursor?: boolean }) {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const { coarse, reduce } = usePointerCapabilities();

  useEffect(() => {
    if (coarse || reduce) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    if (hideNativeCursor) document.body.classList.add("custom-cursor");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let frame = 0;

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    };
    const loop = () => {
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      frame = requestAnimationFrame(loop);
    };
    const hotSelector = "a, button, input, [data-hot]";
    const onMouseOver = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest(hotSelector)) ring.classList.add("is-hot");
    };
    const onMouseOut = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest(hotSelector)) ring.classList.remove("is-hot");
    };

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    frame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      cancelAnimationFrame(frame);
      if (hideNativeCursor) document.body.classList.remove("custom-cursor");
    };
  }, [coarse, reduce, hideNativeCursor]);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  );
}
