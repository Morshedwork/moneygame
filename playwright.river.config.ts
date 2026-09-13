import {defineConfig} from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e", testMatch: "river-care.spec.ts", workers: 1, timeout: 60000,
  outputDir: "node_modules/.cache/river-care-results", reporter: [["list"]],
  use: {baseURL: "http://127.0.0.1:5187", headless: true, channel: "chrome", viewport: {width: 1280, height: 1100}, trace: "retain-on-failure", screenshot: "only-on-failure"},
  webServer: {command: "node node_modules/vite/bin/vite.js --config tests/river-vite.config.ts", url: "http://127.0.0.1:5187", reuseExistingServer: false, gracefulShutdown: {signal: "SIGTERM", timeout: 1000}},
});
