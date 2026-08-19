const SERVICE_MOSAIC = [
  [
    "/assets/uuid/de41faa1-d8a8-4614-be87-fe2631f8cd57.jpg",
    "/assets/uuid/0fbbf969-da88-4af8-a6f5-ab46453c25e8.jpg",
    "/assets/uuid/b9f88c5a-1d0e-4b32-9641-b701bd163c6a.jpg",
  ],
  [
    "/assets/uuid/3cdcedb3-90ab-45f4-abb4-d7db48e05495.jpg",
    "/assets/uuid/448302bd-aab5-4064-9e9b-97df99c425cc.jpg",
    "/assets/uuid/4b838918-49da-4be4-8f74-7f99706ea2a8.jpg",
  ],
  [
    "/assets/uuid/20336473-0d9c-4edd-a918-eb56cae4b66c.jpg",
    "/assets/uuid/68a0e21c-787a-48ba-b002-28d2e666067d.jpg",
    "/assets/uuid/000d1af3-15d2-4f38-8fa8-890852c082e6.jpg",
  ],
];

const SIDE_SERVICES = [
  { title: "Name", desc: "Generated names with reasoning and domain status.", preview: "/assets/uuid/016471e6-dfca-411f-a978-17c49f028a3e.jpg" },
  { title: "Logo", desc: "Marks, lockups & construction in seconds.", preview: "/assets/uuid/fd3dd2dc-8a9e-464a-a26d-6d53f83380b0.jpg" },
  { title: "Graphics", desc: "Patterns, icons & social-ready visuals.", preview: "/assets/uuid/3cdcedb3-90ab-45f4-abb4-d7db48e05495.jpg" },
  { title: "Guidelines", desc: "Already have a logo? We'll write the rules.", preview: "/assets/uuid/2b237735-7a60-426c-a3eb-b5a18cd21d09.jpg" },
];

const MOODS = [
  { name: "Minimal", img: "/assets/uuid/de5eccff-fb6a-44cc-8098-f86da74c1546.jpg" },
  { name: "Futuristic", img: "/assets/uuid/ec4af0ed-074e-49e9-895e-b1ca3fbb4354.jpg" },
  { name: "Playful", img: "/assets/uuid/4607f3ad-b492-4e6e-ac1f-2bc5380ffe0b.jpg" },
  { name: "Luxury", img: "/assets/uuid/37409f65-16ae-4427-9995-1740ed736aaa.jpg" },
  { name: "Organic", img: "/assets/uuid/a230b6ed-aebf-4b2f-958e-f808034f8504.jpg" },
];

const NAMES = ["Nomos", "Lumen", "Aria", "Halo", "Forge", "Fluid"];

const LOGO_SKETCHES = [
  "/assets/uuid/2ea12fcf-f290-4475-b73a-dc071baac09f.jpg",
  "/assets/uuid/a13ee40d-9150-42e4-beeb-26438798bb1b.jpg",
  "/assets/uuid/eb2f93a3-e7da-4a6f-8f89-c76e7cb09496.jpg",
  "/assets/uuid/1d95318d-b82f-4a88-b0e6-1e1e8a474337.jpg",
  "/assets/uuid/c8cbc0af-64d5-4286-95b9-18a15838601e.jpg",
  "/assets/uuid/5bba058f-a503-47b0-9802-af53915a43ad.jpg",
];

const PALETTE = [
  { name: "Teal", hex: "#44D9C7" },
  { name: "Aqua", hex: "#70DADA" },
  { name: "Sky", hex: "#B0D2E6" },
  { name: "Pink", hex: "#FDBBC0" },
  { name: "Coral", hex: "#FD7947" },
  { name: "Orange", hex: "#FD9940" },
  { name: "Amber", hex: "#FDBA50" },
];

