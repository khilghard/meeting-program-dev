/**
 * mock-sheets.js
 * Google Sheets mocking utilities for E2E testing
 */

import { getMockProgram, mockPrograms, mockProgramUrls } from "./mock-data.js";

/**
 * Mock Google Sheets endpoint - returns mock CSV data
 * Uses context-level routing for robustness across reloads
 *
 * @param {Page} page - Playwright page object
 * @param {string} programName - Name of mock program to load (from mock-data.js)
 * @param {function} customHandler - Optional custom route handler
 */
export async function mockGoogleSheets(page, programName = "fullProgram", customHandler = null) {
  const csvData = getMockProgram(programName);

  await page.context().route(
    (url) => {
      const urlStr = url.href;
      // Only match actual Google Sheets URLs (external), not the local app URL with query params
      // Must be a URL that goes to docs.google.com and NOT localhost
      // Also must contain /gviz/tq to ensure it's a real Sheets request
      return (
        urlStr.includes("docs.google.com") &&
        urlStr.includes("/gviz/tq") &&
        !urlStr.includes("localhost")
      );
    },
    async (route) => {
      if (customHandler) {
        await customHandler(route);
      } else {
        await route.fulfill({
          status: 200,
          contentType: "text/csv",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
          },
          body: csvData
        });
      }
    }
  );
}

/**
 * Mock Google Sheets with specific URL pattern
 * Only mocks requests matching the given URL pattern
 *
 * @param {Page} page - Playwright page object
 * @param {string} urlPattern - URL pattern to match
 * @param {string} csvData - CSV data to return
 */
export async function mockGoogleSheetsForUrl(page, urlPattern, csvData) {
  await page.context().route(
    (url) => {
      const urlStr = url.href;
      // Only match Google Sheets URLs, not local app URLs
      return (
        urlStr.includes("docs.google.com") &&
        urlStr.includes(urlPattern) &&
        !urlStr.includes("localhost")
      );
    },
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        },
        body: csvData
      });
    }
  );
}

/**
 * Mock Google Sheets with multiple programs
 * Useful for tests that need to switch between programs
 *
 * @param {Page} page - Playwright page object
 * @param {Object} programs - Object mapping URL patterns to CSV data
 */
export async function mockGoogleSheetsMultiple(page, programs) {
  const urlPatterns = Object.keys(programs);

  await page.context().route(
    (url) => {
      const urlStr = url.href;
      // Only match Google Sheets URLs, not local app URLs
      if (!urlStr.includes("docs.google.com")) return false;
      if (urlStr.includes("localhost")) return false;
      return urlPatterns.some((pattern) => urlStr.includes(pattern));
    },
    async (route) => {
      const requestUrl = route.request().url();
      const matchedPattern = urlPatterns.find((pattern) => requestUrl.includes(pattern));

      if (matchedPattern) {
        await route.fulfill({
          status: 200,
          contentType: "text/csv",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
          },
          body: programs[matchedPattern]
        });
      } else {
        await route.abort("failed");
      }
    }
  );
}

/**
 * Mock Google Sheets with custom CSV data (inline)
 *
 * @param {Page} page - Playwright page object
 * @param {string} csvData - CSV data to return
 */
export async function mockGoogleSheetsWithData(page, csvData) {
  await page.context().route(
    (url) => {
      const urlStr = url.href;
      return (
        urlStr.includes("docs.google.com") &&
        urlStr.includes("/gviz/tq") &&
        !urlStr.includes("localhost")
      );
    },
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        },
        body: csvData
      });
    }
  );
}

/**
 * Mock Google Sheets to return an error
 *
 * @param {Page} page - Playwright page object
 * @param {number} statusCode - HTTP status code (default 404)
 * @param {string} statusText - HTTP status text
 */
export async function mockGoogleSheetsError(page, statusCode = 404, statusText = "Not Found") {
  await page.context().route(
    (url) => {
      const urlStr = url.href;
      return (
        urlStr.includes("docs.google.com") &&
        urlStr.includes("/gviz/tq") &&
        !urlStr.includes("localhost")
      );
    },
    async (route) => {
      await route.fulfill({
        status: statusCode,
        statusText: statusText,
        body: ""
      });
    }
  );
}

/**
 * Mock Google Sheets to timeout (never respond)
 * Useful for testing loading states
 *
 * @param {Page} page - Playwright page object
 */
export async function mockGoogleSheetsTimeout(page) {
  await page.context().route(
    (url) => {
      const urlStr = url.href;
      return (
        urlStr.includes("docs.google.com") &&
        urlStr.includes("/gviz/tq") &&
        !urlStr.includes("localhost")
      );
    },
    async (route) => {
      // Never fulfill - simulates timeout
    }
  );
}

/**
 * Clear all Google Sheets mocks
 *
 * @param {Page} page - Playwright page object
 */
export async function clearGoogleSheetsMocks(page) {
  // Playwright automatically clears routes when test ends
  // This is a no-op but kept for API consistency
}

/**
 * Get all available mock program names
 */
export function getAvailableMockPrograms() {
  return Object.keys(mockPrograms);
}

export { mockPrograms, mockProgramUrls };
