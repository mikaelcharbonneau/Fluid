"use client";

// One component per question.
//
// Every widget takes the same two things — whether it has already been
// answered, and a `submit` — and owns nothing else. The thread decides when a
// widget appears; the widget decides only what a valid answer looks like, and
// the shape it submits is the shape `lib/brand-chat/answer.ts` validates.
//
// Widgets stay live after they are answered. Editing one is how a user changes
// their mind, and the thread turns that into a re-run of everything below.

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  AVOIDS, CATEGORIES, GOALS, LOGO_TYPES, PATHS, SLIDERS, STAGES, TIMINGS, VALUES,
} from "./data";
import {
  CARD, CORAL, DISPLAY, FAINT, HAIRLINE, INK, MONO, MUTED, PAPER,
  card, chip, cta, ghostButton, label, panel, softButton, tick,
} from "./ui";
import { Arrow, Check, ChevronLeft, Chevron, Close, Heart, Refresh, Sparkle } from "./icons";
import type {
  BrandKit, DirectionOption, LaunchPlan, NameCandidate, PositionRead, TaglineOption, VoiceOption,
} from "@/lib/brand-chat/contracts";
import type { LogoSet } from "@/lib/brand-chat/logo";
import type { Personality } from "@/lib/brand-chat/context";

export interface WidgetProps<T> {
  answered: boolean;
  submit: (value: T) => void;
  /** True while a turn is in flight — every control locks so a double-submit is impossible. */
  busy: boolean;
}

const row: CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const wrap: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };

function Cta({
  enabled, busy, onClick, children,
}: {
  enabled: boolean;
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const on = enabled && !busy;
  return (
    <button type="button" style={cta(on)} disabled={!on} onClick={onClick}>
      {children}
    </button>
  );
}

// ---- path ------------------------------------------------------------

export function PathWidget({ answered, submit, busy, value }: WidgetProps<string> & { value?: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {PATHS.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={busy}
          onClick={() => submit(p.id)}
          style={{ ...card(value === p.id), width: 240, gap: 5 }}
        >
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: "-0.018em", color: INK }}>
            {p.name}
          </span>
          <span style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.4 }}>{p.note}</span>
        </button>
      ))}
      {answered ? null : null}
    </div>
  );
}

// ---- brief -----------------------------------------------------------

/** The three rewrites the existing inline-assist route already knows how to do. */
export type BriefTask = "brief_shorter" | "brief_punchier" | "brief_sharper";

