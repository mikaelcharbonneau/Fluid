// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { constructEventMock, subscriptionsRetrieveMock, rpcMock, fromMock } = vi.hoisted(() => {
  const constructEventMock = vi.fn();
  const subscriptionsRetrieveMock = vi.fn();
  const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const fromMock = vi.fn();
  return { constructEventMock, subscriptionsRetrieveMock, rpcMock, fromMock };
});

vi.mock("@/lib/stripe", () => ({
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  getStripe: () => ({
    webhooks: { constructEvent: constructEventMock },
    subscriptions: { retrieve: subscriptionsRetrieveMock },
  }),
  tierForPrice: (priceId: string | null | undefined) =>
    priceId === "price_pro" ? { tier: "pro", tokens: 500 } : { tier: "free", tokens: 0 },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock, rpc: rpcMock }),
}));

import { POST } from "../route";

function req(rawBody: string, sig = "sig_test") {
  const headers = new Headers();
  if (sig) headers.set("stripe-signature", sig);
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: rawBody,
    headers,
  });
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    constructEventMock.mockReset();
    subscriptionsRetrieveMock.mockReset();
    rpcMock.mockReset().mockResolvedValue({ data: null, error: null });
    fromMock.mockReset();
  });

  it("rejects a request with no stripe-signature header", async () => {
    const res = await POST(req("{}", ""));
    expect(res.status).toBe(400);
  });

  it("rejects a request with an invalid signature", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const res = await POST(req("{}"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid signature/i);
  });

  it("grants tokens exactly once for a given invoice id, even if the webhook is retried", async () => {
    constructEventMock.mockReturnValue({
      type: "invoice.paid",
      data: {
        object: {
          id: "in_1",
          customer: "cus_1",
          subscription: "sub_1",
        },
      },
    });
    subscriptionsRetrieveMock.mockResolvedValue({
      items: { data: [{ price: { id: "price_pro" } }] },
    });

    // First delivery: no last_invoice_id recorded yet.
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: { last_invoice_id: null, user_id: "u1" } })
      // Second (retried) delivery: last_invoice_id now matches in_1.
      .mockResolvedValueOnce({ data: { last_invoice_id: "in_1", user_id: "u1" } });
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }));
    fromMock.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
      update,
    });

    const first = await POST(req("{}"));
    expect(first.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("grant_tokens", { p_user: "u1", p_amount: 500 });

    // Simulate Stripe retrying the same event.
    const second = await POST(req("{}"));
    expect(second.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(1); // still 1 — no double credit.
  });

  it("returns 500 when the handler throws", async () => {
    constructEventMock.mockReturnValue({
      type: "invoice.paid",
      data: { object: { id: "in_2", customer: "cus_1", subscription: "sub_1" } },
    });
    fromMock.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockRejectedValue(new Error("db unreachable")),
        })),
      })),
    });

    const res = await POST(req("{}"));
    expect(res.status).toBe(500);
  });

  it("ignores unhandled event types", async () => {
    constructEventMock.mockReturnValue({ type: "payment_intent.succeeded", data: { object: {} } });
    const res = await POST(req("{}"));
    expect(res.status).toBe(200);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
