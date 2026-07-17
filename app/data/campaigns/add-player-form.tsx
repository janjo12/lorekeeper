"use client";

import { useActionState } from "react";
import { inviteCampaignPlayerWithState } from "@/app/data/actions";

export default function AddPlayerForm({ campaignId }: { campaignId: string }) {
  const [state, action, pending] = useActionState(inviteCampaignPlayerWithState, {});
  return (
    <form action={action} className="stacked-form">
      <input type="hidden" name="campaignId" value={campaignId} />
      <label className="material-field">
        <span>Add player by username</span>
        <input name="username" placeholder="unique_username" required maxLength={32} />
      </label>
      <button className="secondary-button" disabled={pending}>
        {pending ? "Adding…" : "Add player"}
      </button>
      {state.message && (
        <p className={state.success ? "form-success" : "form-error"} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
