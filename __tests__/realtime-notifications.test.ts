import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRealtimeNotification } from "../app/data/notifications/notification";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("Realtime notification broadcasts", () => {
  const migration = source("../supabase/migrations/20260729020000_add_realtime_notifications.sql");

  it("authorizes only the signed-in user's private notification topic", () => {
    expect(migration).toContain(
      "realtime.topic() = 'user:' || auth.uid()::text || ':notifications'",
    );
  });

  it("broadcasts campaign invitations to the invited player", () => {
    expect(migration).toContain("broadcast_campaign_invite_notification");
    expect(migration).toContain("'href', '/data/campaigns'");
    expect(migration).toContain("'user:' || new.user_id::text || ':notifications'");
  });

  it("broadcasts textbox and image reveals with entity links", () => {
    expect(migration).toContain("broadcast_textbox_reveal_notification_trigger");
    expect(migration).toContain("broadcast_image_reveal_notification_trigger");
    expect(migration).toContain("'&entity=' || revealed_entity_id::text");
    expect(migration).toContain("'user:' || target_user_id::text || ':notifications'");
    expect(migration).toContain("'user:' || new.profile_id::text || ':notifications'");
  });
});

describe("Realtime notification client", () => {
  const center = source("../app/data/notifications/notification-center.tsx");
  const tokenRoute = source("../app/api/realtime-token/route.ts");

  it("uses an authenticated private channel without replay", () => {
    expect(center).toContain("realtime.setAuth(data.accessToken)");
    expect(center).toContain("config: { private: true }");
    expect(center).not.toContain("replay:");
  });

  it("returns only a publishable key to the browser", () => {
    expect(tokenRoute).toContain("SUPABASE_PUBLISHABLE_KEY");
    expect(tokenRoute).toContain("SUPABASE_ANON_KEY");
    expect(tokenRoute).not.toContain("SUPABASE_SECRET_KEY");
  });

  it("accepts valid internal destinations", () => {
    expect(
      parseRealtimeNotification({
        kind: "lore_reveal",
        title: "New lore revealed",
        body: "A map was revealed.",
        href: "/data/campaign-lore?campaign=one&entity=two",
      }),
    ).toMatchObject({
      kind: "lore_reveal",
      href: "/data/campaign-lore?campaign=one&entity=two",
    });
  });

  it("rejects malformed or external notification destinations", () => {
    expect(
      parseRealtimeNotification({
        kind: "campaign_invite",
        title: "Invite",
        body: "Join",
        href: "https://example.com",
      }),
    ).toBeNull();
    expect(parseRealtimeNotification({ kind: "unknown" })).toBeNull();
  });
});
