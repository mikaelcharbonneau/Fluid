import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { captureExceptionMock, captureMessageMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  captureMessageMock: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock,
}));

import { reportError, reportWarning } from "./log";

describe("reportError", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    captureExceptionMock.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("logs locally and reports the original Error to Sentry", () => {
    const error = new Error("boom");
    reportError("Failed to do the thing", error, { brandId: "b1" });

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const [reportedError, opts] = captureExceptionMock.mock.calls[0];
    expect(reportedError).toBe(error);
    expect(opts.tags).toEqual({ reported_message: "Failed to do the thing" });
  });

  it("wraps a non-Error value in a real Error before reporting", () => {
    reportError("Something failed", "a plain string reason");
    const [reportedError] = captureExceptionMock.mock.calls[0];
    expect(reportedError).toBeInstanceOf(Error);
    expect(reportedError.message).toBe("Something failed");
  });

  it("redacts secrets out of the extra context before sending", () => {
    reportError("Failed", new Error("x"), { apiKey: "sk-secret", brandId: "b1" });
    const [, opts] = captureExceptionMock.mock.calls[0];
    expect(opts.extra).toEqual({ apiKey: "[redacted]", brandId: "b1" });
  });

  it("works with no error or context supplied", () => {
    expect(() => reportError("Just a message")).not.toThrow();
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });
});

describe("reportWarning", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    captureMessageMock.mockReset();
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("reports a warning-level message with redacted context", () => {
    reportWarning("Provider degraded", { secret: "x", provider: "openai" });
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(captureMessageMock).toHaveBeenCalledWith("Provider degraded", {
      level: "warning",
      extra: { secret: "[redacted]", provider: "openai" },
    });
  });
});
