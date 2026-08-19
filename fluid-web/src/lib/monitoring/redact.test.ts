import { describe, expect, it } from "vitest";
import { redactContext, redactEvent, redactHeaders, redactValue } from "./redact";

describe("redactValue", () => {
  it("drops values under sensitive key names", () => {
    const out = redactValue({
      authorization: "Bearer sk_live_abc123",
      apiKey: "sk-abc",
      SUPABASE_SERVICE_ROLE_KEY: "eyabc",
      password: "hunter2",
      ok: "keep-me",
    }) as Record<string, unknown>;
    expect(out.authorization).toBe("[redacted]");
    expect(out.apiKey).toBe("[redacted]");
    expect(out.SUPABASE_SERVICE_ROLE_KEY).toBe("[redacted]");
    expect(out.password).toBe("[redacted]");
    expect(out.ok).toBe("keep-me");
  });

  it("drops customer-content keys (prompts, generated creative, briefs)", () => {
    const out = redactValue({
      prompt: "a coffee shop for remote workers",
      brief: "a coffee shop for remote workers",
      generatedLogoSvg: "<svg>...</svg>",
      brandId: "b1",
    }) as Record<string, unknown>;
    expect(out.prompt).toBe("[redacted]");
    expect(out.brief).toBe("[redacted]");
    expect(out.generatedLogoSvg).toBe("[redacted]");
    expect(out.brandId).toBe("b1");
  });

  it("redacts emails embedded in string values", () => {
    expect(redactValue("contact us at user@example.com please")).toBe(
      "contact us at [redacted-email] please",
    );
  });

  it("redacts signed-URL credential params but keeps the rest of the URL", () => {
    const url = "https://cdn.example.com/logo.png?token=abc123&size=large";
    expect(redactValue(url)).toBe("https://cdn.example.com/logo.png?token=[redacted]&size=large");
  });

  it("recurses into nested objects and arrays", () => {
    const out = redactValue({
      user: { email: "a@b.com", secret: "shh" },
      items: [{ password: "x" }, { ok: "y" }],
    }) as Record<string, unknown>;
    expect((out.user as Record<string, unknown>).secret).toBe("[redacted]");
    expect(((out.items as Record<string, unknown>[])[0] as Record<string, unknown>).password).toBe(
      "[redacted]",
    );
    expect(((out.items as Record<string, unknown>[])[1] as Record<string, unknown>).ok).toBe("y");
  });

  it("summarizes Error instances without leaking secrets embedded in a stack", () => {
    const err = new Error("failed for user@example.com");
    const out = redactValue(err) as Record<string, unknown>;
    expect(out.name).toBe("Error");
    expect(out.message).toBe("failed for [redacted-email]");
    expect(out.stack).toBeUndefined();
  });

  it("bottoms out at a depth limit rather than recursing forever on cyclic-looking input", () => {
    let deep: unknown = "leaf";
    for (let i = 0; i < 20; i++) deep = { nested: deep };
    expect(JSON.stringify(redactValue(deep))).toContain("redacted-depth-limit");
  });
});

describe("redactContext", () => {
  it("is a typed convenience wrapper around redactValue for plain objects", () => {
    expect(redactContext({ secret: "x", brandId: "b1" })).toEqual({
      secret: "[redacted]",
      brandId: "b1",
    });
  });
});

describe("redactHeaders", () => {
  it("drops authorization/cookie headers case-insensitively and passes through the rest", () => {
    const out = redactHeaders({
      Authorization: "Bearer abc",
      "X-Request-Id": "req_1",
      Cookie: "sid=abc",
    });
    expect(out?.Authorization).toBe("[redacted]");
    expect(out?.Cookie).toBe("[redacted]");
    expect(out?.["X-Request-Id"]).toBe("req_1");
  });

  it("passes through undefined", () => {
    expect(redactHeaders(undefined)).toBeUndefined();
  });
});

describe("redactEvent", () => {
  it("redacts request headers/cookies/data/query string on a Sentry-shaped event", () => {
    const event = redactEvent({
      request: {
        headers: { Authorization: "Bearer abc", "X-Request-Id": "req_1" },
        cookies: { session: "abc" },
        data: { password: "hunter2", brandId: "b1" },
        query_string: "token=abc",
      },
    });
    expect(event.request?.headers?.Authorization).toBe("[redacted]");
    expect(event.request?.cookies).toBeUndefined();
    expect((event.request?.data as Record<string, unknown>).password).toBe("[redacted]");
    expect(event.request?.query_string).toBe("[redacted]");
  });

  it("redacts extra, contexts, and breadcrumb data", () => {
    const event = redactEvent({
      extra: { apiKey: "sk-abc", brandId: "b1" },
      contexts: { user: { secret: "shh" } },
      breadcrumbs: [{ message: "login for a@b.com", data: { password: "x" } }],
    });
    expect((event.extra as Record<string, unknown>).apiKey).toBe("[redacted]");
    expect(((event.contexts as Record<string, unknown>).user as Record<string, unknown>).secret).toBe(
      "[redacted]",
    );
    expect(event.breadcrumbs?.[0].message).toBe("login for [redacted-email]");
    expect(event.breadcrumbs?.[0].data?.password).toBe("[redacted]");
  });

  it("is a no-op on an event with none of those fields", () => {
    expect(redactEvent({})).toEqual({});
  });
});
