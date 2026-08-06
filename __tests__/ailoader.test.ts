import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const aiLoader = readFileSync(new URL("../app/ailoader.js", import.meta.url), "utf8");
const manager = readFileSync(
  new URL("../app/data/profile/ai-api-manager.tsx", import.meta.url),
  "utf8",
);

describe("AI provider boundary", () => {
  it("keeps provider HTTP calls in ailoader.js", () => {
    expect(aiLoader).toContain("async function callAnythingLlm");
    expect(aiLoader).toContain("Authorization: `Bearer ${apiKey}`");
    expect(aiLoader).toContain("payload?.textResponse");
    expect(manager).not.toContain("fetch(");
    expect(manager).toContain('from "@/app/ailoader"');
  });

  it("uses an isolated AnythingLLM session for a useful connection test", () => {
    expect(aiLoader).toContain('mode: "chat"');
    expect(aiLoader).toContain("crypto.randomUUID()");
    expect(aiLoader).toContain("practical tip for organizing a fantasy lore archive");
  });

  it("only offers AnythingLLM while it is the supported provider", () => {
    expect(manager).toContain('<option value="AnythingLLM">AnythingLLM</option>');
    expect(manager).not.toContain('value="OpenAI"');
    expect(manager).not.toContain('value="Anthropic"');
  });
});
