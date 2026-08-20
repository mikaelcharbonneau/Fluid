import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The shadcn class helper: `clsx` for conditional classes, `tailwind-merge` to
 * resolve conflicting Tailwind utilities so the last one wins.
 *
 * Note for this repo: Tailwind is not installed yet (see AGENTS.md / the
 * setup notes on the PR). Until it is, `twMerge` is a passthrough for the
 * hand-authored class names in `src/app/styles/*.css` — it only understands
 * Tailwind's own utility grammar. `cn()` is here so shadcn components drop in
 * unmodified; it is not a reason to start mixing class systems.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
