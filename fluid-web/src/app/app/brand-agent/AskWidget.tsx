"use client";

// The one genuinely new widget this mode needs — nothing in chat/widgets.tsx
// is generic enough to render "the question, input type, and options are
// all data" (every widget there is bespoke to one fixed step). Dispatches to
// two widgets already reused unmodified from chat/widgets.tsx for the text
// and single-select cases, and a small local multi-select for the third —
// chat/widgets.tsx's TokenWidget requires an onSuggest affordance (an
// "AI suggest" button) that has nothing to suggest here, and touching that
// file to make it optional is off the table for this purely additive mode.

import { useState } from "react";
import type { CSSProperties } from "react";
import { ChipsWidget, TextWidget } from "@/app/app/chat/widgets";
import { CARD, HAIRLINE, INK, cta, panel } from "@/app/app/chat/ui";
import type { PendingQuestion } from "@/lib/brand-agent/transcript";

function MultiChipWidget({
  options, busy, submit,
}: { options: string[]; busy: boolean; submit: (value: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (o: string) =>
    setPicked((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]));

  const chipStyle = (selected: boolean): CSSProperties => ({
    padding: "9px 14px",
    borderRadius: 99,
    fontSize: 13,
    fontWeight: 600,
    background: selected ? INK : CARD,
    color: selected ? "#fff" : "rgba(0,0,0,.72)",
    boxShadow: selected ? "none" : `inset 0 0 0 1px ${HAIRLINE}`,
  });

  return (
    <div style={{ ...panel(), padding: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => (
          <button key={o} type="button" disabled={busy} onClick={() => toggle(o)} style={chipStyle(picked.includes(o))}>
            {o}
          </button>
        ))}
      </div>
      <div style={{ display: "flex" }}>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          disabled={busy || picked.length === 0}
          onClick={() => submit(picked)}
          style={cta(!busy && picked.length > 0)}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export function AskWidget({
  question, busy, onAnswer,
}: {
  question: PendingQuestion;
  busy: boolean;
  /** Always a natural-language string — the model has no separate structured
   * reply channel, it reads whatever the user picked as one more thing said. */
  onAnswer: (text: string) => void;
}) {
  if (question.inputType === "single_select" && question.options?.length) {
    return (
      <ChipsWidget
        answered={false}
        busy={busy}
        options={question.options}
        submit={(value) => onAnswer(value)}
      />
    );
  }
  if (question.inputType === "multi_select" && question.options?.length) {
    return (
      <MultiChipWidget
        options={question.options}
        busy={busy}
        submit={(values) => onAnswer(values.join(", "))}
      />
    );
  }
  return (
    <TextWidget
      answered={false}
      busy={busy}
      value=""
      placeholder="Type your answer…"
      hint=""
      ctaLabel="Send"
      submit={(value) => onAnswer(value)}
    />
  );
}
