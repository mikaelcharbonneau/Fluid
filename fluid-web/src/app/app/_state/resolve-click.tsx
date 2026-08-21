"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import { CHAT } from "../_kit/shell";
import { CRUMB_TO_ROUTE, RAIL_TO_ROUTE, type AppRoute } from "./routes";

function hasDataset(element: Element): element is HTMLElement {
  return "dataset" in element;
}

// ---------------------------------------------------------------------
// Resolve a click → destination route.
// Walks the DOM from the click target up. Returns either a route string
// or null. Mutates `out` with a small hint so we can show a toast for
// non-routing CTAs like "Export kit".
// ---------------------------------------------------------------------
interface ClickResolution {
  toast?: string;
}

export function resolveClick(target: EventTarget | null, currentRoute: AppRoute, out: ClickResolution): string | null {
  if (!(target instanceof Element)) return null;
  // 0) Controls that navigate themselves. The delegate calls
  //    stopPropagation when it matches, so a button whose destination depends
  //    on local state must opt out to keep its own onClick handler.
  if (target.closest && target.closest('[data-selfnav]')) return null;

  // 0b) An explicit destination beats every heuristic below, and has to be
  //     checked before them. `cursor` is an inherited property, so the walk in
  //     step 4 hits the deepest child under the pointer first, reads its
  //     fragment of text, fails to match, and returns null — never reaching
  //     the ancestor carrying data-route. Any card with clickable-looking
  //     children was therefore unroutable no matter what route it declared.
  const routed = target.closest('[data-route]');
  if (routed && hasDataset(routed) && routed.dataset.route) return routed.dataset.route;

  // 1) Fluid wordmark in the top dock — always goes Home.
  if (target.closest && target.closest('.fl-wordmark')) return 'home';

  // 2) Breadcrumb spans inside <header><nav>.
  const crumb = target.closest && target.closest('header > nav > span');
  if (crumb) {
    const t = (crumb.textContent || '').trim();
    if (CRUMB_TO_ROUTE[t]) return CRUMB_TO_ROUTE[t];
  }

  // 3) Left-rail icons. Each ARailIcon is a direct child <div> of <aside>.
  const aside = target.closest && target.closest('aside');
  if (aside) {
    for (const child of aside.children) {
      if (child.contains(target)) {
        const span = child.querySelector('span');
        const label = span && (span.textContent || '').trim();
        if (label && RAIL_TO_ROUTE[label]) return RAIL_TO_ROUTE[label];
      }
    }
  }

  // 4) Walk up looking for any cursor:pointer node — that's our clickable.
  //    Read its trimmed text and match against the known CTA vocabulary.
  let node: Element | null = target;
  while (node && node !== document.body) {
    if (node.nodeType === 1) {
      // Explicit override — any element can opt-in.
      if (hasDataset(node) && node.dataset.route) return node.dataset.route;

      const view = node.ownerDocument.defaultView;
      if (!view) return null;
      const cs = view.getComputedStyle(node);
      if (cs.cursor === 'pointer') {
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
        const r = matchCtaText(text, currentRoute, out);
        if (r) return r;
        // First cursor:pointer ancestor wins — if it doesn't match, stop.
        // Otherwise we'd accidentally bubble to outer cards.
        return null;
      }
    }
    node = node.parentElement;
  }
  return null;
}

function matchCtaText(text: string, currentRoute: AppRoute, out: ClickResolution): string | null {
  if (!text) return null;

  // Top-level CTAs from Home / Brands. Creating a brand is a conversation
  // now; archived wizard CTAs are no longer part of the product route table.
  if (text.includes('Start a new brand'))        return CHAT;
  if (text === 'Browse templates'
   || text === 'Browse template library')        return 'brands-empty';
  if (text === 'All brands' || text === 'All brands →') return 'brands';
  if (text === '+ New brand' || text === 'New brand') return CHAT;

  if (text === 'Export kit' || text === 'Share read-only'
   || text === 'Download all') { out.toast = text + ' — coming soon'; return null; }

  // The four Home quick-path cards are NOT matched here. They carry an
  // explicit data-route, which step 4 above reads on the way up. Text matching
  // cannot work for them: `cursor` is an inherited property, so the first
  // cursor:pointer node above a click is the deepest child under the pointer,
  // and the text read is a fragment like "Start" rather than the card's. That
  // is why those cards routed nowhere for so long.

  return null;
}
