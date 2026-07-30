export type Player = { id: string; username: string };
export type PendingInvite = { id: string; username: string };
export type OwnedCampaign = {
  id: string;
  name: string;
  user_id: string;
  players: Player[];
  pending_invites: PendingInvite[];
};
export type IncomingInvite = {
  campaign_id: string;
  campaign_name: string;
  gm_username: string;
};
export type JoinedCampaign = {
  id: string;
  name: string;
  user_id: string;
  gm_username: string;
};

export type CampaignDashboard = {
  owned: OwnedCampaign[];
  incoming_invites: IncomingInvite[];
  joined: JoinedCampaign[];
};

function arrayOrEmpty<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeCampaignDashboard(value: unknown): CampaignDashboard {
  const dashboard = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const owned = arrayOrEmpty<
    Omit<OwnedCampaign, "players" | "pending_invites"> & {
      players?: unknown;
      pending_invites?: unknown;
    }
  >(dashboard.owned).map((campaign) => ({
    ...campaign,
    players: arrayOrEmpty<Player>(campaign.players),
    pending_invites: arrayOrEmpty<PendingInvite>(campaign.pending_invites),
  }));

  return {
    owned,
    incoming_invites: arrayOrEmpty<IncomingInvite>(dashboard.incoming_invites),
    joined: arrayOrEmpty<JoinedCampaign>(dashboard.joined),
  };
}
