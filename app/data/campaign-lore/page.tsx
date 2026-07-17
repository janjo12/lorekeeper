import SideCategories from "@/app/data/campaign-lore/side-categories";
import CreateFab from "@/app/data/campaign-lore/create-fab";
import EntityView from "@/app/data/campaign-lore/entity-view";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCampaignLore, getCampaignsForUser, getEntityView } from "@/app/dataloader";
import { getSession } from "@/lib/session";

type LoreCategory = { id: string; name: string; parent_category_id?: string | null };
type LoreEntity = { id: string; name: string; category_id?: string | null };
type AccessibleCampaign = { id: string; name: string; user_id: string };

export default async function CampaignLorePage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string; category?: string; entity?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const params = await searchParams;
  const campaigns = (await getCampaignsForUser(session.userId)) as AccessibleCampaign[];
  if (!campaigns.length) redirect("/data/campaigns");
  const campaignId = campaigns.some((campaign) => campaign.id === params.campaign)
    ? params.campaign!
    : campaigns[0].id;
  const lore = await getCampaignLore(campaignId, session.userId);
  if (!lore) redirect("/data/campaigns");
  const categories = lore.categories as LoreCategory[];
  const allEntities = lore.entities as LoreEntity[];
  const entities = params.category
    ? allEntities.filter((entity) => entity.category_id === params.category)
    : allEntities;
  if (params.entity) {
    const entityData = await getEntityView(params.entity, session.userId);
    if (entityData?.entity?.campaign_id === campaignId)
      return (
        <EntityView data={entityData} categories={categories} currentUserId={session.userId} />
      );
  }

  return (
    <div className="lore-browser">
      <SideCategories
        campaignId={campaignId}
        categories={categories}
        selectedCategory={params.category}
      />
      <section className="data-panel lore-entities" id="all-lore">
        <p className="eyebrow">Archive</p>
        <div className="page-heading">
          <div>
            <h1>{lore.campaign.name}</h1>
            <p>Browse the people, places, and secrets in this world.</p>
          </div>
        </div>
        {entities.length ? (
          <div className="entity-grid">
            {entities.map((entity) => (
              <Link
                className="entity-card"
                href={`/data/campaign-lore?campaign=${campaignId}&entity=${entity.id}`}
                key={entity.id}
              >
                <h2>{entity.name}</h2>
                <p>
                  {categories.find((category) => category.id === entity.category_id)?.name ??
                    "Uncategorized"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>No lore entries yet</h2>
            <p>Create an entity or choose another category.</p>
          </div>
        )}
        <CreateFab campaignId={campaignId} categories={categories} />
      </section>
    </div>
  );
}
