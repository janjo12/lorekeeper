import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { getSession } from "@/lib/session";

export default async function LorePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <main className="lore-shell">
      <nav className="lore-nav">
        <span className="wordmark">Lorekeeper</span>
        <form action={logout}><button className="text-button" type="submit">Sign out</button></form>
      </nav>
      <section className="welcome-panel">
        <p className="eyebrow">The archive is open</p>
        <h1>Welcome, {session.username}</h1>
        <p>Your authenticated lore workspace is ready for the campaign features to come.</p>
      </section>
    </main>
  );
}
