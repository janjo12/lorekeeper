const categories = ["People", "Places", "Factions", "Artifacts"];

export default function SideCategories() {
  return (
    <aside className="category-sidebar" aria-label="Lore categories">
      <h2>Campaign lore</h2>
      <a className="category-link is-active" href="#all-lore">All lore</a>
      {categories.map((category) => <a className="category-link" href={`#${category.toLowerCase()}`} key={category}>{category}</a>)}
    </aside>
  );
}
