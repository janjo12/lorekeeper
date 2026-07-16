"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCampaign } from "@/app/dataloader";
import { getSession } from "@/lib/session";

export async function addCampaign(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const name = formData.get("name")?.toString().trim();
  if (!name) return;

  await createCampaign(session.userId, name.slice(0, 80));
  revalidatePath("/data/campaigns");
}
