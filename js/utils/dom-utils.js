/**
 * DOM utilities - Safe, consistent patterns
 */

/**
 * Safely clear an element's content
 * Both rigour and SonarQube accept this pattern
 * @param {Element} element - Element to clear
 */
export function clearElement(element) {
  if (element) {
    element.textContent = "";
  }
}

/**
 * Safely set text content
 * @param {Element} element - Element to update
 * @param {string} text - Text to set
 */
export function setText(element, text) {
  if (element) {
    element.textContent = text || "";
  }
}

/**
 * Create element with text content (safe alternative to innerHTML)
 * @param {string} tagName - Tag name
 * @param {string} text - Text content
 * @param {Object} styles - Optional styles
 * @returns {Element} Created element
 */
export function createTextElement(tagName, text, styles = {}) {
  const element = document.createElement(tagName);
  element.textContent = text || "";

  Object.entries(styles).forEach(([prop, value]) => {
    element.style[prop] = value;
  });

  return element;
}
