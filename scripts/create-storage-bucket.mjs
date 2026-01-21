import { createClient } from "@supabase/supabase-js";

import fs from "node:fs/promises";
import path from "node:path";

function parseDotenv(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const normalized = line.startsWith("export ") ? line.slice("export ".length) : line;
    const idx = normalized.indexOf("=");
    if (idx <= 0) continue;

    const key = normalized.slice(0, idx).trim();
    let value = normalized.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Common pattern for private keys stored as literal \n sequences.
    value = value.replace(/\\n/g, "\n");

    if (key) env[key] = value;
  }
  return env;
}

async function loadEnvFromFile(fileName) {
  try {
    const filePath = path.join(process.cwd(), fileName);
    const content = await fs.readFile(filePath, "utf8");
    const parsed = parseDotenv(content);
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] == null || process.env[k] === "") {
        process.env[k] = String(v);
      }
    }
  } catch {
    // Ignore missing env files.
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

function getBucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET || "media";
}

async function main() {
  // Node scripts don't automatically load Next.js env files.
  await loadEnvFromFile(".env.local");
  await loadEnvFromFile(".env");

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = getBucketName();

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.storage.getBucket(bucket);
  if (data && !error) {
    console.log(`[supabase] bucket exists: ${bucket}`);
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, { public: false });

  if (createError) {
    const msg = (createError.message || "").toLowerCase();
    const alreadyExists = msg.includes("already exists") || msg.includes("duplicate") || msg.includes("exists");

    if (alreadyExists) {
      console.log(`[supabase] bucket exists: ${bucket}`);
      return;
    }

    throw new Error(createError.message || `Failed to create bucket: ${bucket}`);
  }

  console.log(`[supabase] bucket created: ${bucket}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
