import type { CSSProperties } from "react";

const PALETTE = [
  { name: "Teal", hex: "#44D9C7" },
  { name: "Aqua", hex: "#70DADA" },
  { name: "Sky", hex: "#B0D2E6" },
  { name: "Pink", hex: "#FDBBC0" },
  { name: "Coral", hex: "#FD7947" },
  { name: "Orange", hex: "#FD9940" },
  { name: "Amber", hex: "#FDBA50" },
];

function cardStyle(span: number, delayMs: number, rowSpan?: number): CSSProperties {
  return {
    gridColumn: `span ${span}`,
    ...(rowSpan ? { gridRow: `span ${rowSpan}` } : {}),
    "--d": `${delayMs}ms`,
  } as CSSProperties;
}

export function KitReveal() {
  return (
    <section className="reveal-sec" id="kit">
      <div className="reveal-head sec-head">
        <span className="eyebrow sec-eyebrow">What you leave with</span>
        <h2 className="line-mask">
          <span>
            A complete identity,
            <br />
            ready to ship.
          </span>
        </h2>
        <p>
          Not a logo generator. A brand-building system — every asset, generated as one coherent set and exported
          together.
        </p>
      </div>

      <div className="board">
        <div className="bcard" style={cardStyle(4, 0, 2)}>
          <div className="cap">
            <span className="t">Logo</span>
          </div>
          <div className="stage" style={{ display: "grid", placeItems: "center" }}>
            <img src="/assets/uuid/196c5943-6844-4354-8332-20ba6ce9042b.png" alt="" style={{ width: "60%" }} />
          </div>
        </div>
        <div className="bcard" style={cardStyle(8, 90)}>
          <div className="cap">
            <span className="t">Palette</span>
          </div>
          <div className="stage rk-pal">
            {PALETTE.map((c) => (
              <span className="rk-sw" key={c.hex}>
                <span className="rk-dot" style={{ background: c.hex }} />
                <span className="rk-nm">{c.name}</span>
                <span className="rk-hx">{c.hex}</span>
              </span>
            ))}
            <span className="rk-sw">
              <span className="rk-dot rk-ink" style={{ background: "#000" }} />
              <span className="rk-nm">Ink</span>
              <span className="rk-hx">#000000</span>
            </span>
          </div>
        </div>
        <div className="bcard" style={cardStyle(4, 160)}>
          <div className="cap">
            <span className="t">Typography</span>
          </div>
          <div className="stage rk-fonts">
            <span className="rk-frow">
              <span className="rk-glyph" style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>
                Aa
              </span>
              <span className="rk-finfo">
                <b>Metropolis</b>
                <i>Display</i>
              </span>
            </span>
            <span className="rk-frow">
              <span className="rk-glyph" style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>
                Aa
              </span>
              <span className="rk-finfo">
                <b>Inter</b>
                <i>Body &amp; UI</i>
              </span>
            </span>
          </div>
        </div>
        <div className="bcard" style={cardStyle(4, 230)}>
          <div className="cap">
            <span className="t">App icon</span>
          </div>
          <div className="stage" style={{ display: "grid", placeItems: "center", padding: "14px" }}>
            <img
              src="/assets/uuid/017aa8ad-23be-4e06-8f2c-0cea154cf47a.png"
              alt=""
              style={{ height: "100%", maxHeight: "120px", maxWidth: "100%", objectFit: "contain", display: "block" }}
            />
          </div>
        </div>
        <div className="bcard" style={cardStyle(8, 300)}>
          <div className="cap">
            <span className="t">Wordmark</span>
          </div>
          <div className="stage" style={{ display: "grid", placeItems: "center" }}>
            <img src="/assets/uuid/69452e02-b4ea-435d-8b03-dbf9854c7dce.png" alt="" style={{ width: "50%" }} />
          </div>
        </div>
        <div className="bcard" style={cardStyle(4, 370)}>
          <div className="cap">
            <span className="t">Guidelines</span>
          </div>
          <div className="stage rk-guide">
            <span className="rk-gtitle">
              Brand
              <br />
              Guidelines
            </span>
            <span className="rk-grule" />
            <span className="rk-gmeta">PDF · 24pp</span>
          </div>
        </div>
      </div>
    </section>
  );
}
