import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/app/data/sidebar";
import ThemeShell from "@/app/theme-shell";
import { getCampaignsForUser } from "@/app/dataloader";

export default async function DataLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const campaigns = await getCampaignsForUser(session.userId);

  return (
    <ThemeShell>
      <Sidebar username={session.username} firstCampaignId={campaigns[0]?.id} />
      <div className="lore-content">{children}</div>
    </ThemeShell>
  );
}
