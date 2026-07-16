import Link from "next/link";
import { getCampaignsForUser } from "@/app/dataloader";
import { addCampaign } from "@/app/data/actions";
import { getSession } from "@/lib/session";

export default async function CampaignsPage() {
  const session = await getSession();
  const campaigns = session ? await getCampaignsForUser(session.userId) : [];

  return (
    <section className="data-panel">
      <p className="eyebrow">Your worlds</p>
      <div className="page-heading">
        <div><h1>Campaigns</h1><p>Choose a world to continue building its history.</p></div>
        <form action={addCampaign} className="inline-create-form">
          <label className="sr-only" htmlFor="campaign-name">Campaign name</label>
          <input id="campaign-name" name="name" placeholder="New campaign name" required maxLength={80} />
          <button className="primary-button" type="submit">Create campaign</button>
        </form>
      </div>
      {campaigns.length ? (
        <div className="campaign-grid">
          {campaigns.map((campaign: { id: string; name: string }) => (
            <Link className="campaign-card" href={`/data/campaign-lore?campaign=${campaign.id}`} key={campaign.id}>
              <span className="campaign-glyph" aria-hidden="true">L</span>
              <strong>{campaign.name}</strong>
              <span>Open campaign lore →</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state"><h2>No campaigns yet</h2><p>Create your first campaign to begin collecting its lore.</p></div>
      )}
    </section>
  );
}
