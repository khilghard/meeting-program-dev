import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll, vi } from "vitest";
import {
  stubBrowserAPIs,
  resetTestEnvironment,
  setupTestIsolation,
  stubVideoElement,
  createMockFn
} from "./utils/sandbox.js";

// Make vitest globals available
globalThis.describe = describe;
globalThis.it = it;
globalThis.test = it;
globalThis.expect = expect;
globalThis.beforeEach = beforeEach;
globalThis.afterEach = afterEach;
globalThis.afterAll = afterAll;
globalThis.beforeAll = beforeAll;
globalThis.vi = vi;

// Export sandbox utilities for use in tests
globalThis.stubBrowserAPIs = stubBrowserAPIs;
globalThis.resetTestEnvironment = resetTestEnvironment;
globalThis.setupTestIsolation = setupTestIsolation;
globalThis.stubVideoElement = stubVideoElement;
globalThis.createMockFn = createMockFn;

// Mock matchMedia globally before any modules are imported
if (typeof globalThis.window !== "undefined" && !globalThis.window.matchMedia) {
  globalThis.window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}
