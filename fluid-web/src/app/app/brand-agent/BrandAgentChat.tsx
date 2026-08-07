"use client";

// The model-orchestrated thread.
//
// Unlike src/app/app/chat/BrandChat.tsx, the server never tells this
// component what step comes next — there is no fixed step order to walk.
// Every turn is: send whatever the user just said (or a widget's pick,
// translated to a natural-language line — there is no separate structured
// reply channel once a question leaves the fixed WidgetKind set), and the
// model decides whether that's an answer to record, a reason to run a
// generator, or another question.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ActivityEvent } from "@/lib/ai/activity";
import type { StepPayload } from "@/lib/brand-chat/step";
import type { PendingQuestion } from "@/lib/brand-agent/transcript";
import { createBrand, postAgentTurn } from "./api";
import { AskWidget } from "./AskWidget";
import { ThinkingOrb } from "@/app/app/chat/ThinkingOrb";
import {
  DirectionWidget, KitWidget, LogoWidget, NameWidget, TaglineWidget, VoiceWidget,
} from "@/app/app/chat/widgets";
import { CARD, DISPLAY, FAINT, HAIRLINE, INK, MONO, MUTED, PAPER, cta } from "@/app/app/chat/ui";

interface Msg {
  id: string;
  role: "ai" | "user";
  text: string;
  full: string;
  payload?: StepPayload;
  error?: boolean;
}

const TYPE_MS = 16;
const CHARS_PER_TICK = 3;

function note(id: number, text: string, error = false): Msg {
  return { id: `note-${id}`, role: "ai", text: error ? text : "", full: text, error };
}

