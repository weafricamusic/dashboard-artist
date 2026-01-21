import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    // Upload flows use Server Actions with `FormData` containing media files.
    // The default limit is 1MB, which is too small for MP3/MP4 uploads.
    // Keep this aligned with UI limits (songs: 20MB, videos: 50MB).
    serverActions: {
      bodySizeLimit: "60mb",
    },
  },
};

export default nextConfig;
