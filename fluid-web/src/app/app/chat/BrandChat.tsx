"use client";

// The brand-kit stepper.
//
// One field (or a couple of closely related fields) per screen. The AI
// drafts an answer before the user sees most steps — see the server's
// /api/brand-kit/turn — and the user can accept it as-is, edit it, or ask
// for another draft before continuing. `avoid` and `layout` are pure user
// choices with nothing to draft. `review` is a read-only summary that kicks
// off the actual board render.
//
// Three top-level phases: `loading` (resuming a brand), `stepper` (walking
// the steps), `result` (the finished board) — chosen by whether `?brand=`
// resolves to a brand that already has `data.brandkit`.

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { fetchBrand, postTurn, type TurnResult } from "./api";
import { ThinkingOrb } from "./ThinkingOrb";
import {
  CARD, DISPLAY, FAINT, HAIRLINE, INK, MONO, MUTED, PAPER, chip, cta, label, panel,
} from "./ui";
import {
  Assets, Chevron, ChevronLeft, Close, Download, Grid, Guides, Home, Refresh, Search, Settings, Token,
} from "./icons";
import { AVOIDS } from "./data";
import { CATEGORIES, LAYOUTS, VISUAL_MODES } from "@/lib/brand-kit/types";
import type { BrandKitResult, PaletteSwatch, VisualMode } from "@/lib/brand-kit/types";
import { STEPS, getStep, type StepKey } from "@/lib/brand-kit/steps";
import type { BrandKitDraft } from "@/lib/brand-kit/context";
import "./chat.css";

type Phase = "loading" | "stepper" | "result";

