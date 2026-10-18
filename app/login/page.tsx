import { AuthPanel } from "../../components/auth/AuthPanel";
import { AuthForm } from "../../components/auth/AuthForm";
import { safeReturnPath } from "../../lib/auth/config";

export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const params = await searchParams;
  return <AuthPanel title="Welcome back" description="Log in to your Big Matt’s BBQ account.">
    {params.reset === "success" && <p role="status" className="mb-5 text-gold-300">Your password has been updated. Log in with your new password.</p>}
    <AuthForm mode="login" next={safeReturnPath(params.next)} />
  </AuthPanel>;
}
