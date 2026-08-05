// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import EntityComments from "../app/data/campaign-lore/entity-comments";
import { ENTITY_COMMENT_EVENT, parseRealtimeEntityComment } from "../app/data/notifications/entity-comment-event";

vi.mock("../app/data/actions", () => ({ createEntityComment: vi.fn() }));
vi.mock("../app/components/form-feedback", () => ({
  ActionForm: ({ children }: { children: ReactNode }) => <form>{children}</form>,
  SubmitButton: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

describe("realtime entity comments", () => {
  it("validates comment broadcasts", () => {
    expect(parseRealtimeEntityComment({ id: "comment-1", entityId: "entity-1", username: "ada", content: "New lore", createdAt: "2026-08-03T18:00:00Z" })).toMatchObject({ id: "comment-1", content: "New lore" });
    expect(parseRealtimeEntityComment({ id: "comment-1" })).toBeNull();
  });

  it("updates the rendered browser comment list without a refresh", async () => {
    render(<EntityComments entityId="entity-1" initialComments={[]} />);
    await act(async () => window.dispatchEvent(new CustomEvent(ENTITY_COMMENT_EVENT, { detail: {
      id: "comment-1", entityId: "entity-1", username: "ada", content: "Arrived live", createdAt: "2026-08-03T18:00:00Z",
    } })));
    expect(screen.getByText("Arrived live")).toBeTruthy();
    expect(screen.getByText("ada")).toBeTruthy();
  });

  it("ignores comments for another entity", async () => {
    render(<EntityComments entityId="entity-1" initialComments={[]} />);
    await act(async () => window.dispatchEvent(new CustomEvent(ENTITY_COMMENT_EVENT, { detail: {
      id: "comment-2", entityId: "entity-2", username: "bea", content: "Elsewhere", createdAt: "2026-08-03T18:00:00Z",
    } })));
    expect(screen.queryByText("Elsewhere")).toBeNull();
  });
});
