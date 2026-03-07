/**
 * Centralized error handling utilities
 */

// Error severity levels
export const ErrorLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  CRITICAL: "critical"
};

// Error categories
export const ErrorCategory = {
  NETWORK: "network",
  STORAGE: "storage",
  PARSING: "parsing",
  INITIALIZATION: "initialization",
  UI: "ui",
  SERVICE_WORKER: "service_worker",
  UNKNOWN: "unknown"
};

/**
 * Error context storage
 */
class ErrorContext {
  constructor() {
    this.context = {};
  }

  set(key, value) {
    this.context[key] = value;
  }

  get(key) {
    return this.context[key];
  }

  clear() {
    this.context = {};
  }

  getSnapshot() {
    return { ...this.context };
  }
}

export const errorContext = new ErrorContext();

/**
 * Log error with consistent formatting
 */
export function logError(error, options = {}) {
  const {
    level = ErrorLevel.ERROR,
    category = ErrorCategory.UNKNOWN,
    message = "",
    context = {},
    logger = console
  } = options;

  const timestamp = new Date().toISOString();
  const contextSnapshot = { ...errorContext.getSnapshot(), ...context };

  const errorInfo = {
    timestamp,
    level,
    category,
    message: message || error.message,
    stack: error.stack,
    context: contextSnapshot
  };

  switch (level) {
    case ErrorLevel.DEBUG:
      logger.debug("[ERROR]", errorInfo);
      break;
    case ErrorLevel.INFO:
      logger.info("[ERROR]", errorInfo);
      break;
    case ErrorLevel.WARN:
      logger.warn("[ERROR]", errorInfo);
      break;
    case ErrorLevel.CRITICAL:
      logger.error("[CRITICAL]", errorInfo);
      storeCriticalError(errorInfo);
      break;
    default:
      logger.error("[ERROR]", errorInfo);
  }

  return errorInfo;
}

/**
 * Store critical errors for later review
 */
function storeCriticalError(errorInfo) {
  try {
    const stored = JSON.parse(localStorage.getItem("critical_errors") || "[]");
    stored.push(errorInfo);
    const trimmed = stored.slice(-10);
    localStorage.setItem("critical_errors", JSON.stringify(trimmed));
  } catch (e) {
    console.warn("Failed to store critical error:", e);
  }
}

/**
 * Create an async error handler wrapper
 */
export function createErrorHandler(options = {}) {
  const {
    onError = (error) => logError(error, options),
    fallbackValue = null,
    swallowErrors = false
  } = options;

  return async function (errorHandlerFn) {
    try {
      return await errorHandlerFn();
    } catch (error) {
      if (!swallowErrors) {
        await onError(error);
      }
      return fallbackValue;
    }
  };
}

/**
 * Wrap a function with error handling
 */
export function withErrorHandling(fn, options = {}) {
  return async function (...args) {
    const errorHandler = createErrorHandler(options);
    return errorHandler(() => fn(...args));
  };
}

/**
 * Classify error type
 */
export function classifyError(error) {
  if (error instanceof TypeError) {
    return ErrorCategory.PARSING;
  }
  if (error instanceof NetworkError || error.message.includes("fetch")) {
    return ErrorCategory.NETWORK;
  }
  if (error instanceof DOMException || error.name === "QuotaExceededError") {
    return ErrorCategory.STORAGE;
  }
  return ErrorCategory.UNKNOWN;
}

/**
 * Custom NetworkError class
 */
export class NetworkError extends Error {
  constructor(message, status, url) {
    super(message);
    this.name = "NetworkError";
    this.status = status;
    this.url = url;
  }
}
