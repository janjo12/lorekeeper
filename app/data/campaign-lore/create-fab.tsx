"use client";

import { useEffect, useRef, useState } from "react";
import { addCategory, addLoreEntity } from "@/app/data/actions";

type Category = { id: string; name: string };
type CreationMode = "entity" | "category" | null;

function PlusIcon({ close = false }: { close?: boolean }) {
  return (
    <svg aria-hidden="true" className={`material-icon${close ? " is-close" : ""}`} viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function EntityIcon() {
  return <svg aria-hidden="true" className="material-icon" viewBox="0 0 24 24"><path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" /></svg>;
}

function CategoryIcon() {
  return <svg aria-hidden="true" className="material-icon" viewBox="0 0 24 24"><path d="M3.5 7.5h7l2-2h8v13h-17z" /></svg>;
}

export default function CreateFab({ campaignId, categories }: { campaignId: string; categories: Category[] }) {
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
          <button className="fab-action" onClick={() => openDialog("category")} tabIndex={expanded ? 0 : -1} type="button">
            <CategoryIcon /><span>New category</span>
          </button>
          <button className="fab-action" onClick={() => openDialog("entity")} tabIndex={expanded ? 0 : -1} type="button">
            <EntityIcon /><span>New entity</span>
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
          <section aria-labelledby="creation-dialog-title" aria-modal="true" className="creation-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <div className="dialog-icon">{mode === "entity" ? <EntityIcon /> : <CategoryIcon />}</div>
            <h2 id="creation-dialog-title">Create {mode}</h2>
            <p>{mode === "entity" ? "Add a new entry to this campaign's archive." : "Add a category for organizing your lore."}</p>
            {mode === "entity" ? (
              <form action={async (formData) => { await addLoreEntity(formData); setMode(null); }} className="dialog-form">
                <input type="hidden" name="campaignId" value={campaignId} />
                <label className="material-field"><span>Entity name</span><input ref={firstInput} name="name" required maxLength={80} /></label>
                <label className="material-field"><span>Category</span><select name="categoryId"><option value="">No category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
                <div className="dialog-actions"><button className="text-action" onClick={() => setMode(null)} type="button">Cancel</button><button className="filled-action" type="submit">Create entity</button></div>
              </form>
            ) : (
              <form action={async (formData) => { await addCategory(formData); setMode(null); }} className="dialog-form">
                <label className="material-field"><span>Category name</span><input ref={firstInput} name="name" required maxLength={80} /></label>
                <label className="material-field"><span>Parent category</span><select name="parentCategoryId"><option value="">Top-level category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
                <div className="dialog-actions"><button className="text-action" onClick={() => setMode(null)} type="button">Cancel</button><button className="filled-action" type="submit">Create category</button></div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
