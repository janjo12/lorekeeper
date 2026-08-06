"use client";

import { useActionState } from "react";
import { FormField } from "@/app/components/ui";
import { FormMessage, SubmitButton } from "@/app/components/form-feedback";
import { inviteCampaignPlayerWithState } from "@/app/data/actions";

export default function AddPlayerForm({ campaignId }: { campaignId: string }) {
  const [state, action, pending] = useActionState(inviteCampaignPlayerWithState, {});
  return (
    <form action={action} className="stacked-form">
      <input type="hidden" name="campaignId" value={campaignId} />
      <FormField label="Invite player by username" variant="material">
        <input name="username" placeholder="unique_username" required maxLength={32} />
      </FormField>
      <label className="checkbox-row">
        <input type="checkbox" name="sendEmail" value="true" />
        Email this player about the invitation
      </label>
      <SubmitButton variant="secondary" disabled={pending} pendingLabel="Sending…">
        Send invitation
      </SubmitButton>
      <FormMessage success={state.success}>{state.message}</FormMessage>
    </form>
  );
}
