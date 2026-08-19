"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { Thinking } from "./ui";

// Wizard layout wrapper
/**
 * The run log the dock renders.
 *
 * Events arrive on a window event rather than through context because the API
 * helpers are plain functions called from deep inside screens — threading a
 * setter down to every call site would mean touching every screen to show a
 * log none of them own.
 *
 * The log is kept after a run ends. "What did it just do?" is asked most often
 * once something looks wrong, which is always after the run finished.
 */
export const useActivityLog = () => {
  const [events, setEvents] = React.useState<any[]>([]);
  const [running, setRunning] = React.useState(false);
  const [runName, setRunName] = React.useState('');
  const [failure, setFailure] = React.useState('');

  React.useEffect(() => {
    const onActivity = (e: any) => {
      const d = e.detail || {};
      if (d.kind === 'start') {
        setRunning(true);
        setRunName(d.name || '');
        setFailure('');
        // Each run starts a fresh log: two runs' events interleaved read as
        // one confusing run.
        setEvents([{ seq: 0, at: 0, kind: 'phase', label: d.name || 'Working…' }]);
      } else if (d.kind === 'event' && d.event) {
        setEvents((prev) => [...prev, d.event]);
      } else if (d.kind === 'end') {
        setRunning(false);
        if (d.error) setFailure(d.error);
      }
    };
    window.addEventListener(ACTIVITY_EVENT, onActivity);
    return () => window.removeEventListener(ACTIVITY_EVENT, onActivity);
  }, []);

  return { events, running, runName, failure };
};

const ACTIVITY_TONE = {
  phase: '#FDBA50',
  tool: '#7DD3FC',
  prompt: '#C4B5FD',
  thinking: '#A7F3D0',
  note: 'rgba(255,255,255,.45)',
  warn: '#FD7947',
};

const fmtAt = (ms: any) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

// One line of the log. Events carrying a detail — an image prompt, the model's
// reasoning — expand in place rather than opening anything.
const AActivityRow = ({ event }: any) => {
  const [open, setOpen] = React.useState(false);
  const hasDetail = !!event.detail;
  return (
    <div style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
      <div
        onClick={hasDetail ? () => setOpen((o) => !o) : undefined}
        style={{
          display: 'flex', alignItems: 'baseline', gap: 10,
          cursor: hasDetail ? 'pointer' : 'default',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'rgba(255,255,255,.35)',
          flex: '0 0 46px', textAlign: 'right',
        }}>{fmtAt(event.at)}</span>
        <span style={{
          fontSize: 8.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
          color: (ACTIVITY_TONE as any)[event.kind] || 'rgba(255,255,255,.5)',
          flex: '0 0 58px',
        }}>{event.kind}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'rgba(255,255,255,.85)', lineHeight: 1.45 }}>
          {event.label}
          {hasDetail && (
            <span style={{ marginLeft: 8, fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
              {open ? '▾ hide' : '▸ show'}
            </span>
          )}
        </span>
      </div>
      {open && (
        <pre style={{
          margin: '8px 0 4px 114px', padding: '10px 12px', borderRadius: 8,
          background: 'rgba(0,0,0,.35)', color: 'rgba(255,255,255,.78)',
          fontFamily: 'var(--font-mono)', fontSize: 10.5, lineHeight: 1.5,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 260, overflowY: 'auto',
        }}>{event.detail}</pre>
      )}
    </div>
  );
};

/**
 * The dock's activity panel.
 *
 * Collapsed it is one line — the newest, because during a run the newest line
 * is the answer to "what is it doing". Expanded it is the whole run.
 */
export const ADockActivity = ({ events, running, failure, open, onToggle }: any) => {
  const bodyRef = React.useRef<any>(null);
  const latest = events.length ? events[events.length - 1] : null;

  // Follow the tail while it runs, but not once the client has expanded the log
  // to read something — yanking the scroll away mid-read is worse than stale.
  const [pinned, setPinned] = React.useState(true);
  React.useEffect(() => {
    if (!open || !pinned || !bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [events, open, pinned]);

  if (!latest && !running) return null;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', minWidth: 0 }}
      >
        {running
          ? <Thinking/>
          : <span style={{
              width: 6, height: 6, borderRadius: 99, flex: '0 0 6px',
              background: failure ? '#FD7947' : 'rgba(255,255,255,.35)',
            }}/>}
        <span style={{
          flex: 1, minWidth: 0, fontSize: 12.5, color: 'rgba(255,255,255,.85)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {failure || (latest ? latest.label : 'Working…')}
        </span>
        <span style={{
          fontSize: 10.5, color: 'rgba(255,255,255,.45)', flex: '0 0 auto',
          fontFamily: 'var(--font-mono)',
        }}>
          {events.length} {open ? '▾' : '▸'}
        </span>
      </div>

      {open && (
        <div
          ref={bodyRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
          }}
          style={{
            marginTop: 10, maxHeight: 300, overflowY: 'auto',
            borderTop: '1px solid rgba(255,255,255,.12)', paddingTop: 6,
          }}
        >
          {events.map((ev: any, i: any) => <AActivityRow key={`${ev.seq}-${i}`} event={ev} />)}
        </div>
      )}
    </div>
  );
};

// A function killed at its maxDuration returns no body at all, so there is no
// j.error to show. Name that case rather than blaming it on generation.
function describeFailure(r: any, j: any, fallback: any) {
  if (j && j.error) return j.error;
  if (r.status === 504 || r.status === 502) {
    return 'That took longer than the server allows. Your progress was saved — try again and it will pick up where it left off.';
  }
  return fallback;
}

// ── The activity stream ────────────────────────────────────────────────
// The three slow routes answer with server-sent events rather than one JSON
// blob: a run of several minutes now narrates itself instead of going quiet.
// Every event is pushed to the log the dock renders; the terminal `result`
// message is what the caller was waiting for all along.
//
// Pre-flight refusals — not signed in, out of tokens, a malformed body — are
// still ordinary JSON with a real status code, because they are not part of a
// run and a status code says so better than an event does.
const ACTIVITY_EVENT = 'fluid:activity';

function pushActivity(kind: any, payload: any) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT, { detail: { kind, ...payload } }));
}

async function readActivityStream(response: any, label: any) {
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/event-stream')) {
    // A plain JSON refusal. Nothing streamed, so nothing to log.
    const j = await response.json().catch(() => ({}));
    if (!response.ok) return { error: describeFailure(response, j, label), code: j.code };
    return { data: j };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let outcome = null;

  // SSE frames are separated by a blank line; a chunk can split one anywhere,
  // so the tail stays in the buffer until its terminator arrives.
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut;
    while ((cut = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const line = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line.slice(5).trim()); } catch { continue; }
      if (msg.type === 'activity') pushActivity('event', { event: msg.event });
      else if (msg.type === 'result') outcome = { data: msg.data };
      else if (msg.type === 'error') outcome = { error: msg.error, code: msg.code };
    }
  }

  // The stream ended without saying how it went — a dropped connection, or the
  // function killed mid-run. Say that rather than resolving with nothing.
  return outcome ?? {
    error: 'The connection closed before the run finished. Your progress was saved — try again and it will pick up where it left off.',
  };
}

// Wraps one streamed run: opens the log, reports the outcome, closes it.
export async function runStreamed(name: any, request: any, fallback: any) {
  pushActivity('start', { name });
  try {
    const response = await request();
    const out = await readActivityStream(response, fallback);
    pushActivity('end', { error: out.error || null });
    return out;
  } catch {
    pushActivity('end', { error: 'Network error.' });
    return { error: 'Network error.' };
  }
}

