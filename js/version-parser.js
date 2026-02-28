/**
 * @fileoverview Version parsing and comparison utilities
 * @module js/version-parser
 */

/**
 * Parses a semantic version string into [major, minor, patch] array
 * @param {string} versionString - The version string to parse
 * @returns {number[]} Array of [major, minor, patch] or [0, 0, 0] for invalid input
 */
export function parseVersion(versionString) {
  if (typeof versionString !== "string") {
    return [0, 0, 0];
  }

  const trimmed = versionString.trim();
  if (!trimmed) {
    return [0, 0, 0];
  }

  const parts = trimmed.split(/\s*\.\s*/);
  if (parts.length !== 3) {
    return [0, 0, 0];
  }

  const parsed = parts.map((part) => {
    const num = parseInt(part, 10);
    return isNaN(num) ? -1 : num;
  });

  if (parsed.some((num) => num < 0)) {
    return [0, 0, 0];
  }

  return parsed;
}

/**
 * Compares two version strings to determine if remote is newer
 * @param {string} remoteVersion - The remote version string
 * @param {string} localVersion - The local version string
 * @returns {boolean} True if remote > local, false otherwise
 */
export function isNewer(remoteVersion, localVersion) {
  // Validate version strings before parsing
  if (
    !remoteVersion ||
    !localVersion ||
    typeof remoteVersion !== "string" ||
    typeof localVersion !== "string"
  ) {
    return false;
  }

  const remote = parseVersion(remoteVersion);
  const local = parseVersion(localVersion);

  // If either version couldn't be parsed properly, don't consider it newer
  if (remote[0] === 0 && remote[1] === 0 && remote[2] === 0) {
    return false;
  }
  if (local[0] === 0 && local[1] === 0 && local[2] === 0) {
    return true;
  }

  if (remote[0] > local[0]) return true;
  if (remote[0] < local[0]) return false;

  if (remote[1] > local[1]) return true;
  if (remote[1] < local[1]) return false;

  return remote[2] > local[2];
}
