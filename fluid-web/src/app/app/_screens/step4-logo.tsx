"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { EMBEDDED_LOGO_ROUTES, LogoFlowContext } from "../_kit/logo-flow";
import { AWizardLayout } from "../_kit/wizard";
import { DirA_LogoDirection } from "./logo-direction";
import { DirA_LogoExport } from "./logo-export";
import { DirA_LogoReferences } from "./logo-references";
import { DirA_LogoRefine } from "./logo-refine";
import { DirA_LogoSketches } from "./logo-sketches";
import { DirA_LogoType } from "./logo-type";
import { useBrandDraft } from "../_state/brand-draft-context";
import { useRouter } from "../_state/router-context";

// Brand wizard · Step 3 · Logo.
//
// The same studio the standalone flow runs, as sub-steps of one wizard step.
// Not a reimplementation: these are the very screens from that flow, rendered
// through LogoStepShell with LogoFlowContext supplied, so a fix to the board or
// the refinement brief lands in both places at once.
//
// The studio's own brief screen is skipped. The wizard already asked for the
// name, the description, the audience and the competitors, and the one thing it
// genuinely still needs to ask — which style world the MARK lives in, a
// different question from the brand's visual style — is the first sub-step.
const EMBEDDED_LOGO_SCREENS = {
  'logo-direction': DirA_LogoDirection,
  'logo-type': DirA_LogoType,
  'logo-references': DirA_LogoReferences,
  'logo-sketches': DirA_LogoSketches,
  'logo-refine': DirA_LogoRefine,
  'logo-export': DirA_LogoExport,
};

// Where to drop someone back into the studio, read off what the brand already
// has. Resuming at the start when a board is already drawn would look
// like the work had been lost.
function resumeLogoPhase(data: any) {
  const d = data || {};
  if ((d.logo_finalists || []).length) return 'logo-export';
  if ((d.logo_board || []).length) return 'logo-sketches';
  if ((d.logo_types || []).length || d.logo_type_mode) return 'logo-references';
  if (d.logo_direction) return 'logo-type';
  return 'logo-direction';
}

export const DirA_Step4_Logo = () => {
  const { draft } = useBrandDraft();
  const { navigate } = useRouter();
  const data = (draft && draft.data) || {};

  const [phase, setPhase] = React.useState(() => resumeLogoPhase(data));
  const index = Math.max(0, EMBEDDED_LOGO_ROUTES.indexOf(phase));
  const stepNo = index + 2; // sub-step 1 is LOGO_STEPS[1], 'Style'
  const [furthest, setFurthest] = React.useState(stepNo);

  // The active screen hands its header and dock up here. Handlers live in a ref
  // and only the text lives in state: a screen re-renders with fresh inline
  // callbacks constantly, and storing those in state would set state on every
  // render of the child, which is a render loop with extra steps.
  const handlers = React.useRef<any>({});
  const [chrome, setChrome] = React.useState<any>({});
  const publishChrome = React.useCallback((next: any) => {
    handlers.current = next;
    setChrome((prev: any) => (
      prev.title === next.title
      && prev.subtitle === next.subtitle
      && prev.dockCopy === next.dockCopy
      && prev.nextLabel === next.nextLabel
      && prev.nextDisabled === next.nextDisabled
        ? prev
        : {
            title: next.title,
            subtitle: next.subtitle,
            dockCopy: next.dockCopy,
            nextLabel: next.nextLabel,
            nextDisabled: next.nextDisabled,
          }
    ));
  }, []);

  const goPhase = React.useCallback((next: any) => {
    setPhase(next);
    const n = EMBEDDED_LOGO_ROUTES.indexOf(next) + 2;
    setFurthest((f) => Math.max(f, n));
  }, []);

  const goToStep = React.useCallback((n: any) => {
    goPhase(EMBEDDED_LOGO_ROUTES[n - 2]);
  }, [goPhase]);

  const flow = React.useMemo(
    () => ({ setPhase: goPhase, setChrome: publishChrome, goToStep, furthest }),
    [goPhase, publishChrome, goToStep, furthest],
  );

  const Screen = (EMBEDDED_LOGO_SCREENS as any)[phase] || DirA_LogoDirection;

  // Back out of the first sub-step lands on step 2, not on the studio's own
  // brief screen — which this flow skipped, and which would strand the client
  // in the standalone flow if they reached it.
  const onBack = index === 0
    ? () => navigate('step2')
    : () => handlers.current.onBack && handlers.current.onBack();

  return (
    <AWizardLayout
      step={3}
      title={chrome.title || 'Design the logo.'}
      subtitle={chrome.subtitle}
      status="Draft"
      progress="Step 3 of 5"
      dockCopy={chrome.dockCopy}
      nextLabel={chrome.nextLabel || 'Continue'}
      nextDisabled={!!chrome.nextDisabled}
      onBack={onBack}
      onNext={() => handlers.current.onNext && handlers.current.onNext()}
    >
      <LogoFlowContext.Provider value={flow}>
        <Screen />
      </LogoFlowContext.Provider>
    </AWizardLayout>
  );
};

