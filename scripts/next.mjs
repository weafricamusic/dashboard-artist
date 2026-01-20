import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

process.chdir(projectRoot);

const nextArgs = process.argv.slice(2);
if (nextArgs.length === 0) {
  console.error("Usage: node scripts/next.mjs <dev|build|start> [...args]");
  process.exit(1);
}

const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (typeof code === "number") process.exit(code);
  process.exit(signal ? 1 : 0);
});
