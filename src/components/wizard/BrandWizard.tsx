"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon, GradientRibbon } from "@/components/icons";
import { stepMeta } from "@/lib/wizard-constants";
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
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState("");
  const [hasBrandName, setHasBrandName] = useState("no");
  const [selectedName, setSelectedName] = useState("");
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [hasLogo, setHasLogo] = useState("no");
  const [logoPreference, setLogoPreference] = useState("");
  const [selectedLogo, setSelectedLogo] = useState("");
  const [brandStrategy, setBrandStrategy] = useState<BrandStrategy | null>(null);
  const [strategyStatus, setStrategyStatus] = useState<StrategyStatus>("idle");
  const [strategyError, setStrategyError] = useState("");
  const [brandId, setBrandId] = useState<string | null>(null);
  const hasCompletedMandatoryBasics = Boolean(about.trim());
  const canAccessStep2 = Boolean(brandStrategy && hasCompletedMandatoryBasics);
  const canAccessStep3 = Boolean(canAccessStep2 && selectedStyle);
  const canAccessStep4 = Boolean(canAccessStep3 && selectedName);
  const canAccessStep5 = Boolean(canAccessStep4 && selectedLogo);
  const stepAccess = [true, canAccessStep2, canAccessStep3, canAccessStep4, canAccessStep5];

  const goBack = () => setActiveStep((step) => Math.max(1, step - 1));
  const goNext = () => setActiveStep((step) => Math.min(5, step + 1));
  const generatedNames = brandStrategy?.suggestedNames ?? [];

  const selectName = (name: string) => {
    setSelectedName((currentName) => (currentName === name ? "" : name));
  };

  const saveName = (name: string) => {
    setSavedNames((items) =>
      items.includes(name) ? items.filter((item) => item !== name) : [...items, name],
    );
  };

  const completeSetup = () => {
    router.push(brandId ? `/brands/${brandId}` : "/brands");
  };

  const createStrategyAndContinue = async () => {
    if (!about.trim()) {
      setStrategyError("Add a short brand description so Fluid can shape the strategy.");
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

      setSelectedStyle("");
      setSelectedName("");
      setSelectedLogo("");

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
      <Sidebar activeHref="/brands" />
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
            {stepMeta.map((step, index) => {
              const stepNumber = index + 1;
              const locked = !stepAccess[index];

              return (
                <StepCard
                  key={step.number}
                  step={step}
                  active={activeStep === stepNumber}
                  completed={activeStep > stepNumber}
                  locked={locked}
                  onClick={() => {
                    if (!locked) setActiveStep(stepNumber);
                  }}
                />
              );
            })}
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
                nextDisabled={!selectedStyle}
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
                selectName={selectName}
                onBack={goBack}
                onNext={goNext}
                nextDisabled={!selectedName}
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
                selectedName={selectedName}
                brandStrategy={brandStrategy}
                onBack={goBack}
                onNext={goNext}
                nextDisabled={!selectedLogo}
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