export function BriefWidget({
  answered, submit, busy, value, onAssist,
}: WidgetProps<string> & {
  value: string;
  /** Rewrites the brief in place. Resolves to the new text, or null on failure. */
  onAssist: (task: BriefTask) => Promise<string | null>;
}) {
  const [text, setText] = useState(value);
  const [assisting, setAssisting] = useState<BriefTask | null>(null);

  const rewrite = async (task: BriefTask) => {
    setAssisting(task);
    const next = await onAssist(task);
    if (next) setText(next);
    setAssisting(null);
  };

  const assists: Array<[BriefTask, string]> = [
    ["brief_shorter", "Rewrite shorter"],
    ["brief_punchier", "Make it punchier"],
    ["brief_sharper", "Sharpen the angle"],
  ];

  return (
    <div style={{ ...panel(20), padding: 20, gap: 0 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="A productivity tool for founders who run on rituals — not roadmaps."
        rows={3}
        disabled={busy}
        style={{
          width: "100%", resize: "vertical", border: "none", outline: "none", background: "transparent",
          fontFamily: DISPLAY, fontSize: 21, fontWeight: 500, letterSpacing: "-0.018em",
          color: INK, lineHeight: 1.4, minHeight: 80,
        }}
      />
      <div style={{
        ...row, marginTop: 14, paddingTop: 14, gap: 8,
        borderTop: `1px dashed ${HAIRLINE}`, flexWrap: "wrap",
      }}>
        {assists.map(([task, name], i) => (
          <button
            key={task}
            type="button"
            className="bchat-soft"
            disabled={busy || !!assisting || !text.trim()}
            onClick={() => rewrite(task)}
            style={{ ...softButton, padding: "5px 10px", borderRadius: 8, fontSize: 11, opacity: assisting && assisting !== task ? 0.5 : 1 }}
          >
            {i === 0 ? <Sparkle size={11} /> : null}
            {assisting === task ? "Rewriting…" : name}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <Cta enabled={!!text.trim()} busy={busy} onClick={() => submit(text.trim())}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            {answered ? "Update brief" : "Send brief"}
            <Arrow size={12} />
          </span>
        </Cta>
      </div>
    </div>
  );
}

// ---- single-choice chips --------------------------------------------

export function ChipsWidget({
  options, value, submit, busy,
}: WidgetProps<string> & { options: string[]; value?: string }) {
  return (
    <div style={wrap}>
      {options.map((o) => (
        <button key={o} type="button" disabled={busy} onClick={() => submit(o)} style={chip(value === o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export const CategoryWidget = (p: WidgetProps<string> & { value?: string }) => (
  <ChipsWidget {...p} options={CATEGORIES} />
);
export const StageWidget = (p: WidgetProps<string> & { value?: string }) => (
  <ChipsWidget {...p} options={STAGES} />
);
export const GoalWidget = (p: WidgetProps<string> & { value?: string }) => (
  <ChipsWidget {...p} options={GOALS} />
);

// ---- token list (audience, competitors) ------------------------------

function TokenList({
  items, onRemove, initials: withInitials, busy,
}: {
  items: string[];
  onRemove: (v: string) => void;
  initials?: boolean;
  busy: boolean;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((v) => (
        <span
          key={v}
          style={{
            display: "inline-flex", alignItems: "center", gap: withInitials ? 8 : 7,
            background: PAPER, borderRadius: 99,
            padding: withInitials ? "5px 6px" : "5px 6px 5px 11px",
            boxShadow: `inset 0 0 0 1px ${HAIRLINE}`, fontSize: 12, fontWeight: 600,
          }}
        >
          {withInitials ? (
            <span style={{
              width: 18, height: 18, borderRadius: 99, background: "#F0F0F2",
              color: "rgba(0,0,0,.72)", display: "inline-flex", alignItems: "center",
              justifyContent: "center", fontFamily: DISPLAY, fontSize: 10, fontWeight: 800,
            }}>
              {(v[0] || "?").toUpperCase()}
            </span>
          ) : null}
          <span>{v}</span>
          <button
            type="button"
            className="bchat-x"
            aria-label={`Remove ${v}`}
            disabled={busy}
            onClick={() => onRemove(v)}
            style={{
              width: 18, height: 18, borderRadius: 99, background: "transparent",
              color: FAINT, display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Close size={9} />
          </button>
        </span>
      ))}
    </div>
  );
}

export function TokenWidget({
  answered, submit, busy, value, placeholder, suggestLabel, onSuggest, ctaLabel, initials: withInitials,
}: WidgetProps<string[]> & {
  value: string[];
  placeholder: string;
  suggestLabel: string;
  onSuggest: () => Promise<string[] | null>;
  ctaLabel: string;
  initials?: boolean;
}) {
  const [items, setItems] = useState<string[]>(value);
  const [draft, setDraft] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setItems((cur) => (cur.some((x) => x.toLowerCase() === v.toLowerCase()) ? cur : [...cur, v]));
    setDraft("");
  };

  const suggest = async () => {
    setSuggesting(true);
    const next = await onSuggest();
    // Merge rather than replace: a suggestion should not delete something the
    // user typed themselves.
    if (next) setItems((cur) => {
      const merged = [...cur];
      for (const v of next) {
        if (!merged.some((x) => x.toLowerCase() === v.toLowerCase())) merged.push(v);
      }
      return merged;
    });
    setSuggesting(false);
  };

  return (
    <div style={panel()}>
      <TokenList items={items} onRemove={(v) => setItems((c) => c.filter((x) => x !== v))} initials={withInitials} busy={busy} />
      <div style={{
        ...row, gap: 8, padding: "8px 10px", borderRadius: 10,
        boxShadow: `inset 0 0 0 1px ${HAIRLINE}`, background: PAPER,
      }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(e.currentTarget.value);
            }
          }}
          placeholder={placeholder}
          disabled={busy}
          style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontSize: 13, color: "rgba(0,0,0,.72)" }}
        />
        <span style={{ fontSize: 10, color: FAINT, fontFamily: MONO }}>↵</span>
      </div>
      <div style={row}>
        <button
          type="button"
          className="bchat-soft"
          disabled={busy || suggesting}
          onClick={suggest}
          style={softButton}
        >
          <Sparkle size={11} />
          {suggesting ? "Thinking…" : suggestLabel}
        </button>
        <div style={{ flex: 1 }} />
        <Cta enabled={items.length > 0} busy={busy} onClick={() => submit(items)}>
          {answered ? "Update" : ctaLabel}
        </Cta>
      </div>
    </div>
  );
}

// ---- free text (problem, differentiator) -----------------------------

export function TextWidget({
  answered, submit, busy, value, placeholder, hint, ctaLabel, onSkip,
}: WidgetProps<string> & {
  value: string;
  placeholder: string;
  hint: string;
  ctaLabel: string;
  onSkip?: () => void;
}) {
  const [text, setText] = useState(value);

  return (
    <div style={{ ...panel(), padding: 18 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={2}
        disabled={busy}
        style={{
          width: "100%", resize: "vertical", border: "none", outline: "none", background: "transparent",
          fontFamily: DISPLAY, fontSize: 17, fontWeight: 500, letterSpacing: "-0.014em",
          color: INK, lineHeight: 1.45, minHeight: 52,
        }}
      />
      <div style={row}>
        <span style={{ fontSize: 11.5, color: "rgba(0,0,0,.42)" }}>{hint}</span>
        <div style={{ flex: 1 }} />
        {onSkip ? (
          <button type="button" className="bchat-ghost" disabled={busy} onClick={onSkip} style={ghostButton}>
            Skip
          </button>
        ) : null}
        <Cta enabled={!!text.trim()} busy={busy} onClick={() => submit(text.trim())}>
          {answered ? "Update" : ctaLabel}
        </Cta>
      </div>
    </div>
  );
}

// ---- positioning map -------------------------------------------------

export function PositionWidget({
  answered, submit, busy, read, value,
}: WidgetProps<{ x: number; y: number }> & {
  read: PositionRead;
  value?: { x: number; y: number };
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(value);

  const place = (clientX: number, clientY: number) => {
    const el = mapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
      y: 1 - Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
    });
  };

  const dotStyle = (x: number, y: number, me: boolean): CSSProperties => ({
    position: "absolute",
    left: `${x * 100}%`,
    top: `${(1 - y) * 100}%`,
    transform: "translate(-50%,-50%)",
    padding: "4px 9px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
    ...(me
      ? { background: INK, color: "#fff", boxShadow: "0 6px 16px rgba(0,0,0,.25)" }
      : { background: CARD, color: "rgba(0,0,0,.6)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)" }),
  });

  return (
    <div style={{ ...panel(20), padding: 20, flexDirection: "row", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: "0 0 auto" }}>
        <div style={{ position: "relative", width: 320, height: 320 }}>
          <span style={{ ...label, position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 9 }}>
            Emotional
          </span>
          <span style={{ ...label, position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)", fontSize: 9 }}>
            Functional
          </span>
          <div
            ref={mapRef}
            role="application"
            aria-label="Positioning map. Click to place your brand."
            onClick={(e) => !busy && place(e.clientX, e.clientY)}
            style={{
              position: "relative", width: 320, height: 320, borderRadius: 14, background: PAPER,
              boxShadow: `inset 0 0 0 1px ${HAIRLINE}`, cursor: busy ? "default" : "crosshair", overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: "rgba(0,0,0,.08)" }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: "rgba(0,0,0,.08)" }} />
            {read.competitors.map((c) => (
              <span key={c.label} style={dotStyle(c.x, c.y, false)}>{c.label}</span>
            ))}
            {pos ? <span style={dotStyle(pos.x, pos.y, true)}>You</span> : null}
          </div>
        </div>
        <div style={{ ...label, display: "flex", justifyContent: "space-between", marginTop: 26, fontSize: 9.5 }}>
          <span>Accessible</span>
          <span>Premium</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 13.5, color: "rgba(0,0,0,.72)", lineHeight: 1.5 }}>
          {pos ? read.read : "Click anywhere in the field. Horizontal is what they pay for; vertical is what they feel."}
        </span>
        <div style={{ flex: 1 }} />
        <div style={row}>
          <Cta enabled={!!pos} busy={busy} onClick={() => pos && submit(pos)}>
            {answered ? "Update" : "Lock the position"}
          </Cta>
          {read.suggested ? (
            <button
              type="button"
              className="bchat-ghost"
              disabled={busy}
              onClick={() => read.suggested && submit(read.suggested)}
              style={ghostButton}
            >
              You place it
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---- personality sliders ---------------------------------------------

export function PersonalityWidget({
  answered, submit, busy, value,
}: WidgetProps<Personality> & { value: Personality }) {
  const [sliders, setSliders] = useState<Personality>(value);

  const read = SLIDERS.map((s) => (sliders[s.id] > 4 ? s.right : s.left)).join(" · ");

  return (
    <div style={{ ...panel(20), padding: 20, gap: 16 }}>
      {SLIDERS.map((s) => {
        const v = sliders[s.id];
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ flex: "0 0 92px", textAlign: "right", fontSize: 12, color: v <= 4 ? INK : FAINT }}>
              {s.left}
            </span>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={v}
              disabled={busy}
              aria-label={`${s.left} to ${s.right}`}
              onChange={(e) => setSliders((cur) => ({ ...cur, [s.id]: Number(e.target.value) }))}
              style={{ flex: 1, height: 4, cursor: "pointer" }}
            />
            <span style={{ flex: "0 0 92px", fontSize: 12, color: v > 4 ? INK : FAINT }}>{s.right}</span>
          </div>
        );
      })}
      <div style={{ ...row, paddingTop: 2 }}>
        <span style={{ ...label, fontSize: 10 }}>{read}</span>
        <div style={{ flex: 1 }} />
        <Cta enabled busy={busy} onClick={() => submit(sliders)}>
          {answered ? "Update" : "That’s the character"}
        </Cta>
      </div>
    </div>
  );
}

// ---- values ----------------------------------------------------------

export function ValuesWidget({ answered, submit, busy, value }: WidgetProps<string[]> & { value: string[] }) {
  const [picked, setPicked] = useState<string[]>(value);

  const toggle = (v: string) =>
    setPicked((cur) => {
      if (cur.includes(v)) return cur.filter((x) => x !== v);
      if (cur.length >= 5) return cur;
      return [...cur, v];
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={wrap}>
        {VALUES.map((v) => (
          <button key={v} type="button" disabled={busy} onClick={() => toggle(v)} style={chip(picked.includes(v))}>
            {v}
          </button>
        ))}
      </div>
      <div style={row}>
        <span style={{ fontSize: 11.5, color: "rgba(0,0,0,.42)" }}>
          {picked.length ? `${picked.length} of 5 chosen` : "Pick three to five"}
        </span>
        <div style={{ flex: 1 }} />
        <Cta enabled={picked.length >= 3} busy={busy} onClick={() => submit(picked)}>
          {answered ? "Update" : "Continue"}
        </Cta>
      </div>
    </div>
  );
}

// ---- names -----------------------------------------------------------

export function NameWidget({
  answered, submit, busy, names, value, onMore, moreBusy, page, pages, onPage,
}: WidgetProps<string> & {
  names: NameCandidate[];
  value?: string;
  onMore: () => void;
  moreBusy: boolean;
  page: number;
  pages: number;
  onPage: (next: number) => void;
}) {
  const [picked, setPicked] = useState<string | undefined>(value);
  const [custom, setCustom] = useState("");
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const chosen = custom.trim() || picked;
  const arrow = (enabled: boolean): CSSProperties => ({
    width: 24, height: 24, borderRadius: 7, display: "inline-flex", alignItems: "center",
    justifyContent: "center", background: "transparent",
    color: enabled ? MUTED : "rgba(0,0,0,.18)", cursor: enabled ? "pointer" : "default",
  });

  return (
    <div style={{ background: CARD, borderRadius: 20, boxShadow: `0 2px 6px rgba(0,0,0,.06),inset 0 0 0 1px ${HAIRLINE}`, overflow: "hidden" }}>
      {names.map((n, i) => {
        const selected = picked === n.name && !custom.trim();
        return (
          <div
            key={n.name}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
              borderTop: i > 0 ? "1px solid rgba(0,0,0,.07)" : undefined,
              background: selected ? "#F6F6F7" : undefined,
              boxShadow: selected ? "inset 3px 0 0 #000" : undefined,
            }}
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => { setPicked(n.name); setCustom(""); }}
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 14, background: "transparent", textAlign: "left", padding: 0 }}
            >
              <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 19, letterSpacing: "-0.03em", color: INK, flex: "0 0 auto" }}>
                {n.name}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: MUTED, lineHeight: 1.45 }}>{n.why}</span>
            </button>
            {/* Availability is not claimed — the studio cannot check a registry. */}
            <span style={{ fontFamily: MONO, fontSize: 10, color: FAINT, whiteSpace: "nowrap" }}>
              {n.domain}
            </span>
            <button
              type="button"
              aria-label={`Like ${n.name}`}
              aria-pressed={!!liked[n.name]}
              onClick={() => setLiked((c) => ({ ...c, [n.name]: !c[n.name] }))}
              style={{
                width: 28, height: 28, borderRadius: 99, background: "transparent",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: liked[n.name] ? CORAL : "rgba(0,0,0,.28)",
              }}
            >
              <Heart filled={!!liked[n.name]} />
            </button>
          </div>
        );
      })}

      <div style={{ ...row, padding: "10px 16px", background: PAPER, borderTop: `1px solid ${HAIRLINE}` }}>
        <button type="button" className="bchat-soft" disabled={busy || moreBusy} onClick={onMore} style={softButton}>
          <Sparkle size={11} />
          {moreBusy ? "Thinking…" : "10 more"}
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" aria-label="Older names" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} style={arrow(page < pages - 1)}>
          <ChevronLeft size={11} strokeWidth={2} />
        </button>
        <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(0,0,0,.42)", whiteSpace: "nowrap" }}>
          Batch {pages - page} of {pages}
        </span>
        <button type="button" aria-label="Newer names" disabled={page <= 0} onClick={() => onPage(page - 1)} style={arrow(page > 0)}>
          <Chevron size={11} strokeWidth={2} />
        </button>
      </div>

      <div style={{ ...row, padding: "12px 16px", background: PAPER, borderTop: `1px solid ${HAIRLINE}` }}>
        <span style={{ fontSize: 11.5, color: MUTED, whiteSpace: "nowrap" }}>Or write your own</span>
        <input
          value={custom}
          onChange={(e) => { setCustom(e.target.value); setPicked(undefined); }}
          placeholder="Type a name…"
          disabled={busy}
          style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontFamily: DISPLAY, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: INK }}
        />
        <Cta enabled={!!chosen} busy={busy} onClick={() => chosen && submit(chosen)}>
          {answered ? "Update name" : "Use this name"}
        </Cta>
      </div>
    </div>
  );
}

