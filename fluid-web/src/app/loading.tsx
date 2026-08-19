// Matches the page background exactly (no flash) while a route segment's
// data is loading — mainly reset-password, which awaits a Supabase session
// check before choosing which form to render.
export default function Loading() {
  return <div style={{ minHeight: "100dvh", background: "var(--bg, #FAFAFB)" }} aria-hidden="true" />;
}
