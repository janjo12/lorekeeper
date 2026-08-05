"use client";

import { useEffect, useRef, useState } from "react";
import { addCategory, addLoreEntity } from "@/app/data/actions";
import { Button, DialogActions, FormField } from "@/app/components/ui";
import { ActionForm, SubmitButton } from "@/app/components/form-feedback";

type Category = { id: string; name: string };
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
}: {
  campaignId: string;
  categories: Category[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<CreationMode>(null);
  const firstInput = useRef<HTMLInputElement>(null);

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
    setExpanded(false);
  }

  return (
    <>
      <div className={`create-speed-dial${expanded ? " is-open" : ""}`}>
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
            {mode === "entity" ? (
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
                  <select name="categoryId">
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option value={category.id} key={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
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
                  <select name="parentCategoryId">
                    <option value="">Top-level category</option>
                    {categories.map((category) => (
                      <option value={category.id} key={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
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
