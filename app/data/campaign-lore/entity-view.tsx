import Link from "next/link";
import Image from "next/image";
import EntityContentFab from "@/app/data/campaign-lore/entity-content-fab";
import ConfirmDeleteButton from "@/app/components/confirm-delete-button";
import ContentRevealButton from "@/app/data/campaign-lore/content-reveal-button";
import {
  attachEntityTag,
  createEntityComment,
  editEntity,
  editEntityContent,
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
    image_url: string;
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
  players,
  revealedToAll,
  revealedProfileIds,
}: {
  id: string;
  type: "textbox" | "image";
  name: string;
  value: string;
  players: Player[];
  revealedToAll: boolean;
  revealedProfileIds: string[];
}) {
  return (
    <div className="content-actions">
      <details className="content-edit">
        <summary>Edit</summary>
        <form action={editEntityContent} className="content-edit-form">
          <input type="hidden" name="contentId" value={id} />
          <input type="hidden" name="contentType" value={type} />
          <label className="material-field">
            <span>Name</span>
            <input name="name" defaultValue={name} required maxLength={80} />
          </label>
          <label className="material-field">
            <span>{type === "image" ? "Image URL" : "Content"}</span>
            {type === "image" ? (
              <input name="value" defaultValue={value} type="url" required />
            ) : (
              <textarea name="value" defaultValue={value} rows={6} required />
            )}
          </label>
          <div className="dialog-actions">
            <button className="filled-action">Save</button>
          </div>
        </form>
      </details>
      <ContentRevealButton
        contentId={id}
        contentType={type}
        players={players}
        revealedToAll={revealedToAll}
        revealedProfileIds={revealedProfileIds}
      />
      <form action={removeEntityContent}>
        <input type="hidden" name="contentId" value={id} />
        <input type="hidden" name="contentType" value={type} />
        <ConfirmDeleteButton
          className="content-action is-danger"
          itemName={type === "image" ? `the image “${name}”` : `the textbox “${name}”`}
        />
      </form>
    </div>
  );
}

export default function EntityView({
  data,
  categories,
  currentUserId,
}: {
  data: EntityData;
  categories: Category[];
  currentUserId: string;
}) {
  const attached = new Set(data.tags.map((tag) => tag.id));
  const isGm = data.campaign.user_id === currentUserId;
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
          <details className="edit-details">
            <summary className="secondary-button">Edit entity</summary>
            <form action={editEntity} className="edit-entity-form">
              <input type="hidden" name="entityId" value={data.entity.id} />
              <label className="material-field">
                <span>Name</span>
                <input name="name" defaultValue={data.entity.name} required />
              </label>
              <label className="material-field">
                <span>Category</span>
                <select name="categoryId" defaultValue={data.entity.category_id || ""}>
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="filled-action">Save</button>
            </form>
          </details>
        )}
      </header>
      <div className="entity-images">
        {data.images.map((item) => (
          <figure key={item.id}>
            <header className="content-card-header">
              <h2>{item.name || "Image"}</h2>
              {isGm && (
                <ContentActions
                  id={item.id}
                  type="image"
                  name={item.name || "Image"}
                  value={item.image_url}
                  players={data.campaign_players}
                  revealedToAll={item.revealed_to_all}
                  revealedProfileIds={item.revealed_profile_ids}
                />
              )}
            </header>
            <Image
              src={item.image_url}
              alt={item.name || data.entity.name}
              width={800}
              height={450}
              unoptimized
            />
          </figure>
        ))}
      </div>
      <div className="entity-textboxes">
        {data.textboxes.map((box) => (
          <article key={box.id}>
            <header className="content-card-header">
              <h2>{box.name || "Notes"}</h2>
              {isGm && (
                <ContentActions
                  id={box.id}
                  type="textbox"
                  name={box.name || "Notes"}
                  value={box.textbox_content}
                  players={data.campaign_players}
                  revealedToAll={box.revealed_to_all}
                  revealedProfileIds={box.revealed_profile_ids}
                />
              )}
            </header>
            <p>{box.textbox_content}</p>
          </article>
        ))}
      </div>
      {!data.images.length && !data.textboxes.length && (
        <div className="empty-state">
          <h2>No content yet</h2>
          <p>Use the create button to add an image or textbox.</p>
        </div>
      )}
      <section className="entity-meta">
        <div>
          <h2>Tags</h2>
          <form action={attachEntityTag} className="inline-create-form">
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
            <button className="secondary-button">Add tag</button>
          </form>
        </div>
        <div>
          <h2>Comments</h2>
          <form action={createEntityComment} className="comment-form">
            <input type="hidden" name="entityId" value={data.entity.id} />
            <textarea name="content" placeholder="Add a comment" required rows={3} />
            <button className="filled-action">Comment</button>
          </form>
          <div className="comments">
            {data.comments.map((comment) => (
              <article key={comment.id}>
                <strong>{comment.username}</strong>
                <p>{comment.content}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      {isGm && <EntityContentFab entityId={data.entity.id} />}
    </section>
  );
}
