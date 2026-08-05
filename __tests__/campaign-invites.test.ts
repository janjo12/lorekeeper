import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeCampaignDashboard } from "../app/data/campaigns/campaign-dashboard";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("campaign invitation database flow", () => {
  const migration = source(
    "../supabase/migrations/20260729010000_add_pending_campaign_invites.sql",
  );

  it("stores one pending invitation per campaign and user", () => {
    expect(migration).toMatch(
      /create table public\.pending_campaign_invites[\s\S]*campaign_id uuid not null[\s\S]*user_id uuid not null[\s\S]*primary key \(campaign_id, user_id\)/,
    );
  });

  it("provides separate functions for adding and removing invitations", () => {
    expect(migration).toContain("function public.add_pending_campaign_invite(");
    expect(migration).toContain("function public.remove_pending_campaign_invite(");
  });

  it("accepts an invitation by deleting it before adding campaign membership atomically", () => {
    const acceptFunction = migration.match(
      /create or replace function public\.accept_campaign_invite\([\s\S]*?\n\$\$;/,
    )?.[0];

    expect(acceptFunction).toBeDefined();
    expect(acceptFunction).toMatch(/delete from public\.pending_campaign_invites/);
    expect(acceptFunction).toMatch(/insert into public\.campaign_player/);
    expect(acceptFunction!.indexOf("delete from")).toBeLessThan(
      acceptFunction!.indexOf("insert into"),
    );
  });

  it("removes the obsolete direct-add function", () => {
    expect(migration).toContain(
      "drop function if exists public.add_campaign_player(uuid, uuid, text)",
    );
  });
});

describe("campaign invitation dashboard", () => {
  const page = source("../app/data/campaigns/page.tsx");
  const invites = source("../app/data/campaigns/campaign-invites.tsx");

  it("places incoming invitations between owned and joined campaigns", () => {
    const ownedIndex = page.indexOf('id="gm-campaigns"');
    const invitesIndex = page.indexOf("<CampaignInvites");
    const joinedIndex = page.indexOf('id="player-campaigns"');

    expect(ownedIndex).toBeGreaterThan(-1);
    expect(invitesIndex).toBeGreaterThan(ownedIndex);
    expect(joinedIndex).toBeGreaterThan(invitesIndex);
  });

  it("shows the campaign and GM and provides accept and reject actions", () => {
    expect(invites).toContain("{invite.campaign_name}");
    expect(invites).toContain("@{invite.gm_username}");
    expect(invites).toContain("action={acceptCampaignInvitation}");
    expect(invites).toContain("action={rejectCampaignInvitation}");
  });

  it("shows outgoing pending invitations on owned campaign cards", () => {
    expect(page).toContain("Outgoing invites");
    expect(page).toContain("campaign.pending_invites");
  });

  it("places the campaign title above three distinct peer action surfaces", () => {
    expect(page.indexOf("<h3>{campaign.name}</h3>")).toBeLessThan(
      page.indexOf('className="campaign-card-actions"'),
    );
    expect(page).toContain('className="campaign-card-action campaign-open-lore"');
    expect(page).toContain('className="campaign-card-action campaign-manage-link"');
    expect(page).toContain('className="campaign-card-action outgoing-invites"');
  });

  it("normalizes legacy and partial dashboard payloads before rendering", () => {
    expect(normalizeCampaignDashboard(undefined)).toEqual({
      owned: [],
      incoming_invites: [],
      joined: [],
    });

    expect(
      normalizeCampaignDashboard({
        owned: [{ id: "campaign-1", name: "Old payload", user_id: "gm-1" }],
        joined: undefined,
      }),
    ).toEqual({
      owned: [
        {
          id: "campaign-1",
          name: "Old payload",
          user_id: "gm-1",
          players: [],
          pending_invites: [],
        },
      ],
      incoming_invites: [],
      joined: [],
    });
  });
});
