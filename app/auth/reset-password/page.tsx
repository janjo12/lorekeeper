import { AuthCard } from "@/app/components/ui";
import ResetPasswordForm from "@/app/auth/reset-password/reset-password-form";

export default function ResetPasswordPage() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return <AuthCard eyebrow="Account recovery" title="Choose a new password" description="Use at least eight characters for your new password."><ResetPasswordForm supabaseUrl={supabaseUrl} publishableKey={publishableKey} /></AuthCard>;
}
