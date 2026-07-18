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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
