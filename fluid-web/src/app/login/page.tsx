import type { Metadata } from "next";
import { fragment } from "@/lib/fragment";
import { bootstrapScript } from "@/lib/client-script";
import "../styles/marketing.css";
import "../styles/auth.css";

export const metadata: Metadata = {
  title: "Fluid — Log in",
  description: "Log in to your Fluid account.",
};

export default function LoginPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: fragment("login") }} />
      <script dangerouslySetInnerHTML={{ __html: bootstrapScript("/scripts/login.js") }} />
    </>
  );
}
