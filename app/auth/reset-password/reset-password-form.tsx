"use client";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useMemo, useState, type FormEvent } from "react";
import { Button, FormField } from "@/app/components/ui";
import { FormMessage } from "@/app/components/form-feedback";

export default function ResetPasswordForm({ supabaseUrl, publishableKey }: { supabaseUrl: string; publishableKey: string }) {
  const [message, setMessage] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const client = useMemo(() => createClient(
    supabaseUrl,
    publishableKey,
    { auth: { detectSessionInUrl: true, persistSession: true } },
  ), [publishableKey, supabaseUrl]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") || "");
    const confirmation = String(values.get("confirmPassword") || "");
    if (password.length < 8) return setMessage("Password must be at least 8 characters.");
    if (password !== confirmation) return setMessage("Passwords do not match.");
    setPending(true);
    setMessage(undefined);
    const { error } = await client.auth.updateUser({ password });
    setPending(false);
    if (error) return setMessage("This reset link is invalid or expired. Request a new one.");
    await client.auth.signOut();
    setSuccess(true);
    setMessage("Your password has been updated. You can now sign in.");
  }

  return success ? (
    <div className="auth-form"><FormMessage success>{message}</FormMessage><Link className="primary-button button" href="/auth/login">Sign in</Link></div>
  ) : (
    <form className="auth-form" onSubmit={submit}>
      <FormField label="New password" htmlFor="password"><input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} /></FormField>
      <FormField label="Confirm password" htmlFor="confirmPassword"><input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} /></FormField>
      <FormMessage>{message}</FormMessage>
      <Button type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</Button>
    </form>
  );
}
