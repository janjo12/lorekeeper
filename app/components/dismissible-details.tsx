"use client";

import { type ComponentPropsWithoutRef, useEffect, useRef } from "react";

/** A native details popup that closes when the user clicks or taps elsewhere. */
export default function DismissibleDetails({ children, ...props }: ComponentPropsWithoutRef<"details">) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function dismissFromOutside(event: PointerEvent) {
      const details = detailsRef.current;
      const target = event.target;
      if (details?.open && target instanceof Node && !details.contains(target)) {
        details.open = false;
      }
    }

    document.addEventListener("pointerdown", dismissFromOutside);
    return () => document.removeEventListener("pointerdown", dismissFromOutside);
  }, []);

  return (
    <details {...props} ref={detailsRef}>
      {children}
    </details>
  );
}
