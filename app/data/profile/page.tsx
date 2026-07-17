import { logout } from "@/app/auth/actions";
import { getSession } from "@/lib/session";
import ProfileForm from "@/app/data/profile/profile-form";

export default async function ProfilePage() {
  const session = await getSession();
  return (
    <section className="data-panel profile-panel">
      <p className="eyebrow">Account</p>
      <h1>Profile</h1>
      <div className="profile-row">
        <span>Email</span>
        <strong>{session?.email}</strong>
      </div>
      {session && <ProfileForm username={session.username} />}
      <div className="danger-zone">
        <div>
          <h2>Sign out</h2>
          <p>End your current Lorekeeper session on this device.</p>
        </div>
        <form action={logout}>
          <button className="secondary-button" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </section>
  );
}
