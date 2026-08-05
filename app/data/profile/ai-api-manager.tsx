"use client";

import { useActionState, useEffect, useRef } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/app/components/form-feedback";
import ConfirmDeleteButton from "@/app/components/confirm-delete-button";
import { FormField } from "@/app/components/ui";
import { addAiApi, chooseDefaultAiApi, removeAiApi } from "@/app/data/profile/actions";

export type AiApiSummary = {
  id: string;
  name: string;
  provider: string;
  base_url?: string | null;
  key_last_four: string;
  is_default: boolean;
};

const providers = ["OpenAI", "Anthropic", "Google AI", "xAI", "OpenRouter", "Custom"];

export default function AiApiManager({ apis }: { apis: AiApiSummary[] }) {
  const [state, action, pending] = useActionState(addAiApi, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <section className="ai-api-settings" aria-labelledby="ai-api-settings-title">
      <header>
        <h2 id="ai-api-settings-title">AI APIs</h2>
        <p>
          Store multiple API credentials and choose the default used by future generation tools.
          Secret keys are encrypted and cannot be viewed again after saving.
        </p>
      </header>

      {apis.length > 0 && (
        <div className="ai-api-list">
          {apis.map((api) => (
            <article className="ai-api-card" key={api.id}>
              <div>
                <div className="ai-api-title">
                  <h3>{api.name}</h3>
                  {api.is_default && <span className="default-badge">Default</span>}
                </div>
                <p>{api.provider} · Key ending in {api.key_last_four}</p>
                {api.base_url && <small>{api.base_url}</small>}
              </div>
              <div className="ai-api-actions">
                {!api.is_default && (
                  <ActionForm action={chooseDefaultAiApi} errorMessage="We couldn’t change your default API.">
                    <input type="hidden" name="apiId" value={api.id} />
                    <SubmitButton variant="secondary" pendingLabel="Changing…">Make default</SubmitButton>
                  </ActionForm>
                )}
                <ActionForm action={removeAiApi} errorMessage="We couldn’t remove that API.">
                  <input type="hidden" name="apiId" value={api.id} />
                  <ConfirmDeleteButton className="secondary-button is-danger" itemName={`the AI API “${api.name}”`}>
                    Remove
                  </ConfirmDeleteButton>
                </ActionForm>
              </div>
            </article>
          ))}
        </div>
      )}

      <form ref={formRef} action={action} className="ai-api-form">
        <h3>Add an AI API</h3>
        <FormField label="Name" htmlFor="ai-api-name" errors={state.errors?.name}>
          <input id="ai-api-name" name="name" placeholder="My OpenAI account" required maxLength={80} />
        </FormField>
        <FormField label="Provider" htmlFor="ai-api-provider" errors={state.errors?.provider}>
          <select id="ai-api-provider" name="provider" required defaultValue="">
            <option value="" disabled>Choose a provider</option>
            {providers.map((provider) => <option key={provider}>{provider}</option>)}
          </select>
        </FormField>
        <FormField label="Base URL (optional)" htmlFor="ai-api-base-url" errors={state.errors?.baseUrl}>
          <input id="ai-api-base-url" name="baseUrl" type="url" placeholder="https://api.example.com/v1" maxLength={500} />
        </FormField>
        <FormField label="API key" htmlFor="ai-api-key" errors={state.errors?.apiKey}>
          <input id="ai-api-key" name="apiKey" type="password" autoComplete="new-password" required maxLength={500} />
        </FormField>
        {apis.length > 0 && (
          <label className="checkbox-field">
            <input type="checkbox" name="makeDefault" />
            Make this my default API
          </label>
        )}
        {apis.length === 0 && <p className="field-help">Your first API automatically becomes the default.</p>}
        <FormMessage success={state.success}>{state.message}</FormMessage>
        <SubmitButton disabled={pending} pendingLabel="Encrypting and saving…">Add API</SubmitButton>
      </form>
    </section>
  );
}
