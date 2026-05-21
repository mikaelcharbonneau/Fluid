export interface StepMeta {
  number: string;
  title: string;
  body: string;
  accent: string;
}

export interface StyleOption {
  id: string;
  title: string;
  body: string;
}

export interface LogoConcept {
  id: string;
  label: string;
}

export interface KitItem {
  id: string;
  title: string;
  body: string;
  art: string;
}

export const stepMeta: StepMeta[] = [
  {
    number: "01",
    title: "Brand Basics",
    body: "Tell us more about your vision.",
    accent: "linear-gradient(180deg, #31d5b5 0%, #5bd5e6 100%)",
  },
  {
    number: "02",
    title: "Brand Style",
    body: "Choose a style direction.",
    accent: "linear-gradient(180deg, #62c9ff 0%, #7fd8ff 100%)",
  },
  {
    number: "03",
    title: "Brand Name",
    body: "Find the perfect name.",
    accent: "linear-gradient(180deg, #a06cff 0%, #d28cff 100%)",
  },
  {
    number: "04",
    title: "Brand Logo",
    body: "Generate an original logo.",
    accent: "linear-gradient(180deg, #ff4545 0%, #ff5f73 100%)",
  },
  {
    number: "05",
    title: "Brand Kit",
    body: "Obtain your complete brand kit.",
    accent: "linear-gradient(180deg, #ff8b2f 0%, #ffad38 100%)",
  },
];

export const styleOptions: StyleOption[] = [
  {
    id: "modern",
    title: "Modern",
    body: "Clean, fresh, and forward-looking with a contemporary edge.",
  },
  { id: "minimal", title: "Minimal", body: "Simple, elegant, and focused on clarity and purpose." },
  { id: "bold", title: "Bold", body: "Strong, confident, and designed to stand out." },
  { id: "classic", title: "Classic", body: "Timeless, traditional, and professionally trusted." },
  { id: "playful", title: "Playful", body: "Fun, friendly, and full of personality." },
  { id: "luxurious", title: "Luxurious", body: "Premium, sophisticated, and high-end in feel." },
];

export const defaultNameSuggestions: string[] = [
  "ClarityFlow",
  "Lumiq",
  "Intentra",
  "Novaform",
  "Mindscape",
  "Peakora",
  "Virelo",
  "Elevan",
];

export const logoConcepts: LogoConcept[] = [
  { id: "spark", label: "ClarityFlow" },
  { id: "cube", label: "ClarityFlow" },
  { id: "loop", label: "ClarityFlow" },
  { id: "monogram", label: "ClarityFlow" },
];

export const kitItems: KitItem[] = [
  {
    id: "logo-suite",
    title: "Logo Suite",
    body: "Primary, horizontal, icon, and monochrome versions.",
    art: "spark",
  },
  {
    id: "color-palette",
    title: "Color Palette",
    body: "Primary and secondary colors with usage guidelines.",
    art: "palette",
  },
  {
    id: "typography",
    title: "Typography",
    body: "Heading and body fonts with scale and hierarchy.",
    art: "type",
  },
  {
    id: "brand-assets",
    title: "Brand Assets",
    body: "Gradients, patterns, and graphic elements.",
    art: "bubbles",
  },
  {
    id: "guidelines",
    title: "Guidelines",
    body: "Logo usage, color rules, typography, and tone of voice.",
    art: "book",
  },
];
