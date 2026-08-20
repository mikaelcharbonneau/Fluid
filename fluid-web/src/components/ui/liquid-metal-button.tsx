"use client";

import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import { Sparkles } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  viewMode?: "text" | "icon";
  /**
   * Defaults to "button" so the component can never submit a surrounding form
   * by accident. Pass "submit" when it *is* the submit control, so the form
   * keeps working on Enter and without JavaScript navigation.
   */
  type?: "button" | "submit";
}

const SPEED_IDLE = 0.6;
const SPEED_HOVER = 1;
const SPEED_CLICK = 2.4;

export function LiquidMetalButton({
  label = "Get Started",
  onClick,
  viewMode = "text",
  type = "button",
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<
    Array<{ x: number; y: number; id: number }>
  >([]);
  const shaderRef = useRef<HTMLDivElement>(null);
  // The package ships its own types, so this needs no `any` — which matters
  // here because `@typescript-eslint/no-explicit-any` is on for src/components.
  const shaderMount = useRef<ShaderMount | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);
  // Hover state is read inside a timeout below; a ref avoids re-running the
  // mount effect (and re-creating the WebGL context) on every hover.
  const isHoveredRef = useRef(false);

  const dimensions = useMemo(() => {
    if (viewMode === "icon") {
      return {
        width: 46,
        height: 46,
        innerWidth: 42,
        innerHeight: 42,
        shaderWidth: 46,
        shaderHeight: 46,
      };
    }
    return {
      width: 142,
      height: 46,
      innerWidth: 138,
      innerHeight: 42,
      shaderWidth: 142,
      shaderHeight: 46,
    };
  }, [viewMode]);

  useEffect(() => {
    const styleId = "liquid-metal-button-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .liquid-metal-button { cursor: pointer; }
        /* The marketing page hides the native cursor in favour of its own
           (body.custom-cursor). Setting cursor inline would win over that and
           bring the arrow back over this one button; a class lets the page's
           rule apply, matching how .btn already behaves. */
        body.custom-cursor .liquid-metal-button { cursor: none; }
        .liquid-metal-shader canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 100px !important;
        }
        @keyframes liquid-metal-ripple {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .liquid-metal-ripple { animation: none !important; opacity: 0 !important; }
        }
      `;
      document.head.appendChild(style);
    }

    if (!shaderRef.current) return;

    // Honour the OS setting: a permanently animating WebGL surface is exactly
    // the kind of motion `prefers-reduced-motion` exists for. Speed 0 stops
    // the rAF loop entirely (per ShaderMount), so it costs nothing to run.
    // Optional-chained: jsdom (and any non-browser render target) has no
    // matchMedia, and an unguarded call throws before the shader ever mounts.
    const prefersReducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let mount: ShaderMount | null = null;
    try {
      mount = new ShaderMount(
        shaderRef.current,
        liquidMetalFragmentShader,
        {
          u_repetition: 4,
          u_softness: 0.5,
          u_shiftRed: 0.3,
          u_shiftBlue: 0.3,
          u_distortion: 0,
          u_contour: 0,
          u_angle: 45,
          u_scale: 8,
          u_shape: 1,
          u_offsetX: 0.1,
          u_offsetY: -0.1,
        },
        undefined,
        prefersReducedMotion ? 0 : SPEED_IDLE,
      );
      shaderMount.current = mount;
    } catch (error) {
      // WebGL can be unavailable (blocked, software-rendering disabled, or the
      // context limit reached). The button still works — it just renders as the
      // plain dark pill underneath.
      console.error("Liquid metal shader failed to mount:", error);
    }

    return () => {
      // ShaderMount exposes `dispose()`, not `destroy()`. Calling the wrong
      // name through optional chaining fails silently and leaks the WebGL
      // context on every unmount — browsers cap live contexts at ~16, after
      // which this and any other canvas on the page stop rendering.
      mount?.dispose();
      shaderMount.current = null;
    };
  }, []);

  const setSpeed = (speed: number) => {
    shaderMount.current?.setSpeed(speed);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    isHoveredRef.current = true;
    setSpeed(SPEED_HOVER);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    isHoveredRef.current = false;
    setIsPressed(false);
    setSpeed(SPEED_IDLE);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setSpeed(SPEED_CLICK);
    window.setTimeout(() => {
      setSpeed(isHoveredRef.current ? SPEED_HOVER : SPEED_IDLE);
    }, 300);

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // A keyboard-triggered click reports clientX/clientY of 0; centre the
      // ripple in that case instead of firing it from the top-left corner.
      const isKeyboard = e.clientX === 0 && e.clientY === 0 && e.detail === 0;
      const x = isKeyboard ? rect.width / 2 : e.clientX - rect.left;
      const y = isKeyboard ? rect.height / 2 : e.clientY - rect.top;
      const ripple = { x, y, id: rippleId.current++ };

      setRipples((prev) => [...prev, ripple]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 600);
    }

    onClick?.();
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{ perspective: "1000px", perspectiveOrigin: "50% 50%" }}>
        <div
          style={{
            position: "relative",
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            transformStyle: "preserve-3d",
            transition:
              "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease",
            transform: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transformStyle: "preserve-3d",
              transition:
                "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease, gap 0.4s ease",
              transform: "translateZ(20px)",
              zIndex: 30,
              pointerEvents: "none",
            }}
          >
            {viewMode === "icon" && (
              <Sparkles
                size={16}
                aria-hidden="true"
                style={{
                  color: "#B8B8B8",
                  filter: "drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.5))",
                  transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  transform: "scale(1)",
                }}
              />
            )}
            {viewMode === "text" && (
              <span
                style={{
                  fontSize: "14px",
                  // #666 on the near-black pill measured ~2.8:1 — under AA for
                  // body text. Lightened to clear 4.5:1 without losing the
                  // engraved look, which the text-shadow is doing anyway.
                  color: "#B8B8B8",
                  fontWeight: 400,
                  textShadow: "0px 1px 2px rgba(0, 0, 0, 0.5)",
                  transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  transform: "scale(1)",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            )}
          </div>

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              transformStyle: "preserve-3d",
              transition:
                "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease",
              transform: `translateZ(10px) ${isPressed ? "translateY(1px) scale(0.98)" : "translateY(0) scale(1)"}`,
              zIndex: 20,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: `${dimensions.innerWidth}px`,
                height: `${dimensions.innerHeight}px`,
                margin: "2px",
                borderRadius: "100px",
                background: "linear-gradient(180deg, #202020 0%, #000000 100%)",
                boxShadow: isPressed
                  ? "inset 0px 2px 4px rgba(0, 0, 0, 0.4), inset 0px 1px 2px rgba(0, 0, 0, 0.3)"
                  : "none",
                transition:
                  "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              transformStyle: "preserve-3d",
              transition:
                "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease",
              transform: `translateZ(0px) ${isPressed ? "translateY(1px) scale(0.98)" : "translateY(0) scale(1)"}`,
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                height: `${dimensions.height}px`,
                width: `${dimensions.width}px`,
                borderRadius: "100px",
                boxShadow: isPressed
                  ? "0px 0px 0px 1px rgba(0, 0, 0, 0.5), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)"
                  : isHovered
                    ? "0px 0px 0px 1px rgba(0, 0, 0, 0.4), 0px 12px 6px 0px rgba(0, 0, 0, 0.05), 0px 8px 5px 0px rgba(0, 0, 0, 0.1), 0px 4px 4px 0px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.2)"
                    : "0px 0px 0px 1px rgba(0, 0, 0, 0.3), 0px 36px 14px 0px rgba(0, 0, 0, 0.02), 0px 20px 12px 0px rgba(0, 0, 0, 0.08), 0px 9px 9px 0px rgba(0, 0, 0, 0.12), 0px 2px 5px 0px rgba(0, 0, 0, 0.15)",
                transition:
                  "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                background: "rgb(0 0 0 / 0)",
              }}
            >
              <div
                ref={shaderRef}
                className="liquid-metal-shader"
                style={{
                  borderRadius: "100px",
                  overflow: "hidden",
                  position: "relative",
                  width: `${dimensions.shaderWidth}px`,
                  maxWidth: `${dimensions.shaderWidth}px`,
                  height: `${dimensions.shaderHeight}px`,
                  transition: "width 0.4s ease, height 0.4s ease",
                }}
              />
            </div>
          </div>

          <button
            ref={buttonRef}
            className="liquid-metal-button"
            type={type}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onFocus={() => setSpeed(SPEED_HOVER)}
            onBlur={() => {
              setIsPressed(false);
              setSpeed(isHoveredRef.current ? SPEED_HOVER : SPEED_IDLE);
            }}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") setIsPressed(true);
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") setIsPressed(false);
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              background: "transparent",
              border: "none",
              // No `outline: none` here on purpose. globals.css gives every
              // focusable a :focus-visible ring (issue #171); killing the
              // outline inline would silently opt this button out of it.
              zIndex: 40,
              transformStyle: "preserve-3d",
              transform: "translateZ(25px)",
              transition:
                "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease",
              overflow: "hidden",
              borderRadius: "100px",
            }}
            aria-label={label}
          >
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="liquid-metal-ripple"
                style={{
                  position: "absolute",
                  left: `${ripple.x}px`,
                  top: `${ripple.y}px`,
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 70%)",
                  pointerEvents: "none",
                  animation: "liquid-metal-ripple 0.6s ease-out",
                }}
              />
            ))}
          </button>
        </div>
      </div>
    </div>
  );
}
