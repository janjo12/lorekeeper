import SideCategories from "@/app/data/campaign-lore/side-categories";
import { CampaignCreationControls } from "@/app/data/campaign-lore/creation-controls";
import EntityView from "@/app/data/campaign-lore/entity-view";
import LoreSearch from "@/app/data/campaign-lore/lore-search";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getAiApisForUser,
  getCampaignLore,
  getCampaignsForUser,
  getEntityView,
} from "@/app/dataloader";
import { getSession } from "@/lib/session";
import { type LoreCategory, type LoreEntity } from "@/app/data/campaign-lore/lore-visibility";
import { EmptyState, PageHeader } from "@/app/components/ui";
import { campaignLoreIndexHref } from "@/app/data/campaign-lore/lore-navigation";

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
  const allCategories = lore.categories as LoreCategory[];
  const campaignEntities = lore.entities as LoreEntity[];
  const isGm = lore.campaign.user_id === session.userId;
  const hasAiApi = isGm && (await getAiApisForUser(session.userId)).length > 0;
  const visibleEntities = campaignEntities;
  const categories = allCategories;
  const selectedCategory = categories.some((category) => category.id === params.category)
    ? params.category
    : undefined;
  const entities = selectedCategory
    ? visibleEntities.filter((entity) => entity.category_id === selectedCategory)
    : visibleEntities;
  if (params.entity) {
    const mayViewEntity = visibleEntities.some((entity) => entity.id === params.entity);
    if (!mayViewEntity) redirect(campaignLoreIndexHref(campaignId, selectedCategory));
    const entityData = await getEntityView(params.entity, session.userId);
    if (!entityData || entityData.entity?.campaign_id !== campaignId) {
      redirect(campaignLoreIndexHref(campaignId, selectedCategory));
    }
    return (
      <div className="lore-browser lore-entity-browser">
        <SideCategories
          key={entityData.entity.category_id ?? "all"}
          campaignId={campaignId}
          categories={categories}
          selectedCategory={entityData.entity.category_id ?? undefined}
          isGm={isGm}
        />
        <EntityView
          data={entityData}
          categories={categories}
          currentUserId={session.userId}
          isGm={isGm}
          linkableEntities={visibleEntities.filter((entity) => entity.id !== entityData.entity.id)}
          hasAiApi={hasAiApi}
        />
      </div>
    );
  }

  return (
    <div className="lore-browser">
      <SideCategories
        key={selectedCategory ?? "all"}
        campaignId={campaignId}
        categories={categories}
        selectedCategory={selectedCategory}
        isGm={isGm}
      />
      <section className="data-panel lore-entities" id="all-lore">
        <LoreSearch
          campaignId={campaignId}
          userId={session.userId}
          entities={visibleEntities}
          categories={categories}
          manifest={lore.visibility_manifest ?? { textbox_ids: [], image_ids: [] }}
        />
        <PageHeader
          eyebrow="Archive"
          title={lore.campaign.name}
          description="Browse the people, places, and secrets in this world."
        />
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
          <EmptyState title="No lore entries yet">
            {isGm
              ? "Create an entity or choose another category."
              : "No lore has been revealed here yet. Choose another category."}
          </EmptyState>
        )}
        <CampaignCreationControls
          isGm={isGm}
          campaignId={campaignId}
          categories={categories}
          entities={visibleEntities}
          hasAiApi={hasAiApi}
          selectedCategory={selectedCategory}
        />
      </section>
    </div>
  );
}
