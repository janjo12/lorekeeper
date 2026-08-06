const CONNECTION_TEST_PROMPT =
  "Confirm this AI connection works in one sentence, then give one concise, practical tip for organizing a fantasy lore archive.";
const TEXT_REQUEST_TIMEOUT_MS = 2 * 60_000;
const IMAGE_REQUEST_TIMEOUT_MS = 10 * 60_000;

function requestTimeout(purpose) {
  return purpose === "generate-image"
    ? { milliseconds: IMAGE_REQUEST_TIMEOUT_MS, label: "10 minutes" }
    : { milliseconds: TEXT_REQUEST_TIMEOUT_MS, label: "2 minutes" };
}

function normalizeProvider(provider) {
  return String(provider ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function anythingLlmChatUrl(baseUrl) {
  if (!baseUrl) throw new Error("Enter the AnythingLLM workspace chat URL.");
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

async function callAnythingLlm({ apiKey, baseUrl, prompt, purpose, sessionId }) {
  const timeout = requestTimeout(purpose);
  let response;
  try {
    response = await fetch(anythingLlmChatUrl(baseUrl), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: prompt, mode: "chat", sessionId }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeout.milliseconds),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`The AnythingLLM request timed out after ${timeout.label}.`);
    }
    throw new Error(
      "The browser could not reach AnythingLLM. Confirm it is running, the URL is correct, and AnythingLLM allows requests from this site (CORS).",
    );
  }
  const payload = await readJson(response);
  if (!response.ok) throw new Error(responseErrorMessage(response.status, payload));
  const answer = payload?.textResponse;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("AnythingLLM connected, but it did not return a text response.");
  }
  return answer.trim();
}

/** Lorekeeper's only AI-provider boundary. Runs in the user's browser for local providers. */
export async function generateAiResponse({
  provider,
  apiKey,
  baseUrl,
  prompt,
  purpose = "general",
}) {
  if (typeof apiKey !== "string" || !apiKey.trim()) throw new Error("Enter an API key.");
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("Enter a prompt.");
  if (prompt.length > 200_000) throw new Error("The AI prompt is too long.");
  const adapter = { anythingllm: callAnythingLlm }[normalizeProvider(provider)];
  if (!adapter) {
    throw new Error("AnythingLLM is currently the only supported AI provider.");
  }
  return adapter({
    apiKey: apiKey.trim(),
    baseUrl,
    prompt: prompt.trim(),
    purpose,
    sessionId: `lorekeeper-${purpose}-${crypto.randomUUID()}`,
  });
}

export function testAiApiConnection({ provider, apiKey, baseUrl }) {
  return generateAiResponse({
    provider,
    apiKey,
    baseUrl,
    prompt: CONNECTION_TEST_PROMPT,
    purpose: "connection-test",
  });
}

export async function testSavedAiApiConnection(apiId) {
  const credentialResponse = await fetch("/api/ai-credential", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiId }),
    cache: "no-store",
  });
  const credential = await credentialResponse.json().catch(() => null);
  if (!credentialResponse.ok) {
    throw new Error(credential?.error || "Lorekeeper could not load this saved API key.");
  }
  return testAiApiConnection(credential);
}

async function loadSavedCredential(apiId) {
  const response = await fetch("/api/ai-credential", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(apiId ? { apiId } : {}),
    cache: "no-store",
  });
  const credential = await response.json().catch(() => null);
  if (!response.ok) throw new Error(credential?.error || "Lorekeeper could not load an AI API.");
  return credential;
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    throw new Error("AnythingLLM did not return valid structured lore. Try a clearer prompt.");
  }
}

function extractImageDraft(text) {
  try {
    return extractJson(text);
  } catch {
    const normalized = text
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/\\\//g, "/")
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"');
    const svg = normalized.match(/<svg[\s\S]*?<\/svg>/i)?.[0];
    if (!svg) {
      throw new Error(
        "AnythingLLM stopped before finishing the SVG illustration. Try generating it again.",
      );
    }
    const encodedName = text.match(/"name"\s*:\s*("(?:\\.|[^"\\])*")/i)?.[1];
    let name = "Generated illustration";
    if (encodedName) {
      try {
        const parsedName = JSON.parse(encodedName);
        if (typeof parsedName === "string" && parsedName.trim()) name = parsedName.trim();
      } catch {
        // A usable SVG is more important than a malformed optional name.
      }
    }
    return { name, svg };
  }
}

