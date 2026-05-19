/**
 * Console Capture Utility
 * Intercepts console methods and stores messages in a circular buffer
 * for later diagnostic reporting.
 */

const MAX_CONSOLE_MESSAGES = 500;
const STORAGE_KEY = "meeting_program_console_logs";

let consoleLogs = [];
let initialized = false;
let originalConsole = null;

function getStorage() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function trimLogs(logs) {
  return logs.slice(-MAX_CONSOLE_MESSAGES);
}

function loadPersistedLogs() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return trimLogs(
      parsed.filter(
        (entry) =>
          entry &&
          typeof entry.timestamp === "string" &&
          typeof entry.level === "string" &&
          typeof entry.message === "string"
      )
    );
  } catch {
    return [];
  }
}

function persistLogs() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(consoleLogs));
  } catch {
    // Ignore storage failures to avoid breaking runtime logging.
  }
}

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
  if (initialized) {
    return;
  }

  consoleLogs = loadPersistedLogs();
  originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

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

      consoleLogs = trimLogs([...consoleLogs, entry]);
      persistLogs();
    } catch (err) {
      // Silently fail to avoid breaking console
    }
  };

  console.log = function (...args) {
    captureMessage("log", args);
    originalConsole.log.apply(console, args);
  };

  console.warn = function (...args) {
    captureMessage("warn", args);
    originalConsole.warn.apply(console, args);
  };

  console.error = function (...args) {
    captureMessage("error", args);
    originalConsole.error.apply(console, args);
  };

  console.debug = function (...args) {
    captureMessage("debug", args);
    originalConsole.debug.apply(console, args);
  };

  initialized = true;

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

  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures to keep clear non-throwing.
  }
}

/**
 * Get count of captured messages
 * @returns {number} Number of stored console messages
 */
export function getConsoleLogCount() {
  return consoleLogs.length;
}
