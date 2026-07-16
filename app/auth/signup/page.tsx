import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth/auth-form";
import { signup } from "@/app/auth/actions";
import { getSession } from "@/lib/session";

export default async function SignupPage() {
  if (await getSession()) redirect("/data/campaigns");
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">L</div>
        <p className="eyebrow">Begin a new chronicle</p>
        <h1>Create your account</h1>
        <p className="auth-copy">Keep every character, place, and secret close at hand.</p>
        <AuthForm mode="signup" action={signup} />
      </section>
    </main>
  );
}
