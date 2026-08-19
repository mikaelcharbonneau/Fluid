"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { MAX_VERSION_COLORS } from "@/lib/logo-refine";
import { logoReferencesFor } from "@/lib/logo-references";
import { ADockActivity, useActivityLog } from "./activity";
import { __assets } from "./assets";
import { AShell } from "./shell";
import { ArrowRight, Chip, Sparkle, Thinking } from "./ui";
import { useRouter } from "../_state/router-context";

// =====================================================================
// Standalone logo studio · Step 1 · Brief
// Identity context only. Visual references, constraints, and usage/export
// decisions belong to later steps in the logo workflow.
// =====================================================================

// Reference-browsing and concept-drawing are separate steps, so the reference
// gallery is no longer labelled "Concepts". Total is derived from this list —
// the header used to hard-code "of 5".
const LOGO_STEPS = ['Brief', 'Style', 'Type', 'References', 'Concepts', 'Refine', 'Export'];

// The logo studio runs in two places: on its own, as a seven-step flow with its
// own chrome, and inside step 4 of the brand wizard, where the same screens are
// sub-steps of a bigger job. Rather than keep two implementations in step,
// every screen renders through LogoStepShell and navigates through
// useLogoFlowNav — and this context is what tells them which world they are in.
//
// Null means standalone. Embedded supplies the phase machinery instead.
export const LogoFlowContext = React.createContext<any>(null);

// The route each studio screen owns, in order. The embedded flow drops 'Brief':
// the wizard already asked for the name, the description, the audience and the
// competitors, and asking again is how a long form starts feeling like a form.
const LOGO_ROUTES = [
  'logo-brief', 'logo-direction', 'logo-type',
  'logo-references', 'logo-sketches', 'logo-refine', 'logo-export',
];

export const EMBEDDED_LOGO_ROUTES = LOGO_ROUTES.filter((r) => r !== 'logo-brief');

/**
 * Move between studio screens without caring which flow is running.
 *
 * Standalone screens change route; embedded ones change phase. Passing a route
 * name the embedded flow doesn't have — 'logo-brief', or the wizard steps
 * either side of it — falls through to real navigation, which is what makes
 * "back" from the first sub-step land on step 3.
 */
export const useLogoFlowNav = () => {
  const { navigate } = useRouter();
  const embed = React.useContext(LogoFlowContext);
  return React.useCallback((target: any) => {
    if (embed && EMBEDDED_LOGO_ROUTES.includes(target)) embed.setPhase(target);
    else navigate(target);
  }, [embed, navigate]);
};

/**
 * The chrome around one studio screen.
 *
 * Standalone, it is the full-page logo wizard. Embedded, the page already
 * belongs to the brand wizard — so this renders the heading and the sub-step
 * rail inline, and hands its dock (label, copy, disabled, handlers) up to the
 * parent, which owns the only dock on screen. Two docks would be two answers to
 * the same question.
 */
export const LogoStepShell = ({
  children, step, title, subtitle, dockCopy,
  nextLabel, onNext, onBack, nextDisabled,
}: any) => {
  const embed = React.useContext(LogoFlowContext);

  // Embedded, the parent owns the page header and the dock, so it needs what
  // this screen would have put in them. An effect rather than a render-time
  // call: setting parent state while the child renders is the classic warning.
  React.useEffect(() => {
    if (!embed) return;
    embed.setChrome({ title, subtitle, dockCopy, nextLabel, onNext, onBack, nextDisabled });
  }, [embed, title, subtitle, dockCopy, nextLabel, onNext, onBack, nextDisabled]);

  if (!embed) {
    return (
      <ALogoWizardLayout
        step={step} title={title} subtitle={subtitle} dockCopy={dockCopy}
        nextLabel={nextLabel} onNext={onNext} onBack={onBack} nextDisabled={nextDisabled}
      >
        {children}
      </ALogoWizardLayout>
    );
  }

  // No heading here: the wizard header above is already showing this screen's
  // title, and repeating it would read as two different questions.
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <ALogoSubProgress activeStep={step} onPick={embed.goToStep} furthest={embed.furthest} />
      {children}
    </div>
  );
};

