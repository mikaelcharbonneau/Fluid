"use client";

import { useEffect, useRef } from "react";
import {
  createInstance,
  destroyInstance,
  resumeShared,
  setSharedPreset,
  updateInstance,
  type MetalFxInstance,
} from "metal-fx";

// Wraps a CTA and paints metal-fx's animated ring over it on hover.
//
// The React <MetalFx> wrapper runs the effect continuously; this hero wants it
// only on hover, so the instance is driven directly through the package's
// imperative API instead: it mounts paused, and pointer enter/leave toggle it.
// A paused instance still gets one frame painted, so the fade-in never shows a
// blank canvas.
//
// The white -> black transition of the button itself is CSS (.metal-cta in
// marketing.css); this component owns only the shader.
export function MetalCta({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instRef = useRef<MetalFxInstance | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    // A permanently-available animated WebGL surface is exactly what this
    // setting is for. Skip the shader entirely — the CTA keeps its hover.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const host = wrap.querySelector<HTMLElement>("[data-metal-host]");
    if (!host) return;

    const measure = () => {
      const r = host.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    const { w, h } = measure();
    if (!w || !h) return;

    let inst: MetalFxInstance | null = null;
    let ro: ResizeObserver | null = null;
    try {
      // Shared across every instance on the page: metal-fx keeps one GL loop
      // and copies from it, so the preset is global by design.
      setSharedPreset("chromatic", "dark");
      inst = createInstance({
        hostCanvas: canvas,
        cssWidth: w,
        cssHeight: h,
        cornerRadius: h / 2,
        kind: "pill",
        paused: true,
      });
      instRef.current = inst;
      resumeShared();

      // The button reflows with the viewport and when the brand font swaps in;
      // without this the ring drifts off its host.
      if (window.ResizeObserver) {
        ro = new ResizeObserver(() => {
          const next = measure();
          if (inst && next.w && next.h) {
            updateInstance(inst, {
              cssWidth: next.w,
              cssHeight: next.h,
              cornerRadius: next.h / 2,
            });
          }
        });
        ro.observe(host);
      }
    } catch {
      // No WebGL (blocked, or the browser's live-context cap reached): the CTA
      // is still a working button, it just does not shimmer.
      return;
    }

    const enter = () => inst && updateInstance(inst, { paused: false });
    const leave = () => inst && updateInstance(inst, { paused: true });
    wrap.addEventListener("mouseenter", enter);
    wrap.addEventListener("mouseleave", leave);
    wrap.addEventListener("focusin", enter);
    wrap.addEventListener("focusout", leave);

    return () => {
      wrap.removeEventListener("mouseenter", enter);
      wrap.removeEventListener("mouseleave", leave);
      wrap.removeEventListener("focusin", enter);
      wrap.removeEventListener("focusout", leave);
      ro?.disconnect();
      // `dispose`, not `destroy` — browsers cap live WebGL contexts, and this
      // component remounts on every client-side navigation.
      if (inst) destroyInstance(inst);
      instRef.current = null;
    };
  }, []);

  return (
    <span className="metal-cta" ref={wrapRef}>
      {children}
      <canvas className="metal-cta-canvas" ref={canvasRef} aria-hidden="true" />
    </span>
  );
}
