"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { AuthState } from "./actions";

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
        <div className="field">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" required autoFocus />
          {state.errors?.username?.map((error) => (
            <p className="field-error" key={error}>
              {error}
            </p>
          ))}
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus={!signingUp}
        />
        {state.errors?.email?.map((error) => (
          <p className="field-error" key={error}>
            {error}
          </p>
        ))}
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
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
        {state.errors?.password?.map((error) => (
          <p className="field-error" key={error}>
            {error}
          </p>
        ))}
      </div>
      {signingUp && (
        <div className="field">
          <label htmlFor="confirmPassword">Confirm password</label>
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
          {state.errors?.confirmPassword?.map((error) => (
            <p className="field-error" key={error}>
              {error}
            </p>
          ))}
        </div>
      )}
      {state.message && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}
      <button className="primary-button" disabled={pending} type="submit">
        {pending ? "Please wait…" : signingUp ? "Create account" : "Sign in"}
      </button>
      <p className="auth-switch">
        {signingUp ? "Already have an account?" : "New to Lorekeeper?"}{" "}
        <Link href={signingUp ? "/auth/login" : "/auth/signup"}>
          {signingUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
