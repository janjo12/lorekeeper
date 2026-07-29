import Link from "next/link";
import CategoryActions from "@/app/data/campaign-lore/category-actions";

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
  return (
    <aside className="category-sidebar" aria-label="Lore categories">
      <Link
        className={`category-link${!selectedCategory ? " is-active" : ""}`}
        href={`/data/campaign-lore?campaign=${campaignId}`}
      >
        All lore
      </Link>
      {categories.map((category) => (
        <div className="category-row" key={category.id}>
          <Link
            className={`category-link${selectedCategory === category.id ? " is-active" : ""}`}
            href={`/data/campaign-lore?campaign=${campaignId}&category=${category.id}`}
          >
            {category.name}
          </Link>
          {isGm && <CategoryActions category={category} categories={categories} />}
        </div>
      ))}
    </aside>
  );
}
