#!/bin/bash
# emits the shared <helmet> style block (tokens + Metropolis) for every artboard
B64=$(cat metropolis.b64)
cat <<EOF
    @font-face {
      font-family: "Metropolis";
      src: url("data:font/otf;base64,${B64}") format("opentype");
      font-weight: 100 900; font-style: normal; font-display: swap;
    }
    :root {
      --fluid-teal: #44D9C7; --fluid-aqua: #70DADA; --fluid-sky: #B0D2E6;
      --fluid-pink: #FDBBC0; --fluid-coral: #FD7947; --fluid-orange: #FD9940;
      --fluid-amber: #FDBA50;
      --bg: #FAFAFB; --bg-elev: #FFFFFF; --bg-sunken: #F0F0F2; --bg-tint: #F5F5F6;
      --line: rgba(0,0,0,0.10); --line-strong: rgba(0,0,0,0.18);
      --fg-1: #000; --fg-2: rgba(0,0,0,0.72); --fg-3: rgba(0,0,0,0.62); --fg-4: rgba(0,0,0,0.55);
      --r-sm: 10px; --r-md: 14px; --r-lg: 20px; --r-xl: 28px; --r-pill: 999px;
      --font-display: "Metropolis", "Inter", system-ui, sans-serif;
      --font-body: "Metropolis", "Inter", system-ui, sans-serif;
      --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
      --shadow-md: 0 6px 18px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
      --shadow-lg: 0 18px 40px rgba(0,0,0,0.10), 0 4px 10px rgba(0,0,0,0.04);
      --ease-out: cubic-bezier(0.22,0.61,0.36,1);
    }
    body { margin: 0; font-family: var(--font-body); letter-spacing: -0.005em; }
    a { color: var(--fluid-coral); }
    a:hover { color: #E0602F; }
    .wf-label {
      font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.04em;
      text-transform: uppercase;
    }
EOF
