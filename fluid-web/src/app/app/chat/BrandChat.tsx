"use client";

// The brand-kit conversation.
//
// No wizard chrome — no Back, no Continue. Every step in the script renders
// as a live widget: clicking a chip submits it immediately, typing and
// pressing Enter (or the small send button) submits it. Every step already
// answered stays on screen exactly the same way, still fully interactive —
// changing what an earlier widget shows re-answers it directly, which the
// server treats the same as any other answer: clears and re-drafts whatever
// came after it. There is nothing to "reopen"; it was never closed.
//
// The AI drafts an answer before the user sees most steps — see the
// server's /api/brand-kit/turn — pre-filling the widget rather than leaving
// it blank. `avoid` and `layout` are pure user choices with nothing to
// draft. `review` is a read-only summary whose one real button — "Generate
// the brand kit" — is deliberately still a real button: it is the one
// costly, irreversible action in the whole flow.
//
// Three top-level phases: `loading` (resuming a brand), `thread` (the
// conversation), `result` (the finished board) — chosen by whether
// `?brand=` resolves to a brand that already has `data.brandkit`.
//
// The visible step list is `STEPS` up to and including the current one —
// there is no separate "answered steps" list in state, since everything
// before the current step is, by definition, already answered (that's what
// the server's `nextStep` guarantees).

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { checkDomains, fetchBrand, postTurn, type TurnResult } from "./api";
import { ThinkingOrb } from "./ThinkingOrb";
import {
  CARD, DISPLAY, FAINT, HAIRLINE, INK, MONO, MUTED, PAPER, chip, cta, label, panel,
} from "./ui";
import {
  Assets, Chevron, Close, Download, Grid, Guides, Home, Refresh, Search, Send, Settings, Token,
} from "./icons";
import { AVOIDS } from "./data";
import { CATEGORIES, LAYOUTS, NAME_STYLES, VISUAL_MODES } from "@/lib/brand-kit/types";
import type { BrandKitResult, NameStyle, PaletteSwatch, VisualMode } from "@/lib/brand-kit/types";
import { STEPS, type StepKey } from "@/lib/brand-kit/steps";
import type { BrandKitDraft } from "@/lib/brand-kit/context";
import "./chat.css";

type Phase = "loading" | "thread" | "result";

