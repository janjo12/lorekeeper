"use client";

import { useActionState } from "react";
import ConfirmDeleteButton from "@/app/components/confirm-delete-button";
import { FormMessage } from "@/app/components/form-feedback";
import { FormField } from "@/app/components/ui";
import { deleteCurrentAccount } from "@/app/data/profile/actions";
import PasswordInput from "@/app/components/password-input";

export default function AccountDeleteForm({ username }: { username: string }) {
  const [state, action] = useActionState(deleteCurrentAccount, {});

  return (
    <form action={action} className="account-delete-form">
      <FormField label="Current password" htmlFor="delete-account-password">
        <PasswordInput
          autoComplete="current-password"
          id="delete-account-password"
          name="currentPassword"
          required
        />
      </FormField>
      <FormMessage>{state.message}</FormMessage>
      <ConfirmDeleteButton
        className="danger-button"
        warningMessage={`Permanently delete @${username} and every campaign, entity, category, textbox, image, comment, tag, invitation, and saved AI API owned by this account? This cannot be undone.`}
      >
        Delete account
      </ConfirmDeleteButton>
    </form>
  );
}
