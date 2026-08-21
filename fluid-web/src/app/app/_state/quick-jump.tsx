"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { CARD_BUTTON_RESET } from "../_kit/a11y";
import { useState } from "../_kit/react";
import { useRouter } from "./router-context";

// Quick-jump pill — minimal in-prototype controller. Lets us land on any
// screen for review without going through the click chain. The router
// drives this; the existing CTAs still work as the primary navigation.
export function QuickJump() {
  const { route, navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const routes = [
    { id: 'home',         label: 'Home' },
    { id: 'chat',         label: 'Brand kit' },
    { id: 'brands',       label: 'Brands' },
    { id: 'brands-empty', label: 'Empty library' },
    { id: 'assets',       label: 'Assets' },
    { id: 'guides',       label: 'Guides' },
    { id: 'settings',     label: 'Settings' },
  ];
  return (
    <>
      <button type="button" className="proto-jump" aria-haspopup="menu" aria-expanded={open}
        aria-label={'Jump to screen (current: ' + route.replace('-', ' ') + ')'}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>
        <span className="dot" />
        <span>{route.replace('-', ' ')}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginLeft: 2, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Jump to screen"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', right: 18, bottom: 56, zIndex: 51,
            background: '#0E0F12', color: '#fff', borderRadius: 14,
            padding: 6, minWidth: 220,
            boxShadow: '0 24px 50px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.06)',
            fontFamily: 'var(--font-body)',
            animation: 'protoIn 240ms var(--ease-out)',
          }}
        >
          {routes.map((r) => {
            const active = r.id === route;
            return (
              <button
                type="button"
                role="menuitem"
                key={r.id}
                aria-current={active ? 'page' : undefined}
                onClick={() => { navigate(r.id); setOpen(false); }}
                style={{
                  ...CARD_BUTTON_RESET,
                  padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 12.5, fontWeight: active ? 700 : 500,
                  color: active ? '#fff' : 'rgba(255,255,255,.72)',
                  background: active ? 'rgba(255,255,255,.10)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span>{r.label}</span>
                {active && (
                  <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--fl-accent)' }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
