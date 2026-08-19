// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";

// Two source files declare the bare `const { useState } = React` (and the
// bootstrap adds useEffect); in a single shared scope those collide, so we
// hoist them here once and strip the bare redeclarations below. The other
// screens use aliased destructures (useAState, useBAState, ...) which are
// left untouched.
export const { useState, useEffect } = React;

// ------------------------------------------------------------------
// 10-router
// ------------------------------------------------------------------
// =====================================================================
// Fluid Prototype Router
//
// Threads every existing screen (Home · Brands · Assets · Guides ·
// Settings · the 5-step brand-creation wizard · the finalised Kit) into
// one interactive prototype.
//
// Strategy: every existing screen JSX is reused verbatim. Navigation is
// wired through a single global click delegate that interprets:
//   • Left-rail icon clicks  → root sections
//   • Top-dock wordmark      → Home
//   • Header breadcrumbs     → parent route
//   • Wizard dock buttons    → Continue / Back
//   • Known CTA copy         → matching destination
//   • Any [data-route]       → explicit override
// This avoids rewriting any of the existing screens.
// =====================================================================

export const PR: any = {};

PR.useState = React.useState;

PR.useEffect = React.useEffect;

PR.useCallback = React.useCallback;

PR.createContext = React.createContext;

PR.useContext = React.useContext;
