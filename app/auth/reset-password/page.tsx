import ResetPasswordCard from "@/app/auth/reset-password/reset-password-card";

export default function ResetPasswordPage() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return <ResetPasswordCard supabaseUrl={supabaseUrl} publishableKey={publishableKey} />;
}
