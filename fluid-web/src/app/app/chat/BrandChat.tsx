"use client";

// One-shot brand-kit generation.
//
// Replaces the old 20-step conversation: a brief in, one composite
// brand-kit board image out. Three phases live in this one component —
// `form` (collect the brief), `generating` (stream activity while the
// studio works), `result` (show the board) — chosen by whether `?brand=`
// resolves to a brand that already has `data.brandkit`.

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { ActivityEvent } from "@/lib/ai/activity";
import { fetchBrand, postGenerate } from "./api";
import { ThinkingOrb } from "./ThinkingOrb";
import {
  CARD, DISPLAY, FAINT, HAIRLINE, INK, MONO, MUTED, PAPER, chip, cta, label, panel,
} from "./ui";
import {
  Assets, Chevron, ChevronLeft, Download, Grid, Guides, Home, Refresh, Search, Settings, Token,
} from "./icons";
import { AVOIDS, CATEGORIES } from "./data";
import { LAYOUTS, VISUAL_MODES } from "@/lib/brand-kit/types";
import type { BrandKitBrief, BrandKitLayout, BrandKitResult, VisualMode } from "@/lib/brand-kit/types";
import "./chat.css";

type Phase = "loading" | "form" | "generating" | "result";

export function BrandChat() {
  const [resumeId] = useState(() => new URLSearchParams(window.location.search).get("brand"));
  const [presetMode] = useState<VisualMode | null>(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    return m && VISUAL_MODES.some((v) => v.id === m) ? (m as VisualMode) : null;
  });

  const [phase, setPhase] = useState<Phase>(resumeId ? "loading" : "form");
  const [brandId, setBrandId] = useState<string | null>(resumeId);
  const [result, setResult] = useState<BrandKitResult | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [category, setCategory] = useState("");
  const [audience, setAudience] = useState("");
  const [visualMode, setVisualMode] = useState<VisualMode | null>(presetMode);
  const [layout, setLayout] = useState<BrandKitLayout>("3x3");
  const [avoid, setAvoid] = useState<string[]>([]);
  const [refineOpen, setRefineOpen] = useState(!!presetMode);

  // ---- token balance ---------------------------------------------------
  useEffect(() => {
    let live = true;
    fetch("/api/billing/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live && j && typeof j.token_balance === "number") setTokens(j.token_balance);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [phase]);

  // ---- resume ------------------------------------------------------------
  useEffect(() => {
    if (!resumeId) return;
    fetchBrand(resumeId).then(({ brand, error: err }) => {
      if (err || !brand) {
        setError(err ?? "That brand could not be found.");
        setPhase("form");
        return;
      }
      setName(brand.name ?? "");
      setBrief(brand.brief ?? "");
      setAudience(brand.audience ?? "");
      const brandkit = brand.data?.brandkit;
      if (brandkit) {
        setResult(brandkit);
        setPhase("result");
      } else {
        setPhase("form");
      }
    });
  }, [resumeId]);

  // ---- generate ------------------------------------------------------------
  const generate = useCallback(async () => {
    if (!name.trim() || !brief.trim() || phase === "generating") return;
    setPhase("generating");
    setError(null);
    setStatus(null);

    const payload: BrandKitBrief = {
      name: name.trim(),
      brief: brief.trim(),
      category: category || undefined,
      audience: audience.trim() || undefined,
      visualMode: visualMode ?? undefined,
      layout,
      avoid: avoid.length ? avoid : undefined,
    };

    const out = await postGenerate(brandId, payload, (event: ActivityEvent) => setStatus(event.label));
    setStatus(null);

    if (out.brandId && out.brandId !== brandId) {
      setBrandId(out.brandId);
      const url = new URL(window.location.href);
      url.searchParams.set("brand", out.brandId);
      window.history.replaceState(null, "", url);
    }

    if (out.error) {
      setError(out.error);
      setPhase("form");
      return;
    }
    if (out.brandkit) {
      setResult(out.brandkit);
      setPhase("result");
      return;
    }
    setError("Something went wrong — no board came back.");
    setPhase("form");
  }, [name, brief, category, audience, visualMode, layout, avoid, brandId, phase]);

  const startOver = useCallback(() => {
    setError(null);
    setPhase("form");
  }, []);

  const canGenerate = !!name.trim() && !!brief.trim() && phase !== "generating";
  const breadcrumb = name.trim() || "New brand";

  return (
    <div className="bchat">
      <Header breadcrumb={breadcrumb} tokens={tokens} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "40px 24px 60px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            {phase === "loading" ? (
              <Busy label="Loading…" />
            ) : phase === "result" && result ? (
              <ResultView result={result} name={breadcrumb} onRegenerate={startOver} />
            ) : (
              <FormView
                name={name}
                setName={setName}
                brief={brief}
                setBrief={setBrief}
                category={category}
                setCategory={setCategory}
                audience={audience}
                setAudience={setAudience}
                visualMode={visualMode}
                setVisualMode={setVisualMode}
                layout={layout}
                setLayout={setLayout}
                avoid={avoid}
                setAvoid={setAvoid}
                refineOpen={refineOpen}
                setRefineOpen={setRefineOpen}
                busy={phase === "generating"}
                status={status}
                error={error}
                canGenerate={canGenerate}
                onGenerate={generate}
                hasPriorResult={!!result}
                onBackToResult={() => setPhase("result")}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ---- form --------------------------------------------------------------

interface FormViewProps {
  name: string;
  setName: (v: string) => void;
  brief: string;
  setBrief: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  audience: string;
  setAudience: (v: string) => void;
  visualMode: VisualMode | null;
  setVisualMode: (v: VisualMode | null) => void;
  layout: BrandKitLayout;
  setLayout: (v: BrandKitLayout) => void;
  avoid: string[];
  setAvoid: (v: string[]) => void;
  refineOpen: boolean;
  setRefineOpen: (v: boolean) => void;
  busy: boolean;
  status: string | null;
  error: string | null;
  canGenerate: boolean;
  onGenerate: () => void;
  hasPriorResult: boolean;
  onBackToResult: () => void;
}

function FormView(props: FormViewProps) {
  const {
    name, setName, brief, setBrief, category, setCategory, audience, setAudience,
    visualMode, setVisualMode, layout, setLayout, avoid, setAvoid,
    refineOpen, setRefineOpen, busy, status, error, canGenerate, onGenerate,
    hasPriorResult, onBackToResult,
  } = props;

  const toggleAvoid = (item: string) => {
    setAvoid(avoid.includes(item) ? avoid.filter((a) => a !== item) : [...avoid, item]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, paddingTop: 8 }}>
      {hasPriorResult ? (
        <button type="button" onClick={onBackToResult} style={{ ...ghostLink, alignSelf: "flex-start" }}>
          <ChevronLeft size={11} /> Back to the board
        </button>
      ) : null}

      <div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, letterSpacing: "-0.03em", margin: 0, color: INK }}>
          Let&rsquo;s build the brand.
        </h1>
        <p style={{ fontSize: 14.5, color: MUTED, marginTop: 8, lineHeight: 1.5, maxWidth: 560 }}>
          Tell Fluid what this is. It will draft the strategy, the mark, the palette, the
          type, and put the whole thing on one premium brand-kit board.
        </p>
      </div>

      <div style={panel()}>
        <div style={fieldGroup}>
          <span style={label}>Brand name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Northwind"
            disabled={busy}
            style={inputStyle}
          />
        </div>
        <div style={fieldGroup}>
          <span style={label}>Brief</span>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="What is this, who is it for, what does it do?"
            disabled={busy}
            rows={4}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setRefineOpen(!refineOpen)}
        style={{ ...ghostLink, alignSelf: "flex-start" }}
      >
        <span style={{ display: "inline-flex", transform: refineOpen ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 140ms" }}>
          <Chevron size={11} />
        </span>
        {refineOpen ? "Hide refinements" : "Refine (optional)"}
      </button>

      {refineOpen ? (
        <div style={{ ...panel(), gap: 18 }}>
          <div style={fieldGroup}>
            <span style={label}>Category</span>
            <div style={chipRow}>
              {CATEGORIES.map((c) => (
                <button key={c} type="button" disabled={busy} onClick={() => setCategory(c === category ? "" : c)} style={chip(c === category)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={fieldGroup}>
            <span style={label}>Audience</span>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Who is this for?"
              disabled={busy}
              style={inputStyle}
            />
          </div>

          <div style={fieldGroup}>
            <span style={label}>Visual mode</span>
            <div style={chipRow}>
              <button type="button" disabled={busy} onClick={() => setVisualMode(null)} style={chip(visualMode === null)}>
                Let AI choose
              </button>
              {VISUAL_MODES.map((m) => (
                <button key={m.id} type="button" disabled={busy} onClick={() => setVisualMode(m.id)} style={chip(visualMode === m.id)} title={m.note}>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div style={fieldGroup}>
            <span style={label}>Layout</span>
            <div style={chipRow}>
              {LAYOUTS.map((l) => (
                <button key={l.id} type="button" disabled={busy} onClick={() => setLayout(l.id)} style={chip(l.id === layout)} title={l.note}>
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          <div style={fieldGroup}>
            <span style={label}>Avoid</span>
            <div style={chipRow}>
              {AVOIDS.map((a) => (
                <button key={a} type="button" disabled={busy} onClick={() => toggleAvoid(a)} style={chip(avoid.includes(a))}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "#FBEAE3", color: "#8A3E1C", fontSize: 13.5 }}>
          {error}
        </div>
      ) : null}

      {busy ? (
        <Busy label={status ?? "Working…"} />
      ) : (
        <button type="button" disabled={!canGenerate} onClick={onGenerate} style={{ ...cta(canGenerate), alignSelf: "flex-start", padding: "13px 22px", fontSize: 14 }}>
          Generate the brand kit
        </button>
      )}
    </div>
  );
}

// ---- result --------------------------------------------------------------

function ResultView({
  result,
  name,
  onRegenerate,
}: {
  result: BrandKitResult;
  name: string;
  onRegenerate: () => void;
}) {
  const { strategy } = result;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
      <div>
        <div style={{ ...label, marginBottom: 8 }}>Brand kit</div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, letterSpacing: "-0.03em", margin: 0, color: INK }}>
          {name}
        </h1>
        <p style={{ fontSize: 15, color: MUTED, marginTop: 8, fontStyle: "italic" }}>&ldquo;{strategy.tagline}&rdquo;</p>
      </div>

      <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: `0 2px 6px rgba(0,0,0,.06), inset 0 0 0 1px ${HAIRLINE}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={result.imageUrl} alt={`${name} brand kit board`} style={{ display: "block", width: "100%", height: "auto" }} />
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {strategy.palette.map((p) => (
          <div key={p.hex} title={`${p.role} — ${p.hex}`} style={{ flex: 1, height: 34, borderRadius: 10, background: p.hex, boxShadow: `inset 0 0 0 1px ${HAIRLINE}` }} />
        ))}
      </div>

      <div style={{ ...panel(), gap: 10 }}>
        <Row k="Category" v={strategy.category} />
        <Row k="Audience" v={strategy.audience} />
        <Row k="Personality" v={strategy.personality} />
        <Row k="Core metaphor" v={strategy.coreMetaphor} />
        <Row k="Logo idea" v={strategy.logoIdea} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <a href={result.imageUrl} download target="_blank" rel="noreferrer" style={{ ...cta(true), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Download size={14} /> Download
        </a>
        <button type="button" onClick={onRegenerate} style={{ ...cta(true), background: CARD, color: INK, boxShadow: `inset 0 0 0 1px ${HAIRLINE}`, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Refresh size={13} /> Regenerate
        </button>
        <a href="/app#brands" style={{ ...ghostLink }}>
          Back to brands
        </a>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <span style={{ ...label, flex: "0 0 130px" }}>{k}</span>
      <span style={{ fontSize: 13.5, color: "rgba(0,0,0,.78)", lineHeight: 1.5 }}>{v}</span>
    </div>
  );
}

function Busy({ label: text }: { label: string }) {
  return (
    <div className="bchat-msg" style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <div style={{ flex: "0 0 28px", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ThinkingOrb />
      </div>
      <span style={{ fontSize: 13, color: MUTED }}>{text}</span>
    </div>
  );
}

// ---- shell (unchanged from the old chat) ----------------------------------

function Header({ breadcrumb, tokens }: { breadcrumb: string; tokens: number | null }) {
  const pill: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px",
    borderRadius: 999, background: CARD, boxShadow: `inset 0 0 0 1px ${HAIRLINE}`,
    fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,.72)",
  };
  return (
    <header style={{
      height: 60, flex: "0 0 60px", display: "flex", alignItems: "center", gap: 20,
      padding: "0 24px", borderBottom: `1px solid ${HAIRLINE}`, background: PAPER,
      position: "relative", zIndex: 2,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/uuid/97b97e78-4145-428a-9c6f-c0ff3d3cb43d.png" alt="Fluid" style={{ height: 22, width: "auto", display: "block" }} />
      <div style={{ width: 1, height: 28, background: HAIRLINE }} />
      <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: MUTED, whiteSpace: "nowrap" }}>
        <a href="/app#brands" style={{ fontWeight: 500, color: MUTED }}>Brands</a>
        <Chevron size={12} />
        <span style={{ color: INK, fontWeight: 600 }}>{breadcrumb}</span>
      </nav>
      <div style={{ flex: 1, minWidth: 12 }} />
      <span style={pill}>
        <Search size={12} />
        <span>Search brands, assets…</span>
        <span style={{ marginLeft: 18, padding: "2px 6px", borderRadius: 5, background: "#F0F0F2", fontSize: 10, fontFamily: MONO, color: MUTED }}>
          ⌘K
        </span>
      </span>
      <span style={{ ...pill, gap: 7, fontWeight: 600 }}>
        <Token size={13} />
        <span>{tokens ?? "—"}</span>
      </span>
      <div style={{
        flex: "0 0 26px", width: 26, height: 26, borderRadius: 999, background: INK,
        color: "#fff", fontSize: 11, fontWeight: 700, display: "inline-flex",
        alignItems: "center", justifyContent: "center",
      }}>
        M
      </div>
    </header>
  );
}

function Sidebar() {
  const items = [
    { name: "Home", href: "/app#home", Icon: Home, active: false },
    { name: "Brands", href: "/app#brands", Icon: Grid, active: true },
    { name: "Assets", href: "/app#assets", Icon: Assets, active: false },
    { name: "Guides", href: "/app#guides", Icon: Guides, active: false },
  ];
  return (
    <aside style={{
      width: 60, flex: "0 0 60px", borderRight: `1px solid ${HAIRLINE}`,
      background: PAPER, display: "flex", flexDirection: "column",
    }}>
      {items.map(({ name: itemName, href, Icon, active }) => (
        <a
          key={itemName}
          href={href}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            padding: "14px 0", position: "relative", color: active ? INK : MUTED,
          }}
        >
          {active ? (
            <div style={{ position: "absolute", left: 0, top: 18, bottom: 18, width: 2, background: INK, borderRadius: 2 }} />
          ) : null}
          <Icon size={20} />
          <span style={{ fontSize: 9.5, fontWeight: 600, color: active ? "rgba(0,0,0,.72)" : FAINT }}>{itemName}</span>
        </a>
      ))}
      <div style={{ flex: 1 }} />
      <a href="/app#settings" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 0", color: MUTED }}>
        <Settings size={20} />
        <span style={{ fontSize: 9.5, fontWeight: 600, color: FAINT }}>Settings</span>
      </a>
    </aside>
  );
}

// ---- shared styles ----------------------------------------------------

const fieldGroup: CSSProperties = { display: "flex", flexDirection: "column", gap: 8 };
const chipRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const inputStyle: CSSProperties = {
  width: "100%", border: 0, outline: "none", background: "#F5F5F6",
  borderRadius: 10, padding: "11px 13px", fontSize: 14, color: INK,
};
const ghostLink: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5,
  fontWeight: 600, color: MUTED, background: "transparent",
};
