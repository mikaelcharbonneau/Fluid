"use client";

// Shown while a route's screen chunk is in flight. Each screen renders inside
// the already-painted AShell, so this only needs to hold the content column's
// space — not redraw the whole frame.
export function ScreenFallback() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ minHeight: "60vh", display: "grid", placeItems: "center", opacity: 0.5 }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "2px solid currentColor",
          borderTopColor: "transparent",
          animation: "screen-fallback-spin 700ms linear infinite",
        }}
      />
      <style>{"@keyframes screen-fallback-spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
