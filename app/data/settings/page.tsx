import ThemeSettings from "@/app/theme-settings";

export default function SettingsPage() {
  return (
    <section className="settings-panel" aria-labelledby="settings-title">
      <p className="eyebrow">Preferences</p>
      <h1 id="settings-title">Settings</h1>
      <ThemeSettings />
    </section>
  );
}
