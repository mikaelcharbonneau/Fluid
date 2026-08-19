import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./error-boundary";

const { reportErrorMock } = vi.hoisted(() => ({ reportErrorMock: vi.fn() }));
vi.mock("@/lib/monitoring/log", () => ({ reportError: reportErrorMock }));

function Bomb({ armed }: { armed: boolean }) {
  if (armed) throw new Error("boom");
  return <div>content</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    reportErrorMock.mockReset();
    // React logs the caught error to console.error by default; keep test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when nothing has thrown", () => {
    render(
      <ErrorBoundary label="Test surface">
        <Bomb armed={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders a full-panel fallback and reports the error when a child throws", () => {
    render(
      <ErrorBoundary label="Logo generation">
        <Bomb armed={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Something went wrong in Logo generation/i)).toBeInTheDocument();
    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    expect(reportErrorMock.mock.calls[0][0]).toBe("Unhandled error in Logo generation");
  });

  it("renders a compact inline fallback when compact is set", () => {
    render(
      <ErrorBoundary label="Reference card" compact>
        <Bomb armed={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Reference card hit an error.");
  });

  it("recovers and re-renders children once the failure condition clears and retry is clicked", () => {
    // A module-level flag rather than component state: once the boundary
    // catches, its crashed children unmount, so nothing inside the tree can
    // flip a prop to fix itself — the fix has to come from outside (here, a
    // parent re-render after some external condition changes), same as a
    // failed fetch succeeding on retry in the real app.
    let armed = true;
    function Flaky() {
      if (armed) throw new Error("boom");
      return <div>recovered</div>;
    }
    render(
      <ErrorBoundary label="Test surface">
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    armed = false;
    fireEvent.click(screen.getByText("Try again"));
    expect(screen.getByText("recovered")).toBeInTheDocument();
  });
});
