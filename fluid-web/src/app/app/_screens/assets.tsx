"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { AShell, CHAT } from "../_kit/shell";
import { AEmptyState } from "../_kit/ui";

// Assets & Guides have no real content until brand generation (Phase 3), so
// new accounts see honest empty states rather than demo-brand material.
export const DirA_AssetsScreen = () => {
  return (
    <AShell activeNav="assets" breadcrumb={['Assets']}>
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div className="main-pad" style={{ padding: '44px 56px 64px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>Assets</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 52, letterSpacing: '-0.04em', lineHeight: 1, margin: 0, color: '#000' }}>Your assets.</h1>
          </div>
          <AEmptyState
            title="No assets yet"
            body="Logos, wordmarks, app icons and exports show up here once you build a brand. Create one to get started."
            ctaLabel="Create a brand"
            onCta={() => location.assign(CHAT)}
          />
        </div>
      </div>
    </AShell>
  );
};

