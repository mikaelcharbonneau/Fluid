import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Velaris from "./velaris";

describe("Velaris", () => {
  beforeEach(() => {
    // jsdom has no WebGL implementation. The static container is the intended
    // fallback when a browser cannot provide a WebGL context.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("renders its content and sizing without WebGL", () => {
    const { container } = render(
      <Velaris height="480px" className="hero-background">
        <p>Hero content</p>
      </Velaris>,
    );

    expect(screen.getByText("Hero content")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("velaris", "hero-background");
    expect(container.firstChild).toHaveStyle({ height: "480px" });
  });

  it("keeps the decorative canvas out of the accessibility tree", () => {
    const { container } = render(<Velaris />);
    expect(container.querySelector("canvas")).toHaveAttribute("aria-hidden", "true");
  });
});
