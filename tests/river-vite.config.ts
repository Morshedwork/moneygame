import {defineConfig, mergeConfig} from "vite";
import main from "../vite.config";
export default mergeConfig(main, defineConfig({
  cacheDir: "node_modules/.vite-river-care",
  server: {host: "127.0.0.1", port: 5187, strictPort: true},
}));
