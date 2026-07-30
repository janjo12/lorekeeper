import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("shared UI architecture", () => {
  it("keeps reusable layout, form, and action primitives in one server-compatible module", () => {
    const ui = source("../app/components/ui.tsx");

    expect(ui).not.toContain('"use client"');
    for (const component of [
      "PageHeader",
      "SectionHeader",
      "EmptyState",
      "FormField",
      "DialogActions",
      "Button",
      "AuthCard",
    ]) {
      expect(ui).toContain(`export function ${component}`);
    }
  });

  it("uses shared page composition on the primary data routes", () => {
    for (const route of [
      "../app/data/campaigns/page.tsx",
      "../app/data/tags/page.tsx",
      "../app/data/campaign-lore/page.tsx",
      "../app/data/profile/page.tsx",
      "../app/data/settings/page.tsx",
    ]) {
      expect(source(route)).toContain("<PageHeader");
    }
  });

  it("uses one campaign section component for owned and joined campaigns", () => {
    const campaigns = source("../app/data/campaigns/page.tsx");

    expect(campaigns.match(/<CampaignSection/g)).toHaveLength(2);
    expect(campaigns).not.toContain('<div className="section-heading">');
    expect(campaigns).not.toContain('<div className="empty-state');
  });

  it("provides shared pending, inline error, and route recovery components", () => {
    const feedback = source("../app/components/form-feedback.tsx");
    const dataError = source("../app/data/error.tsx");
    const dataLoading = source("../app/data/loading.tsx");

    for (const component of ["SubmitButton", "FormMessage", "ActionForm"]) {
      expect(feedback).toContain(`export function ${component}`);
    }
    expect(feedback).toContain("useFormStatus");
    expect(dataError).toContain("unstable_retry");
    expect(dataLoading).toContain("<PageLoading");
  });
});
