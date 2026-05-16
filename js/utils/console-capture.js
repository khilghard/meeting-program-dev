/**
 * Console Capture Utility
 * Intercepts console methods and stores messages in a circular buffer
 * for later diagnostic reporting.
 */

const MAX_CONSOLE_MESSAGES = 500;

let consoleLogs = [];

/**
 * @typedef {Object} ConsoleEntry
 * @property {string} timestamp - ISO timestamp
 * @property {string} level - 'log', 'warn', 'error', 'debug'
 * @property {string} message - Formatted log message
 */

/**
 * Initialize console capture by intercepting console methods
 */
export function initConsoleCapture() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalDebug = console.debug;

  const captureMessage = (level, args) => {
    try {
      const message = args
        .map((arg) => {
          if (typeof arg === "string") {
            return arg;
          }
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(" ");

      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
      };

      consoleLogs.push(entry);

      // Keep circular buffer at max size
      if (consoleLogs.length > MAX_CONSOLE_MESSAGES) {
        consoleLogs.shift();
      }
    } catch (err) {
      // Silently fail to avoid breaking console
    }
  };

  console.log = function (...args) {
    captureMessage("log", args);
    originalLog.apply(console, args);
  };

  console.warn = function (...args) {
    captureMessage("warn", args);
    originalWarn.apply(console, args);
  };

  console.error = function (...args) {
    captureMessage("error", args);
    originalError.apply(console, args);
  };

  console.debug = function (...args) {
    captureMessage("debug", args);
    originalDebug.apply(console, args);
  };

  console.log("[ConsoleCapturer] Console capture initialized");
}

/**
 * Get all captured console logs
 * @returns {ConsoleEntry[]} Array of captured console entries
 */
export function getConsoleLogs() {
  return consoleLogs.slice();
}

/**
 * Clear captured console logs
 */
export function clearConsoleLogs() {
  consoleLogs = [];
}

/**
 * Get count of captured messages
 * @returns {number} Number of stored console messages
 */
export function getConsoleLogCount() {
  return consoleLogs.length;
}
