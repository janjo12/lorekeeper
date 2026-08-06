import CreateFab from "./create-fab";
import EntityContentFab from "./entity-content-fab";

type Category = { id: string; name: string; parent_category_id?: string | null };

export function CampaignCreationControls({
  isGm,
  campaignId,
  categories,
  selectedCategory,
}: {
  isGm: boolean;
  campaignId: string;
  categories: Category[];
  selectedCategory?: string;
}) {
  if (!isGm) return null;

  return (
    <CreateFab
      key={selectedCategory ?? "top-level"}
      campaignId={campaignId}
      categories={categories}
      selectedCategory={selectedCategory}
    />
  );
}

export function EntityCreationControls({ isGm, entityId }: { isGm: boolean; entityId: string }) {
  if (!isGm) return null;

  return <EntityContentFab entityId={entityId} />;
}
