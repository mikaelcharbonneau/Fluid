// The original design-export bundle shared values across its concatenated
// <script> tags by hanging them off `window`, and Prototype.tsx inherited
// that. #175 split that file into real modules, so every one of those shims
// is gone: the router, toast and brand-draft context are imported normally
// now, and `__fluidSettingsTab` — which existed only because /app#settings
// had nowhere to carry a tab — is a `?tab=` search param.
//
// Kept as a file rather than deleted so this note survives: if a `window.X`
// appears in app code again, it belongs in a module, not here.
export {};
