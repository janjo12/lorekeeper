import CreateFab from "./create-fab";
import EntityContentFab from "./entity-content-fab";

type Category = { id: string; name: string; parent_category_id?: string | null };
type Entity = { id: string; name: string; category_id?: string | null };

export function CampaignCreationControls({
  isGm,
  campaignId,
  categories,
  entities = [],
  hasAiApi = false,
  selectedCategory,
}: {
  isGm: boolean;
  campaignId: string;
  categories: Category[];
  entities?: Entity[];
  hasAiApi?: boolean;
  selectedCategory?: string;
}) {
  if (!isGm) return null;

  return (
    <CreateFab
      key={selectedCategory ?? "top-level"}
      campaignId={campaignId}
      categories={categories}
      entities={entities}
      hasAiApi={hasAiApi}
      selectedCategory={selectedCategory}
    />
  );
}

export function EntityCreationControls({
  isGm,
  entityId,
  entityContext = { entityName: "", images: [], textboxes: [] },
  hasAiApi = false,
}: {
  isGm: boolean;
  entityId: string;
  entityContext?: {
    entityName: string;
    images: Array<{ name?: string }>;
    textboxes: Array<{ name?: string; textbox_content: string }>;
  };
  hasAiApi?: boolean;
}) {
  if (!isGm) return null;

  return <EntityContentFab entityId={entityId} entityContext={entityContext} hasAiApi={hasAiApi} />;
}
