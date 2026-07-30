"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Application failed", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="page-status error-state">
          <h1>Something went wrong</h1>
          <p>Your data is safe. Try loading Lorekeeper again.</p>
          <button className="button primary-button" onClick={unstable_retry} type="button">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
