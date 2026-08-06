"use client";

// The conversation.
//
// The server owns the script — which question comes next, and what its widget
// needs. This component owns the thread: what has been said, what is currently
// being typed, and which answers are still editable.
//
// Two rules the rest of the file follows:
//
//   • An answer is never echoed as a chat bubble. It stays in its widget,
//     where it can still be changed. Only free-form composer messages become
//     user bubbles.
//   • Re-answering a question truncates everything below it and asks the
//     server again from that point. That is what makes an earlier answer feel
//     editable rather than final.

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { STEPS, getFlow } from "@/lib/brand-chat/flow";
import { DEFAULT_PERSONALITY, type BrandContext } from "@/lib/brand-chat/context";
import type { RenderedStep } from "@/lib/brand-chat/step";
import type { ActivityEvent } from "@/lib/ai/activity";
import { createBrand, postAssist, postTurn } from "./api";
import { ThinkingOrb } from "./ThinkingOrb";
import {
  CARD, CORAL, DISPLAY, FAINT, HAIRLINE, INK, MONO, MUTED, PAPER, label,
} from "./ui";
import {
  Assets, Chevron, Grid, Guides, Home, Search, Send, Settings, Token,
} from "./icons";
import {
  AvoidWidget, BriefWidget, CategoryWidget, DirectionWidget, GoalWidget, KitWidget,
  LaunchWidget, LogoTypeWidget, LogoWidget, NameWidget, PathWidget, PersonalityWidget,
  PositionWidget, StageWidget, TaglineWidget, TextWidget, TokenWidget, ValuesWidget,
  VoiceWidget,
} from "./widgets";
import type { NameCandidate } from "@/lib/brand-chat/contracts";
import "./chat.css";

interface Msg {
  id: string;
  role: "ai" | "user";
  /** What is on screen now — grows while typing. */
  text: string;
  /** The whole line. Equal to `text` once typing finishes. */
  full: string;
  step?: RenderedStep;
  /** A failure, styled as a warning rather than as Fluid speaking. */
  error?: boolean;
}

const TYPE_MS = 16;
const CHARS_PER_TICK = 3;

const firstStep = STEPS[0];

