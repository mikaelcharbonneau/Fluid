import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LiquidMetalButton } from "./liquid-metal-button";

// jsdom has no WebGL, so ShaderMount always fails to mount here. That is the
// point of these tests: the button is a real button first and a shader second,
// and it has to survive every environment where WebGL is unavailable — blocked
// by policy, software rendering off, or the browser's ~16 live-context cap
// already reached.
describe("LiquidMetalButton", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders a button carrying the default label", () => {
    render(<LiquidMetalButton />);
    expect(screen.getByRole("button", { name: "Get Started" })).toBeInTheDocument();
  });

  it("uses a custom label for both the visible text and the accessible name", () => {
    render(<LiquidMetalButton label="Start free" />);
    const button = screen.getByRole("button", { name: "Start free" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Start free")).toBeInTheDocument();
  });

  it("keeps an accessible name in icon mode, where there is no visible text", () => {
    render(<LiquidMetalButton viewMode="icon" label="Generate" />);
    expect(screen.getByRole("button", { name: "Generate" })).toBeInTheDocument();
    expect(screen.queryByText("Generate")).not.toBeInTheDocument();
  });

  it("calls onClick", () => {
    const onClick = vi.fn();
    render(<LiquidMetalButton onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("still works when the shader cannot mount", () => {
    const onClick = vi.fn();
    render(<LiquidMetalButton label="Fallback" onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Fallback" });
    fireEvent.mouseEnter(button);
    fireEvent.mouseDown(button);
    fireEvent.mouseUp(button);
    fireEvent.click(button);
    fireEvent.mouseLeave(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not set type=submit, so it cannot submit a surrounding form by accident", () => {
    render(<LiquidMetalButton />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
