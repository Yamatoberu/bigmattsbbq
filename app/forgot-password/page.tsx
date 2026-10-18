import { AuthPanel } from "../../components/auth/AuthPanel";
import { AuthForm } from "../../components/auth/AuthForm";

export default function ForgotPasswordPage() {
  return <AuthPanel title="Forgot your password?" description="Enter your email and we’ll send a reset link. Open the link in this same browser.">
    <AuthForm mode="forgot-password" />
  </AuthPanel>;
}