export function BrandChat() {
  // Read once, lazily, before the first paint: whether this is a resumed
  // thread decides both the starting spinner and the ref below, and neither
  // should flicker through a "new thread" state first.
  const [resumeId] = useState(() =>
    new URLSearchParams(window.location.search).get("brand"),
  );
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: "ai-0",
      role: "ai",
      text: "",
      full: firstStep.text,
      step: { key: firstStep.key, text: firstStep.text, payload: { kind: "none" } },
    },
  ]);
  const [context, setContext] = useState<BrandContext>({});
  const [busy, setBusy] = useState(!!resumeId);
  const [status, setStatus] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [tokens, setTokens] = useState<number | null>(null);

  // Extra name batches, newest first. Kept out of the thread so "10 more"
  // does not push the question off the screen each time.
  const [nameBatches, setNameBatches] = useState<NameCandidate[][]>([]);
  const [namePage, setNamePage] = useState(0);
  const [moreBusy, setMoreBusy] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  // Written only from callbacks, never during render: `ensureBrand` needs the
  // current id without waiting for a re-render, and two rapid answers must not
  // each create their own draft brand.
  const brandRef = useRef<string | null>(resumeId);

  // ---- typing --------------------------------------------------------
  useEffect(() => {
    const typing = msgs.findIndex((m) => m.text.length < m.full.length);
    if (typing === -1) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(
      () =>
        setMsgs((cur) =>
          cur.map((m, i) =>
            i === typing
              ? { ...m, text: reduced ? m.full : m.full.slice(0, m.text.length + CHARS_PER_TICK) }
              : m,
          ),
        ),
      reduced ? 0 : TYPE_MS,
    );
    return () => clearTimeout(id);
  }, [msgs]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy, status]);

  // ---- token balance -------------------------------------------------
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
  }, [busy]);

  // ---- resume --------------------------------------------------------
  useEffect(() => {
    if (!resumeId) return;
    postTurn({ brandId: resumeId }).then((out) => {
      setBusy(false);
      if (out.context) setContext(out.context);
      if (out.error) {
        setMsgs((cur) => [...cur, note(cur.length, out.error!, true)]);
        return;
      }
      if (out.step) {
        setMsgs([{ id: "ai-resume", role: "ai", text: "", full: out.step.text, step: out.step }]);
      }
    });
  }, [resumeId]);

  // ---- turns ---------------------------------------------------------

  const ensureBrand = useCallback(async (): Promise<string | null> => {
    if (brandRef.current) return brandRef.current;
    const { id, error } = await createBrand();
    if (!id) {
      setMsgs((cur) => [...cur, note(cur.length, error ?? "Could not start a new brand.", true)]);
      return null;
    }
    brandRef.current = id;
    // Survives a reload, and makes the thread linkable.
    const url = new URL(window.location.href);
    url.searchParams.set("brand", id);
    window.history.replaceState(null, "", url);
    return id;
  }, []);

  const submit = useCallback(
    async (stepKey: string, value: unknown) => {
      if (busy) return;
      setBusy(true);
      setStatus(null);

      const id = await ensureBrand();
      if (!id) {
        setBusy(false);
        return;
      }

      // Re-answering: drop everything the old answer produced before asking
      // again, so the thread never shows two versions of the same question.
      setMsgs((cur) => {
        const at = cur.findIndex((m) => m.step?.key === stepKey);
        return at === -1 ? cur : cur.slice(0, at + 1);
      });
      if (stepKey === "name") {
        setNameBatches([]);
        setNamePage(0);
      }

      const onActivity = (event: ActivityEvent) => setStatus(event.label);
      const out = await postTurn({ brandId: id, step: stepKey, value }, onActivity);

      setBusy(false);
      setStatus(null);
      if (out.context) setContext(out.context);

      if (out.error) {
        setMsgs((cur) => [...cur, note(cur.length, out.error!, true)]);
        return;
      }
      if (out.done || !out.step) {
        setMsgs((cur) => [
          ...cur,
          note(
            cur.length,
            "That's the job done. It's saved against the brand — change any answer above and I'll re-run what depends on it.",
          ),
        ]);
        return;
      }
      const step = out.step;
      setMsgs((cur) => [
        ...cur,
        { id: `ai-${step.key}-${cur.length}`, role: "ai", text: "", full: step.text, step },
      ]);
    },
    [busy, ensureBrand],
  );

  // ---- assists -------------------------------------------------------

  const assist = useCallback(
    async (kind: "audience" | "competitors") => {
      const id = await ensureBrand();
      if (!id) return null;
      const out = await postAssist({ brandId: id, kind });
      if (out.error) {
        setMsgs((cur) => [...cur, note(cur.length, out.error!, true)]);
        return null;
      }
      return (kind === "audience" ? out.audience : out.competitors) ?? null;
    },
    [ensureBrand],
  );

  const rewriteBrief = useCallback(
    async (task: "brief_shorter" | "brief_punchier" | "brief_sharper") => {
      const id = await ensureBrand();
      if (!id) return null;
      try {
        const r = await fetch("/api/generate/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brandId: id, task }),
        });
        const j = (await r.json().catch(() => ({}))) as { text?: string; error?: string };
        if (!r.ok || !j.text) {
          setMsgs((cur) => [...cur, note(cur.length, j.error ?? "That rewrite failed.", true)]);
          return null;
        }
        return j.text;
      } catch {
        setMsgs((cur) => [...cur, note(cur.length, "Couldn't reach the studio for that rewrite.", true)]);
        return null;
      }
    },
    [ensureBrand],
  );

  const moreNames = useCallback(
    async (shown: NameCandidate[]) => {
      const id = await ensureBrand();
      if (!id) return;
      setMoreBusy(true);
      const out = await postAssist({
        brandId: id,
        kind: "names",
        exclude: shown.map((n) => n.name),
      });
      setMoreBusy(false);
      if (out.error) {
        setMsgs((cur) => [...cur, note(cur.length, out.error!, true)]);
        return;
      }
      if (out.names) {
        setNameBatches((cur) => [out.names!, ...cur]);
        setNamePage(0);
      }
    },
    [ensureBrand],
  );

  const sendComposer = () => {
    const text = composer.trim();
    if (!text || busy) return;
    setComposer("");
    setMsgs((cur) => [
      ...cur,
      { id: `u-${cur.length}`, role: "user", text, full: text },
      note(
        cur.length + 1,
        "I can't take free-form changes yet — that's the next piece. Everything above is still live, though: change an answer in place and I'll re-run whatever depends on it.",
      ),
    ]);
  };

  // ---- derived -------------------------------------------------------

  const pending = (() => {
    const last = msgs[msgs.length - 1];
    if (!last?.step || last.text.length < last.full.length) return null;
    if (last.step.key === "kit") return null;
    return last.step.key;
  })();
  const composerDisabled = busy || !!pending;
  const flowLabel = getFlow(context.path).label;

  return (
    <div className="bchat">
      <Header breadcrumb={flowLabel} tokens={tokens} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
          <div ref={threadRef} className="bchat-thread" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "36px 24px 24px" }}>
            <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 26 }}>
              {msgs.map((m, i) => (
                <Message
                  key={m.id}
                  msg={m}
                  isLast={i === msgs.length - 1}
                  hasWorkBelow={msgs.slice(i + 1).some((n) => !!n.step)}
                  context={context}
                  busy={busy}
                  submit={submit}
                  assist={assist}
                  rewriteBrief={rewriteBrief}
                  nameBatches={nameBatches}
                  namePage={namePage}
                  setNamePage={setNamePage}
                  moreNames={moreNames}
                  moreBusy={moreBusy}
                />
              ))}

              {busy ? (
                <div className="bchat-msg" style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ flex: "0 0 28px", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ThinkingOrb />
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(0,0,0,.42)" }}>{status ?? "Thinking…"}</span>
                </div>
              ) : null}

              <div style={{ height: 8 }} />
            </div>
          </div>

          <div style={{ flex: "0 0 auto", padding: "0 24px 22px", background: "linear-gradient(to top,#FAFAFB 62%,rgba(250,250,251,0))" }}>
            <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 12px 12px 18px",
                borderRadius: 16, background: composerDisabled ? "#F4F4F5" : CARD,
                boxShadow: `inset 0 0 0 1px rgba(0,0,0,${composerDisabled ? ".07" : ".12"})${composerDisabled ? "" : ",0 6px 18px rgba(0,0,0,.06)"}`,
                transition: "background 180ms,box-shadow 180ms",
              }}>
                <input
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !composerDisabled) {
                      e.preventDefault();
                      sendComposer();
                    }
                  }}
                  disabled={composerDisabled}
                  placeholder={
                    pending ? "Answer above to keep going…" : busy ? "Fluid is thinking…" : "Ask a question…"
                  }
                  aria-label="Message Fluid"
                  style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", outline: "none", fontSize: 14.5, color: INK }}
                />
                <button
                  type="button"
                  aria-label="Send"
                  disabled={composerDisabled || !composer.trim()}
                  onClick={sendComposer}
                  style={{
                    width: 34, height: 34, borderRadius: 10, display: "inline-flex",
                    alignItems: "center", justifyContent: "center",
                    background: composerDisabled || !composer.trim() ? "#EDEDEF" : INK,
                    color: composerDisabled || !composer.trim() ? "rgba(0,0,0,.30)" : "#fff",
                  }}
                >
                  <Send size={15} />
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
                <span style={{ ...label, fontSize: 10, color: FAINT }}>
                  {pending ? "Waiting on you above" : busy ? "Fluid is working" : "Everything above stays editable"}
                </span>
                <div style={{ flex: 1 }} />
                <a href="/app#brands" className="bchat-ghost" style={{ ...label, fontSize: 10, color: FAINT, background: "transparent" }}>
                  Leave
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function note(seq: number, text: string, error = false): Msg {
  return { id: `note-${seq}`, role: "ai", text, full: text, error };
}

