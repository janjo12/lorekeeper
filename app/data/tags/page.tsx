import { addTag } from "@/app/data/actions";
import { getTagsForUser } from "@/app/dataloader";
import { getSession } from "@/lib/session";

type UserTag = { id: string; name: string };

export default async function TagsPage() {
  const session = await getSession();
  const tags = (session ? await getTagsForUser(session.userId) : []) as UserTag[];
  return (
    <section className="data-panel">
      <p className="eyebrow">Organization</p>
      <div className="page-heading"><div><h1>My Tags</h1><p>Create reusable labels for finding related lore across campaigns.</p></div><form action={addTag} className="inline-create-form"><input name="name" placeholder="New tag" required maxLength={40} /><button className="primary-button" type="submit">Create tag</button></form></div>
      {tags.length ? <div className="tag-list">{tags.map((tag) => <span className="tag-chip" key={tag.id}>{tag.name}</span>)}</div> : <div className="empty-state"><h2>No tags yet</h2><p>Your tags will appear here once you create them.</p></div>}
    </section>
  );
}
