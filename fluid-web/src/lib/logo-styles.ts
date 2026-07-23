// The Step 4 brief: what kind of mark, and in what visual language.
//
// Shared by the client (renders the choice cards) and the server (injects the
// guidance into generation prompts), so the two can never drift. Keep the
// blurbs short — they're card copy; `guidance` is the prompt text.

export interface MarkTypeOption {
  id: string;
  name: string;
  blurb: string; // one line, shown on the card
  guidance: string; // injected into the generation prompt
}

// The classic identity taxonomy. The user picks ONE; every concept on the
// board is then that type, explored from different angles.
export const MARK_TYPE_OPTIONS: MarkTypeOption[] = [
  {
    id: "wordmark",
    name: "Wordmark",
    blurb: "The full name, set in distinctive type.",
    guidance:
      "WORDMARK: the full brand name as the mark, with distinctive letterform " +
      "treatment. The type IS the logo — customise it (a modified terminal, a " +
      "cut counter, an unexpected ligature, altered proportions). Do not draw a " +
      "symbol beside it. Set the actual brand name, spelled correctly.",
  },
  {
    id: "lettermark",
    name: "Lettermark",
    blurb: "Initials or a single letter as the mark.",
    guidance:
      "LETTERMARK: the brand's initial(s) as the mark — a monogram. Build the " +
      "letterform geometrically; look for an ownable move in how strokes meet, " +
      "how counters are cut, or how two initials interlock. No accompanying " +
      "symbol, no full name.",
  },
  {
    id: "pictorial",
    name: "Pictorial",
    blurb: "A recognisable object, drawn distinctively.",
    guidance:
      "PICTORIAL: one literal, recognisable object rendered in a distinctive, " +
      "reduced way. Pick a subject that carries the brand idea — never a stock " +
      "metaphor. Reduce it to its most essential silhouette; the object should be " +
      "readable instantly at small size.",
  },
  {
    id: "abstract",
    name: "Abstract mark",
    blurb: "Non-literal geometry carrying the idea.",
    guidance:
      "ABSTRACT: non-literal geometry that encodes the brand idea. It must not " +
      "resemble a generic tech swoosh or blob — the form needs a specific, " +
      "explainable logic (a movement, a relationship, a structure) that ties back " +
      "to the strategy.",
  },
  {
    id: "combination",
    name: "Combination",
    blurb: "Symbol and wordmark as one lockup.",
    guidance:
      "COMBINATION: a symbol and the brand name designed as a single lockup. " +
      "Both parts must share a visual logic (matching stroke weight, shared " +
      "geometry, aligned optical sizing) so they read as one designed object, not " +
      "an icon parked next to some type. Compose them within the square canvas.",
  },
  {
    id: "emblem",
    name: "Emblem",
    blurb: "The name locked inside a shape or badge.",
    guidance:
      "EMBLEM: the brand name contained within a bounding shape — badge, seal, " +
      "crest, or container. The containing form and the type must be designed " +
      "together, with deliberate spacing between the type and the container edge.",
  },
];

export interface DesignStyleOption {
  id: string;
  name: string;
  blurb: string;
  guidance: string;
}

// Visual languages. Five are from the LogoLounge 2025 Trend Report — a survey
// of 30,000+ marks — plus an explicit "let the studio decide" default, because
// forcing a trend onto every brand is exactly what a real studio would refuse
// to do (a heritage law firm should not get BlurTails).
export const DESIGN_STYLE_OPTIONS: DesignStyleOption[] = [
  {
    id: "studio",
    name: "Studio's choice",
    blurb: "Let the strategy decide the visual language.",
    guidance:
      "No fixed visual trend. Derive the visual language from the brand idea and " +
      "territory — choose the treatment that genuinely serves this brand, not a " +
      "fashionable one.",
  },
  {
    id: "longlegs",
    name: "LongLegs",
    blurb: "Extra-tall letterforms with extended stems.",
    guidance:
      "LONGLEGS: elongated, articulated letterforms. Stems and line segments " +
      "stretch far beyond normal letterform boundaries, bending and extending to " +
      "suggest motion, terrain, or architecture. Exaggerate vertical proportion " +
      "dramatically; keep stroke weight consistent as legs extend. Architectural " +
      "and confident, never flimsy.",
  },
  {
    id: "sprinklers",
    name: "Sprinklers",
    blurb: "Droplet forms, clustered or dispersed.",
    guidance:
      "SPRINKLERS: the water-droplet form as the primary element — classically " +
      "shaped, pointed tip, rounded base. Deploy droplets singly or in clusters, " +
      "uniform or mixed in size, arranged to suggest flow, dispersal, or growth. " +
      "Solid fills; keep the droplet silhouette crisp and unmistakable.",
  },
  {
    id: "blurtails",
    name: "BlurTails",
    blurb: "Ghostly gradient trails suggesting motion.",
    guidance:
      "BLURTAILS: a solid, crisp core form with a directional gradient trail " +
      "wafting off it — a ghost of where it has been. Use a linearGradient fading " +
      "to transparency for the tail; the core stays fully opaque and sharply " +
      "defined. The trail implies speed and direction while the mark is static. " +
      "Keep the trail on ONE consistent axis.",
  },
  {
    id: "typemelts",
    name: "TypeMelts",
    blurb: "Letter pairs fused with rounded bridges.",
    guidance:
      "TYPEMELTS: letterforms rammed together and fused with chunky, rounded " +
      "bridges, ignoring conventional ligature rules — as if the type were made " +
      "of something malleable and had begun to merge. Heavy weight, generous " +
      "rounded joins, tight or negative letterspacing. The fusion must look " +
      "deliberate and molten, never like a rendering error.",
  },
  {
    id: "polygrids",
    name: "PolyGrids",
    blurb: "An ordered grid of varied small forms.",
    guidance:
      "POLYGRIDS: a field of forms on an even x-y cadence, like a chessboard or " +
      "halftone grid — but the cells hold a deliberate mix of shapes (circles, " +
      "stars, crosses, polygons) rather than one repeated unit. Order and " +
      "individuality side by side. Keep the grid spacing strictly regular; let " +
      "the variety live in the forms themselves.",
  },
];

export function markTypeById(id: string | null | undefined): MarkTypeOption | null {
  return MARK_TYPE_OPTIONS.find((m) => m.id === id) ?? null;
}

export function designStyleById(id: string | null | undefined): DesignStyleOption | null {
  return DESIGN_STYLE_OPTIONS.find((s) => s.id === id) ?? null;
}

// The user's Step 4 brief, stored on brands.data.logo_config.
export interface LogoConfig {
  mark_type?: string | null;
  design_style?: string | null;
  instructions?: string | null;
}

export function getLogoConfig(data: unknown): LogoConfig {
  const d = (data ?? {}) as Record<string, unknown>;
  return (d.logo_config as LogoConfig) ?? {};
}

// Render the user's brief as prompt text for the generators.
export function logoConfigContext(config: LogoConfig): string {
  const lines: string[] = [];
  const mark = markTypeById(config.mark_type);
  if (mark) lines.push(`Mark type — every concept must be this type.`, mark.guidance);
  const style = designStyleById(config.design_style);
  if (style && style.id !== "studio") {
    lines.push(``, `Visual language — apply this treatment throughout.`, style.guidance);
  }
  const extra = (config.instructions ?? "").trim();
  if (extra) {
    lines.push(
      ``,
      `The client's additional direction (honor this closely):`,
      extra.slice(0, 1000),
    );
  }
  return lines.join("\n");
}
