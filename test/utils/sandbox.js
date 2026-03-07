/**
 * Test Isolation Utilities
 * Provides centralized Browser API stubs and sandbox setup for tests
 * Enables file-level isolation by consolidating repetitive mocking patterns
 */

import { expect, vi } from "vitest";

/**
 * Stub common browser APIs that jsdom doesn't fully implement
 * Call this in beforeEach() hook to set up isolated environment
 */
export function stubBrowserAPIs() {
  // matchMedia - used by install-manager and main
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });

  // navigator.standalone - used by install-manager (iOS PWA detection)
  Object.defineProperty(window.navigator, "standalone", {
    writable: true,
    configurable: true,
    value: false
  });

  // navigator.onLine - used by main.js
  Object.defineProperty(window.navigator, "onLine", {
    writable: true,
    configurable: true,
    value: true
  });

  // navigator.mediaDevices - used by qr.js for camera access
  Object.defineProperty(navigator, "mediaDevices", {
    writable: true,
    configurable: true,
    value: {
      enumerateDevices: vi.fn().mockResolvedValue([]),
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [],
        getVideoTracks: () => [],
        getAudioTracks: () => []
      })
    }
  });

  // navigator.userAgent - used by qr.js for device detection
  if (!Object.getOwnPropertyDescriptor(navigator, "userAgent")?.writable) {
    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      configurable: true,
      value: navigator.userAgent
    });
  }
}

/**
 * Reset the test environment between tests
 * Clears localStorage, indexedDB contents, and all mocks
 */
export async function resetTestEnvironment() {
  // Clear localStorage
  localStorage.clear();

  // Clear IndexedDB by deleting and recreating the database
  try {
    const dbs = (await indexedDB.databases?.()) || [];
    for (const db of dbs) {
      // Close any open connections first
      try {
        const request = indexedDB.open(db.name);
        await new Promise((resolve) => {
          request.onsuccess = () => {
            request.result.close();
            resolve();
          };
          request.onerror = () => resolve();
        });
      } catch (e) {
        // Ignore
      }

      // Delete the database
      const deleteRequest = indexedDB.deleteDatabase(db.name);
      await new Promise((resolve, reject) => {
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onblocked = () => resolve();
      });
    }
  } catch (err) {
    // No databases() method or error clearing, continue anyway
  }

  // Clear DOM content
  if (document.body) {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  }

  // Clear all mocks and reset modules
  vi.clearAllMocks();
  vi.resetModules();
}

/**
 * Setup complete test isolation for a test suite
 * Call in describe() hook to set up beforeEach/afterEach
 */
export function setupTestIsolation() {
  beforeEach(() => {
    stubBrowserAPIs();
  });

  afterEach(async () => {
    await resetTestEnvironment();
  });
}

/**
 * Create a stub for HTMLVideoElement properties
 * Used in qr.test.mjs for readyState, videoWidth, videoHeight
 */
export function stubVideoElement(video, state = {}) {
  const defaults = {
    readyState: 4, // HAVE_ENOUGH_DATA
    videoWidth: 100,
    videoHeight: 100,
    ...state
  };

  Object.defineProperty(video, "readyState", {
    writable: false,
    configurable: true,
    value: defaults.readyState
  });

  Object.defineProperty(video, "videoWidth", {
    writable: false,
    configurable: true,
    value: defaults.videoWidth
  });

  Object.defineProperty(video, "videoHeight", {
    writable: false,
    configurable: true,
    value: defaults.videoHeight
  });

  return video;
}

/**
 * Helper to stub mock functions with chainable methods
 * Wrapper around vi.fn() to maintain code clarity
 */
export function createMockFn(impl) {
  return vi.fn(impl);
}

export default {
  stubBrowserAPIs,
  resetTestEnvironment,
  setupTestIsolation,
  stubVideoElement,
  createMockFn
};
