"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useMagnetic } from "@/components/interaction/useMagnetic";

// The page's primary conversion action: type an idea, land in signup.
//
// #178 moved this into the hero. It used to exist only in the final CTA, at
// the very bottom of a 19-viewport page behind a 15-viewport scroll-jack —
// the one control the page exists to get people to use was the last thing
// they could reach. Same component now renders in both places.
export function IdeaInput({
  variant = "hero",
  autoFocusLabel,
}: {
  variant?: "hero" | "final";
  autoFocusLabel?: string;
}) {
  const router = useRouter();
  const submitRef = useMagnetic<HTMLButtonElement>(0.4);
  const [idea, setIdea] = useState("");
  const inputId = useId();

  // The idea rides along to signup so the app can prefill the brief rather
  // than asking for it twice.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = idea.trim();
    router.push(trimmed ? `/signup?idea=${encodeURIComponent(trimmed)}` : "/signup");
  };

  return (
    <form className={`idea-input idea-input--${variant}`} onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={inputId}>
        {autoFocusLabel || "Describe your idea in one sentence"}
      </label>
      <input
        id={inputId}
        type="text"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="A productivity tool for founders who run on rituals…"
      />
      <button ref={submitRef} className="btn" type="submit">
        <span className="btn-label">{variant === "hero" ? "Start free" : "Generate"}</span>
        <span className="arr">→</span>
      </button>
    </form>
  );
}
