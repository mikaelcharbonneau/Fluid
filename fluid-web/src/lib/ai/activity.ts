// The running commentary a generation route sends back while it works.
//
// These routes take up to five minutes and, until now, said nothing until they
// were done — so a slow run and a hung run looked identical, and a bad mark
// gave no clue which instruction produced it. Every stage already knew what it
// was doing; it just wrote it to the server console where nobody could see it.
//
// An event is one line. `label` is that line — it has to stand alone, because
// the collapsed dock shows exactly one of them. `detail` is the long form
// behind it, and is the reason this exists at all: the image prompt goes in
// there verbatim, so what the renderer was actually told is never a guess.

export type ActivityKind =
  | "phase" // a stage of the run started or finished
  | "tool" // the model called a tool — a web search, say
  | "prompt" // the exact text sent to a generator
  | "thinking" // a condensed summary of what the model decided
  | "note" // something worth knowing that is not a failure
  | "warn"; // degraded, but the run continues

export interface ActivityEvent {
  seq: number;
  at: number; // ms since the run started
  kind: ActivityKind;
  label: string;
  detail?: string;
}

export interface Activity {
  emit(kind: ActivityKind, label: string, detail?: string): void;
  /** Start a phase; the returned function ends it and reports how long it took. */
  phase(label: string): () => void;
  elapsed(): number;
}

/** The detail pane is for reading, not for archiving a whole prompt history. */
const MAX_DETAIL = 8000;

export function createActivity(sink: (event: ActivityEvent) => void): Activity {
  const t0 = Date.now();
  let seq = 0;

  const emit: Activity["emit"] = (kind, label, detail) => {
    seq += 1;
    sink({
      seq,
      at: Date.now() - t0,
      kind,
      label,
      detail: detail ? detail.slice(0, MAX_DETAIL) : undefined,
    });
  };

  return {
    emit,
    elapsed: () => Date.now() - t0,
    phase(label) {
      const started = Date.now();
      emit("phase", label);
      let ended = false;
      return () => {
        // Phases nest and retry; ending one twice would report a second,
        // meaningless duration.
        if (ended) return;
        ended = true;
        emit("phase", `${label} — done in ${fmtMs(Date.now() - started)}`);
      };
    },
  };
}

/** A no-op emitter, so a generator can be called outside a streaming route. */
export const silentActivity: Activity = {
  emit: () => {},
  phase: () => () => {},
  elapsed: () => 0,
};

export function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

/**
 * Condense a model's thinking into one readable line plus the fuller text.
 *
 * Raw thinking is long and arrives as prose. The label takes the first real
 * sentence, which is almost always the decision; the detail keeps more of it
 * for when the label is not enough to explain a strange result.
 */
export function summariseThinking(thinking: string): { label: string; detail: string } {
  const clean = thinking.replace(/\s+/g, " ").trim();
  const firstSentence = clean.match(/^.{0,180}?[.!?](?=\s|$)/)?.[0] ?? clean.slice(0, 180);
  return {
    label: firstSentence || "(no reasoning returned)",
    detail: clean,
  };
}
