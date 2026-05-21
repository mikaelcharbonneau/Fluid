import "./globals.css";

export const metadata = {
  title: "Fluid",
  description: "AI-guided brand identity creation.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
