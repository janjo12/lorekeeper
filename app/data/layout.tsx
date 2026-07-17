import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/app/data/sidebar";
import ThemeShell from "@/app/theme-shell";
import { getCampaignsForUser, getUserPreferences } from "@/app/dataloader";

export default async function DataLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const [campaigns, preferences] = await Promise.all([
    getCampaignsForUser(session.userId),
    getUserPreferences(session.userId),
  ]);

  return (
    <ThemeShell initialTheme={preferences.theme_setting} userId={session.userId}>
      <Sidebar username={session.username} firstCampaignId={campaigns[0]?.id} />
      <div className="lore-content">{children}</div>
    </ThemeShell>
  );
}
