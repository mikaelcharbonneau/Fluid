import Image from "next/image";

export function AuthShowcase({ wordmarkSrc, palette }: { wordmarkSrc: string; palette?: string[] }) {
  return (
    <aside className="auth-showcase" data-dark="">
      <span className="sc-glow" aria-hidden="true" />
      <span className="sc-glow two" aria-hidden="true" />

      <div className="sc-mark">
        <Image className="fl-wordmark" src={wordmarkSrc} alt="Fluid" width={700} height={161} priority />
      </div>

      <div className="sc-body">
        <span className="sc-eyebrow">
          <span className="d" />
          Brand systems, shaped by AI
        </span>
        <h2 className="sc-headline">Everything you need to look like a real brand — in one pass.</h2>
        <ul className="sc-list">
          <li>
            <span className="tick-line" />
            Name, logo &amp; wordmark
          </li>
          <li>
            <span className="tick-line" />
            Palette, type &amp; app icon
          </li>
          <li>
            <span className="tick-line" />
            Guidelines, ready to ship
          </li>
          <li>
            <span className="tick-line" />
            One exportable brand kit
          </li>
        </ul>
      </div>

      <div className="sc-foot">
        <p className="sc-quote">
          &ldquo;We went from a one-line idea to a full identity in an afternoon. <b>Fluid did the work of a studio.</b>&rdquo;
        </p>
        {palette && (
          <div className="sc-pal" aria-hidden="true" style={{ display: "none" }}>
            {palette.map((color) => (
              <span key={color} style={{ background: color }} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
