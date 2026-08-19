export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="auth-error">{message}</p>;
}
