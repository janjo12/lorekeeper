"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormField } from "@/app/components/ui";
import { FormMessage, SubmitButton } from "@/app/components/form-feedback";
import { updatePassword } from "@/app/data/profile/actions";
import PasswordInput from "@/app/components/password-input";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

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
          <PasswordInput
            autoComplete="current-password"
            id="current-password"
            name="currentPassword"
            required
          />
        </FormField>
        <FormField label="New password" htmlFor="new-password" errors={state.errors?.newPassword}>
          <PasswordInput
            autoComplete="new-password"
            id="new-password"
            maxLength={MAX_PASSWORD_LENGTH}
            minLength={MIN_PASSWORD_LENGTH}
            name="newPassword"
            required
          />
        </FormField>
        <FormField
          label="Confirm new password"
          htmlFor="confirm-password"
          errors={state.errors?.confirmPassword}
        >
          <PasswordInput
            autoComplete="new-password"
            id="confirm-password"
            maxLength={MAX_PASSWORD_LENGTH}
            minLength={MIN_PASSWORD_LENGTH}
            name="confirmPassword"
            required
            toggleLabel="confirmed password"
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
