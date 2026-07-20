/**
 * ios-storage-mirror.js
 *
 * On iOS, Safari and Home Screen PWA have completely isolated storage
 * (IndexedDB, localStorage, cookies). CacheStorage IS shared (since
 * iOS 14), but direct main-thread access may not work reliably from
 * a Home Screen PWA context.
 *
 * This module routes all CacheStorage access through the service worker
 * using postMessage(). The SW mediates reads/writes to a shared cache
 * namespace ("meeting-program-ios-mirror"), ensuring both Safari and
 * Home Screen PWA can access the same data.
 *
 * Reference: https://www.netguru.com/blog/how-to-share-session-cookie-or-state-between-pwa-in-standalone-mode-and-safari-on-ios
 */

/* global MessageChannel */

function sendToSW(message) {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker?.controller) {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => resolve(null), 3000);

    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      const data = event.data;
      if (data?.success) {
        resolve(data.value !== undefined ? data.value : true);
      } else {
        resolve(null);
      }
    };

    try {
      navigator.serviceWorker.controller.postMessage(message, [channel.port2]);
    } catch {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

export async function mirrorSelectedProfileId(id) {
  await sendToSW({ action: "mirrorStore", key: "selected-profile-id", value: id });
}

export async function readMirroredSelectedProfileId() {
  return await sendToSW({ action: "mirrorRead", key: "selected-profile-id" });
}

export async function mirrorProfiles(profiles) {
  await sendToSW({ action: "mirrorStore", key: "profiles", value: profiles });
}

export async function readMirroredProfiles() {
  return await sendToSW({ action: "mirrorRead", key: "profiles" });
}
