import type { Metadata } from "next";
import "./styles/design-tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fluid — From idea to identity",
  description:
    "Fluid turns a one-line brief into a complete brand identity: name, logo, palette, type and guidelines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The marketing page's inline bootstrap script (src/app/page.tsx) adds
    // `js-reveal` to <html> synchronously, before Next's hydration script
    // even attaches — deliberately, so the reveal-on-scroll CSS activates
    // independent of hydration completing at all (a failed Next chunk in
    // Safari was once observed to stall hydration entirely, which left the
    // whole page blank without this). marketing.js does the equivalent for
    // `custom-cursor`/`loaded` on <body>. Both are intentional,
    // progressive-enhancement-only class additions that never affect server-
    // rendered content — narrowly suppressing the resulting (expected)
    // attribute mismatch here is the documented exception fix step 5 of
    // #173 calls for, not a blanket workaround.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
      <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async />
    </html>
  );
}
