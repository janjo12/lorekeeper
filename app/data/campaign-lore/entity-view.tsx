import Link from "next/link";
import { EntityCreationControls } from "@/app/data/campaign-lore/creation-controls";
import ConfirmDeleteButton from "@/app/components/confirm-delete-button";
import { ActionForm, SubmitButton } from "@/app/components/form-feedback";
import { FormField } from "@/app/components/ui";
import ContentRevealButton from "@/app/data/campaign-lore/content-reveal-button";
import EntityLinks, { type LinkableEntity } from "@/app/data/campaign-lore/entity-links";
import EntityComments from "@/app/data/campaign-lore/entity-comments";
import {
  attachEntityTag,
  editEntity,
  editEntityContent,
  removeEntity,
  removeEntityContent,
} from "@/app/data/actions";

type Category = { id: string; name: string };
type Player = { id: string; username: string };
type EntityData = {
  entity: { id: string; name: string; category_id?: string; campaign_id: string };
  campaign: { id: string; name: string; user_id: string };
  campaign_players: Player[];
  textboxes: Array<{
    id: string;
    name?: string;
    textbox_content: string;
    revealed_to_all: boolean;
    revealed_profile_ids: string[];
  }>;
  images: Array<{
    id: string;
    name?: string;
    storage_path: string;
    signed_url?: string;
    mime_type: string;
    file_size: number;
    original_filename: string;
    revealed_to_all: boolean;
    revealed_profile_ids: string[];
  }>;
  tags: Array<{ id: string; name: string }>;
  available_tags: Array<{ id: string; name: string }>;
  comments: Array<{ id: string; username: string; content: string; created_at: string }>;
};

function ContentActions({
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
      <details className="content-edit">
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
      </details>
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

function ContentVisibilityHeading({
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

export default function EntityView({
  data,
  categories,
  currentUserId,
  isGm,
  linkableEntities,
}: {
  data: EntityData;
  categories: Category[];
  currentUserId: string;
  isGm: boolean;
  linkableEntities: LinkableEntity[];
}) {
  const attached = new Set(data.tags.map((tag) => tag.id));
  return (
    <section className="entity-view">
      <Link className="back-link" href={`/data/campaign-lore?campaign=${data.campaign.id}`}>
        ← {data.campaign.name}
      </Link>
      <header className="entity-view-header">
        <div>
          <p className="eyebrow">Entity</p>
          <h1>{data.entity.name}</h1>
          <div className="tag-list-inline">
            {data.tags.map((tag) => (
              <span className="tag-chip" key={tag.id}>
                {tag.name}
              </span>
            ))}
          </div>
        </div>
        {isGm && (
          <div className="entity-header-actions">
            <details className="edit-details">
              <summary className="secondary-button">Edit entity</summary>
              <ActionForm
                action={editEntity}
                className="edit-entity-form"
                errorMessage="We couldn’t update this entity. Check the details and try again."
              >
                <input type="hidden" name="entityId" value={data.entity.id} />
                <FormField label="Name" variant="material">
                  <input name="name" defaultValue={data.entity.name} required />
                </FormField>
                <FormField label="Category" variant="material">
                  <select name="categoryId" defaultValue={data.entity.category_id || ""}>
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option value={category.id} key={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <SubmitButton variant="filled" pendingLabel="Saving…">
                  Save
                </SubmitButton>
              </ActionForm>
            </details>
            <ActionForm
              action={removeEntity}
              errorMessage="We couldn’t delete this entity. Please try again."
            >
              <input type="hidden" name="entityId" value={data.entity.id} />
              <input type="hidden" name="campaignId" value={data.campaign.id} />
              <ConfirmDeleteButton
                className="secondary-button is-danger"
                warningMessage={`Are you sure you want to delete the entity “${data.entity.name}”? All textboxes and images associated with it will be deleted with it. This cannot be undone.`}
              >
                Delete entity
              </ConfirmDeleteButton>
            </ActionForm>
          </div>
        )}
      </header>
      <div className="entity-images">
        {data.images.map((item) => (
          <figure key={item.id} id={`image-${item.id}`}>
            <header className="content-card-header">
              <ContentVisibilityHeading
                id={item.id}
                type="image"
                name={item.name || "Image"}
                campaignId={data.campaign.id}
                entities={linkableEntities}
                players={data.campaign_players}
                revealedToAll={item.revealed_to_all}
                revealedProfileIds={item.revealed_profile_ids}
                currentUserId={currentUserId}
                isGm={isGm}
              />
              {isGm && (
                <ContentActions
                  id={item.id}
                  type="image"
                  name={item.name || "Image"}
                  value=""
                />
              )}
            </header>
            <div className="entity-image-placeholder">
            {item.signed_url && (
              // Signed Storage URLs expire, so bypassing Next's persistent image
              // optimizer cache keeps the private URL lifecycle predictable.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.signed_url}
                alt={item.name || data.entity.name}
                width={800}
                height={450}
              />
            )}
            </div>
          </figure>
        ))}
      </div>
      <div className="entity-textboxes">
        {data.textboxes.map((box) => (
          <article key={box.id} id={`textbox-${box.id}`}>
            <header className="content-card-header">
              <ContentVisibilityHeading
                id={box.id}
                type="textbox"
                name={box.name || "Notes"}
                campaignId={data.campaign.id}
                entities={linkableEntities}
                players={data.campaign_players}
                revealedToAll={box.revealed_to_all}
                revealedProfileIds={box.revealed_profile_ids}
                currentUserId={currentUserId}
                isGm={isGm}
              />
              {isGm && (
                <ContentActions
                  id={box.id}
                  type="textbox"
                  name={box.name || "Notes"}
                  value={box.textbox_content}
                />
              )}
            </header>
            <p>
              <EntityLinks
                text={box.textbox_content}
                campaignId={data.campaign.id}
                entities={linkableEntities}
              />
            </p>
          </article>
        ))}
      </div>
      {!data.images.length && !data.textboxes.length && (
        <div className="empty-state">
          <h2>No content yet</h2>
          <p>
            {isGm
              ? "Use the create button to add an image or textbox."
              : "No content has been revealed for this entity yet."}
          </p>
        </div>
      )}
      <section className="entity-meta">
        <div>
          <h2>Tags</h2>
          <ActionForm
            action={attachEntityTag}
            className="inline-create-form compact-inline-form"
            errorMessage="We couldn’t add that tag. Please try again."
          >
            <input type="hidden" name="entityId" value={data.entity.id} />
            <select name="tagId" required>
              <option value="">Choose a tag</option>
              {data.available_tags
                .filter((tag) => !attached.has(tag.id))
                .map((tag) => (
                  <option value={tag.id} key={tag.id}>
                    {tag.name}
                  </option>
                ))}
            </select>
            <SubmitButton variant="secondary" pendingLabel="Adding…">
              Add tag
            </SubmitButton>
          </ActionForm>
        </div>
        <EntityComments entityId={data.entity.id} initialComments={data.comments} />
      </section>
      <EntityCreationControls isGm={isGm} entityId={data.entity.id} />
    </section>
  );
}
