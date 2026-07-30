import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth/auth-form";
import { login } from "@/app/auth/actions";
import { getSession } from "@/lib/session";
import { AuthCard } from "@/app/components/ui";

export default async function LoginPage() {
  if (await getSession()) redirect("/data/campaigns");
  return (
    <AuthCard
      eyebrow="Your worlds, remembered"
      title="Welcome to Lorekeeper"
      description="Sign in to return to your campaigns and chronicles."
    >
      <AuthForm mode="login" action={login} />
    </AuthCard>
  );
}
