import type { CSSProperties } from "react";
import { ArrowLeftIcon, ArrowRightIcon, SparkleIcon } from "@/components/icons";
import type { StepMeta } from "@/lib/wizard-constants";

export function AgentInsight({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <aside className="agent-insight">
      <span className="agent-insight-kicker">
        <SparkleIcon />
        {label}
      </span>
      <strong>{title}</strong>
      <p>{body}</p>
    </aside>
  );
}

export function ChoiceCard({
  title,
  body,
  selected,
  onClick,
}: {
  title: string;
  body: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={selected ? "choice-card selected" : "choice-card"}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="style-radio" aria-hidden="true" />
      <span>
        <strong>{title}</strong>
        <em>{body}</em>
      </span>
    </button>
  );
}

export function FooterNav({
  onBack,
  onNext,
  nextDisabled = false,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <footer className="footer-actions">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeftIcon />
        Back
      </button>
      <button type="button" className="continue-button" onClick={onNext} disabled={nextDisabled}>
        Continue
        <ArrowRightIcon />
      </button>
    </footer>
  );
}

export function StepCard({
  step,
  active,
  completed,
  locked,
  onClick,
}: {
  step: StepMeta;
  active: boolean;
  completed: boolean;
  locked?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "step-card",
        active ? "active" : "",
        completed ? "completed" : "",
        locked ? "locked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--step-accent": step.accent } as CSSProperties}
      type="button"
      aria-current={active ? "step" : undefined}
      disabled={locked}
      onClick={onClick}
    >
      <span className="step-number">{step.number}</span>
      <span>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
      </span>
    </button>
  );
}
