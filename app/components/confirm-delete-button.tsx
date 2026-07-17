"use client";

import { useFormStatus } from "react-dom";

type ConfirmDeleteButtonProps = {
  className?: string;
  itemName?: string;
  children?: React.ReactNode;
};

/** Use this component for every destructive delete submit in the app. */
export default function ConfirmDeleteButton({
  className,
  itemName = "this item",
  children = "Delete",
}: ConfirmDeleteButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (
          !window.confirm(`Are you sure you want to delete ${itemName}? This cannot be undone.`)
        ) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {pending ? "Deleting…" : children}
    </button>
  );
}
