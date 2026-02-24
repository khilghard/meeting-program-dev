import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:8000/meeting-program/",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["camera"],
        launchOptions: {
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        }
      }
    },
    {
      name: "chromium (no camera)",
      use: {
        ...devices["Desktop Chrome"],
        permissions: []
      }
    },
    {
      name: "Mobile iPhone",
      use: {
        ...devices["iPhone 15"],
        permissions: ["camera"],
        launchOptions: {
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        },
        defaultBrowserType: "chromium"
      }
    },
    {
      name: "Mobile Android",
      use: {
        ...devices["Galaxy S24"],
        permissions: ["camera"],
        launchOptions: {
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        },
        defaultBrowserType: "chromium"
      }
    },
    {
      name: "iPad Mini",
      use: {
        ...devices["iPad Mini"],
        permissions: ["camera"],
        launchOptions: {
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
        },
        defaultBrowserType: "chromium"
      }
    }
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:8000/meeting-program/",
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