export function BrandChat() {
  const [resumeId] = useState(() => new URLSearchParams(window.location.search).get("brand"));
  const [presetMode] = useState<VisualMode | null>(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    return m && VISUAL_MODES.some((v) => v.id === m) ? (m as VisualMode) : null;
  });

  const [phase, setPhase] = useState<Phase>(resumeId ? "loading" : "stepper");
  const [brandId, setBrandId] = useState<string | null>(resumeId);
  const [result, setResult] = useState<BrandKitResult | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);

  const [step, setStep] = useState<StepKey>("brief");
  const [draft, setDraft] = useState<BrandKitDraft>({});
  const [proposed, setProposed] = useState<Partial<BrandKitDraft> | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [history, setHistory] = useState<StepKey[]>([]);

  const [busy, setBusy] = useState(!!resumeId);
  const [regenerating, setRegenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const applyTurnResult = useCallback((out: TurnResult) => {
    if (out.brandId) setBrandId(out.brandId);
    if (out.error) {
      setError(out.error);
      return;
    }
    if (out.done && out.brandkit) {
      setResult(out.brandkit);
      setPhase("result");
      return;
    }
    if (out.step) {
      setStep(out.step);
      setDraft(out.draft ?? {});
      setProposed(out.proposed ?? null);
      setDraftVersion((v) => v + 1);
    }
  }, []);

  // ---- resume ------------------------------------------------------------
  useEffect(() => {
    if (!resumeId) return;
    fetchBrand(resumeId).then(({ brand, error: err }) => {
      if (err || !brand) {
        setError(err ?? "That brand could not be found.");
        setPhase("stepper");
        setBusy(false);
        return;
      }
      if (brand.data?.brandkit) {
        setResult(brand.data.brandkit);
        setPhase("result");
        setBusy(false);
        return;
      }
      setBrandId(brand.id);
      postTurn({ brandId: brand.id }, (event) => setStatus(event.label)).then((out) => {
        setBusy(false);
        setStatus(null);
        setPhase("stepper");
        applyTurnResult(out);
      });
    });
  }, [resumeId, applyTurnResult]);

  // ---- turn handlers -------------------------------------------------

  const handleContinue = useCallback(
    async (value: unknown) => {
      setError(null);
      setBusy(true);
      setStatus(null);
      setHistory((h) => [...h, step]);
      const out = await postTurn({ brandId, step, value }, (event) => setStatus(event.label));
      setBusy(false);
      setStatus(null);
      applyTurnResult(out);
    },
    [brandId, step, applyTurnResult],
  );

  const handleGenerate = useCallback(async () => {
    setError(null);
    setBusy(true);
    setStatus(null);
    const out = await postTurn({ brandId, step: "review", value: true }, (event) => setStatus(event.label));
    setBusy(false);
    setStatus(null);
    applyTurnResult(out);
  }, [brandId, applyTurnResult]);

  const handleRegenerate = useCallback(async () => {
    setError(null);
    setRegenerating(true);
    setStatus(null);
    const out = await postTurn({ brandId, step, regenerate: true }, (event) => setStatus(event.label));
    setRegenerating(false);
    setStatus(null);
    if (out.error) {
      setError(out.error);
      return;
    }
    setProposed(out.proposed ?? null);
    setDraftVersion((v) => v + 1);
  }, [brandId, step]);

  const handleBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setStep(prev);
      setProposed(null);
      setDraftVersion((v) => v + 1);
      setError(null);
      return h.slice(0, -1);
    });
  }, []);

  const startOver = useCallback(() => {
    setError(null);
    setPhase("stepper");
  }, []);

  const stepDef = getStep(step) ?? STEPS[0];
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const seed: BrandKitDraft = {
    ...draft,
    ...(proposed ?? {}),
    // A quick-path preset wins as the shown default until the user reaches
    // this step's own confirmed answer or asks the AI to redraft it.
    ...(step === "visualMode" && presetMode && !draft.visualMode ? { visualMode: presetMode } : {}),
  };
  const breadcrumb = draft.name?.trim() || "New brand";

  return (
    <div className="bchat">
      <Header breadcrumb={breadcrumb} tokens={tokens} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "40px 24px 60px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            {phase === "loading" || busy ? (
              <Busy label={status ?? (phase === "loading" ? "Loading…" : "Working…")} />
            ) : phase === "result" && result ? (
              <ResultView result={result} name={breadcrumb} onRegenerate={startOver} />
            ) : (
              <Stepper
                key={`${step}-${draftVersion}`}
                stepKey={step}
                index={stepIndex}
                total={STEPS.length}
                question={stepDef.question}
                seed={seed}
                busy={false}
                regenerating={regenerating}
                error={error}
                canGoBack={history.length > 0}
                onBack={handleBack}
                onContinue={(value) => (step === "review" ? handleGenerate() : handleContinue(value))}
                onRegenerate={stepDef.aiDrafted ? handleRegenerate : undefined}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ---- the stepper dispatcher ---------------------------------------------

interface StepBodyProps {
  index: number;
  total: number;
  question: string;
  seed: BrandKitDraft;
  busy: boolean;
  regenerating: boolean;
  error: string | null;
  canGoBack: boolean;
  onBack: () => void;
  onContinue: (value: unknown) => void;
  onRegenerate?: () => void;
}

function Stepper(props: StepBodyProps & { stepKey: StepKey }) {
  const { stepKey, ...rest } = props;
  // Fields lock while a redraft is in flight too, not just while the whole
  // stepper is busy — a fresh `proposed` value is about to replace whatever
  // is on screen.
  const common = { ...rest, busy: rest.busy || rest.regenerating };
  switch (stepKey) {
    case "brief":
      return <BriefStepBody {...common} />;
    case "category":
      return <ChoiceStepBody {...common} field="category" options={CATEGORIES.map((c) => ({ id: c, name: c }))} />;
    case "audience":
      return <TextStepBody {...common} field="audience" placeholder="Who is this for?" />;
    case "personality":
      return (
        <PairStepBody
          {...common}
          fieldA={{ key: "personality", label: "Personality", placeholder: "3-5 traits — how it behaves in a room" }}
          fieldB={{ key: "emotionalPromise", label: "Emotional promise", placeholder: "The feeling this brand promises" }}
        />
      );
    case "positioning":
      return (
        <PairStepBody
          {...common}
          fieldA={{ key: "culturalPosition", label: "Cultural position", placeholder: "Where this sits culturally" }}
          fieldB={{ key: "trustLevel", label: "Trust level", placeholder: "How much trust it needs to earn" }}
        />
      );
    case "concept":
      return (
        <PairStepBody
          {...common}
          fieldA={{ key: "coreMetaphor", label: "Core metaphor", placeholder: "The one symbolic idea" }}
          fieldB={{ key: "logoIdea", label: "Logo idea", placeholder: "How the mark expresses it" }}
        />
      );
    case "visualMode":
      return <ChoiceStepBody {...common} field="visualMode" options={VISUAL_MODES} />;
    case "palette":
      return <PaletteStepBody {...common} />;
    case "tagline":
      return <TextStepBody {...common} field="tagline" placeholder="One short line" />;
    case "avoid":
      return <AvoidStepBody {...common} />;
    case "layout":
      return <ChoiceStepBody {...common} field="layout" options={LAYOUTS} />;
    case "review":
      return <ReviewStepBody {...common} />;
  }
}

// ---- step bodies ----------------------------------------------------

function BriefStepBody({ index, total, question, seed, busy, error, canGoBack, onBack, onContinue }: StepBodyProps) {
  const [name, setName] = useState(seed.name ?? "");
  const [brief, setBrief] = useState(seed.brief ?? "");
  const canContinue = !!name.trim() && !!brief.trim() && !busy;

  return (
    <StepChrome
      index={index}
      total={total}
      question={question}
      error={error}
      footer={
        <StepFooter
          canGoBack={canGoBack}
          onBack={onBack}
          canContinue={canContinue}
          onContinue={() => onContinue({ name: name.trim(), brief: brief.trim() })}
        />
      }
    >
      <div style={panel()}>
        <div style={fieldGroup}>
          <span style={label}>Brand name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Northwind" disabled={busy} style={inputStyle} />
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
    </StepChrome>
  );
}

function ChoiceStepBody(
  props: StepBodyProps & { field: "category" | "visualMode" | "layout"; options: Array<{ id: string; name: string; note?: string }> },
) {
  const { index, total, question, seed, busy, regenerating, error, canGoBack, onBack, onContinue, onRegenerate, field, options } = props;
  const [value, setValue] = useState<string>((seed[field] as string | undefined) ?? (field === "layout" ? "3x3" : ""));
  const canContinue = !!value && !busy;

  return (
    <StepChrome
      index={index}
      total={total}
      question={question}
      error={error}
      footer={
        <StepFooter
          canGoBack={canGoBack}
          onBack={onBack}
          canContinue={canContinue}
          onContinue={() => onContinue(value)}
          onRegenerate={onRegenerate}
          regenerating={regenerating}
        />
      }
    >
      <div style={chipRow}>
        {options.map((o) => (
          <button key={o.id} type="button" disabled={busy} onClick={() => setValue(o.id)} style={chip(value === o.id)} title={o.note}>
            {o.name}
          </button>
        ))}
      </div>
    </StepChrome>
  );
}

function TextStepBody(
  props: StepBodyProps & { field: "audience" | "tagline"; placeholder: string },
) {
  const { index, total, question, seed, busy, regenerating, error, canGoBack, onBack, onContinue, onRegenerate, field, placeholder } = props;
  const [value, setValue] = useState((seed[field] as string | undefined) ?? "");
  const canContinue = !!value.trim() && !busy;

  return (
    <StepChrome
      index={index}
      total={total}
      question={question}
      error={error}
      footer={
        <StepFooter
          canGoBack={canGoBack}
          onBack={onBack}
          canContinue={canContinue}
          onContinue={() => onContinue(value.trim())}
          onRegenerate={onRegenerate}
          regenerating={regenerating}
        />
      }
    >
      <div style={panel()}>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} disabled={busy} style={inputStyle} />
      </div>
    </StepChrome>
  );
}