export function BrandChat() {
  const [resumeId] = useState(() => new URLSearchParams(window.location.search).get("brand"));
  const [presetMode] = useState<VisualMode | null>(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    return m && VISUAL_MODES.some((v) => v.id === m) ? (m as VisualMode) : null;
  });

  // A sentence typed into the Home composer arrives as ?brief= and pre-fills
  // the first step, so what the user already wrote is not asked for twice.
  const [seedBrief] = useState(() =>
    (new URLSearchParams(window.location.search).get("brief") || "").trim().slice(0, 600),
  );

  const [phase, setPhase] = useState<Phase>(resumeId ? "loading" : "thread");
  const [brandId, setBrandId] = useState<string | null>(resumeId);
  const [result, setResult] = useState<BrandKitResult | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);

  const [step, setStep] = useState<StepKey>("brief");
  const [draft, setDraft] = useState<BrandKitDraft>({});
  const [proposed, setProposed] = useState<Partial<BrandKitDraft> | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);

  const [busy, setBusy] = useState(!!resumeId);
  const [regenerating, setRegenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);

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
        setPhase("thread");
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
        setPhase("thread");
        applyTurnResult(out);
      });
    });
  }, [resumeId, applyTurnResult]);

  // ---- keep the thread scrolled to the newest message ---------------------
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [step, busy]);

  // ---- turn handlers -------------------------------------------------

  // Fired by any widget the moment it has a value — a chip click, an Enter
  // key, a send button. `stepKey` is whichever step's widget fired this, not
  // necessarily the current frontier: submitting an earlier widget again is
  // exactly how an answer gets changed.
  const submitStep = useCallback(
    async (stepKey: StepKey, value: unknown) => {
      setError(null);
      setBusy(true);
      setStatus(null);
      const out = await postTurn({ brandId, step: stepKey, value }, (event) => setStatus(event.label));
      setBusy(false);
      setStatus(null);
      applyTurnResult(out);
    },
    [brandId, applyTurnResult],
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
    // logoConcepts appends a fresh batch instead of replacing the pool (see
    // the turn route) — it needs the current view (every batch shown so
    // far), since regenerate never persists and the server's own copy is
    // only whatever the last confirmed pick saved.
    const value =
      step === "logoConcepts"
        ? { concepts: proposed?.logoConcepts ?? draft.logoConcepts ?? [] }
        : undefined;
    const out = await postTurn({ brandId, step, regenerate: true, value }, (event) => setStatus(event.label));
    setRegenerating(false);
    setStatus(null);
    if (out.error) {
      setError(out.error);
      return;
    }
    setProposed(out.proposed ?? null);
    setDraftVersion((v) => v + 1);
  }, [brandId, step, draft, proposed]);

  const startOver = useCallback(() => {
    setError(null);
    setPhase("thread");
  }, []);

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const visibleSteps = STEPS.slice(0, Math.max(0, stepIndex) + 1);
  const breadcrumb = draft.name?.trim() || "New brand";

  return (
    <div className="bchat">
      <Header breadcrumb={breadcrumb} tokens={tokens} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
          <div ref={threadRef} className="bchat-thread" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "36px 24px 40px" }}>
            <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 26 }}>
              {phase === "loading" ? (
                <Busy label={status ?? "Loading…"} />
              ) : phase === "result" && result ? (
                <ResultView result={result} name={breadcrumb} onRegenerate={startOver} />
              ) : (
                <>
                  {visibleSteps.map((s) => {
                    const isCurrent = s.key === step;
                    const seed: BrandKitDraft = {
                      ...draft,
                      ...(isCurrent ? (proposed ?? {}) : {}),
                      // A quick-path preset wins as the shown default until the
                      // user reaches this step's own confirmed answer or asks
                      // the AI to redraft it.
                      ...(s.key === "visualMode" && presetMode && !draft.visualMode ? { visualMode: presetMode } : {}),
                      // Same rule for a brief carried in from the Home composer.
                      ...(s.key === "brief" && seedBrief && !draft.brief ? { brief: seedBrief } : {}),
                    };
                    return (
                      <ThreadMessage key={`${s.key}-${draftVersion}`} question={s.question} dimmed={!isCurrent}>
                        <Widget
                          stepKey={s.key}
                          seed={seed}
                          busy={busy}
                          regenerating={isCurrent && regenerating}
                          onSubmit={(value) => (s.key === "review" ? handleGenerate() : submitStep(s.key, value))}
                          onRegenerate={isCurrent && s.aiDrafted ? handleRegenerate : undefined}
                        />
                      </ThreadMessage>
                    );
                  })}
                  {error ? (
                    <div style={{ padding: "12px 16px", borderRadius: 12, background: "#FBEAE3", color: "#8A3E1C", fontSize: 13.5, marginLeft: 42 }}>
                      {error}
                    </div>
                  ) : null}
                  {busy ? <Busy label={status ?? "Working…"} /> : null}
                </>
              )}
              <div style={{ height: 8 }} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ---- one message: the question, plus its always-live widget -------------

function ThreadMessage({ question, dimmed, children }: { question: string; dimmed: boolean; children: ReactNode }) {
  return (
    <div className="bchat-msg" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ flex: "0 0 28px", width: 28, height: 28, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: dimmed ? 0.4 : 1 }}>
        <ThinkingOrb size={dimmed ? 18 : 22} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{
          fontFamily: DISPLAY, fontSize: dimmed ? 15 : 18, fontWeight: dimmed ? 600 : 700,
          letterSpacing: "-0.015em", color: dimmed ? "rgba(0,0,0,.4)" : INK, lineHeight: 1.4,
        }}>
          {question}
        </div>
        {children}
      </div>
    </div>
  );
}

// ---- the widget dispatcher ----------------------------------------------

interface WidgetProps {
  seed: BrandKitDraft;
  busy: boolean;
  regenerating: boolean;
  onSubmit: (value: unknown) => void;
  onRegenerate?: () => void;
}

function Widget(props: WidgetProps & { stepKey: StepKey }) {
  const { stepKey, ...common } = props;
  switch (stepKey) {
    case "brief":
      return <BriefWidget {...common} />;
    case "namePreferences":
      return <NamePreferencesWidget {...common} />;
    case "name":
      return <NameWidget {...common} />;
    case "category":
      return <ChoiceWidget {...common} field="category" options={CATEGORIES.map((c) => ({ id: c, name: c }))} />;
    case "audience":
      return <TextWidget {...common} field="audience" placeholder="Who is this for?" />;
    case "personality":
      return <TextWidget {...common} field="personality" placeholder="3-5 traits — how it behaves in a room" />;
    case "visualMode":
      return <ChoiceWidget {...common} field="visualMode" options={VISUAL_MODES} />;
    case "palette":
      return <PaletteWidget {...common} />;
    case "avoid":
      return <AvoidWidget {...common} />;
    case "logoConcepts":
      return <LogoConceptsWidget {...common} />;
    case "tagline":
      return <TextWidget {...common} field="tagline" placeholder="One short line" />;
    case "layout":
      return <ChoiceWidget {...common} field="layout" options={LAYOUTS} />;
    case "review":
      return <ReviewWidget {...common} />;
  }
}

