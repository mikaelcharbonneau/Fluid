import type { Metadata } from "next";
import { fragment } from "@/lib/fragment";
import { createClient } from "@/lib/supabase/server";
import { bootstrapScript } from "@/lib/client-script";
import "../styles/marketing.css";
import "../styles/auth.css";

export const metadata: Metadata = {
  title: "Fluid — Reset password",
  description: "Reset your Fluid password.",
};

// With a recovery session (arrived via the email link) show the set-password
// form; otherwise show the request-a-link form.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const frag = user ? "reset-set" : "reset-request";

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: fragment(frag) }} />
      <script dangerouslySetInnerHTML={{ __html: bootstrapScript("/scripts/reset-password.js") }} />
    </>
  );
}
