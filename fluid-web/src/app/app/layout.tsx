import type { Metadata } from "next";
import { AppProviders } from "./_state/app-providers";
import "../styles/prototype.css";

export const metadata: Metadata = {
  title: "Fluid",
};

// Server component: the route shell itself is no longer forced client-only
// (#175). Only the providers below it — and each route's screen — are.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
