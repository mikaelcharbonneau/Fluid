// Server-sent events for the long generation routes.
//
// These routes can run for five minutes. Returning one JSON blob at the end
// means the browser cannot distinguish "thinking hard" from "hung", and when it
// does fail there is nothing to look at. Streaming turns the wait into a record
// of what happened.
//
// The contract is deliberately small. Every message is one JSON object on a
// `data:` line. Exactly one terminal message arrives — `result` or `error` —
// and then the stream closes.

import { createActivity, type Activity, type ActivityEvent } from "@/lib/ai/activity";

export type StreamMessage =
  | { type: "activity"; event: ActivityEvent }
  | { type: "result"; data: unknown }
  | { type: "error"; error: string; code?: string };

/**
 * Run `job` and stream its activity, ending with its result.
 *
 * Failures inside the job are reported as a terminal `error` message rather
 * than a failed response: by the time the job throws, headers are long gone and
 * a 500 is no longer available. The client treats an `error` message exactly as
 * it treated a non-OK response before.
 *
 * Anything that can be checked BEFORE calling this — auth, credits, a malformed
 * body — should still return an ordinary JSON error with a real status code.
 * Those are not part of the run, and a status code is a better way to say so.
 */
export function streamActivity(
  job: (activity: Activity) => Promise<unknown>,
  options: { onError?: (error: unknown) => { message: string; code?: string } } = {},
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (message: StreamMessage) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      };

      const activity = createActivity((event) => send({ type: "activity", event }));

      try {
        const data = await job(activity);
        send({ type: "result", data });
      } catch (err) {
        const mapped = options.onError?.(err);
        const message =
          mapped?.message ??
          (err instanceof Error ? err.message : "Generation failed.");
        // The failure belongs in the log too — otherwise the last thing the
        // client sees is a phase that never ended.
        send({ type: "activity", event: {
          seq: Number.MAX_SAFE_INTEGER,
          at: activity.elapsed(),
          kind: "warn",
          label: message,
        } });
        send({ type: "error", error: message, code: mapped?.code });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx and similar proxies buffer by default, which would hold every
      // event until the run finished and defeat the point.
      "X-Accel-Buffering": "no",
    },
  });
}
