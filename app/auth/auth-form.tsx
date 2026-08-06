"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { AuthState } from "./actions";
import { FormField } from "@/app/components/ui";
import { FormMessage, SubmitButton } from "@/app/components/form-feedback";

type Props = {
  mode: "login" | "signup";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
};

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const signingUp = mode === "signup";

  return (
    <form action={formAction} className="auth-form">
      {signingUp && (
        <FormField label="Username" htmlFor="username" errors={state.errors?.username}>
          <input id="username" name="username" autoComplete="username" required autoFocus />
        </FormField>
      )}
      <FormField label="Email" htmlFor="email" errors={state.errors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus={!signingUp}
        />
      </FormField>
      <FormField label="Password" htmlFor="password" errors={state.errors?.password}>
        <div className="password-input">
          <input
            id="password"
            name="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete={signingUp ? "new-password" : "current-password"}
            required
          />
          <button
            aria-controls="password"
            aria-label={`${passwordVisible ? "Hide" : "Show"} password`}
            aria-pressed={passwordVisible}
            onClick={() => setPasswordVisible((visible) => !visible)}
            type="button"
          >
            {passwordVisible ? "Hide" : "Show"}
          </button>
        </div>
      </FormField>
      {signingUp && (
        <FormField
          label="Confirm password"
          htmlFor="confirmPassword"
          errors={state.errors?.confirmPassword}
        >
          <div className="password-input">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={confirmationVisible ? "text" : "password"}
              autoComplete="new-password"
              required
            />
            <button
              aria-controls="confirmPassword"
              aria-label={`${confirmationVisible ? "Hide" : "Show"} confirmed password`}
              aria-pressed={confirmationVisible}
              onClick={() => setConfirmationVisible((visible) => !visible)}
              type="button"
            >
              {confirmationVisible ? "Hide" : "Show"}
            </button>
          </div>
        </FormField>
      )}
      <FormMessage>{state.message}</FormMessage>
      {!signingUp && (
        <Link className="auth-forgot-link" href="/auth/forgot-password">
          Forgot password?
        </Link>
      )}
      <SubmitButton disabled={pending} pendingLabel="Please wait…">
        {signingUp ? "Create account" : "Sign in"}
      </SubmitButton>
      <p className="auth-switch">
        {signingUp ? "Already have an account?" : "New to Lorekeeper?"}{" "}
        <Link href={signingUp ? "/auth/login" : "/auth/signup"}>
          {signingUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
