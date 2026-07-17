"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "./actions";

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
        <div className="field">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" required autoFocus />
          {state.errors?.username?.map((error) => <p className="field-error" key={error}>{error}</p>)}
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required autoFocus={!signingUp} />
        {state.errors?.email?.map((error) => <p className="field-error" key={error}>{error}</p>)}
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete={signingUp ? "new-password" : "current-password"} required />
        {state.errors?.password?.map((error) => <p className="field-error" key={error}>{error}</p>)}
      </div>
      {signingUp && (
        <div className="field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          {state.errors?.confirmPassword?.map((error) => <p className="field-error" key={error}>{error}</p>)}
        </div>
      )}
      {state.message && <p className="form-error" role="alert">{state.message}</p>}
      <button className="primary-button" disabled={pending} type="submit">
        {pending ? "Please wait…" : signingUp ? "Create account" : "Sign in"}
      </button>
      <p className="auth-switch">
        {signingUp ? "Already have an account?" : "New to Lorekeeper?"}{" "}
        <Link href={signingUp ? "/auth/login" : "/auth/signup"}>{signingUp ? "Sign in" : "Create an account"}</Link>
      </p>
    </form>
  );
}
