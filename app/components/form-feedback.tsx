"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/app/components/ui";

type ServerFormAction = (formData: FormData) => Promise<unknown>;

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  disabled,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} disabled={disabled || pending} type="submit">
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function FormMessage({
  children,
  success = false,
}: {
  children?: ReactNode;
  success?: boolean;
}) {
  if (!children) return null;

  return (
    <p
      aria-live="polite"
      className={success ? "form-success" : "form-error"}
      role={success ? "status" : "alert"}
    >
      {children}
    </p>
  );
}

export function ActionForm({
  action,
  children,
  className,
  errorMessage = "We couldn’t save that change. Please try again.",
  onSuccess,
  ...props
}: Omit<React.ComponentProps<"form">, "action"> & {
  action: ServerFormAction;
  children: ReactNode;
  errorMessage?: string;
  onSuccess?: () => void;
}) {
  const [error, setError] = useState<string>();

  return (
    <form
      {...props}
      action={async (formData) => {
        setError(undefined);
        try {
          await action(formData);
          onSuccess?.();
        } catch (reason) {
          console.error("Form action failed", reason);
          setError(toUserFacingMessage(reason, errorMessage));
        }
      }}
      className={className}
    >
      {children}
      <FormMessage>{error}</FormMessage>
    </form>
  );
}

function toUserFacingMessage(reason: unknown, fallback: string) {
  if (!(reason instanceof Error)) return fallback;
  if (/8 MB or smaller/i.test(reason.message)) return "Images must be 8 MB or smaller.";
  if (/JPEG, PNG, WebP, or GIF/i.test(reason.message))
    return "Choose a JPEG, PNG, WebP, or GIF image.";
  if (/session|sign in|unauthenticated/i.test(reason.message))
    return "Your session has expired. Refresh the page and sign in again.";
  if (/already|duplicate|unique/i.test(reason.message))
    return "That item already exists. Choose a different value.";
  if (/Only the campaign GM|who knows this lore/i.test(reason.message))
    return "You no longer have permission to make that change. Refresh the page.";
  return fallback;
}
