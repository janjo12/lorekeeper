import SideCategories from "@/app/data/campaign-lore/side-categories";

export default function CampaignLorePage() {
  return (
    <div className="lore-browser">
      <SideCategories />
      <section className="data-panel lore-entities" id="all-lore">
        <p className="eyebrow">Archive</p>
        <div className="page-heading"><div><h1>Campaign Lore</h1><p>Browse the people, places, and secrets in your world.</p></div><button className="primary-button">New entity</button></div>
        <div className="empty-state"><h2>No lore entries yet</h2><p>Create an entity or choose a category to start shaping this campaign.</p></div>
      </section>
    </div>
  );
}
