import Link from "next/link";
import { getCampaignDashboard } from "@/app/dataloader";
import { addCampaign } from "@/app/data/actions";
import { getSession } from "@/lib/session";

type Player = { id: string; username: string };
type OwnedCampaign = { id: string; name: string; user_id: string; players: Player[] };
type JoinedCampaign = { id: string; name: string; user_id: string; gm_username: string };

export default async function CampaignsPage() {
  const session = await getSession();
  const dashboard = session
    ? await getCampaignDashboard(session.userId)
    : { owned: [], joined: [] };
  const owned = dashboard.owned as OwnedCampaign[];
  const joined = dashboard.joined as JoinedCampaign[];

  return (
    <section className="data-panel">
      <p className="eyebrow">Your worlds</p>
      <div className="page-heading">
        <div>
          <h1>Campaigns</h1>
          <p>Manage worlds you run and revisit campaigns you have joined.</p>
        </div>
        <form action={addCampaign} className="inline-create-form">
          <label className="sr-only" htmlFor="campaign-name">
            Campaign name
          </label>
          <input
            id="campaign-name"
            name="name"
            placeholder="New campaign name"
            required
            maxLength={80}
          />
          <button className="primary-button">Create campaign</button>
        </form>
      </div>

      <section className="campaign-section" aria-labelledby="gm-campaigns">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Game master</p>
            <h2 id="gm-campaigns">Campaigns you run</h2>
          </div>
          <span>{owned.length}</span>
        </div>

        {owned.length ? (
          <div className="campaign-grid">
            {owned.map((campaign) => (
              <article className="campaign-card campaign-manage-card" key={campaign.id}>
                <Link
                  className="campaign-card-link"
                  href={`/data/campaign-lore?campaign=${campaign.id}`}
                >
                  <strong>{campaign.name}</strong>
                  <span>Open campaign lore →</span>
                </Link>
                <Link className="campaign-manage-link" href={`/data/campaigns/${campaign.id}`}>
                  Manage campaign
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <h3>No campaigns as GM</h3>
            <p>Create a campaign to become its GM.</p>
          </div>
        )}
      </section>
      <section className="campaign-section" aria-labelledby="player-campaigns">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Player</p>
            <h2 id="player-campaigns">Campaigns you joined</h2>
          </div>
          <span>{joined.length}</span>
        </div>
        {joined.length ? (
          <div className="campaign-grid">
            {joined.map((campaign) => (
              <Link
                className="campaign-card"
                href={`/data/campaign-lore?campaign=${campaign.id}`}
                key={campaign.id}
              >
                <strong>{campaign.name}</strong>
                <span>GM: @{campaign.gm_username}</span>
                <span>Open campaign lore →</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <h3>No player campaigns</h3>
            <p>Campaigns will appear here after a GM adds your username.</p>
          </div>
        )}
      </section>
    </section>
  );
}
