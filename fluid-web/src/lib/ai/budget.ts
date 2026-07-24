// Phase timing and deadline guards for the long AI routes.
//
// Vercel kills a function the instant it hits maxDuration, with no chance to
// respond: the client gets a 504 with an empty body, falls back to a generic
// "generation failed", and nobody — user or developer — learns which phase was
// slow. That is exactly how the logo studio failed at 300s.
//
// Two things fix it. Time every phase into the runtime logs so the slow step is
// visible, and stop voluntarily while there is still time to send a real error.

export interface Clock {
  // Log a phase boundary with its duration and the running total.
  lap(step: string): void;
  elapsed(): number;
  // Throw if `step` probably can't finish inside the budget. Better a clear
  // error at 200s than a silent execution kill at 300s.
  guard(step: string, needMs: number): void;
}

export class OutOfTimeError extends Error {
  constructor(step: string) {
    super(
      `The studio ran out of time before it could ${step}. Everything finished so far has been saved — try again and it will pick up from there.`,
    );
    this.name = "OutOfTimeError";
  }
}

// `budgetMs` should sit a little under the route's maxDuration so there is room
// to serialize and send the response after the last guard trips.
export function startClock(label: string, budgetMs: number): Clock {
  const t0 = Date.now();
  let last = t0;
  return {
    lap(step) {
      const now = Date.now();
      console.log(
        `[${label}] ${step} took ${now - last}ms (total ${now - t0}ms)`,
      );
      last = now;
    },
    elapsed: () => Date.now() - t0,
    guard(step, needMs) {
      const left = budgetMs - (Date.now() - t0);
      if (left < needMs) {
        console.error(
          `[${label}] aborting before "${step}": ${left}ms left, needs ~${needMs}ms`,
        );
        throw new OutOfTimeError(step);
      }
    },
  };
}
