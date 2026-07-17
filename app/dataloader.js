import "server-only";
import { createClient } from "@supabase/supabase-js";

let client;
let clientConfigKey;

function getSupabaseConfig() {
  const url = firstEnvironmentValue("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = firstEnvironmentValue("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secretKey) {
    throw new Error("Supabase server configuration is incomplete. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).");
  }
  return { url, secretKey };
}

function firstEnvironmentValue(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function getAuthConfig() {
  const { url } = getSupabaseConfig();
  const publicKey = firstEnvironmentValue(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  );

  // A separate publishable key is preferred for user authentication. Falling
  // back keeps existing deployments working while credentials are migrated.
  return { url, publicKey: publicKey ?? getSupabaseConfig().secretKey };
}

function getDatabase() {
  const { url, secretKey } = getSupabaseConfig();
  const configKey = `${url}\u0000${secretKey}`;
  if (client && clientConfigKey === configKey) return client;
  client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  clientConfigKey = configKey;
  return client;
}

function throwIfError(error, context) {
  if (!error) return;
  const databaseError = new Error(`${context}: ${error.message}`);
  databaseError.code = error.code ?? error.status?.toString();
  throw databaseError;
}

function createAuthClient() {
  const { url, publicKey } = getAuthConfig();
  return createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function signupUser(email, username, password) {
  const database = getDatabase();
  const { data, error } = await database.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  throwIfError(error, "Could not create user");
  return { id: data.user.id, username, created_at: data.user.created_at };
}

export async function loginUser(email, password) {
  const database = getDatabase();
  const { data, error } = await createAuthClient().auth.signInWithPassword({
    email,
    password,
  });
  throwIfError(error, "Invalid email or password");
  const profileResult = await database.from("profile").select("id, username, created_at").eq("id", data.user.id).maybeSingle();
  throwIfError(profileResult.error, "Could not load profile");
  const profile = profileResult.data;
  if (!profile) throw new Error("Could not load profile: profile does not exist");
  return profile;
}

export async function updateProfileUsername(userId, username) {
  const { data, error } = await getDatabase()
    .from("profile")
    .update({ username })
    .eq("id", userId)
    .select("id, username, created_at")
    .single();
  throwIfError(error, "Could not update username");
  return data;
}

export async function getUserById(userId) {
  const { data, error } = await getDatabase()
    .from("profile")
    .select("id, username, created_at")
    .eq("id", userId)
    .maybeSingle();
  throwIfError(error, "Could not load profile");
  return data;
}

export async function getCampaignsForUser(userId) {
  const { data, error } = await getDatabase().rpc("get_accessible_campaigns", { requesting_user_id: userId });
  throwIfError(error, "Could not load campaigns");
  return data ?? [];
}

export async function createCampaign(ownerId, name) {
  const { data, error } = await getDatabase()
    .from("campaign")
    .insert({ user_id: ownerId, name })
    .select("id, name, user_id")
    .single();
  throwIfError(error, "Could not create campaign");
  return data;
}

export async function getCampaignLore(campaignId, userId) {
  const { data, error } = await getDatabase().rpc("get_campaign_lore", {
    requesting_user_id: userId,
    requested_campaign_id: campaignId,
  });
  throwIfError(error, "Could not load campaign lore");
  return data;
}

export async function getTagsForUser(userId) {
  const { data, error } = await getDatabase().from("tag").select("id, name").eq("user_id", userId).order("name");
  throwIfError(error, "Could not load tags");
  return data ?? [];
}

export async function createTag(userId, name) {
  const { data, error } = await getDatabase().from("tag").insert({ user_id: userId, name }).select("id, name").single();
  throwIfError(error, "Could not create tag");
  return data;
}

export async function createCategory(userId, name, parentCategoryId) {
  const { data, error } = await getDatabase().from("category").insert({
    user_id: userId,
    name,
    parent_category_id: parentCategoryId || null,
  }).select("id, name, parent_category_id").single();
  throwIfError(error, "Could not create category");
  return data;
}

export async function createLoreEntity(campaignId, userId, name, categoryId) {
  const { data, error } = await getDatabase().rpc("create_lore_entity", {
    requesting_user_id: userId,
    requested_campaign_id: campaignId,
    entity_name: name,
    requested_category_id: categoryId || null,
  }).single();
  throwIfError(error, "Could not create lore entity");
  return data;
}

export async function getEntityView(entityId, userId) {
  const { data, error } = await getDatabase().rpc("get_entity_view", { requesting_user_id: userId, requested_entity_id: entityId });
  throwIfError(error, "Could not load entity");
  return data;
}

async function runEntityMutation(name, values, context) {
  const { error } = await getDatabase().rpc(name, values);
  throwIfError(error, context);
}

export const updateEntityDetails = (userId, entityId, name, categoryId) => runEntityMutation("update_entity_details", { requesting_user_id: userId, requested_entity_id: entityId, entity_name: name, requested_category_id: categoryId || null }, "Could not update entity");
export const addEntityTextbox = (userId, entityId, name, content) => runEntityMutation("add_entity_textbox", { requesting_user_id: userId, requested_entity_id: entityId, textbox_name: name, textbox_content: content }, "Could not add textbox");
export const addEntityImage = (userId, entityId, name, url) => runEntityMutation("add_entity_image", { requesting_user_id: userId, requested_entity_id: entityId, image_name: name, requested_image_url: url }, "Could not add image");
export const addEntityTag = (userId, entityId, tagId) => runEntityMutation("add_entity_tag", { requesting_user_id: userId, requested_entity_id: entityId, requested_tag_id: tagId }, "Could not add tag");
export const addEntityComment = (userId, entityId, content) => runEntityMutation("add_entity_comment", { requesting_user_id: userId, requested_entity_id: entityId, comment_content: content }, "Could not add comment");
