// vitest.config.mjs
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.js"],
    exclude: ["node_modules", "e2e/**", ".opencode/**", "**/zod/**"],
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json"],
      reportsDirectory: "./coverage",
      reportOnFailure: true,
      clean: false,
      cleanOnRerun: false,
      all: true,
      include: ["js/**/*.js", "js/**/*.mjs"],
      exclude: [
        "node_modules",
        "test/**",
        "e2e/**",
        "src/**",
        "**/*.test.mjs",
        "**/*.test.js",
        "coverage/**"
      ]
    }
  },
  experimental: {
    INCIDENT_FILE: "vitest-incident.md"
  }
});
