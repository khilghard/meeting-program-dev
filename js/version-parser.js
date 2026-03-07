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
    const num = Number.parseInt(part, 10);
    return Number.isNaN(num) ? -1 : num;
  });

  if (parsed.some((num) => num < 0)) {
    return [0, 0, 0];
  }

  return parsed;
}

function isValidVersionString(version) {
  return version && typeof version === "string";
}

function isZeroVersion(versionArray) {
  return versionArray[0] === 0 && versionArray[1] === 0 && versionArray[2] === 0;
}

function compareMajor(remote, local) {
  if (remote[0] > local[0]) return 1;
  if (remote[0] < local[0]) return -1;
  return 0;
}

function compareMinor(remote, local) {
  if (remote[1] > local[1]) return 1;
  if (remote[1] < local[1]) return -1;
  return 0;
}

function comparePatch(remote, local) {
  return remote[2] > local[2] ? 1 : remote[2] < local[2] ? -1 : 0;
}

function compareVersions(remote, local) {
  const majorCompare = compareMajor(remote, local);
  if (majorCompare !== 0) return majorCompare;

  const minorCompare = compareMinor(remote, local);
  if (minorCompare !== 0) return minorCompare;

  return comparePatch(remote, local);
}

/**
 * Compares two version strings to determine if remote is newer
 * @param {string} remoteVersion - The remote version string
 * @param {string} localVersion - The local version string
 * @returns {boolean} True if remote > local, false otherwise
 */
export function isNewer(remoteVersion, localVersion) {
  if (!isValidVersionString(remoteVersion) || !isValidVersionString(localVersion)) {
    return false;
  }

  const remote = parseVersion(remoteVersion);
  const local = parseVersion(localVersion);

  if (isZeroVersion(remote)) {
    return false;
  }
  if (isZeroVersion(local)) {
    return true;
  }

  return compareVersions(remote, local) > 0;
}
