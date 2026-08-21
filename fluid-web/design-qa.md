**Comparison Target**

- Source visual truth: `/Users/mikael/.codex/visualizations/2026/07/29/019fb034-281d-79b0-be1f-2f58654e011d/fluid-logo-brief-desktop.png`
- Implementation: `/Users/mikael/.codex/visualizations/2026/07/29/019fb034-281d-79b0-be1f-2f58654e011d/fluid-logo-direction.png`
- Side-by-side evidence: `/Users/mikael/.codex/visualizations/2026/07/29/019fb034-281d-79b0-be1f-2f58654e011d/fluid-logo-flow-comparison.png`
- Responsive evidence: `/Users/mikael/.codex/visualizations/2026/07/29/019fb034-281d-79b0-be1f-2f58654e011d/fluid-logo-direction-mobile.png`
- Viewports: desktop 1280 x 720 CSS pixels at 1x density; mobile 390 x 844 CSS pixels at 1x density. Captures match their CSS dimensions, so no density normalization was needed.
- State: standalone logo workflow, with Style 03 selected on desktop. The cards deliberately have no visual assets or final style names, per the task requirements.

**Full-View Comparison**

- The Direction screen reuses the standalone brief screen's app shell, header hierarchy, progress treatment, typography, neutral palette, card surfaces, and persistent action dock.
- The second progress point is active, the Back action returns to the brief, and the dock continues only after a style or AI-selection is present.
- The grid is intentionally the primary work surface: six equal, text-only selectable cards with restrained selection feedback. No images, references, constraints, or use-case choices were added.

**Focused Comparison**

- The side-by-side composite remains legible at native pixel density; a crop was not required.
- Card spacing, 16px card radii, borders, selected elevation, and the toolbar button follow existing Fluid wizard patterns.
- On mobile, the toolbar action moves below the heading and the grid becomes a single column. `clientWidth` and `scrollWidth` were both 390px, so no horizontal overflow remains.

**Findings And Fixes**

- P2: the compact toolbar initially placed the AI-choice control too tightly beside the section heading. Fixed by stacking the toolbar below 540px; verified in the mobile capture.
- P1: temporary list roles hid the style controls as generic elements in the accessibility tree. Removed those roles so every style is exposed as a button with `aria-pressed`.
- No actionable P0, P1, or P2 visual or interaction findings remain.

**Interaction Checks**

- Brief Continue routes to Direction after required Name and Brand description entries are present.
- A selected card enables Continue; choosing Fluid clears the manual choice and also enables Continue; Back returns to the standalone brief.
- The next-step action intentionally confirms that concept exploration is next, since that screen is outside the current task.
- A fresh browser run had no console warnings or errors on the screen.

**Implementation Checklist**

- [x] Add a standalone second-step visual-style screen.
- [x] Provide six selectable, image-free placeholder cards.
- [x] Provide an explicit AI-choice control.
- [x] Add a standalone third-step logo-type screen with the eight supplied structures.
- [x] Persist the selected logo type and route Style forward to Type.
- [x] Preserve the standalone logo brief and route flow.
- [x] Verify desktop and mobile layout, selection states, keyboard-accessible control semantics, and console state.

**Logo Type Follow-up**

- Step 3 uses the same selection-card system as Step 2, with Wordmark, Lettermark, Letterform, Pictorial Mark, Abstract Mark, Mascot Logo, Combination Mark, and Emblem.
- Type selection is required before the next action is enabled. The selection is stored at `data.logo_type`, separate from visual-style selection.
- The prior style action now routes into Logo type. The next action intentionally remains a concept-exploration confirmation because that screen has not yet been built.
- `npm run build` completed successfully after the route and screen changes. `npm run lint` has no errors and retains one unrelated existing warning in `public/scripts/marketing.js`.

final result: passed

---

## 2026-08-20 · Marketing Hero Centered Prompt Layout

**Comparison Target**

- Source visual truth: `/var/folders/fc/ms0rhxpn3xs6s8j125crxjdr0000gp/T/codex-clipboard-7da029d9-4077-46af-974a-ee480aeffd49.png`
- Implementation screenshot: `/Users/mikael/.codex/visualizations/2026/08/20/01a01fee-5dc6-7e00-aae2-f7152f59303a/fluid-centered-prompt-desktop.png`
- Side-by-side evidence: `/Users/mikael/.codex/visualizations/2026/08/20/01a01fee-5dc6-7e00-aae2-f7152f59303a/fluid-centered-prompt-comparison.png`
- Responsive evidence: `/Users/mikael/.codex/visualizations/2026/08/20/01a01fee-5dc6-7e00-aae2-f7152f59303a/fluid-centered-prompt-mobile.png`
- Viewport: desktop 1440 x 804 CSS pixels at 1x density; mobile 390 x 844 CSS pixels at 1x density.
- Density normalization: the 3418 x 1910 source was downsampled to 1440 x 804 for the comparison; the implementation capture is natively 1440 x 804.
- State: marketing home route at the top of the page, prompt empty, no hover or focus state.

**Full-View Comparison**

- The reference's centered vertical hierarchy is present: compact context label, large centered headline, supporting text, and a prominent centered prompt surface.
- The Fluid implementation intentionally retains its existing copy, animated background, dark visual system, navigation, CTA label, pricing note, and scroll cue. The reference's category carousel and example chips were not added because this change is layout-only.
- The prompt now behaves as a composer surface, with its placeholder anchored at the upper left and the unchanged submit action anchored at the lower right.

**Focused Comparison**

- A separate crop was not required: the normalized full-view comparison keeps the headline, supporting copy, prompt bounds, button placement, and navigation legible at native scale.
- Fonts and typography: Fluid's existing display and body families, weights, copy, and color treatment are intentionally preserved; only headline scale and alignment changed.
- Spacing and layout rhythm: the lockup is centered, the prompt is 720 x 106 CSS pixels on desktop, and the stack uses a tighter headline-to-prompt cadence after the first comparison pass.
- Colors and visual tokens: unchanged from the existing Fluid hero.
- Image quality and asset fidelity: the existing Fluid wordmark and live WebGL background remain sharp; no new or substituted assets were introduced.
- Copy and content: unchanged.

**Comparison History**

- First pass P2: the prompt measured 820 x 118 CSS pixels at y=526.8 and the headline-to-prompt stack was too spread out relative to the source. Fixed by reducing the desktop headline maximum from 120px to 104px, tightening the supporting and CTA margins, and reducing the prompt to 720 x 106px.
- Post-fix evidence: the final 1440 x 804 capture measures the centered prompt at x=360, y=509.1, width=720, height=106; the lockup measures x=160, y=152.7, width=1120, height=498.5. No horizontal overflow is present.
- Mobile evidence: at 390 x 844, the prompt remains a two-row composer, the CTA no longer overlaps the placeholder, and `clientWidth` equals `scrollWidth` at 390px.

**Interaction And Console Checks**

- Entered and cleared a sample idea in the hero prompt; the value updated correctly and the unchanged submit button remained enabled.
- Browser console check returned no errors or warnings.

**Findings**

- No actionable P0, P1, or P2 layout differences remain within the requested layout-only scope.

**Implementation Checklist**

- [x] Center the hero content hierarchy.
- [x] Convert the existing hero form into a larger prompt-composer layout.
- [x] Preserve existing copy, colors, background animation, navigation, and behavior.
- [x] Verify desktop and mobile layout, input interaction, overflow, and console state.

final result: passed
