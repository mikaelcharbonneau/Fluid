import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// The `server-only` package works by resolving to a no-op under Next's own
// webpack build (which sets a "react-server" export condition) and to a
// throwing stub everywhere else — including plain Vitest/Node, which has no
// reason to set that condition. Mock it globally so modules that import it
// (src/lib/env/server.ts and friends) stay unit-testable; the real guard
// still applies in the actual Next build.
vi.mock("server-only", () => ({}));

afterEach(() => {
  cleanup();
});
