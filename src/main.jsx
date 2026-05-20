import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const navItems = [
  { label: "Home", icon: HomeIcon },
  { label: "Brands", icon: GridIcon, active: true },
  { label: "Assets", icon: StackIcon },
  { label: "Templates", icon: TemplateIcon },
  { label: "Guidelines", icon: GuideIcon },
  { label: "Settings", icon: GearIcon },
];

const stepMeta = [
  {
    number: "01",
    title: "Brand Basics",
    body: "Tell us more about your vision.",
    accent: "linear-gradient(180deg, #31d5b5 0%, #5bd5e6 100%)",
  },
  {
    number: "02",
    title: "Brand Style",
    body: "Choose a style direction.",
    accent: "linear-gradient(180deg, #62c9ff 0%, #7fd8ff 100%)",
  },
  {
    number: "03",
    title: "Brand Name",
    body: "Find the perfect name.",
    accent: "linear-gradient(180deg, #a06cff 0%, #d28cff 100%)",
  },
  {
    number: "04",
    title: "Brand Logo",
    body: "Generate an original logo.",
    accent: "linear-gradient(180deg, #ff4545 0%, #ff5f73 100%)",
  },
  {
    number: "05",
    title: "Brand Kit",
    body: "Obtain your complete brand kit.",
    accent: "linear-gradient(180deg, #ff8b2f 0%, #ffad38 100%)",
  },
];

const styleOptions = [
  {
    id: "modern",
    title: "Modern",
    body: "Clean, fresh, and forward-looking with a contemporary edge.",
  },
  {
    id: "minimal",
    title: "Minimal",
    body: "Simple, elegant, and focused on clarity and purpose.",
  },
  {
    id: "bold",
    title: "Bold",
    body: "Strong, confident, and designed to stand out.",
  },
  {
    id: "classic",
    title: "Classic",
    body: "Timeless, traditional, and professionally trusted.",
  },
  {
    id: "playful",
    title: "Playful",
    body: "Fun, friendly, and full of personality.",
  },
  {
    id: "luxurious",
    title: "Luxurious",
    body: "Premium, sophisticated, and high-end in feel.",
  },
];

const nameSuggestions = [
  "ClarityFlow",
  "Lumiq",
  "Intentra",
  "Novaform",
  "Mindscape",
  "Peakora",
  "Virelo",
  "Elevan",
];

const logoConcepts = [
  { id: "spark", label: "ClarityFlow" },
  { id: "cube", label: "ClarityFlow" },
  { id: "loop", label: "ClarityFlow" },
  { id: "monogram", label: "ClarityFlow" },
];

const kitItems = [
  {
    id: "logo-suite",
    title: "Logo Suite",
    body: "Primary, horizontal, icon, and monochrome versions.",
    art: "spark",
  },
  {
    id: "color-palette",
    title: "Color Palette",
    body: "Primary and secondary colors with usage guidelines.",
    art: "palette",
  },
  {
    id: "typography",
    title: "Typography",
    body: "Heading and body fonts with scale and hierarchy.",
    art: "type",
  },
  {
    id: "brand-assets",
    title: "Brand Assets",
    body: "Gradients, patterns, and graphic elements.",
    art: "bubbles",
  },
  {
    id: "guidelines",
    title: "Guidelines",
    body: "Logo usage, color rules, typography, and tone of voice.",
    art: "book",
  },
];

