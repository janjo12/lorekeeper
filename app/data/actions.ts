"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addCampaignPlayer,
  addEntityComment,
  addEntityImage,
  addEntityTag,
  addEntityTextbox,
  createCampaign,
  createCategory,
  createLoreEntity,
  createTag,
  deleteCampaign,
  deleteEntityContent,
  renameCampaign,
  setEntityContentReveal,
  updateEntityContent,
  updateEntityDetails,
  updateThemeSetting,
} from "@/app/dataloader";
import { getSession } from "@/lib/session";

export async function addCampaign(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const name = formData.get("name")?.toString().trim();
  if (!name) return;

  await createCampaign(session.userId, name.slice(0, 80));
  revalidatePath("/data/campaigns");
}

async function campaignAction(
  formData: FormData,
  operation: (userId: string, campaignId: string) => Promise<unknown>,
) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const campaignId = formData.get("campaignId")?.toString();
  if (!campaignId) return;
  await operation(session.userId, campaignId);
  revalidatePath("/data", "layout");
}

export async function editCampaign(formData: FormData) {
  const name = formData.get("name")?.toString().trim().slice(0, 80);
  if (!name) return;
  return campaignAction(formData, (userId, campaignId) => renameCampaign(userId, campaignId, name));
}

export async function inviteCampaignPlayer(formData: FormData) {
  const username = formData.get("username")?.toString().trim().toLowerCase().slice(0, 32);
  if (!username) return;
  return campaignAction(formData, (userId, campaignId) =>
    addCampaignPlayer(userId, campaignId, username),
  );
}

export type CampaignPlayerState = { message?: string; success?: boolean };

export async function inviteCampaignPlayerWithState(
  _state: CampaignPlayerState,
  formData: FormData,
): Promise<CampaignPlayerState> {
  try {
    await inviteCampaignPlayer(formData);
    return { message: "Player added.", success: true };
  } catch (error) {
    const message =
      error instanceof Error && /No user|GM cannot|Only the campaign GM/i.test(error.message)
        ? error.message.replace(/^Could not add player:\s*/i, "")
        : "Could not add that player. Check the username and try again.";
    return { message, success: false };
  }
}

export async function removeCampaign(formData: FormData) {
  await campaignAction(formData, deleteCampaign);
  redirect("/data/campaigns");
}

export async function addTag(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const name = formData.get("name")?.toString().trim();
  if (!name) return;
  await createTag(session.userId, name.slice(0, 40));
  revalidatePath("/data/tags");
}

export async function addLoreEntity(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const campaignId = formData.get("campaignId")?.toString();
  const name = formData.get("name")?.toString().trim();
  const categoryId = formData.get("categoryId")?.toString();
  if (!campaignId || !name) return;
  await createLoreEntity(campaignId, session.userId, name.slice(0, 80), categoryId);
  revalidatePath("/data/campaign-lore");
}

export async function addCategory(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const name = formData.get("name")?.toString().trim();
  const parentCategoryId = formData.get("parentCategoryId")?.toString();
  if (!name) return;
  await createCategory(session.userId, name.slice(0, 80), parentCategoryId);
  revalidatePath("/data/campaign-lore");
}

async function entityAction(
  formData: FormData,
  operation: (userId: string, entityId: string) => Promise<unknown>,
) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const entityId = formData.get("entityId")?.toString();
  if (!entityId) return;
  await operation(session.userId, entityId);
  revalidatePath("/data/campaign-lore");
}

export async function editEntity(formData: FormData) {
  return entityAction(formData, (userId, entityId) =>
    updateEntityDetails(
      userId,
      entityId,
      formData.get("name")?.toString().trim().slice(0, 80) || "Untitled",
      formData.get("categoryId")?.toString(),
    ),
  );
}
export async function createEntityTextbox(formData: FormData) {
  return entityAction(formData, (userId, entityId) =>
    addEntityTextbox(
      userId,
      entityId,
      formData.get("name")?.toString().trim().slice(0, 80) || "Notes",
      formData.get("content")?.toString().trim() || "",
    ),
  );
}
export async function createEntityImage(formData: FormData) {
  const file = formData.get("image");
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > 8 * 1024 * 1024) throw new Error("Images must be 8 MB or smaller.");
  if (!allowedTypes.has(file.type)) throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
  return entityAction(formData, (userId, entityId) =>
    addEntityImage(
      userId,
      entityId,
      formData.get("name")?.toString().trim().slice(0, 80) || "Image",
      file,
    ),
  );
}
export async function attachEntityTag(formData: FormData) {
  return entityAction(formData, (userId, entityId) =>
    addEntityTag(userId, entityId, formData.get("tagId")?.toString() || ""),
  );
}
export async function createEntityComment(formData: FormData) {
  return entityAction(formData, (userId, entityId) =>
    addEntityComment(userId, entityId, formData.get("content")?.toString().trim() || ""),
  );
}

async function contentAction(
  formData: FormData,
  operation: (userId: string, contentId: string, type: string) => Promise<unknown>,
) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const contentId = formData.get("contentId")?.toString();
  const type = formData.get("contentType")?.toString();
  if (!contentId || !type || !["textbox", "image"].includes(type)) return;
  await operation(session.userId, contentId, type);
  revalidatePath("/data/campaign-lore");
}

export async function editEntityContent(formData: FormData) {
  return contentAction(formData, (userId, contentId, type) =>
    updateEntityContent(
      userId,
      contentId,
      type,
      formData.get("name")?.toString().trim().slice(0, 80) ||
        (type === "image" ? "Image" : "Notes"),
      type === "image" ? "" : formData.get("value")?.toString().trim() || "",
    ),
  );
}

export async function changeEntityContentReveal(formData: FormData) {
  return contentAction(formData, (userId, contentId, type) =>
    setEntityContentReveal(
      userId,
      contentId,
      type,
      formData.get("revealToAll") === "true",
      formData.getAll("profileId").map(String),
    ),
  );
}

export async function removeEntityContent(formData: FormData) {
  return contentAction(formData, deleteEntityContent);
}

const allowedThemes = new Set(["parchment", "ivory", "sage", "midnight", "ember", "ink"]);

export async function saveTheme(theme: string) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (!allowedThemes.has(theme)) throw new Error("Invalid theme selection.");
  await updateThemeSetting(session.userId, theme);
  revalidatePath("/data", "layout");
}
