"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { __assets } from "../_kit/assets";
import { AInspirationCard, APPLE_DISPLAY, AppleHero, FIGMA_TYPE, FigmaHero, PERPLEXITY_DISPLAY, PerplexityHero, TESLA_TYPE, TeslaHero } from "../_kit/brand-showcase";
import { BrandCollage, QUICK_VISUAL_MODES, QuickPath } from "../_kit/collage";
import { AShell, CHAT, FluidWordmark } from "../_kit/shell";
import { ArrowRight, Chip, PlusIcon, Sparkle } from "../_kit/ui";

interface CommunityCardProps {
  name: string;
  author: string;
  when: string;
  mood: { bg: string; fg: string };
  mark: { weight: number; size: number; tracking: string; text: string; dot?: boolean; dotColor?: string };
  palette: string[];
  type: string;
}

// Community card — a brand someone made with Fluid. Shows a thumbnail,
// brand name + author, kit summary (3 swatches + type sample).
const CommunityCard = ({ name, author, when, mood, mark, palette, type }: CommunityCardProps) => (
  <div style={{
    background: 'var(--bg-elev)', borderRadius: 16,
    boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
    cursor: 'pointer',
  }}>
    <div style={{
      height: 110, background: mood.bg, color: mood.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: mark.weight,
      fontSize: mark.size, letterSpacing: mark.tracking, lineHeight: 1,
    }}>{mark.text}{mark.dot && <span style={{color: mark.dotColor}}>.</span>}</div>
    <div style={{padding: '12px 14px 14px', display:'flex', flexDirection:'column', gap:8}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:'var(--font-display)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.018em', color: 'var(--fg-1)', lineHeight: 1.05}}>{name}</div>
          <div style={{fontSize: 11, color: 'var(--fg-3)', marginTop: 3}}>{author} · {when}</div>
        </div>
        <span style={{fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-mono)', whiteSpace:'nowrap'}}>{type}</span>
      </div>
      <div style={{display:'flex', gap: 3}}>
        {palette.map((c, i) => (
          <div key={i} style={{flex: 1, height: 8, borderRadius: 99, background: c}}/>
        ))}
      </div>
    </div>
  </div>
);

