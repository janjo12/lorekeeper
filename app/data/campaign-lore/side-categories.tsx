import Link from "next/link";

type Category = { id: string; name: string };

export default function SideCategories({
  campaignId,
  categories,
  selectedCategory,
}: {
  campaignId: string;
  categories: Category[];
  selectedCategory?: string;
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
        <Link
          className={`category-link${selectedCategory === category.id ? " is-active" : ""}`}
          href={`/data/campaign-lore?campaign=${campaignId}&category=${category.id}`}
          key={category.id}
        >
          {category.name}
        </Link>
      ))}
    </aside>
  );
}
