# Design Map

## Spacing Scale
6px, 8px, 9px (dominant, 122 occurrences), 10px, 11px, 12px, 13px, 14px, 16px, 18px — not aligned to a 4/8pt base unit

## Font Hierarchy
- 17px / 800 / Metropolis — question headings
- 15px / 400 / Metropolis — answers, chosen values
- 13px / 600 / Metropolis — chip and button labels (dominant weight overall)
- 9.5px / 600 / JetBrains Mono, uppercase — field micro-labels ("BRIEF", "NAME STYLE")

## Color Palette
- `#FAFAFB` canvas / `#FFFFFF` card — near-white on white
- `rgba(0,0,0,.72)` primary text, `.52` muted, `.34` faint, `.10–.12` hairlines
- `#000000` ink — selected chips, primary buttons, headings
- `#FD7947` — the only non-neutral color, scoped to inline errors

## Image Ratios
- Logo concept renders: 1:1, natural 1024×1024, displayed at 237px in a 3-column grid

## Component Tokens
- Radius: 8px (small controls) · 10px (inputs/generic cards) · 14px (logo-concept cards) · 18px (outer panels) · 99px (all chips)
- Shadow: `inset 0 0 0 1px rgba(0,0,0,.10–.12)` default · `0 2px 6px rgba(0,0,0,.06)` outer panels · `0 0 0 2px #000, 0 6px 18px rgba(0,0,0,.08)` selected state
- Grid: 3 columns, 10px gap (logo-concept grid)
- Motion: `background/color 0.14s`, `opacity/box-shadow 0.14s` — consistent 140ms, respects `prefers-reduced-motion`

---

# Taste DNA

### Ink-only restraint
- **Trigger**: When facing a product whose entire output is color (palettes, logos, brand boards).
- **Decision**: Chose fully monochrome app chrome over any branded accent color.
- **Reason**: A visible product-brand accent color would visually compete with the user's own brand being built on screen.
- **Evidence**: Every sampled accent candidate resolves to `#000`/white; `#FD7947` is scoped to error states only, never a primary action.

### Thread persistence over wizard
- **Trigger**: When designing a 12-step conversational form where an early answer can invalidate later ones.
- **Decision**: Chose to keep every answered step permanently visible and re-editable, over a single-screen Back/Next wizard.
- **Reason**: Showing the dependency chain honestly is more trustworthy than a Back button that hides what re-answering actually invalidates downstream.
- **Evidence**: All steps render simultaneously in every captured state; zero centered layout moments; no step-counter/progress affordance observed anywhere.

### One pill shape for every choice-type
- **Trigger**: When the flow needed both single-select (category, visual mode) and multi-select (avoid list, name styles) controls.
- **Decision**: Chose one identical chip visual for both interaction types, over giving multi-select its own affordance.
- **Reason**: One learned tap-to-toggle pattern scans faster across a long form than stopping to parse each row's selection rule.
- **Evidence**: 99px radius is the single most-used radius in the system (61 occurrences); nothing else distinguishes a single-select chip from a multi-select one.

### Inset hairlines over shadow
- **Trigger**: When needing to separate cards and inputs from the canvas behind them.
- **Decision**: Chose a 1px inset border as the default depth cue, reserving real shadow for exactly two states — the outer panel lift and an actively-selected logo card.
- **Reason**: Using shadow everywhere would cheapen the two moments where elevation is actually meaningful.
- **Evidence**: 84 of 91 sampled shadow values are inset hairlines; genuine offset/blur shadow appears only 6 times total.
