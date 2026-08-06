"use client";

import { useCallback, useState } from "react";
import { createEntityImage, createEntityTextbox } from "@/app/data/actions";
import { ActionForm, SubmitButton } from "@/app/components/form-feedback";
import { Button, DialogActions, FormField } from "@/app/components/ui";
import { useDismissOnOutside } from "@/app/components/use-dismiss-on-outside";

type Mode = "textbox" | "image" | null;

export default function EntityContentFab({ entityId }: { entityId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const closeContentMenu = useCallback(() => setOpen(false), []);
  const speedDialRef = useDismissOnOutside<HTMLDivElement>(open, closeContentMenu);
  return (
    <>
      <div className={`create-speed-dial${open ? " is-open" : ""}`} ref={speedDialRef}>
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
                : "Upload an image. Files are private and shown through temporary links."}
            </p>
            <p>
              Use another entity&apos;s exact, case-sensitive name in a content name or textbox to
              create a link. Players only receive links to entities visible to them.
            </p>
            <ActionForm
              action={mode === "textbox" ? createEntityTextbox : createEntityImage}
              className="dialog-form"
              errorMessage={`We couldn’t add that ${mode}. Check the details and try again.`}
              onSuccess={() => setMode(null)}
            >
              <input type="hidden" name="entityId" value={entityId} />
              <FormField label="Name" variant="material">
                <input name="name" required maxLength={80} />
              </FormField>
              {mode === "textbox" ? (
                <FormField label="Content" variant="material">
                  <textarea name="content" required rows={7} />
                </FormField>
              ) : (
                <FormField label="Image file" variant="material">
                  <input
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    required
                  />
                </FormField>
              )}
              <DialogActions>
                <Button variant="text" onClick={() => setMode(null)}>
                  Cancel
                </Button>
                <SubmitButton variant="filled" pendingLabel="Adding…">
                  Add {mode}
                </SubmitButton>
              </DialogActions>
            </ActionForm>
          </section>
        </div>
      )}
    </>
  );
}
