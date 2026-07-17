import "server-only";
import { createClient } from "@supabase/supabase-js";

let client;
let clientConfigKey;

function getSupabaseConfig() {
  const url = firstEnvironmentValue("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = firstEnvironmentValue("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secretKey) {
    throw new Error(
      "Supabase server configuration is incomplete. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).",
    );
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
  const profileResult = await database
    .from("profile")
    .select("id, username, created_at")
    .eq("id", data.user.id)
    .maybeSingle();
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

export async function getUserPreferences(userId) {
  const { data, error } = await getDatabase()
    .from("profile")
    .select("last_campaign_id, theme_setting")
    .eq("id", userId)
    .maybeSingle();
  throwIfError(error, "Could not load user preferences");
  return data ?? { last_campaign_id: null, theme_setting: "parchment" };
}

export async function updateThemeSetting(userId, theme) {
  const { error } = await getDatabase()
    .from("profile")
    .update({ theme_setting: theme })
    .eq("id", userId);
  throwIfError(error, "Could not update theme");
}

export async function getCampaignsForUser(userId) {
  const { data, error } = await getDatabase().rpc("get_accessible_campaigns", {
    requesting_user_id: userId,
  });
  throwIfError(error, "Could not load campaigns");
  return data ?? [];
}

export async function getCampaignDashboard(userId) {
  const { data, error } = await getDatabase().rpc("get_campaign_dashboard", {
    requesting_user_id: userId,
  });
  throwIfError(error, "Could not load campaign dashboard");
  return data ?? { owned: [], joined: [] };
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

export const renameCampaign = (userId, campaignId, name) =>
  runEntityMutation(
    "rename_campaign",
    { requesting_user_id: userId, requested_campaign_id: campaignId, campaign_name: name },
    "Could not rename campaign",
  );
export const addCampaignPlayer = (userId, campaignId, username) =>
  runEntityMutation(
    "add_campaign_player",
    { requesting_user_id: userId, requested_campaign_id: campaignId, player_username: username },
    "Could not add player",
  );
export const deleteCampaign = (userId, campaignId) =>
  runEntityMutation(
    "delete_campaign",
    { requesting_user_id: userId, requested_campaign_id: campaignId },
    "Could not delete campaign",
  );

export async function getCampaignLore(campaignId, userId) {
  const { data, error } = await getDatabase().rpc("get_campaign_lore", {
    requesting_user_id: userId,
    requested_campaign_id: campaignId,
  });
  throwIfError(error, "Could not load campaign lore");
  return data;
}

export async function getTagsForUser(userId) {
  const { data, error } = await getDatabase()
    .from("tag")
    .select("id, name")
    .eq("user_id", userId)
    .order("name");
  throwIfError(error, "Could not load tags");
  return data ?? [];
}

export async function createTag(userId, name) {
  const { data, error } = await getDatabase()
    .from("tag")
    .insert({ user_id: userId, name })
    .select("id, name")
    .single();
  throwIfError(error, "Could not create tag");
  return data;
}

export async function createCategory(userId, name, parentCategoryId) {
  const { data, error } = await getDatabase()
    .from("category")
    .insert({
      user_id: userId,
      name,
      parent_category_id: parentCategoryId || null,
    })
    .select("id, name, parent_category_id")
    .single();
  throwIfError(error, "Could not create category");
  return data;
}

export async function createLoreEntity(campaignId, userId, name, categoryId) {
  const { data, error } = await getDatabase()
    .rpc("create_lore_entity", {
      requesting_user_id: userId,
      requested_campaign_id: campaignId,
      entity_name: name,
      requested_category_id: categoryId || null,
    })
    .single();
  throwIfError(error, "Could not create lore entity");
  return data;
}

export async function getEntityView(entityId, userId) {
  const { data, error } = await getDatabase().rpc("get_entity_view", {
    requesting_user_id: userId,
    requested_entity_id: entityId,
  });
  throwIfError(error, "Could not load entity");
  if (!data?.images?.length) return data;
  const paths = data.images.map((image) => image.storage_path);
  const { data: signedImages, error: signedImagesError } = await getDatabase()
    .storage.from("entity-images")
    .createSignedUrls(paths, 60 * 10);
  throwIfError(signedImagesError, "Could not create image links");
  return {
    ...data,
    images: data.images.map((image, index) => ({
      ...image,
      signed_url: signedImages[index]?.signedUrl,
    })),
  };
}

async function runEntityMutation(name, values, context) {
  const { error } = await getDatabase().rpc(name, values);
  throwIfError(error, context);
}

export const updateEntityDetails = (userId, entityId, name, categoryId) =>
  runEntityMutation(
    "update_entity_details",
    {
      requesting_user_id: userId,
      requested_entity_id: entityId,
      entity_name: name,
      requested_category_id: categoryId || null,
    },
    "Could not update entity",
  );
export const addEntityTextbox = (userId, entityId, name, content) =>
  runEntityMutation(
    "add_entity_textbox",
    {
      requesting_user_id: userId,
      requested_entity_id: entityId,
      textbox_name: name,
      textbox_content: content,
    },
    "Could not add textbox",
  );
export async function addEntityImage(userId, entityId, name, file) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
  const storagePath = `${userId}/${entityId}/${crypto.randomUUID()}.${extension}`;
  const database = getDatabase();
  const { error: uploadError } = await database.storage
    .from("entity-images")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  throwIfError(uploadError, "Could not upload image");
  try {
    await runEntityMutation(
    "add_entity_image",
    {
      requesting_user_id: userId,
      requested_entity_id: entityId,
      image_name: name,
      requested_storage_path: storagePath,
      requested_mime_type: file.type,
      requested_file_size: file.size,
      requested_original_filename: file.name.slice(0, 255),
    },
    "Could not add image",
    );
  } catch (error) {
    await database.storage.from("entity-images").remove([storagePath]);
    throw error;
  }
}
export const addEntityTag = (userId, entityId, tagId) =>
  runEntityMutation(
    "add_entity_tag",
    { requesting_user_id: userId, requested_entity_id: entityId, requested_tag_id: tagId },
    "Could not add tag",
  );
export const addEntityComment = (userId, entityId, content) =>
  runEntityMutation(
    "add_entity_comment",
    { requesting_user_id: userId, requested_entity_id: entityId, comment_content: content },
    "Could not add comment",
  );
export const updateEntityContent = (userId, contentId, type, name, value) =>
  runEntityMutation(
    "update_entity_content",
    {
      requesting_user_id: userId,
      requested_content_id: contentId,
      content_type: type,
      content_name: name,
      content_value: value,
    },
    "Could not update content",
  );
export const setEntityContentReveal = (userId, contentId, type, revealToAll, profileIds) =>
  runEntityMutation(
    "set_entity_content_reveal",
    {
      requesting_user_id: userId,
      requested_content_id: contentId,
      content_type: type,
      reveal_to_all: revealToAll,
      revealed_profile_ids: profileIds,
    },
    "Could not change content reveal",
  );
export async function deleteEntityContent(userId, contentId, type) {
  const { data, error } = await getDatabase().rpc("delete_entity_content", {
    requesting_user_id: userId,
    requested_content_id: contentId,
    content_type: type,
  });
  throwIfError(error, "Could not delete content");
  if (type === "image" && data) {
    const { error: storageError } = await getDatabase().storage.from("entity-images").remove([data]);
    throwIfError(storageError, "Image record was deleted, but its file could not be removed");
  }
}
