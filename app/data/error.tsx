"use client";

import { useEffect } from "react";
import { PageErrorFallback } from "@/app/components/async-status";

export default function DataError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Data route failed", error);
  }, [error]);

  return <PageErrorFallback onRetry={unstable_retry} />;
}
