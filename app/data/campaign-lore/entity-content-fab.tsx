"use client";

import { useState } from "react";
import { createEntityImage, createEntityTextbox } from "@/app/data/actions";

type Mode = "textbox" | "image" | null;

export default function EntityContentFab({ entityId }: { entityId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  return (
    <>
      <div className={`create-speed-dial${open ? " is-open" : ""}`}>
        <div className="fab-actions" aria-hidden={!open}>
          <button
            className="fab-action"
            onClick={() => {
              setMode("image");
              setOpen(false);
            }}
            tabIndex={open ? 0 : -1}
            type="button"
          >
            <span aria-hidden="true">▧</span>
            <span>Add image</span>
          </button>
          <button
            className="fab-action"
            onClick={() => {
              setMode("textbox");
              setOpen(false);
            }}
            tabIndex={open ? 0 : -1}
            type="button"
          >
            <span aria-hidden="true">¶</span>
            <span>Add textbox</span>
          </button>
        </div>
        <button
          aria-expanded={open}
          aria-label="Add entity content"
          className="create-fab"
          onClick={() => setOpen(!open)}
          type="button"
        >
          <span className={`fab-plus${open ? " is-close" : ""}`}>+</span>
        </button>
      </div>
      {mode && (
        <div className="dialog-scrim" onMouseDown={() => setMode(null)}>
          <section
            aria-modal="true"
            className="creation-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <h2>Add {mode}</h2>
            <p>
              {mode === "textbox"
                ? "Add written lore to this entity."
                : "Add an image using a public image URL."}
            </p>
            <form
              action={async (data) => {
                await (mode === "textbox" ? createEntityTextbox(data) : createEntityImage(data));
                setMode(null);
              }}
              className="dialog-form"
            >
              <input type="hidden" name="entityId" value={entityId} />
              <label className="material-field">
                <span>Name</span>
                <input name="name" required maxLength={80} />
              </label>
              {mode === "textbox" ? (
                <label className="material-field">
                  <span>Content</span>
                  <textarea name="content" required rows={7} />
                </label>
              ) : (
                <label className="material-field">
                  <span>Image URL</span>
                  <input name="url" type="url" required />
                </label>
              )}
              <div className="dialog-actions">
                <button className="text-action" onClick={() => setMode(null)} type="button">
                  Cancel
                </button>
                <button className="filled-action" type="submit">
                  Add {mode}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