// ---- one message -----------------------------------------------------

interface MessageProps {
  msg: Msg;
  isLast: boolean;
  hasWorkBelow: boolean;
  context: BrandContext;
  busy: boolean;
  submit: (step: string, value: unknown) => void;
  assist: (kind: "audience" | "competitors") => Promise<string[] | null>;
  rewriteBrief: (task: "brief_shorter" | "brief_punchier" | "brief_sharper") => Promise<string | null>;
  nameBatches: NameCandidate[][];
  namePage: number;
  setNamePage: (n: number) => void;
  moreNames: (shown: NameCandidate[]) => void;
  moreBusy: boolean;
}

function Message(props: MessageProps) {
  const { msg, context, busy, hasWorkBelow } = props;

  if (msg.role === "user") {
    return (
      <div className="bchat-msg" style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{
          maxWidth: "70%", background: INK, color: "#fff", padding: "11px 16px",
          borderRadius: "16px 16px 4px 16px", fontSize: 14, lineHeight: 1.5,
        }}>
          {msg.text}
        </div>
      </div>
    );
  }

  // A widget only appears once its question has finished typing — otherwise
  // the controls sit under half a sentence.
  const typing = msg.text.length < msg.full.length;
  const ready = !typing;

  return (
    <div className="bchat-msg" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ flex: "0 0 28px", width: 28, height: 28, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ThinkingOrb />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{
          fontFamily: DISPLAY, fontSize: 16.5, lineHeight: 1.55,
          color: msg.error ? "#8A3E1C" : "rgba(0,0,0,.86)", letterSpacing: "-0.012em",
        }}>
          {msg.text}
          {typing ? <span className="bchat-caret" /> : null}
        </div>

        {msg.step && !ready ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
            <div className="bchat-skel" style={{ height: 14, width: "38%" }} />
            <div className="bchat-skel" style={{ height: 96, width: "100%", borderRadius: 16 }} />
          </div>
        ) : null}

        {msg.step && ready ? (
          <>
            {answeredKeys(context).has(msg.step.key) && hasWorkBelow ? <RerunNote /> : null}
            {/*
              Widgets hold a local draft — half-typed text, chips not yet
              submitted — which must survive every re-render of the thread.
              But when the stored answer itself changes, the draft is stale and
              has to be replaced. Keying on the stored value does exactly that:
              React remounts with fresh state on a real change, and leaves the
              draft alone otherwise.
            */}
            <Widget
              {...props}
              key={storedValueKey(context, msg.step.key)}
              step={msg.step}
              busy={busy}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function RerunNote() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
      borderRadius: 12, background: "#FFF7ED", boxShadow: "inset 0 0 0 1px rgba(253,121,71,.35)",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: CORAL, flex: "0 0 6px" }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "#8A3E1C", lineHeight: 1.45 }}>
        Work below was built on this answer. Changing it re-runs everything after it.
      </span>
    </div>
  );
}

