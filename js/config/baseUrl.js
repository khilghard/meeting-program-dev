/**
 * @fileoverview Dynamic base URL detection for dev/prod environments
 * @module js/config/baseUrl
 */

/**
 * Detect the base URL based on current hosting environment
 * Works for: production (GitHub Pages), development, and local testing
 *
 * Priority:
 * 1. Stored siteUrl in IndexedDB (user-configured)
 * 2. Current window location (auto-detect)
 * 3. Fallback to production URL
 */
export async function getBaseUrl() {
  try {
    const { getMetadata } = await import("../data/IndexedDBManager.js");
    const storedUrl = await getMetadata("siteUrl");
    if (storedUrl) {
      return storedUrl.replace(/\/$/, ""); // Remove trailing slash
    }
  } catch (error) {
    console.warn("Could not retrieve stored siteUrl from IndexedDB:", error);
  }

  // Auto-detect from current location
  return detectFromLocation();
}

/**
 * Detect base URL from window.location
 * Handles: GitHub Pages, local dev server, and custom domains
 */
export function detectFromLocation() {
  const { origin, pathname } = globalThis.window.location;

  // For GitHub Pages deployments
  if (origin.includes("github.io")) {
    // Extract the repo name from pathname (e.g., /meeting-program-dev/ or /meeting-program/)
    const match = pathname.match(/^\/([^/]+)\/?/);
    if (match) {
      return `${origin}/${match[1]}`;
    }
  }

  // For custom domains and local dev
  // Remove trailing slashes and find the app path
  const pathSegments = pathname.split("/").filter(Boolean);
  if (pathSegments.length > 0) {
    // Assume the last segment is the app name (e.g., "meeting-program")
    const appName = pathSegments.at(-1);
    return `${origin}/${appName}`;
  }

  // Fallback: return origin only
  return origin;
}

/**
 * Get canonical URL (with trailing slash for consistency)
 */
export async function getCanonicalUrl() {
  const url = await getBaseUrl();
  return url.endsWith("/") ? url : `${url}/`;
}

/**
 * Get version.json URL
 */
export async function getVersionFeedUrl() {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/version.json`;
}