export function BrandAgentChat() {
  const [resumeId] = useState(() => new URLSearchParams(window.location.search).get("brand"));
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion | null>(null);
  const [done, setDone] = useState(false);
  const [composer, setComposer] = useState("");

  const brandRef = useRef<string | null>(resumeId);
  const threadRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // ---- typing ----------------------------------------------------------
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

  // ---- applying a server response ---------------------------------------

  const applyOutcome = useCallback(
    (out: Awaited<ReturnType<typeof postAgentTurn>>) => {
      setBusy(false);
      setStatus(null);

      if (out.error) {
        setMsgs((cur) => [...cur, note(cur.length, out.error!, true)]);
        return;
      }
      if (out.degraded) {
        setMsgs((cur) => [...cur, note(cur.length, out.degraded!)]);
      }
      setMsgs((cur) => [
        ...cur,
        {
          id: `ai-${cur.length}`,
          role: "ai",
          text: "",
          full: out.assistantText ?? "",
          payload: out.payload,
        },
      ]);
      setPendingQuestion(out.pendingQuestion ?? null);
      setDone(!!out.done);
    },
    [],
  );

  // ---- open / resume -----------------------------------------------------

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      let id = brandRef.current;
      if (!id) {
        const created = await createBrand();
        if (!created.id) {
          setBusy(false);
          setMsgs([note(0, created.error ?? "Could not start a new brand.", true)]);
          return;
        }
        id = created.id;
        brandRef.current = id;
        const url = new URL(window.location.href);
        url.searchParams.set("brand", id);
        window.history.replaceState(null, "", url);
      }
      const onActivity = (event: ActivityEvent) => setStatus(event.label);
      const out = await postAgentTurn({ brandId: id }, onActivity);
      applyOutcome(out);
    })();
  }, [applyOutcome]);

  // ---- sending -------------------------------------------------------

  const send = useCallback(
    async (text: string) => {
      const id = brandRef.current;
      if (!id || busy || !text.trim()) return;
      setBusy(true);
      setStatus(null);
      setPendingQuestion(null);
      setMsgs((cur) => [...cur, { id: `user-${cur.length}`, role: "user", text, full: text }]);
      const onActivity = (event: ActivityEvent) => setStatus(event.label);
      const out = await postAgentTurn({ brandId: id, message: text }, onActivity);
      applyOutcome(out);
    },
    [busy, applyOutcome],
  );

  const sendComposer = () => {
    const text = composer.trim();
    if (!text) return;
    setComposer("");
    send(text);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: PAPER }}>
      <header
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "14px 20px",
          borderBottom: `1px solid ${HAIRLINE}`, background: CARD,
        }}
      >
        <ThinkingOrb size={20} speed={busy ? 1 : 0.35} />
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em", color: INK }}>
          Guided by AI
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 10.5, color: FAINT }}>
          {done ? "Done" : status ?? ""}
        </span>
      </header>

      <div ref={threadRef} style={{ flex: 1, overflowY: "auto", padding: "24px 20px 12px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
          {msgs.map((m) => (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {m.role === "ai" ? (
                <div
                  style={{
                    fontFamily: DISPLAY, fontSize: 16, fontWeight: 500, letterSpacing: "-0.012em",
                    lineHeight: 1.5, color: m.error ? "#B3261E" : INK, whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text}
                </div>
              ) : (
                <div
                  style={{
                    alignSelf: "flex-end", maxWidth: "80%", background: INK, color: "#fff",
                    borderRadius: "14px 14px 4px 14px", padding: "10px 14px",
                    fontFamily: DISPLAY, fontSize: 14.5, fontWeight: 500, lineHeight: 1.45,
                  }}
                >
                  {m.text}
                </div>
              )}
              {m.payload ? <PayloadWidget payload={m.payload} busy={busy} onAnswer={send} /> : null}
            </div>
          ))}

          {busy ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ThinkingOrb size={16} speed={1} />
              <span style={{ fontFamily: MONO, fontSize: 11, color: FAINT }}>{status ?? "Thinking…"}</span>
            </div>
          ) : null}

          {!busy && pendingQuestion ? (
            <AskWidget question={pendingQuestion} busy={busy} onAnswer={send} />
          ) : null}
        </div>
      </div>

      {!done ? (
        <div style={{ padding: "12px 20px 20px", borderTop: `1px solid ${HAIRLINE}`, background: CARD }}>
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", gap: 10 }}>
            <input
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendComposer(); }}
              placeholder="Say more, or answer here…"
              disabled={busy}
              style={{
                flex: 1, border: "none", outline: "none", background: PAPER, borderRadius: 12,
                padding: "12px 14px", fontFamily: DISPLAY, fontSize: 14.5, color: INK,
                boxShadow: `inset 0 0 0 1px ${HAIRLINE}`,
              }}
            />
            <button
              type="button"
              disabled={busy || !composer.trim()}
              onClick={sendComposer}
              style={cta(!busy && !!composer.trim())}
            >
              Send
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Renders whatever a generator tool produced this turn, reusing the exact
 * widgets the classic chat already ships — a payload of kind "name" is the
 * same NameCandidate[] shape NameWidget already knows how to render. Each
 * widget's structured `submit` is translated into one natural-language
 * line, since a reply back to the model has no channel but plain text. */
function PayloadWidget({
  payload, busy, onAnswer,
}: { payload: StepPayload; busy: boolean; onAnswer: (text: string) => void }) {
  switch (payload.kind) {
    case "name":
      return (
        <NameWidget
          answered={false}
          busy={busy}
          names={payload.names}
          onMore={() => onAnswer("Show me 10 more names, don't repeat the ones you already gave me.")}
          moreBusy={false}
          page={0}
          pages={1}
          onPage={() => {}}
          submit={(name) => onAnswer(`I'll go with "${name}".`)}
        />
      );
    case "direction": {
      const byId = new Map(payload.directions.map((d) => [d.id, d]));
      return (
        <DirectionWidget
          answered={false}
          busy={busy}
          directions={payload.directions}
          recommended={payload.recommended}
          submit={(id) => {
            const d = byId.get(id);
            onAnswer(d ? `I'll go with "${d.name}" (${d.id}).` : `I'll go with ${id}.`);
          }}
        />
      );
    }
    case "voice":
      return (
        <VoiceWidget
          answered={false}
          busy={busy}
          voices={payload.voices}
          submit={(v) => onAnswer(`I'll go with the "${v.name}" voice — the one that reads: "${v.sample}"`)}
        />
      );
    case "tagline":
      return (
        <TaglineWidget
          answered={false}
          busy={busy}
          taglines={payload.taglines}
          submit={(text) => onAnswer(`I like this tagline: "${text}"`)}
        />
      );
    case "logo":
      return (
        <LogoWidget
          answered={false}
          busy={busy}
          logo={payload.logo}
          onRedraw={() => onAnswer("Please draw this mark again — try a different take.")}
          redrawing={false}
          submit={({ image_url, label }) =>
            onAnswer(`I'll go with the "${label}" mark (${image_url}).`)
          }
        />
      );
    case "kit":
      return (
        <KitWidget
          kit={payload.kit}
          name=""
        />
      );
    case "position":
      return (
        <div style={{ fontFamily: DISPLAY, fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>
          {payload.position.read}
        </div>
      );
    default:
      return null;
  }
}
