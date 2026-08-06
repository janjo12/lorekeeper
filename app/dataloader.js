import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

let client;
let clientConfigKey;

// ---------------------------------------------------------------------------
// Server client and configuration
// ---------------------------------------------------------------------------

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
  const auth = await signInForSession(email, password);
  return {
    id: data.user.id,
    username,
    created_at: data.user.created_at,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
  };
}

async function signInForSession(email, password) {
  const { data, error } = await createAuthClient().auth.signInWithPassword({
    email,
    password,
  });
  throwIfError(error, "Invalid email or password");
  if (!data.session) throw new Error("Invalid email or password: session was not created");
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    authUserId: data.user.id,
  };
}

export async function loginUser(email, password) {
  const database = getDatabase();
  const auth = await signInForSession(email, password);
  const profileResult = await database
    .from("profile")
    .select("id, username, created_at")
    .eq("id", auth.authUserId)
    .maybeSingle();
  throwIfError(profileResult.error, "Could not load profile");
  const profile = profileResult.data;
  if (!profile) throw new Error("Could not load profile: profile does not exist");
  return { ...profile, accessToken: auth.accessToken, refreshToken: auth.refreshToken };
}

export async function refreshAuthSession(refreshToken) {
  const { data, error } = await createAuthClient().auth.refreshSession({
    refresh_token: refreshToken,
  });
  throwIfError(error, "Could not refresh Realtime authentication");
  if (!data.session) throw new Error("Could not refresh Realtime authentication: no session");
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

export async function changeUserPassword(userId, email, currentPassword, newPassword) {
  const verified = await signInForSession(email, currentPassword);
  if (verified.authUserId !== userId) {
    throw new Error("Current password verification did not match this account");
  }

  const { error } = await getDatabase().auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  throwIfError(error, "Could not update password");

  // Password updates can invalidate existing Supabase sessions. Sign in with
  // the new password so Auth and Realtime cookies stay synchronized.
  const refreshed = await signInForSession(email, newPassword);
  return { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken };
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

// ---------------------------------------------------------------------------
// Account AI API credentials
// ---------------------------------------------------------------------------

function getAiCredentialEncryptionKey() {
  const secret = firstEnvironmentValue("AI_API_ENCRYPTION_SECRET", "SESSION_SECRET");
  if (!secret || secret.length < 32) {
    throw new Error("AI_API_ENCRYPTION_SECRET must be at least 32 characters.");
  }
  return createHash("sha256").update(secret).digest();
}

function encryptAiApiKey(apiKey) {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getAiCredentialEncryptionKey(), initializationVector);
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return [
    "v1",
    initializationVector.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decryptAiApiKey(value) {
  const [version, initializationVector, authenticationTag, encrypted] = value.split(".");
  if (version !== "v1" || !initializationVector || !authenticationTag || !encrypted) {
    throw new Error("AI API credential has an unsupported encryption format.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getAiCredentialEncryptionKey(),
    Buffer.from(initializationVector, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authenticationTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function getAiApisForUser(userId) {
  const { data, error } = await getDatabase()
    .from("profile_ai_api")
    .select("id, name, provider, base_url, key_last_four, is_default, created_at")
    .eq("profile_id", userId)
    .order("created_at");
  throwIfError(error, "Could not load AI APIs");
  return data ?? [];
}

export async function createAiApiForUser(userId, values) {
  const { data, error } = await getDatabase().rpc("create_profile_ai_api", {
    requesting_user_id: userId,
    api_name: values.name,
    api_provider: values.provider,
    api_base_url: values.baseUrl || "",
    encrypted_key: encryptAiApiKey(values.apiKey),
    key_suffix: values.apiKey.slice(-4),
    make_default: values.makeDefault,
  });
  throwIfError(error, "Could not add AI API");
  return data;
}

export async function setDefaultAiApiForUser(userId, apiId) {
  const { error } = await getDatabase().rpc("set_default_profile_ai_api", {
    requesting_user_id: userId,
    requested_api_id: apiId,
  });
  throwIfError(error, "Could not change the default AI API");
}

export async function deleteAiApiForUser(userId, apiId) {
  const { error } = await getDatabase().rpc("delete_profile_ai_api", {
    requesting_user_id: userId,
    requested_api_id: apiId,
  });
  throwIfError(error, "Could not delete AI API");
}

// Future generation tasks can call this server-only function after selecting
// an account-owned credential. Never return its apiKey from an action or route.
export async function getAiApiCredentialForTask(userId, apiId) {
  let query = getDatabase()
    .from("profile_ai_api")
    .select("id, name, provider, base_url, encrypted_api_key")
    .eq("profile_id", userId);
  query = apiId ? query.eq("id", apiId) : query.eq("is_default", true);
  const { data, error } = await query.maybeSingle();
  throwIfError(error, "Could not load AI API credential");
  if (!data) return null;
  const { encrypted_api_key, ...metadata } = data;
  return { ...metadata, apiKey: decryptAiApiKey(encrypted_api_key) };
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
  return data ?? { last_campaign_id: null, theme_setting: "system" };
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
  return data ?? { owned: [], incoming_invites: [], joined: [] };
}

export async function createCampaign(ownerId, name) {
  const database = getDatabase();
  const { data, error } = await database.rpc("create_seeded_campaign", {
    requesting_user_id: ownerId,
    campaign_name: name,
  });
  if (
    error?.code === "PGRST202" &&
    /create_seeded_campaign/i.test(error.message ?? "")
  ) {
    // Keep campaign creation available when application code reaches an
    // environment before the optional starter-lore migration has been pushed.
    const { data: campaign, error: insertError } = await database
      .from("campaign")
      .insert({ user_id: ownerId, name })
      .select("id, name, user_id")
      .single();
    throwIfError(insertError, "Could not create campaign");
    return campaign;
  }
  throwIfError(error, "Could not create campaign");
  return data;
}

export const renameCampaign = (userId, campaignId, name) =>
  runEntityMutation(
    "rename_campaign",
    { requesting_user_id: userId, requested_campaign_id: campaignId, campaign_name: name },
    "Could not rename campaign",
  );
export const addPendingCampaignInvite = (userId, campaignId, username) =>
  runEntityMutation(
    "add_pending_campaign_invite",
    { requesting_user_id: userId, requested_campaign_id: campaignId, invited_username: username },
    "Could not invite player",
  );
export const removePendingCampaignInvite = (userId, campaignId) =>
  runEntityMutation(
    "remove_pending_campaign_invite",
    { requesting_user_id: userId, requested_campaign_id: campaignId },
    "Could not remove campaign invitation",
  );
export const acceptPendingCampaignInvite = (userId, campaignId) =>
  runEntityMutation(
    "accept_campaign_invite",
    { requesting_user_id: userId, requested_campaign_id: campaignId },
    "Could not accept campaign invitation",
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

// ---------------------------------------------------------------------------
// Progressive lore search hydration
// ---------------------------------------------------------------------------

export async function getCampaignSearchCorpus(campaignId, userId) {
  const database = getDatabase();
  const { data, error } = await database.rpc("get_campaign_search_corpus", {
    requesting_user_id: userId,
    requested_campaign_id: campaignId,
  });
  throwIfError(error, "Could not load campaign search data");
  if (!data) return null;

  // Signing does not download files; the browser requests an image only when
  // its matching result is rendered.
  const images = data.images ?? [];
  if (!images.length) return data;
  const { data: signed, error: signedError } = await database.storage
    .from("entity-images")
    .createSignedUrls(images.map((image) => image.storage_path), 60 * 10);
  throwIfError(signedError, "Could not create search image links");
  return {
    ...data,
    images: images.map((image, index) => ({ ...image, signed_url: signed[index]?.signedUrl })),
  };
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

export async function getTaggedEntitiesForUser(userId, tagId) {
  const { data, error } = await getDatabase().rpc("get_tagged_entities_for_user", {
    requesting_user_id: userId,
    requested_tag_id: tagId,
  });
  throwIfError(error, "Could not load tagged entities");
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

export async function createCategory(campaignId, userId, name, parentCategoryId) {
  const { data: campaign, error: campaignError } = await getDatabase()
    .from("campaign")
    .select("id")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(campaignError, "Could not load campaign");
  if (!campaign) throw new Error("Could not create category: only the campaign GM can add categories");

  if (parentCategoryId) await getOwnedCategory(userId, parentCategoryId, campaignId);
  const { data, error } = await getDatabase()
    .from("category")
    .insert({
      campaign_id: campaignId,
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

export async function getEntityView(entityId, userId, { signImages = true } = {}) {
  const { data, error } = await getDatabase().rpc("get_entity_view", {
    requesting_user_id: userId,
    requested_entity_id: entityId,
  });
  throwIfError(error, "Could not load entity");
  if (!signImages || !data?.images?.length) return data;
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

async function getOwnedCategory(userId, categoryId, campaignId) {
  let query = getDatabase()
    .from("category")
    .select("id, parent_category_id, campaign_id, campaign!inner(user_id)")
    .eq("id", categoryId)
    .eq("campaign.user_id", userId);
  if (campaignId) query = query.eq("campaign_id", campaignId);
  const { data, error } = await query.maybeSingle();
  throwIfError(error, "Could not load category");
  if (!data) throw new Error("Could not load category: category does not exist");
  return data;
}

async function assertOwnedDestinationCategory(userId, categoryId, campaignId) {
  if (!categoryId) return null;
  return getOwnedCategory(userId, categoryId, campaignId);
}

export async function moveEntity(userId, entityId, categoryId) {
  const { data: entity, error: entityError } = await getDatabase()
    .from("entity")
    .select("id, campaign_id, campaign!inner(user_id)")
    .eq("id", entityId)
    .eq("campaign.user_id", userId)
    .maybeSingle();
  throwIfError(entityError, "Could not load entity");
  if (!entity) throw new Error("Could not move entity: entity does not exist");
  await assertOwnedDestinationCategory(userId, categoryId, entity.campaign_id);

  const { error } = await getDatabase()
    .from("entity")
    .update({ category_id: categoryId || null })
    .eq("id", entityId);
  throwIfError(error, "Could not move entity");
}

export async function moveCategory(userId, categoryId, parentCategoryId) {
  const category = await getOwnedCategory(userId, categoryId);
  await assertOwnedDestinationCategory(userId, parentCategoryId, category.campaign_id);
  if (categoryId === parentCategoryId) {
    throw new Error("Could not move category: a category cannot contain itself");
  }

  let ancestorId = parentCategoryId || null;
  while (ancestorId) {
    if (ancestorId === categoryId) {
      throw new Error("Could not move category: a category cannot move inside its descendant");
    }
    const ancestor = await getOwnedCategory(userId, ancestorId, category.campaign_id);
    ancestorId = ancestor.parent_category_id;
  }

  const { error } = await getDatabase()
    .from("category")
    .update({ parent_category_id: parentCategoryId || null })
    .eq("id", categoryId)
    .eq("campaign_id", category.campaign_id);
  throwIfError(error, "Could not move category");
}
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
  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "img";
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
export const addEntityContentReveals = (userId, contentId, type, revealToAll, profileIds) =>
  runEntityMutation(
    "reveal_entity_content_to_players",
    {
      requesting_user_id: userId,
      requested_content_id: contentId,
      content_type: type,
      reveal_to_all: revealToAll,
      revealed_profile_ids: profileIds,
    },
    "Could not reveal content",
  );
export async function deleteEntityContent(userId, contentId, type) {
  const { data, error } = await getDatabase().rpc("delete_entity_content", {
    requesting_user_id: userId,
    requested_content_id: contentId,
    content_type: type,
  });
  throwIfError(error, "Could not delete content");
  if (type === "image" && data) {
    const { error: storageError } = await getDatabase()
      .storage.from("entity-images")
      .remove([data]);
    throwIfError(storageError, "Image record was deleted, but its file could not be removed");
  }
}

export const deleteTextbox = (userId, textboxId) =>
  deleteEntityContent(userId, textboxId, "textbox");

export const deleteImage = (userId, imageId) => deleteEntityContent(userId, imageId, "image");

export async function deleteEntity(userId, entityId) {
  const { data: entity, error: entityError } = await getDatabase()
    .from("entity")
    .select("id, campaign!inner(user_id)")
    .eq("id", entityId)
    .eq("campaign.user_id", userId)
    .maybeSingle();
  throwIfError(entityError, "Could not load entity");
  if (!entity) throw new Error("Could not delete entity: entity does not exist");

  const [textboxesResult, imagesResult] = await Promise.all([
    getDatabase().from("entity_textbox").select("id").eq("entity_id", entityId),
    getDatabase().from("entity_image").select("id").eq("entity_id", entityId),
  ]);
  throwIfError(textboxesResult.error, "Could not load entity textboxes");
  throwIfError(imagesResult.error, "Could not load entity images");

  for (const textbox of textboxesResult.data ?? []) await deleteTextbox(userId, textbox.id);
  for (const image of imagesResult.data ?? []) await deleteImage(userId, image.id);

  const { error } = await getDatabase().from("entity").delete().eq("id", entityId);
  throwIfError(error, "Could not delete entity");
}

export async function deleteCategory(userId, categoryId, deleteContents = false) {
  const category = await getOwnedCategory(userId, categoryId);
  const [entitiesResult, childrenResult] = await Promise.all([
    getDatabase().from("entity").select("id").eq("category_id", categoryId),
    getDatabase()
      .from("category")
      .select("id")
      .eq("campaign_id", category.campaign_id)
      .eq("parent_category_id", categoryId),
  ]);
  throwIfError(entitiesResult.error, "Could not load category entities");
  throwIfError(childrenResult.error, "Could not load subcategories");

  if (deleteContents) {
    for (const child of childrenResult.data ?? []) await deleteCategory(userId, child.id, true);
    for (const entity of entitiesResult.data ?? []) await deleteEntity(userId, entity.id);
  } else {
    for (const entity of entitiesResult.data ?? []) {
      await moveEntity(userId, entity.id, category.parent_category_id);
    }
    for (const child of childrenResult.data ?? []) {
      await moveCategory(userId, child.id, category.parent_category_id);
    }
  }

  const { error } = await getDatabase()
    .from("category")
    .delete()
    .eq("id", categoryId)
    .eq("campaign_id", category.campaign_id);
  throwIfError(error, "Could not delete category");
}
