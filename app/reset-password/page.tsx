import Link from "next/link";
import { AuthPanel } from "../../components/auth/AuthPanel";
import { AuthForm } from "../../components/auth/AuthForm";
import { createServerAuthClient } from "../../lib/auth/server";
import { verifiedUser } from "../../lib/auth/permissions";

export const dynamic = "force-dynamic";
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  let valid = false;
  if (!params.error) {
    try { await verifiedUser(await createServerAuthClient()); valid = true; } catch { /* Render recovery help. */ }
  }
  return <AuthPanel title="Reset your password" description={valid ? "Choose a new password. You’ll log in again after updating it." : "This reset link is invalid, expired, already used, or was opened in a different browser."}>
    {valid ? <AuthForm mode="reset-password" /> : <Link href="/forgot-password" className="button-primary w-full">Request a new reset link</Link>}
  </AuthPanel>;
}