/**
 * A stable string for whatever the server has stored against one step.
 *
 * Used only as a remount key, so it needs to change when the answer changes
 * and not otherwise — it is never parsed back.
 */
function storedValueKey(ctx: BrandContext, step: string): string {
  const value: Record<string, unknown> = {
    path: ctx.path,
    brief: ctx.brief,
    category: ctx.category,
    stage: ctx.stage,
    audience: ctx.audience,
    problem: ctx.problem,
    competitors: ctx.competitors,
    position: ctx.position,
    differentiator: ctx.differentiator,
    personality: ctx.personality,
    values: ctx.values,
    goal: ctx.goal,
    name: ctx.name,
    direction: ctx.direction,
    avoid: ctx.avoid,
    logoType: ctx.logoType,
    voice: ctx.voice,
    tagline: ctx.tagline,
    launch: [ctx.launchTiming, ctx.launchChannels],
  };
  return `${step}:${JSON.stringify(value[step] ?? null)}`;
}

/** Which questions the context can prove were answered. */
function answeredKeys(ctx: BrandContext): Set<string> {
  const keys = new Set<string>();
  const mark = (key: string, has: unknown) => {
    if (has !== undefined && has !== null && !(Array.isArray(has) && has.length === 0)) keys.add(key);
  };
  mark("path", ctx.path);
  mark("brief", ctx.brief);
  mark("category", ctx.category);
  mark("stage", ctx.stage);
  mark("audience", ctx.audience);
  mark("problem", ctx.problem);
  mark("competitors", ctx.competitors);
  mark("position", ctx.position);
  if (ctx.differentiator !== undefined) keys.add("differentiator");
  mark("personality", ctx.personality);
  mark("values", ctx.values);
  mark("goal", ctx.goal);
  mark("name", ctx.name);
  mark("direction", ctx.direction);
  if (ctx.avoid !== undefined) keys.add("avoid");
  mark("logoType", ctx.logoType);
  mark("voice", ctx.voice);
  mark("tagline", ctx.tagline);
  mark("launch", ctx.launchTiming);
  return keys;
}

// ---- widget dispatch -------------------------------------------------

