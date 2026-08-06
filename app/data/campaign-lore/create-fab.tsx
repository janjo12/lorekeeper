"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addCategory, addLoreEntity } from "@/app/data/actions";
import { Button, DialogActions, FormField } from "@/app/components/ui";
import { ActionForm, SubmitButton } from "@/app/components/form-feedback";
import { useDismissOnOutside } from "@/app/components/use-dismiss-on-outside";
import CategoryTreePicker from "@/app/data/campaign-lore/category-tree-picker";
import AiCreationForm, { AiModeButton } from "@/app/data/campaign-lore/ai-creation-form";

type Category = { id: string; name: string; parent_category_id?: string | null };
type Entity = { id: string; name: string; category_id?: string | null };
type CreationMode = "entity" | "category" | null;

function PlusIcon({ close = false }: { close?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`material-icon${close ? " is-close" : ""}`}
      viewBox="0 0 24 24"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function EntityIcon() {
  return (
    <svg aria-hidden="true" className="material-icon" viewBox="0 0 24 24">
      <path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function CategoryIcon() {
  return (
    <svg aria-hidden="true" className="material-icon" viewBox="0 0 24 24">
      <path d="M3.5 7.5h7l2-2h8v13h-17z" />
    </svg>
  );
}

export default function CreateFab({
  campaignId,
  categories,
  entities,
  hasAiApi,
  selectedCategory,
}: {
  campaignId: string;
  categories: Category[];
  entities: Entity[];
  hasAiApi: boolean;
  selectedCategory?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<CreationMode>(null);
  const [aiMode, setAiMode] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);
  const closeCreationMenu = useCallback(() => setExpanded(false), []);
  const speedDialRef = useDismissOnOutside<HTMLDivElement>(expanded, closeCreationMenu);

  useEffect(() => {
    if (mode) firstInput.current?.focus();
  }, [mode]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (mode) setMode(null);
        else setExpanded(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mode]);

  function openDialog(nextMode: Exclude<CreationMode, null>) {
    setMode(nextMode);
    setAiMode(false);
    setExpanded(false);
  }

  return (
    <>
      <div className={`create-speed-dial${expanded ? " is-open" : ""}`} ref={speedDialRef}>
        <div className="fab-actions" aria-hidden={!expanded}>
          <button
            className="fab-action"
            onClick={() => openDialog("category")}
            tabIndex={expanded ? 0 : -1}
            type="button"
          >
            <CategoryIcon />
            <span>New category</span>
          </button>
          <button
            className="fab-action"
            onClick={() => openDialog("entity")}
            tabIndex={expanded ? 0 : -1}
            type="button"
          >
            <EntityIcon />
            <span>New entity</span>
          </button>
        </div>
        <button
          aria-expanded={expanded}
          aria-label={expanded ? "Close creation menu" : "Create new"}
          className="create-fab"
          onClick={() => setExpanded((open) => !open)}
          type="button"
        >
          <PlusIcon close={expanded} />
        </button>
      </div>

      {mode && (
        <div className="dialog-scrim" onMouseDown={() => setMode(null)}>
          <section
            aria-labelledby="creation-dialog-title"
            aria-modal="true"
            className="creation-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="dialog-icon">
              {mode === "entity" ? <EntityIcon /> : <CategoryIcon />}
            </div>
            <h2 id="creation-dialog-title">Create {mode}</h2>
            <p>
              {mode === "entity"
                ? "Add a new entry to this campaign's archive."
                : "Add a category for organizing your lore."}
            </p>
            <AiModeButton
              active={aiMode}
              disabled={!hasAiApi}
              onClick={() => setAiMode((active) => !active)}
            />
            {aiMode ? (
              <AiCreationForm
                kind={mode}
                action={mode === "entity" ? addLoreEntity : addCategory}
                context={(formData) => {
                  if (mode === "category") {
                    return {
                      existingCategories: categories.map((category) => ({
                        name: category.name,
                        parent:
                          categories.find((parent) => parent.id === category.parent_category_id)
                            ?.name ?? null,
                      })),
                    };
                  }
                  const categoryId = String(formData.get("categoryId") ?? "");
                  const byId = new Map(categories.map((category) => [category.id, category]));
                  const categoryPath: string[] = [];
                  const visited = new Set<string>();
                  let currentId: string | null | undefined = categoryId || null;
                  while (currentId && !visited.has(currentId)) {
                    visited.add(currentId);
                    const category = byId.get(currentId);
                    if (!category) break;
                    categoryPath.unshift(category.name);
                    currentId = category.parent_category_id;
                  }
                  return {
                    categoryPath,
                    existingEntityNames: entities
                      .filter((entity) => (entity.category_id ?? "") === categoryId)
                      .map((entity) => entity.name),
                  };
                }}
                onCancel={() => setMode(null)}
                onSuccess={() => setMode(null)}
              >
                <input type="hidden" name="campaignId" value={campaignId} />
                <FormField
                  label={mode === "entity" ? "Category" : "Parent category"}
                  variant="material"
                >
                  <CategoryTreePicker
                    categories={categories}
                    defaultValue={selectedCategory}
                    name={mode === "entity" ? "categoryId" : "parentCategoryId"}
                    topLevelLabel={mode === "entity" ? "No category" : "Top-level category"}
                  />
                </FormField>
              </AiCreationForm>
            ) : mode === "entity" ? (
              <ActionForm
                action={addLoreEntity}
                className="dialog-form"
                errorMessage="We couldn’t create that entity. Check the details and try again."
                onSuccess={() => setMode(null)}
              >
                <input type="hidden" name="campaignId" value={campaignId} />
                <FormField label="Entity name" variant="material">
                  <input ref={firstInput} name="name" required maxLength={80} />
                </FormField>
                <FormField label="Category" variant="material">
                  <CategoryTreePicker
                    categories={categories}
                    defaultValue={selectedCategory}
                    name="categoryId"
                    topLevelLabel="No category"
                  />
                </FormField>
                <DialogActions>
                  <Button variant="text" onClick={() => setMode(null)}>
                    Cancel
                  </Button>
                  <SubmitButton variant="filled" pendingLabel="Creating…">
                    Create entity
                  </SubmitButton>
                </DialogActions>
              </ActionForm>
            ) : (
              <ActionForm
                action={addCategory}
                className="dialog-form"
                errorMessage="We couldn’t create that category. Check the details and try again."
                onSuccess={() => setMode(null)}
              >
                <input type="hidden" name="campaignId" value={campaignId} />
                <FormField label="Category name" variant="material">
                  <input ref={firstInput} name="name" required maxLength={80} />
                </FormField>
                <FormField label="Parent category" variant="material">
                  <CategoryTreePicker
                    categories={categories}
                    defaultValue={selectedCategory}
                    name="parentCategoryId"
                    topLevelLabel="Top-level category"
                  />
                </FormField>
                <DialogActions>
                  <Button variant="text" onClick={() => setMode(null)}>
                    Cancel
                  </Button>
                  <SubmitButton variant="filled" pendingLabel="Creating…">
                    Create category
                  </SubmitButton>
                </DialogActions>
              </ActionForm>
            )}
          </section>
        </div>
      )}
    </>
  );
}
