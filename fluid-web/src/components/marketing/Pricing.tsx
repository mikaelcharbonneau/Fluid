"use client";

import Link from "next/link";
import { useMagnetic } from "@/components/interaction/useMagnetic";

function FreeCard() {
  const ref = useMagnetic<HTMLAnchorElement>(0.25);
  return (
    <div className="price-card">
      <div className="pc-head">
        <span className="pc-name">Free</span>
        <div className="pc-price">
          <span className="pc-amt">$0</span>
          <span className="pc-per">forever</span>
        </div>
        <span className="pc-tokens">20 tokens to start</span>
        <p className="pc-tag">Kick the tires and shape your first brand.</p>
      </div>
      <ul className="pc-feats">
        <li>
          <span className="ck">✓</span> The full guided wizard
        </li>
        <li>
          <span className="ck">✓</span> AI names &amp; visual direction
        </li>
        <li>
          <span className="ck">✓</span> 20 one-time tokens
        </li>
      </ul>
      <Link ref={ref} className="btn btn-ghost btn-block" href="/signup">
        <span className="btn-label">Start for free</span>
        <span className="arr">→</span>
      </Link>
    </div>
  );
}

function StarterCard() {
  const ref = useMagnetic<HTMLAnchorElement>(0.25);
  return (
    <div className="price-card">
      <div className="pc-head">
        <span className="pc-name">Starter</span>
        <div className="pc-price">
          <span className="pc-amt">$12</span>
          <span className="pc-per">/ month</span>
        </div>
        <span className="pc-tokens">150 tokens / month</span>
        <p className="pc-tag">For getting a brand off the ground.</p>
      </div>
      <ul className="pc-feats">
        <li>
          <span className="ck">✓</span> 150 tokens refilled monthly
        </li>
        <li>
          <span className="ck">✓</span> Full generation — palette, type, logo &amp; guidelines
        </li>
        <li>
          <span className="ck">✓</span> Export every asset &amp; the brand sheet
        </li>
      </ul>
      <Link ref={ref} className="btn btn-ghost btn-block" href="/signup?plan=starter">
        <span className="btn-label">Get Starter</span>
        <span className="arr">→</span>
      </Link>
    </div>
  );
}

function ProCard() {
  const ref = useMagnetic<HTMLAnchorElement>(0.3);
  return (
    <div className="price-card is-featured">
      <span className="pc-badge">Most popular</span>
      <div className="pc-head">
        <span className="pc-name">Pro</span>
        <div className="pc-price">
          <span className="pc-amt">$36</span>
          <span className="pc-per">/ month</span>
        </div>
        <span className="pc-tokens">500 tokens / month</span>
        <p className="pc-tag">For agencies and frequent builders.</p>
      </div>
      <ul className="pc-feats">
        <li>
          <span className="ck">✓</span> 500 tokens refilled monthly
        </li>
        <li>
          <span className="ck">✓</span> Everything in Starter
        </li>
        <li>
          <span className="ck">✓</span> Priority generation
        </li>
      </ul>
      <Link ref={ref} className="btn btn-block" href="/signup?plan=pro">
        <span className="btn-label">Go Pro</span>
        <span className="arr">→</span>
      </Link>
    </div>
  );
}

export function Pricing() {
  return (
    <section className="reveal-sec pricing" id="pricing">
      <div className="reveal-head sec-head">
        <span className="eyebrow sec-eyebrow">Pricing</span>
        <h2 className="line-mask">
          <span>
            Start free.
            <br />
            Pay by the token.
          </span>
        </h2>
        <p>
          Every account starts with 20 free tokens. Subscribe for a monthly refill — asset generation costs 3
          tokens, smaller AI helpers just 1.
        </p>
      </div>

      <div className="pricing-grid" data-reveal="">
        <FreeCard />
        <StarterCard />
        <ProCard />
      </div>
    </section>
  );
}
