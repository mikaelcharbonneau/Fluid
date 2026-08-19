import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AInspirationCard } from "./brand-showcase";
import { AFinalistCard } from "./logo-flow";
import { QuickPath } from "./collage";

// #171: axe coverage for the controls the issue named — the selection cards,
// route tiles and choice cards that used to be clickable `div`s.
//
// These run in jsdom rather than a browser because every screen that renders
// them sits behind the auth gate at /app, and this repo has no seeded test
// user or Supabase test credential (CI runs with no secrets), so a real
// browser cannot reach them. e2e/a11y.spec.ts scans the pages that ARE
// reachable — the marketing and auth pages — in a real browser.
//
// jsdom computes no layout and no colours, so colour-contrast and
// target-size rules cannot run here; those are covered by the browser scan.
// What this does check is the part that regressed: roles, accessible names,
// selected state, and that no control is a bare div again.
async function violations(container: HTMLElement) {
  const results = await axe.run(container, {
    resultTypes: ["violations"],
    rules: {
      // Needs real layout/paint, which jsdom does not do. Covered in the
      // browser by e2e/a11y.spec.ts.
      "color-contrast": { enabled: false },
      // These fragments are rendered outside a page, so landmark/heading
      // structure rules have nothing meaningful to judge.
      region: { enabled: false },
    },
  });
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
}

describe("selection controls are accessible", () => {
  it("AInspirationCard is a button that reports its selected state", async () => {
    const { container, getByRole, rerender } = render(
      <AInspirationCard
        name="Apple"
        category="Consumer tech"
        style={{ pill: {}, label: "Minimal" }}
        hero={<div />}
        sel={false}
        onClick={() => {}}
      />,
    );
    const button = getByRole("button", { name: /Apple/ });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("aria-pressed", "false");

    rerender(
      <AInspirationCard
        name="Apple"
        category="Consumer tech"
        style={{ pill: {}, label: "Minimal" }}
        hero={<div />}
        sel
        onClick={() => {}}
      />,
    );
    expect(getByRole("button", { name: /Apple/ })).toHaveAttribute("aria-pressed", "true");
    expect(await violations(container)).toEqual([]);
  });

  it("AFinalistCard is a button and announces busy while it traces", async () => {
    const finalist = { name: "Nomos", version: 2, image_url: "/x.png", idea: "A calm mark" };
    const { container, getByRole } = render(
      <AFinalistCard f={finalist} sel busy onClick={() => {}} />,
    );
    const button = getByRole("button", { name: /Nomos/ });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(await violations(container)).toEqual([]);
  });

  it("QuickPath is a button, not a clickable div", async () => {
    const { container, getByRole } = render(
      <QuickPath
        title="Start a logo"
        sub="Just the mark"
        icon={<span />}
        preview="/p.png"
        route="logo-brief"
        onClick={() => {}}
      />,
    );
    expect(getByRole("button", { name: /Start a logo/ }).tagName).toBe("BUTTON");
    expect(await violations(container)).toEqual([]);
  });

  it("every control rendered here is keyboard-focusable", async () => {
    const { container } = render(
      <>
        <QuickPath title="Start a logo" sub="Just the mark" icon={<span />} preview="/p.png" route="logo-brief" onClick={() => {}} />
        <AFinalistCard f={{ name: "Nomos", image_url: "/x.png" }} sel={false} busy={false} onClick={() => {}} />
      </>,
    );
    // A negative tabIndex, or a non-interactive element carrying a click
    // handler, is what made these unreachable before.
    for (const el of container.querySelectorAll("button")) {
      expect(el.getAttribute("tabindex")).not.toBe("-1");
      expect(el.hasAttribute("disabled")).toBe(false);
    }
  });
});
