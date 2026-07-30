import Link from "next/link";
import { addTag } from "@/app/data/actions";
import { getTaggedEntitiesForUser, getTagsForUser } from "@/app/dataloader";
import { getSession } from "@/lib/session";
import { EmptyState, PageHeader } from "@/app/components/ui";
import { ActionForm, SubmitButton } from "@/app/components/form-feedback";

type UserTag = { id: string; name: string };
type TaggedEntity = {
  id: string;
  name: string;
  campaign_id: string;
  campaign_name: string;
};

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const session = await getSession();
  const tags = (session ? await getTagsForUser(session.userId) : []) as UserTag[];
  const { tag: requestedTagId } = await searchParams;
  const selectedTag = tags.find((tag) => tag.id === requestedTagId);
  const entities =
    session && selectedTag
      ? ((await getTaggedEntitiesForUser(session.userId, selectedTag.id)) as TaggedEntity[])
      : [];

  return (
    <section className="data-panel">
      <PageHeader
        eyebrow="Organization"
        title="My Tags"
        description="Create reusable labels for finding related lore across campaigns."
        actions={
          <ActionForm
            action={addTag}
            className="inline-create-form"
            errorMessage="We couldn’t create that tag. Try a different name."
          >
            <input name="name" placeholder="New tag" required maxLength={40} />
            <SubmitButton pendingLabel="Creating…">Create tag</SubmitButton>
          </ActionForm>
        }
      />
      {tags.length ? (
        <>
          <div className="tag-list" aria-label="Tags">
            {tags.map((tag) => (
              <Link
                aria-current={tag.id === selectedTag?.id ? "page" : undefined}
                className="tag-chip"
                href={`/data/tags?tag=${encodeURIComponent(tag.id)}`}
                key={tag.id}
              >
                {tag.name}
              </Link>
            ))}
          </div>
          {selectedTag && (
            <section className="tagged-entities" aria-labelledby="tagged-entities-title">
              <h2 id="tagged-entities-title">Lore tagged “{selectedTag.name}”</h2>
              {entities.length ? (
                <div className="entity-grid">
                  {entities.map((entity) => (
                    <Link
                      className="entity-card"
                      href={`/data/campaign-lore?campaign=${encodeURIComponent(entity.campaign_id)}&entity=${encodeURIComponent(entity.id)}`}
                      key={entity.id}
                    >
                      <h3>{entity.name}</h3>
                      <p>{entity.campaign_name}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState title="No lore uses this tag">
                  Add this tag to an entity and it will appear here.
                </EmptyState>
              )}
            </section>
          )}
        </>
      ) : (
        <EmptyState title="No tags yet">
          Your tags will appear here once you create them.
        </EmptyState>
      )}
    </section>
  );
}
