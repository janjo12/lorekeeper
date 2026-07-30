import { EmptyState } from "@/app/components/ui";

export function PageLoading({ label = "Loading your lore…" }: { label?: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="page-status">
      <span aria-hidden="true" className="loading-spinner" />
      <p>{label}</p>
    </div>
  );
}

export function PageErrorFallback({
  onRetry,
  title = "We couldn’t load this page",
}: {
  onRetry: () => void;
  title?: string;
}) {
  return (
    <div className="page-status error-state">
      <EmptyState title={title}>
        Something unexpected happened. Your data is safe; try loading it again.
      </EmptyState>
      <button className="button primary-button" onClick={onRetry} type="button">
        Try again
      </button>
    </div>
  );
}
