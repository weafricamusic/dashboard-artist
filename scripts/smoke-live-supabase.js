const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function parseDotEnv(contents) {
  const env = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'") )
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }
  return env;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return parseDotEnv(fs.readFileSync(filePath, "utf8"));
}

async function main() {
  const root = process.cwd();
  const envFile = loadEnvFile(path.join(root, ".env.local"));

  const url = envFile.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = envFile.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[live smoke] supabase url configured:", Boolean(url));
  console.log("[live smoke] service role key configured:", Boolean(serviceRoleKey));

  if (!url || !serviceRoleKey) {
    console.log("[live smoke] skipping: supabase not configured");
    process.exit(0);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const res = await supabase.from("live_sessions").select("id").limit(1);

  if (res.error) {
    console.error("[live smoke] live_sessions query error:", res.error.message);
    process.exit(1);
  }

  console.log("[live smoke] live_sessions query ok; rows returned:", (res.data || []).length);
}

main().catch((e) => {
  console.error("[live smoke] unexpected error:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
