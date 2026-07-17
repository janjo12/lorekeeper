"use client";

import { useActionState } from "react";
import { updateUsername } from "@/app/data/profile/actions";

export default function ProfileForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState(updateUsername, {});
  return (
    <form action={action} className="profile-form">
      <div className="field">
        <label htmlFor="profile-username">Username</label>
        <input
          id="profile-username"
          name="username"
          defaultValue={username}
          required
          minLength={3}
          maxLength={32}
        />
        {state.errors?.username?.map((error) => (
          <p className="field-error" key={error}>
            {error}
          </p>
        ))}
      </div>
      {state.message && (
        <p className={state.success ? "form-success" : "form-error"} role="status">
          {state.message}
        </p>
      )}
      <button className="primary-button" disabled={pending} type="submit">
        {pending ? "Saving…" : "Save username"}
      </button>
    </form>
  );
}
