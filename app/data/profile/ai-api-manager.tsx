"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/app/components/form-feedback";
import ConfirmDeleteButton from "@/app/components/confirm-delete-button";
import { FormField } from "@/app/components/ui";
import { addAiApi, chooseDefaultAiApi, removeAiApi } from "@/app/data/profile/actions";
import { testAiApiConnection, testSavedAiApiConnection } from "@/app/ailoader";

export type AiApiSummary = {
  id: string;
  name: string;
  provider: string;
  base_url?: string | null;
  key_last_four: string;
  is_default: boolean;
};

function connectionSignature(values: FormData) {
  return [values.get("provider"), values.get("baseUrl"), values.get("apiKey")].join("\n");
}

function SavedApiConnectionTest({ apiId }: { apiId: string }) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ message: string; response?: string; success?: boolean }>({
    message: "",
  });

  async function testConnection() {
    setTesting(true);
    setResult({ message: "" });
    try {
      const response = await testSavedAiApiConnection(apiId);
      setResult({ success: true, message: "Connection successful.", response });
    } catch (error) {
      setResult({
        message: error instanceof Error ? error.message : "The AI connection test failed.",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="ai-api-connection-test">
      <button
        className="secondary-button"
        disabled={testing}
        onClick={testConnection}
        type="button"
      >
        {testing ? "Testing…" : "Test connection"}
      </button>
      <FormMessage success={result.success}>{result.message}</FormMessage>
      {result.response && <blockquote>{result.response}</blockquote>}
    </div>
  );
}

export default function AiApiManager({ apis }: { apis: AiApiSummary[] }) {
  const [state, action, pending] = useActionState(addAiApi, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [testing, setTesting] = useState(false);
  const [testedSignature, setTestedSignature] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    message: string;
    response?: string;
    success?: boolean;
  }>({ message: "" });

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  async function testConnection() {
    if (!formRef.current) return;
    const values = new FormData(formRef.current);
    setTesting(true);
    setTestResult({ message: "" });
    try {
      const response = await testAiApiConnection({
        provider: String(values.get("provider") ?? ""),
        baseUrl: String(values.get("baseUrl") ?? ""),
        apiKey: String(values.get("apiKey") ?? ""),
      });
      setTestedSignature(connectionSignature(values));
      setTestResult({ success: true, message: "Connection successful.", response });
    } catch (error) {
      setTestResult({
        message: error instanceof Error ? error.message : "The AI connection test failed.",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="ai-api-settings" aria-labelledby="ai-api-settings-title">
      <header>
        <h2 id="ai-api-settings-title">AI APIs</h2>
        <p>
          Test your local AnythingLLM connection in this browser, then save the encrypted credential
          for future tools.
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
                <p>
                  {api.provider} · Key ending in {api.key_last_four}
                </p>
                {api.base_url && <small>{api.base_url}</small>}
              </div>
              <div className="ai-api-actions">
                <SavedApiConnectionTest apiId={api.id} />
                {!api.is_default && (
                  <ActionForm
                    action={chooseDefaultAiApi}
                    errorMessage="We couldn’t change your default API."
                  >
                    <input type="hidden" name="apiId" value={api.id} />
                    <SubmitButton variant="secondary" pendingLabel="Changing…">
                      Make default
                    </SubmitButton>
                  </ActionForm>
                )}
                <ActionForm action={removeAiApi} errorMessage="We couldn’t remove that API.">
                  <input type="hidden" name="apiId" value={api.id} />
                  <ConfirmDeleteButton
                    className="secondary-button is-danger"
                    itemName={`the AI API “${api.name}”`}
                  >
                    Remove
                  </ConfirmDeleteButton>
                </ActionForm>
              </div>
            </article>
          ))}
        </div>
      )}

      <form
        ref={formRef}
        action={action}
        className="ai-api-form"
        onChange={() => setTestedSignature(null)}
        onSubmit={(event) => {
          const currentSignature = connectionSignature(new FormData(event.currentTarget));
          if (testedSignature !== currentSignature) {
            event.preventDefault();
            setTestResult({
              message: "Test this exact URL and API key successfully before saving.",
            });
          }
        }}
      >
        <h3>Add an AI API</h3>
        <input
          type="hidden"
          name="connectionTestPassed"
          value={testedSignature ? "true" : "false"}
        />
        <FormField label="Name" htmlFor="ai-api-name" errors={state.errors?.name}>
          <input
            id="ai-api-name"
            name="name"
            placeholder="My AnythingLLM workspace"
            required
            maxLength={80}
          />
        </FormField>
        <FormField label="Provider" htmlFor="ai-api-provider" errors={state.errors?.provider}>
          <select id="ai-api-provider" name="provider" required defaultValue="AnythingLLM">
            <option value="AnythingLLM">AnythingLLM</option>
          </select>
        </FormField>
        <FormField
          label="Workspace chat URL"
          htmlFor="ai-api-base-url"
          errors={state.errors?.baseUrl}
        >
          <input
            id="ai-api-base-url"
            name="baseUrl"
            type="url"
            placeholder="http://localhost:3001/api/v1/workspace/lorekeeper/chat"
            required
            maxLength={500}
          />
        </FormField>
        <FormField label="API key" htmlFor="ai-api-key" errors={state.errors?.apiKey}>
          <input
            id="ai-api-key"
            name="apiKey"
            type="password"
            autoComplete="new-password"
            required
            maxLength={500}
          />
        </FormField>
        {apis.length > 0 && (
          <label className="checkbox-field">
            <input type="checkbox" name="makeDefault" />
            Make this my default API
          </label>
        )}
        {apis.length === 0 && (
          <p className="field-help">Your first API automatically becomes the default.</p>
        )}
        <FormMessage success={state.success}>{state.message}</FormMessage>
        <div className="ai-api-connection-test">
          <button
            className="secondary-button"
            disabled={testing}
            onClick={testConnection}
            type="button"
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
          <FormMessage success={testResult.success}>{testResult.message}</FormMessage>
          {testResult.response && <blockquote>{testResult.response}</blockquote>}
        </div>
        <SubmitButton disabled={pending} pendingLabel="Encrypting and saving…">
          Add API
        </SubmitButton>
      </form>
    </section>
  );
}
