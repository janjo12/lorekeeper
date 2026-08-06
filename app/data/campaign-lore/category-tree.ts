export type TreeCategory = {
  id: string;
  name: string;
  parent_category_id?: string | null;
};

export function childCategories(categories: TreeCategory[], parentId?: string) {
  return categories.filter((category) => (category.parent_category_id || undefined) === parentId);
}

export function categoryAncestorIds(categories: TreeCategory[], categoryId?: string) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const ancestors: string[] = [];
  const visited = new Set<string>();
  let parentId = categoryId ? byId.get(categoryId)?.parent_category_id : undefined;

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    ancestors.unshift(parentId);
    parentId = byId.get(parentId)?.parent_category_id;
  }

  return ancestors;
}