export const DirA_Brands = () => (
  <AShell breadcrumb={['Brands']}>
    <div style={{padding: '56px 64px 48px', maxWidth: 1280, display:'flex', flexDirection:'column', gap: 44}}>
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:32}}>
        <div>
          <div className="eyebrow" style={{color:'var(--fg-3)', marginBottom:14}}>Library · 0 brands</div>
          <h1 style={{
            fontFamily:'var(--font-display)', fontWeight:800,
            fontSize: 64, letterSpacing:'-0.04em', lineHeight: 0.98,
            margin: 0, color:'#000', textWrap:'balance',
            maxWidth: 700,
          }}>Your brands<br/>live here.</h1>
          <p style={{fontSize:17, color:'var(--fg-2)', maxWidth:520, marginTop: 18, lineHeight:1.5}}>
            Every kit you spin up with Fluid — logos, palettes, type, guidelines — stays in this library. Edit, fork, or export them whenever.
          </p>
        </div>
        <button style={{
          display:'inline-flex',alignItems:'center',gap:8,
          padding:'12px 18px',borderRadius:12,
          background:'#000',color:'#fff',fontWeight:600,fontSize:14,
          boxShadow:'0 1px 0 rgba(255,255,255,.1) inset, 0 8px 20px rgba(0,0,0,.18)'
        }}>
          <PlusIcon size={14}/> New brand
        </button>
      </div>

      {/* Hero create card — one coral moment, no background clip-art */}
      <div style={{
        position:'relative',
        background: 'var(--bg-elev)',
        borderRadius: 28,
        padding: '36px 40px',
        boxShadow: 'var(--shadow-sm)',
        display:'flex',alignItems:'center',gap:48,
        overflow:'hidden',
      }}>
        <div style={{flex:1, position:'relative', zIndex:1}}>
          <Chip tone="ai" style={{marginBottom:14}}><Sparkle size={11}/> AI BRAND AGENT</Chip>
          <h2 style={{fontFamily:'var(--font-display)', fontWeight:800, fontSize:34, letterSpacing:'-0.03em', lineHeight:1.05, margin:'0 0 10px', color:'#000', maxWidth: 440}}>
            From idea to identity — instantly.
          </h2>
          <p style={{fontSize:15, color:'var(--fg-2)', margin:'0 0 22px', maxWidth: 480, lineHeight:1.5}}>
            Tell Fluid about your idea. We&apos;ll draft a strategy, name, logo, palette, and type — in about 60&nbsp;seconds.
          </p>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <button style={{padding:'12px 20px',borderRadius:12,background:'#000',color:'#fff',fontSize:14,fontWeight:600, display:'inline-flex',alignItems:'center',gap:8}}>
              Start a new brand <ArrowRight size={14}/>
            </button>
            <button style={{padding:'12px 18px',borderRadius:12,background:'transparent',color:'var(--fg-1)',fontSize:14,fontWeight:600,boxShadow:'inset 0 0 0 1px var(--line-strong)'}}>
              Browse templates
            </button>
          </div>
        </div>
        {/* Dynamic vertical-scrolling collage of brand work — same as Home,
            but living in a white card rather than the black hero. */}
        <BrandCollage />
      </div>

      <div>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:18}}>
          <div className="eyebrow" style={{color:'var(--fg-3)'}}>Or, start from a look</div>
          <div style={{fontSize:12,color:'var(--fg-4)'}}>4 visual moods</div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14}}>
          {QUICK_VISUAL_MODES.map((m) => (
            <QuickPath
              key={m.id}
              route={CHAT + '?mode=' + m.id}
              title={m.title}
              sub={m.sub}
              preview={__assets[m.preview]} previewBg={m.previewBg}
              icon={m.icon}
            />
          ))}
        </div>
      </div>

      {/* Featured templates — polished kits to start from */}
      <div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:18, gap:24}}>
          <div>
            <div className="eyebrow" style={{color:'var(--fg-3)', marginBottom:6}}>Brands to start from · 28</div>
            <h2 style={{
              fontFamily:'var(--font-display)', fontWeight: 800, fontSize: 30,
              letterSpacing:'-0.03em', lineHeight: 1, margin: 0, color: '#000',
            }}>Start from a brand you admire.</h2>
            <p style={{margin:'8px 0 0', fontSize: 13.5, color:'var(--fg-2)', maxWidth: 520, lineHeight: 1.5}}>
              Begin with the DNA of a brand you love — Fluid adapts the whole identity to your brief, then makes it yours.
            </p>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <button style={{padding:'8px 12px', borderRadius:10, background:'var(--bg-elev)', color:'var(--fg-2)', fontSize:12, fontWeight:600, boxShadow:'inset 0 0 0 1px var(--line)'}}>All categories</button>
            <button style={{padding:'8px 12px', borderRadius:10, background:'transparent', color:'var(--fg-2)', fontSize:12, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6}}>
              Browse all 28 <ArrowRight size={11}/>
            </button>
          </div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14}}>
          {/* Apple — minimal, refined, premium */}
          <AInspirationCard
            name="Apple" category="Consumer tech · Premium"
            hero={<AppleHero/>}
            style={{
              label:'Minimal · Refined',
              pill:{
                bg:'#FFFFFF', color:'#1D1D1F',
                font: APPLE_DISPLAY, weight: 500, tracking:'-0.005em',
                shadow:'inset 0 0 0 1px #D2D2D7',
                dot:'#1D1D1F',
              },
            }}
          />
          {/* Figma — playful, vibrant, collaborative */}
          <AInspirationCard
            name="Figma" category="Design tool · Collaborative"
            hero={<FigmaHero/>}
            style={{
              label:'Playful · Vibrant',
              pill:{
                bg:'#0E0E0E', color:'#FFFFFF',
                font: FIGMA_TYPE, weight: 700, tracking:'-0.005em',
                dot:'#A259FF', dotSize: 6,
              },
            }}
          />
          {/* Perplexity — editorial, considered, paper warmth */}
          <AInspirationCard
            name="Perplexity" category="AI search · Editorial"
            hero={<PerplexityHero/>}
            style={{
              label:'Editorial · Considered',
              pill:{
                bg:'#FBF7EE', color:'#1F4E47',
                font: PERPLEXITY_DISPLAY, weight: 500, italic: true,
                tracking:'-0.005em', size: 11.5,
                shadow:'inset 0 0 0 1px #E8DFC8',
                dot:'#1F4E47',
              },
            }}
          />
          {/* Tesla — red-dominant, bold, technical */}
          <AInspirationCard
            name="Tesla" category="Automotive · Technology"
            hero={<TeslaHero/>}
            style={{
              label:'Bold · Technical',
              pill:{
                bg:'#E31937', color:'#FFFFFF',
                font: TESLA_TYPE, weight: 700,
                tracking:'0.18em', transform:'uppercase', size: 9.5,
                padding:'5px 11px',
                dot:'#000000', dotSize: 5,
              },
            }}
          />
        </div>
      </div>

      {/* From the community — social proof + inspiration */}
      <div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:18, gap:24}}>
          <div>
            <div className="eyebrow" style={{color:'var(--fg-3)', marginBottom:6}}>From the community · 12 published this week</div>
            <h2 style={{
              fontFamily:'var(--font-display)', fontWeight: 800, fontSize: 30,
              letterSpacing:'-0.03em', lineHeight: 1, margin: 0, color: '#000',
            }}>Made with Fluid.</h2>
          </div>
          <button style={{padding:'8px 12px', borderRadius:10, background:'transparent', color:'var(--fg-2)', fontSize:12, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6}}>
            Open showcase <ArrowRight size={11}/>
          </button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14}}>
          <CommunityCard
            name="Cadence" author="Mikael R." when="2d ago" type="SaaS"
            mood={{bg:'#F4EFE7', fg:'#1F232A'}}
            mark={{text:'Cadence', weight: 800, size: 26, tracking:'-0.04em', dot:true, dotColor:'#FD7947'}}
            palette={['#1F232A','#FD7947','#FDBA50','#44D9C7','#F4EFE7']}
          />
          <CommunityCard
            name="Vesper" author="Lina K." when="5d ago" type="App"
            mood={{bg:'#0F1115', fg:'#FDBBC0'}}
            mark={{text:'V.', weight: 900, size: 56, tracking:'-0.06em'}}
            palette={['#0F1115','#FDBBC0','#FD7947','#F4EFE7']}
          />
          <CommunityCard
            name="Quiet Hours" author="Theo M." when="1w ago" type="Studio"
            mood={{bg:'#E8E4D8', fg:'#1A1A1A'}}
            mark={{text:'QH', weight: 600, size: 38, tracking:'-0.03em'}}
            palette={['#1A1A1A','#7A6F58','#B0A48A','#E8E4D8']}
          />
          <CommunityCard
            name="Northwind" author="Sasha P." when="1w ago" type="B2B"
            mood={{bg:'#22272F', fg:'#3B82F6'}}
            mark={{text:'northwind', weight: 700, size: 22, tracking:'-0.025em'}}
            palette={['#0F1115','#22272F','#3B82F6','#A4ADBA']}
          />
        </div>
      </div>

      {/* Footer strip — quick help / docs / demo */}
      <div style={{
        marginTop: 24, paddingTop: 28, paddingBottom: 28,
        borderTop: '1px solid var(--line)',
        display:'flex', alignItems:'center', gap: 28,
      }}>
        <FluidWordmark height={34}/>
        <div style={{width:1, height:26, background:'var(--line)'}}/>
        <div style={{display:'flex', alignItems:'center', gap: 22, fontSize: 12.5, color:'var(--fg-2)'}}>
          <a style={{color:'inherit', display:'inline-flex', alignItems:'center', gap:6}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Watch the 60s demo
          </a>
          <a style={{color:'inherit'}}>How Fluid works</a>
          <a style={{color:'inherit'}}>Read the manifesto</a>
          <a style={{color:'inherit'}}>Brand kit changelog</a>
          <a style={{color:'inherit'}}>Help &amp; docs</a>
        </div>
        <div style={{flex:1}}/>
        <span style={{fontSize: 11, color:'var(--fg-4)', fontFamily:'var(--font-mono)'}}>v1.4 · all systems normal</span>
      </div>
    </div>
  </AShell>
);
