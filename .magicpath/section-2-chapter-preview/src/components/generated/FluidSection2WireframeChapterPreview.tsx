import { useState } from "react";

const chapters = [
  ["01", "Start with your idea", "A single sentence anchors the entire system."],
  ["02", "Choose a direction", "Make one high-level creative decision."],
  ["03", "Review the thinking", "See rationale before selecting an output."],
  ["04", "Refine the identity", "Guide the system with focused feedback."],
  ["05", "Export everything", "Leave with a complete, usable brand kit."],
];

export const FluidSection2WireframeChapterPreview = () => {
  const [active, setActive] = useState(0);
  const chapter = chapters[active];

  return (
    <section className="chapter-wireframe">
      <div className="heading">
        <p>Section 02 · How it works · Concept B</p>
        <h1>See the process.<br />Stay in control.</h1>
        <span>Persistent chapter navigation paired with one large, changing product demonstration.</span>
      </div>

      <div className="chapter-layout">
        <aside>
          <div className="aside-label">Process chapters</div>
          {chapters.map((item, index) => (
            <button className={active === index ? "active" : ""} onClick={() => setActive(index)} key={item[0]}>
              <span>{item[0]}</span>
              <div><strong>{item[1]}</strong><small>{item[2]}</small></div>
              <i>→</i>
            </button>
          ))}
        </aside>

        <article className="preview">
          <header>
            <span>Product demonstration</span>
            <div><i /><i /><i /></div>
          </header>
          <div className="preview-body">
            <div className="preview-title">
              <span>Chapter {chapter[0]}</span>
              <h2>{chapter[1]}</h2>
              <p>{chapter[2]}</p>
            </div>
            <div className="ui-shell">
              <div className="ui-top"><span /><span /><button>Action</button></div>
              <div className="ui-grid">
                <div className="ui-panel"><small>Input</small><i /><i /><i /><button>Continue →</button></div>
                <div className="ui-result"><small>Live result</small><div><i /><i /><i /></div></div>
              </div>
            </div>
          </div>
          <footer>
            <span>Interaction: chapter selection updates the preview</span>
            <div>{chapters.map((_, index) => <i className={active === index ? "active" : ""} key={index} />)}</div>
          </footer>
        </article>
      </div>
    </section>
  );
};
