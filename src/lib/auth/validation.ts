// Client-side validation for the auth forms. This runs before we call Supabase
// so users get instant, friendly feedback; Supabase still enforces its own
// rules server-side as the source of truth.

export type AuthMode = "signin" | "signup" | "reset" | "update";

export interface CredentialInput {
  email: string;
  password: string;
  confirmPassword?: string;
}

/**
 * Returns a single user-facing message for the first problem found, or null
 * when the input is acceptable.
 *
 * Modes:
 *  - "signin"  email + password (existing account)
 *  - "signup"  email + password + confirmPassword (new account)
 *  - "reset"   email only (request a reset link)
 *  - "update"  password + confirmPassword (set a new password; no email)
 */
export function validateCredentials(mode: AuthMode, input: CredentialInput): string | null {
  const email = input.email.trim();

  if (mode !== "update" && !email) return "Enter your email address.";
  if (mode === "reset") return null; // a reset request only needs an email

  if (!input.password) return "Enter your password.";
  if ((mode === "signup" || mode === "update") && input.password.length < 6) {
    return "Use at least 6 characters for your password.";
  }
  if ((mode === "signup" || mode === "update") && input.password !== input.confirmPassword) {
    return "Passwords do not match.";
  }

  // TODO(you): add the rules that shape your signup/reset UX. Suggestions:
  //   - optionally a stricter email format check than the browser's `type=email`
  // Return a single user-facing string for the first failure, or null when OK.

  return null;
}
