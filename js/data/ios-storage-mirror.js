/**
 * ios-storage-mirror.js
 *
 * On iOS, Safari and Home Screen PWA have completely isolated storage
 * (IndexedDB, localStorage, cookies). Only CacheStorage is shared
 * (since iOS 14).
 *
 * This module mirrors critical profile data to CacheStorage so the
 * Home Screen PWA can access data set up in Safari, and vice versa.
 */

/* global Response */

const CACHE_NAME = "meeting-program-ios-mirror";
const SELECTED_PROFILE_ID_KEY = "selected-profile-id";
const PROFILES_KEY = "profiles";

let cacheAvailable = null;

async function getCache() {
  if (cacheAvailable === false) return null;
  try {
    if (typeof caches === "undefined") {
      cacheAvailable = false;
      return null;
    }
    const cache = await caches.open(CACHE_NAME);
    cacheAvailable = true;
    return cache;
  } catch {
    cacheAvailable = false;
    return null;
  }
}

async function writeToCache(key, value) {
  const cache = await getCache();
  if (!cache) return;
  try {
    const response = new Response(JSON.stringify(value), {
      headers: { "Content-Type": "application/json" }
    });
    await cache.put(key, response);
  } catch (e) {
    console.warn("[IosMirror] Failed to write to CacheStorage:", e);
  }
}

async function readFromCache(key) {
  const cache = await getCache();
  if (!cache) return null;
  try {
    const response = await cache.match(key);
    if (!response) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function mirrorSelectedProfileId(id) {
  await writeToCache(SELECTED_PROFILE_ID_KEY, id);
}

export async function readMirroredSelectedProfileId() {
  return await readFromCache(SELECTED_PROFILE_ID_KEY);
}

export async function mirrorProfiles(profiles) {
  await writeToCache(PROFILES_KEY, profiles);
}

export async function readMirroredProfiles() {
  return await readFromCache(PROFILES_KEY);
}
