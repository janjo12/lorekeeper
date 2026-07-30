import ThemeSettings from "@/app/theme-settings";
import { PageHeader } from "@/app/components/ui";

export default function SettingsPage() {
  return (
    <section className="settings-panel" aria-labelledby="settings-title">
      <PageHeader eyebrow="Preferences" title="Settings" titleId="settings-title" />
      <ThemeSettings />
    </section>
  );
}
