import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupCard } from "@/components/auth/SignupCard";
import "../styles/marketing.css";
import "../styles/auth.css";

export const metadata: Metadata = {
  title: "Fluid — Create your account",
  description: "Create your Fluid account and turn ideas into brand identities.",
};

const PALETTE = ["#44D9C7", "#70DADA", "#B0D2E6", "#FDBBC0", "#FD7947", "#FD9940", "#FDBA50"];

export default function SignupPage() {
  return (
    <AuthShell wordmarkSrc="/assets/uuid/a1be0beb-4f6a-4c7f-b98a-6d628d6d82c9.png" palette={PALETTE}>
      <SignupCard />
    </AuthShell>
  );
}
