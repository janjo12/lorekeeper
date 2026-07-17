"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addEntityComment, addEntityImage, addEntityTag, addEntityTextbox, createCampaign, createCategory, createLoreEntity, createTag, updateEntityDetails } from "@/app/dataloader";
import { getSession } from "@/lib/session";

export async function addCampaign(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const name = formData.get("name")?.toString().trim();
  if (!name) return;

  await createCampaign(session.userId, name.slice(0, 80));
  revalidatePath("/data/campaigns");
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

async function entityAction(formData: FormData, operation: (userId: string, entityId: string) => Promise<unknown>) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const entityId = formData.get("entityId")?.toString();
  if (!entityId) return;
  await operation(session.userId, entityId);
  revalidatePath("/data/campaign-lore");
}

export async function editEntity(formData: FormData) {
  return entityAction(formData, (userId, entityId) => updateEntityDetails(userId, entityId, formData.get("name")?.toString().trim().slice(0, 80) || "Untitled", formData.get("categoryId")?.toString()));
}
export async function createEntityTextbox(formData: FormData) {
  return entityAction(formData, (userId, entityId) => addEntityTextbox(userId, entityId, formData.get("name")?.toString().trim().slice(0, 80) || "Notes", formData.get("content")?.toString().trim() || ""));
}
export async function createEntityImage(formData: FormData) {
  return entityAction(formData, (userId, entityId) => addEntityImage(userId, entityId, formData.get("name")?.toString().trim().slice(0, 80) || "Image", formData.get("url")?.toString().trim() || ""));
}
export async function attachEntityTag(formData: FormData) {
  return entityAction(formData, (userId, entityId) => addEntityTag(userId, entityId, formData.get("tagId")?.toString() || ""));
}
export async function createEntityComment(formData: FormData) {
  return entityAction(formData, (userId, entityId) => addEntityComment(userId, entityId, formData.get("content")?.toString().trim() || ""));
}
