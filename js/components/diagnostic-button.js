/**
 * Diagnostic Button Component
 * Provides a UI button for collecting and sending diagnostic data
 * Opens user's default email client with pre-filled diagnostic information
 */

import { collectDiagnosticData, formatDiagnosticEmail } from "../utils/diagnostic-data-collector.js";
import { t } from "../i18n/index.js";

const BUTTON_ID = "diagnostic-button";
const EMAIL_SUBJECT = "Sacrament Meeting Program Debug Data";

let isLoading = false;

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

    // Create mailto link
    const subject = encodeURIComponent(EMAIL_SUBJECT);
    const body = encodeURIComponent(emailBody);
    const mailto = `mailto:?subject=${subject}&body=${body}`;

    // Update button to opening email state
    updateButtonState("opening");

    // Small delay to show state change
    setTimeout(() => {
      window.location.href = mailto;

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
