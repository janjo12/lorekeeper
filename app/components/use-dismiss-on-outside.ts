"use client";

import { useEffect, useRef } from "react";

/** Close a popup when a pointer press starts anywhere outside its container. */
export function useDismissOnOutside<T extends HTMLElement>(
  active: boolean,
  onDismiss: () => void,
) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!active) return;

    function dismissFromOutside(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !containerRef.current?.contains(target)) onDismiss();
    }

    document.addEventListener("pointerdown", dismissFromOutside);
    return () => document.removeEventListener("pointerdown", dismissFromOutside);
  }, [active, onDismiss]);

  return containerRef;
}
