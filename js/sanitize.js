// sanitize.js

// Allowed keys in the Google Sheet
export const ALLOWED_KEYS = new Set([
  "unitName",
  "unitAddress",
  "link",
  "date",
  "presiding",
  "conducting",
  "musicDirector",
  "musicOrganist",
  "horizontalLine",
  "openingHymn",
  "openingPrayer",
  "sacramentHymn",
  "intermediateHymn",
  "closingHymn",
  "closingPrayer",
  "hymn",
  "speaker",
  "leader",
  "generalStatementWithLink",
  "generalStatement",
  "linkWithSpace",
  "stakeName",
]);

// Permissive: allow most Unicode letters, digits, punctuation, spaces,
// plus <LINK> and <IMG> placeholders.
const SAFE_VALUE = /^[\p{L}\p{N}\p{P}\p{S}\p{Zs}~|<>]+$/u;

// Strip HTML tags but preserve <LINK> and <IMG>
export function stripTags(str) {
  if (!str) return "";
  // Remove script and style tags and their content entirely
  let cleaned = str.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "");
  cleaned = cleaned.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "");
  // Remove other tags but keep our placeholders
  return cleaned.replace(/<(?!LINK>|IMG>)[^>]+>/gi, "");
}

// Validate URLs (only http/https)
export function isSafeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// Sanitize a raw value from Google Sheets
export function sanitizeValue(raw) {
  if (!raw) return "";

  // Hard block script tags
  if (/<script/i.test(raw)) {
    console.warn("Blocked script tag:", raw);
    return "";
  }

  let value = raw.trim();
  value = stripTags(value);

  if (!SAFE_VALUE.test(value)) {
    console.warn("Blocked unsafe characters:", raw);
    return "";
  }

  return value;
}

// Validate a key/value pair
export function sanitizeEntry(rawKey, rawValue) {
  if (!rawKey) return null;

  const key = rawKey.trim();
  if (!key) return null;

  // dynamic keys: speaker1, speaker2, etc.
  if (/^speaker\d+$/i.test(key)) {
    return { key: "speaker", value: sanitizeValue(rawValue) };
  }

  if (/^intermediatehymn\d+$/i.test(key)) {
    return { key: "intermediateHymn", value: sanitizeValue(rawValue) };
  }

  if (!ALLOWED_KEYS.has(key)) {
    console.warn("Blocked unknown key:", key);
    return null;
  }

  // Allow stakeName to pass through
  if (key === "stakeName") {
    return { key, value: sanitizeValue(rawValue) };
  }

  const value = sanitizeValue(rawValue);
  return { key, value };
}
