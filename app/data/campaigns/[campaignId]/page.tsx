import Link from "next/link";
import { redirect } from "next/navigation";
import ConfirmDeleteButton from "@/app/components/confirm-delete-button";
import AddPlayerForm from "@/app/data/campaigns/add-player-form";
import { editCampaign, removeCampaign } from "@/app/data/actions";
import { getCampaignDashboard } from "@/app/dataloader";
import { getSession } from "@/lib/session";

type Player = { id: string; username: string };
type OwnedCampaign = { id: string; name: string; user_id: string; players: Player[] };

export default async function CampaignManagementPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const { campaignId } = await params;
  const dashboard = await getCampaignDashboard(session.userId);
  const campaign = (dashboard.owned as OwnedCampaign[]).find((item) => item.id === campaignId);
  if (!campaign) redirect("/data/campaigns");

  return (
    <section className="data-panel campaign-management-page">
      <Link className="back-link" href="/data/campaigns">
        ← Campaigns
      </Link>

      <header className="campaign-management-header">
        <div>
          <p className="eyebrow">Game master</p>
          <h1>{campaign.name}</h1>
          <p>Manage campaign details and player access.</p>
        </div>
        <Link
          className="primary-button campaign-lore-button"
          href={`/data/campaign-lore?campaign=${campaign.id}`}
        >
          Open campaign lore
        </Link>
      </header>

      <div className="campaign-management-grid">
        <section className="management-panel">
          <h2>Campaign details</h2>
          <form action={editCampaign} className="stacked-form">
            <input type="hidden" name="campaignId" value={campaign.id} />
            <label className="material-field">
              <span>Campaign name</span>
              <input name="name" defaultValue={campaign.name} required maxLength={80} />
            </label>
            <button className="secondary-button">Save name</button>
          </form>
        </section>

        <section className="management-panel">
          <h2>Players</h2>
          <p>Add an existing Lorekeeper account using its unique username.</p>
          <AddPlayerForm campaignId={campaign.id} />
          <div className="campaign-player-list">
            <strong>Current players</strong>
            {campaign.players.length ? (
              <ul>
                {campaign.players.map((player) => (
                  <li key={player.id}>@{player.username}</li>
                ))}
              </ul>
            ) : (
              <p>No players added yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="management-panel campaign-delete-panel">
        <div>
          <h2>Delete campaign</h2>
          <p>Permanently delete this campaign and all of its lore. This cannot be undone.</p>
        </div>
        <form action={removeCampaign}>
          <input type="hidden" name="campaignId" value={campaign.id} />
          <ConfirmDeleteButton
            className="danger-button"
            itemName={`the campaign “${campaign.name}”`}
          >
            Delete campaign
          </ConfirmDeleteButton>
        </form>
      </section>
    </section>
  );
}
