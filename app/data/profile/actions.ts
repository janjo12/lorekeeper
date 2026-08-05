"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createAiApiForUser,
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
