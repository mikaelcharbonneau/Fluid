import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetRequestCard } from "@/components/auth/ResetRequestCard";
import { ResetSetCard } from "@/components/auth/ResetSetCard";
import "../styles/marketing.css";
import "../styles/auth.css";

export const metadata: Metadata = {
  title: "Fluid — Reset password",
  description: "Reset your Fluid password.",
};

const WORDMARK_SRC = "/assets/uuid/6296cd2e-ae6a-496c-af93-47949ff107a2.png";

// With a recovery session (arrived via the email link) show the set-password
// form; otherwise show the request-a-link form.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthShell wordmarkSrc={WORDMARK_SRC}>
      {user ? <ResetSetCard /> : <ResetRequestCard />}
    </AuthShell>
  );
}
