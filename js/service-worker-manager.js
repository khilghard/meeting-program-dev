/**
 * @fileoverview Service Worker Manager for PWA updates
 * @module js/service-worker-manager
 */

/* global MessageChannel */

import { VERSION } from "./version.js";

let registration = null;
let controllerChangeListener = null;

export function setRegistration(reg) {
  registration = reg;
}

export async function register() {
  if (!("serviceWorker" in navigator)) {
    console.warn("[SWManager] Service workers not supported");
    return null;
  }

  try {
    registration = await navigator.serviceWorker.register(`service-worker.js?v=${VERSION}`);
    console.log("[SWManager] Registered:", registration.scope);
    return registration;
  } catch (error) {
    console.error("[SWManager] Registration failed:", error);
    return null;
  }
}

export async function checkForUpdate() {
  if (!registration) {
    console.warn("[SWManager] No registration available");
    return { hasUpdate: false, waiting: null };
  }

  try {
    await registration.update();

    if (registration.waiting) {
      return { hasUpdate: true, waiting: registration.waiting };
    }

    return { hasUpdate: false, waiting: null };
  } catch (error) {
    console.error("[SWManager] Update check failed:", error);
    return { hasUpdate: false, waiting: null };
  }
}

export async function triggerUpdate() {
  if (!registration || !registration.waiting) {
    console.warn("[SWManager] No waiting service worker");
    return false;
  }

  try {
    registration.waiting.postMessage({ action: "skipWaiting" });
    return true;
  } catch (error) {
    console.error("[SWManager] Failed to trigger update:", error);
    return false;
  }
}

export function watchForControllerChange(callback) {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  if (controllerChangeListener) {
    navigator.serviceWorker.removeEventListener("controllerchange", controllerChangeListener);
  }

  controllerChangeListener = async () => {
    console.log("[SWManager] Controller changed, reloading...");
    if (callback) {
      callback();
    } else {
      window.location.reload();
    }
  };

  navigator.serviceWorker.addEventListener("controllerchange", controllerChangeListener);
}

export async function getServiceWorkerVersion() {
  return new Promise((resolve) => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
      resolve(VERSION);
      return;
    }

    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      resolve(event.data.version || VERSION);
    };

    navigator.serviceWorker.controller.postMessage({ action: "getVersion" }, [channel.port2]);
  });
}

export function getRegistration() {
  return registration;
}
