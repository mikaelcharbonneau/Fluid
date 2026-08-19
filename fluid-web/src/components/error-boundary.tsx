"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/lib/monitoring/log";
import { PrimaryAction, RecoveryPanel, SecondaryAction } from "@/components/recovery-panel";

interface Props {
  children: ReactNode;
  // Shown in the fallback ("Something went wrong in <label>") and attached
  // to the Sentry report so it's obvious which surface failed.
  label: string;
  // Rendered instead of the default full-panel fallback — for wrapping a
  // surface small enough that a full-screen recovery panel would be
  // disproportionate (e.g. one card in a grid).
  compact?: boolean;
}

interface State {
  error: Error | null;
}

// A component-level error boundary for high-risk surfaces that aren't their
// own route yet (Prototype.tsx renders all 18 product screens in one module
// — see #175). Catching here means a crash in, say, logo generation doesn't
// blank the whole authenticated shell; the rest of the product stays usable
// and the user gets a retry instead of a dead page.
//
// React only supports error boundaries as class components
// (getDerivedStateFromError / componentDidCatch have no hook equivalent).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(`Unhandled error in ${this.props.label}`, error, {
      componentStack: info.componentStack,
    });
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.compact) {
      return (
        <div
          role="alert"
          style={{
            padding: 16,
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "var(--bg-sunken, #F0F0F2)",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--fg-2, rgba(0,0,0,0.72))" }}>
            {this.props.label} hit an error.
          </p>
          <SecondaryAction onClick={this.retry}>Try again</SecondaryAction>
        </div>
      );
    }

    return (
      <RecoveryPanel
        eyebrow="Fluid"
        title={`Something went wrong in ${this.props.label}`}
        message="This part of the studio hit an unexpected error. Your saved brand progress isn't affected — try again."
        actions={<PrimaryAction onClick={this.retry}>Try again</PrimaryAction>}
      />
    );
  }
}
