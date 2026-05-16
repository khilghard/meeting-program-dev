/**
 * AgendaRenderer.js
 * Renders private agenda items as accordion panels.
 * Handles simple markdown to HTML conversion.
 */

import { t } from "../i18n/index.js";

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text) {
  if (typeof text !== "string") return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Convert simple markdown to safe HTML
 * Supports: bold, italic, links, lists, paragraphs
 */
export function parseMarkdown(text) {
  if (!text) return "";

  let html = escapeHtml(text);

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  // Numbered lists: lines starting with "1. ", "2. " etc.
  // Wrap consecutive <li> in <ol> – simple approach: replace each line with <li> then later wrap if needed
  // For now, we'll keep <li> as is; CSS can display properly
  html = html.replace(/^(\d+\.\s+.*)$/gm, "<li>$1</li>");

  // Bulleted lists: lines starting with "- " or "* "
  html = html.replace(/^(-\s+.*)$/gm, "<li>$1</li>");
  html = html.replace(/^(\*\s+.*)$/gm, "<li>$1</li>");

  // Paragraphs: double newline -> <p>
  // First, split by double newlines, wrap each in <p> if not already in block tags
  html = html
    .split(/\n\s*\n/)
    .map((para) => {
      // Don't wrap if already starts with <ul>, <ol>, <table>, <div>, etc.
      if (/^<(ul|ol|li|table|thead|tbody|tr|td|th|div|section)/i.test(para.trim())) {
        return para;
      }
      return `<p>${para}</p>`;
    })
    .join("");

  // Single line breaks within paragraphs already handled by <p> wrapping; but if any leftover \n, replace with <br>
  html = html.replace(/\n/g, "<br>");

  return html;
}

/**
 * Create an accordion panel DOM element for an agenda item
 * @param {string} key - The row key (e.g., 'speaker1')
 * @param {string} value - The row value (may contain markdown)
 * @returns {HTMLElement} section.agenda-panel
 */
export function createAgendaAccordionPanel(key, value) {
  const panelId = `panel-content-${key}`;
  const section = document.createElement("section");
  section.className = "agenda-panel"; // collapsed by default

  // Header
  const header = document.createElement("div");
  header.className = "panel-header";
  header.setAttribute("role", "button");
  header.setAttribute("tabindex", "0");
  header.setAttribute("aria-expanded", "false");
  header.setAttribute("aria-controls", panelId);

  const lockIcon = document.createElement("span");
  lockIcon.className = "lock-icon";
  lockIcon.setAttribute("aria-hidden", "true");
  lockIcon.textContent = "🔒";

  const title = document.createElement("h3");
  title.className = "panel-title";
  // Use localized key if available, else capitalize key
  const localized = t(key);
  title.textContent = localized !== key ? localized : capitalizeKey(key);

  const chevron = document.createElement("span");
  chevron.className = "chevron-icon";
  chevron.setAttribute("aria-hidden", "true");
  chevron.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M5.41 7.59L4 9l8 8 8-8-1.41-1.41L12 14.17z"/></svg>`;

  header.appendChild(lockIcon);
  header.appendChild(title);
  header.appendChild(chevron);

  // Content
  const content = document.createElement("div");
  content.className = "panel-content";
  content.id = panelId;
  const valueDiv = document.createElement("div");
  valueDiv.className = "panel-value";
  valueDiv.innerHTML = parseMarkdown(value);
  content.appendChild(valueDiv);

  section.appendChild(header);
  section.appendChild(content);

  const toggle = () => {
    const expanded = section.classList.toggle("expanded");
    header.setAttribute("aria-expanded", String(expanded));
  };
  header.addEventListener("click", toggle);
  header.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });

  return section;
}

/**
 * Capitalize a key for display: 'openingHymn' -> 'Opening Hymn'
 */
function capitalizeKey(key) {
  if (!key) return "";
  // Insert space before capital letters, lower case rest
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Render a collection of agenda rows into a container
 * @param {Array<{key:string, value:string}>} rows
 * @param {HTMLElement} container
 */
export function renderAgendaRows(rows, container) {
  container.textContent = "";
  if (!rows || rows.length === 0) return;

  const section = document.createElement("section");
  section.className = "private-agenda-section";
  section.setAttribute("aria-label", "Private Agenda");

  rows.forEach((row) => {
    const panel = createAgendaAccordionPanel(row.key, row.value);
    section.appendChild(panel);
  });

  container.appendChild(section);
}
