import { memo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { StyleGlyph } from "@/components/icons";
import { styleOptions } from "@/lib/wizard-constants";
import { AgentInsight, FooterNav } from "./shared";
import type { BrandStrategy } from "./types";

interface BrandStyleStepProps {
  selectedStyle: string;
  setSelectedStyle: Dispatch<SetStateAction<string>>;
  brandStrategy: BrandStrategy | null;
  onBack: () => void;
  onNext: () => void;
}

function BrandStyleStepComponent({
  selectedStyle,
  setSelectedStyle,
  brandStrategy,
  onBack,
  onNext,
}: BrandStyleStepProps) {
  return (
    <div className="form-content style-content">
      <header className="form-title">
        <h2>02. Brand Style</h2>
        <p>Choose the style direction that best represents your brand.</p>
      </header>

      <section className="style-picker">
        <h3>Which style direction feels right for your brand?</h3>
        {brandStrategy && (
          <AgentInsight
            label="AI recommendation"
            title={
              styleOptions.find((item) => item.id === brandStrategy.recommendedStyle)?.title ??
              "Modern"
            }
            body={brandStrategy.visualDirection}
          />
        )}
        <div className="style-grid">
          {styleOptions.map((option) => (
            <button
              type="button"
              className={selectedStyle === option.id ? "style-card selected" : "style-card"}
              aria-pressed={selectedStyle === option.id}
              key={option.id}
              onClick={() => setSelectedStyle(option.id)}
            >
              <span className="style-radio" aria-hidden="true" />
              <StyleGlyph kind={option.id} />
              <span className="style-copy">
                <strong>{option.title}</strong>
                <span>{option.body}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <FooterNav onBack={onBack} onNext={onNext} />
    </div>
  );
}

export const BrandStyleStep = memo(BrandStyleStepComponent);