interface PairField {
  key: keyof BrandKitDraft;
  label: string;
  placeholder: string;
}

function PairStepBody(props: StepBodyProps & { fieldA: PairField; fieldB: PairField }) {
  const { index, total, question, seed, busy, regenerating, error, canGoBack, onBack, onContinue, onRegenerate, fieldA, fieldB } = props;
  const [a, setA] = useState((seed[fieldA.key] as string | undefined) ?? "");
  const [b, setB] = useState((seed[fieldB.key] as string | undefined) ?? "");
  const canContinue = !!a.trim() && !!b.trim() && !busy;

  return (
    <StepChrome
      index={index}
      total={total}
      question={question}
      error={error}
      footer={
        <StepFooter
          canGoBack={canGoBack}
          onBack={onBack}
          canContinue={canContinue}
          onContinue={() => onContinue({ [fieldA.key]: a.trim(), [fieldB.key]: b.trim() })}
          onRegenerate={onRegenerate}
          regenerating={regenerating}
        />
      }
    >
      <div style={{ ...panel(), gap: 16 }}>
        <div style={fieldGroup}>
          <span style={label}>{fieldA.label}</span>
          <textarea value={a} onChange={(e) => setA(e.target.value)} placeholder={fieldA.placeholder} disabled={busy} rows={2} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
        </div>
        <div style={fieldGroup}>
          <span style={label}>{fieldB.label}</span>
          <textarea value={b} onChange={(e) => setB(e.target.value)} placeholder={fieldB.placeholder} disabled={busy} rows={2} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
        </div>
      </div>
    </StepChrome>
  );
}

