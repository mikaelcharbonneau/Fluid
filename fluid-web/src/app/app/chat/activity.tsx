"use client";

// The running commentary, rendered.
//
// `postTurn` has always streamed a typed `ActivityEvent` for every stage of a
// run — `seq`, `at`, `kind`, `label` and the long-form `detail` — and the chat
// has always thrown all but the newest `label` away. These are the components
// that show it: one per `ActivityKind`.
//
// `phase` events arrive in pairs — a start, then `"<label> — done in 4.2s"`
// from `Activity.phase()`'s closer. `buildRows` folds the closer back into its
// start so a phase is one row that gains a duration, not two rows.
//
// `thinking` and `tool` are declared in `ActivityKind` but nothing emits them
// yet; their components are here so they render the day something does.

import { useState } from "react";
import type { ActivityEvent, ActivityKind } from "@/lib/ai/activity";
import { Chevron } from "./icons";
import { FAINT, MONO, MUTED } from "./ui";

interface Row {
  seq: number;
  kind: ActivityKind;
  label: string;
  detail?: string;
  done?: boolean;
  duration?: string;
}

const DONE = / — done in (.+)$/;

export function buildRows(events: ActivityEvent[]): Row[] {
  const rows: Row[] = [];
  for (const event of events) {
    if (event.kind === "phase") {
      const match = event.label.match(DONE);
      if (match) {
        const base = event.label.slice(0, event.label.length - match[0].length);
        // Search backwards: phases nest, so the nearest open one is ours.
        for (let i = rows.length - 1; i >= 0; i--) {
          const row = rows[i];
          if (row.kind === "phase" && row.label === base && !row.done) {
            row.done = true;
            row.duration = match[1];
            break;
          }
        }
        continue;
      }
    }
    rows.push({ seq: event.seq, kind: event.kind, label: event.label, detail: event.detail });
  }
  return rows;
}

const meta: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: ".04em",
  color: FAINT,
  flex: "0 0 auto",
};

/** A row that can open to reveal its `detail`. */
function Disclosure({
  head,
  detail,
  mono,
}: {
  head: React.ReactNode;
  detail?: string;
  mono?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!detail) return <>{head}</>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bchat-blkhd"
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          background: "transparent", textAlign: "left", padding: 0,
        }}
      >
        <span
          style={{
            display: "inline-flex", color: FAINT,
            transition: "transform 160ms cubic-bezier(.22,.61,.36,1)",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <Chevron size={11} />
        </span>
        {head}
      </button>
      {open ? (
        <div
          className={mono ? "bchat-prom" : undefined}
          style={
            mono
              ? undefined
              : { fontSize: 12.5, color: "rgba(0,0,0,.60)", lineHeight: 1.55, paddingLeft: 19 }
          }
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
}

function PhaseRow({ row, live }: { row: Row; live: boolean }) {
  const running = !row.done;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 24 }}>
      <span style={{ flex: "0 0 14px", display: "inline-flex", justifyContent: "center" }}>
        {row.done ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span className={live ? "bchat-dot" : undefined} style={{ width: 5, height: 5, borderRadius: 99, background: "#000", display: "inline-block" }} />
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: row.done ? "rgba(0,0,0,.72)" : "#000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {row.label}
      </span>
      <span style={meta}>{row.done ? row.duration : running && live ? "running" : ""}</span>
    </div>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 12, background: "#FAFAFB", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
      {children}
    </div>
  );
}

export function ActivityFeed({ events, live }: { events: ActivityEvent[]; live: boolean }) {
  const rows = buildRows(events);
  if (rows.length === 0) return null;

  const phases = rows.filter((r) => r.kind === "phase");
  const rest = rows.filter((r) => r.kind !== "phase");
  const anyRunning = live && phases.some((p) => !p.done);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {phases.length ? (
        <Block>
          {phases.map((p) => (
            <PhaseRow key={p.seq} row={p} live={live} />
          ))}
          {anyRunning ? <div className="bchat-bar" style={{ marginTop: 4 }} /> : null}
        </Block>
      ) : null}

      {rest.map((row) => {
        if (row.kind === "warn") {
          return (
            <div key={row.seq} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 11px", borderRadius: 10, background: "#fff", boxShadow: "inset 0 0 0 1px rgba(253,121,71,.32)" }}>
              <span style={{ color: "#FD7947", display: "inline-flex", marginTop: 1 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 4 2.5 20h19z" /><line x1="12" y1="10" x2="12" y2="14" /><line x1="12" y1="17" x2="12" y2="17.1" />
                </svg>
              </span>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "rgba(0,0,0,.72)", lineHeight: 1.5 }}>
                <Disclosure head={<span style={{ flex: 1 }}>{row.label}</span>} detail={row.detail} />
              </div>
            </div>
          );
        }
        if (row.kind === "prompt") {
          return (
            <Block key={row.seq}>
              <Disclosure
                mono
                head={
                  <>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.label}
                    </span>
                    <span style={meta}>prompt</span>
                  </>
                }
                detail={row.detail}
              />
            </Block>
          );
        }
        if (row.kind === "thinking") {
          return (
            <Block key={row.seq}>
              <Disclosure
                head={
                  <>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: MUTED }}>{row.label}</span>
                    <span style={meta}>thinking</span>
                  </>
                }
                detail={row.detail}
              />
            </Block>
          );
        }
        if (row.kind === "tool") {
          return (
            <Block key={row.seq}>
              <Disclosure
                head={
                  <>
                    <span style={{ display: "inline-flex", color: MUTED }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="8 7 3 12 8 17" /><polyline points="16 7 21 12 16 17" />
                      </svg>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: MUTED }}>{row.label}</span>
                    <span style={meta}>tool</span>
                  </>
                }
                detail={row.detail}
              />
            </Block>
          );
        }
        // note
        return (
          <div key={row.seq} style={{ display: "flex", alignItems: "flex-start", gap: 9, minHeight: 22 }}>
            <span style={{ width: 4, height: 4, borderRadius: 99, background: "rgba(0,0,0,.28)", flex: "0 0 4px", marginLeft: 5, marginTop: 8 }} />
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>
              <Disclosure head={<span style={{ flex: 1 }}>{row.label}</span>} detail={row.detail} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
