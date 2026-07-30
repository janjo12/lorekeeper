import type { ReactNode } from "react";
import { EmptyState, SectionHeader } from "@/app/components/ui";

export default function CampaignSection({
  id,
  eyebrow,
  title,
  count,
  emptyTitle,
  emptyDescription,
  children,
}: {
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
  count: number;
  emptyTitle: ReactNode;
  emptyDescription: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="campaign-section" aria-labelledby={id}>
      <SectionHeader eyebrow={eyebrow} title={title} titleId={id} count={count} />
      {count ? (
        <div className="campaign-grid">{children}</div>
      ) : (
        <EmptyState compact headingLevel={3} title={emptyTitle}>
          {emptyDescription}
        </EmptyState>
      )}
    </section>
  );
}
