/**
 * Centralized timer management for cleanup
 */
const timers = new Map();

/**
 * Register a timer for centralized cleanup
 * @param {Function} fn - Callback function
 * @param {number} delay - Delay in milliseconds
 * @param {string} id - Unique identifier
 * @returns {number} Timer ID
 */
export function registerTimer(fn, delay, id = `timer_${Date.now()}_${Math.random()}`) {
  const timerId = setTimeout(() => {
    try {
      fn();
    } finally {
      timers.delete(id);
    }
  }, delay);
  timers.set(id, timerId);
  return timerId;
}

/**
 * Register a timer that returns the ID for manual management
 * @param {number} delay - Delay in milliseconds
 * @param {string} id - Unique identifier
 * @returns {number} Timer ID
 */
export function createTimer(delay, id = `timer_${Date.now()}_${Math.random()}`) {
  const timerId = setTimeout(() => {
    timers.delete(id);
  }, delay);
  timers.set(id, timerId);
  return timerId;
}

/**
 * Clear a specific timer by ID
 * @param {string} id - Timer identifier
 * @returns {boolean} True if timer was cleared
 */
export function clearTimer(id) {
  const timerId = timers.get(id);
  if (timerId) {
    clearTimeout(timerId);
    timers.delete(id);
    return true;
  }
  return false;
}

/**
 * Clear all registered timers
 */
export function clearAllTimers() {
  timers.forEach((timerId) => clearTimeout(timerId));
  timers.clear();
}

/**
 * Clear timers by prefix pattern
 * @param {string} prefix - Prefix to match
 */
export function clearTimersByPrefix(prefix) {
  timers.forEach((timerId, id) => {
    if (id.startsWith(prefix)) {
      clearTimeout(timerId);
      timers.delete(id);
    }
  });
}

/**
 * Get active timer count
 * @returns {number} Number of active timers
 */
export function getActiveTimerCount() {
  return timers.size;
}

/**
 * Schedule a one-time task with automatic cleanup on page unload
 * @param {Function} fn - Task to execute
 * @param {number} delay - Delay in milliseconds
 * @param {string} id - Optional identifier
 */
export function scheduleWithCleanup(fn, delay, id) {
  const timerId = createTimer(delay, id);

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      clearTimer(id);
    });
  }

  return timerId;
}
