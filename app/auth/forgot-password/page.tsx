"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword } from "@/app/auth/actions";
import { FormMessage, SubmitButton } from "@/app/components/form-feedback";
import { AuthCard, FormField } from "@/app/components/ui";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, {});
  return (
    <AuthCard eyebrow="Account recovery" title="Reset your password" description="We’ll email you a secure link to choose a new password.">
      <form action={action} className="auth-form">
        <FormField label="Email" htmlFor="email" errors={state.errors?.email}>
          <input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </FormField>
        <FormMessage success={Boolean(state.message)}>{state.message}</FormMessage>
        <SubmitButton disabled={pending} pendingLabel="Sending…">Send reset email</SubmitButton>
        <p className="auth-switch"><Link href="/auth/login">Back to sign in</Link></p>
      </form>
    </AuthCard>
  );
}
