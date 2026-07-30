import CreateFab from "./create-fab";
import EntityContentFab from "./entity-content-fab";

type Category = { id: string; name: string };

export function CampaignCreationControls({
  isGm,
  campaignId,
  categories,
}: {
  isGm: boolean;
  campaignId: string;
  categories: Category[];
}) {
  if (!isGm) return null;

  return <CreateFab campaignId={campaignId} categories={categories} />;
}

export function EntityCreationControls({
  isGm,
  entityId,
}: {
  isGm: boolean;
  entityId: string;
}) {
  if (!isGm) return null;

  return <EntityContentFab entityId={entityId} />;
}
