import { memo } from "react";
import { HeartIcon } from "@/components/icons";
import { ChoiceCard, FooterNav } from "./shared";
import type { BrandStrategy } from "./types";

interface BrandNameStepProps {
  hasBrandName: string;
  setHasBrandName: (value: string) => void;
  selectedName: string;
  savedNames: string[];
  generatedNames: string[];
  brandStrategy: BrandStrategy | null;
  saveName: (name: string) => void;
  selectName: (name: string) => void;
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}

function BrandNameStepComponent({
  hasBrandName,
  setHasBrandName,
  selectedName,
  savedNames,
  generatedNames,
  brandStrategy,
  saveName,
  selectName,
  onBack,
  onNext,
  nextDisabled = false,
}: BrandNameStepProps) {
  return (
    <div className="form-content name-content">
      <header className="form-title">
        <h2>03. Brand Name</h2>
        <p>Find a memorable and meaningful name for your brand.</p>
      </header>

      <section className="choice-section">
        <h3>Does your brand have a name?</h3>
        <div className="choice-grid">
          <ChoiceCard
            title="No"
            body="I need help finding a name"
            selected={hasBrandName === "no"}
            onClick={() => setHasBrandName("no")}
          />
          <ChoiceCard
            title="Yes"
            body="I already have a name"
            selected={hasBrandName === "yes"}
            onClick={() => setHasBrandName("yes")}
          />
        </div>
      </section>

      <section className="name-workspace">
        <div className="name-column">
          <div className="section-copy">
            <h3>AI-suggested names</h3>
            <p>
              {brandStrategy
                ? brandStrategy.namingTerritories?.slice(0, 2).join(" + ")
                : "Choose a name that resonates with your brand."}
            </p>
          </div>
          <div className="name-list">
            {generatedNames.length ? (
              generatedNames.map((name) => (
                <div className={selectedName === name ? "name-row selected" : "name-row"} key={name}>
                  <button
                    className={savedNames.includes(name) ? "heart-button saved" : "heart-button"}
                    type="button"
                    aria-label={`Save ${name}`}
                    onClick={() => saveName(name)}
                  >
                    <HeartIcon />
                  </button>
                  <strong>{name}</strong>
                  <button
                    className="select-name-button"
                    type="button"
                    aria-pressed={selectedName === name}
                    onClick={() => selectName(name)}
                  >
                    Select
                  </button>
                </div>
              ))
            ) : (
              <div className="wizard-empty-state">
                <HeartIcon />
                <strong>No suggested names yet</strong>
                <span>Create a brand strategy first to generate name options.</span>
              </div>
            )}
          </div>
        </div>

        <div className="name-column saved-column">
          <div className="section-copy">
            <h3>Saved names</h3>
            <p>Names you&apos;ve liked will appear here.</p>
          </div>
          <div className={savedNames.length ? "saved-panel has-items" : "saved-panel"}>
            {savedNames.length ? (
              savedNames.map((name) => (
                <div
                  className={selectedName === name ? "saved-name-row selected" : "saved-name-row"}
                  key={name}
                >
                  <button
                    className="heart-button saved"
                    type="button"
                    aria-label={`Remove ${name} from saved names`}
                    onClick={() => saveName(name)}
                  >
                    <HeartIcon />
                  </button>
                  <strong>{name}</strong>
                  <button
                    className="select-name-button"
                    type="button"
                    aria-pressed={selectedName === name}
                    onClick={() => selectName(name)}
                  >
                    Select
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-saved">
                <HeartIcon />
                <strong>No saved names yet</strong>
                <span>Like a name to see it here.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <FooterNav onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} />
    </div>
  );
}

export const BrandNameStep = memo(BrandNameStepComponent);
