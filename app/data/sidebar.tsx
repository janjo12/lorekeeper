"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { label: "Campaigns", href: "/data/campaigns", icon: "campaigns" },
  { label: "My Tags", href: "/data/tags", icon: "tags" },
  { label: "Settings", href: "/data/settings", icon: "settings" },
];

function NavIcon({ name }: { name: string }) {
  if (name === "profile")
    return (
      <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5.5 19c.7-3.4 3-5.25 6.5-5.25S17.8 15.6 18.5 19" />
      </svg>
    );
  if (name === "campaigns")
    return (
      <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5zM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
      </svg>
    );
  if (name === "lore")
    return (
      <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 3.5h11.5A2.5 2.5 0 0 1 19 6v14.5H6.5A2.5 2.5 0 0 1 4 18V4.5A1 1 0 0 1 5 3.5zM6.5 16.5H19M8 7.5h7M8 11h5" />
      </svg>
    );
  if (name === "tags")
    return (
      <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M3.5 12.5V5h7.5l9.5 9.5-6 6z" />
        <circle cx="8" cy="9" r="1.25" />
      </svg>
    );
  return (
    <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function Sidebar({
  username,
  firstCampaignId,
}: {
  username: string;
  firstCampaignId?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="lore-sidebar">
      <div className="lore-sidebar-inner">
        <span className="wordmark">Lorekeeper</span>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <Link
            className={`sidebar-link${pathname === "/data/profile" ? " is-active" : ""}`}
            href="/data/profile"
            aria-current={pathname === "/data/profile" ? "page" : undefined}
            title="Profile"
          >
            <NavIcon name="profile" />
            <span className="nav-label">
              <span>Profile</span>
              <small>{username}</small>
            </span>
          </Link>
          {firstCampaignId && (
            <Link
              className={`sidebar-link${pathname === "/data/campaign-lore" ? " is-active" : ""}`}
              href={`/data/campaign-lore?campaign=${firstCampaignId}`}
              aria-current={pathname === "/data/campaign-lore" ? "page" : undefined}
              title="Campaign Lore"
            >
              <NavIcon name="lore" />
              <span>Campaign Lore</span>
            </Link>
          )}
          {navigationItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                className={`sidebar-link${active ? " is-active" : ""}`}
                href={item.href}
                key={item.label}
                aria-current={active ? "page" : undefined}
                title={item.label}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
