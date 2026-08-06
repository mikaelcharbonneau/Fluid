import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeBrandInput } from "@/lib/brands";

type Ctx = { params: Promise<{ id: string }> };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// GET /api/brands/[id] — fetch one brand (RLS ensures it's the caller's).
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ brand: data });
}

// PATCH /api/brands/[id] — update fields (used for autosave through the wizard).
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const input = sanitizeBrandInput(await request.json().catch(() => ({})));
  if (Object.keys(input).length === 0) {
    return NextResponse.json({ error: "No valid fields." }, { status: 400 });
  }

  // `data` is merged, never assigned. The wizard autosaves by sending its whole
  // copy of the object, so assigning it would drop every key the client does
  // not know about — the creative platform, the logo
  // finalists — each time a field changes. Scalar columns still assign.
  const { data: patchData, ...columns } = input;

  let brand: unknown = null;

  if (Object.keys(columns).length) {
    const { data: row, error } = await supabase
      .from("brands")
      .update(columns)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
    brand = row;
  }

  if (patchData !== undefined) {
    // Merged in one statement rather than read-modify-write, so a debounced
    // field save landing while a generation route writes its result cannot
    // clobber it.
    const { data: rows, error } = await supabase.rpc("brands_merge_data", {
      p_id: id,
      p_patch: patchData,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
    brand = row;
  }

  if (!brand) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ brand });
}

// DELETE /api/brands/[id]
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
