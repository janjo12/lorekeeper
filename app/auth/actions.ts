"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { loginUser, requestPasswordReset, signupUser } from "@/app/dataloader";
import { createSession, deleteSession } from "@/lib/session";

export type AuthState = {
  errors?: {
    email?: string[];
    username?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
  message?: string;
};

const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(72);
const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: passwordSchema,
});
const signupSchema = loginSchema
  .extend({
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

export async function signup(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  try {
    const user = await signupUser(parsed.data.email, parsed.data.username, parsed.data.password);
    await createSession(
      { userId: user.id, email: parsed.data.email, username: user.username },
      { accessToken: user.accessToken, refreshToken: user.refreshToken },
    );
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
    await createSession(
      { userId: user.id, email: parsed.data.email, username: user.username },
      { accessToken: user.accessToken, refreshToken: user.refreshToken },
    );
  } catch (error) {
    console.error("Login failed", error);
    return { message: authErrorMessage(error, "Invalid email or password.") };
  }
  redirect("/data/campaigns");
}

export async function forgotPassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = z.email("Enter a valid email address.").trim().toLowerCase().safeParse(formData.get("email"));
  if (!email.success) return { errors: { email: [email.error.issues[0].message] } };
  try {
    const requestHeaders = await headers();
    const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || requestHeaders.get("origin");
    if (!origin) throw new Error("Application URL is not configured");
    await requestPasswordReset(email.data, `${origin}/auth/reset-password`);
  } catch (error) {
    console.error("Password recovery failed", error);
  }
  return { message: "If that email belongs to an account, a password reset link is on its way." };
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
