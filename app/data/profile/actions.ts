"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createAiApiForUser,
  changeUserPassword,
  deleteAiApiForUser,
  setDefaultAiApiForUser,
  updateProfileUsername,
} from "@/app/dataloader";
import { createSession, getSession } from "@/lib/session";

export type ProfileState = {
  errors?: { username?: string[] };
  message?: string;
  success?: boolean;
};

const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters.")
    .max(32)
    .regex(/^[a-z0-9_]+$/, "Use only letters, numbers, and underscores."),
});

export async function updateUsername(
  _state: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const session = await getSession();
  if (!session) return { message: "Your session has expired. Sign in again." };
  const parsed = usernameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  try {
    const profile = await updateProfileUsername(session.userId, parsed.data.username);
    await createSession({ ...session, username: profile.username });
    return { success: true, message: "Username updated." };
  } catch (error) {
    if (error instanceof Error && /duplicate|unique|username/i.test(error.message)) {
      return { message: "That username is already taken." };
    }
    return { message: "We could not update your username." };
  }
}

export type PasswordState = {
  errors?: Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string[]>>;
  message?: string;
  success?: boolean;
};

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(72),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters.")
      .max(72, "New password must be 72 characters or fewer."),
    confirmPassword: z.string(),
  })
  .superRefine((values, context) => {
    if (values.newPassword !== values.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
    if (values.currentPassword === values.newPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Choose a password different from your current password.",
      });
    }
  });

export async function updatePassword(
  _state: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await getSession();
  if (!session) return { message: "Your session has expired. Sign in again." };
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  try {
    const tokens = await changeUserPassword(
      session.userId,
      session.email,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    await createSession(session, tokens);
    return { success: true, message: "Password updated." };
  } catch (error) {
    if (
      error instanceof Error &&
      /invalid email or password|invalid login credentials|current password/i.test(error.message)
    ) {
      return { message: "Your current password is incorrect." };
    }
    return { message: "We could not update your password." };
  }
}

export type AiApiState = {
  errors?: Partial<Record<"name" | "provider" | "baseUrl" | "apiKey", string[]>>;
  message?: string;
  success?: boolean;
};

const aiApiSchema = z.object({
  name: z.string().trim().min(1, "Give this API a name.").max(80),
  provider: z.string().trim().min(1, "Choose a provider.").max(50),
  baseUrl: z.union([z.literal(""), z.url("Enter a complete URL, including https://.")]),
  apiKey: z.string().trim().min(1, "Enter an API key.").max(500),
  makeDefault: z.boolean(),
});

export async function addAiApi(_state: AiApiState, formData: FormData): Promise<AiApiState> {
  const session = await getSession();
  if (!session) return { message: "Your session has expired. Sign in again." };
  if (formData.get("connectionTestPassed") !== "true") {
    return { message: "Test the connection successfully before saving." };
  }
  const parsed = aiApiSchema.safeParse({
    name: formData.get("name"),
    provider: formData.get("provider"),
    baseUrl: String(formData.get("baseUrl") ?? "").trim(),
    apiKey: formData.get("apiKey"),
    makeDefault: formData.get("makeDefault") === "on",
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  try {
    await createAiApiForUser(session.userId, parsed.data);
    revalidatePath("/data/profile");
    return { success: true, message: "AI API added securely." };
  } catch (error) {
    if (error instanceof Error && /duplicate|unique/i.test(error.message)) {
      return { message: "You already have an AI API with that name." };
    }
    return { message: "We could not add that AI API." };
  }
}

const apiIdSchema = z.uuid();

export async function chooseDefaultAiApi(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Your session has expired. Sign in again.");
  const apiId = apiIdSchema.parse(formData.get("apiId"));
  await setDefaultAiApiForUser(session.userId, apiId);
  revalidatePath("/data/profile");
}

export async function removeAiApi(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Your session has expired. Sign in again.");
  const apiId = apiIdSchema.parse(formData.get("apiId"));
  await deleteAiApiForUser(session.userId, apiId);
  revalidatePath("/data/profile");
}
