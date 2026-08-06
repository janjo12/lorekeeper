"use server";

import { getAiApiCredentialForTask } from "@/app/dataloader";
import { getSession } from "@/lib/session";

const CONNECTION_TEST_PROMPT =
  "Confirm this AI connection works in one sentence, then give one concise, practical tip for organizing a fantasy lore archive.";
const REQUEST_TIMEOUT_MS = 30_000;

function normalizeProvider(provider) {
  return String(provider ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function anythingLlmChatUrl(baseUrl) {
  if (!baseUrl) {
    throw new Error("AnythingLLM requires the full workspace chat URL in Base URL.");
  }

  const url = new URL(baseUrl);
  const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && localHostnames.has(url.hostname))
  ) {
    throw new Error("AnythingLLM must use HTTPS unless it is running locally.");
  }

  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/$/, "");
  if (!/\/api\/v1\/workspace\/[^/]+\/chat$/.test(url.pathname)) {
    throw new Error("Base URL must end with /api/v1/workspace/WORKSPACE-SLUG/chat.");
  }
  return url;
}

function responseErrorMessage(status, payload) {
  const providerMessage =
    payload && typeof payload === "object" ? payload.error || payload.message : undefined;
  if (status === 401 || status === 403) return "AnythingLLM rejected the API key.";
  if (status === 404) return "AnythingLLM could not find that workspace chat endpoint.";
  if (typeof providerMessage === "string" && providerMessage.trim()) {
    return `AnythingLLM returned an error: ${providerMessage.trim().slice(0, 300)}`;
  }
  return `AnythingLLM returned HTTP ${status}.`;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("AnythingLLM returned a response that was not valid JSON.");
  }
}

async function callAnythingLlm({ apiKey, baseUrl, prompt, sessionId }) {
  const response = await fetch(anythingLlmChatUrl(baseUrl), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: prompt,
      mode: "chat",
      sessionId,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(responseErrorMessage(response.status, payload));

  const answer = payload?.textResponse;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("AnythingLLM connected, but it did not return a text response.");
  }
  return answer.trim();
}

/**
 * The single provider-dispatch boundary for AI text calls in Lorekeeper.
 * Add future providers here, keeping their HTTP details inside this file.
 */
export async function generateAiResponse({ apiId, prompt, purpose = "general" }) {
  const session = await getSession();
  if (!session) throw new Error("Your session has expired. Sign in again.");
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("Enter a prompt.");
  if (prompt.length > 10_000) throw new Error("The AI prompt is too long.");

  const credential = await getAiApiCredentialForTask(session.userId, apiId);
  if (!credential) throw new Error("Choose an AI API before testing the connection.");

  switch (normalizeProvider(credential.provider)) {
    case "anythingllm":
      return callAnythingLlm({
        apiKey: credential.apiKey,
        baseUrl: credential.base_url,
        prompt: prompt.trim(),
        sessionId: `lorekeeper-${purpose}-${crypto.randomUUID()}`,
      });
    default:
      throw new Error(
        `${credential.provider} connection tests are not implemented yet. AnythingLLM is supported.`,
      );
  }
}

export async function testAiApiConnection(_state, formData) {
  const apiId = String(formData.get("apiId") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(apiId)) {
    return { message: "Choose a valid AI API." };
  }

  try {
    const response = await generateAiResponse({
      apiId,
      prompt: CONNECTION_TEST_PROMPT,
      purpose: "connection-test",
    });
    return { success: true, message: "Connection successful.", response };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return { message: "The AI request timed out after 30 seconds." };
    }
    return {
      message: error instanceof Error ? error.message : "The AI connection test failed.",
    };
  }
}