// ---- shared small controls -----------------------------------------------

function SendButton({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      aria-label="Send"
      style={{
        width: 34, height: 34, borderRadius: 10, flex: "0 0 34px",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: enabled ? INK : "#EDEDEF", color: enabled ? "#fff" : "rgba(0,0,0,.3)",
      }}
    >
      <Send size={14} />
    </button>
  );
}

function AskAgain({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} style={{ ...ghostLink, alignSelf: "flex-start" }}>
      <Refresh size={12} /> {busy ? "Asking again…" : "Ask again"}
    </button>
  );
}

// ---- widgets --------------------------------------------------------

function BriefWidget({ seed, busy, onSubmit }: WidgetProps) {
  const [brief, setBrief] = useState(seed.brief ?? "");
  const canSubmit = !!brief.trim() && !busy;
  const submit = () => canSubmit && onSubmit(brief.trim());

  return (
    <div style={panel()}>
      <div style={fieldGroup}>
        <span style={label}>Brief</span>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="What is this, who is it for, what does it do?"
          disabled={busy}
          rows={3}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SendButton enabled={canSubmit} onClick={submit} />
      </div>
    </div>
  );
}

function TagInput({
  fieldLabel, placeholder, tags, onChange, busy,
}: {
  fieldLabel: string;
  placeholder: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  busy: boolean;
}) {
  const [value, setValue] = useState("");
  const add = () => {
    const v = value.trim();
    if (!v || tags.includes(v)) {
      setValue("");
      return;
    }
    onChange([...tags, v]);
    setValue("");
  };
  const remove = (t: string) => onChange(tags.filter((x) => x !== t));

  return (
    <div style={fieldGroup}>
      <span style={label}>{fieldLabel}</span>
      {tags.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.map((t) => (
            <span
              key={t}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 8px 5px 10px",
                borderRadius: 999, background: PAPER, boxShadow: `inset 0 0 0 1px ${HAIRLINE}`,
                fontSize: 12.5, color: INK,
              }}
            >
              {t}
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(t)}
                aria-label={`Remove ${t}`}
                style={{ display: "inline-flex", color: FAINT, padding: 0 }}
              >
                <Close size={10} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        placeholder={placeholder}
        disabled={busy}
        style={inputStyle}
      />
    </div>
  );
}

function NamePreferencesWidget({ seed, busy, onSubmit }: WidgetProps) {
  const existing = seed.namePreferences;
  const [styles, setStyles] = useState<NameStyle[]>(existing?.styles ?? ["all"]);
  const [maxSyllables, setMaxSyllables] = useState(existing?.maxSyllables ? String(existing.maxSyllables) : "");
  const [maxCharacters, setMaxCharacters] = useState(existing?.maxCharacters ? String(existing.maxCharacters) : "");
  const [maxWords, setMaxWords] = useState(existing?.maxWords ? String(existing.maxWords) : "");
  const [blacklist, setBlacklist] = useState<string[]>(existing?.blacklist ?? []);
  const [mustInclude, setMustInclude] = useState<string[]>(existing?.mustInclude ?? []);

  const toggleStyle = (s: NameStyle) => {
    if (s === "all") {
      setStyles(["all"]);
      return;
    }
    setStyles((cur) => {
      const without = cur.filter((c) => c !== "all");
      return without.includes(s) ? without.filter((c) => c !== s) : [...without, s];
    });
  };

  const submit = () => {
    if (busy) return;
    onSubmit({
      styles,
      maxSyllables: maxSyllables.trim() ? Number(maxSyllables) : undefined,
      maxCharacters: maxCharacters.trim() ? Number(maxCharacters) : undefined,
      maxWords: maxWords.trim() ? Number(maxWords) : undefined,
      blacklist,
      mustInclude,
    });
  };

  return (
    <div style={{ ...panel(), gap: 18 }}>
      <div style={fieldGroup}>
        <span style={label}>Name style</span>
        <div style={chipRow}>
          {NAME_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => toggleStyle(s.id)}
              title={s.example}
              style={chip(styles.includes(s.id))}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div style={fieldGroup}>
        <span style={label}>Name composition</span>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, color: MUTED }}>Max syllables</span>
            <input
              type="number" min={1} value={maxSyllables}
              onChange={(e) => setMaxSyllables(e.target.value)}
              placeholder="Any" disabled={busy} style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, color: MUTED }}>Max characters</span>
            <input
              type="number" min={1} value={maxCharacters}
              onChange={(e) => setMaxCharacters(e.target.value)}
              placeholder="Any" disabled={busy} style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, color: MUTED }}>Max words</span>
            <input
              type="number" min={1} value={maxWords}
              onChange={(e) => setMaxWords(e.target.value)}
              placeholder="Any" disabled={busy} style={inputStyle}
            />
          </div>
        </div>
      </div>

      <TagInput fieldLabel="Blacklisted words" placeholder="Type a word, press Enter…" tags={blacklist} onChange={setBlacklist} busy={busy} />
      <TagInput fieldLabel="Words to use exclusively" placeholder="Type a word, press Enter…" tags={mustInclude} onChange={setMustInclude} busy={busy} />

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SendButton enabled={!busy} onClick={submit} />
      </div>
    </div>
  );
}

