import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const aiLoader = readFileSync(new URL("../app/ailoader.js", import.meta.url), "utf8");
const campaignCreation = readFileSync(
  new URL("../app/data/campaign-lore/create-fab.tsx", import.meta.url),
  "utf8",
);
const contentCreation = readFileSync(
  new URL("../app/data/campaign-lore/entity-content-fab.tsx", import.meta.url),
  "utf8",
);
const actions = readFileSync(new URL("../app/data/actions.ts", import.meta.url), "utf8");
const aiForm = readFileSync(
  new URL("../app/data/campaign-lore/ai-creation-form.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("AI lore creation", () => {
  it("offers AI mode for every supported creation type", () => {
    expect(campaignCreation).toContain("<AiModeButton");
    expect(campaignCreation).toContain('kind={mode}');
    expect(contentCreation).toContain("<AiModeButton");
    expect(contentCreation).toContain('kind={mode}');
  });

  it("uses the shared button and explains when no AI API is configured", () => {
    expect(aiForm).toContain("<Button");
    expect(aiForm).toContain('variant="secondary"');
    expect(aiForm).toContain("Add an AI usage API in the Profile section");
    expect(css).toContain('.ai-mode-button.is-active::before');
    expect(css).toContain('content: "✎"');
    expect(campaignCreation).toContain("disabled={!hasAiApi}");
    expect(contentCreation).toContain("disabled={!hasAiApi}");
  });

  it("provides the requested campaign and entity context", () => {
    expect(campaignCreation).toContain("existingCategories");
    expect(campaignCreation).toContain("existingEntityNames");
    expect(campaignCreation).toContain("categoryPath");
    expect(contentCreation).toContain("entityName: entityContext.entityName");
    expect(contentCreation).toContain("existingImages");
    expect(contentCreation).toContain("existingTextboxes");
  });

  it("keeps provider dispatch and structured generation inside ailoader", () => {
    expect(aiLoader).toContain("export async function generateLoreDraft");
    expect(aiLoader).toContain("draftInstructions");
    expect(aiLoader).toContain("loreImageDraftToFile");
    expect(contentCreation).not.toContain("fetch(");
    expect(campaignCreation).not.toContain("fetch(");
  });

  it("adds a Description textbox for an AI-generated entity", () => {
    expect(actions).toMatch(/addEntityTextbox\([\s\S]*?session\.userId,[\s\S]*?entity\.id,[\s\S]*?"Description"/);
    expect(actions).toContain("await deleteEntity(session.userId, entity.id)");
  });

  it("creates image canvases from the browser HTML document, not the parsed SVG document", () => {
    expect(aiLoader).toContain(
      'const svgDocument = new DOMParser().parseFromString(svg, "image/svg+xml")',
    );
    expect(aiLoader).toContain('const canvas = document.createElement("canvas")');
    expect(aiLoader).not.toContain("const document = new DOMParser()");
  });

  it("asks for visual subjects instead of rendering textbox prose as an image", () => {
    expect(aiLoader).toContain("Treat textbox prose only as reference material");
    expect(aiLoader).toContain("Do not create a document, book page, textbox, card, interface");
    expect(aiLoader).toContain("Include no visible letters, words, labels, captions, runes, or writing");
    expect(aiLoader).toContain("use|text");
    expect(aiLoader).not.toMatch(/allowedElements[\s\S]*?"text"/);
  });

  it("recovers complete SVG output when a local model fails to escape it as JSON", () => {
    expect(aiLoader).toContain("function extractImageDraft(text)");
    expect(aiLoader).toContain("normalized.match(/<svg[\\s\\S]*?<\\/svg>/i)");
    expect(aiLoader).toContain('let name = "Generated illustration"');
    expect(aiLoader).toContain('kind === "image" ? extractImageDraft(response) : extractJson(response)');
    expect(aiLoader).toContain('.replace(/&lt;/gi, "<")');
  });

  it("keeps local-model SVG output compact enough to finish", () => {
    expect(aiLoader).toContain("Keep the SVG under 8,000 characters");
    expect(aiLoader).toContain("at most 40 simple visible shapes");
    expect(aiLoader).toContain("The closing </svg> tag is mandatory");
  });

  it("locks and fades the AI prompt while generation is pending", () => {
    expect(aiForm).toContain("aria-busy={pending}");
    expect(aiForm).toContain("disabled={pending}");
    expect(css).toContain(".dialog-form textarea:disabled");
    expect(css).toContain("opacity: 0.5");
  });
});
