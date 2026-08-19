import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/MarketingPage";
import "./styles/marketing.css";

export const metadata: Metadata = {
  title: "Fluid — From idea to identity",
  description:
    "Your idea enters as a sentence. It leaves as a brand — strategy, naming, logo, palette, type, and guidelines, generated as one cohesive system.",
};

export default function Home() {
  return <MarketingPage />;
}
