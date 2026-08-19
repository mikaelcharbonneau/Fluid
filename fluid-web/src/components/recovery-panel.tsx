import type { CSSProperties, ReactNode } from "react";

// Shared visual shell for every "something went wrong" surface — root
// error.tsx, the product's error.tsx, and not-found.tsx — so a user sees one
// consistent recovery pattern no matter where the app failed. Deliberately
// plain inline styles + design-token CSS vars rather than a stylesheet import,
// so it's safe to reuse from global-error.tsx too (which renders outside the
// normal layout and doesn't get global stylesheets for free).
export function RecoveryPanel({
  eyebrow,
  title,
  message,
  actions,
  digest,
}: {
  eyebrow: string;
  title: string;
  message: string;
  actions: ReactNode;
  digest?: string;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg, #FAFAFB)",
        color: "var(--fg-1, #000)",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        textAlign: "center",
      }}
    >
      <div style={{ width: "min(440px, 100%)" }}>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--fg-2, rgba(0,0,0,0.72))",
          }}
        >
          {eyebrow}
        </p>
        <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>{title}</h1>
        <p style={{ margin: "0 0 28px", fontSize: 16, lineHeight: 1.5, color: "var(--fg-2, rgba(0,0,0,0.72))" }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>{actions}</div>
        {digest && (
          <p style={{ marginTop: 24, fontSize: 12, color: "var(--fg-2, rgba(0,0,0,0.5))" }}>
            Reference: <code>{digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}

const BASE_BUTTON_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 20px",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
  border: "1px solid var(--fg-1, #000)",
};

export function PrimaryAction(props: { onClick?: () => void; href?: string; children: ReactNode }) {
  const style: CSSProperties = {
    ...BASE_BUTTON_STYLE,
    background: "var(--accent, #000)",
    color: "var(--bg-elev, #fff)",
  };
  if (props.href) {
    return (
      <a href={props.href} style={style}>
        {props.children}
      </a>
    );
  }
  return (
    <button type="button" onClick={props.onClick} style={style}>
      {props.children}
    </button>
  );
}

export function SecondaryAction(props: { onClick?: () => void; href?: string; children: ReactNode }) {
  const style: CSSProperties = {
    ...BASE_BUTTON_STYLE,
    background: "transparent",
    color: "var(--fg-1, #000)",
  };
  if (props.href) {
    return (
      <a href={props.href} style={style}>
        {props.children}
      </a>
    );
  }
  return (
    <button type="button" onClick={props.onClick} style={style}>
      {props.children}
    </button>
  );
}
