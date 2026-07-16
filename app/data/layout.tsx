import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/app/data/sidebar";
import ThemeShell from "@/app/theme-shell";

export default async function DataLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  return (
    <ThemeShell>
      <Sidebar username={session.username} />
      <div className="lore-content">{children}</div>
    </ThemeShell>
  );
}
