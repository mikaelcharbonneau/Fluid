"use client";

import Link from "next/link";
import { useMagnetic } from "@/components/interaction/useMagnetic";

export function MarketingNav() {
  const ctaRef = useMagnetic<HTMLAnchorElement>(0.35);

  return (
    <nav className="nav">
      <Link className="nav-brand" href="#top" aria-label="Fluid home">
        <img className="fl-wordmark" src="/assets/uuid/97b97e78-4145-428a-9c6f-c0ff3d3cb43d.png" alt="Fluid" />
      </Link>
      <div className="nav-links">
        <a className="nav-link" href="#transform">
          How it works
        </a>
        <a className="nav-link" href="#pricing">
          Pricing
        </a>
        <Link className="nav-link" href="/login">
          Log in
        </Link>
        <Link ref={ctaRef} className="btn btn-sm" href="/signup">
          <span className="btn-label">Try Fluid for free</span>
          <span className="arr">→</span>
        </Link>
      </div>
    </nav>
  );
}
