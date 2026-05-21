import { memo } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClipboardIcon,
  DownloadIcon,
  EditIcon,
  EyeIcon,
  KitArt,
  LogoConceptArt,
  TeamIcon,
} from "@/components/icons";
import { kitItems, styleOptions } from "@/lib/wizard-constants";
import type { BrandStrategy } from "./types";

interface BrandKitStepProps {
  selectedStyle: string;
  selectedName: string;
  selectedLogo: string;
  brandStrategy: BrandStrategy | null;
  onBack: () => void;
  onComplete: () => void;
}

function BrandKitStepComponent({
  selectedStyle,
  selectedName,
  selectedLogo,
  brandStrategy,
  onBack,
  onComplete,
}: BrandKitStepProps) {
  const styleLabel = styleOptions.find((item) => item.id === selectedStyle)?.title ?? "Modern";
  const personality = brandStrategy?.personality?.slice(0, 2) ?? ["Clean", "Forward-looking"];

  return (
    <div className="form-content kit-content">
      <header className="form-title">
        <h2>05. Brand Kit</h2>
        <p>Review and finalize your complete brand kit.</p>
      </header>

      <section className="kit-summary-section">
        <h3>Your brand summary</h3>
        <div className="brand-summary">
          <LogoConceptArt kind={selectedLogo} />
          <div className="summary-copy">
            <h4>{selectedName}</h4>
            <p>
              {styleLabel} <span>•</span> {personality.join(" • ")}
            </p>
            <p>{brandStrategy?.tagline ?? "Empowering teams with clarity and flow."}</p>
          </div>
          <button type="button" className="edit-button">
            <EditIcon />
            Edit details
          </button>
        </div>
      </section>

      <section className="kit-included">
        <h3>What&apos;s included in your brand kit</h3>
        <div className="kit-grid">
          {kitItems.map((item) => (
            <article className="kit-card" key={item.id}>
              <KitArt kind={item.art} />
              <h4>{item.title}</h4>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="next-section">
        <h3>What&apos;s next?</h3>
        <p>{brandStrategy?.positioning ?? "Your brand kit is ready! You can now:"}</p>
        <div className="action-row">
          <button type="button">
            <EyeIcon />
            View brand kit
          </button>
          <button type="button">
            <DownloadIcon />
            Download assets
          </button>
          <button type="button">
            <TeamIcon />
            Invite team members
          </button>
          <button type="button">
            <ClipboardIcon />
            Create brand guidelines
          </button>
        </div>
      </section>

      <footer className="footer-actions">
        <button type="button" className="back-button" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </button>
        <button type="button" className="continue-button complete-button" onClick={onComplete}>
          Complete Setup
          <ArrowRightIcon />
        </button>
      </footer>
    </div>
  );
}

export const BrandKitStep = memo(BrandKitStepComponent);
