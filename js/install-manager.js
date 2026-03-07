/**
 * @fileoverview Install Manager for PWA installation
 * @module js/install-manager
 */

import { createTimer, clearTimer } from "./utils/timer-manager.js";

let deferredPrompt = null;
let installButton = null;

/**
 * Initialize install prompt and button
 */
export function initInstallUI() {
  // Check if PWA is already installed
  if (isPWAInstalled()) {
    return;
  }

  // Get install button element
  installButton = document.getElementById("install-pwa-btn");
  if (!installButton) {
    console.warn("Install button not found");
    return;
  }

  // Hide button initially
  installButton.style.display = "none";

  // Listen for beforeinstallprompt event
  globalThis.window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // Prevent mini-infobar
    deferredPrompt = e;

    // Show install button
    showInstallButton();
  });

  // Listen for appinstalled event
  globalThis.window.addEventListener("appinstalled", () => {
    console.log("PWA installed successfully");
    hideInstallButton();
    deferredPrompt = null;
  });

  // Add click handler to install button
  installButton.addEventListener("click", installPWA);
}

/**
 * Show the install button
 */
export function showInstallButton() {
  if (installButton) {
    installButton.style.display = "block";
    installButton.disabled = false;

    installButton.classList.add("pulse");

    clearTimer("install_pulse");
    createTimer(1000, "install_pulse");
    const pulseTimer = setTimeout(() => {
      installButton.classList.remove("pulse");
      clearTimeout(pulseTimer);
    }, 1000);
  }
}

/**
 * Hide the install button
 */
export function hideInstallButton() {
  if (installButton) {
    installButton.style.display = "none";
  }
}

/**
 * Install the PWA
 */
export async function installPWA() {
  if (!deferredPrompt) {
    console.warn("No deferred prompt available");
    return;
  }

  // Show install prompt
  deferredPrompt.prompt();

  // Wait for user response
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    console.log("User accepted install");
    hideInstallButton();
  } else {
    console.log("User dismissed install");
  }

  deferredPrompt = null;
}

/**
 * Check if PWA is already installed
 */
export function isPWAInstalled() {
  // Check if the app is launched from the homescreen
  // This is a heuristic - not 100% reliable
  return (
    globalThis.window.matchMedia("(display-mode: standalone)").matches ||
    globalThis.window.navigator.standalone === true
  );
}

/**
 * Get install prompt (for manual triggering)
 */
export function getInstallPrompt() {
  return deferredPrompt;
}

/**
 * Add install button to DOM if it doesn't exist
 */
export function ensureInstallButton() {
  const existingButton = document.getElementById("install-pwa-btn");
  if (existingButton) {
    return existingButton;
  }

  // Create install button
  const button = document.createElement("button");
  button.id = "install-pwa-btn";
  button.className = "install-btn";
  button.textContent = "Install App";

  // Add button to page (e.g., in header or sidebar)
  const header = document.querySelector("header") || document.body;
  header.appendChild(button);

  return button;
}

/**
 * Initialize install manager
 */
export function init() {
  // Ensure install button exists in DOM
  ensureInstallButton();

  // Initialize UI
  initInstallUI();

  // Check if already installed
  if (isPWAInstalled()) {
    console.log("PWA is already installed");
  }
}
