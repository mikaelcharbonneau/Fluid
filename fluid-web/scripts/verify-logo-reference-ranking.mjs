import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to verify ranking.",
  );
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function allActiveReferences() {
  const rows = [];
  const pageSize = 1_000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("logo_references")
      .select("name, mark_type, image_path, attributes, industry, sort_order, aspect_ratio, refinement")
      .eq("is_active", true)
      .order("image_path")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

function expectedRanking(rows, types, attributes, limit) {
  const wanted = new Set(attributes);
  return rows
    .filter((row) => !types.length || types.includes(row.mark_type))
    .map((row) => ({
      ...row,
      matchCount: wanted.size
        ? (Array.isArray(row.attributes) ? row.attributes : []).filter((attribute) => wanted.has(attribute)).length
        : 0,
    }))
    .sort((left, right) =>
      right.matchCount - left.matchCount ||
      left.sort_order - right.sort_order ||
      left.image_path.localeCompare(right.image_path),
    )
    .slice(0, limit);
}

async function verifyCase(rows, { name, types, attributes, limit }) {
  const expectedPool = rows.filter((row) => !types.length || types.includes(row.mark_type));
  const expected = expectedRanking(rows, types, attributes, limit);
  const { data, error } = await supabase.rpc("logo_references_ranked", {
    p_types: types.length ? types : null,
    p_attributes: attributes,
    p_limit: limit,
  });
  if (error) throw error;
  const actual = data ?? [];
  assert.equal(
    actual.length ? Number(actual[0].total_count) : 0,
    expectedPool.length,
    `${name}: total_count differs from the active type-filtered row count`,
  );
  assert.deepEqual(
    actual.map((row) => row.image_path),
    expected.map((row) => row.image_path),
    `${name}: RPC ordering differs from the JavaScript ranking contract`,
  );
}

const rows = await allActiveReferences();
assert.ok(rows.length > 0, "No active logo references exist to verify.");
const types = [...new Set(rows.map((row) => row.mark_type))].sort();
const attributes = [...new Set(rows.flatMap((row) => row.attributes ?? []))].sort();
const cases = [
  { name: "all references", types: [], attributes: [], limit: 12 },
  { name: "one type", types: types.slice(0, 1), attributes: [], limit: 12 },
  { name: "multiple types and attributes", types: types.slice(0, 2), attributes: attributes.slice(0, 3), limit: 12 },
  { name: "limit above matching rows", types: ["not-a-real-mark-type"], attributes: attributes.slice(0, 1), limit: 48 },
];

for (const testCase of cases) await verifyCase(rows, testCase);
console.log(`Verified logo_references_ranked against ${rows.length} active references.`);