// ---- visual direction ------------------------------------------------

export function DirectionWidget({
  answered, submit, busy, directions, recommended, value,
}: WidgetProps<string> & {
  directions: DirectionOption[];
  recommended: string;
  value?: string;
}) {
  const [picked, setPicked] = useState(value ?? recommended);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {directions.map((d) => {
          const selected = picked === d.id;
          return (
            <button key={d.id} type="button" disabled={busy} onClick={() => setPicked(d.id)} style={card(selected)}>
              <div style={{
                height: 104, borderRadius: 12, backgroundColor: "#F0F0F2",
                backgroundImage: "repeating-linear-gradient(45deg,rgba(0,0,0,.055) 0 7px,rgba(0,0,0,0) 7px 14px)",
                display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "9px 10px",
              }}>
                <span style={{ ...label, fontSize: 9 }}>style ref</span>
                <span style={tick(selected)}>{selected ? <Check /> : null}</span>
              </div>
              <div style={{ padding: "11px 3px 2px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: "-0.018em", color: INK }}>
                    {d.name}
                  </span>
                  {d.id === recommended && !value ? (
                    <span style={{
                      display: "inline-flex", alignItems: "center", fontSize: 9, fontWeight: 700,
                      letterSpacing: ".04em", textTransform: "uppercase", color: "#0E6B5E",
                      background: "rgba(68,217,199,.18)", padding: "2px 6px", borderRadius: 99,
                    }}>
                      Recommended
                    </span>
                  ) : null}
                </div>
                <span style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.4 }}>{d.note}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div style={row}>
        <Cta enabled busy={busy} onClick={() => submit(picked)}>
          {answered ? "Update direction" : "Use this direction"}
        </Cta>
        <button type="button" className="bchat-ghost" disabled={busy} onClick={() => submit(recommended)} style={ghostButton}>
          Let Fluid choose
        </button>
      </div>
    </>
  );
}

// ---- avoid -----------------------------------------------------------

export function AvoidWidget({ answered, submit, busy, value }: WidgetProps<string[]> & { value: string[] }) {
  const [picked, setPicked] = useState<string[]>(value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={wrap}>
        {AVOIDS.map((a) => (
          <button
            key={a}
            type="button"
            disabled={busy}
            onClick={() => setPicked((c) => (c.includes(a) ? c.filter((x) => x !== a) : [...c, a]))}
            style={chip(picked.includes(a))}
          >
            {a}
          </button>
        ))}
      </div>
      <div style={row}>
        <Cta enabled busy={busy} onClick={() => submit(picked)}>
          {picked.length ? "Keep these off the table" : answered ? "Update" : "Continue"}
        </Cta>
        <button type="button" className="bchat-ghost" disabled={busy} onClick={() => submit([])} style={ghostButton}>
          Nothing off-limits
        </button>
      </div>
    </div>
  );
}

// ---- mark type -------------------------------------------------------

export function LogoTypeWidget({ submit, busy, value }: WidgetProps<string> & { value?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
      {LOGO_TYPES.map((t) => {
        const selected = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            disabled={busy}
            onClick={() => submit(t.id)}
            style={{
              padding: 12, borderRadius: 14, textAlign: "left", display: "flex",
              flexDirection: "column", gap: 4,
              background: selected ? INK : CARD,
              boxShadow: selected ? "none" : `inset 0 0 0 1px ${HAIRLINE}`,
            }}
          >
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: "-0.018em", color: selected ? "#fff" : INK }}>
              {t.name}
            </span>
            <span style={{ fontSize: 11, lineHeight: 1.4, color: selected ? "rgba(255,255,255,.68)" : MUTED }}>
              {t.note}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---- marks -----------------------------------------------------------

export function LogoWidget({
  answered, submit, busy, logo, value, onRedraw, redrawing,
}: WidgetProps<{ image_url: string; label: string; art: string }> & {
  logo: LogoSet;
  /** The URL of the mark already chosen, if any. */
  value?: string;
  onRedraw: () => void;
  redrawing: boolean;
}) {
  const [picked, setPicked] = useState<number | undefined>(
    logo.marks.find((m) => m.image_url && m.image_url === value)?.slot,
  );
  const [briefOpen, setBriefOpen] = useState(false);
  const chosen = logo.marks.find((m) => m.slot === picked);
  const brief = logo.visualIdentityBrief ?? "";

  return (
    <>
      <div style={{ ...panel(16), gap: 8 }}>
        <span style={label}>Visual identity brief</span>
        <span style={{ fontSize: 13, color: "rgba(0,0,0,.72)", lineHeight: 1.5 }}>{logo.concept}</span>
        <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
          {logo.palette.map((p) => (
            <span
              key={p.hex}
              title={`${p.hex} · ${p.role}`}
              style={{
                width: 22, height: 22, borderRadius: 6, background: p.hex,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)",
              }}
            />
          ))}
        </div>
        {brief ? (
          <>
            <button
              type="button"
              className="bchat-ghost"
              onClick={() => setBriefOpen((o) => !o)}
              style={{
                ...ghostButton,
                alignSelf: "flex-start",
                marginTop: 4,
                fontSize: 11.5,
              }}
            >
              {briefOpen ? "Hide full brief" : "Show full brief"}
            </button>
            {briefOpen ? (
              <pre
                style={{
                  margin: "4px 0 0",
                  maxHeight: 280,
                  overflow: "auto",
                  padding: 12,
                  borderRadius: 12,
                  background: PAPER,
                  boxShadow: `inset 0 0 0 1px ${HAIRLINE}`,
                  fontFamily: MONO,
                  fontSize: 11,
                  lineHeight: 1.45,
                  color: "rgba(0,0,0,.78)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {brief}
              </pre>
            ) : null}
          </>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {logo.marks.map((m) => {
          const selected = picked === m.slot;
          const failed = !m.image_url;
          return (
            <button
              key={m.slot}
              type="button"
              disabled={busy || redrawing || failed}
              onClick={() => setPicked(m.slot)}
              title={m.art}
              style={{ ...card(selected), cursor: failed ? "default" : "pointer" }}
            >
              <div style={{
                height: 150, borderRadius: 12, display: "flex", alignItems: "center",
                justifyContent: "center", background: "#FFFFFF",
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,.07)", overflow: "hidden",
              }}>
                {redrawing ? (
                  <span className="bchat-skel" style={{ width: "72%", height: 84, display: "block" }} />
                ) : failed ? (
                  <span style={{
                    fontFamily: MONO, fontSize: 10, letterSpacing: ".04em",
                    color: "rgba(0,0,0,.42)", padding: "0 14px", textAlign: "center", lineHeight: 1.5,
                  }}>
                    This one didn’t draw. The others did.
                  </span>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={m.image_url ?? ""}
                    alt={m.label}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
                  />
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 4px 2px" }}>
                <span style={{ ...label, fontSize: 9.5, textAlign: "left", lineHeight: 1.3 }}>{m.label}</span>
                <span style={tick(selected)}>{selected ? <Check /> : null}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div style={row}>
        <Cta
          enabled={!!chosen?.image_url}
          busy={busy || redrawing}
          onClick={() => {
            if (chosen?.image_url) {
              submit({ image_url: chosen.image_url, label: chosen.label, art: chosen.art });
            }
          }}
        >
          {answered ? "Update mark" : "Use this mark"}
        </Cta>
        <button
          type="button"
          className="bchat-ghost"
          disabled={busy || redrawing}
          onClick={onRedraw}
          style={{ ...ghostButton, display: "inline-flex", alignItems: "center", gap: 7 }}
        >
          <Refresh size={12} />
          {redrawing ? "Drawing…" : "Draw six more"}
        </button>
      </div>
    </>
  );
}

// ---- voice -----------------------------------------------------------

export function VoiceWidget({
  answered, submit, busy, voices, value,
}: WidgetProps<{ name: string; sample: string }> & { voices: VoiceOption[]; value?: string }) {
  // `value` is the stored register NAME, so a resumed thread highlights the
  // right card without the id ever having to be persisted.
  const [picked, setPicked] = useState<string | undefined>(
    voices.find((v) => v.name === value)?.id,
  );

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {voices.map((v) => {
          const selected = picked === v.id;
          return (
            <button key={v.id} type="button" disabled={busy} onClick={() => setPicked(v.id)} style={card(selected)}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "4px 4px 0" }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14.5, letterSpacing: "-0.018em", color: INK }}>
                    {v.name}
                  </span>
                  <span style={{ ...label, fontSize: 9.5 }}>{v.axes}</span>
                </div>
                <span style={tick(selected)}>{selected ? <Check /> : null}</span>
              </div>
              <div style={{ marginTop: 11, padding: "12px 13px", borderRadius: 12, background: PAPER, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.07)" }}>
                <span style={{
                  fontFamily: DISPLAY, fontSize: 15, fontWeight: 500, letterSpacing: "-0.015em",
                  lineHeight: 1.4, color: selected ? INK : "rgba(0,0,0,.72)", display: "block",
                }}>
                  {v.sample}
                </span>
              </div>
              <span style={{ padding: "9px 4px 2px", fontSize: 11.5, color: MUTED, lineHeight: 1.45 }}>{v.note}</span>
            </button>
          );
        })}
      </div>
      <div style={row}>
        <Cta
          enabled={!!picked}
          busy={busy}
          onClick={() => {
            const v = voices.find((x) => x.id === picked);
            if (v) submit({ name: v.name, sample: v.sample });
          }}
        >
          {answered ? "Update voice" : "Use this voice"}
        </Cta>
        <button
          type="button"
          className="bchat-ghost"
          disabled={busy}
          onClick={() => submit({ name: voices[0].name, sample: voices[0].sample })}
          style={ghostButton}
        >
          Let Fluid choose
        </button>
      </div>
    </>
  );
}

// ---- tagline ---------------------------------------------------------

export function TaglineWidget({
  answered, submit, busy, taglines, value,
}: WidgetProps<string> & { taglines: TaglineOption[]; value?: string }) {
  const [picked, setPicked] = useState<string | undefined>(value);
  const [custom, setCustom] = useState("");

  const chosen = custom.trim() || picked;

  return (
    <div style={{ background: CARD, borderRadius: 20, boxShadow: `0 2px 6px rgba(0,0,0,.06),inset 0 0 0 1px ${HAIRLINE}`, overflow: "hidden" }}>
      {taglines.map((t, i) => {
        const selected = picked === t.text && !custom.trim();
        return (
          <button
            key={t.text}
            type="button"
            disabled={busy}
            onClick={() => { setPicked(t.text); setCustom(""); }}
            style={{
              display: "flex", alignItems: "baseline", gap: 14, padding: "13px 16px",
              width: "100%", textAlign: "left",
              background: selected ? "#F6F6F7" : "transparent",
              borderTop: i > 0 ? "1px solid rgba(0,0,0,.07)" : undefined,
              boxShadow: selected ? "inset 3px 0 0 #000" : undefined,
            }}
          >
            <span style={{ flex: "0 0 auto", fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, letterSpacing: "-0.025em", color: INK }}>
              {t.text}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: MUTED, lineHeight: 1.45 }}>{t.why}</span>
            <span style={{ ...label, fontSize: 9.5, color: FAINT, whiteSpace: "nowrap" }}>{t.style}</span>
          </button>
        );
      })}
      <div style={{ ...row, padding: "12px 16px", background: PAPER, borderTop: `1px solid ${HAIRLINE}` }}>
        <span style={{ fontSize: 11.5, color: MUTED, whiteSpace: "nowrap" }}>Or write your own</span>
        <input
          value={custom}
          onChange={(e) => { setCustom(e.target.value); setPicked(undefined); }}
          placeholder="Type a line…"
          disabled={busy}
          style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: INK }}
        />
        <Cta enabled={!!chosen} busy={busy} onClick={() => chosen && submit(chosen)}>
          {answered ? "Update line" : "Use this line"}
        </Cta>
      </div>
    </div>
  );
}

// ---- launch ----------------------------------------------------------

export function LaunchWidget({
  answered, submit, busy, plan, value,
}: WidgetProps<{ timing: string; channels: string[] }> & {
  plan: LaunchPlan;
  value?: { timing?: string; channels: string[] };
}) {
  const [timing, setTiming] = useState(value?.timing);
  const [channels, setChannels] = useState<string[]>(value?.channels ?? []);

  return (
    <div style={{ ...panel(20), padding: 20, gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <span style={label}>When</span>
        <div style={wrap}>
          {TIMINGS.map((t) => (
            <button key={t} type="button" disabled={busy} onClick={() => setTiming(t)} style={chip(timing === t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <span style={label}>Where it lands first</span>
        <div style={wrap}>
          {plan.channels.map((c) => (
            <button
              key={c}
              type="button"
              disabled={busy}
              onClick={() => setChannels((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))}
              style={chip(channels.includes(c))}
            >
              {c}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11.5, color: "rgba(0,0,0,.42)", lineHeight: 1.45 }}>{plan.note}</span>
      </div>
      <div style={row}>
        <div style={{ flex: 1 }} />
        <Cta enabled={!!timing} busy={busy} onClick={() => timing && submit({ timing, channels })}>
          {answered ? "Update" : "Build the kit"}
        </Cta>
      </div>
    </div>
  );
}

// ---- kit -------------------------------------------------------------

export function KitWidget({
  kit, name, tagline, voiceSample, logo,
}: {
  kit: BrandKit;
  name: string;
  tagline?: string;
  voiceSample?: string;
  logo?: { image_url: string; label: string };
}) {
  // A flow that skipped the tagline or the voice still reaches the kit. Those
  // panels show what the kit does have rather than an empty box that reads as
  // a rendering failure.
  const line = tagline?.trim() || "No tagline yet";
  const body = voiceSample?.trim() || "No voice sample yet — pick a register and this fills in.";
  return (
    <div style={{
      background: CARD, borderRadius: 24,
      boxShadow: "0 18px 40px rgba(0,0,0,.10),0 4px 10px rgba(0,0,0,.04),inset 0 0 0 1px rgba(0,0,0,.08)",
      overflow: "hidden",
    }}>
      <div style={{
        height: 210, background: "url('/assets/uuid/dccfeee5-b7cc-45c3-89b3-ef4db2191c23.jpg') center / cover no-repeat",
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.55)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logo.image_url}
              alt={`${name} logo`}
              style={{ maxHeight: 96, maxWidth: 320, objectFit: "contain", display: "block" }}
            />
          ) : (
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 52, letterSpacing: "-0.045em", color: INK }}>
              {name}
              <span style={{ color: CORAL }}>.</span>
            </span>
          )}
          <span style={{ fontSize: 13.5, color: "rgba(0,0,0,.62)" }}>{line}</span>
        </div>
      </div>
      <div style={{ padding: "24px 26px 26px", display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: MUTED }}>
            Palette
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {kit.palette.map((p) => (
              <div key={p.hex} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ height: 52, borderRadius: 10, background: p.hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }} />
                <span style={{ fontFamily: MONO, fontSize: 9.5, color: MUTED }}>{p.hex}</span>
                <span style={{ fontSize: 10, color: FAINT }}>{p.role}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: PAPER, borderRadius: 14, padding: 16, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: MUTED }}>
              Display · Metropolis 800
            </span>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, letterSpacing: "-0.035em", marginTop: 10, lineHeight: 1 }}>
              {line}
            </div>
          </div>
          <div style={{ background: PAPER, borderRadius: 14, padding: 16, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: MUTED }}>
              Body · Inter 400
            </span>
            <p style={{ fontFamily: "Inter,system-ui,sans-serif", fontSize: 13.5, lineHeight: 1.6, color: "rgba(0,0,0,.72)", margin: "10px 0 0" }}>
              {body}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: MUTED }}>
            Guidelines · excerpt
          </span>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "rgba(0,0,0,.72)", margin: 0 }}>{kit.guidelines}</p>
        </div>
        <div style={{ ...row, flexWrap: "wrap", paddingTop: 4 }}>
          <a
            href="/app#brands"
            style={{
              padding: "11px 18px", borderRadius: 11, background: INK, color: "#fff",
              fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            Open brand kit
            <Arrow size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
