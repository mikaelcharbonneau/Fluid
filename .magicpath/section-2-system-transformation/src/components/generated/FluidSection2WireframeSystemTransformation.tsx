import { useState } from "react";

const stages = ["Your thought", "Agent system", "Brand identity"];

export const FluidSection2WireframeSystemTransformation = () => {
  const [active, setActive] = useState(0);

  const advance = () => setActive((active + 1) % stages.length);

  return (
    <section className="system-wireframe">
      <header>
        <div>
          <p>Section 02 · How it works · Concept C</p>
          <h1>One thought enters.<br />A complete system leaves.</h1>
        </div>
        <div className="header-note">
          <span>Story model</span>
          <p>A transformation diagram explains Fluid as an orchestrated system rather than a collection of tools.</p>
        </div>
      </header>

      <div className="pipeline">
        <article className={active === 0 ? "active" : ""} onClick={() => setActive(0)}>
          <div className="stage-head"><span>01</span><strong>Your thought</strong></div>
          <div className="thought-box">
            <small>One-sentence input</small>
            <i /><i /><i />
            <button>Submit idea →</button>
          </div>
          <p>Start with the business, audience, or ambition in plain language.</p>
        </article>

        <div className="connector"><span>→</span><small>Fluid orchestrates</small></div>

        <article className={active === 1 ? "active" : ""} onClick={() => setActive(1)}>
          <div className="stage-head"><span>02</span><strong>Agent system</strong></div>
          <div className="agent-map">
            <b>Director</b>
            {["Strategy", "Naming", "Design", "Production"].map(label => <i key={label}>{label}</i>)}
          </div>
          <p>Specialist agents work in sequence while a director keeps every decision coherent.</p>
        </article>

        <div className="connector"><span>→</span><small>System assembles</small></div>

        <article className={active === 2 ? "active" : ""} onClick={() => setActive(2)}>
          <div className="stage-head"><span>03</span><strong>Brand identity</strong></div>
          <div className="output-grid">
            {["Name", "Logo", "Palette", "Type", "Graphics", "Guidelines"].map(label => <i key={label}><b /><span>{label}</span></i>)}
          </div>
          <p>Every output arrives as one connected, export-ready identity system.</p>
        </article>
      </div>

      <footer>
        <div className="proof">
          <span>1</span><p>simple brief</p><i />
          <span>4</span><p>coordinated agents</p><i />
          <span>6+</span><p>connected outputs</p>
        </div>
        <button onClick={advance}>Play transformation · {stages[active]} →</button>
      </footer>
    </section>
  );
};
