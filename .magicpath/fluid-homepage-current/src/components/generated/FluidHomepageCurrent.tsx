import { FormEvent, useEffect, useState } from "react";
import fluidNav from "../../../assets/fluid-nav.png";
import fluidGradient from "../../../assets/fluid-gradient.jpg";
import fluidMark from "../../../assets/fluid-mark.png";
import fluidAppIcon from "../../../assets/fluid-app-icon.png";
import fluidWordmark from "../../../assets/fluid-wordmark.png";
import mosaic1 from "../../../assets/mosaic-1.jpg";
import mosaic2 from "../../../assets/mosaic-2.jpg";
import mosaic3 from "../../../assets/mosaic-3.jpg";
import serviceName from "../../../assets/service-name.jpg";
import serviceLogo from "../../../assets/service-logo.jpg";
import serviceGraphics from "../../../assets/service-graphics.jpg";
import serviceGuidelines from "../../../assets/service-guidelines.jpg";

const chapters = [
  { tab: "Scope", eyebrow: "01 · Choose a service", title: "Pick your scope.", description: "Start with complete branding, or just the piece you need — name, logo, graphics or guidelines." },
  { tab: "Brief", eyebrow: "02 · Your idea", title: "Describe the thing.", description: "One sentence about what you're building and who it's for. That's the whole brief — Fluid does the rest." },
  { tab: "Direction", eyebrow: "03 · Visual direction", title: "Set the mood.", description: "Pick a direction — minimal, futuristic, playful, luxury or organic. It steers every asset downstream." },
  { tab: "Name", eyebrow: "04 · Name", title: "Name it.", description: "Generated name candidates, scored and rendered as wordmarks. The strongest one rises to the top." },
  { tab: "Logo", eyebrow: "05 · Logo", title: "Draw the mark.", description: "The chosen name becomes a logo mark with construction grid, clear-space and lockups." },
  { tab: "Brand kit", eyebrow: "06 · Brand system", title: "Lock the system.", description: "Logo, palette, type, app icon, wordmark and guidelines assemble into one exportable brand kit." },
];

const palette = [
  ["Teal", "#44D9C7"], ["Aqua", "#70DADA"], ["Sky", "#B0D2E6"], ["Pink", "#FDBBC0"],
  ["Coral", "#FD7947"], ["Orange", "#FD9940"], ["Amber", "#FDBA50"], ["Ink", "#000000"],
];

function Prompt({ final = false }: { final?: boolean }) {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    setSent(true);
  }
  return (
    <form className={`prompt ${final ? "prompt-final" : ""}`} onSubmit={submit}>
      <label className="sr-only">Describe your idea in one sentence</label>
      <input value={value} onChange={(event) => { setValue(event.target.value); setSent(false); }} placeholder={sent ? "Your idea is ready to continue" : "A productivity tool for founders who run on rituals…"} />
      <button type="submit"><span>{final ? "Generate" : "Start free"}</span><b>→</b></button>
    </form>
  );
}

function ScopeStage() {
  const services = [
    ["Name", "Generated names with reasoning and domain status.", serviceName],
    ["Logo", "Marks, lockups & construction in seconds.", serviceLogo],
    ["Graphics", "Patterns, icons & social-ready visuals.", serviceGraphics],
    ["Guidelines", "Already have a logo? We'll write the rules.", serviceGuidelines],
  ];
  return (
    <div className="scope-stage">
      <article className="scope-main">
        <div className="scope-copy"><small><i />Recommended</small><strong>Complete Branding</strong><p>Strategy, naming, logo, palette, type &amp; guidelines — generated as one cohesive system.</p><em>7 assets · one identity</em></div>
        <div className="mosaic">{[mosaic1, mosaic2, mosaic3, mosaic2, mosaic3, mosaic1].map((src, index) => <img src={src} key={index} />)}</div>
      </article>
      <div className="scope-side">
        {services.map(([title, description, image]) => <article key={title}><img src={image} /><span><strong>{title}</strong><small>{description}</small></span></article>)}
      </div>
    </div>
  );
}

function ChapterStage({ active }: { active: number }) {
  if (active === 0) return <ScopeStage />;
  if (active === 1) return <div className="brief-stage"><small><i />Complete Branding</small><div>A branding agency powered by AI agents</div><button>Next <span>→</span></button></div>;
  if (active === 2) return <div className="mood-stage">{["Minimal", "Futuristic", "Playful", "Luxury", "Organic"].map((mood, index) => <button className={index === 4 ? "selected" : ""} key={mood}><span className={`mood-art mood-${index}`} />{mood}</button>)}</div>;
  if (active === 3) return <div className="names-stage">{["Nomos", "Lumen", "Aria", "Halo", "Forge", "Fluid"].map((name, index) => <span className={index === 5 ? "winner" : ""} key={name}>{name}</span>)}</div>;
  if (active === 4) return <div className="logos-stage">{[0, 1, 2, 3, 4, 5].map((index) => <span className={index === 5 ? "chosen" : ""} key={index}><b>f</b><i /></span>)}</div>;
  return <div className="mini-kit"><article className="mk-logo"><small>Logo</small><img src={fluidMark} /></article><article className="mk-palette"><small>Palette</small><div>{palette.map(([name, hex]) => <span key={name} style={{ background: hex }} />)}</div></article><article><small>Typography</small><strong>Aa</strong><p>Metropolis · Inter</p></article><article><small>App icon</small><img src={fluidAppIcon} /></article></div>;
}