function Widget({
  step, context, busy, submit, assist, rewriteBrief, nameBatches, namePage, setNamePage, moreNames, moreBusy,
}: MessageProps & { step: RenderedStep }) {
  const answered = answeredKeys(context).has(step.key);
  const send = (value: unknown) => submit(step.key, value);
  const common = { answered, busy };

  switch (step.key) {
    case "path":
      return <PathWidget {...common} value={context.path} submit={send} />;
    case "brief":
      return <BriefWidget {...common} value={context.brief ?? ""} submit={send} onAssist={rewriteBrief} />;
    case "category":
      return <CategoryWidget {...common} value={context.category} submit={send} />;
    case "stage":
      return <StageWidget {...common} value={context.stage} submit={send} />;
    case "goal":
      return <GoalWidget {...common} value={context.goal} submit={send} />;
    case "audience":
      return (
        <TokenWidget
          {...common}
          value={context.audience ?? []}
          submit={send}
          placeholder="Solo founders, 25–40, already in Notion…"
          suggestLabel="Suggest from the brief"
          ctaLabel="That’s them"
          onSuggest={() => assist("audience")}
        />
      );
    case "competitors":
      return (
        <TokenWidget
          {...common}
          initials
          value={context.competitors ?? []}
          submit={send}
          placeholder="Name or URL…"
          suggestLabel="Suggest three"
          ctaLabel="That’s the field"
          onSuggest={() => assist("competitors")}
        />
      );
    case "problem":
      return (
        <TextWidget
          {...common}
          value={context.problem ?? ""}
          submit={send}
          placeholder="The week gets planned. The day gets improvised — and lost."
          hint="Their words, not yours, if you have them."
          ctaLabel="Continue"
        />
      );
    case "differentiator":
      return (
        <TextWidget
          {...common}
          value={context.differentiator ?? ""}
          submit={send}
          placeholder="They optimise the quarter. We optimise the day."
          hint="Something a competitor couldn't say back."
          ctaLabel="Continue"
          onSkip={() => send("")}
        />
      );
    case "personality":
      return <PersonalityWidget {...common} value={context.personality ?? DEFAULT_PERSONALITY} submit={send} />;
    case "values":
      return <ValuesWidget {...common} value={context.values ?? []} submit={send} />;
    case "avoid":
      return <AvoidWidget {...common} value={context.avoid ?? []} submit={send} />;
    case "logoType":
      return <LogoTypeWidget {...common} value={context.logoType} submit={send} />;
    case "position":
      if (step.payload.kind !== "position") return null;
      return <PositionWidget {...common} read={step.payload.position} value={context.position} submit={send} />;
    case "name": {
      if (step.payload.kind !== "name") return null;
      // Page 0 is the newest batch; the original always sits at the bottom.
      const pages = [...nameBatches, step.payload.names];
      const shown = pages[Math.min(namePage, pages.length - 1)];
      return (
        <NameWidget
          {...common}
          names={shown}
          value={context.name}
          submit={send}
          page={namePage}
          pages={pages.length}
          onPage={setNamePage}
          moreBusy={moreBusy}
          onMore={() => moreNames(pages.flat())}
        />
      );
    }
    case "direction":
      if (step.payload.kind !== "direction") return null;
      return (
        <DirectionWidget
          {...common}
          directions={step.payload.directions}
          recommended={step.payload.recommended}
          value={context.direction}
          submit={send}
        />
      );
    case "logo":
      return (
        <LogoWidget
          {...common}
          name={context.name ?? "Your brand"}
          logoType={context.logoType ?? "wordmark"}
          submit={send}
        />
      );
    case "voice":
      if (step.payload.kind !== "voice") return null;
      return <VoiceWidget {...common} voices={step.payload.voices} value={context.voice} submit={send} />;
    case "tagline":
      if (step.payload.kind !== "tagline") return null;
      return <TaglineWidget {...common} taglines={step.payload.taglines} value={context.tagline} submit={send} />;
    case "launch":
      if (step.payload.kind !== "launch") return null;
      return (
        <LaunchWidget
          {...common}
          plan={step.payload.launch}
          value={{ timing: context.launchTiming, channels: context.launchChannels ?? [] }}
          submit={send}
        />
      );
    case "kit":
      if (step.payload.kind !== "kit") return null;
      return (
        <KitWidget
          kit={step.payload.kit}
          name={context.name ?? "Your brand"}
          tagline={context.tagline}
          voiceSample={context.voiceSample}
        />
      );
    default:
      return null;
  }
}

// ---- shell -----------------------------------------------------------

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
      {items.map(({ name, href, Icon, active }) => (
        <a
          key={name}
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
          <span style={{ fontSize: 9.5, fontWeight: 600, color: active ? "rgba(0,0,0,.72)" : FAINT }}>{name}</span>
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
