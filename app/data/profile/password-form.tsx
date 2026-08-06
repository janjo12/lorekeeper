"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormField } from "@/app/components/ui";
import { FormMessage, SubmitButton } from "@/app/components/form-feedback";
import { updatePassword } from "@/app/data/profile/actions";

export default function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <section className="password-settings" aria-labelledby="password-settings-title">
      <header>
        <h2 id="password-settings-title">Password</h2>
        <p>Verify your current password before choosing a new one.</p>
      </header>
      <form action={action} className="password-form" ref={formRef}>
        <FormField
          label="Current password"
          htmlFor="current-password"
          errors={state.errors?.currentPassword}
        >
          <input
            autoComplete="current-password"
            id="current-password"
            name="currentPassword"
            required
            type="password"
          />
        </FormField>
        <FormField
          label="New password"
          htmlFor="new-password"
          errors={state.errors?.newPassword}
        >
          <input
            autoComplete="new-password"
            id="new-password"
            maxLength={72}
            minLength={8}
            name="newPassword"
            required
            type="password"
          />
        </FormField>
        <FormField
          label="Confirm new password"
          htmlFor="confirm-password"
          errors={state.errors?.confirmPassword}
        >
          <input
            autoComplete="new-password"
            id="confirm-password"
            maxLength={72}
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />
        </FormField>
        <FormMessage success={state.success}>{state.message}</FormMessage>
        <SubmitButton disabled={pending} pendingLabel="Updating…">
          Update password
        </SubmitButton>
      </form>
    </section>
  );
}