function PaletteStepBody({ index, total, question, seed, busy, regenerating, error, canGoBack, onBack, onContinue, onRegenerate }: StepBodyProps) {
  const [swatches, setSwatches] = useState<PaletteSwatch[]>(
    seed.palette?.length ? seed.palette : [{ hex: "#14161A", role: "Primary" }],
  );
  const canContinue = swatches.length > 0 && swatches.every((s) => /^#[0-9A-Fa-f]{6}$/.test(s.hex) && !!s.role.trim()) && !busy;

  const update = (i: number, patch: Partial<PaletteSwatch>) =>
    setSwatches((cur) => cur.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => setSwatches((cur) => cur.filter((_, idx) => idx !== i));
  const add = () => setSwatches((cur) => (cur.length >= 6 ? cur : [...cur, { hex: "#000000", role: "" }]));

  return (
    <StepChrome
      index={index}
      total={total}
      question={question}
      error={error}
      footer={
        <StepFooter
          canGoBack={canGoBack}
          onBack={onBack}
          canContinue={canContinue}
          onContinue={() => onContinue(swatches.map((s) => ({ hex: s.hex.toUpperCase(), role: s.role.trim() })))}
          onRegenerate={onRegenerate}
          regenerating={regenerating}
        />
      }
    >
      <div style={{ ...panel(), gap: 10 }}>
        {swatches.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8, flex: "0 0 28px",
                background: /^#[0-9A-Fa-f]{6}$/.test(s.hex) ? s.hex : "#EDEDEF",
                boxShadow: `inset 0 0 0 1px ${HAIRLINE}`,
              }}
            />
            <input
              value={s.hex}
              onChange={(e) => update(i, { hex: e.target.value })}
              disabled={busy}
              style={{ ...inputStyle, width: 110, fontFamily: MONO, fontSize: 13 }}
            />
            <input
              value={s.role}
              onChange={(e) => update(i, { role: e.target.value })}
              placeholder="Role — e.g. Primary"
              disabled={busy}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              disabled={busy || swatches.length <= 1}
              onClick={() => remove(i)}
              aria-label="Remove swatch"
              style={{ ...ghostLink, padding: 6, opacity: swatches.length <= 1 ? 0.35 : 1 }}
            >
              <Close size={13} />
            </button>
          </div>
        ))}
        <button type="button" disabled={busy || swatches.length >= 6} onClick={add} style={{ ...ghostLink, alignSelf: "flex-start" }}>
          + Add colour
        </button>
      </div>
    </StepChrome>
  );
}

function AvoidStepBody({ index, total, question, seed, busy, error, canGoBack, onBack, onContinue }: StepBodyProps) {
  const [selected, setSelected] = useState<string[]>(seed.avoid ?? []);
  const toggle = (item: string) => setSelected((cur) => (cur.includes(item) ? cur.filter((a) => a !== item) : [...cur, item]));

  return (
    <StepChrome
      index={index}
      total={total}
      question={question}
      error={error}
      footer={
        <StepFooter
          canGoBack={canGoBack}
          onBack={onBack}
          canContinue={!busy}
          onContinue={() => onContinue(selected)}
          continueLabel={selected.length ? "Continue" : "Nothing to avoid — continue"}
        />
      }
    >
      <div style={chipRow}>
        {AVOIDS.map((a) => (
          <button key={a} type="button" disabled={busy} onClick={() => toggle(a)} style={chip(selected.includes(a))}>
            {a}
          </button>
        ))}
      </div>
    </StepChrome>
  );
}

