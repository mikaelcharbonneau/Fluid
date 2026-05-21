"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon, GradientRibbon } from "@/components/icons";
import { defaultNameSuggestions, stepMeta } from "@/lib/wizard-constants";
import { Sidebar } from "./Sidebar";
import { StepCard } from "./shared";
import { BrandBasicsStep } from "./BrandBasicsStep";
import { BrandStyleStep } from "./BrandStyleStep";
import { BrandNameStep } from "./BrandNameStep";
import { BrandLogoStep } from "./BrandLogoStep";
import { BrandKitStep } from "./BrandKitStep";
import type { BrandStrategy, StrategyStatus } from "./types";

export function BrandWizard() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  const [about, setAbout] = useState("");
  const [audience, setAudience] = useState("");
  const [difference, setDifference] = useState("");
  const [competitors, setCompetitors] = useState<string[]>(["Notion", "Canva", "Figma"]);
  const [selectedStyle, setSelectedStyle] = useState("modern");
  const [hasBrandName, setHasBrandName] = useState("no");
  const [selectedName, setSelectedName] = useState("ClarityFlow");
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [hasLogo, setHasLogo] = useState("no");
  const [logoPreference, setLogoPreference] = useState("");
  const [selectedLogo, setSelectedLogo] = useState("spark");
  const [brandStrategy, setBrandStrategy] = useState<BrandStrategy | null>(null);
  const [strategyStatus, setStrategyStatus] = useState<StrategyStatus>("idle");
  const [strategyError, setStrategyError] = useState("");
  const [brandId, setBrandId] = useState<string | null>(null);

  const goBack = () => setActiveStep((step) => Math.max(1, step - 1));
  const goNext = () => setActiveStep((step) => Math.min(5, step + 1));
  const generatedNames = brandStrategy?.suggestedNames?.length
    ? brandStrategy.suggestedNames
    : defaultNameSuggestions;

  const saveName = (name: string) => {
    setSelectedName(name);
    setSavedNames((items) => (items.includes(name) ? items : [...items, name]));
  };

  const completeSetup = () => {
    router.push(brandId ? `/brands/${brandId}` : "/brands");
  };

  const createStrategyAndContinue = async () => {
    if (!about.trim() || !audience.trim()) {
      setStrategyError(
        "Add a short brand description and audience so Fluid can shape the strategy.",
      );
      return;
    }

    setStrategyStatus("loading");
    setStrategyError("");

    try {
      const response = await fetch("/api/brand-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          about,
          audience,
          difference,
          competitors,
          styleDirection: selectedStyle,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Fluid could not create a strategy yet.");
      }

      setBrandStrategy(payload.strategy);
      setBrandId(payload.brandId ?? null);

      if (payload.strategy?.recommendedStyle) {
        setSelectedStyle(payload.strategy.recommendedStyle);
      }
      if (payload.strategy?.suggestedNames?.length) {
        setSelectedName(payload.strategy.suggestedNames[0]);
      }

      setStrategyStatus("success");
      setActiveStep(2);
    } catch (error) {
      setStrategyStatus("error");
      setStrategyError(
        error instanceof Error ? error.message : "Fluid could not create a strategy yet.",
      );
    }
  };

  return (
    <main className="app-frame" aria-label="Fluid create brand interface">
      <Sidebar activeHref="/" />
      <section className="workspace-shell">
        <GradientRibbon variant="top" />
        <GradientRibbon variant="bottom" />
        <button className="close-button" aria-label="Close">
          <CloseIcon />
        </button>

        <div className="screen-heading">
          <div className="breadcrumb">
            <span>Brands</span>
            <span className="slash">/</span>
            <span>Create New Brand</span>
          </div>
          <h1>Create your brand</h1>
          <p>
            Our AI will guide you step by step to build
            <br /> a brand that&apos;s unique, meaningful, and ready to grow.
          </p>
        </div>

        <div className="builder-grid">
          <aside className="steps-panel" aria-label="Brand creation steps">
            {stepMeta.map((step, index) => (
              <StepCard
                key={step.number}
                step={step}
                active={activeStep === index + 1}
                completed={activeStep > index + 1}
                onClick={() => setActiveStep(index + 1)}
              />
            ))}
          </aside>

          <section className="form-panel" aria-label={stepMeta[activeStep - 1].title}>
            {activeStep === 1 && (
              <BrandBasicsStep
                about={about}
                setAbout={setAbout}
                audience={audience}
                setAudience={setAudience}
                difference={difference}
                setDifference={setDifference}
                competitors={competitors}
                setCompetitors={setCompetitors}
                onNext={createStrategyAndContinue}
                strategyStatus={strategyStatus}
                strategyError={strategyError}
              />
            )}
            {activeStep === 2 && (
              <BrandStyleStep
                selectedStyle={selectedStyle}
                setSelectedStyle={setSelectedStyle}
                brandStrategy={brandStrategy}
                onBack={goBack}
                onNext={goNext}
              />
            )}
            {activeStep === 3 && (
              <BrandNameStep
                hasBrandName={hasBrandName}
                setHasBrandName={setHasBrandName}
                selectedName={selectedName}
                savedNames={savedNames}
                generatedNames={generatedNames}
                brandStrategy={brandStrategy}
                saveName={saveName}
                onBack={goBack}
                onNext={goNext}
              />
            )}
            {activeStep === 4 && (
              <BrandLogoStep
                hasLogo={hasLogo}
                setHasLogo={setHasLogo}
                logoPreference={logoPreference}
                setLogoPreference={setLogoPreference}
                selectedLogo={selectedLogo}
                setSelectedLogo={setSelectedLogo}
                brandStrategy={brandStrategy}
                onBack={goBack}
                onNext={goNext}
              />
            )}
            {activeStep === 5 && (
              <BrandKitStep
                selectedStyle={selectedStyle}
                selectedName={selectedName}
                selectedLogo={selectedLogo}
                brandStrategy={brandStrategy}
                onBack={goBack}
                onComplete={completeSetup}
              />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
