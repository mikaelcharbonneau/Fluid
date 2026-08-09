// Access to the vendored brand skills.
//
// A skill is a markdown document telling an agent how to do one piece of brand
// work — how a naming strategist thinks, what a positioning exercise has to
// produce, which questions a voice brief cannot skip. They were written for a
// coding agent with a filesystem, so they say things like "write the result to
// `.agents/brand-context.md`". We run them somewhere with no filesystem and no
// user watching a terminal, so a runner (e.g. `lib/brand-kit/run.ts`) supplies
// the context they expect to read and an output contract in place of the file
// they expect to write. This module is only the lookup.
//
// See skills/README.md for provenance and how to update them.

import { SKILLS, type Skill } from "./generated";

export type { Skill };

/** The foundation skill. Every other skill is written to read it first. */
export const FOUNDATION_SKILL = "brand-context";

export function getSkill(name: string): Skill {
  const skill = SKILLS[name];
  // Skill names are ours — they come from the flow definition, never from a
  // request — so a miss is a bug in our own wiring, not bad input.
  if (!skill) throw new Error(`Unknown skill: ${name}`);
  return skill;
}

export function hasSkill(name: string): boolean {
  return Object.hasOwn(SKILLS, name);
}

export function skillNames(): string[] {
  return Object.keys(SKILLS).sort();
}
