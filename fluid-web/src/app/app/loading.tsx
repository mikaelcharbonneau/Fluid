// Shown while the client-only route surface downloads and mounts. Matches the
// app shell background so there is no flash or layout shift during navigation.
export default function AppLoading() {
  return <div style={{ minHeight: "100dvh", background: "var(--bg, #FAFAFB)" }} aria-hidden="true" />;
}