function App() {
  const [activeStep, setActiveStep] = useState(1);
  const [about, setAbout] = useState("");
  const [audience, setAudience] = useState("");
  const [difference, setDifference] = useState("");
  const [competitors, setCompetitors] = useState(["Notion", "Canva", "Figma"]);
  const [selectedStyle, setSelectedStyle] = useState("modern");
  const [hasBrandName, setHasBrandName] = useState("no");
  const [selectedName, setSelectedName] = useState("ClarityFlow");
  const [savedNames, setSavedNames] = useState([]);
  const [hasLogo, setHasLogo] = useState("no");
  const [logoPreference, setLogoPreference] = useState("");
  const [selectedLogo, setSelectedLogo] = useState("spark");

  const goBack = () => setActiveStep((step) => Math.max(1, step - 1));
  const goNext = () => setActiveStep((step) => Math.min(5, step + 1));

  const saveName = (name) => {
    setSelectedName(name);
    setSavedNames((items) => (items.includes(name) ? items : [...items, name]));
  };

  return (
    <main className="app-frame" aria-label="Fluid create brand interface">
      <Sidebar />
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
            <br /> a brand that's unique, meaningful, and ready to grow.
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
                onNext={goNext}
              />
            )}
            {activeStep === 2 && (
              <BrandStyleStep
                selectedStyle={selectedStyle}
                setSelectedStyle={setSelectedStyle}
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
                onBack={goBack}
                onNext={goNext}
              />
            )}
            {activeStep === 5 && (
              <BrandKitStep
                selectedStyle={selectedStyle}
                selectedName={selectedName}
                selectedLogo={selectedLogo}
                onBack={goBack}
              />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function BrandBasicsStep({
  about,
  setAbout,
  audience,
  setAudience,
  difference,
  setDifference,
  competitors,
  setCompetitors,
  onNext,
}) {
  return (
    <div className="form-content basics-content">
      <header className="form-title">
        <h2>01. Brand Basics</h2>
        <p>Tell us more about your vision</p>
      </header>

      <div className="field-grid">
        <label className="field-block about-field">
          <span>What's your brand about?</span>
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
              onClick={() =>
                setCompetitors((items) => items.filter((item) => item !== name))
              }
            >
              {name}
              <CloseSmallIcon />
            </button>
          ))}
        </div>
      </section>

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

      <button type="button" className="continue-button" onClick={onNext}>
        Continue
        <ArrowRightIcon />
      </button>
    </div>
  );
}

