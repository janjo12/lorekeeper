"use client";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button, FormField } from "@/app/components/ui";
import { FormMessage } from "@/app/components/form-feedback";

export default function ResetPasswordForm({ supabaseUrl, publishableKey }: { supabaseUrl: string; publishableKey: string }) {
  const [recoveryState, setRecoveryState] = useState<"verifying" | "ready" | "invalid">("verifying");
  const [message, setMessage] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const sawRecoveryLink = useRef(false);
  const client = useMemo(() => createClient(
    supabaseUrl,
    publishableKey,
    {
      auth: {
        detectSessionInUrl: true,
        persistSession: false,
        skipAutoInitialize: true,
      },
    },
  ), [publishableKey, supabaseUrl]);

  useEffect(() => {
    let active = true;
    const parameters = new URLSearchParams(
      `${window.location.search.slice(1)}&${window.location.hash.slice(1)}`,
    );
    sawRecoveryLink.current ||= parameters.get("type") === "recovery";

    const { data: subscription } = client.auth.onAuthStateChange((event, session) => {
      if (active && event === "PASSWORD_RECOVERY" && session) {
        sawRecoveryLink.current = true;
        setRecoveryState("ready");
      }
    });

    void (async () => {
      if (!supabaseUrl || !publishableKey) {
        if (active) setRecoveryState("invalid");
        return;
      }

      const initialized = await client.auth.initialize();
      if (!active) return;
      const { data } = await client.auth.getSession();
      if (!active) return;
      setRecoveryState(!initialized.error && sawRecoveryLink.current && data.session ? "ready" : "invalid");
    })();

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [client, publishableKey, supabaseUrl]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") || "");
    const confirmation = String(values.get("confirmPassword") || "");
    if (password.length < 8) return setMessage("Password must be at least 8 characters.");
    if (password !== confirmation) return setMessage("Passwords do not match.");
    setPending(true);
    setMessage(undefined);
    const { data: sessionData } = await client.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setPending(false);
      setRecoveryState("invalid");
      return;
    }
    const response = await fetch("/api/password-recovery", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setPending(false);
    if (!response.ok) {
      if (response.status === 401) {
        setRecoveryState("invalid");
        return setMessage(undefined);
      }
      return setMessage(result.error || "We could not update your password. Please try again.");
    }
    await client.auth.signOut();
    setSuccess(true);
    setMessage("Your password has been updated. You can now sign in.");
  }

  if (recoveryState === "verifying") {
    return <div className="auth-form"><FormMessage success>Verifying your secure reset link…</FormMessage></div>;
  }

  if (recoveryState === "invalid") {
    return (
      <div className="auth-form">
        <FormMessage>This reset link is invalid, expired, or has already been used.</FormMessage>
        <Link className="primary-button button" href="/auth/forgot-password">Request another reset email</Link>
        <p className="auth-switch"><Link href="/auth/login">Back to sign in</Link></p>
      </div>
    );
  }

  return success ? (
    <div className="auth-form"><FormMessage success>{message}</FormMessage><Link className="primary-button button" href="/auth/login">Sign in</Link></div>
  ) : (
    <form className="auth-form" onSubmit={submit}>
      <FormField label="New password" htmlFor="password">
        <div className="password-input">
          <input id="password" name="password" type={passwordVisible ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={72} />
          <button aria-controls="password" aria-label={`${passwordVisible ? "Hide" : "Show"} password`} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)} type="button">
            {passwordVisible ? "Hide" : "Show"}
          </button>
        </div>
      </FormField>
      <FormField label="Confirm password" htmlFor="confirmPassword">
        <div className="password-input">
          <input id="confirmPassword" name="confirmPassword" type={confirmationVisible ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={72} />
          <button aria-controls="confirmPassword" aria-label={`${confirmationVisible ? "Hide" : "Show"} confirmed password`} aria-pressed={confirmationVisible} onClick={() => setConfirmationVisible((visible) => !visible)} type="button">
            {confirmationVisible ? "Hide" : "Show"}
          </button>
        </div>
      </FormField>
      <FormMessage>{message}</FormMessage>
      <Button type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</Button>
    </form>
  );
}