const draftInstructions = {
  category: 'Return JSON only: {"name":"an evocative category name"}.',
  entity:
    'Return JSON only: {"name":"an evocative entity name","description":"a short useful summary in 2-4 sentences"}.',
  textbox: 'Return JSON only: {"name":"a concise textbox heading","content":"useful lore prose"}.',
  image:
    'Create a compact visual illustration inspired by the lore context and direction. Depict the most important person, creature, place, object, or dramatic scene described by the lore. Treat textbox prose only as reference material: never reproduce, quote, summarize, typeset, or display it. Do not create a document, book page, textbox, card, interface, infographic, title screen, or typography-based composition. Include no visible letters, words, labels, captions, runes, or writing. Keep the SVG under 8,000 characters and use at most 40 simple visible shapes so a small local model can always finish it. Prefer flat shapes and simple gradients; avoid intricate paths, repeated details, and deeply nested groups. The closing </svg> tag is mandatory. Return JSON only: {"name":"a concise image name","svg":"a complete 1024 by 576 SVG illustration"}. The SVG may use only svg, g, path, rect, circle, ellipse, polygon, polyline, line, defs, linearGradient, radialGradient, stop, and title elements. Do not use scripts, events, external references, images, use elements, foreignObject, CSS url(), or embedded data.',
};

export async function generateLoreDraft({ kind, context, userPrompt = "", apiId = undefined }) {
  const instruction = draftInstructions[kind];
  if (!instruction) throw new Error("Unsupported lore generation type.");
  const credential = await loadSavedCredential(apiId);
  const prompt = [
    "You are helping a game master create internally consistent fantasy lore.",
    instruction,
    `Existing lore context:\n${JSON.stringify(context)}`,
    userPrompt.trim()
      ? `Optional creative direction:\n${userPrompt.trim()}`
      : `Use your best judgment to create a useful ${kind}.`,
    "Avoid duplicating existing names. Return no commentary outside the JSON.",
  ].join("\n\n");
  const response = await generateAiResponse({
    ...credential,
    prompt,
    purpose: `generate-${kind}`,
  });
  const draft = kind === "image" ? extractImageDraft(response) : extractJson(response);
  if (typeof draft.name !== "string" || !draft.name.trim()) {
    throw new Error("AnythingLLM did not provide a name for the generated lore.");
  }
  if (kind === "entity" && (typeof draft.description !== "string" || !draft.description.trim())) {
    throw new Error("AnythingLLM did not provide an entity description.");
  }
  if (kind === "textbox" && (typeof draft.content !== "string" || !draft.content.trim())) {
    throw new Error("AnythingLLM did not provide textbox content.");
  }
  if (kind === "image" && (typeof draft.svg !== "string" || !draft.svg.trim())) {
    throw new Error("AnythingLLM did not provide an SVG illustration.");
  }
  return draft;
}

export async function loreImageDraftToFile(draft) {
  const svg = draft.svg.trim();
  if (!/^<svg[\s>]/i.test(svg) || !/<\/svg>$/i.test(svg)) {
    throw new Error("AnythingLLM returned an incomplete SVG image.");
  }
  if (/<(?:script|foreignObject|image|use|text)\b|\son\w+\s*=|\bhref\s*=|url\s*\(/i.test(svg)) {
    throw new Error("AnythingLLM returned an SVG containing unsupported content.");
  }
  const svgDocument = new DOMParser().parseFromString(svg, "image/svg+xml");
  const allowedElements = new Set([
    "svg",
    "g",
    "path",
    "rect",
    "circle",
    "ellipse",
    "polygon",
    "polyline",
    "line",
    "defs",
    "linearGradient",
    "radialGradient",
    "stop",
    "title",
  ]);
  if (
    svgDocument.querySelector("parsererror") ||
    [...svgDocument.querySelectorAll("*")].some(
      (element) => !allowedElements.has(element.localName),
    )
  ) {
    throw new Error("AnythingLLM returned an SVG containing unsupported elements.");
  }
  const source = new Blob([svg], { type: "image/svg+xml" });
  const objectUrl = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 576;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot render the generated image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("This browser could not encode the generated image.");
    return new File([blob], `${draft.name.trim().slice(0, 80) || "generated-image"}.png`, {
      type: "image/png",
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
