"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { loginUser, requestPasswordReset, signupUser } from "@/app/dataloader";
import { createSession, deleteSession } from "@/lib/session";
import { passwordCreationSchema } from "@/lib/password-policy";

export type AuthState = {
  errors?: {
    email?: string[];
    username?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
  message?: string;
  success?: boolean;
};

const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  // Login must accept any existing credential. Password policy belongs only
  // to password creation and must not prevent legacy credentials from signing in.
  password: z.string(),
});
const signupSchema = loginSchema
  .extend({
    password: passwordCreationSchema,
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(32)
      .regex(/^[a-z0-9_]+$/, "Use only letters, numbers, and underscores."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type AuthenticatedUser = {
  id: string;
  username: string;
  accessToken: string;
  refreshToken: string;
};

async function persistAuthenticatedUser(user: AuthenticatedUser, email: string) {
  await createSession(
    { userId: user.id, email, username: user.username },
    { accessToken: user.accessToken, refreshToken: user.refreshToken },
  );
}

export async function signup(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  try {
    const user = await signupUser(parsed.data.email, parsed.data.username, parsed.data.password);
    await persistAuthenticatedUser(user, parsed.data.email);
  } catch (error) {
    console.error("Signup failed", error);
    return { message: authErrorMessage(error, "We could not create your account.") };
  }
  redirect("/data/campaigns");
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  try {
    const user = await loginUser(parsed.data.email, parsed.data.password);
    await persistAuthenticatedUser(user, parsed.data.email);
  } catch (error) {
    console.error("Login failed", error);
    return { message: authErrorMessage(error, "Invalid email or password.") };
  }
  redirect("/data/campaigns");
}

export async function forgotPassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = z
    .email("Enter a valid email address.")
    .trim()
    .toLowerCase()
    .safeParse(formData.get("email"));
  if (!email.success) return { errors: { email: [email.error.issues[0].message] } };
  try {
    const requestHeaders = await headers();
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || requestHeaders.get("origin");
    if (!origin) throw new Error("Application URL is not configured");
    await requestPasswordReset(email.data, `${origin}/auth/reset-password`);
  } catch (error) {
    console.error("Password recovery failed", error);
    const throttlingMessage = passwordRecoveryThrottlingMessage(error);
    if (throttlingMessage) {
      return {
        message: throttlingMessage,
        success: false,
      };
    }

    // Keep the response account-enumeration safe. Unknown addresses and
    // provider failures receive the same outward response.
    return {
      message: "If that email belongs to an account, a password reset link is on its way.",
      success: true,
    };
  }
  return {
    message: "If that email belongs to an account, a password reset link is on its way.",
    success: true,
  };
}

function passwordRecoveryThrottlingMessage(error: unknown) {
  if (!(error instanceof Error)) return undefined;

  const seconds = error.message.match(/after\s+(\d+)\s+seconds?/i)?.[1];
  if (/security purposes|after\s+\d+\s+seconds?/i.test(error.message)) {
    return seconds
      ? `A reset email was requested recently. Try again in ${seconds} seconds.`
      : "A reset email was requested recently. Wait about a minute, then try again.";
  }

  const code = (error as Error & { code?: string }).code;
  if (
    code === "over_email_send_rate_limit" ||
    /email.*rate limit|rate limit.*email/i.test(error.message)
  ) {
    return "The email service has reached its sending limit. Try again later; with Supabase’s built-in email service, this can take up to an hour.";
  }
  if (code === "over_request_rate_limit" || /rate limit/i.test(error.message)) {
    return "Too many password reset requests have been made. Please try again later.";
  }

  return undefined;
}

export async function logout() {
  await deleteSession();
  redirect("/auth/login");
}

function authErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (/email.*already|email_exists/i.test(error.message))
      return "That email is already registered.";
    if (/username|profile_username|duplicate|unique/i.test(error.message))
      return "That username is already taken.";
    if (/profile|schema cache|relation/i.test(error.message))
      return "Database profile setup is incomplete. Apply the newest Supabase migration.";
    if (/configuration|must be configured|environment/i.test(error.message))
      return "Authentication is not configured for this deployment.";
  }
  return fallback;
}
