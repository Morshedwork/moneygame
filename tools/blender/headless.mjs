import { spawnSync } from "node:child_process";
import path from "node:path";
const root = process.cwd();
const d = path.join(root, ".runtime/blender/blender-5.1.0-windows-x64");
const python = path.join(d, "5.1/python/bin/python.exe");
const target = path.join(root, ".runtime/bpy-module");
const args = process.argv.includes("--install")
  ? [
      "-m",
      "pip",
      "install",
      "--target",
      target,
      "--cache-dir",
      path.join(root, ".runtime/pip-cache"),
      "bpy==5.2.1",
    ]
  : [process.argv.slice(2).find((arg) => arg.endsWith(".py")) || "tools/blender/build_assets.py"];
const r = spawnSync(python, args, {
  stdio: "inherit",
  windowsHide: true,
  env: {
    ...process.env,
    PATH: [d, path.join(d, "blender.crt"), process.env.PATH].join(";"),
    PYTHONPATH: target,
  },
});
if (r.error) console.error(r.error.message);
console.log("Headless Blender result:", r.status);
process.exit(r.status === 0 && !r.error ? 0 : 1);
