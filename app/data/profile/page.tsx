import { logout } from "@/app/auth/actions";
import { getSession } from "@/lib/session";
import ProfileForm from "@/app/data/profile/profile-form";
import { PageHeader } from "@/app/components/ui";
import { SubmitButton } from "@/app/components/form-feedback";
import AiApiManager from "@/app/data/profile/ai-api-manager";
import { getAiApisForUser } from "@/app/dataloader";
import PasswordForm from "@/app/data/profile/password-form";

export default async function ProfilePage() {
  const session = await getSession();
  const aiApis = session ? await getAiApisForUser(session.userId) : [];
  return (
    <section className="data-panel profile-panel">
      <PageHeader eyebrow="Account" title="Profile" />
      <div className="profile-row">
        <span>Email</span>
        <strong>{session?.email}</strong>
      </div>
      {session && <ProfileForm username={session.username} />}
      {session && <PasswordForm />}
      {session && <AiApiManager apis={aiApis} />}
      <div className="danger-zone">
        <div>
          <h2>Sign out</h2>
          <p>End your current Lorekeeper session on this device.</p>
        </div>
        <form action={logout}>
          <SubmitButton variant="secondary" pendingLabel="Signing out…">
            Sign out
          </SubmitButton>
        </form>
      </div>
    </section>
  );
}
