import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  register,
  checkForUpdate,
  triggerUpdate,
  watchForControllerChange,
  getServiceWorkerVersion,
  setRegistration
} from "../js/service-worker-manager.js";

describe("Service Worker Manager", () => {
  let originalServiceWorker;
  let mockRegistration;
  let mockController;

  beforeEach(() => {
    originalServiceWorker = navigator.serviceWorker;
    mockController = {
      postMessage: vi.fn()
    };
    mockRegistration = {
      update: vi.fn().mockResolvedValue(undefined),
      waiting: null,
      scope: "/test/"
    };
    navigator.serviceWorker = {
      register: vi.fn().mockResolvedValue(mockRegistration),
      controller: mockController,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
  });

  afterEach(() => {
    navigator.serviceWorker = originalServiceWorker;
    vi.restoreAllMocks();
  });

  describe("register", () => {
    it("registers service worker successfully", async () => {
      const result = await register();
      expect(result).toBe(mockRegistration);
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
        expect.stringContaining("service-worker.js")
      );
    });

    it("returns null when service workers not supported", async () => {
      delete navigator.serviceWorker;
      const result = await register();
      expect(result).toBeNull();
    });

    it("handles registration failure", async () => {
      navigator.serviceWorker.register = vi.fn().mockRejectedValue(new Error("Failed"));
      const result = await register();
      expect(result).toBeNull();
    });
  });

  describe("checkForUpdate", () => {
    it("returns hasUpdate false when no waiting worker", async () => {
      const result = await checkForUpdate();
      expect(result.hasUpdate).toBe(false);
      expect(result.waiting).toBeNull();
    });

    it("returns hasUpdate true when waiting worker exists", async () => {
      const mockWaiting = { postMessage: vi.fn() };
      mockRegistration.waiting = mockWaiting;
      setRegistration(mockRegistration);

      const result = await checkForUpdate();
      expect(result.hasUpdate).toBe(true);
      expect(result.waiting).toBe(mockWaiting);
    });

    it("returns false when no registration", async () => {
      setRegistration(null);
      const result = await checkForUpdate();
      expect(result.hasUpdate).toBe(false);
    });
  });

  describe("triggerUpdate", () => {
    it("sends skipWaiting message successfully", async () => {
      const mockWaiting = { postMessage: vi.fn() };
      mockRegistration.waiting = mockWaiting;
      setRegistration(mockRegistration);

      const result = await triggerUpdate();
      expect(result).toBe(true);
      expect(mockWaiting.postMessage).toHaveBeenCalledWith({ action: "skipWaiting" });
    });

    it("returns false when no waiting worker", async () => {
      mockRegistration.waiting = null;
      setRegistration(mockRegistration);
      const result = await triggerUpdate();
      expect(result).toBe(false);
    });

    it("returns false when no registration", async () => {
      setRegistration(null);
      const result = await triggerUpdate();
      expect(result).toBe(false);
    });
  });

  describe("watchForControllerChange", () => {
    it("adds controller change listener", () => {
      const callback = vi.fn();
      watchForControllerChange(callback);

      expect(navigator.serviceWorker.addEventListener).toHaveBeenCalledWith(
        "controllerchange",
        expect.any(Function)
      );
    });

    it("calls callback on controller change when provided", async () => {
      let changeHandler;
      navigator.serviceWorker.addEventListener = vi.fn((event, handler) => {
        if (event === "controllerchange") {
          changeHandler = handler;
        }
      });

      const callback = vi.fn();
      watchForControllerChange(callback);
      changeHandler();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("getServiceWorkerVersion", () => {
    it("returns VERSION when no controller", async () => {
      navigator.serviceWorker.controller = null;
      const version = await getServiceWorkerVersion();
      expect(version).toBeDefined();
    });
  });
});
