import { describe, expect, it } from "vitest";
import { findEntityReferences } from "../app/data/campaign-lore/entity-links";
import {
  getRevealedEntities,
  getVisibleCategories,
} from "../app/data/campaign-lore/lore-visibility";

describe("entity references", () => {
  const entities = [
    { id: "keep", name: "Ash Keep" },
    { id: "ash", name: "Ash" },
    { id: "special", name: "A.B (North)" },
  ];

  it("links exact, case-sensitive names and prefers the longest match", () => {
    const references = findEntityReferences("Ash met Ash Keep, not ash.", entities);

    expect(references.filter((part) => part.kind === "entity")).toEqual([
      { kind: "entity", value: "Ash", entity: entities[1] },
      { kind: "entity", value: "Ash Keep", entity: entities[0] },
    ]);
  });

  it("does not link names embedded inside another word", () => {
    expect(findEntityReferences("Ashen Ash", entities)).toEqual([
      { kind: "text", value: "Ashen " },
      { kind: "entity", value: "Ash", entity: entities[1] },
    ]);
  });

  it("handles punctuation in entity names literally", () => {
    expect(findEntityReferences("Visit A.B (North).", entities)).toContainEqual({
      kind: "entity",
      value: "A.B (North)",
      entity: entities[2],
    });
  });
});

describe("player lore visibility", () => {
  const entities = [
    { id: "hidden", name: "Hidden", category_id: "child" },
    { id: "text", name: "Text", category_id: "child" },
    { id: "image", name: "Image", category_id: "other" },
  ];

  it("reveals an entity when at least one textbox or image is visible", () => {
    expect(
      getRevealedEntities(entities, [
        { entity: { id: "hidden" }, textboxes: [], images: [] },
        { entity: { id: "text" }, textboxes: [{}], images: [] },
        { entity: { id: "image" }, textboxes: [], images: [{}] },
      ]).map((entity) => entity.id),
    ).toEqual(["text", "image"]);
  });

  it("reveals a category and all of its ancestors, but not unrelated branches", () => {
    const categories = [
      { id: "root", name: "Root" },
      { id: "child", name: "Child", parent_category_id: "root" },
      { id: "other", name: "Other" },
    ];

    expect(getVisibleCategories(categories, [entities[1]]).map((category) => category.id)).toEqual([
      "root",
      "child",
    ]);
  });

  it("terminates safely when malformed category data contains a cycle", () => {
    const categories = [
      { id: "a", name: "A", parent_category_id: "b" },
      { id: "b", name: "B", parent_category_id: "a" },
    ];

    expect(
      getVisibleCategories(categories, [{ id: "entity", name: "Entity", category_id: "a" }]),
    ).toHaveLength(2);
  });
});