// undefined = not checked yet, null = the check itself failed for this domain.
type DomainStatus = boolean | null | undefined;

function DomainBadge({ domain, status }: { domain: string; status: DomainStatus }) {
  const dot = { width: 6, height: 6, borderRadius: 99, flex: "0 0 auto" as const };
  if (status === undefined) {
    return <span style={{ fontFamily: MONO, fontSize: 10, color: FAINT, whiteSpace: "nowrap" }}>{domain}</span>;
  }
  if (status === null) {
    // Unconfigured or the check failed — say nothing rather than guess.
    return <span style={{ fontFamily: MONO, fontSize: 10, color: FAINT, whiteSpace: "nowrap" }}>{domain}</span>;
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 10, whiteSpace: "nowrap" }}>
      <span style={{ ...dot, background: status ? "#16A34A" : "rgba(0,0,0,.22)" }} />
      <span style={{ color: status ? "#16A34A" : FAINT }}>{domain}</span>
    </span>
  );
}

function NameWidget({ seed, busy, regenerating, onSubmit, onRegenerate }: WidgetProps) {
  const [custom, setCustom] = useState("");
  const candidates = seed.nameCandidates ?? [];
  const canSubmitCustom = !!custom.trim() && !busy;
  const submitCustom = () => canSubmitCustom && onSubmit({ candidates, name: custom.trim() });
  const pick = (name: string) => {
    if (busy) return;
    onSubmit({ candidates, name });
  };

  const domains = candidates.map((n) => n.domain).filter(Boolean);
  const domainsKey = domains.join(",");
  const [availability, setAvailability] = useState<Record<string, DomainStatus>>({});
  useEffect(() => {
    if (!domains.length) return;
    let live = true;
    checkDomains(domains).then((results) => {
      if (!live) return;
      setAvailability((cur) => {
        const next = { ...cur };
        for (const r of results) next[r.domain] = r.available;
        return next;
      });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainsKey]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {candidates.length ? (
        <div style={{ background: CARD, borderRadius: 18, boxShadow: `0 2px 6px rgba(0,0,0,.06), inset 0 0 0 1px ${HAIRLINE}`, overflow: "hidden" }}>
          {candidates.map((n, i) => {
            const selected = seed.name === n.name;
            return (
              <button
                key={n.name}
                type="button"
                disabled={busy}
                onClick={() => pick(n.name)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", width: "100%",
                  borderTop: i > 0 ? `1px solid ${HAIRLINE}` : undefined,
                  background: selected ? PAPER : "transparent",
                  boxShadow: selected ? `inset 3px 0 0 ${INK}` : undefined,
                  textAlign: "left", cursor: busy ? "default" : "pointer",
                }}
              >
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em", color: INK, flex: "0 0 auto" }}>
                  {n.name}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: MUTED, lineHeight: 1.45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n.why}
                </span>
                {n.domain ? <DomainBadge domain={n.domain} status={availability[n.domain]} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, paddingLeft: 14, borderRadius: 14, background: CARD, boxShadow: `inset 0 0 0 1px ${HAIRLINE}` }}>
        <span style={{ fontSize: 11.5, color: MUTED, whiteSpace: "nowrap" }}>Or write your own</span>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitCustom();
            }
          }}
          placeholder="Type a name…"
          disabled={busy}
          style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, letterSpacing: "-0.015em", color: INK, padding: "8px 0" }}
        />
        <SendButton enabled={canSubmitCustom} onClick={submitCustom} />
      </div>

      {onRegenerate ? <AskAgain onClick={onRegenerate} busy={regenerating} /> : null}
    </div>
  );
}

