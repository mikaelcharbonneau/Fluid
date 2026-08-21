// Guards the route split from #175.
//
//   npm run measure:js            # report + enforce
//   npm run measure:js -- --write # re-baseline budgets to current + headroom
//
// The app keeps route payloads small by loading each screen independently. The
// archived workflows are outside this measurement and the production source tree.
//
// Two checks, both read straight off the build in .next/ — no server and no
// logged-in session, which matters because every /app route sits behind auth:
//
//   1. Per-route INITIAL JavaScript (the chunks the prerendered HTML pulls in)
//      stays under budget. This is what catches the regression that would undo
//      the split: statically importing a screen into the shared layout or
//      shell drags it into every route's initial payload and blows the budget.
//
//   2. No screen's code appears in ANY route's initial payload. Screens are
//      loaded with `dynamic(..., { ssr: false })`, so their code must arrive at
//      runtime, never in the HTML's chunk set.
//
// What this deliberately does NOT measure is the per-route runtime fetch (the
// screen chunk itself), which needs a browser with a real session. Those bytes
// are covered by check 2 being true plus e2e/app-routes.spec.ts proving each
// route still resolves.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, ".next");
const SCREENS_DIR = path.join(ROOT, "src/app/app/_screens");
const BUDGET_FILE = path.join(ROOT, "route-js-budgets.json");
const WRITE = process.argv.includes("--write");
// Budgets carry room for ordinary feature work; the point is to catch a route
// pulling the whole product back in, not to litigate every kilobyte.
const HEADROOM = 1.2;

const ROUTES = [
  "/", "/login", "/signup",
  "/app", "/app/home", "/app/chat", "/app/brands", "/app/brands-empty", "/app/assets",
  "/app/guides", "/app/settings",
];

function htmlFor(route) {
  const rel = route === "/" ? "index" : route.replace(/^\//, "");
  for (const c of [
    path.join(NEXT_DIR, "server/app", rel + ".html"),
    path.join(NEXT_DIR, "server/app", rel, "index.html"),
  ]) if (fs.existsSync(c)) return c;
  return null;
}

const chunksIn = (html) => new Set(html.match(/\/_next\/static\/chunks\/[A-Za-z0-9_.:@-]+\.js/g) || []);
const chunkPath = (c) => path.join(NEXT_DIR, c.replace(/^\/_next\//, ""));

const sizeCache = new Map();
function chunkSize(c) {
  if (!sizeCache.has(c)) {
    const p = chunkPath(c);
    sizeCache.set(c, fs.existsSync(p) ? fs.statSync(p).size : 0);
  }
  return sizeCache.get(c);
}

// ---- gather -------------------------------------------------------------
const measured = {};
const routeChunks = {};
const missing = [];
for (const route of ROUTES) {
  const file = htmlFor(route);
  if (!file) { missing.push(route); continue; }
  const chunks = chunksIn(fs.readFileSync(file, "utf8"));
  routeChunks[route] = chunks;
  measured[route] = [...chunks].reduce((s, c) => s + chunkSize(c), 0);
}
if (missing.length) {
  console.error(`No prerendered HTML for: ${missing.join(", ")}`);
  console.error("Run `npm run build` first (and check those routes still exist).");
  process.exit(1);
}

const kb = (n) => Math.round(n / 1024);

// ---- check 2: screen code must not be in any initial payload ------------
// Marker = a long string literal that appears in exactly one file under
// src/app/app, so finding it in a chunk pins that chunk to that screen.
function screenMarkers() {
  const files = fs.readdirSync(SCREENS_DIR).filter((f) => f.endsWith(".tsx"));
  const allSource = new Map();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !e.name.includes(".test.")) allSource.set(p, fs.readFileSync(p, "utf8"));
    }
  };
  walk(path.join(ROOT, "src/app/app"));

  const markers = {};
  for (const f of files) {
    const full = path.join(SCREENS_DIR, f);
    const literals = (allSource.get(full).match(/'[^'\\\n]{18,60}'/g) || []).map((s) => s.slice(1, -1));
    const unique = literals.find((lit) => {
      if (/[<>{}$`]/.test(lit)) return false;
      let hits = 0;
      for (const [p, src] of allSource) if (src.includes(`'${lit}'`)) hits += p === full ? 1 : 2;
      return hits === 1;
    });
    if (unique) markers[f.replace(/\.tsx$/, "")] = unique;
  }
  return markers;
}

const markers = screenMarkers();
const chunkText = new Map();
const readChunk = (c) => {
  if (!chunkText.has(c)) {
    const p = chunkPath(c);
    chunkText.set(c, fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");
  }
  return chunkText.get(c);
};

const leaks = [];
const allInitialChunks = new Set(Object.values(routeChunks).flatMap((s) => [...s]));
for (const [screen, marker] of Object.entries(markers)) {
  for (const c of allInitialChunks) {
    if (readChunk(c).includes(marker)) {
      leaks.push({ screen, chunk: c.split("/").pop() });
      break;
    }
  }
}

// ---- report -------------------------------------------------------------
if (WRITE) {
  const budgets = Object.fromEntries(Object.entries(measured).map(([r, b]) => [r, Math.round(kb(b) * HEADROOM)]));
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(budgets, null, 2) + "\n");
  console.log(`Wrote ${path.basename(BUDGET_FILE)} (measured + ${Math.round((HEADROOM - 1) * 100)}% headroom):\n`);
  for (const r of ROUTES) console.log(`  ${r.padEnd(24)} ${String(kb(measured[r])).padStart(4)} KB   budget ${budgets[r]} KB`);
  process.exit(0);
}

if (!fs.existsSync(BUDGET_FILE)) {
  console.error(`No ${path.basename(BUDGET_FILE)}. Create it with: npm run measure:js -- --write`);
  process.exit(1);
}
const budgets = JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));

let failed = 0;
console.log("Initial route JavaScript (uncompressed):\n");
for (const route of ROUTES) {
  const actual = kb(measured[route]);
  const budget = budgets[route];
  if (budget == null) {
    console.log(`  ????  ${route.padEnd(24)} ${String(actual).padStart(4)} KB   (no budget set)`);
    failed++;
    continue;
  }
  const over = actual > budget;
  if (over) failed++;
  console.log(`  ${over ? "FAIL" : "ok  "}  ${route.padEnd(24)} ${String(actual).padStart(4)} KB / ${String(budget).padStart(4)} KB`);
}

const checked = Object.keys(markers).length;
console.log(`\nScreen code kept out of initial payloads (${checked} of ${fs.readdirSync(SCREENS_DIR).filter((f) => f.endsWith(".tsx")).length} screens have a unique marker to check):`);
if (leaks.length) {
  failed += leaks.length;
  for (const l of leaks) console.log(`  FAIL  _screens/${l.screen} is in initial chunk ${l.chunk}`);
  console.log("  A screen must only be reachable through its route's `dynamic(..., { ssr: false })` import.");
} else {
  console.log("  ok    no screen module appears in any route's initial chunks");
}

if (failed) {
  console.error(`\n${failed} check(s) failed.`);
  console.error("If a size increase is intended, re-baseline with: npm run measure:js -- --write");
  process.exit(1);
}
console.log("\nAll routes within budget.");
