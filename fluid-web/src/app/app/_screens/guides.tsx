"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { AShell, CHAT } from "../_kit/shell";
import { AEmptyState } from "../_kit/ui";

export const DirA_GuidesScreen = () => {
  return (
    <AShell activeNav="guides" breadcrumb={['Guides']}>
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div className="main-pad" style={{ padding: '44px 56px 64px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>Guides</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 52, letterSpacing: '-0.04em', lineHeight: 1, margin: 0, color: '#000' }}>Brand guidelines.</h1>
          </div>
          <AEmptyState
            title="No guidelines yet"
            body="Fluid writes usage rules for your logo, color, type and voice once your brand is generated. Build a brand to see them here."
            ctaLabel="Create a brand"
            onCta={() => location.assign(CHAT)}
          />
        </div>
      </div>
    </AShell>
  );
};

