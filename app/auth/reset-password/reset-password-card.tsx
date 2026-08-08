"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/app/components/ui";
import ResetPasswordForm from "@/app/auth/reset-password/reset-password-form";

export default function ResetPasswordCard({
  supabaseUrl,
  publishableKey,
}: {
  supabaseUrl: string;
  publishableKey: string;
}) {
  const [complete, setComplete] = useState(false);

  if (complete) {
    return (
      <AuthCard
        eyebrow="Account recovery"
        title="Your password has been updated."
        description="You can now sign in with your password."
      >
        <div className="auth-form password-reset-complete">
          <Link className="primary-button button" href="/auth/login">Sign in</Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Choose a new password"
      description="Use at least eight characters for your new password."
    >
      <ResetPasswordForm
        supabaseUrl={supabaseUrl}
        publishableKey={publishableKey}
        onSuccess={() => setComplete(true)}
      />
    </AuthCard>
  );
}
