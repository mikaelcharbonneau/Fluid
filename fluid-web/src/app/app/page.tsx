import { ScreenFallback } from "./_kit/screen-fallback";
import { LegacyHashRedirect } from "./legacy-hash-redirect";

// /app itself renders nothing: it exists to forward both the bare URL and the
// pre-#175 /app#<route> links to their real route. Server component — the
// only client code here is the fragment reader.
export default function AppEntry() {
  return (
    <>
      <LegacyHashRedirect />
      <ScreenFallback />
    </>
  );
}
