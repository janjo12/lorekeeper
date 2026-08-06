import { describe, expect, it } from "vitest";
import {
  categoryAncestorIds,
  childCategories,
} from "../app/data/campaign-lore/category-tree";

const categories = [
  { id: "world", name: "World", parent_category_id: null },
  { id: "places", name: "Places", parent_category_id: "world" },
  { id: "cities", name: "Cities", parent_category_id: "places" },
  { id: "people", name: "People", parent_category_id: null },
];

describe("category hierarchy", () => {
  it("groups categories under their direct parent", () => {
    expect(childCategories(categories).map(({ id }) => id)).toEqual(["world", "people"]);
    expect(childCategories(categories, "world").map(({ id }) => id)).toEqual(["places"]);
  });

  it("opens only the ancestor chain leading to the current subcategory", () => {
    expect(categoryAncestorIds(categories, "cities")).toEqual(["world", "places"]);
    expect(categoryAncestorIds(categories, "world")).toEqual([]);
    expect(categoryAncestorIds(categories)).toEqual([]);
  });

  it("does not loop forever when legacy category data contains a cycle", () => {
    const cyclic = [
      { id: "one", name: "One", parent_category_id: "two" },
      { id: "two", name: "Two", parent_category_id: "one" },
    ];
    expect(categoryAncestorIds(cyclic, "one")).toEqual(["one", "two"]);
  });
});
