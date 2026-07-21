import type { Metadata } from "next";
import { fragment } from "@/lib/fragment";
import { bootstrapScript } from "@/lib/client-script";
import "../styles/marketing.css";
import "../styles/auth.css";

export const metadata: Metadata = {
  title: "Fluid — Create your account",
  description: "Create your Fluid account and turn ideas into brand identities.",
};

export default function SignupPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: fragment("signup") }} />
      <script dangerouslySetInnerHTML={{ __html: bootstrapScript("/scripts/signup.js") }} />
    </>
  );
}
