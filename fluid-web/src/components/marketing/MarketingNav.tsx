"use client";

import Image from "next/image";
import Link from "next/link";
import { MetalCta } from "./MetalCta";

export function MarketingNav() {

  return (
    <nav className="nav">
      <Link className="nav-brand" href="#top" aria-label="Fluid home">
        <Image className="fl-wordmark" src="/assets/uuid/97b97e78-4145-428a-9c6f-c0ff3d3cb43d.png" alt="Fluid" width={700} height={161} priority />
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
        <MetalCta>
          <Link className="btn btn-sm" href="/signup" data-metal-host="">
            <span className="btn-label">Try Fluid for free</span>
            <span className="arr">→</span>
          </Link>
        </MetalCta>
      </div>
    </nav>
  );
}
