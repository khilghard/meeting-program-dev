/**
 * Diagnostic Button Component
 * Provides a UI button for collecting and sending diagnostic data
 * Opens user's default email client with pre-filled diagnostic information
 */

import { collectDiagnosticData, formatDiagnosticEmail } from "../utils/diagnostic-data-collector.js";
import { t } from "../i18n/index.js";

const BUTTON_ID = "diagnostic-button";
const EMAIL_SUBJECT = "Sacrament Meeting Program Debug Data";
const MAX_MAILTO_URL_LENGTH = 1800;

let isLoading = false;

function translateOrFallback(key, fallback) {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

function buildMailtoUrl(subject, body) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function isAndroidDevice() {
  const ua = navigator?.userAgent || "";
  return /Android/i.test(ua);
}

async function copyDiagnosticToClipboard(text) {
  try {
    if (!navigator.clipboard?.writeText) {
      return false;
    }

    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function buildFallbackBody(diagnosticData, copiedToClipboard) {
  const intro = copiedToClipboard
    ? translateOrFallback(
      "diagnostic.mailtoTooLargeCopied",
      "Full diagnostic report was copied to your clipboard. Please paste it into this email."
    )
    : translateOrFallback(
      "diagnostic.mailtoTooLarge",
      "Diagnostic report was too large to attach automatically. Please describe the issue and include recent steps."
    );

  const lines = [intro, ""];

  if (diagnosticData?.timestamp) {
    lines.push(`Timestamp: ${diagnosticData.timestamp}`);
  }
  if (diagnosticData?.siteUrl) {
    lines.push(`Site URL: ${diagnosticData.siteUrl}`);
  }
  if (diagnosticData?.googleSheetUrl) {
    lines.push(`Google Sheet URL: ${diagnosticData.googleSheetUrl}`);
  }

  const errorLogs = (diagnosticData?.consoleLogs || []).filter((entry) => entry?.level === "error");
  if (errorLogs.length > 0) {
    lines.push("");
    lines.push("Error Logs:");
    errorLogs.forEach((log) => {
      const timestamp = log?.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "[unknown time]";
      lines.push(`[${timestamp}] ${log?.message || "[no message]"}`);
    });
  }

  return lines.join("\n");
}

/**
 * Initialize the diagnostic button on page load
 */
export function initDiagnosticButton() {
  // Add button to DOM
  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.className = "diagnostic-button";
  button.setAttribute("aria-label", t("diagnostic.buttonLabel") || "Report issue with diagnostic data");
  button.setAttribute("title", t("diagnostic.buttonTitle") || "Click to report issue with diagnostic data");

  // Use bug icon
  button.innerHTML = "<span class=\"diagnostic-icon\">🐛</span>";

  button.addEventListener("click", handleDiagnosticClick);

  document.body.appendChild(button);
}

/**
 * Handle diagnostic button click
 */
async function handleDiagnosticClick() {
  if (isLoading) return;

  isLoading = true;
  updateButtonState("loading");

  try {
    // Collect diagnostic data
    const diagnosticData = await collectDiagnosticData();
    const emailBody = formatDiagnosticEmail(diagnosticData);

    let mailto = buildMailtoUrl(EMAIL_SUBJECT, emailBody);
    const shouldUseLengthFallback = !isAndroidDevice() && mailto.length > MAX_MAILTO_URL_LENGTH;

    if (shouldUseLengthFallback) {
      const copiedToClipboard = await copyDiagnosticToClipboard(emailBody);
      const fallbackBody = buildFallbackBody(diagnosticData, copiedToClipboard);

      console.warn(
        "[DiagnosticButton] Diagnostic payload exceeded mailto size limit; using short draft fallback",
        {
          mailtoLength: mailto.length,
          copiedToClipboard
        }
      );

      mailto = buildMailtoUrl(EMAIL_SUBJECT, fallbackBody);
    }

    // Update button to opening email state
    updateButtonState("opening");

    // Small delay to show state change
    setTimeout(() => {
      // Use an anchor click instead of window.location.href —
      // window.location.href = mailto: is unreliable on iOS Safari/WKWebView.
      const anchor = document.createElement("a");
      anchor.href = mailto;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      // Reset after a delay (user may return from email app)
      setTimeout(() => {
        isLoading = false;
        updateButtonState("success");

        // Return to default after 3 seconds
        setTimeout(() => {
          updateButtonState("default");
        }, 3000);
      }, 1000);
    }, 300);
  } catch (error) {
    console.error("[DiagnosticButton] Error collecting diagnostic data:", error);
    isLoading = false;
    updateButtonState("error");
    alert(
      t("diagnostic.error") || "Failed to collect diagnostic data. Please try again."
    );

    // Return to default after 3 seconds
    setTimeout(() => {
      updateButtonState("default");
    }, 3000);
  }
}

/**
 * Update button visual state
 * @param {string} state - One of: 'default', 'loading', 'opening', 'success', 'error'
 */
function updateButtonState(state) {
  const button = document.getElementById(BUTTON_ID);
  if (!button) return;

  button.classList.remove("loading", "opening", "success", "error");

  switch (state) {
  case "loading":
    button.classList.add("loading");
    button.setAttribute("disabled", "disabled");
    button.innerHTML = "<span class=\"diagnostic-spinner\"></span>";
    break;
  case "opening":
    button.classList.add("opening");
    button.setAttribute("disabled", "disabled");
    button.innerHTML = "<span class=\"diagnostic-icon\">✓</span>";
    break;
  case "success":
    button.classList.add("success");
    button.innerHTML = "<span class=\"diagnostic-icon\">✓</span>";
    break;
  case "error":
    button.classList.add("error");
    button.removeAttribute("disabled");
    button.innerHTML = "<span class=\"diagnostic-icon\">!</span>";
    break;
  case "default":
  default:
    button.removeAttribute("disabled");
    button.innerHTML = "<span class=\"diagnostic-icon\">🐛</span>";
    break;
  }
}

/**
 * Clean up diagnostic button
 */
export function destroyDiagnosticButton() {
  const button = document.getElementById(BUTTON_ID);
  if (button) {
    button.removeEventListener("click", handleDiagnosticClick);
    button.remove();
  }
}
