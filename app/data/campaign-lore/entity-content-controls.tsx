import ConfirmDeleteButton from "@/app/components/confirm-delete-button";
import DismissibleDetails from "@/app/components/dismissible-details";
import { ActionForm, SubmitButton } from "@/app/components/form-feedback";
import { FormField } from "@/app/components/ui";
import ContentRevealButton from "@/app/data/campaign-lore/content-reveal-button";
import EntityLinks, { type LinkableEntity } from "@/app/data/campaign-lore/entity-links";
import { editEntityContent, removeEntityContent } from "@/app/data/actions";

type Player = { id: string; username: string };

export function ContentActions({
  id,
  type,
  name,
  value,
}: {
  id: string;
  type: "textbox" | "image";
  name: string;
  value: string;
}) {
  return (
    <div className="content-actions">
      <DismissibleDetails className="content-edit">
        <summary>Edit</summary>
        <ActionForm
          action={editEntityContent}
          className="content-edit-form"
          errorMessage="We couldn’t save this content. Check the details and try again."
        >
          <input type="hidden" name="contentId" value={id} />
          <input type="hidden" name="contentType" value={type} />
          <small>
            Exact, case-sensitive entity names become links when that entity is visible to the
            reader.
          </small>
          <FormField label="Name" variant="material">
            <input name="name" defaultValue={name} required maxLength={80} />
          </FormField>
          {type !== "image" && (
            <FormField label="Content" variant="material">
              <textarea name="value" defaultValue={value} rows={6} required />
            </FormField>
          )}
          <div className="dialog-actions">
            <SubmitButton variant="filled" pendingLabel="Saving…">
              Save
            </SubmitButton>
          </div>
        </ActionForm>
      </DismissibleDetails>
      <ActionForm
        action={removeEntityContent}
        errorMessage={`We couldn’t delete this ${type}. Please try again.`}
      >
        <input type="hidden" name="contentId" value={id} />
        <input type="hidden" name="contentType" value={type} />
        <ConfirmDeleteButton
          className="content-action is-danger"
          itemName={type === "image" ? `the image “${name}”` : `the textbox “${name}”`}
        />
      </ActionForm>
    </div>
  );
}

function RevealIcon({ revealed }: { revealed: boolean }) {
  return (
    <span
      className={`reveal-icon${revealed ? " is-revealed" : " is-hidden"}`}
      title={revealed ? "Revealed" : "Hidden"}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.75" />
        {!revealed && <path d="m4 4 16 16" />}
      </svg>
    </span>
  );
}

export function ContentVisibilityHeading({
  id,
  type,
  name,
  campaignId,
  entities,
  players,
  revealedToAll,
  revealedProfileIds,
  currentUserId,
  isGm,
}: {
  id: string;
  type: "textbox" | "image";
  name: string;
  campaignId: string;
  entities: LinkableEntity[];
  players: Player[];
  revealedToAll: boolean;
  revealedProfileIds: string[];
  currentUserId: string;
  isGm: boolean;
}) {
  const showVisibility = isGm || !revealedToAll;
  const isRevealed = revealedToAll || revealedProfileIds.length > 0;
  return (
    <div className="content-heading-group">
      <div className="content-heading-line">
        {showVisibility && <RevealIcon revealed={isRevealed} />}
        <h2>
          <EntityLinks text={name} campaignId={campaignId} entities={entities} />
        </h2>
        {showVisibility && (
          <ContentRevealButton
            contentId={id}
            contentType={type}
            players={players}
            revealedToAll={revealedToAll}
            revealedProfileIds={revealedProfileIds}
            canChangeReveal={isGm}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </div>
  );
}
