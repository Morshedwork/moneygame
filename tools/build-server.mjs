import { build } from "esbuild";
await build({
  entryPoints: ["apps/server/index.ts"],
  outfile: "apps/server/dist/index.cjs",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  external: ["firebase-admin/*", "firebase-functions/*"],
});