function BrandStyleStep({ selectedStyle, setSelectedStyle, onBack, onNext }) {
  return (
    <div className="form-content style-content">
      <header className="form-title">
        <h2>02. Brand Style</h2>
        <p>Choose the style direction that best represents your brand.</p>
      </header>

      <section className="style-picker">
        <h3>Which style direction feels right for your brand?</h3>
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

function BrandNameStep({
  hasBrandName,
  setHasBrandName,
  selectedName,
  savedNames,
  saveName,
  onBack,
  onNext,
}) {
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
            <p>Choose a name that resonates with your brand.</p>
          </div>
          <div className="name-list">
            {nameSuggestions.map((name) => (
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
                <button className="select-name-button" type="button" onClick={() => saveName(name)}>
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="name-column saved-column">
          <div className="section-copy">
            <h3>Saved names</h3>
            <p>Names you've liked will appear here.</p>
          </div>
          <div className={savedNames.length ? "saved-panel has-items" : "saved-panel"}>
            {savedNames.length ? (
              savedNames.map((name) => (
                <button className="saved-name" type="button" key={name} onClick={() => saveName(name)}>
                  <HeartIcon />
                  {name}
                </button>
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

      <FooterNav onBack={onBack} onNext={onNext} />
    </div>
  );
}

function BrandLogoStep({
  hasLogo,
  setHasLogo,
  logoPreference,
  setLogoPreference,
  selectedLogo,
  setSelectedLogo,
  onBack,
  onNext,
}) {
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
              <strong>{concept.label}</strong>
            </button>
          ))}
        </div>
        <button type="button" className="generate-button">
          <RefreshIcon />
          Generate more
        </button>
      </section>

      <FooterNav onBack={onBack} onNext={onNext} />
    </div>
  );
}

function BrandKitStep({ selectedStyle, selectedName, selectedLogo, onBack }) {
  const styleLabel = styleOptions.find((item) => item.id === selectedStyle)?.title ?? "Modern";

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
            <p>{styleLabel} <span>•</span> Clean <span>•</span> Forward-looking</p>
            <p>Empowering teams with clarity and flow.</p>
          </div>
          <button type="button" className="edit-button">
            <EditIcon />
            Edit details
          </button>
        </div>
      </section>

      <section className="kit-included">
        <h3>What's included in your brand kit</h3>
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
        <h3>What's next?</h3>
        <p>Your brand kit is ready! You can now:</p>
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
        <button type="button" className="continue-button complete-button">
          Complete Setup
          <ArrowRightIcon />
        </button>
      </footer>
    </div>
  );
}

function FooterNav({ onBack, onNext }) {
  return (
    <footer className="footer-actions">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeftIcon />
        Back
      </button>
      <button type="button" className="continue-button" onClick={onNext}>
        Continue
        <ArrowRightIcon />
      </button>
    </footer>
  );
}

function ChoiceCard({ title, body, selected, onClick }) {
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

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Fluid navigation">
      <a className="logo" href="#" aria-label="Fluid home">
        <img src="/fluid-primary-wordmark.png" alt="Fluid." />
      </a>
      <nav className="primary-nav" aria-label="Primary">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a className={item.active ? "nav-item active" : "nav-item"} href="#" key={item.label}>
              <Icon />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      <SidebarWave />

      <section className="upgrade-card" aria-label="Upgrade to Pro">
        <div className="upgrade-title">
          <SparkleIcon />
          <strong>Upgrade to Pro</strong>
        </div>
        <p>Unlock more brand kits, team members, and advanced exports.</p>
        <button type="button">
          Upgrade Now
          <ArrowRightIcon />
        </button>
      </section>

      <button className="profile-card" type="button" aria-label="Account menu">
        <span className="avatar">J</span>
        <span className="profile-copy">
          <strong>Jane Smith</strong>
          <em>jane@studio.com</em>
        </span>
        <ChevronDownIcon />
      </button>
    </aside>
  );
}

function StepCard({ step, active, completed, onClick }) {
  return (
    <button
      className={[
        "step-card",
        active ? "active" : "",
        completed ? "completed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--step-accent": step.accent }}
      type="button"
      aria-current={active ? "step" : undefined}
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

function StyleGlyph({ kind }) {
  return (
    <span className={`style-art ${kind}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function LogoConceptArt({ kind }) {
  return (
    <span className={`logo-concept-art ${kind}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function KitArt({ kind }) {
  if (kind === "spark") {
    return <LogoConceptArt kind="spark" />;
  }

  return (
    <span className={`kit-art ${kind}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function GradientRibbon({ variant }) {
  return (
    <svg className={`ribbon ${variant}-ribbon`} viewBox="0 0 720 220" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`fluid-ribbon-${variant}`} x1="0" x2="1" y1="0.45" y2="0.55">
          <stop offset="0" stopColor="#31d5b5" />
          <stop offset="0.34" stopColor="#83caff" />
          <stop offset="0.63" stopColor="#f597c8" />
          <stop offset="1" stopColor="#ff8d28" />
        </linearGradient>
      </defs>
      <path
        d="M-18 152C71 157 108 113 156 65C225 -5 317 2 393 55C477 114 535 155 613 129C666 112 699 74 739 30V106C695 158 654 191 590 199C510 210 443 170 374 124C309 81 250 87 197 139C138 197 83 218 -18 202V152Z"
        fill={`url(#fluid-ribbon-${variant})`}
      />
    </svg>
  );
}

function SidebarWave() {
  return (
    <svg className="sidebar-wave" viewBox="0 0 260 228" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sidebar-wave-gradient" x1="0" x2="1" y1="0.75" y2="0.08">
          <stop offset="0" stopColor="#33d7a4" />
          <stop offset="0.48" stopColor="#4fd6de" />
          <stop offset="1" stopColor="#a5d5ff" />
        </linearGradient>
      </defs>
      <path
        d="M-22 120C42 132 96 107 136 59C171 18 210 4 282 -2V102C239 105 216 129 188 164C144 220 87 239 -23 212V120Z"
        fill="url(#sidebar-wave-gradient)"
        opacity="0.88"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="close-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5" />
    </svg>
  );
}

function CloseSmallIcon() {
  return (
    <svg className="chip-x" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="plus-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4.25V15.75M4.25 10H15.75" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="arrow-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.25 10H15.25M11.25 5.75L15.5 10L11.25 14.25" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="arrow-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M15.75 10H4.75M8.75 5.75L4.5 10L8.75 14.25" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="sparkle-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2.8L11.65 7.65L16.5 9.3L11.65 10.95L10 15.8L8.35 10.95L3.5 9.3L8.35 7.65L10 2.8Z" />
      <path d="M15.2 2.7L15.9 4.6L17.8 5.3L15.9 6L15.2 7.9L14.5 6L12.6 5.3L14.5 4.6L15.2 2.7Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="chevron-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 9.5L12 14.5L17 9.5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="heart-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.2C8.1 16.8 5.4 14.2 4.35 11.75C3.4 9.5 4.15 6.9 6.45 5.95C8.2 5.2 10.15 5.8 11.25 7.2L12 8.15L12.75 7.2C13.85 5.8 15.8 5.2 17.55 5.95C19.85 6.9 20.6 9.5 19.65 11.75C18.6 14.2 15.9 16.8 12 20.2Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="check-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5.4 10.25L8.35 13.05L14.6 6.95" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="refresh-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M15.3 6.45A6 6 0 0 0 4.7 8.7M15.3 6.45V3.6M15.3 6.45H12.45M4.7 13.55A6 6 0 0 0 15.3 11.3M4.7 13.55V16.4M4.7 13.55H7.55" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="tool-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.4 14.95L5.2 11.55L12.85 3.9C13.45 3.3 14.4 3.3 15 3.9L16.1 5C16.7 5.6 16.7 6.55 16.1 7.15L8.45 14.8L5.05 15.6C4.65 15.7 4.3 15.35 4.4 14.95Z" />
      <path d="M11.8 4.95L15.05 8.2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="tool-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2.75 10C4.6 6.95 7.05 5.45 10 5.45C12.95 5.45 15.4 6.95 17.25 10C15.4 13.05 12.95 14.55 10 14.55C7.05 14.55 4.6 13.05 2.75 10Z" />
      <path d="M8.15 10A1.85 1.85 0 1 0 11.85 10A1.85 1.85 0 0 0 8.15 10Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="tool-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 3.4V12.2M6.45 8.95L10 12.5L13.55 8.95" />
      <path d="M4.25 15.8H15.75" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg className="tool-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7.4 9.35A2.55 2.55 0 1 0 7.4 4.25A2.55 2.55 0 0 0 7.4 9.35Z" />
      <path d="M2.85 16C3.25 13.6 4.9 12.25 7.4 12.25C9.9 12.25 11.55 13.6 11.95 16" />
      <path d="M13.3 9.15A2.15 2.15 0 1 0 13.3 4.85" />
      <path d="M12.85 12.35C15.2 12.45 16.6 13.7 17 15.8" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="tool-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6.4 5.25H5.35C4.6 5.25 4 5.85 4 6.6V15.15C4 15.9 4.6 16.5 5.35 16.5H14.65C15.4 16.5 16 15.9 16 15.15V6.6C16 5.85 15.4 5.25 14.65 5.25H13.6" />
      <path d="M7 6.5H13V4.75C13 4.05 12.45 3.5 11.75 3.5H8.25C7.55 3.5 7 4.05 7 4.75V6.5Z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.7 9.25L10 4.2L16.3 9.25V16H12.2V11.9H7.8V16H3.7V9.25Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="4.6" height="4.6" rx="1" stroke="currentColor" />
      <rect x="11.4" y="4" width="4.6" height="4.6" rx="1" stroke="currentColor" />
      <rect x="4" y="11.4" width="4.6" height="4.6" rx="1" stroke="currentColor" />
      <rect x="11.4" y="11.4" width="4.6" height="4.6" rx="1" stroke="currentColor" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3.8L16 7L10 10.2L4 7L10 3.8Z" stroke="currentColor" strokeLinejoin="round" />
      <path d="M4 10L10 13.2L16 10M4 13L10 16.2L16 13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="3.8" width="12" height="12.4" rx="2" stroke="currentColor" />
      <path d="M7.2 7H10.4M7.2 10H12.8M7.2 13H10.4" stroke="currentColor" strokeLinecap="round" />
      <path d="M13.2 6.7L15.2 8.7L13.2 10.7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GuideIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="3.4" height="12" rx="1" stroke="currentColor" />
      <rect x="8.3" y="4" width="3.4" height="12" rx="1" stroke="currentColor" />
      <rect x="12.6" y="4" width="3.4" height="12" rx="1" stroke="currentColor" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 12.75A2.75 2.75 0 1 0 10 7.25A2.75 2.75 0 0 0 10 12.75Z" stroke="currentColor" />
      <path d="M10 3.5L11.05 5.3L13.1 5.6L13.85 7.45L12.55 9.05L12.55 10.95L13.85 12.55L13.1 14.4L11.05 14.7L10 16.5L8.95 14.7L6.9 14.4L6.15 12.55L7.45 10.95L7.45 9.05L6.15 7.45L6.9 5.6L8.95 5.3L10 3.5Z" stroke="currentColor" strokeLinejoin="round" />
    </svg>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
