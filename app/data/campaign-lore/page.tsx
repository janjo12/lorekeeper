import SideCategories from "@/app/data/campaign-lore/side-categories";
import { redirect } from "next/navigation";
import { getCampaignLore, getCampaignsForUser } from "@/app/dataloader";
import { addCategory, addLoreEntity } from "@/app/data/actions";
import { getSession } from "@/lib/session";

type LoreCategory = { id: string; name: string; parent_category_id?: string | null };
type LoreEntity = { id: string; name: string; category_id?: string | null };
type AccessibleCampaign = { id: string; name: string; user_id: string };

export default async function CampaignLorePage({ searchParams }: { searchParams: Promise<{ campaign?: string; category?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const params = await searchParams;
  const campaigns = await getCampaignsForUser(session.userId) as AccessibleCampaign[];
  if (!campaigns.length) redirect("/data/campaigns");
  const campaignId = campaigns.some((campaign) => campaign.id === params.campaign) ? params.campaign! : campaigns[0].id;
  const lore = await getCampaignLore(campaignId, session.userId);
  if (!lore) redirect("/data/campaigns");
  const categories = lore.categories as LoreCategory[];
  const allEntities = lore.entities as LoreEntity[];
  const entities = params.category ? allEntities.filter((entity) => entity.category_id === params.category) : allEntities;

  return (
    <div className="lore-browser">
      <SideCategories campaignId={campaignId} categories={categories} selectedCategory={params.category} />
      <section className="data-panel lore-entities" id="all-lore">
        <p className="eyebrow">Archive</p>
        <div className="page-heading"><div><h1>{lore.campaign.name}</h1><p>Browse the people, places, and secrets in this world.</p></div></div>
        <form action={addLoreEntity} className="inline-create-form entity-create-form">
          <input type="hidden" name="campaignId" value={campaignId} />
          <label className="sr-only" htmlFor="entity-name">Entity name</label><input id="entity-name" name="name" placeholder="New entity name" required maxLength={80} />
          <select name="categoryId" aria-label="Category"><option value="">No category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>
          <button className="primary-button" type="submit">Create entity</button>
        </form>
        <form action={addCategory} className="inline-create-form category-create-form">
          <label className="sr-only" htmlFor="category-name">Category name</label>
          <input id="category-name" name="name" placeholder="New category name" required maxLength={80} />
          <select name="parentCategoryId" aria-label="Parent category">
            <option value="">Top-level category</option>
            {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
          </select>
          <button className="secondary-button" type="submit">Create category</button>
        </form>
        {entities.length ? <div className="entity-grid">{entities.map((entity) => <article className="entity-card" key={entity.id}><span className="campaign-glyph">E</span><h2>{entity.name}</h2><p>{categories.find((category) => category.id === entity.category_id)?.name ?? "Uncategorized"}</p></article>)}</div> : <div className="empty-state"><h2>No lore entries yet</h2><p>Create an entity or choose another category.</p></div>}
      </section>
    </div>
  );
}
