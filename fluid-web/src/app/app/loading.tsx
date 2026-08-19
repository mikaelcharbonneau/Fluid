// Shown while the client-only product bundle (Prototype.jsx, loaded via
// next/dynamic with ssr:false) downloads and mounts. Matches
// prototype.css's shell background so there's no flash or layout shift once
// the real UI takes over.
export default function AppLoading() {
  return <div style={{ minHeight: "100dvh", background: "var(--bg, #FAFAFB)" }} aria-hidden="true" />;
}