function ChoiceWidget(
  props: WidgetProps & { field: "category" | "visualMode" | "layout"; options: Array<{ id: string; name: string; note?: string }> },
) {
  const { seed, busy, regenerating, onSubmit, onRegenerate, field, options } = props;
  const current = (seed[field] as string | undefined) ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={chipRow}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={busy}
            onClick={() => onSubmit(o.id)}
            style={chip(o.id === current)}
            title={o.note}
          >
            {o.name}
          </button>
        ))}
      </div>
      {onRegenerate ? <AskAgain onClick={onRegenerate} busy={regenerating} /> : null}
    </div>
  );
}

function TextWidget(props: WidgetProps & { field: "audience" | "personality" | "tagline"; placeholder: string }) {
  const { seed, busy, regenerating, onSubmit, onRegenerate, field, placeholder } = props;
  const [value, setValue] = useState((seed[field] as string | undefined) ?? "");
  const canSubmit = !!value.trim() && !busy;
  const submit = () => canSubmit && onSubmit(value.trim());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, paddingLeft: 14, borderRadius: 14, background: CARD, boxShadow: `inset 0 0 0 1px ${HAIRLINE}` }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          disabled={busy}
          style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontSize: 14, color: INK, padding: "8px 0" }}
        />
        <SendButton enabled={canSubmit} onClick={submit} />
      </div>
      {onRegenerate ? <AskAgain onClick={onRegenerate} busy={regenerating} /> : null}
    </div>
  );
}

