import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/lib/legal-page";
import "../styles/design-tokens.css";

export const metadata: Metadata = {
  title: "Fluid — Terms of Service",
  description: "The terms that govern your use of Fluid.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="July 22, 2026"
      intro="This is a plain-language template covering how Fluid works today. It is a starting point and should be reviewed by legal counsel before you rely on it. By creating an account or using Fluid, you agree to these terms."
    >
      <LegalSection heading="1. What Fluid is">
        <p>
          Fluid is an AI-assisted branding tool. You describe an idea, and Fluid drafts brand
          assets — names, color palettes, typography, logos and written guidelines — that you can
          refine and export. Generated assets are produced by AI models and are provided as
          drafts for you to review, edit and adapt.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your account">
        <p>
          You need an account to use Fluid. You are responsible for keeping your login credentials
          secure and for all activity under your account. You must be at least 18 years old, or the
          age of majority where you live, and provide accurate information when you sign up.
        </p>
      </LegalSection>

      <LegalSection heading="3. Tokens, plans and payment">
        <p>
          Fluid uses a token system. Every account starts with a one-time grant of free tokens.
          Generating an asset spends tokens; smaller AI helpers spend fewer. Paid subscriptions
          (Starter and Pro) refill a set number of tokens at the start of each billing month.
        </p>
        <p>
          Subscriptions renew automatically each month until cancelled, and payments are processed
          by Stripe. Unused tokens do not roll over between billing months. Except where required
          by law, payments and partial months are non-refundable. You can cancel anytime from
          Settings → Billing; your plan stays active through the end of the paid period.
        </p>
      </LegalSection>

      <LegalSection heading="4. Ownership of what you create">
        <p>
          As between you and Fluid, you own the brand assets you generate and export, and you are
          free to use them for your own projects, including commercially. You are responsible for
          checking that your chosen names, logos and other assets do not infringe someone else&apos;s
          trademarks or other rights before you use them — AI-generated output is not a substitute
          for a trademark or legal clearance search.
        </p>
      </LegalSection>

      <LegalSection heading="5. Acceptable use">
        <p>
          Don&apos;t use Fluid to create unlawful, infringing, deceptive, or harmful content, to
          impersonate others, or to abuse, reverse-engineer, or disrupt the service. We may suspend
          or terminate accounts that violate these terms or that put the service or other users at
          risk.
        </p>
      </LegalSection>

      <LegalSection heading="6. AI-generated content">
        <p>
          AI output can be inaccurate, generic, or unexpectedly similar to existing material.
          Fluid does not guarantee that generated assets are unique, available to register, or fit
          for any particular purpose. Always review and validate assets before relying on them.
        </p>
      </LegalSection>

      <LegalSection heading="7. Service availability & changes">
        <p>
          We&apos;re actively building Fluid, so features may change, and the service is provided
          &quot;as is&quot; without warranties of any kind. We aim for high availability but do not
          guarantee uninterrupted access. To the fullest extent permitted by law, Fluid is not
          liable for indirect or consequential damages, and our total liability is limited to the
          amount you paid us in the twelve months before the claim.
        </p>
      </LegalSection>

      <LegalSection heading="8. Changes to these terms">
        <p>
          We may update these terms as Fluid evolves. If we make material changes we&apos;ll update
          the date above and, where appropriate, notify you. Continuing to use Fluid after a change
          means you accept the updated terms.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
