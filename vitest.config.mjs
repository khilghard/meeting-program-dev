// vitest.config.mjs
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.js"],
    exclude: ["node_modules", "e2e/**"],
    testTimeout: 5000,
    hookTimeout: 10000
  }
});
