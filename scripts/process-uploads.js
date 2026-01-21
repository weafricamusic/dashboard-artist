const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const MAX_BATCH = Number.parseInt(process.env.UPLOAD_PROCESS_MAX_BATCH || "3", 10);
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "media";
const UPLOADS_TABLE = process.env.SUPABASE_UPLOADS_TABLE || "uploads";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "inherit" });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function ffprobeDuration(inputPath) {
  try {
    const output = [];
    const proc = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nokey=1:noprint_wrappers=1",
      inputPath,
    ]);

    proc.stdout.on("data", (data) => output.push(data.toString()));

    return await new Promise((resolve, reject) => {
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code !== 0) return resolve(null);
        const value = Number.parseFloat(output.join("").trim());
        if (Number.isFinite(value)) return resolve(value);
        return resolve(null);
      });
    });
  } catch {
    return null;
  }
}

async function downloadToFile(supabase, storagePath, filePath) {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
  if (error || !data) {
    throw new Error(error?.message || "Failed to download original file");
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  await fs.writeFile(filePath, buffer);
}

async function uploadFromFile(supabase, storagePath, filePath, contentType) {
  const buffer = await fs.readFile(filePath);
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(error.message || "Failed to upload processed file");
}

function outputPathFor(upload, ext) {
  const base = path.basename(upload.original_path || upload.original_path || "upload");
  const name = base.replace(path.extname(base), "");
  const folder = upload.type === "video" ? "processed/videos" : "processed/songs";
  return `${folder}/${upload.artist_uid}/${upload.id}-${name}.${ext}`;
}

async function processAudio(supabase, upload, tmpDir) {
  const inputPath = path.join(tmpDir, `${upload.id}-input`);
  const outputPath = path.join(tmpDir, `${upload.id}-output.mp3`);

  await downloadToFile(supabase, upload.original_path, inputPath);

  await run("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-ar",
    "44100",
    "-ac",
    "2",
    "-b:a",
    "128k",
    outputPath,
  ]);

  const duration = await ffprobeDuration(outputPath);
  const processedPath = outputPathFor(upload, "mp3");

  await uploadFromFile(supabase, processedPath, outputPath, "audio/mpeg");

  return { processedPath, duration };
}

async function processVideo(supabase, upload, tmpDir) {
  const inputPath = path.join(tmpDir, `${upload.id}-input`);
  const outputPath = path.join(tmpDir, `${upload.id}-output.mp4`);

  await downloadToFile(supabase, upload.original_path, inputPath);

  await run("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-vf",
    "scale=1280:720:force_original_aspect_ratio=decrease",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-b:v",
    "1800k",
    "-maxrate",
    "2000k",
    "-bufsize",
    "4000k",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  const duration = await ffprobeDuration(outputPath);
  const processedPath = outputPathFor(upload, "mp4");

  await uploadFromFile(supabase, processedPath, outputPath, "video/mp4");

  return { processedPath, duration };
}

async function updateUpload(supabase, id, patch) {
  const { error } = await supabase
    .from(UPLOADS_TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message || "Failed to update upload record");
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: uploads, error } = await supabase
    .from(UPLOADS_TABLE)
    .select("id,artist_uid,type,original_path,status")
    .eq("status", "processing")
    .order("created_at", { ascending: true })
    .limit(MAX_BATCH);

  if (error) throw new Error(error.message || "Failed to load processing uploads");

  if (!uploads || uploads.length === 0) {
    console.log("[uploads] no processing items found");
    return;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "weafrica-uploads-"));

  try {
    for (const upload of uploads) {
      try {
        if (!upload.original_path) {
          await updateUpload(supabase, upload.id, {
            status: "rejected",
            error_message: "Missing original file path.",
          });
          continue;
        }

        const result = upload.type === "video"
          ? await processVideo(supabase, upload, tmpDir)
          : await processAudio(supabase, upload, tmpDir);

        await updateUpload(supabase, upload.id, {
          status: "published",
          processed_path: result.processedPath,
          duration_seconds: result.duration,
          error_message: null,
        });
      } catch (err) {
        await updateUpload(supabase, upload.id, {
          status: "rejected",
          error_message: err instanceof Error ? err.message : "Processing failed",
        });
      }
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("[uploads] worker failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
