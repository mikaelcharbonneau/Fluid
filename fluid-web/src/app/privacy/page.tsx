import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/lib/legal-page";
import "../styles/design-tokens.css";

export const metadata: Metadata = {
  title: "Fluid — Privacy Policy",
  description: "How Fluid collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 22, 2026"
      intro="This is a plain-language template describing the data Fluid handles today. It is a starting point and should be reviewed by legal counsel before you rely on it. It explains what we collect, why, and who we share it with."
    >
      <LegalSection heading="1. Information we collect">
        <p>
          <strong>Account details</strong> — your name, email address, and password (stored
          securely, hashed) when you sign up, or your basic profile if you sign in with Google.
        </p>
        <p>
          <strong>Your content</strong> — the briefs, prompts, and brand projects you create,
          along with the assets Fluid generates for you.
        </p>
        <p>
          <strong>Billing information</strong> — your subscription tier and token balance. Card
          details are collected and stored by Stripe, our payment processor — Fluid never sees or
          stores your full card number.
        </p>
        <p>
          <strong>Basic usage data</strong> — standard server logs and error reports we use to keep
          the service running and to fix problems.
        </p>
      </LegalSection>

      <LegalSection heading="2. How we use your information">
        <p>
          We use your information to provide Fluid: to authenticate you, generate and save your
          brand assets, track and refill your tokens, process payments, and support you. We also use
          aggregated, non-identifying usage data to improve the product.
        </p>
      </LegalSection>

      <LegalSection heading="3. Service providers we share with">
        <p>
          We rely on a small set of trusted providers to run Fluid, and we share only what each
          needs to do its job:
        </p>
        <p>
          <strong>Anthropic</strong> — your briefs and prompts are sent to Anthropic&apos;s Claude
          models to generate brand assets. <strong>Supabase</strong> — hosts our database and
          authentication (your account and projects). <strong>Stripe</strong> — processes
          subscription payments. <strong>Vercel</strong> — hosts and serves the application.
        </p>
        <p>
          We do not sell your personal information, and we do not share it for third-party
          advertising.
        </p>
      </LegalSection>

      <LegalSection heading="4. Data retention">
        <p>
          We keep your account and content for as long as your account is active. If you delete a
          brand, it&apos;s removed from your workspace. If you close your account, we delete or
          anonymize your personal data within a reasonable period, except where we need to retain
          limited records to meet legal or accounting obligations.
        </p>
      </LegalSection>

      <LegalSection heading="5. Your choices and rights">
        <p>
          You can view and edit your profile, delete individual brands, and cancel your subscription
          from within the app. Depending on where you live, you may have rights to access, correct,
          export, or delete your personal data. To make a request, email us at the address below and
          we&apos;ll respond within the time required by applicable law.
        </p>
      </LegalSection>

      <LegalSection heading="6. Security">
        <p>
          We use industry-standard measures — encrypted connections, hashed passwords, and
          access controls — to protect your data. No system is perfectly secure, but we work to
          safeguard your information and to address issues promptly if they arise.
        </p>
      </LegalSection>

      <LegalSection heading="7. Children">
        <p>
          Fluid is not intended for anyone under 18, and we do not knowingly collect personal
          information from children.
        </p>
      </LegalSection>

      <LegalSection heading="8. Changes to this policy">
        <p>
          We may update this policy as Fluid evolves. If we make material changes we&apos;ll update
          the date above and, where appropriate, notify you.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