// This is the 1500vh scroll-jacking "brand-flow" section #178 will replace
// with a redesigned, non-scroll-jacking implementation. It's ported as-is
// here (structure driven imperatively by useMarketingEngine, no React state)
// so #177 doesn't duplicate that redesign work ahead of time.
export function BrandFlow() {
  return (
    <section className="transform" id="transform" data-dark="" data-screen-label="brand-flow">
      <div className="transform-track" style={{ height: "1500vh" }}>
        <div className="pin">
          <div className="tf-progress" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <span className="seg" key={i}>
                <i />
              </span>
            ))}
          </div>
          <div className="tf-layout">
            <div className="tf-caption">
              <span className="tf-eyebrow">01 · Choose a service</span>
              <h3 className="tf-title">Pick your scope.</h3>
              <p className="tf-desc">
                Start with complete branding, or just the piece you need — name, logo, graphics or guidelines.
              </p>
            </div>

            <div className="tf-stage">
              <div className="tf-canvas">
                {/* STEP 1 — service selection */}
                <div className="bf-step" data-step="select">
                  <div className="bf-stepwrap">
                    <div className="bf-services">
                      <button className="svc svc-main" type="button" data-svc="0">
                        <span className="svc-check" aria-hidden="true">
                          ✓
                        </span>
                        <span className="svc-main-info">
                          <span className="svc-kicker">
                            <span className="d" />
                            Recommended
                          </span>
                          <span className="svc-title">Complete Branding</span>
                          <span className="svc-desc">
                            Strategy, naming, logo, palette, type &amp; guidelines — generated as one cohesive
                            system.
                          </span>
                          <span className="svc-foot">7 assets · one identity</span>
                        </span>
                        <span className="svc-mosaic" aria-hidden="true">
                          {SERVICE_MOSAIC.map((col, ci) => (
                            <span className="mcol" key={ci}>
                              {col.map((src) => (
                                <span className="m" key={src} style={{ backgroundImage: `url("${src}")` }} />
                              ))}
                            </span>
                          ))}
                        </span>
                      </button>
                      <div className="bf-services-side">
                        {SIDE_SERVICES.map((svc, i) => (
                          <button className="svc" type="button" data-svc={i + 1} key={svc.title}>
                            <span
                              className="svc-preview"
                              style={{ backgroundImage: `url("${svc.preview}")` }}
                              aria-hidden="true"
                            />
                            <span className="svc-text">
                              <span className="svc-title">{svc.title}</span>
                              <span className="svc-sdesc">{svc.desc}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 2 — idea input */}
                <div className="bf-step" data-step="input">
                  <div className="bf-form">
                    <span className="bf-form-kicker">
                      <span className="d" />
                      Complete Branding
                    </span>
                    <div className="bf-field">
                      <span className="bf-typed" />
                      <span className="bf-caret" aria-hidden="true" />
                    </div>
                    <button className="bf-next" type="button">
                      <span>Next</span>
                      <span className="arr">→</span>
                    </button>
                  </div>
                </div>

                {/* STEP 3 — visual direction */}
                <div className="bf-step" data-step="direction">
                  <div className="bf-dir">
                    <div className="bf-dir-stage">
                      <div className="bf-dir-view">
                        <div className="bf-moods">
                          {MOODS.map((mood, i) => (
                            <div className="mood" data-mood={i} key={mood.name}>
                              <div className="mood-img" style={{ backgroundImage: `url("${mood.img}")` }} />
                              <span className="mood-name">{mood.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button className="bf-dir-arrow" type="button" data-dir="next" aria-label="See more directions">
                        <span className="arr">→</span>
                      </button>
                    </div>
                    <div className="bf-dir-label">
                      <span className="cap">Selected direction</span>
                      <span className="val">Minimal</span>
                    </div>
                  </div>
                </div>

                {/* STEP 4 — name creation */}
                <div className="bf-step" data-step="name">
                  <div className="bf-stepwrap">
                    <div className="bf-names">
                      {NAMES.map((name, i) => (
                        <div className={`bf-name${i === 5 ? " win" : ""}`} data-n={i} key={name}>
                          <span>{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bf-name-final" aria-hidden="true">
                    <span className="big">
                      Fluid<i className="dot">.</i>
                    </span>
                  </div>
                </div>

                {/* STEP 5 — logo creation */}
                <div className="bf-step" data-step="logo">
                  <div className="bf-stepwrap">
                    <div className="bf-logo-explore">
                      {LOGO_SKETCHES.map((src, i) => (
                        <div className={`lx sketch${i === 5 ? " chosen" : ""}`} data-lx={i} key={src}>
                          <img src={src} alt="" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* STEP 6 — brand delivery */}
                <div className="bf-step" data-step="delivery">
                  <div className="bf-kit">
                    <div className="kc" data-k="0" style={{ gridColumn: "span 4", gridRow: "span 2" }}>
                      <span className="kc-cap">Logo</span>
                      <div className="kc-body">
                        <img src="/assets/uuid/196c5943-6844-4354-8332-20ba6ce9042b.png" alt="" style={{ width: "64%" }} />
                      </div>
                    </div>
                    <div className="kc" data-k="1" style={{ gridColumn: "span 8" }}>
                      <span className="kc-cap">Palette</span>
                      <div className="kc-body pal">
                        {PALETTE.map((c) => (
                          <div className="sw" key={c.hex}>
                            <span className="dot" style={{ background: c.hex }} />
                            <span className="nm">{c.name}</span>
                            <span className="hx">{c.hex}</span>
                          </div>
                        ))}
                        <div className="sw">
                          <span className="dot ink" style={{ background: "#000" }} />
                          <span className="nm">Ink</span>
                          <span className="hx">#000000</span>
                        </div>
                      </div>
                    </div>
                    <div className="kc" data-k="2" style={{ gridColumn: "span 4" }}>
                      <span className="kc-cap">Typography</span>
                      <div className="kc-body fonts">
                        <div className="frow">
                          <span className="fglyph" style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>
                            Aa
                          </span>
                          <span className="finfo">
                            <b>Metropolis</b>
                            <i>Display</i>
                          </span>
                        </div>
                        <div className="frow">
                          <span className="fglyph" style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>
                            Aa
                          </span>
                          <span className="finfo">
                            <b>Inter</b>
                            <i>Body &amp; UI</i>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="kc" data-k="3" style={{ gridColumn: "span 4" }}>
                      <span className="kc-cap">App icon</span>
                      <div className="kc-body iconwrap">
                        <img src="/assets/uuid/017aa8ad-23be-4e06-8f2c-0cea154cf47a.png" alt="" />
                      </div>
                    </div>
                    <div className="kc" data-k="4" style={{ gridColumn: "span 8" }}>
                      <span className="kc-cap">Wordmark</span>
                      <div className="kc-body">
                        <img src="/assets/uuid/ff314af0-d60a-45f5-9c32-660e75675988.png" alt="" style={{ width: "62%" }} />
                      </div>
                    </div>
                    <div className="kc" data-k="5" style={{ gridColumn: "span 4" }}>
                      <span className="kc-cap">Guidelines</span>
                      <div className="kc-body guide">
                        <span className="gtitle">
                          Brand
                          <br />
                          Guidelines
                        </span>
                        <span className="grule" />
                        <span className="gmeta">PDF · 24pp</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* premium interaction indicator */}
                <div className="bf-orb" aria-hidden="true">
                  <span className="bf-pulse" />
                  <span className="bf-ring" />
                  <span className="bf-core" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
