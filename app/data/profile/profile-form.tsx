"use client";

import { useActionState } from "react";
import { FormField } from "@/app/components/ui";
import { FormMessage, SubmitButton } from "@/app/components/form-feedback";
import { updateUsername } from "@/app/data/profile/actions";

export default function ProfileForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState(updateUsername, {});
  return (
    <form action={action} className="profile-form">
      <FormField label="Username" htmlFor="profile-username" errors={state.errors?.username}>
        <input
          id="profile-username"
          name="username"
          defaultValue={username}
          required
          minLength={3}
          maxLength={32}
        />
      </FormField>
      <FormMessage success={state.success}>{state.message}</FormMessage>
      <SubmitButton disabled={pending} pendingLabel="Saving…">
        Save username
      </SubmitButton>
    </form>
  );
}
