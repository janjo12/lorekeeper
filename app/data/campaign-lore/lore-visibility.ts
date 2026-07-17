export type LoreCategory = {
  id: string;
  name: string;
  parent_category_id?: string | null;
};

export type LoreEntity = {
  id: string;
  name: string;
  category_id?: string | null;
};

export type RevealView = {
  entity?: { id: string };
  textboxes?: unknown[];
  images?: unknown[];
};

export function getRevealedEntities(entities: LoreEntity[], views: RevealView[]) {
  const revealedIds = new Set(
    views
      .filter((view) => Boolean(view.textboxes?.length || view.images?.length))
      .flatMap((view) => (view.entity?.id ? [view.entity.id] : [])),
  );
  return entities.filter((entity) => revealedIds.has(entity.id));
}

export function getVisibleCategories(categories: LoreCategory[], entities: LoreEntity[]) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const visibleIds = new Set(
    entities.flatMap((entity) => (entity.category_id ? [entity.category_id] : [])),
  );

  for (const categoryId of [...visibleIds]) {
    let parentId = categoryById.get(categoryId)?.parent_category_id;
    const visited = new Set<string>();
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      visibleIds.add(parentId);
      parentId = categoryById.get(parentId)?.parent_category_id;
    }
  }

  return categories.filter((category) => visibleIds.has(category.id));
}
