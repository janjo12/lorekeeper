import { EmptyState, SectionHeader } from "@/app/components/ui";
import { ActionForm, SubmitButton } from "@/app/components/form-feedback";
import { acceptCampaignInvitation, rejectCampaignInvitation } from "@/app/data/actions";
import type { IncomingInvite } from "@/app/data/campaigns/campaign-dashboard";

export default function CampaignInvites({ invites = [] }: { invites?: IncomingInvite[] }) {
  return (
    <section className="campaign-section campaign-invites" aria-labelledby="campaign-invites">
      <SectionHeader
        eyebrow="Invitations"
        title="Invites to join campaigns"
        titleId="campaign-invites"
        count={invites.length}
      />
      {invites.length ? (
        <div className="campaign-invite-list">
          {invites.map((invite) => (
            <article className="campaign-invite" key={invite.campaign_id}>
              <div>
                <strong>{invite.campaign_name}</strong>
                <span>Invited by @{invite.gm_username}</span>
              </div>
              <div className="campaign-invite-actions">
                <ActionForm
                  action={acceptCampaignInvitation}
                  errorMessage="We couldn’t accept this invitation. Refresh and try again."
                >
                  <input type="hidden" name="campaignId" value={invite.campaign_id} />
                  <SubmitButton pendingLabel="Accepting…">Accept</SubmitButton>
                </ActionForm>
                <ActionForm
                  action={rejectCampaignInvitation}
                  errorMessage="We couldn’t reject this invitation. Refresh and try again."
                >
                  <input type="hidden" name="campaignId" value={invite.campaign_id} />
                  <SubmitButton variant="secondary" pendingLabel="Rejecting…">
                    Reject
                  </SubmitButton>
                </ActionForm>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState compact headingLevel={3} title="No pending invitations">
          Invitations from campaign GMs will appear here.
        </EmptyState>
      )}
    </section>
  );
}
