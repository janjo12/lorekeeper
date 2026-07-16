import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

let client;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be configured.");
  return { url, secretKey };
}

function getDatabase() {
  if (client) return client;
  const { url, secretKey } = getSupabaseConfig();
  client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

function throwIfError(error, context) {
  if (!error) return;
  const databaseError = new Error(`${context}: ${error.message}`);
  databaseError.code = error.code ?? error.status?.toString();
  throw databaseError;
}

function authPhone(username) {
  const digits = createHash("sha256")
    .update(`lorekeeper:${username}`)
    .digest()
    .subarray(0, 8)
    .reduce((value, byte) => (value * 256n) + BigInt(byte), 0n)
    .toString()
    .padStart(20, "0")
    .slice(-10);
  return `+1${digits}`;
}

function isExistingAuthIdentity(error) {
  return error?.code === "phone_exists"
    || error?.code === "user_already_exists"
    || /already registered|already exists/i.test(error?.message ?? "");
}

function createAuthClient() {
  const { url, secretKey } = getSupabaseConfig();
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function ensureProfile(database, userId, username) {
  const { data, error } = await database
    .from("profile")
    .upsert({ id: userId, username }, { onConflict: "id" })
    .select("id, username, created_at")
    .single();
  throwIfError(error, "Could not create or load profile");
  return data;
}

export async function signupUser(username, password) {
  const database = getDatabase();
  const phone = authPhone(username);
  const { data, error } = await database.auth.admin.createUser({
    phone,
    password,
    phone_confirm: true,
    user_metadata: { username },
  });

  let user = data?.user;
  if (isExistingAuthIdentity(error)) {
    const existing = await createAuthClient().auth.signInWithPassword({
      phone,
      password,
    });
    if (existing.error) throwIfError(error, "Could not create user");
    user = existing.data.user;
  } else {
    throwIfError(error, "Could not create user");
  }

  return ensureProfile(database, user.id, username);
}

export async function loginUser(username, password) {
  const phone = authPhone(username);
  const database = getDatabase();
  const { data, error } = await createAuthClient().auth.signInWithPassword({
    phone,
    password,
  });
  throwIfError(error, "Invalid email or password");

  return ensureProfile(database, data.user.id, username);
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
  const database = getDatabase();
  const [ownedResult, membershipsResult] = await Promise.all([
    database.from("campaign").select("id, name, user_id").eq("user_id", userId),
    database.from("campaign_player").select("campaign_id").eq("user_id", userId),
  ]);
  throwIfError(ownedResult.error, "Could not load owned campaigns");
  throwIfError(membershipsResult.error, "Could not load campaign memberships");

  const joinedIds = (membershipsResult.data ?? []).map(({ campaign_id }) => campaign_id);
  let joined = [];
  if (joinedIds.length) {
    const result = await database.from("campaign").select("id, name, user_id").in("id", joinedIds);
    throwIfError(result.error, "Could not load joined campaigns");
    joined = result.data ?? [];
  }

  const campaigns = [...(ownedResult.data ?? []), ...joined];
  return [...new Map(campaigns.map((campaign) => [campaign.id, campaign])).values()];
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
