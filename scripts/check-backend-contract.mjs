import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secretKey) {
  console.error(
    "Backend contract check requires SUPABASE_URL and SUPABASE_SECRET_KEY (or their supported aliases).",
  );
  process.exitCode = 1;
} else {
  const client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const nonexistentUserId = crypto.randomUUID();
  const { error } = await client.rpc("create_seeded_campaign", {
    requesting_user_id: nonexistentUserId,
    campaign_name: "__lorekeeper_contract_probe__",
  });

  if (!error) {
    console.error("Backend contract probe unexpectedly created a campaign.");
    process.exitCode = 1;
  } else if (error.code === "PGRST202" || /could not find the function/i.test(error.message)) {
    console.error(
      "Backend contract is out of date: create_seeded_campaign is missing. Apply supabase/migrations before deploying the app.",
    );
    process.exitCode = 1;
  } else if (error.code !== "23503") {
    console.error(
      `Backend contract probe returned an unexpected error (${error.code}): ${error.message}`,
    );
    process.exitCode = 1;
  } else {
    console.log("Backend contract check passed: create_seeded_campaign is deployed.");
  }
}
