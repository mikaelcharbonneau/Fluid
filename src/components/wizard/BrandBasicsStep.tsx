import { memo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ArrowRightIcon, CloseSmallIcon, PlusIcon, SparkleIcon } from "@/components/icons";
import { AgentInsight } from "./shared";
import type { StrategyStatus } from "./types";

interface BrandBasicsStepProps {
  about: string;
  setAbout: Dispatch<SetStateAction<string>>;
  audience: string;
  setAudience: Dispatch<SetStateAction<string>>;
  difference: string;
  setDifference: Dispatch<SetStateAction<string>>;
  competitors: string[];
  setCompetitors: Dispatch<SetStateAction<string[]>>;
  onNext: () => void;
  strategyStatus: StrategyStatus;
  strategyError: string;
}

function BrandBasicsStepComponent({
  about,
  setAbout,
  audience,
  setAudience,
  difference,
  setDifference,
  competitors,
  setCompetitors,
  onNext,
  strategyStatus,
  strategyError,
}: BrandBasicsStepProps) {
  const isLoading = strategyStatus === "loading";

  return (
    <div className="form-content basics-content">
      <header className="form-title">
        <h2>01. Brand Basics</h2>
        <p>Tell us more about your vision</p>
      </header>

      <AgentInsight
        label="AI agent"
        title="Strategy generation starts here"
        body="Continue will analyze your mission, audience, and competitors before recommending a style direction, name territories, and brand kit foundation."
      />

      <div className="field-grid">
        <label className="field-block about-field">
          <span>What&apos;s your brand about?</span>
          <textarea
            value={about}
            maxLength={500}
            onChange={(event) => setAbout(event.target.value)}
            placeholder="Describe your mission, what you do,&#10;and who you help."
          />
          <em>{about.length} / 500</em>
        </label>

        <div className="right-fields">
          <label className="field-block">
            <span>Who is your audience?</span>
            <textarea
              className="short-field"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="e.g. Startup founders, SaaS companies,&#10;creators, ambitious teams..."
            />
          </label>
          <label className="field-block">
            <span>What makes your brand different?</span>
            <textarea
              className="medium-field"
              value={difference}
              onChange={(event) => setDifference(event.target.value)}
              placeholder="What's your unique edge or approach?"
            />
          </label>
        </div>
      </div>

      <section className="competitors">
        <div className="competitor-copy">
          <h3>
            Competitors <span>(optional)</span>
          </h3>
          <p>Add up to 5 competitors to help our AI understand your space.</p>
        </div>
        <div className="competitor-input">
          <span>Search for competitors or enter websites</span>
          <button type="button" aria-label="Add competitor">
            <PlusIcon />
            Add
          </button>
        </div>
        <div className="chips" aria-label="Selected competitors">
          {competitors.map((name) => (
            <button
              type="button"
              className="chip"
              key={name}
              onClick={() => setCompetitors((items) => items.filter((item) => item !== name))}
            >
              {name}
              <CloseSmallIcon />
            </button>
          ))}
        </div>
      </section>

      {(strategyError || strategyStatus === "success" || isLoading) && (
        <div className={strategyError ? "ai-status error" : "ai-status"}>
          <SparkleIcon />
          <span>
            {isLoading && "Fluid is shaping your first brand strategy..."}
            {strategyStatus === "success" && "Brand strategy created by Fluid's AI agent."}
            {strategyError}
          </span>
        </div>
      )}

      <div className="brand-preview" aria-hidden="true">
        <div className="preview-mark">
          <span />
          <span />
          <span />
        </div>
        <div className="preview-lines">
          <span />
          <span />
          <span />
        </div>
        <div className="preview-swatch-row">
          <span />
          <span />
          <span />
        </div>
      </div>

      <button type="button" className="continue-button" onClick={onNext} disabled={isLoading}>
        {isLoading ? "Creating" : "Create strategy"}
        <ArrowRightIcon />
      </button>
    </div>
  );
}

export const BrandBasicsStep = memo(BrandBasicsStepComponent);
