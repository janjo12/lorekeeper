"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { label: "Campaigns", href: "/data/campaigns" },
  { label: "My Tags", href: "/data/tags" },
  { label: "Settings", href: "/data/settings" },
];

export default function Sidebar({ username, firstCampaignId }: { username: string; firstCampaignId?: string }) {
  const pathname = usePathname();

  return (
    <aside className="lore-sidebar">
      <span className="wordmark">Lorekeeper</span>
      <nav className="sidebar-nav" aria-label="Main navigation">
        <Link
          className={`sidebar-link${pathname === "/data/profile" ? " is-active" : ""}`}
          href="/data/profile"
          aria-current={pathname === "/data/profile" ? "page" : undefined}
        >
            <span className="nav-icon" aria-hidden="true" />
            <span className="nav-label"><span>Profile</span><small>{username}</small></span>
        </Link>
        {firstCampaignId && (
          <Link
            className={`sidebar-link${pathname === "/data/campaign-lore" ? " is-active" : ""}`}
            href={`/data/campaign-lore?campaign=${firstCampaignId}`}
            aria-current={pathname === "/data/campaign-lore" ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true" />
            <span>Campaign Lore</span>
          </Link>
        )}
        {navigationItems.map((item) => (
          <Link
            className={`sidebar-link${pathname === item.href ? " is-active" : ""}`}
            href={item.href}
            key={item.label}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
