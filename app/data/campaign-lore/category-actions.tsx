"use client";

import { changeCategoryParent, removeCategory } from "@/app/data/actions";

type Category = {
  id: string;
  name: string;
  parent_category_id?: string | null;
};

function descendantIds(categoryId: string, categories: Category[]) {
  const descendants = new Set<string>();
  const visit = (parentId: string) => {
    for (const category of categories) {
      if (category.parent_category_id === parentId && !descendants.has(category.id)) {
        descendants.add(category.id);
        visit(category.id);
      }
    }
  };
  visit(categoryId);
  return descendants;
}

export default function CategoryActions({
  category,
  categories,
}: {
  category: Category;
  categories: Category[];
}) {
  const invalidParents = descendantIds(category.id, categories);
  invalidParents.add(category.id);

  return (
    <details className="category-actions">
      <summary aria-label={`Manage ${category.name}`}>•••</summary>
      <div className="category-actions-panel">
        <form action={changeCategoryParent}>
          <input type="hidden" name="categoryId" value={category.id} />
          <label className="material-field">
            <span>Move category to</span>
            <select name="parentCategoryId" defaultValue={category.parent_category_id || ""}>
              <option value="">No category</option>
              {categories
                .filter((candidate) => !invalidParents.has(candidate.id))
                .map((candidate) => (
                  <option value={candidate.id} key={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
            </select>
          </label>
          <button className="secondary-button">Move</button>
        </form>

        <form
          action={removeCategory}
          onSubmit={(event) => {
            const formData = new FormData(event.currentTarget);
            const deletingContents = formData.get("deleteContents") === "true";
            const warning = deletingContents
              ? `Delete “${category.name}” and everything in it? All entities, textboxes, images, and the contents of every subcategory will be deleted without further prompts. This cannot be undone.`
              : `Delete “${category.name}”? Its entities and subcategories will be moved to its parent category, or to no category if it has no parent.`;
            if (!window.confirm(warning)) event.preventDefault();
          }}
        >
          <input type="hidden" name="categoryId" value={category.id} />
          <fieldset>
            <legend>When deleting this category</legend>
            <label>
              <input type="radio" name="deleteContents" value="false" defaultChecked />
              Move its entities and subcategories to its parent
            </label>
            <label>
              <input type="radio" name="deleteContents" value="true" />
              Delete everything inside it
            </label>
          </fieldset>
          <p className="danger-note">
            Deleting contents also deletes everything in all subcategories without further prompts.
          </p>
          <button className="secondary-button is-danger" type="submit">
            Delete category
          </button>
        </form>
      </div>
    </details>
  );
}
