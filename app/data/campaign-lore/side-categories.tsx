"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CategoryActions from "@/app/data/campaign-lore/category-actions";
import { categoryAncestorIds, childCategories } from "@/app/data/campaign-lore/category-tree";

type Category = { id: string; name: string; parent_category_id?: string | null };

export default function SideCategories({
  campaignId,
  categories,
  selectedCategory,
  isGm,
}: {
  campaignId: string;
  categories: Category[];
  selectedCategory?: string;
  isGm: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(
    () => new Set(categoryAncestorIds(categories, selectedCategory)),
  );
  const selectedCategoryName =
    categories.find((category) => category.id === selectedCategory)?.name ?? "All entries";

  useEffect(() => {
    const firstVisitKey = `lorekeeper:categories-seen:${campaignId}`;

    if (!window.matchMedia("(max-width: 64rem)").matches) return;

    try {
      if (!window.sessionStorage.getItem(firstVisitKey)) {
        window.sessionStorage.setItem(firstVisitKey, "true");
        const revealMenu = window.setTimeout(() => setMobileOpen(true), 0);
        return () => window.clearTimeout(revealMenu);
      }
    } catch {
      // Storage can be unavailable in privacy-restricted browsers; the menu still works.
    }
  }, [campaignId]);

  function toggleCategory(categoryId: string) {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  function renderCategoryLevel(parentId?: string, depth = 0): React.ReactNode {
    return childCategories(categories, parentId).map((category) => {
      const children = childCategories(categories, category.id);
      const isExpanded = expandedCategories.has(category.id);
      return (
        <div className="category-branch" key={category.id}>
          <div
            className="category-row"
            style={{ "--category-depth": depth } as React.CSSProperties}
          >
            {children.length ? (
              <button
                type="button"
                className="category-branch-toggle"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${category.name}`}
                onClick={() => toggleCategory(category.id)}
              >
                ▸
              </button>
            ) : (
              <span className="category-branch-spacer" />
            )}
            <Link
              className={`category-link${selectedCategory === category.id ? " is-active" : ""}`}
              href={`/data/campaign-lore?campaign=${campaignId}&category=${category.id}`}
            >
              {category.name}
            </Link>
            {isGm && <CategoryActions category={category} categories={categories} />}
          </div>
          {children.length > 0 && isExpanded && (
            <div className="category-children">{renderCategoryLevel(category.id, depth + 1)}</div>
          )}
        </div>
      );
    });
  }

  return (
    <aside className="category-sidebar" aria-label="Lore categories">
      <button
        type="button"
        className="category-menu-toggle"
        aria-controls={`category-menu-${campaignId}`}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span>Categories</span>
        <strong>{selectedCategoryName}</strong>
        <span aria-hidden="true" className="category-menu-chevron">
          ⌄
        </span>
      </button>
      <div
        className={`category-menu${mobileOpen ? " is-open" : ""}`}
        id={`category-menu-${campaignId}`}
      >
        {isGm && (
          <Link className="manage-campaign-link" href={`/data/campaigns/${campaignId}`}>
            Manage campaign
          </Link>
        )}
        <Link
          className={`category-link${!selectedCategory ? " is-active" : ""}`}
          href={`/data/campaign-lore?campaign=${campaignId}`}
        >
          All lore
        </Link>
        {renderCategoryLevel()}
      </div>
    </aside>
  );
}
