// ============================================================
// CMS Editor Redesign - Three-Section Layout
// ============================================================
// Implements the plan in docs/plans/cms.md
// ============================================================

import { ALLOWED_KEYS, isSafeUrl } from "../sanitize.js";
import { getLanguage, loadTranslations, t } from "../i18n/index.js";
import { childrenSongLookup, hymnsLookup } from "../data/hymnsLookup.js";

// --- Constants ---

/** Unit Information keys in canonical order */
const UNIT_INFO_KEYS = [
  "unitName",
  "stakeName",
  "obsolete",
  "migrationUrl",
  "unitAddress",
  "link",
  "date"
];

/** Keys allowed in Program section */
const PROGRAM_ALLOWED_KEYS = new Set([
  "presiding",
  "conducting",
  "musicDirector",
  "musicOrganist",
  "agendaAckVisitingLeaders",
  "agendaAnnouncements",
  "agendaGeneral",
  "openingHymn",
  "openingPrayer",
  "agendaBusinessReleases",
  "agendaBusinessCallings",
  "agendaBusinessPriesthood",
  "agendaBusinessNewMoveIns",
  "agendaBusinessNewConverts",
  "agendaBusinessGeneral",
  "agendaBusinessStake",
  "sacramentHymn",
  "sacramentLine",
  "speaker",
  "intermediateHymn",
  "closingHymn",
  "closingPrayer"
]);

/** Keys allowed in General section */
const GENERAL_ALLOWED_KEYS = new Set([
  "horizontalLine",
  "lessonEQRS",
  "lessonSundaySchool",
  "lessonYouth",
  "lessonPrimary",
  "photo",
  "leader",
  "linkWithSpace",
  "generalStatement",
  "generalStatementWithLink",
  "oilLamp"
]);

/** Universal keys that may appear in any section */
const UNIVERSAL_KEYS = new Set(["horizontalLine", "photo", "oilLamp"]);

/** Program key order for insert positioning */
const PROGRAM_KEY_ORDER = [
  "presiding",
  "conducting",
  "musicDirector",
  "musicOrganist",
  "agendaAckVisitingLeaders",
  "agendaAnnouncements",
  "agendaGeneral",
  "openingHymn",
  "openingPrayer",
  "agendaBusinessReleases",
  "agendaBusinessCallings",
  "agendaBusinessPriesthood",
  "agendaBusinessNewMoveIns",
  "agendaBusinessNewConverts",
  "agendaBusinessGeneral",
  "agendaBusinessStake",
  "agendaGeneral",
  "sacramentHymn",
  "sacramentLine",
  "agendaGeneral",
  "speaker",
  "intermediateHymn",
  "speaker",
  "agendaGeneral",
  "closingHymn",
  "closingPrayer"
];

/** Maximum repeatable items per key type */
const MAX_REPEATABLE_ITEMS = {
  speaker: 10,
  intermediateHymn: 5,
  leader: 20,
  lessonEQRS: 100,
  lessonSundaySchool: 100,
  lessonYouth: 100,
  lessonPrimary: 100,
  agendaAnnouncements: 20,
  agendaBusinessReleases: 20,
  agendaBusinessCallings: 20,
  linkWithSpace: 100,
  generalStatement: 100,
  generalStatementWithLink: 100
};

/** Required keys in Program section */
const REQUIRED_PROGRAM_KEYS = ["presiding", "closingPrayer"];

/** Keys that should display all 4 locale fields (user-translated) */
const USER_TRANSLATED_KEYS = new Set([
  "generalStatement",
  "generalStatementWithLink",
  "horizontalLine",
  "sacramentLine",
  "lessonEQRS",
  "lessonSundaySchool",
  "lessonYouth",
  "lessonPrimary",
  "linkWithSpace", // text field only
  "photo" // caption only
]);

const REQUIRED_ENGLISH_TEXT_KEYS = new Set(["generalStatement", "linkWithSpace"]);

const LINK_WITH_SPACE_LOCALES = ["en", "es", "fr", "swa"];

const LESSON_TRANSLATED_KEYS = new Set([
  "lessonEQRS",
  "lessonSundaySchool",
  "lessonYouth",
  "lessonPrimary"
]);

const REQUIRED_ENGLISH_TEXT_AND_URL_KEYS = new Set(LESSON_TRANSLATED_KEYS);
const REQUIRED_ENGLISH_URL_KEYS = new Set(["photo"]);

function joinPartsPreserveGaps(parts) {
  const normalized = parts.map((part) => String(part ?? ""));
  while (normalized.length > 0 && normalized[normalized.length - 1] === "") {
    normalized.pop();
  }
  return normalized.join("|");
}

/** Keys that are language-independent (same value in all locales) */
const LANGUAGE_INDEPENDENT_KEYS = new Set([
  "unitName",
  "stakeName",
  "unitAddress",
  "date",
  "link",
  "leader",
  "photo", // url field
  "presiding",
  "conducting",
  "musicDirector",
  "musicOrganist",
  "openingPrayer",
  "closingPrayer",
  "speaker", // name + caption
  "agendaGeneral",
  "agendaAckVisitingLeaders",
  "agendaAnnouncements",
  "agendaBusinessReleases",
  "agendaBusinessCallings",
  "agendaBusinessPriesthood",
  "agendaBusinessNewMoveIns",
  "agendaBusinessNewConverts",
  "agendaBusinessGeneral",
  "agendaBusinessStake",
  "openingHymn",
  "sacramentHymn",
  "intermediateHymn",
  "closingHymn",
  "hymn",
  "linkWithSpace", // url + imageUrl fields
  "migrationUrl",
  "sacramentLine",
  "oilLamp"
]);

// --- Helper Functions ---

export function normalizeCmsKeyType(key) {
  if (!key) return key;
  return key.replace(/(\d+)$/, "");
}

function isSplitKey(key) {
  return key === "split:program" || key === "split:general";
}

/**
 * Find split marker indices in rows array
 * Returns { programSplitIdx, generalSplitIdx } or null for missing splits
 */
function findSplitIndices(rows) {
  let programSplitIdx = null;
  let generalSplitIdx = null;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].key === "split:program") {
      programSplitIdx = i;
    } else if (rows[i].key === "split:general") {
      generalSplitIdx = i;
    }
  }

  return { programSplitIdx, generalSplitIdx };
}

/**
 * Ensure split markers exist in rows array
 * Inserts split:program above first presiding/conducting if missing
 * Inserts split:general below last closingPrayer/closingHymn if missing
 * Returns modified rows array
 */
function ensureSplitMarkers(rows) {
  const { programSplitIdx, generalSplitIdx } = findSplitIndices(rows);
  let modifiedRows = [...rows];

  // Insert split:program if missing
  if (programSplitIdx === null) {
    // Find first presiding or conducting row
    let insertIdx = modifiedRows.findIndex(
      (row) =>
        normalizeCmsKeyType(row.key) === "presiding" ||
        normalizeCmsKeyType(row.key) === "conducting"
    );

    // Fallback: insert after last unit info key
    if (insertIdx === -1) {
      for (let i = modifiedRows.length - 1; i >= 0; i--) {
        if (UNIT_INFO_KEYS.includes(modifiedRows[i].key)) {
          insertIdx = i + 1;
          break;
        }
      }
    }

    // Last fallback: insert at index 0
    if (insertIdx === -1) {
      insertIdx = 0;
    }

    modifiedRows.splice(insertIdx, 0, { key: "split:program", value: "" });
  }

  // Insert split:general if missing
  if (generalSplitIdx === null) {
    // Find last closingPrayer or closingHymn row
    let insertIdx = -1;
    for (let i = modifiedRows.length - 1; i >= 0; i--) {
      const normalizedKey = normalizeCmsKeyType(modifiedRows[i].key);
      if (normalizedKey === "closingPrayer" || normalizedKey === "closingHymn") {
        insertIdx = i + 1;
        break;
      }
    }

    // Fallback: insert at end
    if (insertIdx === -1) {
      insertIdx = modifiedRows.length;
    }

    modifiedRows.splice(insertIdx, 0, { key: "split:general", value: "" });
  }

  return modifiedRows;
}

function translateStaticText(text) {
  const translations = {
    "Unit Information": "cms.category.unitInfo",
    "Sacrament Meeting Program": "cms.category.program",
    "General Information": "cms.category.general",
    "Add Row": "cms.action.addRow",
    "Unsaved changes": "cms.status.unsaved",
    "All changes saved": "cms.status.saved",
    Required: "cms.badge.required",
    Optional: "cms.badge.optional",
    Add: "cms.action.add",
    Remove: "cms.action.remove",
    "Move Up": "cms.action.moveUp",
    "Move Down": "cms.action.moveDown",
    "Delete Row": "cms.action.deleteRow",
    "Insert <IMG>": "cms.action.insertImg",
    "Insert <LINK>": "cms.action.insertLink"
  };

  const translationKey = translations[text] || text;
  return t(translationKey) || translationKey;
}

/**
 * Parse display date string (e.g., "March 29, 2026") to ISO YYYY-MM-DD
 */
