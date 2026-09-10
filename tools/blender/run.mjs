import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
const executable =
  process.env.BLENDER_PATH ||
  path.resolve(".runtime/blender/blender-5.1.0-windows-x64/blender.exe");
if (!existsSync(executable))
  throw new Error("Set BLENDER_PATH to your Blender executable.");
const blenderDir = path.dirname(executable);
const result = spawnSync(
  executable,
  [
    "--background",
    "--factory-startup",
    "--python",
    path.resolve("tools/blender/build_assets.py"),
  ],
  {
    stdio: "inherit",
    cwd: blenderDir,
    env: {
      ...process.env,
      PATH: [
        blenderDir,
        path.join(blenderDir, "blender.shared"),
        path.join(blenderDir, "blender.crt"),
        process.env.PATH,
      ].join(path.delimiter),
    },
  },
);
if (result.error)
  console.error("Blender could not start:", result.error.message);
console.log("Blender process result:", {
  status: result.status,
  signal: result.signal,
});
process.exit(result.status ?? 1);
