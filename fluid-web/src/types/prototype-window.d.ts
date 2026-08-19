// Prototype.jsx (now Prototype.tsx) attaches a handful of values to `window`
// at module load instead of importing/exporting them normally — a leftover
// of how the original design-export bundle shared state across its
// concatenated <script> tags. Centralizing the declarations here (per
// issue #169's fix step 6) makes every one of these compatibility shims
// visible in one place, typed loosely as `any` since they're slated for
// removal as Prototype.tsx's screens get extracted into real modules
// (#175) rather than for precise typing now.
//
// Reviewed: RouterProvider/useRouter/ROUTE_META/makeProtoToast (Prototype's
// internal hash router + toast helper) and useBrandDraft/BrandDraftProvider
// (brand-state context) are assigned in Prototype.tsx itself. AppleHero/
// FigmaHero/PerplexityHero/TeslaHero are read but never assigned anywhere
// in this codebase — dead reads left over from a "dir-a-canvas.jsx" module
// referenced only in a comment, which does not exist in this repo. Left
// typed rather than removed: the reads are inert (always undefined) but
// removing them is a behavioral change outside this issue's scope.
export {};

declare global {
  interface Window {
    __fluidSettingsTab?: string;
    RouterProvider?: any;
    useRouter?: any;
    ROUTE_META?: any;
    makeProtoToast?: any;
    useBrandDraft?: any;
    BrandDraftProvider?: any;
    AppleHero?: any;
    FigmaHero?: any;
    PerplexityHero?: any;
    TeslaHero?: any;
  }
}
