/**
 * Promise utilities for consistent async/await patterns
 */

/**
 * Wrap a function to ensure it returns a promise
 */
export function ensurePromise(fn) {
  return function (...args) {
    try {
      const result = fn(...args);
      return result instanceof Promise ? result : Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  };
}

/**
 * Execute Promise.all with individual error handling
 * Returns results array with { success, data, error } objects
 */
export async function promiseAllSafe(promises, options = {}) {
  const { continueOnError = true, logger = console.warn } = options;

  const results = await Promise.all(
    promises.map(async (promise, index) => {
      try {
        const data = await promise;
        return { success: true, data, index };
      } catch (error) {
        if (continueOnError) {
          logger(`Promise ${index} failed:`, error.message);
          return { success: false, error, index };
        }
        throw error;
      }
    })
  );

  return results;
}

/**
 * Retry a promise-returning function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, delayMs = 1000) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const backoffDelay = delayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }
  throw lastError;
}

/**
 * Create a timeout wrapper for any promise
 */
export function withTimeout(promise, timeoutMs, errorMessage = "Operation timed out") {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs))
  ]);
}
