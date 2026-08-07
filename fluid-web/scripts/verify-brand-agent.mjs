// Exercises the pure half of the brand-agent backend: the persisted-state
// reader (transcript.ts) and the Responses-API tool-call parser
// (parseAgentOutput, in lib/ai/openai.ts). Both take no network and no API
// key, so they're checked directly, same approach as verify-brand-chat.mjs.
//
//   npm run verify:brand-agent
//
// tools.ts itself is NOT compiled and required here, unlike transcript.ts —
// unlike transcript.ts (which only imports types, all erased at compile), it
// has real runtime imports through `@/lib/brand-chat/*` aliases into the
// whole generation/logo pipeline, which plain `tsc <files>` (no project
// config) can't resolve. verify-brand-chat.mjs draws the same line for the
// same reason — generate.ts/run.ts/logo.ts aren't compiled there either.
// Instead, the one thing worth checking about tools.ts without executing it —
// that record_answer's key list hasn't drifted from what answer.ts actually
// accepts — is checked by reading both files' source directly.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = mkdtempSync(join(tmpdir(), "brand-agent-verify-"));
const require = createRequire(import.meta.url);

try {
  execFileSync(
    "npx",
    [
      "tsc",
      join(root, "src/lib/brand-agent/transcript.ts"),
      join(root, "src/lib/ai/openai.ts"),
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

  const load = (relPath) => {
    // tsc mirrors the shortest common source root, which shifts depending on
    // which files are passed — try a couple of plausible layouts rather than
    // hardcoding one.
    for (const candidate of [
      join(out, relPath),
      join(out, "src/lib", relPath.split("/").slice(-2).join("/")),
    ]) {
      try {
        return require(candidate);
      } catch {
        // try the next candidate
      }
    }
    throw new Error(`Could not locate compiled output for ${relPath}`);
  };
  const transcript = load("brand-agent/transcript.js");
  const openai = load("ai/openai.js");

  let checks = 0;
  const check = (label, fn) => {
    fn();
    checks++;
    console.log(`  ok  ${label}`);
  };

  // ---- transcript.readAgentState ----------------------------------------
  console.log("\ntranscript");

  check("undefined/null data reads as EMPTY_AGENT_STATE", () => {
    for (const input of [undefined, null]) {
      assert.deepEqual(transcript.readAgentState(input), transcript.EMPTY_AGENT_STATE);
    }
  });

  check("data with no agent key reads as EMPTY_AGENT_STATE", () => {
    assert.deepEqual(transcript.readAgentState({ chat: { brief: "x" } }), transcript.EMPTY_AGENT_STATE);
  });

  check("an agent key that is an array or a scalar is rejected, not trusted", () => {
    assert.deepEqual(transcript.readAgentState({ agent: [] }), transcript.EMPTY_AGENT_STATE);
    assert.deepEqual(transcript.readAgentState({ agent: "not an object" }), transcript.EMPTY_AGENT_STATE);
  });

  check("a well-formed agent state round-trips exactly", () => {
    const state = {
      transcript: [{ type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] }],
      context: { brief: "A studio for indie musicians." },
      turns: 3,
      done: false,
      proposedNames: ["Muster", "Cadence"],
      // readPendingQuestion always sets an `options` key (undefined when
      // absent), so the fixture needs it too for a strict deep-equal.
      pendingQuestion: { text: "Who is this for?", inputType: "text", options: undefined },
    };
    const read = transcript.readAgentState({ agent: state });
    assert.deepEqual(read, state);
  });

  check("a malformed transcript/proposedNames degrades to empty rather than throwing", () => {
    const read = transcript.readAgentState({
      agent: { transcript: "not an array", proposedNames: [1, 2, "Muster"], turns: "NaN" },
    });
    assert.deepEqual(read.transcript, []);
    assert.deepEqual(read.proposedNames, ["Muster"]);
    assert.equal(read.turns, 0);
  });

  check("a malformed pendingQuestion is dropped, not passed through", () => {
    for (const bad of [{}, { text: "" }, { text: 5 }, "just a string", null]) {
      const read = transcript.readAgentState({ agent: { pendingQuestion: bad } });
      assert.equal(read.pendingQuestion, undefined, JSON.stringify(bad));
    }
  });

  check("pendingQuestion's inputType falls back to text when unrecognized", () => {
    const read = transcript.readAgentState({
      agent: { pendingQuestion: { text: "Pick one", inputType: "dropdown" } },
    });
    assert.equal(read.pendingQuestion.inputType, "text");
  });

  check("agentStatePatch wraps the whole state under one `agent` key", () => {
    const state = { ...transcript.EMPTY_AGENT_STATE, turns: 5 };
    assert.deepEqual(transcript.agentStatePatch(state), { agent: state });
  });

  // ---- openai.parseAgentOutput -------------------------------------------
  console.log("\nparseAgentOutput");

  check("a message-only response is final, with no tool calls", () => {
    const result = openai.parseAgentOutput({
      id: "resp_1",
      output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "What are we building?" }] }],
    });
    assert.equal(result.isFinal, true);
    assert.equal(result.outputText, "What are we building?");
    assert.deepEqual(result.toolCalls, []);
    assert.equal(result.outputItems.length, 1);
  });

  check("a single function_call is parsed with its arguments and never marked final", () => {
    const result = openai.parseAgentOutput({
      id: "resp_2",
      output: [{ type: "function_call", call_id: "call_1", name: "propose_names", arguments: "{}" }],
    });
    assert.equal(result.isFinal, false);
    assert.equal(result.toolCalls.length, 1);
    assert.equal(result.toolCalls[0].callId, "call_1");
    assert.equal(result.toolCalls[0].name, "propose_names");
    assert.deepEqual(result.toolCalls[0].arguments, {});
  });

  check("malformed JSON arguments become null, not a thrown error", () => {
    const result = openai.parseAgentOutput({
      id: "resp_3",
      output: [{ type: "function_call", call_id: "call_2", name: "record_answer", arguments: "{not json" }],
    });
    assert.equal(result.toolCalls[0].arguments, null);
    assert.equal(result.toolCalls[0].argumentsRaw, "{not json");
  });

  check("multiple tool calls in one response are all captured, in order", () => {
    const result = openai.parseAgentOutput({
      id: "resp_4",
      output: [
        { type: "function_call", call_id: "a", name: "record_answer", arguments: '{"key":"brief","value":"x"}' },
        { type: "function_call", call_id: "b", name: "propose_names", arguments: "{}" },
      ],
    });
    assert.deepEqual(result.toolCalls.map((c) => c.callId), ["a", "b"]);
  });

  check("a response with no output array at all degrades to an empty final turn", () => {
    const result = openai.parseAgentOutput({ id: "resp_5" });
    assert.equal(result.isFinal, true);
    assert.equal(result.outputText, "");
    assert.deepEqual(result.outputItems, []);
  });

  // ---- tools.ts's record_answer keys, checked against answer.ts's source -
  console.log("\nrecord_answer / select_* key coverage");

  const answerSrc = readFileSync(join(root, "src/lib/brand-chat/answer.ts"), "utf8");
  const toolsSrc = readFileSync(join(root, "src/lib/brand-agent/tools.ts"), "utf8");

  const answerCases = new Set(
    [...answerSrc.matchAll(/case\s+"([a-zA-Z]+)":/g)].map((m) => m[1]),
  );

  check("answer.ts's switch was actually found (the regex isn't silently matching nothing)", () => {
    assert.ok(answerCases.size >= 15, `only found ${answerCases.size} cases`);
  });

  check("every RECORD_ANSWER_KEYS entry in tools.ts is a real applyAnswer case", () => {
    const listMatch = toolsSrc.match(/RECORD_ANSWER_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/);
    assert.ok(listMatch, "could not find RECORD_ANSWER_KEYS in tools.ts");
    const keys = [...listMatch[1].matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]);
    assert.ok(keys.length >= 10, `only found ${keys.length} keys`);
    for (const key of keys) {
      assert.ok(answerCases.has(key), `record_answer claims "${key}" but answer.ts has no such case`);
    }
  });

  check("every select_* target key is a real applyAnswer case", () => {
    // The keys select_name/select_direction/select_voice/select_tagline/
    // select_logo dispatch to — kept in sync by hand in tools.ts's runTool,
    // so this is the one place a rename in answer.ts would silently break
    // dispatch without this check.
    for (const key of ["name", "direction", "voice", "tagline", "logo"]) {
      assert.ok(answerCases.has(key), `select_* expects applyAnswer to handle "${key}"`);
    }
  });

  console.log(`\n${checks} checks passed.`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
