import { logout } from "@/app/auth/actions";
import { getSession } from "@/lib/session";

export default async function ProfilePage() {
  const session = await getSession();
  return (
    <section className="data-panel profile-panel">
      <p className="eyebrow">Account</p>
      <h1>Profile</h1>
      <div className="profile-row"><span>Username</span><strong>{session?.username}</strong></div>
      <div className="danger-zone"><div><h2>Sign out</h2><p>End your current Lorekeeper session on this device.</p></div><form action={logout}><button className="secondary-button" type="submit">Sign out</button></form></div>
    </section>
  );
}