function PriceCard({ name, price, tokens, tagline, features, featured = false }: { name: string; price: string; tokens: string; tagline: string; features: string[]; featured?: boolean }) {
  return (
    <article className={`price-card ${featured ? "featured" : ""}`}>
      {featured && <span className="popular">Most popular</span>}<small className="plan">{name}</small>
      <div className="price"><strong>{price}</strong><span>{price === "$0" ? "forever" : "/ month"}</span></div><b className="tokens">{tokens}</b><p>{tagline}</p>
      <ul>{features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
      <button>{name === "Free" ? "Start for free" : name === "Starter" ? "Get Starter" : "Go Pro"}<span>→</span></button>
    </article>
  );
}

export const FluidHomepageCurrent = () => {
  const [active, setActive] = useState(0);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const update = () => setStuck(window.scrollY > 32);
    update(); window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <main className="fluid-page">
      <nav className={`top-nav ${stuck ? "stuck" : ""}`}><a href="#top" aria-label="Fluid home"><img src={fluidNav} /></a><div><a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#">Log in</a><button>Try Fluid for free <span>→</span></button></div></nav>
      <header className="hero" id="top">
        <div className="hero-field" style={{ backgroundImage: `url(${fluidGradient})` }} /><div className="hero-orb orb-a" /><div className="hero-orb orb-b" /><div className="hero-orb orb-c" /><div className="hero-scrim" /><div className="hero-grain" />
        <div className="hero-lockup"><span className="hero-eyebrow"><i />Brand systems, shaped by AI</span><h1>From idea<br />to identity<span>.</span></h1><p>One sentence in. Strategy, name, logo, palette, type and guidelines out — generated as one system.</p><div className="hero-cta"><Prompt /><small>Free to start — 20 tokens, no card. <a href="#pricing">See pricing</a> or <a href="#how">watch how it works</a>.</small></div></div>
        <div className="scroll-cue"><span /><small>Scroll</small></div>
      </header>
      <section className="story" id="how"><div className="story-inner"><div className="section-title dark-title"><span>How it works</span><h2>One sentence in. A whole identity out.</h2></div><div className="tabs" role="tablist">{chapters.map((chapter, index) => <button className={index === active ? "active" : ""} onClick={() => setActive(index)} key={chapter.tab} role="tab" aria-selected={index === active}><small>{String(index + 1).padStart(2, "0")}</small>{chapter.tab}</button>)}</div><div className="story-panel"><div className="story-copy"><small>{chapters[active].eyebrow}</small><h3>{chapters[active].title}</h3><p>{chapters[active].description}</p></div><div className="story-stage"><ChapterStage active={active} /></div></div></div></section>
      <section className="kit-section"><div className="section-title"><span>What you leave with</span><h2>A complete identity,<br />ready to ship.</h2><p>Not a logo generator. A brand-building system — every asset, generated as one coherent set and exported together.</p></div><div className="brand-board"><article className="board-logo"><small>Logo</small><div><img src={fluidMark} /></div></article><article className="board-palette"><small>Palette</small><div className="palette-row">{palette.map(([name, hex]) => <span key={name}><i style={{ background: hex }} /><b>{name}</b><em>{hex}</em></span>)}</div></article><article className="board-type"><small>Typography</small><div><span><b>Aa</b><i>Metropolis<em>Display</em></i></span><span><b>Aa</b><i>Inter<em>Body &amp; UI</em></i></span></div></article><article className="board-icon"><small>App icon</small><div><img src={fluidAppIcon} /></div></article><article className="board-word"><small>Wordmark</small><div><img src={fluidWordmark} /></div></article><article className="board-guide"><small>Guidelines</small><div><b>Brand<br />Guidelines</b><i /><em>PDF · 24pp</em></div></article></div></section>
      <section className="pricing-section" id="pricing"><div className="section-title"><span>Pricing</span><h2>Start free.<br />Pay by the token.</h2><p>Every account starts with 20 free tokens. Subscribe for a monthly refill — asset generation costs 3 tokens, smaller AI helpers just 1.</p></div><div className="pricing-grid"><PriceCard name="Free" price="$0" tokens="20 tokens to start" tagline="Kick the tires and shape your first brand." features={["The full guided wizard", "AI names & visual direction", "20 one-time tokens"]} /><PriceCard name="Starter" price="$12" tokens="150 tokens / month" tagline="For getting a brand off the ground." features={["150 tokens refilled monthly", "Full generation — palette, type, logo & guidelines", "Export every asset & the brand sheet"]} /><PriceCard featured name="Pro" price="$36" tokens="500 tokens / month" tagline="For agencies and frequent builders." features={["500 tokens refilled monthly", "Everything in Starter", "Priority generation"]} /></div></section>
      <section className="final-section"><div className="ribbon" /><div className="final-inner"><h2>Start with<br />a <span>thought.</span></h2><p>Leave with a brand. Type one sentence and watch the system assemble.</p><Prompt final /></div></section>
      <footer><img src={fluidWordmark} /><div><a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#">Terms</a><a href="#">Privacy</a><a href="#top">Start</a></div></footer>
    </main>
  );
};
