import Link from "next/link";
import { PageHeader } from "@/app/components/ui";
import { ActionForm, SubmitButton } from "@/app/components/form-feedback";
import { addCampaign } from "@/app/data/actions";
import CampaignSection from "@/app/data/campaigns/campaign-section";
import CampaignInvites from "@/app/data/campaigns/campaign-invites";
import { normalizeCampaignDashboard } from "@/app/data/campaigns/campaign-dashboard";
import { getCampaignDashboard } from "@/app/dataloader";
import { getSession } from "@/lib/session";

export default async function CampaignsPage() {
  const session = await getSession();
  const dashboard = normalizeCampaignDashboard(
    session ? await getCampaignDashboard(session.userId) : null,
  );
  const { owned, incoming_invites: incomingInvites, joined } = dashboard;

  return (
    <section className="data-panel">
      <PageHeader
        eyebrow="Your worlds"
        title="Campaigns"
        description="Manage worlds you run and revisit campaigns you have joined."
        actions={
          <ActionForm
            action={addCampaign}
            className="inline-create-form compact-inline-form campaign-create-form"
            errorMessage="We couldn’t create that campaign. Check the name and try again."
          >
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
            <SubmitButton pendingLabel="Creating…">Create campaign</SubmitButton>
          </ActionForm>
        }
      />

      <CampaignSection
        id="gm-campaigns"
        eyebrow="Game master"
        title="Campaigns you run"
        count={owned.length}
        emptyTitle="No campaigns as GM"
        emptyDescription="Create a campaign to become its GM."
      >
        {owned.map((campaign) => (
          <article className="campaign-card campaign-manage-card" key={campaign.id}>
            <h3>{campaign.name}</h3>
            <div className="campaign-card-actions">
              <Link
                className="campaign-card-action campaign-open-lore"
                href={`/data/campaign-lore?campaign=${campaign.id}`}
              >
                Open lore
              </Link>
              <Link
                className="campaign-card-action campaign-manage-link"
                href={`/data/campaigns/${campaign.id}`}
              >
                Manage campaign
              </Link>
              <div className="campaign-card-action outgoing-invites">
                <strong>Outgoing invites</strong>
                {campaign.pending_invites.length ? (
                  <ul>
                    {campaign.pending_invites.map((invite) => (
                      <li key={invite.id}>@{invite.username}</li>
                    ))}
                  </ul>
                ) : (
                  <span>No outstanding invitations</span>
                )}
              </div>
            </div>
          </article>
        ))}
      </CampaignSection>

      <CampaignInvites invites={incomingInvites} />

      <CampaignSection
        id="player-campaigns"
        eyebrow="Player"
        title="Campaigns you joined"
        count={joined.length}
        emptyTitle="No player campaigns"
        emptyDescription="Campaigns will appear here after a GM adds your username."
      >
        {joined.map((campaign) => (
          <Link
            className="campaign-card"
            href={`/data/campaign-lore?campaign=${campaign.id}`}
            key={campaign.id}
          >
            <strong>{campaign.name}</strong>
            <span>GM: @{campaign.gm_username}</span>
            <span className="campaign-open-label">Open lore →</span>
          </Link>
        ))}
      </CampaignSection>
    </section>
  );
}
