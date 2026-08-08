import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const aiLoader = readFileSync(new URL("../app/ailoader.js", import.meta.url), "utf8");
const manager = readFileSync(
  new URL("../app/data/profile/ai-api-manager.tsx", import.meta.url),
  "utf8",
);
const credentialRoute = readFileSync(
  new URL("../app/api/ai-credential/route.ts", import.meta.url),
  "utf8",
);
const profileActions = readFileSync(
  new URL("../app/data/profile/actions.ts", import.meta.url),
  "utf8",
);

describe("AI provider boundary", () => {
  it("keeps provider HTTP calls in ailoader.js", () => {
    expect(aiLoader).toContain("async function callAnythingLlm");
    expect(aiLoader).toContain("Authorization: `Bearer ${apiKey}`");
    expect(aiLoader).toContain("payload?.textResponse");
    expect(manager).not.toContain("fetch(");
    expect(manager).toContain('from "@/app/ailoader"');
    expect(aiLoader).not.toContain('from "@/app/dataloader"');
    expect(aiLoader).not.toContain('"use server"');
    expect(manager).toContain("await testAiApiConnection");
  });

  it("uses an isolated AnythingLLM session for a useful connection test", () => {
    expect(aiLoader).toContain('mode: "chat"');
    expect(aiLoader).toContain("crypto.randomUUID()");
    expect(aiLoader).toContain("practical tip for organizing a fantasy lore archive");
  });

  it("supports deployed HTTPS pages connecting directly to local AnythingLLM", () => {
    expect(aiLoader).toContain('new Set(["localhost", "127.0.0.1", "::1"])');
    expect(aiLoader).toContain('targetAddressSpace: "local"');
    expect(aiLoader).toContain('mode: "cors"');
    expect(aiLoader).toContain("canReachLocalServer(chatUrl)");
    expect(aiLoader).toContain("Local network access is not the problem");
    expect(manager).toContain("change it in the site");
  });

  it("allows slower local models more time, with extra time for image generation", () => {
    expect(aiLoader).toContain("const TEXT_REQUEST_TIMEOUT_MS = 2 * 60_000");
    expect(aiLoader).toContain("const CONNECTION_TEST_TIMEOUT_MS = 5 * 60_000");
    expect(aiLoader).toContain("const IMAGE_REQUEST_TIMEOUT_MS = 10 * 60_000");
    expect(aiLoader).toContain('purpose === "generate-image"');
    expect(aiLoader).toContain('purpose === "connection-test"');
    expect(aiLoader).toContain("signal: AbortSignal.timeout(timeout.milliseconds)");
    expect(aiLoader).toContain("purpose,\n    sessionId:");
  });

  it("only offers AnythingLLM while it is the supported provider", () => {
    expect(manager).toContain('<option value="AnythingLLM">AnythingLLM</option>');
    expect(manager).not.toContain('value="OpenAI"');
    expect(manager).not.toContain('value="Anthropic"');
  });

  it("tests saved credentials in the browser and protects credential retrieval", () => {
    expect(aiLoader).toContain('fetch("/api/ai-credential"');
    expect(aiLoader).toContain("return testAiApiConnection(credential)");
    expect(manager).toContain("<SavedApiConnectionTest apiId={api.id} />");
    expect(credentialRoute).toContain("const session = await getSession()");
    expect(credentialRoute).toContain("getAiApiCredentialForTask(session.userId");
    expect(credentialRoute).toContain('"Cache-Control": "private, no-store"');
  });

  it("requires the exact new credential to pass before it can be saved", () => {
    expect(manager).toContain("testedSignature !== currentSignature");
    expect(manager).toContain('name="connectionTestPassed"');
    expect(profileActions).toContain('formData.get("connectionTestPassed") !== "true"');
  });
});