function parseDisplayDate(displayStr) {
  if (!displayStr) return "";
  try {
    const months = {
      January: 0,
      February: 1,
      March: 2,
      April: 3,
      May: 4,
      June: 5,
      July: 6,
      August: 7,
      September: 8,
      October: 9,
      November: 10,
      December: 11
    };
    const match = displayStr.match(/^(\w+)\s+(\d+),?\s+(\d{4})$/);
    if (!match) return "";
    const [, monthStr, dayStr, yearStr] = match;
    const month = months[monthStr];
    if (month === undefined) return "";
    const date = new Date(parseInt(yearStr), month, parseInt(dayStr));
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const monthNum = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${monthNum}-${day}`;
  } catch {
    return "";
  }
}

/**
 * Convert ISO YYYY-MM-DD to display format (e.g., "March 29, 2026")
 */
function formatDisplayDate(isoStr) {
  if (!isoStr) return "";
  try {
    const date = new Date(isoStr + "T00:00:00");
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);
  } catch {
    return "";
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Sanitize a part value by removing pipe characters
 */
export function sanitisePart(str) {
  return String(str ?? "")
    .replaceAll("|", "")
    .trim();
}

/**
 * Join parts with pipe, omitting empty values
 */
function joinParts(parts) {
  return parts.filter((p) => p !== "").join("|");
}

/**
 * Split a raw value by pipe delimiter
 */
function splitParts(raw) {
  return String(raw ?? "")
    .split("|")
    .map((part) => part.trim());
}

/**
 * Parse a field value based on key type
 */
export function parseFieldValue(keyType, raw) {
  const normalizedKey = normalizeCmsKeyType(keyType);
  const parts = splitParts(raw);

  switch (normalizedKey) {
    case "openingHymn":
    case "sacramentHymn":
    case "intermediateHymn":
    case "closingHymn":
    case "hymn":
      return { hymnNumber: parts[0] || "" };
    case "speaker":
      return { name: parts[0] || "", caption: parts[1] || "" };
    case "leader":
      return { name: parts[0] || "", calling: parts[1] || "", phone: parts[2] || "" };
    case "generalStatementWithLink":
      // New format supports per-locale pairs: text|url per locale.
      // Legacy format supports only en pair.
      if (parts.length >= 3) {
        const locales = ["en", "es", "fr", "swa"];
        const parsed = { text: "", url: "" };
        locales.forEach((locale, idx) => {
          const textIdx = idx * 2;
          const urlIdx = textIdx + 1;
          if (textIdx >= parts.length) return;
          const suffix = locale === "en" ? "" : `_${locale}`;
          parsed[`text${suffix}`] = (parts[textIdx] || "").replace(/<LINK>/g, "").trim();
          if (urlIdx < parts.length) {
            parsed[`url${suffix}`] = parts[urlIdx] || "";
          }
        });
        return parsed;
      }
      return { text: (parts[0] || "").replace(/<LINK>/g, "").trim(), url: parts[1] || "" };
    case "link":
      return { text: parts[0] || "", url: parts[1] || "" };
    case "linkWithSpace":
      // New format supports per-locale triplets: text|url|imageUrl per locale.
      // Legacy format supports only en triplet.
      if (parts.length >= 4) {
        const locales = ["en", "es", "fr", "swa"];
        const parsed = { text: "", url: "", imageUrl: "" };
        locales.forEach((locale, idx) => {
          const base = idx * 3;
          if (base >= parts.length) return;
          const suffix = locale === "en" ? "" : `_${locale}`;
          parsed[`text${suffix}`] = (parts[base] || "").replace(/<IMG>\s*/g, "").trim();
          if (base + 1 < parts.length) parsed[`url${suffix}`] = parts[base + 1] || "";
          if (base + 2 < parts.length) parsed[`imageUrl${suffix}`] = parts[base + 2] || "";
        });
        return parsed;
      }
      return {
        text: (parts[0] || "").replace(/<IMG>\s*/g, "").trim(),
        url: parts[1] || "",
        imageUrl: parts[2] || ""
      };
    case "photo":
      if (parts.length >= 3) {
        const parsed = { url: "", caption: "" };
        for (const locale of LINK_WITH_SPACE_LOCALES) {
          const suffix = locale === "en" ? "" : `_${locale}`;
          parsed[`url${suffix}`] = "";
          parsed[`caption${suffix}`] = "";
        }

        LINK_WITH_SPACE_LOCALES.forEach((locale, idx) => {
          const base = idx * 2;
          const suffix = locale === "en" ? "" : `_${locale}`;
          if (base < parts.length) {
            parsed[`url${suffix}`] = parts[base] || "";
          }
          if (base + 1 < parts.length) {
            parsed[`caption${suffix}`] = parts[base + 1] || "";
          }
        });

        return parsed;
      }

      return { url: parts[0] || "", caption: parts[1] || "" };
    case "oilLamp":
      return {
        enabled: true,
        caption: /^(yes|true)$/i.test(parts[0] || "") ? "" : parts[0] || ""
      };
    case "lessonEQRS":
    case "lessonSundaySchool":
    case "lessonYouth":
    case "lessonPrimary": {
      const parsed = { text: "", url: "" };
      for (const locale of LINK_WITH_SPACE_LOCALES) {
        const suffix = locale === "en" ? "" : `_${locale}`;
        parsed[`text${suffix}`] = "";
        parsed[`url${suffix}`] = "";
      }

      // Modern format: text|url pairs for en/es/fr/swa.
      if (parts.length >= 3) {
        LINK_WITH_SPACE_LOCALES.forEach((locale, idx) => {
          const base = idx * 2;
          const suffix = locale === "en" ? "" : `_${locale}`;
          if (base < parts.length) {
            parsed[`text${suffix}`] = parts[base] || "";
          }
          if (base + 1 < parts.length) {
            parsed[`url${suffix}`] = parts[base + 1] || "";
          }
        });
        return parsed;
      }

      // Legacy translated text-only format: en|es|fr|swa.
      if (parts.length === 4 && !isSafeUrl(parts[1])) {
        parsed.text = parts[0] || "";
        parsed.text_es = parts[1] || "";
        parsed.text_fr = parts[2] || "";
        parsed.text_swa = parts[3] || "";
        return parsed;
      }

      // Legacy EN-only format: either "text" or "text|url".
      parsed.text = parts[0] || "";
      parsed.url = parts[1] || "";
      return parsed;
    }
    default:
      // For user-translated keys, parse up to 4 locale parts: en|es|fr|swa
      if (USER_TRANSLATED_KEYS.has(normalizedKey)) {
        const value = { text: parts[0] || "" };
        if (parts[1] !== undefined) value.text_es = parts[1];
        if (parts[2] !== undefined) value.text_fr = parts[2];
        if (parts[3] !== undefined) value.text_swa = parts[3];
        return value;
      }
      return { text: parts[0] || "" };
  }
}

/**
 * Serialize a field value based on key type
 */
export function serializeFieldValue(keyType, value) {
  const normalizedKey = normalizeCmsKeyType(keyType);

  switch (normalizedKey) {
    case "openingHymn":
    case "sacramentHymn":
    case "intermediateHymn":
    case "closingHymn":
    case "hymn":
      return sanitisePart(value.hymnNumber);
    case "speaker":
      return joinParts([sanitisePart(value.name), sanitisePart(value.caption)]);
    case "leader":
      return joinParts([
        sanitisePart(value.name),
        sanitisePart(value.calling),
        sanitisePart(value.phone)
      ]);
    case "generalStatementWithLink":
      return joinPartsPreserveGaps(
        LINK_WITH_SPACE_LOCALES.flatMap((locale) => {
          const suffix = locale === "en" ? "" : `_${locale}`;
          const textValue = sanitisePart(value[`text${suffix}`] ?? "");
          const textWithToken = textValue ? `${textValue}<LINK>` : "";
          return [textWithToken, sanitisePart(value[`url${suffix}`] ?? "")];
        })
      );
    case "link":
      return joinParts([sanitisePart(value.text), sanitisePart(value.url)]);
    case "linkWithSpace":
      return joinPartsPreserveGaps(
        LINK_WITH_SPACE_LOCALES.flatMap((locale) => {
          const suffix = locale === "en" ? "" : `_${locale}`;
          const textValue = sanitisePart(value[`text${suffix}`] ?? "");
          const textWithToken = textValue ? `<IMG> ${textValue}` : "";
          return [
            textWithToken,
            sanitisePart(value[`url${suffix}`] ?? ""),
            sanitisePart(value[`imageUrl${suffix}`] ?? "")
          ];
        })
      );
    case "photo":
      return joinPartsPreserveGaps(
        LINK_WITH_SPACE_LOCALES.flatMap((locale) => {
          const suffix = locale === "en" ? "" : `_${locale}`;
          return [
            sanitisePart(value[`url${suffix}`] ?? ""),
            sanitisePart(value[`caption${suffix}`] ?? "")
          ];
        })
      );
    case "oilLamp":
      return sanitisePart(value.caption);
    case "lessonEQRS":
    case "lessonSundaySchool":
    case "lessonYouth":
    case "lessonPrimary":
      return joinPartsPreserveGaps(
        LINK_WITH_SPACE_LOCALES.flatMap((locale) => {
          const suffix = locale === "en" ? "" : `_${locale}`;
          return [
            sanitisePart(value[`text${suffix}`] ?? ""),
            sanitisePart(value[`url${suffix}`] ?? "")
          ];
        })
      );
    default:
      // For user-translated keys, collect locale-specific fields
      const normalizedKey = normalizeCmsKeyType(keyType);
      if (USER_TRANSLATED_KEYS.has(normalizedKey)) {
        // Determine which locales to include: always en, and optionally es, fr, swa if present
        const locales = ["en", "es", "fr", "swa"];
        const englishText = sanitisePart(value.text);
        const parts = [];
        for (const locale of locales) {
          const prop = locale === "en" ? "text" : `text_${locale}`;
          if (locale === "en") {
            parts.push(englishText);
            continue;
          }

          let localeValue =
            value[prop] !== undefined && value[prop] !== "" ? sanitisePart(value[prop]) : "";

          if (REQUIRED_ENGLISH_TEXT_KEYS.has(normalizedKey) && localeValue === englishText) {
            localeValue = "";
          }

          if (localeValue !== "") {
            parts.push(localeValue);
          } else if (locale === "en") {
            // en is required; if empty, include empty string to maintain position?
            parts.push("");
          }
        }
        return joinParts(parts);
      } else {
        return sanitisePart(value.text);
      }
  }
}

/**
 * Check if a value is empty for a given key type
 */
function isValueEmpty(keyType, value) {
  const normalizedKey = normalizeCmsKeyType(keyType);
  return !serializeFieldValue(normalizedKey, value);
}

/**
 * Check if a key type is repeatable
 */
function isRepeatableKeyType(keyType) {
  const normalizedKey = normalizeCmsKeyType(keyType);
  return MAX_REPEATABLE_ITEMS[normalizedKey] !== undefined;
}

/**
 * Get the maximum number of items for a repeatable key type
 */
function getMaxRepeatableItems(keyType) {
  const normalizedKey = normalizeCmsKeyType(keyType);
  return MAX_REPEATABLE_ITEMS[normalizedKey] || 1;
}

/**
 * Check if a key type should have numbered instances (speaker1, speaker2, etc.)
 */
function isNumberedRepeatableKeyType(keyType) {
  const normalizedKey = normalizeCmsKeyType(keyType);
  return ["speaker", "intermediateHymn", "leader"].includes(normalizedKey);
}

/**
 * Get the next ordinal number for a key type
 */
function getTrailingNumber(key) {
  const match = /(\d+)$/.exec(key);
  return match ? Number(match[1]) : 0;
}

/**
 * Get the concrete key for a new repeatable item
 */
function getConcreteKeyForNewItem(keyType, existingKeys, nextOrdinal) {
  const normalizedKey = normalizeCmsKeyType(keyType);
  if (isNumberedRepeatableKeyType(normalizedKey)) {
    return `${normalizedKey}${nextOrdinal}`;
  }
  return existingKeys[nextOrdinal - 1] ?? keyType;
}

/**
 * Get hymn title by hymn number
 */
function getHymnTitle(hymnNumber) {
  if (!hymnNumber) return "";
  const numStr = String(hymnNumber).trim();

  // Check Children's Songbook
  if (numStr.startsWith("CS ")) {
    const csNum = numStr.replace("CS ", "");
    const csEntry = childrenSongLookup[csNum];
    return csEntry ? csEntry.title : numStr;
  }

  // Check regular hymns
  const hymnEntry = hymnsLookup[numStr];
  return hymnEntry ? hymnEntry.title : numStr;
}

/**
 * Get all hymn options for dropdown
 */
function getHymnOptions() {
  const options = [];

  // Add regular hymns
  for (const [num, entry] of Object.entries(hymnsLookup)) {
    options.push({ value: num, title: `${num} - ${entry.title}` });
  }

  // Add Children's Songbook
  for (const [num, entry] of Object.entries(childrenSongLookup)) {
    options.push({ value: `CS ${num}`, title: `CS ${num} - ${entry.title}` });
  }

  // Sort by hymn number
  options.sort((a, b) => {
    const aNum = a.value.replace("CS ", "");
    const bNum = b.value.replace("CS ", "");
    const aIsCS = a.value.startsWith("CS");
    const bIsCS = b.value.startsWith("CS");

    if (aIsCS && !bIsCS) return 1;
    if (!aIsCS && bIsCS) return -1;
    return parseInt(aNum) - parseInt(bNum);
  });

  return options;
}

// --- Section Partitioning ---

/**
 * Parse rows into three sections: Unit Info, Program, General
 * Split markers (split:program, split:general) are excluded from sections
 */
function parseRowsIntoSections(rows) {
  const rowList = Array.isArray(rows)
    ? rows.map((row) => ({
        key: row.key ?? "",
        value: row.value ?? ""
      }))
    : [];

  const unitInfoRows = [];
  const programRows = [];
  const generalRows = [];
  let section = "unit"; // "unit", "program", or "general"

  for (const row of rowList) {
    // Skip split markers - they're boundary markers, not content rows
    if (isSplitKey(row.key)) {
      if (row.key === "split:program") {
        section = "program";
      } else if (row.key === "split:general") {
        section = "general";
      }
      continue;
    }

    const normalizedKey = normalizeCmsKeyType(row.key);

    if (section === "unit") {
      if (UNIT_INFO_KEYS.includes(row.key)) {
        unitInfoRows.push({ ...row, _id: `unit-${unitInfoRows.length}` });
      } else {
        // Non-unit key in unit section → switch to program
        section = "program";
      }
    }

    if (section === "program") {
      if (PROGRAM_ALLOWED_KEYS.has(normalizedKey) || UNIVERSAL_KEYS.has(normalizedKey)) {
        programRows.push({ ...row, _id: `program-${programRows.length}` });
      } else {
        // Non-program key → switch to general
        section = "general";
      }
    }

    if (section === "general") {
      generalRows.push({ ...row, _id: `general-${generalRows.length}` });
    }
  }

  return { unitInfoRows, programRows, generalRows };
}

/**
 * Auto-correct rows to meet constraints
 */
function autoCorrectRows(unitInfoRows, programRows, generalRows) {
  const corrections = [];

  // Check required keys in program
  const hasPresiding = programRows.some((row) => normalizeCmsKeyType(row.key) === "presiding");
  const hasClosingPrayer = programRows.some(
    (row) => normalizeCmsKeyType(row.key) === "closingPrayer"
  );

  if (!hasPresiding) {
    corrections.push({ type: "add_presiding", message: "Added missing presiding row" });
    programRows.unshift({ key: "presiding", value: "", _id: `program-${programRows.length}` });
  }

  if (!hasClosingPrayer) {
    corrections.push({ type: "add_closingPrayer", message: "Added missing closingPrayer row" });
    programRows.push({ key: "closingPrayer", value: "", _id: `program-${programRows.length}` });
  }

  // Ensure presiding is first (after any consecutive leading agenda keys)
  const presidingIdx = programRows.findIndex((row) => normalizeCmsKeyType(row.key) === "presiding");
  if (presidingIdx > 0) {
    // Determine the expected position: right after consecutive leading agenda keys
    let expectedIdx = 0;
    for (let i = 0; i < programRows.length; i++) {
      if (i === presidingIdx) break;
      if (programRows[i].key.startsWith("agenda")) {
        expectedIdx = i + 1;
      } else {
        break;
      }
    }
    if (presidingIdx !== expectedIdx) {
      const presidingRow = programRows.splice(presidingIdx, 1)[0];
      // Recompute insert position after splice
      let insertIdx = 0;
      for (let i = 0; i < programRows.length; i++) {
        if (programRows[i].key.startsWith("agenda")) {
          insertIdx = i + 1;
        } else {
          break;
        }
      }
      programRows.splice(insertIdx, 0, presidingRow);
      corrections.push({
        type: "reorder_presiding",
        message: "Moved presiding to correct position"
      });
    }
  }

  // Validate unit info section
  const unitInfoKeySet = new Set(UNIT_INFO_KEYS);
  const extraUnitInfoRows = unitInfoRows.filter((row) => !unitInfoKeySet.has(row.key));
  if (extraUnitInfoRows.length > 0) {
    corrections.push({
      type: "remove_extra_unit_info",
      message: `Removed ${extraUnitInfoRows.length} unauthorized keys from Unit Info`
    });
    for (const row of extraUnitInfoRows) {
      // Move to appropriate section based on key type
      if (PROGRAM_ALLOWED_KEYS.has(normalizeCmsKeyType(row.key))) {
        programRows.push({ ...row, _id: `program-${programRows.length}` });
      } else {
        generalRows.push({ ...row, _id: `general-${generalRows.length}` });
      }
    }
  }

  // Remove extra rows from unitInfoRows (keep only allowed keys)
  const validUnitRows = unitInfoRows.filter((row) => unitInfoKeySet.has(row.key));
  unitInfoRows.length = 0;
  unitInfoRows.push(...validUnitRows);

  // Ensure unit info rows are in canonical order
  unitInfoRows.sort((a, b) => {
    const indexA = UNIT_INFO_KEYS.indexOf(a.key);
    const indexB = UNIT_INFO_KEYS.indexOf(b.key);
    return indexA - indexB;
  });

  return { corrections, unitInfoRows, programRows, generalRows };
}

// --- Field Definitions ---

/**
 * Get field definitions for a key type
 */
function getFieldDefinition(keyType) {
  const normalizedKey = normalizeCmsKeyType(keyType);

  const definitions = {
    unitName: { fields: [{ name: "text", type: "text", placeholder: "cms.input.wardBranchName" }] },
    stakeName: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.stakeDistrictName" }]
    },
    unitAddress: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.meetingAddress" }]
    },
    date: { fields: [{ name: "text", type: "date", placeholder: "cms.input.meetingDate" }] },
    presiding: { fields: [{ name: "text", type: "text", placeholder: "cms.input.fullName" }] },
    conducting: { fields: [{ name: "text", type: "text", placeholder: "cms.input.fullName" }] },
    musicDirector: { fields: [{ name: "text", type: "text", placeholder: "cms.input.fullName" }] },
    musicOrganist: { fields: [{ name: "text", type: "text", placeholder: "cms.input.fullName" }] },
    openingHymn: {
      fields: [{ name: "hymnNumber", type: "hymn", placeholder: "cms.input.exampleHymnNumber" }]
    },
    sacramentHymn: {
      fields: [{ name: "hymnNumber", type: "hymn", placeholder: "cms.input.exampleHymnNumber" }]
    },
    intermediateHymn: {
      fields: [{ name: "hymnNumber", type: "hymn", placeholder: "cms.input.exampleHymnNumber" }]
    },
    closingHymn: {
      fields: [{ name: "hymnNumber", type: "hymn", placeholder: "cms.input.exampleHymnNumber" }]
    },
    hymn: {
      fields: [{ name: "hymnNumber", type: "hymn", placeholder: "cms.input.exampleHymnNumber" }]
    },
    openingPrayer: { fields: [{ name: "text", type: "text", placeholder: "cms.input.fullName" }] },
    closingPrayer: { fields: [{ name: "text", type: "text", placeholder: "cms.input.fullName" }] },
    speaker: {
      fields: [
        {
          name: "name",
          type: "text",
          label: "cms.input.speakerName",
          placeholder: "cms.input.name"
        },
        {
          name: "caption",
          type: "text",
          label: "cms.input.caption",
          placeholder: "cms.input.optionalCaptionTopic"
        }
      ]
    },
    horizontalLine: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.optionalSectionLabel" }]
    },
    sacramentLine: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.optionalSacramentHeading" }]
    },
    oilLamp: {
      fields: [{ name: "caption", type: "text", placeholder: "cms.input.optionalCaption" }]
    },
    leader: {
      fields: [
        {
          name: "name",
          type: "text",
          label: "cms.input.leaderName",
          placeholder: "cms.input.name"
        },
        {
          name: "calling",
          type: "text",
          label: "cms.input.calling",
          placeholder: "cms.input.calling"
        },
        { name: "phone", type: "text", label: "cms.input.phone", placeholder: "cms.input.phone" }
      ]
    },
    generalStatement: {
      fields: [{ name: "text", type: "textarea", placeholder: "cms.input.generalNotes" }]
    },
    generalStatementWithLink: {
      fields: [
        { name: "text", type: "textarea", placeholder: "cms.input.textWithLinkPlaceholder" },
        { name: "url", type: "text", placeholder: "cms.input.url" }
      ]
    },
    link: {
      fields: [
        { name: "text", type: "text", placeholder: "cms.input.displayText" },
        { name: "url", type: "text", placeholder: "cms.input.url" }
      ]
    },
    linkWithSpace: {
      fields: [
        { name: "text", type: "text", placeholder: "cms.input.displayText" },
        { name: "url", type: "text", placeholder: "cms.input.url" },
        { name: "imageUrl", type: "text", placeholder: "cms.input.optionalImageUrl" }
      ]
    },
    photo: {
      fields: [
        { name: "url", type: "text", placeholder: "cms.input.imageUrl" },
        { name: "caption", type: "text", placeholder: "cms.input.optionalCaption" }
      ]
    },
    migrationUrl: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.migrationUrl" }]
    },
    obsolete: { fields: [{ name: "text", type: "text", placeholder: "cms.input.obsolete" }] },
    lessonEQRS: {
      fields: [
        { name: "text", type: "text", placeholder: "cms.input.lessonTitleOrTopic" },
        { name: "url", type: "text", placeholder: "cms.input.url" }
      ]
    },
    lessonSundaySchool: {
      fields: [
        { name: "text", type: "text", placeholder: "cms.input.lessonTitleOrTopic" },
        { name: "url", type: "text", placeholder: "cms.input.url" }
      ]
    },
    lessonYouth: {
      fields: [
        { name: "text", type: "text", placeholder: "cms.input.lessonTitleOrTopic" },
        { name: "url", type: "text", placeholder: "cms.input.url" }
      ]
    },
    lessonPrimary: {
      fields: [
        { name: "text", type: "text", placeholder: "cms.input.lessonTitleOrTopic" },
        { name: "url", type: "text", placeholder: "cms.input.url" }
      ]
    },
    agendaGeneral: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.generalNotes" }]
    },
    agendaAnnouncements: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.announcement" }]
    },
    agendaAckVisitingLeaders: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.leaderName" }]
    },
    agendaBusinessStake: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.stakeBusiness" }]
    },
    agendaBusinessReleases: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.name" }]
    },
    agendaBusinessCallings: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.name" }]
    },
    agendaBusinessPriesthood: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.priesthoodBusiness" }]
    },
    agendaBusinessNewMoveIns: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.name" }]
    },
    agendaBusinessNewConverts: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.name" }]
    },
    agendaBusinessGeneral: {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.otherBusiness" }]
    }
  };

  return (
    definitions[normalizedKey] || {
      fields: [{ name: "text", type: "text", placeholder: "cms.input.value" }]
    }
  );
}

// --- Exported Functions ---

export function getFieldsForKeyType(keyType) {
  const normalizedKeyType = normalizeCmsKeyType(keyType);
  const definition = getFieldDefinition(normalizedKeyType);
  return JSON.parse(JSON.stringify(definition.fields));
}

// --- Main CmsEditor Class ---

class CmsEditor {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`[CmsEditor] Container not found: ${containerId}`);
    }

    this.options = {
      includeAgenda: false,
      onChangeCallback: null,
      onSaveCallback: null,
      ...options
    };

    this.unitRows = [];
    this.programRows = [];
    this.generalRows = [];
    this.baselineUnitRows = [];
    this.baselineProgramRows = [];
    this.baselineGeneralRows = [];
    this.isDirty = false;
    this.statusTimeout = null;
    this.undoStack = [];
    this.rowIdCounter = 0;

    // Incremental rendering: map of row._id -> DOM element
    this.rowElements = new Map();

    // Store original rows before auto-correction for undo
    this.originalRowsBeforeCorrection = null;

    // Drag state for split markers
    this._dragState = {
      isDragging: false,
      splitKey: null,
      longPressTimer: null,
      startY: 0,
      currentY: 0
    };

    // Generate unique row IDs
    this.generateRowIds();

    // Setup event delegation once
    this._setupEventDelegation();
  }

  /**
   * Initialize the editor with rows data
   */
  initialize(rows = [], { includeAgenda = this.options.includeAgenda } = {}) {
    // Ensure split markers exist (auto-insert if missing)
    rows = ensureSplitMarkers(rows);

    // Parse rows into sections (split markers excluded)
    let { unitInfoRows, programRows, generalRows } = parseRowsIntoSections(rows);

    // Filter agenda keys if includeAgenda is false
    if (!includeAgenda) {
      const filteredProgramRows = programRows.filter((row) => !row.key.startsWith("agenda"));
      const filteredGeneralRows = generalRows.filter((row) => !row.key.startsWith("agenda"));
      programRows = filteredProgramRows;
      generalRows = filteredGeneralRows;
    }

    // Store baseline for change detection
    this.baselineUnitRows = JSON.parse(JSON.stringify(unitInfoRows));
    this.baselineProgramRows = JSON.parse(JSON.stringify(programRows));
    this.baselineGeneralRows = JSON.parse(JSON.stringify(generalRows));

    // Store original rows for undo of auto-corrections (before correction)
    this.originalRowsBeforeCorrection = {
      unitRows: this.baselineUnitRows,
      programRows: this.baselineProgramRows,
      generalRows: this.baselineGeneralRows
    };

    // Apply auto-correction
    const {
      corrections,
      unitInfoRows: correctedUnitRows,
      programRows: correctedProgramRows,
      generalRows: correctedGeneralRows
    } = autoCorrectRows(unitInfoRows, programRows, generalRows);

    // Apply corrections
    this.unitRows = correctedUnitRows;
    this.programRows = correctedProgramRows;
    this.generalRows = correctedGeneralRows;

    // Update baseline after correction
    this.baselineUnitRows = JSON.parse(JSON.stringify(correctedUnitRows));
    this.baselineProgramRows = JSON.parse(JSON.stringify(correctedProgramRows));
    this.baselineGeneralRows = JSON.parse(JSON.stringify(correctedGeneralRows));

    // Set rowIdCounter to total number of rows to ensure new IDs are unique
    this.rowIdCounter = this.unitRows.length + this.programRows.length + this.generalRows.length;

    // Show corrections if any
    if (corrections.length > 0) {
      this.logAutoCorrectionDetails(corrections);
      this.showCorrectionsToast(corrections);
    }

    this.isDirty = false;
    this.render();
  }

  /**
   * Generate unique IDs for all rows and clear element map
   */
  generateRowIds() {
    this.rowIdCounter = 0;
    this.unitRows.forEach((row) => {
      row._id = `unit-${this.rowIdCounter++}`;
    });
    this.programRows.forEach((row) => {
      row._id = `program-${this.rowIdCounter++}`;
    });
    this.generalRows.forEach((row) => {
      row._id = `general-${this.rowIdCounter++}`;
    });
    this.rowElements.clear();
  }

  /**
   * Get combined row list with split markers for single-list rendering
   * Returns array of { row, section, isSplit } objects
   */
  getCombinedRows() {
    const combined = [];

    // Unit Info rows
    for (const row of this.unitRows) {
      combined.push({ row, section: "unit", isSplit: false });
    }

    // Split marker: program
    combined.push({
      row: { key: "split:program", value: "", _id: "split-program" },
      section: "program",
      isSplit: true
    });

    // Program rows
    for (const row of this.programRows) {
      combined.push({ row, section: "program", isSplit: false });
    }

    // Split marker: general
    combined.push({
      row: { key: "split:general", value: "", _id: "split-general" },
      section: "general",
      isSplit: true
    });

    // General rows
    for (const row of this.generalRows) {
      combined.push({ row, section: "general", isSplit: false });
    }

    return combined;
  }

  /**
   * Show toast for auto-corrections
   */
  // Incremental rendering helpers

  _getSectionBody(section) {
    // Map old section names to new tint class names
    const tintMap = { unitInfo: "unit", program: "program", general: "general" };
    const tintClass = tintMap[section] || section;
    return this.container.querySelector(`.cms-section-tint--${tintClass}`);
  }

  _getSectionRows(section) {
    switch (section) {
      case "unitInfo":
        return this.unitRows;
      case "program":
        return this.programRows;
      case "general":
        return this.generalRows;
      default:
        return [];
    }
  }

  _getSectionOptions(section) {
    switch (section) {
      case "unitInfo":
        return { locked: true, allowedKeys: UNIT_INFO_KEYS };
      case "program": {
        const allowed = this.options.includeAgenda
          ? PROGRAM_ALLOWED_KEYS
          : new Set([...PROGRAM_ALLOWED_KEYS].filter((k) => !k.startsWith("agenda")));
        return { locked: false, allowedKeys: allowed };
      }
      case "general":
        return { locked: false, allowedKeys: GENERAL_ALLOWED_KEYS };
      default:
        return { locked: false, allowedKeys: new Set() };
    }
  }

  _createRowElement(row, section) {
    const rows = this._getSectionRows(section);
    const index = rows.findIndex((r) => r._id === row._id);
    const options = this._getSectionOptions(section);
    const html = this.renderRow(row, index, section, options, rows);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return wrapper.firstElementChild;
  }

  _updateRowElement(rowEl, row) {
    const section = rowEl.dataset.section;
    const rows = this._getSectionRows(section);
    const index = rows.findIndex((r) => r._id === row._id);
    const options = this._getSectionOptions(section);
    const html = this.renderRow(row, index, section, options, rows);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const newEl = wrapper.firstElementChild;
    // Copy inner content and attributes to avoid creating nested .cms-row elements
    rowEl.innerHTML = newEl.innerHTML;
    Array.from(newEl.attributes).forEach((attr) => rowEl.setAttribute(attr.name, attr.value));
  }

  _refreshKeySelectsInSection(section) {
    const body = this._getSectionBody(section);
    if (!body) return;
    const selects = body.querySelectorAll(".cms-row__key-select");
    const rows = this._getSectionRows(section);
    const allowedKeysSet = this._getSectionOptions(section).allowedKeys;
    selects.forEach((select) => {
      const rowId = select.dataset.rowId;
      const row = rows.find((r) => r._id === rowId);
      if (!row) return;
      const allowedKeys = this.getAvailableKeysForSection(section, allowedKeysSet, row, rows);
      const current = select.value;
      select.innerHTML = allowedKeys
        .map((k) => `<option value='${k}'>${this.getFieldLabel(k)}</option>`)
        .join("");
      if (allowedKeys.includes(current)) {
        select.value = current;
      }
    });
  }

  _insertRow(row, section, index) {
    const body = this._getSectionBody(section);
    if (!body) return;
    let rowEl = this.rowElements.get(row._id);
    if (!rowEl) {
      rowEl = this._createRowElement(row, section);
      this.rowElements.set(row._id, rowEl);
    }

    if (rowEl.parentNode) {
      rowEl.parentNode.removeChild(rowEl);
    }

    const rowElements = Array.from(body.querySelectorAll(".cms-row"));
    if (index >= 0 && index < rowElements.length) {
      body.insertBefore(rowEl, rowElements[index]);
    } else {
      body.appendChild(rowEl);
    }
  }

  _moveRow(rowId, newIndex, newSection = null) {
    const rowEl = this.rowElements.get(rowId);
    if (!rowEl) return;

    const currentSection = rowEl.dataset.section;

    if (newSection && newSection !== currentSection) {
      this._deleteRow(rowId);
      const newRows = this._getSectionRows(newSection);
      const newRow = newRows.find((r) => r._id === rowId);
      if (newRow) {
        this._insertRow(newRow, newSection, newIndex);
      }
      return;
    }

    const body = this._getSectionBody(currentSection);
    if (!body) return;

    if (newIndex < 0) return;

    const row = this._getSectionRows(currentSection).find((item) => item._id === rowId);
    if (!row) return;

    this._insertRow(row, currentSection, newIndex);
  }

  _deleteRow(rowId) {
    const rowEl = this.rowElements.get(rowId);
    if (rowEl?.parentNode) {
      rowEl.parentNode.removeChild(rowEl);
    }
    this.rowElements.delete(rowId);
  }

  _refreshAllSectionKeySelects() {
    ["unitInfo", "program", "general"].forEach((section) =>
      this._refreshKeySelectsInSection(section)
    );
  }

  _refreshSectionRows(section) {
    const rows = this._getSectionRows(section);
    rows.forEach((row) => {
      const rowEl = this.rowElements.get(row._id);
      if (rowEl) {
        this._updateRowElement(rowEl, row);
      }
    });
  }

  _rebuildRowElements() {
    ["unitInfo", "program", "general"].forEach((section) => {
      const body = this._getSectionBody(section);
      if (!body) return;
      const rows = body.querySelectorAll(".cms-row");
      rows.forEach((rowEl) => {
        const rowId = rowEl.dataset.rowId;
        if (rowId) {
          this.rowElements.set(rowId, rowEl);
        }
      });
    });
  }

  /**
   * Print detailed correction context to the console when auto-corrections run.
   */
  logAutoCorrectionDetails(corrections) {
    const beforeProgram = (this.originalRowsBeforeCorrection?.programRows || []).map((row) =>
      normalizeCmsKeyType(row.key)
    );
    const afterProgram = this.programRows.map((row) => normalizeCmsKeyType(row.key));

    const beforePresidingIdx = beforeProgram.indexOf("presiding");
    const afterPresidingIdx = afterProgram.indexOf("presiding");
    const beforeClosingPrayerIdx = beforeProgram.indexOf("closingPrayer");
    const afterClosingPrayerIdx = afterProgram.indexOf("closingPrayer");

    console.groupCollapsed("[CmsEditor] Auto-corrections applied on initialize");
    console.log(
      "Corrections:",
      corrections.map((c) => ({ type: c.type, message: c.message }))
    );
    console.log("Program order before:", beforeProgram);
    console.log("Program order after:", afterProgram);
    console.log("Presiding index before -> after:", beforePresidingIdx, "->", afterPresidingIdx);
    console.log(
      "ClosingPrayer index before -> after:",
      beforeClosingPrayerIdx,
      "->",
      afterClosingPrayerIdx
    );
    console.groupEnd();
  }

  showCorrectionsToast(corrections) {
    // Create toast notification
    const toast = document.createElement("div");
    toast.className = "cms-editor__toast";
    toast.innerHTML = `
      <div class="cms-editor__toast-content">
        <strong>Auto-Corrections Applied:</strong>
        <ul>
          ${corrections.map((c) => `<li>${c.message}</li>`).join("")}
        </ul>
        <button class="cms-editor__toast-undo" data-action="undo-corrections">Undo</button>
      </div>
    `;

    // Add styles if not already present
    if (!document.querySelector("#cms-editor-styles")) {
      const style = document.createElement("style");
      style.id = "cms-editor-styles";
      style.textContent = `
        .cms-editor__toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--header-bg);
          color: white;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 1000;
          max-width: 300px;
        }
        .cms-editor__toast-content {
          font-size: 14px;
        }
        .cms-editor__toast-content ul {
          margin: 8px 0;
          padding-left: 20px;
        }
        .cms-editor__toast-undo {
          background: white;
          color: var(--header-bg);
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 8px;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 10000);

    // Handle undo
    const undoBtn = toast.querySelector("[data-action='undo-corrections']");
    if (undoBtn) {
      undoBtn.addEventListener("click", () => {
        this.undoLastCorrections();
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      });
    }
  }

  /**
   * Undo last auto-corrections
   */
  undoLastCorrections() {
    // If there are no stored original rows, nothing to undo
    if (!this.originalRowsBeforeCorrection) return;

    // Restore original rows (pre-correction state)
    const original = this.originalRowsBeforeCorrection;
    this.unitRows = JSON.parse(JSON.stringify(original.unitRows));
    this.programRows = JSON.parse(JSON.stringify(original.programRows));
    this.generalRows = JSON.parse(JSON.stringify(original.generalRows));

    // Clear stored original (undo is single-use)
    this.originalRowsBeforeCorrection = null;

    // Update baseline to match restored state (now baseline = current)
    this.baselineUnitRows = JSON.parse(JSON.stringify(this.unitRows));
    this.baselineProgramRows = JSON.parse(JSON.stringify(this.programRows));
    this.baselineGeneralRows = JSON.parse(JSON.stringify(this.generalRows));

    this.isDirty = true;
    this.refreshDirtyState();
    this.render();
  }

  /**
   * Render the full editor HTML
   */
  render() {
    // Full rebuild (used on initialize, undo, discard)
    this.rowElements.clear();
    this.container.innerHTML = this.renderHtml();
    this._rebuildRowElements();
    this.updateStatus();
  }

  /**
   * Render HTML for the editor
   */
  renderHtml() {
    let html = `
      <div class="cms-editor">
        <div class="cms-editor__list cms-editor__list--merged" aria-label="Program rows list">
    `;

    // Render Unit Info section
    html += `<div class="cms-split-marker cms-split-marker--unit"><span class="cms-split-marker__label">${translateStaticText("Unit Information")}</span></div>`;
    html += `<div class="cms-section-tint cms-section-tint--unit">`;
    for (const row of this.unitRows) {
      html += this.renderRow(
        row,
        this.unitRows.indexOf(row),
        "unitInfo",
        { locked: true, allowedKeys: UNIT_INFO_KEYS },
        this.unitRows
      );
    }
    html += `</div>`;

    // Render split:program marker (direct child of list)
    html += this.renderSplitMarker("program");

    // Render Program section
    html += `<div class="cms-section-tint cms-section-tint--program">`;
    html += this.renderRowsWithInsertButtons(this.programRows, "program", {
      locked: false,
      allowedKeys: PROGRAM_ALLOWED_KEYS
    });
    html += `</div>`;

    // Render split:general marker (direct child of list)
    html += this.renderSplitMarker("general");

    // Render General section
    html += `<div class="cms-section-tint cms-section-tint--general">`;
    html += this.renderRowsWithInsertButtons(this.generalRows, "general", {
      locked: false,
      allowedKeys: GENERAL_ALLOWED_KEYS
    });
    html += `</div>`;

    html += `
        </div>
        <div class="cms-editor__footer">
          <div class="cms-editor__status"></div>
          <button class="cms-editor__save-btn">Save</button>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Render an insert button between rows
   */
  renderInsertButton(index, section) {
    return `<button type="button" class="cms-insert-btn" data-insert-index="${index}" data-insert-section="${section}" title="Insert row here" aria-label="Insert row here"></button>`;
  }

  /**
   * Render editable rows with inline insert buttons after each row.
   */
  renderRowsWithInsertButtons(rows, section, options) {
    if (!rows || rows.length === 0) {
      return this.renderInsertButton(0, section);
    }

    const sectionMap = { unitInfo: "unitRows", program: "programRows", general: "generalRows" };
    const propertyName = sectionMap[section];
    const sectionRows = propertyName ? this[propertyName] : [];

    return rows
      .map((row, index) => {
        const rowHtml = this.renderRow(row, index, section, options, sectionRows);
        const insertHtml = this.renderInsertButton(index + 1, section);
        return `${rowHtml}${insertHtml}`;
      })
      .join("");
  }

  /**
   * Render a split marker bar
   */
  renderSplitMarker(type) {
    const label =
      type === "program"
        ? translateStaticText("Sacrament Meeting Program")
        : translateStaticText("General Information");

    // Add up/down action buttons for program and general splits (mobile)
    const actionsHtml =
      type === "program" || type === "general"
        ? `
      <div class="cms-split-marker__actions">
        <button type="button" class="cms-row__action-btn cms-split-marker__action-btn cms-split-marker__action--up"
                data-direction="up" aria-label="Move ${label} up">↑</button>
        <button type="button" class="cms-row__action-btn cms-split-marker__action-btn cms-split-marker__action--down"
                data-direction="down" aria-label="Move ${label} down">↓</button>
      </div>
    `
        : "";

    return `
      <div class="cms-split-marker cms-split-marker--${type}" data-split-key="split:${type}">
        <div class="cms-split-marker__handle">⋮⋮</div>
        <span class="cms-split-marker__label">${label}</span>
        ${actionsHtml}
      </div>
    `;
  }

  /**
   * Render rows for a section
   */
  renderRows(rows, section, options) {
    if (!rows || rows.length === 0) return "";

    // Map section names to property names
    const propertyMap = { unitInfo: "unitRows", program: "programRows", general: "generalRows" };
    const propertyName = propertyMap[section];
    const sectionRows = propertyName ? this[propertyName] : [];
    return rows
      .map((row, index) => {
        return this.renderRow(row, index, section, options, sectionRows);
      })
      .join("");
  }

  /**
   * Render a single row
   */
  renderRow(row, index, section, options, sectionRows) {
    const key = row.key;
    const value = parseFieldValue(key, row.value);
    const definition = getFieldDefinition(key);
    const normalizedKey = normalizeCmsKeyType(key);
    const isRepeatable = isRepeatableKeyType(normalizedKey);
    const maxItems = getMaxRepeatableItems(normalizedKey);
    const isUserTranslated = USER_TRANSLATED_KEYS.has(normalizedKey);
    const isLanguageIndependent = LANGUAGE_INDEPENDENT_KEYS.has(normalizedKey);

    // Agenda pill indicator
    const isAgendaKey = normalizedKey.startsWith("agenda");
    const agendaPill = isAgendaKey
      ? `<span class="cms-row__agenda-pill" title="Agenda item">🔒 Agenda</span>`
      : "";

    // Key selector (dropdown)
    let keySelector = "";
    if (options.locked) {
      // Locked section - show readonly display
      keySelector = `<span class="cms-row__key-label">${this.getFieldLabel(normalizedKey)}</span>`;
    } else {
      // Editable section - show dropdown
      const allowedKeys = this.getAvailableKeysForSection(
        section,
        options.allowedKeys,
        row,
        sectionRows
      );
      keySelector = `
        <select class="cms-row__key-select" data-row-id="${row._id}" data-section="${section}">
          ${allowedKeys
            .map((k) => {
              const label = this.getFieldLabel(k);
              const isAgenda = k.startsWith("agenda");
              return `<option value="${k}" ${k === normalizedKey ? "selected" : ""}>${isAgenda ? "🔒 " : ""}${label}</option>`;
            })
            .join("")}
        </select>
      `;
    }

    // Field inputs
    const fieldInputs = this.renderFieldInputs(
      key,
      value,
      definition,
      isUserTranslated,
      isLanguageIndependent
    );

    // Actions (move up/down, delete)
    let actions = "";
    if (!options.locked) {
      const sectionMap = { unitInfo: "unitRows", program: "programRows", general: "generalRows" };
      const propertyName = sectionMap[section];
      const sectionRows = propertyName ? this[propertyName] : [];
      let canMoveUp = index > 0;
      let canMoveDown = index < sectionRows.length - 1;
      const canDelete = !REQUIRED_PROGRAM_KEYS.includes(normalizedKey);

      actions = `
        <div class="cms-row__actions">
          <button type="button" class="cms-row__action-btn cms-row__action--move-up" 
                  data-row-id="${row._id}" data-section="${section}" data-direction="up"
                  ${!canMoveUp ? "disabled" : ""}>↑</button>
          <button type="button" class="cms-row__action-btn cms-row__action--move-down" 
                  data-row-id="${row._id}" data-section="${section}" data-direction="down"
                  ${!canMoveDown ? "disabled" : ""}>↓</button>
          ${
            canDelete
              ? `<button type="button" class="cms-row__action-btn cms-row__action--delete" 
                  data-row-id="${row._id}" data-section="${section}">✕</button>`
              : ""
          }
        </div>
      `;
    }

    return `
      <div class="cms-row" data-row-id="${row._id}" data-section="${section}">
        <div class="cms-row__header">
          ${keySelector}
          ${agendaPill}
          ${actions}
        </div>
        <div class="cms-row__fields">
          ${fieldInputs}
        </div>
      </div>
    `;
  }

  /**
   * Render field inputs for a row
   */
  renderFieldInputs(key, value, definition, isUserTranslated, isLanguageIndependent) {
    const normalizedKey = normalizeCmsKeyType(key);

    // Get the appropriate locale columns to show
    let localeColumns = ["en"];
    if (isUserTranslated) {
      localeColumns = ["en", "es", "fr", "swa"];
    }

    let html = "";

    if (normalizedKey === "generalStatementWithLink") {
      const textLabel = this.getFieldLabel(normalizedKey);
      const urlLabel = t("cms.input.url");

      for (const locale of LINK_WITH_SPACE_LOCALES) {
        const suffix = locale === "en" ? "" : `_${locale}`;
        const isEnglish = locale === "en";
        const textValue = value[`text${suffix}`] || "";
        const urlValue = value[`url${suffix}`] || "";

        html += `
          <div class="cms-locale-group">
            <div class="cms-field cms-field--textarea">
              <label class="cms-field__label">${locale.toUpperCase()}: ${textLabel}</label>
              <textarea class="cms-field__input" maxlength="5000"
                        data-key="${key}" data-part="text" data-locale="${locale}" ${isEnglish ? "required" : ""}>${escapeHtml(textValue)}</textarea>
            </div>
            <div class="cms-field cms-field--text">
              <label class="cms-field__label">${locale.toUpperCase()}: ${urlLabel}</label>
              <input type="text" class="cms-field__input" maxlength="1000"
                     data-key="${key}" data-part="url" data-locale="${locale}"
                     value="${escapeHtml(urlValue)}" ${isEnglish ? "required" : ""}>
            </div>
          </div>
        `;
      }

      const helperKey = "cms.helper.enRequiredLocaleFallback";
      const helperText = t(helperKey);
      const resolvedHelperText =
        helperText === helperKey
          ? "EN required; ES/FR/SWA fall back to EN when blank."
          : helperText;

      html += `<p class="cms-field__helper">${escapeHtml(resolvedHelperText)}</p>`;
      return html;
    }

    if (normalizedKey === "linkWithSpace") {
      const localeLabel = t("cms.input.displayText");
      const urlLabel = t("cms.input.url");
      const imageUrlLabel = t("cms.input.imageUrl");

      for (const locale of LINK_WITH_SPACE_LOCALES) {
        const suffix = locale === "en" ? "" : `_${locale}`;
        const isEnglish = locale === "en";
        const textValue = value[`text${suffix}`] || "";
        const urlValue = value[`url${suffix}`] || "";
        const imageUrlValue = value[`imageUrl${suffix}`] || "";

        html += `
          <div class="cms-locale-group">
            <div class="cms-field cms-field--text">
              <label class="cms-field__label">${locale.toUpperCase()}: ${localeLabel}</label>
              <input type="text" class="cms-field__input" maxlength="1000"
                     data-key="${key}" data-part="text" data-locale="${locale}"
                     value="${escapeHtml(textValue)}" ${isEnglish ? "required" : ""}>
            </div>
            <div class="cms-field cms-field--text">
              <label class="cms-field__label">${locale.toUpperCase()}: ${urlLabel}</label>
              <input type="text" class="cms-field__input" maxlength="1000"
                     data-key="${key}" data-part="url" data-locale="${locale}"
                     value="${escapeHtml(urlValue)}" ${isEnglish ? "required" : ""}>
            </div>
            <div class="cms-field cms-field--text">
              <label class="cms-field__label">${locale.toUpperCase()}: ${imageUrlLabel}</label>
              <input type="text" class="cms-field__input" maxlength="1000"
                     data-key="${key}" data-part="imageUrl" data-locale="${locale}"
                     value="${escapeHtml(imageUrlValue)}" ${isEnglish ? "required" : ""}>
            </div>
          </div>
        `;
      }

      html += `<p class="cms-field__helper">EN is required. ES/FR/SWA fall back to EN when blank.</p>`;
      return html;
    }

    if (LESSON_TRANSLATED_KEYS.has(normalizedKey)) {
      const nameLabel = "Name for Lesson";
      const linkLabel = "Link to Lesson";

      for (const locale of LINK_WITH_SPACE_LOCALES) {
        const suffix = locale === "en" ? "" : `_${locale}`;
        const isEnglish = locale === "en";
        const textValue = value[`text${suffix}`] || "";
        const urlValue = value[`url${suffix}`] || "";

        html += `
          <div class="cms-locale-group cms-locale-group--lesson">
            <div class="cms-locale-group__title">${locale.toUpperCase()}</div>
            <div class="cms-locale-group__fields cms-locale-group__fields--two-up">
              <div class="cms-field cms-field--text">
                <label class="cms-field__label">${nameLabel}</label>
                <input type="text" class="cms-field__input" maxlength="1000"
                       data-key="${key}" data-part="text" data-locale="${locale}"
                       value="${escapeHtml(textValue)}" ${isEnglish ? "required" : ""}>
              </div>
              <div class="cms-field cms-field--text">
                <label class="cms-field__label">${linkLabel}</label>
                <input type="text" class="cms-field__input" maxlength="1000"
                       data-key="${key}" data-part="url" data-locale="${locale}"
                       value="${escapeHtml(urlValue)}" ${isEnglish ? "required" : ""}>
              </div>
            </div>
          </div>
        `;
      }

      const helperKey = "cms.helper.enRequiredLocaleFallback";
      const helperText = t(helperKey);
      const resolvedHelperText =
        helperText === helperKey
          ? "EN required; ES/FR/SWA optional. Blank optional locales will use EN."
          : helperText;

      html += `<p class="cms-field__helper">${escapeHtml(resolvedHelperText)}</p>`;
      return html;
    }

    if (normalizedKey === "photo") {
      const linkLabel = "Photo with Link";
      const captionLabel = "Optional Caption";

      for (const locale of LINK_WITH_SPACE_LOCALES) {
        const suffix = locale === "en" ? "" : `_${locale}`;
        const isEnglish = locale === "en";
        const urlValue = value[`url${suffix}`] || "";
        const captionValue = value[`caption${suffix}`] || "";

        html += `
          <div class="cms-locale-group cms-locale-group--lesson">
            <div class="cms-locale-group__title">${locale.toUpperCase()}</div>
            <div class="cms-locale-group__fields cms-locale-group__fields--two-up">
              <div class="cms-field cms-field--text">
                <label class="cms-field__label">${linkLabel}</label>
                <input type="text" class="cms-field__input" maxlength="1000"
                       data-key="${key}" data-part="url" data-locale="${locale}"
                       value="${escapeHtml(urlValue)}" ${isEnglish ? "required" : ""}>
              </div>
              <div class="cms-field cms-field--text">
                <label class="cms-field__label">${captionLabel}</label>
                <input type="text" class="cms-field__input" maxlength="1000"
                       data-key="${key}" data-part="caption" data-locale="${locale}"
                       value="${escapeHtml(captionValue)}">
              </div>
            </div>
          </div>
        `;
      }

      const helperKey = "cms.helper.enRequiredLocaleFallback";
      const helperText = t(helperKey);
      const resolvedHelperText =
        helperText === helperKey
          ? "EN required; ES/FR/SWA optional. Blank optional locales will use EN."
          : helperText;

      html += `<p class="cms-field__helper">${escapeHtml(resolvedHelperText)}</p>`;
      return html;
    }

    if (REQUIRED_ENGLISH_TEXT_KEYS.has(normalizedKey)) {
      const textField = definition.fields.find((field) => field.name === "text");
      const sharedFields = definition.fields.filter((field) => field.name !== "text");
      const textFieldLabel = textField?.label
        ? translateStaticText(textField.label)
        : this.getFieldLabel(normalizedKey);

      for (const locale of localeColumns) {
        const localeValue = locale === "en" ? value.text || "" : value[`text_${locale}`] || "";
        const isRequiredEnglish = locale === "en";

        html += `<div class="cms-locale-group">`;

        if (textField?.type === "textarea") {
          html += `
            <div class="cms-field cms-field--textarea">
              <label class="cms-field__label">${locale.toUpperCase()}: ${textFieldLabel}</label>
              <textarea class="cms-field__input" maxlength="5000"
                        data-key="${key}" data-part="text" data-locale="${locale}" ${isRequiredEnglish ? "required" : ""}>${escapeHtml(localeValue)}</textarea>
            </div>
          `;
        } else {
          html += `
            <div class="cms-field cms-field--text">
              <label class="cms-field__label">${locale.toUpperCase()}: ${textFieldLabel}</label>
              <input type="text" class="cms-field__input" maxlength="1000"
                     data-key="${key}" data-part="text" data-locale="${locale}"
                     value="${escapeHtml(localeValue)}" ${isRequiredEnglish ? "required" : ""}>
            </div>
          `;
        }

        html += `</div>`;
      }

      for (const field of sharedFields) {
        const fieldLabel = field.label
          ? translateStaticText(field.label)
          : this.getFieldLabel(normalizedKey);
        html += `
          <div class="cms-field cms-field--text">
            <label class="cms-field__label">${fieldLabel}</label>
            <input type="text" class="cms-field__input" maxlength="1000"
                   data-key="${key}" data-part="${field.name}" data-locale="en"
                   value="${escapeHtml(value[field.name] || "")}">
          </div>
        `;
      }

      const helperKey = "cms.helper.enRequiredLocaleFallback";
      const helperText = t(helperKey);
      const resolvedHelperText =
        helperText === helperKey
          ? "EN required; ES/FR/SWA optional. Blank optional locales will use EN."
          : helperText;

      html += `<p class="cms-field__helper">${escapeHtml(resolvedHelperText)}</p>`;
      return html;
    }

    for (const field of definition.fields) {
      const isRequiredLeaderField =
        normalizedKey === "leader" && ["name", "calling", "phone"].includes(field.name);

      if (field.type === "date") {
        // Date field
        const isoValue = parseDisplayDate(value.text);
        html += `
          <div class="cms-field cms-field--date">
            <label class="cms-field__label">${this.getFieldLabel(normalizedKey)}</label>
            <input type="date" class="cms-field__input" value="${isoValue}" 
                   data-key="${key}" data-part="text" data-locale="en">
          </div>
        `;
      } else if (field.type === "checkbox") {
        // Checkbox field
        html += `
          <div class="cms-field cms-field--checkbox">
            <label class="cms-field__label">
              <input type="checkbox" class="cms-field__input" 
                     data-key="${key}" data-part="${field.name}" data-locale="en"
                     ${value[field.name] ? "checked" : ""}>
              ${translateStaticText(field.label)}
            </label>
          </div>
        `;
      } else if (field.type === "textarea") {
        // Textarea field
        if (isUserTranslated) {
          // Show all locale columns
          for (const locale of localeColumns) {
            const localeValue =
              locale === "en" ? value[field.name] || "" : value[`${field.name}_${locale}`] || "";
            const isRequiredEnglish =
              field.name === "text" &&
              locale === "en" &&
              REQUIRED_ENGLISH_TEXT_KEYS.has(normalizedKey);
            html += `
              <div class="cms-field cms-field--textarea">
                <label class="cms-field__label">${locale.toUpperCase()}: ${this.getFieldLabel(normalizedKey)}</label>
                <textarea class="cms-field__input" maxlength="5000" 
                          data-key="${key}" data-part="${field.name}" data-locale="${locale}" ${isRequiredEnglish ? "required" : ""}>${escapeHtml(localeValue)}</textarea>
              </div>
            `;
          }
        } else {
          // Single field
          html += `
            <div class="cms-field cms-field--textarea">
              <label class="cms-field__label">${this.getFieldLabel(normalizedKey)}</label>
              <textarea class="cms-field__input" maxlength="5000" 
                        data-key="${key}" data-part="${field.name}" data-locale="en">${escapeHtml(value[field.name] || "")}</textarea>
            </div>
          `;
        }
      } else if (field.type === "hymn") {
        // Hymn number dropdown
        const hymnOptions = getHymnOptions();
        html += `
          <div class="cms-field cms-field--hymn">
            <label class="cms-field__label">${this.getFieldLabel(normalizedKey)}</label>
            <select class="cms-field__input cms-field__hymn-select" 
                    data-key="${key}" data-part="${field.name}" data-locale="en">
              <option value="">Select Hymn...</option>
              ${hymnOptions.map((opt) => `<option value="${opt.value}" ${opt.value === value[field.name] ? "selected" : ""}>${opt.title}</option>`).join("")}
            </select>
          </div>
        `;
      } else if (isUserTranslated) {
        // Show all locale columns
        const fieldLabel = field.label
          ? translateStaticText(field.label)
          : this.getFieldLabel(normalizedKey);
        for (const locale of localeColumns) {
          const localeValue =
            locale === "en" ? value[field.name] || "" : value[`${field.name}_${locale}`] || "";
          const isRequiredEnglish =
            locale === "en" &&
            ((field.name === "text" && REQUIRED_ENGLISH_TEXT_KEYS.has(normalizedKey)) ||
              (REQUIRED_ENGLISH_TEXT_AND_URL_KEYS.has(normalizedKey) &&
                ["text", "url"].includes(field.name)));
          html += `
            <div class="cms-field cms-field--text">
              <label class="cms-field__label">${locale.toUpperCase()}: ${fieldLabel}</label>
              <input type="text" class="cms-field__input" maxlength="1000" 
                     data-key="${key}" data-part="${field.name}" data-locale="${locale}" 
                     value="${escapeHtml(localeValue)}" ${isRequiredEnglish || isRequiredLeaderField ? "required" : ""}>
            </div>
          `;
        }
      } else {
        // Single field
        const fieldLabel = field.label
          ? translateStaticText(field.label)
          : this.getFieldLabel(normalizedKey);
        html += `
          <div class="cms-field cms-field--text">
            <label class="cms-field__label">${fieldLabel}</label>
            <input type="text" class="cms-field__input" maxlength="1000" 
                   data-key="${key}" data-part="${field.name}" data-locale="en" 
                   value="${escapeHtml(value[field.name] || "")}" ${isRequiredLeaderField ? "required" : ""}>
          </div>
        `;
      }
    }

    if (
      isUserTranslated &&
      (REQUIRED_ENGLISH_TEXT_KEYS.has(normalizedKey) ||
        REQUIRED_ENGLISH_TEXT_AND_URL_KEYS.has(normalizedKey))
    ) {
      const helperKey = "cms.helper.enRequiredLocaleFallback";
      const helperText = t(helperKey);
      const resolvedHelperText =
        helperText === helperKey
          ? "EN required; ES/FR/SWA optional. Blank optional locales will use EN."
          : helperText;

      html += `<p class="cms-field__helper">${escapeHtml(resolvedHelperText)}</p>`;
    }

    return html;
  }

  /**
   * Get available keys for a section
   */
  getAvailableKeysForSection(section, allowedKeys, currentRow, sectionRows) {
    const normalizedKey = normalizeCmsKeyType(currentRow.key);
    const existingKeys = sectionRows.map((row) => normalizeCmsKeyType(row.key));

    // Include universal keys in all sections
    const allAllowed = new Set([...allowedKeys, ...UNIVERSAL_KEYS]);

    // Filter allowed keys
    const available = Array.from(allAllowed).filter((key) => {
      // Skip current key
      if (key === normalizedKey) return true;

      // Skip non-repeatable keys that already exist
      if (!isRepeatableKeyType(key) && existingKeys.includes(key)) {
        return false;
      }

      // Skip if at max repeatable limit
      if (
        isRepeatableKeyType(key) &&
        existingKeys.filter((k) => k === key).length >= getMaxRepeatableItems(key)
      ) {
        return false;
      }

      return true;
    });

    return available;
  }

  /**
   * Get field label for a key
   */
  getFieldLabel(key) {
    const translationKeys = {
      unitName: "cms.label.unitName",
      stakeName: "cms.label.stakeName",
      unitAddress: "cms.label.unitAddress",
      date: "cms.label.date",
      presiding: "cms.label.presiding",
      conducting: "cms.label.conducting",
      musicDirector: "cms.label.musicDirector",
      musicOrganist: "cms.label.musicOrganist",
      openingHymn: "cms.label.openingHymn",
      openingPrayer: "cms.label.openingPrayer",
      sacramentHymn: "cms.label.sacramentHymn",
      closingHymn: "cms.label.closingHymn",
      closingPrayer: "cms.label.closingPrayer",
      speaker: "cms.label.speaker",
      leader: "cms.label.leader",
      hymn: "cms.label.hymn",
      intermediateHymn: "cms.label.intermediateHymn",
      horizontalLine: "cms.label.horizontalLine",
      sacramentLine: "cms.label.sacramentLine",
      oilLamp: "cms.label.oilLamp",
      generalStatement: "cms.label.generalStatement",
      generalStatementWithLink: "cms.label.generalStatementWithLink",
      link: "cms.label.link",
      linkWithSpace: "cms.label.linkWithSpace",
      photo: "cms.label.photo",
      migrationUrl: "cms.label.migrationUrl",
      obsolete: "cms.label.obsolete",
      lessonEQRS: "cms.label.lessonEQRS",
      lessonSundaySchool: "cms.label.lessonSundaySchool",
      lessonYouth: "cms.label.lessonYouth",
      lessonPrimary: "cms.label.lessonPrimary",
      agendaGeneral: "cms.label.agendaGeneral",
      agendaAnnouncements: "cms.label.agendaAnnouncements",
      agendaAckVisitingLeaders: "cms.label.agendaAckVisitingLeaders",
      agendaBusinessStake: "cms.label.agendaBusinessStake",
      agendaBusinessReleases: "cms.label.agendaBusinessReleases",
      agendaBusinessCallings: "cms.label.agendaBusinessCallings",
      agendaBusinessPriesthood: "cms.label.agendaBusinessPriesthood",
      agendaBusinessNewMoveIns: "cms.label.agendaBusinessNewMoveIns",
      agendaBusinessNewConverts: "cms.label.agendaBusinessNewConverts",
      agendaBusinessGeneral: "cms.label.agendaBusinessGeneral"
    };

    const translationKey = translationKeys[key] || key;
    return t(translationKey) || translationKey || key;
  }

  /**
   * Setup event delegation once
   */
  _setupEventDelegation() {
    this.container.addEventListener("click", (e) => {
      const target = e.target;
      // Add row button
      if (target.matches(".cms-editor__add-btn")) {
        const section = target.dataset.section;
        this.handleAddRow({ target, currentTarget: target, ...e });
        return;
      }
      // Action buttons (move/delete)
      if (target.matches(".cms-row__action-btn")) {
        this.handleActionClick({ target, currentTarget: target, ...e });
        return;
      }
      // Token insertion
      if (target.matches(".cms-field__token-btn")) {
        this.handleTokenInsert({ target, currentTarget: target, ...e });
        return;
      }
      // Split marker action buttons (mobile up/down)
      if (target.matches(".cms-split-marker__action-btn")) {
        this.handleSplitMarkerAction({ target, currentTarget: target, ...e });
        return;
      }
      // Save button
      if (target.matches(".cms-editor__save-btn")) {
        this.handleSave();
        return;
      }
      // Toast undo
      if (target.matches(".cms-editor__toast-undo")) {
        this.undoLastCorrections();
        return;
      }
      // Insert button between rows
      if (target.matches(".cms-insert-btn")) {
        this.handleInsertRow(target);
        return;
      }
      // Modal buttons are attached when modal is created (outside container)
    });

    // Pointer events for split marker dragging
    this.container.addEventListener("pointerdown", (e) => {
      const marker = e.target.closest(".cms-split-marker");
      if (marker) {
        this._splitPointerDown(e, marker);
      }
    });

    this.container.addEventListener("pointermove", (e) => {
      if (this._dragState.isDragging) {
        this._splitPointerMove(e);
      }
    });

    this.container.addEventListener("pointerup", (e) => {
      if (this._dragState.isDragging || this._dragState.longPressTimer) {
        this._splitPointerUp(e);
      }
    });

    this.container.addEventListener("pointercancel", (e) => {
      if (this._dragState.isDragging || this._dragState.longPressTimer) {
        this._splitPointerUp(e);
      }
    });

    this.container.addEventListener("change", (e) => {
      const target = e.target;
      if (target.matches(".cms-row__key-select")) {
        this.handleKeyChange({ target, currentTarget: target, ...e });
      }
    });

    this.container.addEventListener("input", (e) => {
      const target = e.target;
      if (target.matches(".cms-field__input")) {
        this.handleFieldChange({ target, currentTarget: target, ...e });
      }
    });
  }

  /**
   * Handle insert button click - show add row modal for the target section
   */
  handleInsertRow(btn) {
    const section = btn.dataset.insertSection;
    const index = parseInt(btn.dataset.insertIndex, 10);

    // Map insert section to modal section
    const sectionMap = { unit: "unitInfo", program: "program", general: "general" };
    const modalSection = sectionMap[section] || "program";

    this.showAddRowModal(modalSection, index);
  }

  /**
   * Pointer down on split marker handle
   */
  _splitPointerDown(event, marker) {
    // Ignore if clicking on split marker action buttons
    if (event.target.closest(".cms-split-marker__action-btn")) {
      return;
    }
    event.preventDefault();
    if (!marker) return;

    const splitKey = marker.dataset.splitKey;
    const isTouch = event.pointerType === "touch";

    if (isTouch) {
      // Mobile: start long-press timer
      this._dragState.longPressTimer = setTimeout(() => {
        this._dragState.longPressTimer = null;
        this._startDrag(marker, splitKey, event);
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(15);
        }
      }, 300);
    } else {
      // Desktop: start drag immediately
      this._startDrag(marker, splitKey, event);
    }
  }

  /**
   * Start dragging a split marker
   */
  _startDrag(marker, splitKey, event) {
    this._dragState.isDragging = true;
    this._dragState.splitKey = splitKey;
    this._dragState.startY = event.clientY;
    this._dragState.currentY = event.clientY;
    this._dragState.proposedIndex = null;
    this._dragState.draggedMarker = marker;

    marker.classList.add("is-dragging");
    marker.setPointerCapture(event.pointerId);
    this._renderSplitDropPreview(event.clientY);
  }

  /**
   * Pointer move during drag
   */
  _splitPointerMove(event) {
    if (!this._dragState.isDragging) return;
    const targetBoundary = this._getBoundaryInsertionIndex(event.clientY);
    this._dragState.currentY = event.clientY;
    this._dragState.proposedIndex = targetBoundary;
    this._renderSplitDropPreview(event.clientY);
  }

  /**
   * Pointer up - end drag and commit changes
   */
  _splitPointerUp(event) {
    // Clear long-press timer if active
    if (this._dragState.longPressTimer) {
      clearTimeout(this._dragState.longPressTimer);
      this._dragState.longPressTimer = null;
      return;
    }

    if (!this._dragState.isDragging) return;

    const { splitKey, proposedIndex } = this._dragState;
    const marker = this._dragState.draggedMarker;

    if (splitKey) {
      this._applySplitBoundaryMove(splitKey, proposedIndex);
    }

    this._clearSplitDropPreview();

    // Cleanup
    if (marker) {
      marker.classList.remove("is-dragging");
    }

    this._dragState.isDragging = false;
    this._dragState.splitKey = null;
    this._dragState.draggedMarker = null;
    this._dragState.proposedIndex = null;
  }

  /**
   * Render a visual drop line between rows for split marker drag.
   */
  _renderSplitDropPreview(clientY) {
    const list = this.container.querySelector(".cms-editor__list");
    if (!list) return;

    const rowEls = Array.from(list.querySelectorAll(".cms-row"));
    if (rowEls.length === 0) {
      this._clearSplitDropPreview();
      return;
    }

    const insertionIndex = this._getBoundaryInsertionIndex(clientY);
    const splitKey = this._dragState.splitKey;
    const currentProgramBoundary = this.unitRows.length;
    const currentGeneralBoundary = this.unitRows.length + this.programRows.length;
    const clampedIndex =
      splitKey === "split:program"
        ? Math.max(currentProgramBoundary, Math.min(insertionIndex, currentGeneralBoundary))
        : insertionIndex;
    let preview = list.querySelector(".cms-drop-preview.cms-drop-preview--split");
    if (!preview) {
      preview = document.createElement("div");
      preview.className = "cms-drop-preview cms-drop-preview--split";
      preview.setAttribute("aria-hidden", "true");
    }

    if (preview.parentNode) {
      preview.parentNode.removeChild(preview);
    }

    if (clampedIndex <= 0) {
      rowEls[0].before(preview);
      return;
    }

    if (clampedIndex >= rowEls.length) {
      rowEls[rowEls.length - 1].after(preview);
      return;
    }

    rowEls[clampedIndex].before(preview);
  }

  /**
   * Remove split drag drop preview line.
   */
  _clearSplitDropPreview() {
    const preview = this.container.querySelector(".cms-drop-preview.cms-drop-preview--split");
    if (preview && preview.parentNode) {
      preview.parentNode.removeChild(preview);
    }
  }

  /**
   * Compute insertion index in the flat row order for the current cursor Y
   */
  _getBoundaryInsertionIndex(clientY) {
    const rowEls = Array.from(this.container.querySelectorAll(".cms-editor__list .cms-row"));
    if (rowEls.length === 0) return 0;

    for (let i = 0; i < rowEls.length; i++) {
      const rect = rowEls[i].getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (clientY < midpoint) {
        return i;
      }
    }

    return rowEls.length;
  }

  /**
   * Apply a split move by re-partitioning the flat row list using new boundaries
   */
  _applySplitBoundaryMove(splitKey, targetIndex) {
    const flatRows = [...this.unitRows, ...this.programRows, ...this.generalRows];
    if (flatRows.length === 0) return;

    const currentProgramBoundary = this.unitRows.length;
    const currentGeneralBoundary = this.unitRows.length + this.programRows.length;
    const fallbackIndex =
      splitKey === "split:program" ? currentProgramBoundary : currentGeneralBoundary;

    let boundaryIndex = Number.isInteger(targetIndex) ? targetIndex : fallbackIndex;

    if (splitKey === "split:program") {
      boundaryIndex = Math.max(
        currentProgramBoundary,
        Math.min(boundaryIndex, currentGeneralBoundary)
      );
      const nextProgramBoundary = boundaryIndex;
      const nextGeneralBoundary = currentGeneralBoundary;

      this.unitRows = flatRows.slice(0, nextProgramBoundary);
      this.programRows = flatRows.slice(nextProgramBoundary, nextGeneralBoundary);
      this.generalRows = flatRows.slice(nextGeneralBoundary);
    } else if (splitKey === "split:general") {
      const closingPrayerIndex = flatRows.findIndex(
        (row) => normalizeCmsKeyType(row.key) === "closingPrayer"
      );
      const minGeneralBoundary =
        closingPrayerIndex >= 0
          ? Math.max(currentProgramBoundary, closingPrayerIndex + 1)
          : currentProgramBoundary;

      boundaryIndex = Math.max(minGeneralBoundary, Math.min(boundaryIndex, flatRows.length));
      const nextProgramBoundary = currentProgramBoundary;
      const nextGeneralBoundary = boundaryIndex;

      this.unitRows = flatRows.slice(0, nextProgramBoundary);
      this.programRows = flatRows.slice(nextProgramBoundary, nextGeneralBoundary);
      this.generalRows = flatRows.slice(nextGeneralBoundary);
    } else {
      return;
    }

    // Keep required program anchors in program and keep closingPrayer at the end.
    const closingPrayerInProgramIdx = this.programRows.findIndex(
      (row) => normalizeCmsKeyType(row.key) === "closingPrayer"
    );
    if (closingPrayerInProgramIdx === -1) {
      const closingPrayerInGeneralIdx = this.generalRows.findIndex(
        (row) => normalizeCmsKeyType(row.key) === "closingPrayer"
      );
      if (closingPrayerInGeneralIdx !== -1) {
        const [closingPrayerRow] = this.generalRows.splice(closingPrayerInGeneralIdx, 1);
        this.programRows.push(closingPrayerRow);
      }
    } else if (closingPrayerInProgramIdx !== this.programRows.length - 1) {
      const [closingPrayerRow] = this.programRows.splice(closingPrayerInProgramIdx, 1);
      this.programRows.push(closingPrayerRow);
    }

    this.generateRowIds();
    this.isDirty = true;
    this.refreshDirtyState();
    this.render();
  }

  /**
   * Handle key change in dropdown
   */
  handleKeyChange(event) {
    const select = event.target;
    const newRowId = select.dataset.rowId;
    const newKey = select.value;
    const section = select.dataset.section;

    // Map section names to property names
    const sectionMap = { unitInfo: "unitRows", program: "programRows", general: "generalRows" };
    const propertyName = sectionMap[section];
    if (!propertyName) return;

    const rows = this[propertyName];
    const row = rows.find((r) => r._id === newRowId);
    if (!row) return;

    // Validate key change
    const normalizedOldKey = normalizeCmsKeyType(row.key);
    if (!this.isKeyAllowedInSection(newKey, section)) {
      // Revert to old key
      select.value = normalizedOldKey;
      this.showToast(`Key "${newKey}" is not allowed in this section`, "error");
      return;
    }

    // Check for duplicate non-repeatable keys
    if (!isRepeatableKeyType(newKey)) {
      const duplicateRows = rows.filter(
        (r) => r._id !== newRowId && normalizeCmsKeyType(r.key) === newKey
      );
      if (duplicateRows.length > 0) {
        // Revert to old key
        select.value = normalizedOldKey;
        this.showToast(`Key "${newKey}" already exists in this section`, "error");
        return;
      }
    }

    // Update row key
    row.key = newKey;
    row.value = ""; // Reset value for new key type
    this.isDirty = true;
    this.refreshDirtyState();

    // Incremental update: re-render this row and refresh key selects
    const rowEl = this.rowElements.get(row._id);
    if (rowEl) {
      this._updateRowElement(rowEl, row);
    }
    this._refreshKeySelectsInSection(section);
  }

  /**
   * Handle field value change
   */
  handleFieldChange(event) {
    const input = event.target;
    const key = input.dataset.key;
    const part = input.dataset.part;
    const locale = input.dataset.locale;
    const section = input.closest(".cms-row")?.dataset.section;
    const rowId = input.closest(".cms-row")?.dataset.rowId;

    // Map section names to property names
    const sectionMap = { unitInfo: "unitRows", program: "programRows", general: "generalRows" };
    const propertyName = sectionMap[section];
    if (!propertyName) return;

    const rows = this[propertyName];

    const row = rows.find((r) => r._id === rowId);
    if (!row) return;

    // Parse current value
    const value = parseFieldValue(key, row.value);

    // Update the field value
    let inputValue = input.value;

    // Convert date picker ISO value to display format
    if (input.type === "date" && inputValue) {
      inputValue = formatDisplayDate(inputValue);
    }

    if (locale !== "en") {
      // For non-English locales, store as separate field
      value[`${part}_${locale}`] = inputValue;
    } else {
      value[part] = inputValue;
    }

    // Serialize back to value string
    row.value = serializeFieldValue(key, value);

    // URL validation for url/imageUrl on change event (blur)
    if (event.type === "change" && (part === "url" || part === "imageUrl")) {
      if (inputValue && !isSafeUrl(inputValue)) {
        this.showToast(`Invalid URL: ${inputValue}`, "warning");
      }
    }

    this.isDirty = true;
    this.refreshDirtyState();
  }

  /**
   * Handle add row button click
   */
  handleAddRow(event) {
    const btn = event.target;
    const section = btn.dataset.section;

    // Show key selection modal
    this.showAddRowModal(section);
  }

  /**
   * Show modal to select key for new row
   * @param {string} section - Section name (unitInfo, program, general)
   * @param {number} [insertIndex] - Optional index to insert at (for inline insert buttons)
   */
  showAddRowModal(section, insertIndex = null) {
    const modal = document.createElement("div");
    modal.className = "cms-modal";
    modal.innerHTML = `
      <div class="cms-modal__overlay"></div>
      <div class="cms-modal__content">
        <h3>Add New Row</h3>
        <select class="cms-modal__key-select" id="add-row-key-select">
          <option value="">Select a key...</option>
        </select>
        <div class="cms-modal__actions">
          <button class="cms-modal__cancel-btn">Cancel</button>
          <button class="cms-modal__confirm-btn" disabled>Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const select = modal.querySelector("#add-row-key-select");
    const confirmBtn = modal.querySelector(".cms-modal__confirm-btn");

    // Populate dropdown with allowed keys
    const sectionMap = { unitInfo: "unitRows", program: "programRows", general: "generalRows" };
    const propertyName = sectionMap[section];
    const sectionRows = propertyName ? this[propertyName] : [];
    let allowedKeys;
    if (section === "program") {
      allowedKeys = this.options.includeAgenda
        ? PROGRAM_ALLOWED_KEYS
        : new Set([...PROGRAM_ALLOWED_KEYS].filter((k) => !k.startsWith("agenda")));
    } else {
      allowedKeys = GENERAL_ALLOWED_KEYS;
    }
    const existingKeys = sectionRows.map((row) => normalizeCmsKeyType(row.key));

    for (const key of allowedKeys) {
      // Skip non‑repeatable keys that already exist
      if (existingKeys.includes(key) && !isRepeatableKeyType(key)) continue;

      // Enforce max repeatable limits
      if (isRepeatableKeyType(key)) {
        const count = existingKeys.filter((k) => k === key).length;
        const max = MAX_REPEATABLE_ITEMS[key];
        if (max !== undefined && count >= max) continue;
      }

      const option = document.createElement("option");
      option.value = key;
      option.textContent = this.getFieldLabel(key);
      select.appendChild(option);
    }

    // Enable confirm when key is selected
    select.addEventListener("change", () => {
      confirmBtn.disabled = !select.value;
    });

    // Cancel handler
    modal.querySelector(".cms-modal__cancel-btn").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    // Overlay click to close
    modal.querySelector(".cms-modal__overlay").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    // Confirm handler
    confirmBtn.addEventListener("click", () => {
      const newKey = select.value;
      if (!newKey) return;

      const newRow = {
        key: newKey,
        value: "",
        _id: `${section}-${Date.now()}`
      };

      let insertIdx;
      if (insertIndex !== null) {
        // Insert at specific position (from inline insert button)
        insertIdx = insertIndex;
        if (propertyName) {
          this[propertyName].splice(insertIdx, 0, newRow);
        }
      } else if (section === "program") {
        insertIdx = this.getProgramInsertIndex(newKey);
        this.programRows.splice(insertIdx, 0, newRow);
      } else if (propertyName) {
        this[propertyName].push(newRow);
        insertIdx = this[propertyName].length - 1;
      } else {
        insertIdx = 0;
      }

      this.isDirty = true;
      this.refreshDirtyState();
      this._insertRow(newRow, section, insertIdx);
      this._refreshSectionRows(section);
      document.body.removeChild(modal);
    });
  }

  /**
   * Get insertion index for program section
   */
  getProgramInsertIndex(keyType) {
    const keyOrderIndex = PROGRAM_KEY_ORDER.indexOf(keyType);
    if (keyOrderIndex === -1) return this.programRows.length;

    // Find the last occurrence of the preceding key or insert at position
    for (let i = this.programRows.length - 1; i >= 0; i--) {
      const rowKey = normalizeCmsKeyType(this.programRows[i].key);
      if (PROGRAM_KEY_ORDER.indexOf(rowKey) <= keyOrderIndex) {
        return i + 1;
      }
    }

    return 0;
  }

  /**
   * Handle action button clicks (move/delete)
   */
  handleActionClick(event) {
    const btn = event.target;
    const rowId = btn.dataset.rowId;
    const section = btn.dataset.section;
    const direction =
      btn.dataset.direction || (btn.matches(".cms-row__action--delete") ? "delete" : "");

    if (!section || !rowId) return;

    // Map section names to property names
    const sectionMap = { unitInfo: "unitRows", program: "programRows", general: "generalRows" };
    const propertyName = sectionMap[section];
    if (!propertyName) return;

    const rows = this[propertyName];
    const rowIdx = rows.findIndex((r) => r._id === rowId);
    if (rowIdx === -1) return;

    if (direction === "up" && rowIdx > 0) {
      // Swap in array
      const tempRow = rows[rowIdx];
      rows[rowIdx] = rows[rowIdx - 1];
      rows[rowIdx - 1] = tempRow;
      this.isDirty = true;
      this.refreshDirtyState();
      this.render();
    } else if (direction === "down" && rowIdx < rows.length - 1) {
      const tempRow = rows[rowIdx];
      rows[rowIdx] = rows[rowIdx + 1];
      rows[rowIdx + 1] = tempRow;
      this.isDirty = true;
      this.refreshDirtyState();
      this.render();
    } else if (direction === "delete") {
      // Prevent deletion of required program keys and split markers
      const rowKey = normalizeCmsKeyType(rows[rowIdx].key);
      if (!REQUIRED_PROGRAM_KEYS.includes(rowKey) && !isSplitKey(rows[rowIdx].key)) {
        rows.splice(rowIdx, 1);
        this.isDirty = true;
        this.refreshDirtyState();
        this.render();
      }
    }
  }

  /**
   * Handle split marker action buttons (mobile up/down)
   */
  handleSplitMarkerAction(event) {
    const btn = event.target;
    const direction = btn.dataset.direction;
    const marker = btn.closest(".cms-split-marker");
    if (!marker) return;

    const splitKey = marker.dataset.splitKey;
    if (!splitKey) return;

    // Compute current boundary index based on splitKey
    let currentBoundary;
    if (splitKey === "split:program") {
      currentBoundary = this.unitRows.length;
    } else if (splitKey === "split:general") {
      currentBoundary = this.unitRows.length + this.programRows.length;
    } else {
      return;
    }

    let newIndex;
    if (direction === "up") {
      newIndex = currentBoundary - 1;
    } else if (direction === "down") {
      newIndex = currentBoundary + 1;
    } else {
      return;
    }

    this._applySplitBoundaryMove(splitKey, newIndex);
  }

  /**
   * Handle token insertion
   */
  handleTokenInsert(event) {
    const btn = event.target;
    const token = btn.dataset.token;
    const key = btn.dataset.key;
    const part = btn.dataset.part;

    // Find the input/textarea within the same .cms-field that matches data-key and data-part
    const field = btn.closest(".cms-field");
    if (!field) return;
    const targetInput = field.querySelector(
      `.cms-field__input[data-key="${key}"][data-part="${part}"]`
    );
    if (!targetInput) return;

    // Insert token at cursor position
    const start = targetInput.selectionStart || 0;
    const end = targetInput.selectionEnd || 0;
    const text = targetInput.value;

    targetInput.value = text.substring(0, start) + token + text.substring(end);
    targetInput.focus();
    targetInput.setSelectionRange(start + token.length, start + token.length);

    // Trigger change event
    targetInput.dispatchEvent(new Event("input", { bubbles: true }));
    targetInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /**
   * Handle save
   */
  handleSave() {
    // Validate before save
    const errors = this.validate();
    if (errors.length > 0) {
      this.showToast("Validation errors: " + errors.map((e) => e.message).join(", "), "error");
      return;
    }

    // Truncate field lengths before save
    this.truncateFieldLengths();

    // Get all rows
    const allRows = this.getAllRows();
    const removedKeys = this.getRemovedKeys();

    // Call save callback
    if (this.options.onSaveCallback) {
      this.options.onSaveCallback(allRows, removedKeys);
    }

    // Update baseline
    this.baselineUnitRows = JSON.parse(JSON.stringify(this.unitRows));
    this.baselineProgramRows = JSON.parse(JSON.stringify(this.programRows));
    this.baselineGeneralRows = JSON.parse(JSON.stringify(this.generalRows));

    this.isDirty = false;
    this.refreshDirtyState();
    this.showToast("All changes saved!", "success");
  }

  /**
   * Validate the editor state
   */
  validate() {
    const errors = [];

    // Check required keys in program
    const hasPresiding = this.programRows.some(
      (row) => normalizeCmsKeyType(row.key) === "presiding"
    );
    const hasClosingPrayer = this.programRows.some(
      (row) => normalizeCmsKeyType(row.key) === "closingPrayer"
    );

    if (!hasPresiding) {
      errors.push({ message: "Program must include presiding" });
    }

    if (!hasClosingPrayer) {
      errors.push({ message: "Program must include closingPrayer" });
    }

    // Check presiding is first
    if (this.programRows.length > 0) {
      const firstKey = normalizeCmsKeyType(this.programRows[0].key);
      if (firstKey !== "presiding" && !firstKey.startsWith("agenda")) {
        errors.push({ message: "presiding should be the first row in program" });
      }
    }

    // Check for duplicate non-repeatable keys
    for (const section of ["unitRows", "programRows", "generalRows"]) {
      const rows = this[section];
      const keyCounts = {};

      for (const row of rows) {
        const key = normalizeCmsKeyType(row.key);
        keyCounts[key] = (keyCounts[key] || 0) + 1;
      }

      for (const [key, count] of Object.entries(keyCounts)) {
        if (count > 1 && !isRepeatableKeyType(key)) {
          errors.push({ message: `Duplicate non-repeatable key: ${key}` });
        }
      }
    }

    // Validate required English text for specific translatable keys.
    for (const section of ["unitRows", "programRows", "generalRows"]) {
      const rows = this[section];
      for (const row of rows) {
        const key = normalizeCmsKeyType(row.key);
        if (!REQUIRED_ENGLISH_TEXT_KEYS.has(key)) {
          continue;
        }

        const value = parseFieldValue(row.key, row.value);
        const english = sanitisePart(value.text);
        if (!english) {
          errors.push({ message: `${key} requires an English value.` });
        }
      }
    }

    // Validate required EN locale triplet for linkWithSpace.
    for (const section of ["unitRows", "programRows", "generalRows"]) {
      const rows = this[section];
      for (const row of rows) {
        const key = normalizeCmsKeyType(row.key);
        if (key !== "linkWithSpace") {
          continue;
        }

        const value = parseFieldValue(row.key, row.value);
        const hasName = Boolean(sanitisePart(value.text));
        const hasUrl = Boolean(sanitisePart(value.url));
        const hasImageUrl = Boolean(sanitisePart(value.imageUrl));
        if (!hasName || !hasUrl || !hasImageUrl) {
          errors.push({
            message: "linkWithSpace requires EN name, link, and image link URL."
          });
        }
      }
    }

    // Validate required EN locale pair for generalStatementWithLink.
    for (const section of ["unitRows", "programRows", "generalRows"]) {
      const rows = this[section];
      for (const row of rows) {
        const key = normalizeCmsKeyType(row.key);
        if (key !== "generalStatementWithLink") {
          continue;
        }

        const value = parseFieldValue(row.key, row.value);
        const hasText = Boolean(sanitisePart(value.text));
        const hasUrl = Boolean(sanitisePart(value.url));
        if (!hasText || !hasUrl) {
          errors.push({
            message: "generalStatementWithLink requires EN text and link."
          });
        }
      }
    }

    // Validate required EN locale pair for lesson keys.
    for (const section of ["unitRows", "programRows", "generalRows"]) {
      const rows = this[section];
      for (const row of rows) {
        const key = normalizeCmsKeyType(row.key);
        if (!REQUIRED_ENGLISH_TEXT_AND_URL_KEYS.has(key)) {
          continue;
        }

        const value = parseFieldValue(row.key, row.value);
        const hasName = Boolean(sanitisePart(value.text));
        const hasUrl = Boolean(sanitisePart(value.url));
        if (!hasName || !hasUrl) {
          errors.push({
            message: `${key} requires EN name and link.`
          });
        }
      }
    }

    // Validate required EN link for photo key.
    for (const section of ["unitRows", "programRows", "generalRows"]) {
      const rows = this[section];
      for (const row of rows) {
        const key = normalizeCmsKeyType(row.key);
        if (!REQUIRED_ENGLISH_URL_KEYS.has(key)) {
          continue;
        }

        const value = parseFieldValue(row.key, row.value);
        const hasUrl = Boolean(sanitisePart(value.url));
        if (!hasUrl) {
          errors.push({
            message: `${key} requires EN photo link.`
          });
        }
      }
    }

    // Validate required Leader fields.
    for (const section of ["unitRows", "programRows", "generalRows"]) {
      const rows = this[section];
      for (const row of rows) {
        const key = normalizeCmsKeyType(row.key);
        if (key !== "leader") {
          continue;
        }

        const value = parseFieldValue(row.key, row.value);
        const hasName = Boolean(sanitisePart(value.name));
        const hasCalling = Boolean(sanitisePart(value.calling));
        const hasPhone = Boolean(sanitisePart(value.phone));
        if (!hasName || !hasCalling || !hasPhone) {
          errors.push({ message: "leader requires name, calling/position, and phone." });
        }
      }
    }

    return errors;
  }

  /**
   * Truncate field lengths to maximum allowed (text ≤1000, textarea ≤5000)
   */
  truncateFieldLengths() {
    const allSections = [
      { rows: this.unitRows },
      { rows: this.programRows },
      { rows: this.generalRows }
    ];

    for (const section of allSections) {
      for (const row of section.rows) {
        const key = row.key;
        const definition = getFieldDefinition(key);
        const value = parseFieldValue(key, row.value);
        let modified = false;

        for (const field of definition.fields) {
          // Determine max length based on field type
          let maxLength = field.type === "textarea" ? 5000 : 1000;
          // Skip non-text fields
          if (field.type !== "text" && field.type !== "textarea") continue;

          // Determine which locale keys to check
          const normalizedKey = normalizeCmsKeyType(key);
          const isTranslated = USER_TRANSLATED_KEYS.has(normalizedKey);
          const locales = isTranslated ? ["en", "es", "fr", "swa"] : ["en"];

          for (const locale of locales) {
            const prop = locale === "en" ? field.name : `${field.name}_${locale}`;
            if (value[prop] !== undefined && value[prop].length > maxLength) {
              value[prop] = value[prop].substring(0, maxLength);
              modified = true;
            }
          }
        }

        if (modified) {
          row.value = serializeFieldValue(key, value);
        }
      }
    }
  }

  /**
   * Check if a key is allowed in a section
   */
  isKeyAllowedInSection(key, section) {
    const normalizedKey = normalizeCmsKeyType(key);

    if (section === "unitInfo") {
      return UNIT_INFO_KEYS.includes(key) || UNIT_INFO_KEYS.includes(normalizedKey);
    } else if (section === "program") {
      if (!this.options.includeAgenda && normalizedKey.startsWith("agenda")) {
        return false;
      }
      return PROGRAM_ALLOWED_KEYS.has(normalizedKey) || UNIVERSAL_KEYS.has(normalizedKey);
    } else if (section === "general") {
      return GENERAL_ALLOWED_KEYS.has(normalizedKey) || UNIVERSAL_KEYS.has(normalizedKey);
    }

    return false;
  }

  /**
   * Get all rows in order
   */
  getAllRows() {
    const allRows = [];

    // Keys that only have a single text field and are user-translated.
    // Their raw value is already pipe-delimited (en|es|fr|swa) and should NOT be re-serialized.
    const SINGLE_FIELD_TRANSLATED_KEYS = new Set([
      "horizontalLine",
      "sacramentLine",
      "generalStatement"
    ]);

    const processRow = (row) => {
      const normalizedKey = normalizeCmsKeyType(row.key);
      if (SINGLE_FIELD_TRANSLATED_KEYS.has(normalizedKey)) {
        return { key: row.key, value: row.value };
      }
      return {
        key: row.key,
        value: serializeFieldValue(row.key, parseFieldValue(row.key, row.value))
      };
    };

    // Sort unit info rows to canonical order
    const sortedUnitRows = [...this.unitRows].sort(
      (a, b) => UNIT_INFO_KEYS.indexOf(a.key) - UNIT_INFO_KEYS.indexOf(b.key)
    );

    for (const row of sortedUnitRows) {
      allRows.push(processRow(row));
    }

    // Add split:program marker
    allRows.push({ key: "split:program", value: "" });

    for (const row of this.programRows) {
      allRows.push(processRow(row));
    }

    // Add split:general marker
    allRows.push({ key: "split:general", value: "" });

    for (const row of this.generalRows) {
      allRows.push(processRow(row));
    }

    return allRows;
  }

  /**
   * Backward-compatible alias for callers that still expect getRows().
   */
  getRows() {
    return this.getAllRows();
  }

  /**
   * Get removed keys
   */
  getRemovedKeys() {
    const baselineKeys = new Set([
      ...this.baselineUnitRows.map((row) => row.key),
      ...this.baselineProgramRows.map((row) => row.key),
      ...this.baselineGeneralRows.map((row) => row.key)
    ]);

    const currentKeys = new Set([
      ...this.unitRows.map((row) => row.key),
      ...this.programRows.map((row) => row.key),
      ...this.generalRows.map((row) => row.key)
    ]);

    return [...baselineKeys].filter((key) => !currentKeys.has(key));
  }

  /**
   * Get editor state
   */
  getState() {
    return {
      rows: this.getAllRows(),
      removedKeys: this.getRemovedKeys(),
      isDirty: this.isDirty
    };
  }

  /**
   * Refresh dirty state
   */
  refreshDirtyState() {
    this.isDirty = JSON.stringify(this.getAllRows()) !== JSON.stringify(this.getBaselineRows());
    this.updateStatus();

    if (this.options.onChangeCallback) {
      this.options.onChangeCallback(this.getState());
    }
  }

  /**
   * Get baseline rows
   */
  getBaselineRows() {
    const baselineRows = [];

    for (const row of this.baselineUnitRows) {
      baselineRows.push({ key: row.key, value: row.value });
    }

    // Add split markers to match getAllRows() format
    baselineRows.push({ key: "split:program", value: "" });

    for (const row of this.baselineProgramRows) {
      baselineRows.push({ key: row.key, value: row.value });
    }

    baselineRows.push({ key: "split:general", value: "" });

    for (const row of this.baselineGeneralRows) {
      baselineRows.push({ key: row.key, value: row.value });
    }

    return baselineRows;
  }

  /**
   * Update status display
   */
  updateStatus() {
    const statusEl = this.container.querySelector(".cms-editor__status");
    if (!statusEl) return;

    if (this.isDirty) {
      statusEl.textContent = translateStaticText("Unsaved changes");
      statusEl.setAttribute("data-dirty", "true");
    } else {
      statusEl.textContent = translateStaticText("All changes saved");
      statusEl.setAttribute("data-dirty", "false");

      if (this.statusTimeout) {
        clearTimeout(this.statusTimeout);
      }
      this.statusTimeout = setTimeout(() => {
        statusEl.textContent = "";
        statusEl.setAttribute("data-dirty", "false");
      }, 10000);
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, tone = "info") {
    // Remove existing toast
    const existingToast = document.querySelector(".cms-editor__toast");
    if (existingToast) {
      existingToast.parentNode?.removeChild(existingToast);
    }

    const toast = document.createElement("div");
    toast.className = `cms-editor__toast cms-editor__toast--${tone}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 5000);
  }

  /**
   * Set a field value for a repeatable item or any row
   */
  setItemValue(keyType, index, value) {
    const normalizedKey = normalizeCmsKeyType(keyType);

    // First check repeatable items
    const sectionMap = {
      speaker: { section: "programRows", key: "speaker" },
      intermediateHymn: { section: "programRows", key: "intermediateHymn" },
      leader: { section: "programRows", key: "leader" }
    };

    const mapping = sectionMap[normalizedKey];
    if (mapping) {
      const rows = this[mapping.section];
      const matchingRows = rows.filter((r) => normalizeCmsKeyType(r.key) === mapping.key);

      if (index < matchingRows.length) {
        const targetRow = matchingRows[index];
        targetRow.value = serializeFieldValue(normalizedKey, value);
        this.isDirty = true;
        this.refreshDirtyState();
        const rowEl = this.rowElements.get(targetRow._id);
        if (rowEl) this._updateRowElement(rowEl, targetRow);
      } else if (index === matchingRows.length) {
        // Enforce max repeatable limit
        const maxAllowed = MAX_REPEATABLE_ITEMS[normalizedKey];
        if (maxAllowed !== undefined && matchingRows.length >= maxAllowed) {
          return; // Do not create new row, at limit
        }
        // Create new row at correct insertion position
        const maxIndex = matchingRows.reduce((max, r) => {
          const numMatch = r.key.match(/(\\d+)$/);
          return numMatch ? Math.max(max, parseInt(numMatch[1], 10)) : max;
        }, 0);
        const newRowKey = `${normalizedKey}${maxIndex + 1}`;
        const newRow = { key: newRowKey, value: serializeFieldValue(normalizedKey, value) };
        // Insert at correct position in program
        const insertIdx = this.getProgramInsertIndex(normalizedKey);
        rows.splice(insertIdx, 0, newRow);
        this.isDirty = true;
        this.refreshDirtyState();
        this._insertRow(newRow, "program", insertIdx);
        this._refreshSectionRows("program");
      }
      return;
    }

    // For non-repeatable keys, find the row in any section
    for (const sectionKey of ["unitRows", "programRows", "generalRows"]) {
      const rows = this[sectionKey];
      for (const row of rows) {
        if (normalizeCmsKeyType(row.key) === normalizedKey) {
          row.value = serializeFieldValue(normalizedKey, value);
          this.isDirty = true;
          this.refreshDirtyState();
          const rowEl = this.rowElements.get(row._id);
          if (rowEl) this._updateRowElement(rowEl, row);
          return;
        }
      }
    }
  }

  /**
   * Add a repeatable item
   */
  addRepeatableItem(keyType) {
    const normalizedKey = normalizeCmsKeyType(keyType);

    const sectionMap = {
      speaker: { section: "programRows" },
      intermediateHymn: { section: "programRows" },
      leader: { section: "programRows" }
    };

    const mapping = sectionMap[normalizedKey];
    if (!mapping) return;

    const rows = this[mapping.section];
    const existingRows = rows.filter((r) => normalizeCmsKeyType(r.key) === normalizedKey);

    // Find next available index
    const maxIndex = existingRows.reduce((max, r) => {
      const numMatch = r.key.match(/(\d+)$/);
      return numMatch ? Math.max(max, parseInt(numMatch[1], 10)) : max;
    }, 0);

    const newRowKey = `${normalizedKey}${maxIndex + 1}`;
    const newRow = { key: newRowKey, value: "" };
    // Insert at correct position in program order
    const insertIdx = this.getProgramInsertIndex(normalizedKey);
    rows.splice(insertIdx, 0, newRow);
    this.isDirty = true;
    this.refreshDirtyState();
    this._insertRow(newRow, "program", insertIdx);
    this._refreshSectionRows("program");
  }

  /**
   * Remove a repeatable item
   */
  removeRepeatableItem(keyType, index) {
    const normalizedKey = normalizeCmsKeyType(keyType);

    const sectionMap = {
      speaker: { section: "programRows" },
      intermediateHymn: { section: "programRows" },
      leader: { section: "programRows" }
    };

    const mapping = sectionMap[normalizedKey];
    if (!mapping) return;

    const rows = this[mapping.section];
    const matchingRows = rows.filter((r) => normalizeCmsKeyType(r.key) === normalizedKey);

    if (index < matchingRows.length) {
      const targetRow = matchingRows[index];
      targetRow.value = "";
      this.isDirty = true;
      this.refreshDirtyState();
      const rowEl = this.rowElements.get(targetRow._id);
      if (rowEl) this._updateRowElement(rowEl, targetRow);
    }
  }

  /**
   * Discard changes
   */
  discardChanges() {
    this.unitRows = JSON.parse(JSON.stringify(this.baselineUnitRows));
    this.programRows = JSON.parse(JSON.stringify(this.baselineProgramRows));
    this.generalRows = JSON.parse(JSON.stringify(this.baselineGeneralRows));
    this.isDirty = false;
    this.render();
  }
}

export default CmsEditor;
export {
  parseRowsIntoSections,
  autoCorrectRows,
  parseDisplayDate,
  formatDisplayDate,
  isSplitKey,
  findSplitIndices,
  ensureSplitMarkers
};
