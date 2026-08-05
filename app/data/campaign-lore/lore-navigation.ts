export function campaignLoreIndexHref(campaignId: string, categoryId?: string) {
  const search = new URLSearchParams({ campaign: campaignId });
  if (categoryId) search.set("category", categoryId);
  return `/data/campaign-lore?${search.toString()}`;
}
