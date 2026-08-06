"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { changeCategoryParent, removeCategory } from "@/app/data/actions";
import { ActionForm, SubmitButton } from "@/app/components/form-feedback";

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
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16, width: 384 });
  const [portalRoot, setPortalRoot] = useState<Element | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const invalidParents = descendantIds(category.id, categories);
  invalidParents.add(category.id);

  const placePanel = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(384, window.innerWidth - 32);
    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const left = Math.min(
      Math.max(16, rect.left - 16),
      Math.max(16, window.innerWidth - width - 16),
    );
    let top = rect.bottom + 6;
    if (panelHeight && top + panelHeight > window.innerHeight - 16) {
      top = Math.max(16, rect.top - panelHeight - 6);
    }
    setPosition({ left, top, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const root = triggerRef.current?.closest(".lore-shell") ?? document.body;
    if (root !== portalRoot) {
      setPortalRoot(root);
      return;
    }
    placePanel();
  }, [open, placePanel, portalRoot]);

  useEffect(() => {
    if (!open) return;

    function dismissFromOutside(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !triggerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", dismissFromOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    return () => {
      document.removeEventListener("pointerdown", dismissFromOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
    };
  }, [open, placePanel]);

  const panel = open ? (
    <div
      className="category-actions-panel"
      id={`category-actions-${category.id}`}
      ref={panelRef}
      role="dialog"
      aria-label={`Manage ${category.name}`}
      style={position}
    >
        <ActionForm
          action={changeCategoryParent}
          errorMessage="We couldn’t move this category. Please try again."
        >
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
          <SubmitButton variant="secondary" pendingLabel="Moving…">
            Move
          </SubmitButton>
        </ActionForm>

        <ActionForm
          action={removeCategory}
          errorMessage="We couldn’t delete this category. Please try again."
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
          <SubmitButton className="is-danger" variant="secondary" pendingLabel="Deleting…">
            Delete category
          </SubmitButton>
        </ActionForm>
    </div>
  ) : null;

  return (
    <div className="category-actions">
      <button
        aria-controls={`category-actions-${category.id}`}
        aria-expanded={open}
        aria-label={`Manage ${category.name}`}
        className="category-actions-trigger"
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        •••
      </button>
      {panel && portalRoot && createPortal(panel, portalRoot)}
    </div>
  );
}
