import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth/auth-form";
import { login } from "@/app/auth/actions";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  if (await getSession()) redirect("/data/campaigns");
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">L</div>
        <p className="eyebrow">Your worlds, remembered</p>
        <h1>Welcome to Lorekeeper</h1>
        <p className="auth-copy">Sign in to return to your campaigns and chronicles.</p>
        <AuthForm mode="login" action={login} />
      </section>
    </main>
  );
}
