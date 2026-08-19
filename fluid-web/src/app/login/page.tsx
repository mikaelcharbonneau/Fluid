import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginCard } from "@/components/auth/LoginCard";
import "../styles/marketing.css";
import "../styles/auth.css";

export const metadata: Metadata = {
  title: "Fluid — Log in",
  description: "Log in to your Fluid account.",
};

export default function LoginPage() {
  return (
    <AuthShell wordmarkSrc="/assets/uuid/6296cd2e-ae6a-496c-af93-47949ff107a2.png">
      <LoginCard />
    </AuthShell>
  );
}
