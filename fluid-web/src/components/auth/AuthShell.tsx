import type { ReactNode } from "react";
import { CustomCursor } from "@/components/interaction/CustomCursor";
import { AuthShowcase } from "./AuthShowcase";

export function AuthShell({
  children,
  wordmarkSrc,
  palette,
}: {
  children: ReactNode;
  wordmarkSrc: string;
  palette?: string[];
}) {
  return (
    <>
      <CustomCursor />
      <main className="auth">
        <section className="auth-form-col">
          <div className="auth-form">{children}</div>
          <span className="auth-foot wf-label">© 2026 Fluid</span>
        </section>
        <AuthShowcase wordmarkSrc={wordmarkSrc} palette={palette} />
      </main>
    </>
  );
}
