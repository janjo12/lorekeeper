"use server";

import { z } from "zod";
import { updateProfileUsername } from "@/app/dataloader";
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
