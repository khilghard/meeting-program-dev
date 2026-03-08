/**
 * @fileoverview Version checking utilities for PWA updates
 * @module js/version-checker
 */

import { VERSION } from "./version.js";
import { isNewer } from "./version-parser.js";
import { getVersionFeedUrl } from "./config/baseUrl.js";
import { createTimer } from "./utils/timer-manager.js";

const CHECK_INTERVAL_MS = 3600000;
const CACHE_BUST_PARAM = "t";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function withRetry(fetchFn, maxRetries = MAX_RETRIES) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      console.log(`[VersionChecker] Retry attempt ${attempt + 1}/${maxRetries}:`, error.message);

      if (attempt < maxRetries - 1) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => {
          setTimeout(resolve, delay);
        });
      }
    }
  }

  return null;
}

export function addCacheBusting(url) {
  try {
    const urlObj = new URL(url);
    const timestamp = Date.now();
    urlObj.searchParams.set(CACHE_BUST_PARAM, timestamp);
    return urlObj.toString();
  } catch {
    return url;
  }
}

export async function fetchRemoteManifest() {
  const fetchFn = async () => {
    const REMOTE_URL = await getVersionFeedUrl();
    const url = addCacheBusting(REMOTE_URL);
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[VersionChecker] HTTP error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  };

  try {
    return await withRetry(fetchFn);
  } catch (error) {
    console.error("[VersionChecker] Network error:", error.message);
    return null;
  }
}

export async function checkForUpdates() {
  const localVersion = VERSION;

  const remoteManifest = await fetchRemoteManifest();

  if (!remoteManifest?.version) {
    return {
      needsUpdate: false,
      localVersion,
      remoteVersion: null,
      reason: "Unable to fetch remote version"
    };
  }

  const remoteVersion = remoteManifest.version;
  const needsUpdate = isNewer(remoteVersion, localVersion);

  return {
    needsUpdate,
    localVersion,
    remoteVersion,
    reason: needsUpdate ? `Update available: ${remoteVersion}` : "Up to date"
  };
}

export { CHECK_INTERVAL_MS, CACHE_BUST_PARAM, MAX_RETRIES, RETRY_DELAY_MS, withRetry };
export { getVersionFeedUrl } from "./config/baseUrl.js";
