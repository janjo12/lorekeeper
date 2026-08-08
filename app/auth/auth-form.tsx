"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "./actions";
import { FormField } from "@/app/components/ui";
import { FormMessage, SubmitButton } from "@/app/components/form-feedback";
import PasswordInput from "@/app/components/password-input";

type Props = {
  mode: "login" | "signup";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
};

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
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
        <PasswordInput
          id="password"
          name="password"
          autoComplete={signingUp ? "new-password" : "current-password"}
          required
        />
      </FormField>
      {signingUp && (
        <FormField
          label="Confirm password"
          htmlFor="confirmPassword"
          errors={state.errors?.confirmPassword}
        >
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            toggleLabel="confirmed password"
          />
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
