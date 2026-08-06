// Exercises the pure half of the brand-chat backend: the flow machine, the
// answer validator, the brand-context renderer, and every parser that reads a
// model's reply.
//
// These are the parts that decide what a skill is told and what gets believed
// when it answers, and they are all pure — so they can be checked properly
// with no API key, no database and no network. The model call itself is not
// covered here; nothing meaningful can be asserted about it offline.
//
//   npm run verify:brand-chat
//
// The modules under test import each other with extensionless specifiers and
// no path aliases, so they are compiled to CommonJS in a temp directory and
// required from there. That keeps the source free of test-only concessions.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = mkdtempSync(join(tmpdir(), "brand-chat-verify-"));
const require = createRequire(import.meta.url);

const MODULES = ["context", "flow", "answer", "contracts", "logo-prompt"];

try {
  execFileSync(
    "npx",
    [
      "tsc",
      ...MODULES.map((m) => join(root, "src/lib/brand-chat", `${m}.ts`)),
      "--outDir",
      out,
      "--module",
      "commonjs",
      "--target",
      "es2022",
      "--moduleResolution",
      "node",
      "--skipLibCheck",
    ],
    { cwd: root, stdio: "inherit" },
  );

  const context = require(join(out, "context.js"));
  const flow = require(join(out, "flow.js"));
  const answer = require(join(out, "answer.js"));
  const contracts = require(join(out, "contracts.js"));
  const logoPrompt = require(join(out, "logo-prompt.js"));

  let checks = 0;
  const check = (label, fn) => {
    fn();
    checks++;
    console.log(`  ok  ${label}`);
  };
  const throws = (label, fn, match) => check(label, () => assert.throws(fn, match));

  // ---- flow ----------------------------------------------------------
  console.log("\nflow");

  check("every flow step resolves to a definition", () => {
    for (const f of flow.FLOWS) {
      const steps = flow.flowSteps(f.id);
      assert.equal(
        steps.length,
        f.steps.length,
        `${f.id} has a step key with no definition in STEPS`,
      );
    }
  });

  check("every flow has a skill behind it", () => {
    for (const f of flow.FLOWS) {
      assert.ok(flow.FLOW_SKILL[f.id], `${f.id} has no entry in FLOW_SKILL`);
    }
  });

  check("every flow starts at the path question", () => {
    for (const f of flow.FLOWS) assert.equal(f.steps[0], "path");
  });

  check("a short flow ends where its job ends", () => {
    // Naming stops at the name. Reaching a positioning map would mean the
    // subset logic silently fell through to the full script.
    assert.equal(flow.nextStep("name-only", "name"), null);
    assert.equal(flow.nextStep("name-only", "competitors").key, "name");
  });

  check("the full flow runs every step", () => {
    assert.equal(flow.flowSteps("new").length, flow.STEPS.length);
  });

  check("an unknown step key restarts rather than throwing", () => {
    assert.equal(flow.nextStep("new", "not-a-step").key, "path");
  });

  check("an unknown path falls back to the full flow", () => {
    assert.equal(flow.getFlow("nonsense").id, "new");
  });

  check("the audit flow does not ask an existing brand to be renamed", () => {
    const keys = flow.flowSteps("audit").map((s) => s.key);
    assert.ok(!keys.includes("name"), "audit should not run the naming step");
  });

  // ---- answers -------------------------------------------------------
  console.log("\nanswer");

  check("a valid answer lands in its own field and nothing else", () => {
    const next = answer.applyAnswer("brief", "  A calm daily OS.  ", { name: "Keel" });
    assert.equal(next.brief, "A calm daily OS.");
    assert.equal(next.name, "Keel", "an unrelated field was disturbed");
  });

  throws("an empty brief is refused", () => answer.applyAnswer("brief", "   ", {}), /cannot be empty/);
  throws("a non-string brief is refused", () => answer.applyAnswer("brief", 42, {}), /must be text/);
  throws("an unknown path is refused", () => answer.applyAnswer("path", "hack", {}), /Unknown path/);

  check("a known path is accepted", () => {
    assert.equal(answer.applyAnswer("path", "logo-only", {}).path, "logo-only");
  });

  check("chips are trimmed, de-duplicated case-insensitively, and capped", () => {
    const next = answer.applyAnswer(
      "audience",
      ["  Founders ", "founders", "FOUNDERS", "Indie makers"],
      {},
    );
    assert.deepEqual(next.audience, ["Founders", "Indie makers"]);
  });

  check("values are capped at five", () => {
    const ten = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    assert.equal(answer.applyAnswer("values", ten, {}).values.length, 5);
  });

  check("a position is clamped to the unit square", () => {
    const next = answer.applyAnswer("position", { x: 5, y: -3 }, {});
    assert.deepEqual(next.position, { x: 1, y: 0 });
  });

  check("a slider that did not serialise falls back rather than losing the turn", () => {
    const next = answer.applyAnswer("personality", { tone: 8, formality: "x" }, {});
    assert.equal(next.personality.tone, 8);
    assert.equal(next.personality.formality, context.DEFAULT_PERSONALITY.formality);
  });

  check("sliders are clamped to 1–8", () => {
    const next = answer.applyAnswer("personality", { tone: 99, volume: -4 }, {});
    assert.equal(next.personality.tone, 8);
    assert.equal(next.personality.volume, 1);
  });

  check("the differentiator is skippable", () => {
    assert.equal(answer.applyAnswer("differentiator", "", {}).differentiator, "");
  });

  check("'nothing off-limits' is a real answer", () => {
    assert.deepEqual(answer.applyAnswer("avoid", [], {}).avoid, []);
  });

  throws(
    "an empty audience is refused — it is not the same as skipping",
    () => answer.applyAnswer("audience", [], {}),
    /cannot be empty/,
  );

  check("launch splits timing from channels", () => {
    const next = answer.applyAnswer(
      "launch",
      { timing: "Next month", channels: ["Website", "Website", "Press"] },
      {},
    );
    assert.equal(next.launchTiming, "Next month");
    assert.deepEqual(next.launchChannels, ["Website", "Press"]);
  });

  check("the voice answer keeps the line it was chosen on", () => {
    const next = answer.applyAnswer(
      "voice",
      { id: "coach", name: "Quiet Coach", sample: "You already know what today needs." },
      {},
    );
    // The id is meaningless to a skill and must not be what gets stored.
    assert.equal(next.voice, "Quiet Coach");
    assert.equal(next.voiceSample, "You already know what today needs.");
  });

  throws(
    "a voice with no name is refused",
    () => answer.applyAnswer("voice", { id: "coach" }, {}),
    /Voice/,
  );

  check("the kit writes no context — it is a document, not an answer", () => {
    const before = { brief: "x" };
    assert.deepEqual(answer.applyAnswer("kit", null, before), before);
  });

  check("the chosen mark keeps its url and the art direction behind it", () => {
    const next = answer.applyAnswer(
      "logo",
      {
        image_url: "https://example.supabase.co/storage/v1/object/public/brand-assets/b/chat-logo/2.png",
        label: "Interlocking K",
        art: "A vertical stroke meeting a wide arc.",
      },
      {},
    );
    assert.match(next.logo.image_url, /^https:\/\//);
    assert.equal(next.logo.label, "Interlocking K");
  });

  throws(
    "a mark url that is not https is refused before it reaches an <img>",
    () =>
      answer.applyAnswer(
        "logo",
        { image_url: "javascript:alert(1)", label: "x", art: "y" },
        {},
      ),
    /could not be read/,
  );

  throws(
    "a mark with no url is refused",
    () => answer.applyAnswer("logo", { label: "x" }, {}),
    /Mark must be text/,
  );

  // ---- context document ----------------------------------------------
  console.log("\ncontext");

  check("an empty context renders every field as not captured", () => {
    const md = context.renderBrandContext({});
    assert.ok(md.includes("- **Name**: Not captured yet"));
    assert.ok(md.includes("- **Competitors**: Not captured yet"));
    // A skill must be able to tell "unknown" from "the user chose blank".
    assert.ok(!md.includes("undefined"), "an undefined leaked into the document");
    assert.ok(!md.includes("[object Object]"));
  });

  check("the headings match the brand-context skill's contract", () => {
    const md = context.renderBrandContext({});
    for (const heading of [
      "# Brand Context",
      "## Brand",
      "## Audience",
      "## Positioning",
      "## Brand Personality",
      "## Values & Mission",
      "## Goals",
    ]) {
      assert.ok(md.includes(heading), `missing heading: ${heading}`);
    }
  });

  check("collected values reach the document", () => {
    const md = context.renderBrandContext({
      name: "Keel",
      audience: ["Solo founders", "Indie makers"],
      competitors: ["Sunsama", "Linear"],
      values: ["Craft", "Restraint"],
    });
    assert.ok(md.includes("- **Name**: Keel"));
    assert.ok(md.includes("- **Primary Audience**: Solo founders, Indie makers"));
    assert.ok(md.includes("- **Competitors**: Sunsama, Linear"));
    assert.ok(md.includes("- **Core Values**: Craft, Restraint"));
  });

  check("the chosen register does not masquerade as a brand it admires", () => {
    const md = context.renderBrandContext({
      voice: "Quiet Coach",
      voiceSample: "You already know what today needs.",
    });
    // "Voice Admires" upstream means OTHER brands. Answering it with our own
    // register would put a wrong answer in front of every skill.
    assert.ok(md.includes("- **Voice Admires**: Not captured yet"));
    assert.ok(md.includes("- **Chosen voice**: Quiet Coach"));
    assert.ok(md.includes("- **Voice, written**: You already know what today needs."));
  });

  check("the sliders become words a strategist would write", () => {
    const words = context.personalityWords({
      tone: 8,
      formality: 1,
      price: 8,
      era: 1,
      volume: 8,
    });
    assert.deepEqual(words, ["Serious", "Casual", "Premium", "Classic", "Bold"]);
  });

  check("the map click becomes the vocabulary the skills use", () => {
    assert.match(context.marketPosition({ x: 0.9, y: 0.9 }), /^premium \(emotional/);
    assert.match(context.marketPosition({ x: 0.1, y: 0.1 }), /^value \(functional/);
    assert.match(context.marketPosition({ x: 0.5, y: 0.5 }), /^mid-market/);
  });

  check("the chat's state is namespaced away from the wizard's", () => {
    const patch = context.brandContextPatch({ brief: "x" });
    assert.deepEqual(Object.keys(patch), ["chat"]);
    // The wizard writes flat keys on the same blob; reading must ignore them.
    assert.deepEqual(context.readBrandContext({ step2: {}, logo_types: ["wordmark"] }), {});
    assert.equal(context.readBrandContext({ chat: { brief: "y" } }).brief, "y");
    assert.deepEqual(context.readBrandContext(null), {});
    assert.deepEqual(context.readBrandContext({ chat: "not an object" }), {});
  });

  // ---- parsers -------------------------------------------------------
  console.log("\ncontracts");

  const names = (n) =>
    Array.from({ length: n }, (_, i) => ({
      name: `N${i}`,
      why: "because",
      domain: `n${i}.com`,
    }));

  check("ten good names parse", () => {
    const parsed = contracts.parseNames({ names: names(10) });
    assert.equal(parsed.length, 10);
  });

  check("extra names are dropped rather than shown", () => {
    assert.equal(contracts.parseNames({ names: names(14) }).length, 10);
  });

  throws(
    "nine names is a failure, not a short list",
    () => contracts.parseNames({ names: names(9) }),
    /fewer than ten/,
  );

  throws(
    "a name missing its reasoning is refused",
    () => contracts.parseNames({ names: [...names(9), { name: "X", domain: "x.com" }] }),
    /missing "why"/,
  );

  check("a domain is normalised, and availability is never claimed", () => {
    const [first] = contracts.parseNames({
      names: [{ name: "N", why: "w", domain: "HTTPS://Cadence.SO" }, ...names(9)],
    });
    assert.equal(first.domain, "cadence.so");
    assert.ok(!("free" in first), "availability must not be part of the shape");
  });

  check("a recommendation outside the list falls back to the first", () => {
    const dirs = Array.from({ length: 6 }, (_, i) => ({
      id: `d${i}`,
      name: `D${i}`,
      note: "n",
    }));
    assert.equal(contracts.parseDirections({ directions: dirs, recommended: "d3" }).recommended, "d3");
    assert.equal(
      contracts.parseDirections({ directions: dirs, recommended: "ghost" }).recommended,
      "d0",
    );
  });

  check("a competitor dot with no coordinates is dropped, not placed at the origin", () => {
    const parsed = contracts.parsePosition({
      read: "The category is crowded at the bottom.",
      competitors: [
        { label: "Real", x: 0.7, y: 0.3 },
        { label: "Broken" },
        { x: 0.2, y: 0.2 },
      ],
    });
    assert.equal(parsed.competitors.length, 1);
    assert.equal(parsed.competitors[0].label, "Real");
    assert.equal(parsed.suggested, undefined);
  });

  check("out-of-range coordinates are clamped onto the map", () => {
    const parsed = contracts.parsePosition({
      read: "r",
      competitors: [{ label: "Wide", x: 4, y: -2 }],
      suggested: { x: 0.6, y: 0.4 },
    });
    assert.deepEqual(parsed.competitors[0], { label: "Wide", x: 1, y: 0 });
    assert.deepEqual(parsed.suggested, { x: 0.6, y: 0.4 });
  });

  check("a voice without a written sample is refused", () => {
    const good = Array.from({ length: 6 }, (_, i) => ({
      id: `v${i}`,
      name: `V${i}`,
      axes: "warm 3",
      sample: "A real line.",
      note: "n",
    }));
    assert.equal(contracts.parseVoices({ voices: good }).length, 6);
    const missing = good.map((v, i) => (i === 2 ? { ...v, sample: "" } : v));
    assert.throws(() => contracts.parseVoices({ voices: missing }), /missing "sample"/);
  });

  check("five taglines parse and the style is normalised", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({
      text: `Line ${i}`,
      style: i === 0 ? "Witty" : "functional",
      why: "w",
    }));
    const parsed = contracts.parseTaglines({ taglines: five });
    assert.equal(parsed.length, 5);
    assert.equal(parsed[0].style, "witty");
  });

  throws(
    "a bad hex is refused rather than rendered as transparent",
    () =>
      contracts.parseKit({
        palette: [
          { hex: "#101418", role: "ink" },
          { hex: "coral", role: "accent" },
          { hex: "#FDBA50", role: "warm" },
          { hex: "#B0D2E6", role: "cool" },
          { hex: "#F4EFE7", role: "paper" },
        ],
        guidelines: "g",
      }),
    /not a six-digit hex/,
  );

  check("a good palette is upper-cased for consistency", () => {
    const parsed = contracts.parseKit({
      palette: [
        { hex: "#101418", role: "ink" },
        { hex: "#fd7947", role: "accent" },
        { hex: "#FDBA50", role: "warm" },
        { hex: "#B0D2E6", role: "cool" },
        { hex: "#F4EFE7", role: "paper" },
      ],
      guidelines: "One cap-height of air on every side.",
    });
    assert.equal(parsed.palette[1].hex, "#FD7947");
  });

  throws(
    "a missing top-level key names the field",
    () => contracts.parseLaunch({ note: "n" }),
    /missing "channels"/,
  );

  throws(
    "an array where an object belongs is refused",
    () => contracts.parseNames([]),
    /missing "names"/,
  );

  throws("null is refused", () => contracts.parseVoices(null), /missing "voices"/);

  // ---- identity brief + logo prompt ----------------------------------
  console.log("\nlogo");

  const marks = (n, art = "A single vertical stroke meeting a wide arc at the baseline, the arc's inner edge cut square so the counter reads as a notch rather than a curve.") =>
    Array.from({ length: n }, (_, i) => ({ label: `Mark ${i}`, art }));
  const palette5 = [
    { hex: "#101418", role: "ink" },
    { hex: "#FD7947", role: "accent" },
    { hex: "#FDBA50", role: "warm" },
    { hex: "#B0D2E6", role: "cool" },
    { hex: "#F4EFE7", role: "paper" },
  ];
  const brief = { concept: "Rhythm made visible.", palette: palette5, marks: marks(6) };

  check("a full identity brief parses", () => {
    const parsed = contracts.parseIdentity({ concept: "c", palette: palette5, marks: marks(6) });
    assert.equal(parsed.marks.length, 6);
    assert.equal(parsed.palette[0].hex, "#101418");
  });

  throws(
    "art direction too thin to draw from is refused",
    () => contracts.parseIdentity({ concept: "c", palette: palette5, marks: marks(6, "modern and clean") }),
    /too thin/,
  );

  throws(
    "five marks is a failure, not a short set",
    () => contracts.parseIdentity({ concept: "c", palette: palette5, marks: marks(5) }),
    /fewer than six/,
  );

  check("the brand name reaches a text-carrying mark's prompt", () => {
    const p = logoPrompt.markPrompt({ name: "Cadence", markType: "wordmark", brief, mark: brief.marks[0] });
    assert.ok(p.includes('the word "Cadence"'));
    assert.ok(/spelled exactly "Cadence"/.test(p));
    // A wordmark may contain its own name and nothing else.
    assert.ok(p.includes('Any words other than "Cadence"'));
  });

  check("a mark that must carry no text says so outright", () => {
    for (const type of ["abstract", "pictorial", "mascot"]) {
      const p = logoPrompt.markPrompt({ name: "Cadence", markType: type, brief, mark: brief.marks[0] });
      assert.ok(
        p.includes("Any letter, word, number or symbol resembling text"),
        `${type} did not forbid text`,
      );
    }
  });

  check("the art direction and the concept both reach the renderer", () => {
    const p = logoPrompt.markPrompt({ name: "Keel", markType: "abstract", brief, mark: brief.marks[2] });
    assert.ok(p.includes(brief.marks[2].art), "the mark's own art direction was dropped");
    assert.ok(p.includes("Rhythm made visible."), "the shared concept was dropped");
  });

  check("the palette is passed as the only colours allowed", () => {
    const p = logoPrompt.markPrompt({ name: "Keel", markType: "abstract", brief, mark: brief.marks[0] });
    for (const c of palette5) assert.ok(p.includes(c.hex), `${c.hex} missing from the prompt`);
  });

  check("refusals are carried into the prompt", () => {
    const p = logoPrompt.markPrompt({
      name: "Keel", markType: "abstract", brief, mark: brief.marks[0],
      avoid: ["Gradients", "Mascots"],
    });
    assert.ok(p.includes("Gradients, Mascots"));
  });

  check("an unknown mark type falls back rather than producing a broken prompt", () => {
    const p = logoPrompt.markPrompt({ name: "Keel", markType: "nonsense", brief, mark: brief.marks[0] });
    assert.ok(p.includes("A WORDMARK"));
  });

  check("no mockup, no sign, no second copy of the mark", () => {
    const p = logoPrompt.markPrompt({ name: "Keel", markType: "abstract", brief, mark: brief.marks[0] });
    for (const banned of ["no mockup", "no business card", "Draw one mark, once"]) {
      assert.ok(p.includes(banned), `missing constraint: ${banned}`);
    }
  });

  console.log(`\n${checks} checks passed.`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
