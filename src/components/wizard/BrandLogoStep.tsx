import { memo } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  LogoConceptArt,
  RefreshIcon,
  SparkleIcon,
} from "@/components/icons";
import { logoConcepts } from "@/lib/wizard-constants";
import { AgentInsight, ChoiceCard, FooterNav } from "./shared";
import type { BrandStrategy } from "./types";

interface BrandLogoStepProps {
  hasLogo: string;
  setHasLogo: (value: string) => void;
  logoPreference: string;
  setLogoPreference: Dispatch<SetStateAction<string>>;
  selectedLogo: string;
  setSelectedLogo: Dispatch<SetStateAction<string>>;
  selectedName: string;
  brandStrategy: BrandStrategy | null;
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}

function BrandLogoStepComponent({
  hasLogo,
  setHasLogo,
  logoPreference,
  setLogoPreference,
  selectedLogo,
  setSelectedLogo,
  selectedName,
  brandStrategy,
  onBack,
  onNext,
  nextDisabled = false,
}: BrandLogoStepProps) {
  return (
    <div className="form-content logo-content">
      <header className="form-title">
        <h2>04. Brand Logo</h2>
        <p>Generate a logo that represents your brand.</p>
      </header>

      <section className="choice-section">
        <h3>Does your brand have a logo?</h3>
        <div className="choice-grid">
          <ChoiceCard
            title="No"
            body="I need help creating a logo"
            selected={hasLogo === "no"}
            onClick={() => setHasLogo("no")}
          />
          <ChoiceCard
            title="Yes"
            body="I already have a logo"
            selected={hasLogo === "yes"}
            onClick={() => setHasLogo("yes")}
          />
        </div>
      </section>

      <section className="logo-preferences">
        <label className="text-input-wrap">
          <span>
            Any preferences for your logo? <em>(optional)</em>
          </span>
          <input
            value={logoPreference}
            onChange={(event) => setLogoPreference(event.target.value)}
            placeholder="e.g. Abstract icon, wordmark, minimalist, symbol + text..."
          />
        </label>
        <label className="text-input-wrap">
          <span>Logo style</span>
          <button className="select-control" type="button">
            <SparkleIcon />
            Auto (AI recommended)
            <ChevronDownIcon />
          </button>
        </label>
      </section>

      {brandStrategy && (
        <AgentInsight
          label="Logo direction"
          title="Use the strategy as the visual brief"
          body={brandStrategy.visualDirection}
        />
      )}

      {brandStrategy ? (
        <section className="concept-section">
          <h3>AI-generated concepts</h3>
          <div className="concept-grid">
            {logoConcepts.map((concept) => (
              <button
                type="button"
                className={selectedLogo === concept.id ? "logo-concept selected" : "logo-concept"}
                key={concept.id}
                onClick={() => setSelectedLogo(concept.id)}
              >
                {selectedLogo === concept.id && (
                  <span className="concept-check" aria-hidden="true">
                    <CheckIcon />
                  </span>
                )}
                <LogoConceptArt kind={concept.id} />
                <strong>{selectedName || concept.label}</strong>
              </button>
            ))}
          </div>
          <button type="button" className="generate-button">
            <RefreshIcon />
            Generate more
          </button>
        </section>
      ) : (
        <section className="concept-section">
          <h3>AI-generated concepts</h3>
          <div className="wizard-empty-state wizard-empty-panel">
            <SparkleIcon />
            <strong>No logo concepts yet</strong>
            <span>Create a brand strategy first to generate logo concepts.</span>
          </div>
        </section>
      )}

      <FooterNav onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} />
    </div>
  );
}

export const BrandLogoStep = memo(BrandLogoStepComponent);
