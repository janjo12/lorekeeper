"use client";

import { useState } from "react";
import {
  categoryAncestorIds,
  childCategories,
  type TreeCategory,
} from "@/app/data/campaign-lore/category-tree";

export default function CategoryTreePicker({
  categories,
  defaultValue,
  name,
  topLevelLabel,
}: {
  categories: TreeCategory[];
  defaultValue?: string;
  name: string;
  topLevelLabel: string;
}) {
  const [selected, setSelected] = useState(defaultValue ?? "");
  const [expanded, setExpanded] = useState(
    () => new Set(categoryAncestorIds(categories, defaultValue)),
  );
  const selectedName = categories.find((category) => category.id === selected)?.name;

  function toggleBranch(categoryId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  function renderLevel(parentId?: string, depth = 0): React.ReactNode {
    return childCategories(categories, parentId).map((category) => {
      const children = childCategories(categories, category.id);
      const isExpanded = expanded.has(category.id);
      return (
        <div className="category-picker-branch" key={category.id}>
          <div
            className="category-picker-row"
            style={{ "--category-depth": depth } as React.CSSProperties}
          >
            {children.length ? (
              <button
                type="button"
                className="category-branch-toggle"
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${category.name}`}
                aria-expanded={isExpanded}
                onClick={() => toggleBranch(category.id)}
              >
                ▸
              </button>
            ) : (
              <span className="category-branch-spacer" />
            )}
            <button
              type="button"
              className={`category-picker-option${selected === category.id ? " is-selected" : ""}`}
              onClick={() => setSelected(category.id)}
            >
              {category.name}
            </button>
          </div>
          {children.length > 0 && isExpanded && renderLevel(category.id, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div className="category-tree-picker">
      <input type="hidden" name={name} value={selected} />
      <div className="category-picker-current" aria-live="polite">
        {selectedName ?? topLevelLabel}
      </div>
      <div className="category-picker-options" role="group" aria-label={topLevelLabel}>
        <button
          type="button"
          aria-pressed={!selected}
          className={`category-picker-option category-picker-root${!selected ? " is-selected" : ""}`}
          onClick={() => setSelected("")}
        >
          {topLevelLabel}
        </button>
        {renderLevel()}
      </div>
    </div>
  );
}
