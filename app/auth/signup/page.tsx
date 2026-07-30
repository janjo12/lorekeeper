import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth/auth-form";
import { signup } from "@/app/auth/actions";
import { getSession } from "@/lib/session";
import { AuthCard } from "@/app/components/ui";

export default async function SignupPage() {
  if (await getSession()) redirect("/data/campaigns");
  return (
    <AuthCard
      eyebrow="Begin a new chronicle"
      title="Create your account"
      description="Keep every character, place, and secret close at hand."
    >
      <AuthForm mode="signup" action={signup} />
    </AuthCard>
  );
}