function PaletteWidget({ seed, busy, regenerating, onSubmit, onRegenerate }: WidgetProps) {
  const [swatches, setSwatches] = useState<PaletteSwatch[]>(
    seed.palette?.length ? seed.palette : [{ hex: "#14161A", role: "Primary" }],
  );
  const canSubmit = swatches.length > 0 && swatches.every((s) => /^#[0-9A-Fa-f]{6}$/.test(s.hex) && !!s.role.trim()) && !busy;
  const submit = () => canSubmit && onSubmit(swatches.map((s) => ({ hex: s.hex.toUpperCase(), role: s.role.trim() })));

  const update = (i: number, patch: Partial<PaletteSwatch>) =>
    setSwatches((cur) => cur.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => setSwatches((cur) => cur.filter((_, idx) => idx !== i));
  const add = () => setSwatches((cur) => (cur.length >= 6 ? cur : [...cur, { hex: "#000000", role: "" }]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button type="button" disabled={busy || swatches.length >= 6} onClick={add} style={{ ...ghostLink }}>
            + Add colour
          </button>
          <SendButton enabled={canSubmit} onClick={submit} />
        </div>
      </div>
      {onRegenerate ? <AskAgain onClick={onRegenerate} busy={regenerating} /> : null}
    </div>
  );
}

function AvoidWidget({ seed, busy, onSubmit }: WidgetProps) {
  const [selected, setSelected] = useState<string[]>(seed.avoid ?? []);
  const toggle = (item: string) => setSelected((cur) => (cur.includes(item) ? cur.filter((a) => a !== item) : [...cur, item]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={chipRow}>
        {AVOIDS.map((a) => (
          <button key={a} type="button" disabled={busy} onClick={() => toggle(a)} style={chip(selected.includes(a))}>
            {a}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SendButton enabled={!busy} onClick={() => onSubmit(selected)} />
      </div>
    </div>
  );
}

function LogoConceptsWidget({ seed, busy, regenerating, onSubmit, onRegenerate }: WidgetProps) {
  const concepts = seed.logoConcepts ?? [];
  const current = seed.logoConceptId ?? "";

  // Grouped by generation round, not chunked by position — a batch can
  // have fewer than 6 entries when a render fails, which would otherwise
  // misalign every batch drawn after the first partial one.
  const batches = new Map<number, typeof concepts>();
  for (const c of concepts) {
    const list = batches.get(c.batch);
    if (list) list.push(c);
    else batches.set(c.batch, [c]);
  }
  const batchNumbers = [...batches.keys()].sort((a, b) => a - b);
  const latestBatch = batchNumbers[batchNumbers.length - 1] ?? 0;
  const pickedBatch = concepts.find((c) => c.id === current)?.batch;

  // This widget remounts on every turn (see ThreadMessage's `key` in the
  // parent), so this only needs to pick the right default once: whichever
  // batch the current pick lives in, or the newest batch just drawn.
  const [activeTab, setActiveTab] = useState(pickedBatch ?? latestBatch);

  const pick = (id: string) => {
    if (busy || id === current) return;
    onSubmit({ concepts, selectedId: id });
  };

  if (concepts.length === 0) {
    return <div style={{ fontSize: 13.5, color: MUTED }}>No concepts drawn yet — try asking again.</div>;
  }

  const shown = batches.get(activeTab) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {batchNumbers.length > 1 ? (
        <div style={chipRow}>
          {batchNumbers.map((b) => (
            <button key={b} type="button" disabled={busy} onClick={() => setActiveTab(b)} style={chip(b === activeTab)}>
              Batch {b + 1}
            </button>
          ))}
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {shown.map((c) => {
          const selected = c.id === current;
          return (
            <button
              key={c.id}
              type="button"
              disabled={busy}
              onClick={() => pick(c.id)}
              title={c.idea}
              style={{
                display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 14,
                background: CARD, textAlign: "left", cursor: busy ? "default" : "pointer",
                boxShadow: selected ? `0 0 0 2px ${INK}, 0 6px 18px rgba(0,0,0,.08)` : `inset 0 0 0 1px ${HAIRLINE}`,
                opacity: current && !selected ? 0.6 : 1,
                transition: "opacity 140ms, box-shadow 140ms",
              }}
            >
              <div style={{ borderRadius: 10, overflow: "hidden", background: "#fff", boxShadow: `inset 0 0 0 1px ${HAIRLINE}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imageUrl} alt={c.label} style={{ display: "block", width: "100%", aspectRatio: "1 / 1", objectFit: "contain" }} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(0,0,0,.72)", padding: "0 2px" }}>{c.label}</span>
            </button>
          );
        })}
      </div>
      {onRegenerate ? <AskAgain onClick={onRegenerate} busy={regenerating} /> : null}
    </div>
  );
}

function summarizeNamePreferences(p: WidgetProps["seed"]["namePreferences"]): string {
  if (!p) return "No preference";
  const parts: string[] = [];
  if (p.styles.length && !p.styles.includes("all")) {
    parts.push(p.styles.map((id) => NAME_STYLES.find((s) => s.id === id)?.name ?? id).join(", "));
  }
  const composition = [
    p.maxSyllables ? `≤${p.maxSyllables} syllables` : null,
    p.maxCharacters ? `≤${p.maxCharacters} chars` : null,
    p.maxWords ? `≤${p.maxWords} words` : null,
  ].filter((c): c is string => !!c);
  if (composition.length) parts.push(composition.join(", "));
  if (p.blacklist.length) parts.push(`avoid: ${p.blacklist.join(", ")}`);
  if (p.mustInclude.length) parts.push(`include: ${p.mustInclude.join(", ")}`);
  return parts.length ? parts.join(" · ") : "No preference";
}

function ReviewWidget({ seed, busy, onSubmit }: WidgetProps) {
  const chosenLogo = seed.logoConcepts?.find((c) => c.id === seed.logoConceptId);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...panel(), gap: 10 }}>
        <Row k="Name" v={seed.name ?? ""} />
        <Row k="Name preferences" v={summarizeNamePreferences(seed.namePreferences)} />
        <Row k="Category" v={seed.category ?? ""} />
        <Row k="Audience" v={seed.audience ?? ""} />
        <Row k="Personality" v={seed.personality ?? ""} />
        {chosenLogo ? (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ ...label, flex: "0 0 150px" }}>Logo</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", background: "#fff", boxShadow: `inset 0 0 0 1px ${HAIRLINE}`, flex: "0 0 40px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={chosenLogo.imageUrl} alt={chosenLogo.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <span style={{ fontSize: 13.5, color: "rgba(0,0,0,.78)" }}>{chosenLogo.label}</span>
              </div>
            </div>
            <Row k="Logo idea" v={chosenLogo.idea} />
          </>
        ) : null}
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
      <button type="button" disabled={busy} onClick={() => onSubmit(true)} style={{ ...cta(!busy), alignSelf: "flex-start", padding: "13px 22px", fontSize: 14 }}>
        Generate the brand kit
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
