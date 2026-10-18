import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPanel } from "../../components/auth/AuthPanel";
import { LogoutButton } from "../../components/auth/LogoutButton";
import { createServerAuthClient } from "../../lib/auth/server";
import { AccessError, requirePermission } from "../../lib/auth/permissions";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  let user;
  try { user = await requirePermission(await createServerAuthClient(), "admin.access"); }
  catch (error) {
    if (error instanceof AccessError && error.status === 401) redirect("/login?next=%2Fadmin");
    return <AuthPanel title={error instanceof AccessError && error.status === 403 ? "Access denied" : "Access unavailable"} description={error instanceof AccessError ? error.message : "We couldn’t verify access. Please try again later."}>
      <LogoutButton />
    </AuthPanel>;
  }
  const name = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  return <AuthPanel title="Admin" description={name ? `Welcome, ${name}.` : "Welcome back."}>
    <p className="mb-2 text-smoke-900">You’re signed in with administrator access.</p>
    <p className="mb-6 text-smoke-800">Your account is ready. Administration tools will be added here as they become available.</p>
    <div className="flex flex-wrap gap-3"><LogoutButton /><Link href="/" className="button-secondary">Go to website</Link></div>
  </AuthPanel>;
}
