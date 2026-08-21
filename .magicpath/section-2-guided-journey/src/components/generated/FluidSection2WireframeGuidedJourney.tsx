import { useState } from "react";

const steps = [
  { label: "Scope", title: "Choose what you need", note: "Full identity or one focused deliverable." },
  { label: "Brief", title: "Describe the idea", note: "One sentence becomes the working brief." },
  { label: "Direction", title: "Set the visual intent", note: "Select a mood and creative constraints." },
  { label: "Name", title: "Find the right name", note: "Review candidates with reasoning." },
  { label: "Logo", title: "Shape the mark", note: "Compare routes and choose a direction." },
  { label: "Brand kit", title: "Receive the system", note: "Export the complete, coherent identity." },
];

export const FluidSection2WireframeGuidedJourney = () => {
  const [active, setActive] = useState(0);
  const step = steps[active];

  return (
    <section className="wireframe">
      <header className="section-heading">
        <div>
          <p className="eyebrow">Section 02 · How it works · Concept A</p>
          <h1>One guided journey.<br />Six clear decisions.</h1>
        </div>
        <p className="intro">A sequential story that makes the process feel simple, predictable, and easy to trust.</p>
      </header>

      <nav className="stepper" aria-label="Brand creation steps">
        {steps.map((item, index) => (
          <button
            key={item.label}
            className={index === active ? "is-active" : ""}
            onClick={() => setActive(index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>

      <div className="progress" aria-hidden="true">
        <span style={{ width: `${((active + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="experience">
        <article className="explanation">
          <span className="step-number">Step {String(active + 1).padStart(2, "0")}</span>
          <h2>{step.title}</h2>
          <p>{step.note}</p>
          <div className="annotation">
            <span>Purpose</span>
            <p>Explain one action at a time and connect it directly to the value the user receives.</p>
          </div>
          <div className="controls">
            <button disabled={active === 0} onClick={() => setActive(active - 1)}>← Previous</button>
            <button disabled={active === steps.length - 1} onClick={() => setActive(active + 1)}>Next step →</button>
          </div>
        </article>

        <div className="product-frame" aria-label="Product interface wireframe">
          <div className="frame-bar"><i /><i /><i /><span>Interactive product moment</span></div>
          <div className="frame-body">
            <div className="frame-copy">
              <small>Prompt / decision</small>
              <div className="line wide" />
              <div className="line" />
              <div className="line short" />
              <div className="choice-row"><i /><i /><i /></div>
            </div>
            <div className="frame-result">
              <small>Generated result</small>
              <div className="result-grid"><i /><i /><i /><i /></div>
            </div>
          </div>
          <div className="frame-footer"><span>Microcopy or reassurance</span><button>Primary action →</button></div>
        </div>
      </div>
    </section>
  );
};