// The sub-step rail shown inside wizard step 4. Steps already visited are
// clickable so a client can go back and change a choice without walking the
// whole flow forward again.
const ALogoSubProgress = ({ activeStep, onPick, furthest = 1 }: any) => {
  const labels = LOGO_STEPS.slice(1); // 'Brief' belongs to the standalone flow
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}
      aria-label="Logo progress">
      {labels.map((label, i) => {
        const n = i + 2; // sub-step 1 is LOGO_STEPS[1]
        const active = n === activeStep;
        const done = n < activeStep;
        const reachable = n <= furthest;
        return (
          <React.Fragment key={label}>
            {i > 0 && <div style={{width:12,height:1.5,background:'var(--line)'}}/>}
            <button
              type="button"
              onClick={reachable && !active ? () => onPick(n) : undefined}
              aria-current={active ? 'step' : undefined}
              disabled={!reachable || active}
              style={{
                display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',
                borderRadius:99,border:0,fontFamily:'inherit',
                background: active ? '#0E0F12' : (done ? 'var(--bg-sunken)' : 'transparent'),
                boxShadow: active || done ? 'none' : 'inset 0 0 0 1px var(--line)',
                color: active ? '#fff' : (reachable ? 'var(--fg-2)' : 'var(--fg-4)'),
                fontSize:11.5,fontWeight: active ? 700 : 600,
                cursor: reachable && !active ? 'pointer' : 'default',
              }}
            >
              <span style={{fontFamily:'var(--font-mono)',fontSize:9.5,opacity:.75}}>{n - 1}</span>
              {label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

const ALogoProgress = ({ activeStep = 1 }) => {
  const steps = LOGO_STEPS;
  return (
    <div className="logo-progress" style={{display:'flex',alignItems:'center',gap:10}} aria-label="Logo creation progress">
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          {i > 0 && <div className="logo-progress-line" style={{width:16,height:1.5,background:'var(--line)'}}/>}
          <div style={{display:'flex',alignItems:'center',gap:6}} aria-current={i + 1 === activeStep ? 'step' : undefined}>
            <div style={{
              width:22,height:22,borderRadius:'50%',
              background:i + 1 === activeStep ? '#000' : (i + 1 < activeStep ? 'var(--line-strong)' : 'transparent'),
              color:i + 1 === activeStep ? '#fff' : (i + 1 < activeStep ? 'var(--fg-1)' : 'var(--fg-3)'),
              border:i + 1 > activeStep ? '1px solid var(--line-strong)' : 'none',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:10,fontWeight:700,fontFamily:'var(--font-mono)'
            }}>{i + 1}</div>
            <span className="logo-progress-label" style={{fontSize:12,fontWeight:i + 1 === activeStep ? 700 : 500,color:i + 1 === activeStep ? '#000' : 'var(--fg-3)'}}>{label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export const ALogoWizardLayout = ({
  children, step = 1, title = 'Brief the logo studio.',
  subtitle = 'Start with the name and the idea. Visual direction comes next.',
  dockCopy = 'Add a name and brief to shape the first directions.',
  nextLabel = 'Continue to direction', onNext, nextDisabled, onBack,
}: any) => {
  const activity = useActivityLog();
  const [logOpen, setLogOpen] = React.useState(false);
  return (
  <AShell breadcrumb={['Brands', 'Logo studio']}>
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div className="logo-wizard-header" style={{
        padding:'24px 36px 6px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:24,
      }}>
        <div style={{minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <Chip tone="neutral">Draft</Chip>
            <span style={{fontSize:11.5,color:'var(--fg-3)',fontFamily:'var(--font-mono)'}}>Logo · Step {step} of {LOGO_STEPS.length}</span>
          </div>
          <h2 style={{
            fontFamily:'var(--font-display)',fontWeight:800,fontSize:42,
            letterSpacing:'-0.035em',lineHeight:1,margin:0,color:'#000',
          }}>{title}</h2>
          <div style={{fontSize:14,color:'var(--fg-3)',marginTop:8}}>{subtitle}</div>
        </div>
        <ALogoProgress activeStep={step} />
      </div>

      <div className="logo-wizard-content" style={{flex:1,minHeight:0,overflowY:'auto',padding:'24px 36px 110px'}}>
        {children}
      </div>

      <div className="logo-wizard-dock" style={{
        position:'absolute',bottom:20,left:24,right:24,
        background:'#0E0F12',color:'#fff',borderRadius:16,padding:'14px 18px',
        display:'flex',alignItems: logOpen ? 'flex-start' : 'center',gap:14,
        boxShadow:'0 18px 50px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.06)',
        overflow:'hidden',zIndex:10,
      }}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'var(--fl-accent)'}}/>
        {onBack && <button type="button" onClick={onBack} data-selfnav style={{
          padding:'8px 14px',borderRadius:8,background:'rgba(255,255,255,.10)',color:'#fff',
          fontSize:12,fontWeight:600,border:0,cursor:'pointer',flex:'0 0 auto',
        }}>Back</button>}
        <div style={{
          width:28,height:28,background:'url("' + __assets['assets/min/fluid-app-icon.png'] + '") center / contain no-repeat',
          flex:'0 0 28px',
        }}/>
        {activity.events.length || activity.running ? (
          <ADockActivity
            events={activity.events}
            running={activity.running}
            failure={activity.failure}
            open={logOpen}
            onToggle={() => setLogOpen((o) => !o)}
          />
        ) : (
          <div className="logo-dock-copy" style={{flex:1,minWidth:0,fontSize:13,color:'rgba(255,255,255,.85)'}}>
            {dockCopy}
          </div>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          aria-disabled={nextDisabled}
          data-selfnav
          style={{
            padding:'8px 14px',borderRadius:8,
            background:nextDisabled ? 'rgba(255,255,255,.14)' : '#fff',
            color:nextDisabled ? 'rgba(255,255,255,.48)' : '#000',
            fontSize:12,fontWeight:600,display:'inline-flex',alignItems:'center',gap:6,
            border:0,cursor:nextDisabled ? 'not-allowed' : 'pointer',whiteSpace:'nowrap',
          }}
        >
          {nextLabel} <ArrowRight size={12}/>
        </button>
      </div>
    </div>
  </AShell>
  );
};

// Overall visual worlds, mirroring STANDALONE_STYLE_OPTIONS in logo-styles.ts.
// Deliberately orthogonal to logo type: any of these can be drawn as a
// wordmark, a mascot or an emblem, so the two steps never ask the same thing.
// "Let Fluid choose" is handled by its own control, so it isn't a card here.
export const LOGO_STYLE_PLACEHOLDERS = [
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Reduced to essentials. Space, restraint, nothing decorative.',
    preview: __assets['logo-style-previews/minimal.png'],
    previewBg: '#FBFAF7',
  },
  {
    id: 'organic',
    label: 'Organic',
    description: 'Natural, flowing forms. Softened edges and living curves.',
    preview: __assets['logo-style-previews/organic.png'],
    previewBg: '#F4EFE3',
  },
  {
    id: 'futurist',
    label: 'Futurist',
    description: 'Forward-looking and engineered. Precision with an edge.',
    preview: __assets['logo-style-previews/futurist.png'],
    previewBg: '#070B0F',
  },
  {
    id: 'luxury',
    label: 'Luxury',
    description: 'Refined and premium. High contrast, generous space, restraint.',
    preview: __assets['logo-style-previews/luxury.png'],
    previewBg: '#0A0A0A',
  },
  {
    id: 'playful',
    label: 'Playful',
    description: 'Energetic and informal. Rounded, colourful, full of character.',
    preview: __assets['logo-style-previews/playful.png'],
    previewBg: '#FAF7EF',
  },
  {
    id: 'retro',
    label: 'Retro',
    description: 'Period reference. Warmth and nostalgia, deliberately dated.',
    preview: __assets['logo-style-previews/retro.png'],
    previewBg: '#F3E4BF',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Typographic and considered. Intelligent rather than opulent.',
    preview: __assets['logo-style-previews/editorial.png'],
    previewBg: '#F8F8F6',
  },
  {
    id: 'corporate',
    label: 'Corporate',
    description: 'Stable and credible. Built to be trusted for decades.',
    preview: __assets['logo-style-previews/corporate.png'],
    previewBg: '#FFFFFF',
  },
  {
    id: 'brutalist',
    label: 'Brutalist',
    description: 'Raw and stark. Heavy, industrial, unapologetic.',
    preview: __assets['logo-style-previews/brutalist.png'],
    previewBg: '#F5F5F3',
  },
];

// A reference vote only has meaning for the exact style and mark type that
// produced its gallery. Changing either choice therefore starts a new visual
// direction and invalidates every downstream result derived from those votes.
export const resetLogoDirectionWork = () => ({
  logo_reference_likes: [],
  logo_reference_dislikes: [],
  logo_reference_context: null,
  logo_reference_batch_offset: 0,
  logo_reference_batch_paths: [],
  logo_board: [],
  logo_board_likes: [],
  logo_board_output_version: null,
  logo_board_config: null,
  logo_refine_concept: null,
  logo_refine_versions: [],
  logo_finalists: [],
  logo_finalist_plan: null,
  logos: [],
});

export const LOGO_TYPE_OPTIONS = [
  { id: 'wordmark', label: 'Wordmark', description: 'The full brand name, set in distinctive type.' },
  { id: 'lettermark', label: 'Lettermark', description: 'Initials arranged as a compact monogram.' },
  { id: 'pictorial', label: 'Pictorial Mark', description: 'A recognisable object, drawn as a distinct symbol.' },
  { id: 'abstract', label: 'Abstract Mark', description: 'A non-literal symbol built around the brand idea.' },
  { id: 'mascot', label: 'Mascot Logo', description: 'A character-led mark with a recognisable personality.' },
  { id: 'combination', label: 'Combination Mark', description: 'A symbol and wordmark designed as one lockup.' },
  { id: 'emblem', label: 'Emblem', description: 'Type contained within a badge, seal, or crest.' },
  { id: 'ai', label: 'Let AI Choose', description: 'Fluid chooses the structures that best fit your brief.', ai: true },
];

export const ALogoTypeCard = ({ type, selected, onClick }: any) => {
  const [hot, setHot] = React.useState(false);
  const refs = logoReferencesFor(type.id);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      aria-pressed={selected}
      style={{
        minHeight:164,padding:20,borderRadius:16,textAlign:'left',cursor:'pointer',
        border:selected ? '2px solid #000' : '1px solid var(--line)',
        background:selected ? '#fff' : 'var(--bg-elev)',
        boxShadow:selected ? '0 10px 24px rgba(0,0,0,.10)' : 'var(--shadow-xs)',
        display:'flex',flexDirection:'column',justifyContent:'space-between',gap:12,
        transition:'border-color .15s, box-shadow .15s, transform .15s',
      }}
    >
      <div style={{display:'flex',alignItems:'baseline'}}>
        <span style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,color:'#000',letterSpacing:'-0.02em',lineHeight:1.1}}>
          {type.label}
        </span>
      </div>
      {refs.length > 0 && (
        <div style={{height:78,padding:'0 2px'}}>
          <AMarkReferenceReel refs={refs} active={hot} maxHeight={58} showName={false}/>
        </div>
      )}
      {type.ai && (
        <div style={{height:78,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Sparkle size={36} color="#FDBA50"/>
        </div>
      )}
      <span style={{fontSize:11.5,color:'var(--fg-4)',lineHeight:1.35}}>{type.description}</span>
    </button>
  );
};

// Mirrors readAxes() in logo-reference-query.ts. Step 4 is a slider the client
// never touches: liking a mark votes for its axis positions. Showing the result
// keeps that legible — and is how someone notices if it read them wrong.
const AXIS_POLES = {
  boldness: ['quiet', 'bold'],
  energy:   ['calm', 'energetic'],
  warmth:   ['cool', 'warm'],
  detail:   ['simple', 'detailed'],
};

const AXIS_MIN_SAMPLES = 2;

const AXIS_MAX_SPREAD = 0.30;

const AXIS_REJECTION_PUSH = 0.5;

export function readRefinementAxes(liked: any, disliked: any) {
  const mean = (xs: any) => xs.reduce((a: any, b: any) => a + b, 0) / xs.length;
  const sd = (xs: any) => xs.length < 2 ? 0 : Math.sqrt(mean(xs.map((x: any) => (x - mean(xs)) ** 2)));
  const values = (rows: any, axis: any) => rows
    .map((r: any) => Number((r.refinement || {})[axis]))
    .filter((n: any) => Number.isFinite(n))
    .map((n: any) => Math.min(1, Math.max(0, n)));

  const out = [];
  for (const axis of Object.keys(AXIS_POLES)) {
    const L = values(liked, axis), D = values(disliked, axis);
    if (L.length < AXIS_MIN_SAMPLES || sd(L) > AXIS_MAX_SPREAD) continue;
    const preferred = mean(L);
    const push = (D.length >= AXIS_MIN_SAMPLES && sd(D) <= AXIS_MAX_SPREAD)
      ? AXIS_REJECTION_PUSH * (preferred - mean(D)) : 0;
    const value = Math.min(1, Math.max(0, preferred + push));
    const [low, high] = (AXIS_POLES as any)[axis];
    const label = value < 0.2 ? `very ${low}` : value < 0.4 ? `leaning ${low}`
      : value <= 0.6 ? 'balanced' : value <= 0.8 ? high : `very ${high}`;
    out.push({ axis, value, label, low, high });
  }
  return out;
}

// The readout. Axes the picks disagreed on are absent on purpose — silence
// means "no view", so we say that rather than showing a misleading midpoint.
export const ARefinementReadout = ({ axes, sampled }: any) => {
  if (!sampled) return null;
  return (
    <div style={{
      padding:'14px 16px',borderRadius:14,background:'var(--bg-elev)',
      boxShadow:'inset 0 0 0 1px var(--line)',display:'flex',flexDirection:'column',gap:10,
    }}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:12}}>
        <span className="eyebrow" style={{color:'var(--fg-3)'}}>What your picks suggest</span>
        <span style={{fontSize:11,color:'var(--fg-4)',fontFamily:'var(--font-mono)'}}>
          set by choosing, not by sliders
        </span>
      </div>
      {axes.length === 0 ? (
        <div style={{fontSize:12.5,color:'var(--fg-3)',lineHeight:1.5}}>
          Not enough of a pattern yet — like a few more, or a few that feel
          similar to each other, and a direction will show up here.
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:9}}>
          {axes.map(({ axis, value, label, low, high }: any) => (
            <div key={axis} style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{flex:'0 0 92px',fontSize:11,color:'var(--fg-4)',fontFamily:'var(--font-mono)'}}>{low}</span>
              <div style={{flex:1,height:4,borderRadius:99,background:'var(--bg-sunken)',position:'relative'}}>
                <div style={{
                  position:'absolute',left:`${value * 100}%`,top:'50%',
                  width:10,height:10,borderRadius:99,background:'#FD7947',
                  transform:'translate(-50%,-50%)',transition:'left .2s',
                }}/>
              </div>
              <span style={{flex:'0 0 92px',fontSize:11,color:'var(--fg-4)',fontFamily:'var(--font-mono)',textAlign:'right'}}>{high}</span>
              <span style={{flex:'0 0 96px',fontSize:11.5,fontWeight:700,color:'#000'}}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const LogoReferenceContext = ({ label, value }: any) => (
  <div style={{
    display:'inline-flex',alignItems:'center',gap:7,padding:'6px 9px',borderRadius:8,
    background:'var(--bg-sunken)',boxShadow:'inset 0 0 0 1px var(--line)',
    minWidth:0,
  }}>
    <span style={{fontFamily:'var(--font-mono)',fontSize:9.5,color:'var(--fg-4)',textTransform:'uppercase'}}>{label}</span>
    <span style={{fontSize:11.5,color:'var(--fg-1)',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{value}</span>
  </div>
);

export const ALogoReferenceCard = ({ reference, liked, disliked, onLike, onDislike }: any) => (
  <article className="logo-reference-card" style={{
    background:'var(--bg-elev)',borderRadius:13,padding:8,
    boxShadow:liked ? '0 0 0 2px #FD7947, var(--shadow-sm)' : (disliked ? '0 0 0 2px var(--line-strong), var(--shadow-xs)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)'),
    opacity: disliked ? 0.55 : 1, transition:'opacity .15s',
  }}>
    {/* No fixed height: the card takes the image's own proportions, which is
        what makes the gallery read as a collage rather than a grid. */}
    <div style={{
      borderRadius:8,background:'#fff',overflow:'hidden',
      boxShadow:'inset 0 0 0 1px var(--line)',marginBottom:7,
      // Reserve the image's box up front so lazily-loaded artwork doesn't
      // shove the masonry columns around as it arrives.
      aspectRatio: reference.aspectRatio || undefined,
    }}>
      <img
        src={reference.imageUrl}
        alt={`${reference.name} — ${reference.markType} reference`}
        loading="lazy"
        style={reference.aspectRatio ? {height:'100%',objectFit:'cover'} : undefined}
      />
    </div>
    {/* Why this reference is here: the attributes it shares with the chosen
        direction. Keeps the gallery legible rather than arbitrary. */}
    {reference.matched && reference.matched.length > 0 && (
      <div style={{display:'flex',flexWrap:'wrap',gap:3,marginBottom:6}}>
        {reference.matched.slice(0, 2).map((attr: any) => (
          <span key={attr} style={{
            fontFamily:'var(--font-mono)',fontSize:8.5,letterSpacing:'.02em',
            padding:'2px 5px',borderRadius:5,background:'rgba(253,121,71,.12)',color:'#B4441A',
          }}>{attr}</span>
        ))}
      </div>
    )}
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
      <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:12,color:'#000',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{reference.name}</span>
      <div style={{display:'inline-flex',gap:5}}>
        <button
          type="button" onClick={onLike} aria-pressed={liked} title={liked ? 'Unlike' : 'Like'}
          aria-label={`${liked ? 'Unlike' : 'Like'} ${reference.name}`}
          style={{flex:'0 0 26px',width:26,height:26,borderRadius:99,border:0,cursor:'pointer',background:liked ? 'rgba(253,121,71,.12)' : 'var(--bg-sunken)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill={liked ? '#FD7947' : 'none'} stroke={liked ? '#FD7947' : 'var(--fg-3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button
          type="button" onClick={onDislike} aria-pressed={disliked} title={disliked ? 'Remove dislike' : 'Dislike'}
          aria-label={`${disliked ? 'Remove dislike from' : 'Dislike'} ${reference.name}`}
          style={{flex:'0 0 26px',width:26,height:26,borderRadius:99,border:0,cursor:'pointer',background:disliked ? 'var(--fg-2)' : 'var(--bg-sunken)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}
        >
          {/* A real thumbs-DOWN. The previous path drew the palm at y=10–20
              with the thumb rising to y=5 — i.e. a thumbs-up on the Dislike
              button, so both controls read as positive. */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill={disliked ? '#fff' : 'none'} stroke={disliked ? '#fff' : 'var(--fg-3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V3"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>
        </button>
      </div>
    </div>
  </article>
);

// One version's palette: the colours this version of the mark will be drawn in.
// The first swatch is the primary — the studio is told so — which is why the
// order is editable rather than a set.
export const AVersionPalette = ({ index, colors, onChange, disabled }: any) => {
  const setColor = (i: any, value: any) => {
    const next = [...colors];
    next[i] = value;
    onChange(next);
  };
  const remove = (i: any) => onChange(colors.filter((_: any, j: any) => j !== i));
  const add = () => onChange([...colors, '#000000']);

  return (
    <div style={{
      padding:'12px 13px',borderRadius:12,background:'var(--bg-elev)',
      boxShadow:'inset 0 0 0 1px var(--line)',display:'flex',
      flexDirection:'column',gap:10,
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
        <span style={{
          fontSize:9.5,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',
          color:'var(--fg-2)',background:'var(--bg-sunken)',padding:'3px 8px',borderRadius:99,
        }}>Version {index + 1}</span>
        {colors.length < MAX_VERSION_COLORS && (
          <button type="button" onClick={add} disabled={disabled} style={{
            padding:'4px 9px',borderRadius:8,background:'transparent',color:'var(--fg-2)',
            boxShadow:'inset 0 0 0 1px var(--line-strong)',fontSize:11,fontWeight:600,
            border:0,cursor:disabled ? 'default' : 'pointer',opacity:disabled ? .5 : 1,
          }}>Add colour</button>
        )}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:7}}>
        {colors.map((c: any, i: any) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
            <input
              type="color"
              value={c}
              disabled={disabled}
              onChange={(e) => setColor(i, e.target.value)}
              aria-label={`Version ${index + 1} colour ${i + 1}`}
              style={{
                width:30,height:30,padding:0,border:0,borderRadius:8,
                background:'transparent',cursor:disabled ? 'default' : 'pointer',flex:'0 0 30px',
              }}
            />
            <input
              type="text"
              value={c}
              disabled={disabled}
              spellCheck={false}
              onChange={(e) => setColor(i, e.target.value)}
              aria-label={`Version ${index + 1} colour ${i + 1} hex`}
              style={{
                flex:1,minWidth:0,padding:'6px 9px',borderRadius:8,border:0,
                boxShadow:'inset 0 0 0 1px var(--line)',background:'var(--bg-sunken)',
                fontFamily:'var(--font-mono)',fontSize:11.5,color:'var(--fg-1)',
              }}
            />
            {i === 0
              ? <span style={{fontSize:10,color:'var(--fg-4)',flex:'0 0 auto'}}>primary</span>
              : (
                <button type="button" onClick={() => remove(i)} disabled={disabled}
                  aria-label={`Remove colour ${i + 1} from version ${index + 1}`}
                  style={{
                    flex:'0 0 24px',width:24,height:24,borderRadius:99,border:0,
                    background:'var(--bg-sunken)',color:'var(--fg-3)',fontSize:13,
                    cursor:disabled ? 'default' : 'pointer',lineHeight:1,
                  }}>×</button>
              )}
          </div>
        ))}
      </div>
    </div>
  );
};

// "Let AI choose" writes this sentinel instead of resolving to one of the
// curated options below. It means "the studio decides this from the brief,
// unconstrained by these lists" — deliberately distinct from an unset field,
// which just means the user hasn't decided. Mirrors DELEGATED in lib/ai/step2.
export const AI_CHOICE = '__ai__';

// =====================================================================
// A5 · Step 4 · The Logo Studio — a two-phase agency process.
//
// Phase 1 · Divergence: the server generates a creative platform (the
// strategy behind the brand) and a 9-up board of low-fidelity concept
// sketches (croquis), fanned out across strategic territories and mark
// types. The user likes the directions that resonate — those likes carry
// structured metadata (territory, mark type, formal attributes), so they
// genuinely orient the next phase. The board can be regenerated, biased
// by any likes so far.
//
// Phase 2 · Convergence: the liked sketches are developed into finished
// vector marks, the pool is expanded with new concepts extending the
// user's taste, and a creative-director critique pass culls to the best
// 9 — each with a verdict note. The pick lands in logo_choice, and the
// finalists mirror into data.logos so Step 5 / export work unchanged.
// =====================================================================

// A low-fi croquis card with a like control. The asset is presented directly
// on the card so transparent sketches do not sit inside a second visual frame.
export const ASketchCard = ({ sketch, liked, onLike, onImageError }: any) => (
  <div style={{
    background:'var(--bg-elev)', borderRadius: 16, padding: 12,
    boxShadow: liked ? '0 0 0 2px #FD7947, var(--shadow-sm)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    display:'flex', flexDirection:'column', gap:10, position:'relative',
  }}>
    {/* Layout-only region: the generated asset is transparent and sits directly
        against the card instead of on a paper-colored inset surface. */}
    <div style={{
      height: 120,
      display:'flex', alignItems:'center', justifyContent:'center',
      overflow:'hidden',
    }}>
      <img src={sketch.image_url} alt={sketch.name} loading="lazy" onError={onImageError}
        style={{width:'100%', height:'100%', objectFit:'contain', display:'block'}}/>
    </div>
    <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8}}>
      <div style={{minWidth:0}}>
        <div style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:13.5, letterSpacing:'-0.015em', color:'#000', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{sketch.name}</div>
        {/* Board sketches lead with the style world they were drawn in, since
            that is what distinguishes one part of the board from another. The
            main wizard's sketches have no world, and lead with the territory. */}
        <div style={{display:'flex', alignItems:'center', gap:6, marginTop:4, flexWrap:'wrap'}}>
          <span style={{fontSize:9.5, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:'var(--fg-2)', background:'var(--bg-sunken)', padding:'2px 7px', borderRadius:99}}>{sketch.style_name || sketch.territory_name || sketch.territory}</span>
          <span style={{fontSize:9.5, fontFamily:'var(--font-mono)', letterSpacing:'0.05em', textTransform:'uppercase', color:'var(--fg-4)'}}>{sketch.mark_type_name || sketch.mark_type}</span>
        </div>
      </div>
      <button onClick={onLike} aria-label={(liked ? 'Unlike ' : 'Like ') + sketch.name} style={{
        flex:'0 0 30px', width:30, height:30, borderRadius:99, border:0, cursor:'pointer',
        background: liked ? 'rgba(253,121,71,.12)' : 'var(--bg-sunken)',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? '#FD7947' : 'none'} stroke={liked ? '#FD7947' : 'var(--fg-3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>
    {sketch.idea && <div style={{fontSize:11, color:'var(--fg-3)', lineHeight:1.4}}>{sketch.idea}</div>}
  </div>
);

// A high-fidelity finalist card: the finished mark plus the designer's
// rationale and the creative director's verdict from the critique pass.
export const AFinalistCard = ({ f, sel, busy, onClick }: any) => (
  <div onClick={onClick} style={{
    background:'var(--bg-elev)', borderRadius: 16, padding: 12, cursor:'pointer',
    boxShadow: sel ? '0 0 0 2px #000, var(--shadow-sm)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    display:'flex', flexDirection:'column', gap:10,
  }}>
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
      <span style={{fontSize:9.5, color:'var(--fg-4)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', textTransform:'uppercase', display:'inline-flex', alignItems:'center', gap:6}}>
        {f.version ? `Version ${f.version}` : (f.refines ? 'From your pick' : 'New direction')}
        {f.svg && ' · vector ready'}
        {/* The colours this version was briefed with, so a mark drawn in the
            wrong palette is visible without opening the art direction. */}
        {Array.isArray(f.colors) && f.colors.map((c: any) => (
          <span key={c} title={c} style={{
            width:9, height:9, borderRadius:99, background:c,
            boxShadow:'inset 0 0 0 1px rgba(0,0,0,.18)', display:'inline-block',
          }}/>
        ))}
      </span>
      {busy
        ? <span style={{display:'inline-flex', alignItems:'center', gap:5, fontSize:10, fontWeight:600, color:'var(--fg-2)'}}><Thinking/> tracing</span>
        : sel && <span style={{fontSize:10, fontWeight:700, color:'#fff', background:'#000', padding:'3px 8px', borderRadius:99, letterSpacing:'0.04em'}}>SELECTED</span>}
    </div>
    <div style={{background:'#fff', borderRadius: 10, height: 130, padding:8, boxShadow:'inset 0 0 0 1px var(--line)'}}>
      <img src={f.image_url} alt={f.name} loading="lazy"
        style={{width:'100%', height:'100%', objectFit:'contain', display:'block'}}/>
    </div>
    <div>
      <div style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:13.5, letterSpacing:'-0.015em', color:'#000'}}>{f.name}</div>
      {f.idea && <div style={{fontSize:11, color:'var(--fg-3)', lineHeight:1.4, marginTop:2}}>{f.idea}</div>}
      {f.critique && <div style={{fontSize:10.5, color:'var(--fg-4)', lineHeight:1.4, marginTop:6, paddingTop:6, borderTop:'1px solid var(--line)', fontStyle:'italic'}}>Studio note — {f.critique}</div>}
    </div>
  </div>
);

// A selectable choice card with an illustrative preview.
// A reel of real reference logos for one mark type. Every frame is mounted up
// front and cross-faded rather than swapped in on demand, so a logo never pops
// in half-loaded partway through a cycle.
//
// Cycling is driven by `active`, which the card sets on hover AND on focus —
// keyboard users get the same reference material as mouse users.
const AMarkReferenceReel = ({ refs, active, maxHeight = 28, showName = true }: any) => {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    if (!active || refs.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % refs.length), 850);
    return () => clearInterval(t);
  }, [active, refs.length]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {refs.map((r: any, n: any) => (
        <img
          key={r.src}
          className="mark-ref-frame"
          src={r.src}
          alt={n === 0 ? `Example ${'' + r.name} wordmark` : ''}
          aria-hidden={n !== 0}
          style={{
            position: 'absolute', maxWidth: '84%', maxHeight,
            objectFit: 'contain', opacity: n === i ? 1 : 0,
          }}
        />
      ))}
      {/* Names the mark being shown, so the reel reads as a reference gallery
          rather than as branding attached to the option itself. */}
      {showName && <span style={{
        position: 'absolute', right: 2, bottom: -2, fontSize: 9,
        fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
        color: 'var(--fg-4)', opacity: active ? 1 : 0, transition: 'opacity 160ms',
        pointerEvents: 'none',
      }}>{refs[i] ? refs[i].name : ''}</span>}
    </div>
  );
};

