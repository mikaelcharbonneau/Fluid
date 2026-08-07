import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamActivity } from "@/lib/sse";
import { agentStatePatch, readAgentState, type AgentState } from "@/lib/brand-agent/transcript";
import { runAgentTurn } from "@/lib/brand-agent/loop";
import type { Activity } from "@/lib/ai/activity";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/brand-agent/turn — advance the model-orchestrated conversation.
//
// Body: { brandId, message? }
//   • no `message`, thread already has a question on file — a free repaint
//     of what's stored, no model call, no charge (mirrors the classic
//     brand-chat route's "no step = free resume").
//   • no `message`, thread is brand new — one model call to produce the
//     opening question.
//   • message present — the user's reply. May trigger several tool calls
//     (recording answers, running a generator) before the next question
//     comes back; see src/lib/brand-agent/loop.ts for that bound.
//
// This is the additive sibling of src/app/api/brand-chat/turn/route.ts —
// same auth/RLS/stream skeleton, different engine underneath. That route is
// untouched; this one owns `data.agent` on the same brands row.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    brandId?: unknown;
    message?: unknown;
  };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const message =
    typeof body.message === "string" && body.message.trim() ? body.message.trim() : null;
  if (!brandId) {
    return NextResponse.json({ error: "Missing brandId." }, { status: 400 });
  }

  // RLS scopes this to the caller's own brands, so a miss is "not yours or
  // not there" and the 404 is correct either way.
  const { data: brand, error: loadError } = await supabase
    .from("brands")
    .select("id, data")
    .eq("id", brandId)
    .maybeSingle();
  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!brand) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const state = readAgentState(brand.data);

  // A reload of a thread that's already waiting on a reply: repaint from
  // what's stored, no model call, no stream needed.
  if (!message && state.transcript.length > 0) {
    return NextResponse.json({
      done: state.done,
      assistantText: state.pendingQuestion?.text ?? "",
      pendingQuestion: state.pendingQuestion,
      context: state.context,
    });
  }

  const save = async (next: AgentState) => {
    const { error } = await supabase.rpc("brands_merge_data", {
      p_id: brandId,
      p_patch: agentStatePatch(next),
    });
    if (error) throw new Error(`Your progress could not be saved: ${error.message}`);
  };

  return streamActivity(
    async (activity: Activity) => {
      const outcome = await runAgentTurn({
        state,
        userMessage: message,
        userId: user.id,
        brandId,
        activity,
        onSave: save,
      });

      // The brief and the name are the brand's own columns, not agent state —
      // the Brands list and brand cards read them directly, the same reason
      // the classic chat route mirrors them. Only written when this turn
      // actually changed one, and never fatal to the turn if it fails.
      const mirror: Record<string, string> = {};
      if (outcome.state.context.brief && outcome.state.context.brief !== state.context.brief) {
        mirror.brief = outcome.state.context.brief;
      }
      if (outcome.state.context.name && outcome.state.context.name !== state.context.name) {
        mirror.name = outcome.state.context.name;
      }
      if (Object.keys(mirror).length > 0) {
        const { error: mirrorError } = await supabase.from("brands").update(mirror).eq("id", brandId);
        if (mirrorError) {
          console.error("Could not mirror brand-agent fields to their columns:", mirrorError.message);
        }
      }

      return {
        done: outcome.done,
        assistantText: outcome.assistantText,
        pendingQuestion: outcome.pendingQuestion,
        payload: outcome.payload,
        context: outcome.state.context,
        degraded: outcome.degraded,
      };
    },
    {
      onError: (err) => ({
        message: err instanceof Error ? err.message : "That turn could not be completed.",
      }),
    },
  );
}