function ReviewStepBody({ index, total, question, seed, busy, error, canGoBack, onBack, onContinue }: StepBodyProps) {
  return (
    <StepChrome
      index={index}
      total={total}
      question={question}
      error={error}
      footer={<StepFooter canGoBack={canGoBack} onBack={onBack} canContinue={!busy} onContinue={() => onContinue(true)} continueLabel="Generate the brand kit" />}
    >
      <div style={{ ...panel(), gap: 10 }}>
        <Row k="Name" v={seed.name ?? ""} />
        <Row k="Category" v={seed.category ?? ""} />
        <Row k="Audience" v={seed.audience ?? ""} />
        <Row k="Personality" v={seed.personality ?? ""} />
        <Row k="Emotional promise" v={seed.emotionalPromise ?? ""} />
        <Row k="Cultural position" v={seed.culturalPosition ?? ""} />
        <Row k="Trust level" v={seed.trustLevel ?? ""} />
        <Row k="Core metaphor" v={seed.coreMetaphor ?? ""} />
        <Row k="Logo idea" v={seed.logoIdea ?? ""} />
        <Row k="Visual mode" v={VISUAL_MODES.find((m) => m.id === seed.visualMode)?.name ?? ""} />
        <Row k="Tagline" v={seed.tagline ?? ""} />
        <Row k="Layout" v={LAYOUTS.find((l) => l.id === seed.layout)?.name ?? ""} />
        <Row k="Avoid" v={seed.avoid?.length ? seed.avoid.join(", ") : "Nothing specified"} />
      </div>
      {seed.palette?.length ? (
        <div style={{ display: "flex", gap: 6 }}>
          {seed.palette.map((p) => (
            <div key={p.hex} title={`${p.role} — ${p.hex}`} style={{ flex: 1, height: 28, borderRadius: 8, background: p.hex, boxShadow: `inset 0 0 0 1px ${HAIRLINE}` }} />
          ))}
        </div>
      ) : null}
    </StepChrome>
  );
}

// ---- shared step chrome ------------------------------------------------

function StepChrome({
  index, total, question, error, children, footer,
}: {
  index: number;
  total: number;
  question: string;
  error: string | null;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const pct = total > 0 ? ((Math.max(0, index) + 1) / total) * 100 : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
      <div>
        <div style={{ ...label, marginBottom: 10 }}>
          Step {Math.max(0, index) + 1} of {total}
        </div>
        <div style={{ height: 3, background: "#EDEDEF", borderRadius: 99, overflow: "hidden", marginBottom: 22 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: INK, borderRadius: 99, transition: "width 200ms" }} />
        </div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em", margin: 0, color: INK, lineHeight: 1.35 }}>
          {question}
        </h1>
      </div>
      {children}
      {error ? (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "#FBEAE3", color: "#8A3E1C", fontSize: 13.5 }}>
          {error}
        </div>
      ) : null}
      {footer}
    </div>
  );
}

function StepFooter({
  canGoBack, onBack, canContinue, onContinue, continueLabel = "Continue", onRegenerate, regenerating,
}: {
  canGoBack: boolean;
  onBack: () => void;
  canContinue: boolean;
  onContinue: () => void;
  continueLabel?: string;
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        type="button"
        disabled={!canGoBack}
        onClick={onBack}
        style={{ ...ghostLink, opacity: canGoBack ? 1 : 0.35, cursor: canGoBack ? "pointer" : "default" }}
      >
        <ChevronLeft size={11} /> Back
      </button>
      <div style={{ flex: 1 }} />
      {onRegenerate ? (
        <button type="button" onClick={onRegenerate} disabled={regenerating} style={ghostLink}>
          <Refresh size={12} /> {regenerating ? "Asking again…" : "Ask again"}
        </button>
      ) : null}
      <button type="button" disabled={!canContinue} onClick={onContinue} style={{ ...cta(canContinue), padding: "12px 20px", fontSize: 13.5 }}>
        {continueLabel}
      </button>
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
        <Row k="Emotional promise" v={strategy.emotionalPromise} />
        <Row k="Cultural position" v={strategy.culturalPosition} />
        <Row k="Trust level" v={strategy.trustLevel} />
        <Row k="Core metaphor" v={strategy.coreMetaphor} />
        <Row k="Logo idea" v={strategy.logoIdea} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <a href={result.imageUrl} download target="_blank" rel="noreferrer" style={{ ...cta(true), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Download size={14} /> Download
        </a>
        <button type="button" onClick={onRegenerate} style={{ ...cta(true), background: CARD, color: INK, boxShadow: `inset 0 0 0 1px ${HAIRLINE}`, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Refresh size={13} /> Start over
        </button>
        <a href="/app#brands" style={ghostLink}>
          Back to brands
        </a>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <span style={{ ...label, flex: "0 0 150px" }}>{k}</span>
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

// ---- shell (unchanged from the previous pass) ----------------------------------

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
