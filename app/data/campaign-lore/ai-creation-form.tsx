"use client";

import { useState, type ReactNode } from "react";
import { FormMessage } from "@/app/components/form-feedback";
import { Button, DialogActions, FormField } from "@/app/components/ui";
import { generateLoreDraft, loreImageDraftToFile } from "@/app/ailoader";

type Kind = "category" | "entity" | "textbox" | "image";

export default function AiCreationForm({
  kind,
  action,
  children,
  context,
  onCancel,
  onSuccess,
}: {
  kind: Kind;
  action: (formData: FormData) => Promise<unknown>;
  children?: ReactNode;
  context: (formData: FormData) => unknown;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <form
      aria-busy={pending}
      className="dialog-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setPending(true);
        setError(undefined);
        try {
          const draft = await generateLoreDraft({
            kind,
            context: context(formData),
            userPrompt: String(formData.get("aiPrompt") ?? ""),
          });
          formData.set("name", draft.name.trim().slice(0, 80));
          if (kind === "entity") formData.set("description", draft.description.trim());
          if (kind === "textbox") formData.set("content", draft.content.trim());
          if (kind === "image") formData.set("image", await loreImageDraftToFile(draft));
          await action(formData);
          onSuccess();
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : `Could not generate this ${kind}.`);
        } finally {
          setPending(false);
        }
      }}
    >
      {children}
      <FormField label="AI prompt (optional)" variant="material">
        <textarea
          disabled={pending}
          name="aiPrompt"
          rows={5}
          placeholder={`Describe the ${kind} you want, or leave this blank for a suggestion based on existing lore.`}
        />
      </FormField>
      <FormMessage>{error}</FormMessage>
      <DialogActions>
        <Button variant="text" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="filled" disabled={pending} type="submit">
          {pending ? "Generating…" : `Generate ${kind}`}
        </Button>
      </DialogActions>
    </form>
  );
}

export function AiModeButton({
  active,
  disabled = false,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      aria-disabled={disabled}
      className={`ai-mode-button${active ? " is-active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={
        disabled ? "Add an AI usage API in the Profile section to use AI generation." : undefined
      }
      variant="secondary"
    >
      <span aria-hidden="true" />
      {active ? "Write manually" : "Generate with AI"}
    </Button>
  );
}
