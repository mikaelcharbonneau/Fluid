"use client";

export function Toast({ message, visible }: { message: string | null; visible: boolean }) {
  if (!message) return null;
  return (
    <div className={`auth-toast${visible ? " show" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
