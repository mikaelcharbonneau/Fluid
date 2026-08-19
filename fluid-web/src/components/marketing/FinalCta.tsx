"use client";

import { IdeaInput } from "./IdeaInput";

export function FinalCta() {
  return (
    <section className="final" id="start" data-dark="">
      <svg className="ribbon-bg" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#44D9C7" />
            <stop offset=".35" stopColor="#B0D2E6" />
            <stop offset=".6" stopColor="#FDBBC0" />
            <stop offset=".8" stopColor="#FD7947" />
            <stop offset="1" stopColor="#FDBA50" />
          </linearGradient>
        </defs>
        <path
          d="M-40 420 C 280 420 320 160 620 200 C 880 234 940 460 1180 380 C 1340 326 1420 200 1500 220"
          fill="none"
          stroke="url(#fg)"
          strokeWidth="120"
          strokeLinecap="round"
          opacity="0.28"
        />
      </svg>
      <div className="inner">
        <h2 className="line-mask">
          <span>
            Start with
            <br />a <span className="grad">thought.</span>
          </span>
        </h2>
        <p className="sub">Leave with a brand. Type one sentence and watch the system assemble.</p>
        <IdeaInput variant="final" autoFocusLabel="Describe your idea in one sentence" />
      </div>
    </section>
  );
}
