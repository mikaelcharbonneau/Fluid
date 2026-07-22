import Link from "next/link";
import type { ReactNode } from "react";

// Shared shell for the legal pages (Terms, Privacy). Plain server component —
// static long-form text, so no client script or fragment machinery needed.
// Styled with the design tokens so it reads as part of the Fluid site.
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--fg-1)",
        padding: "48px 24px 96px",
      }}
    >
      <div style={{ width: "min(760px, 100%)", margin: "0 auto" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--fg-3)",
            textDecoration: "none",
          }}
        >
          ← Fluid
        </Link>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 40,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            margin: "28px 0 10px",
          }}
        >
          {title}
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-4)", margin: 0 }}>
          Last updated {updated}
        </p>

        <div
          style={{
            marginTop: 20,
            padding: "16px 18px",
            borderRadius: "var(--r-lg, 14px)",
            background: "var(--bg-elev)",
            boxShadow: "inset 0 0 0 1px var(--line)",
            fontSize: 13.5,
            color: "var(--fg-2)",
            lineHeight: 1.55,
          }}
        >
          {intro}
        </div>

        <div className="legal-body" style={{ marginTop: 8 }}>
          {children}
        </div>

        <p style={{ marginTop: 40, fontSize: 13, color: "var(--fg-3)", lineHeight: 1.6 }}>
          Questions about this document? Email{" "}
          <a href="mailto:hello@tryfluid.app" style={{ color: "var(--fg-1)" }}>
            hello@tryfluid.app
          </a>
          .
        </p>
      </div>
    </main>
  );
}

// A titled section of legal copy.
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 34 }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 19,
          letterSpacing: "-0.02em",
          margin: "0 0 10px",
        }}
      >
        {heading}
      </h2>
      <div style={{ fontSize: 14.5, color: "var(--fg-2)", lineHeight: 1.65, display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </section>
  );
}
