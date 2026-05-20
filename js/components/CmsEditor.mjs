// ============================================================
// CMS Editor Redesign - Three-Section Layout
// ============================================================
// Implements the plan in docs/plans/cms.md
// ============================================================

import { ALLOWED_KEYS } from "../sanitize.js";
import { getLanguage, loadTranslations, t } from "../i18n/index.js";
import { childrenSongLookup, hymnsLookup } from "../data/hymnsLookup.js";

// --- Constants ---

/** Unit Information keys in canonical order */
const UNIT_INFO_KEYS = ["unitName", "stakeName", "obsolete", "migrationUrl", "unitAddress", "link", "date"];

/** Keys allowed in Program section */
const PROGRAM_ALLOWED_KEYS = new Set([
  "presiding", "conducting", "musicDirector", "musicOrganist",
  "agendaAckVisitingLeaders", "agendaAnnouncements", "agendaGeneral",
  "openingHymn", "openingPrayer", "agendaBusinessReleases",
  "agendaBusinessCallings", "agendaBusinessPriesthood",
  "agendaBusinessNewMoveIns", "agendaBusinessNewConverts",
  "agendaBusinessGeneral", "agendaBusinessStake",
  "sacramentHymn", "sacramentLine",
  "speaker", "intermediateHymn",
  "closingHymn", "closingPrayer"
]);

/** Keys allowed in General section */
const GENERAL_ALLOWED_KEYS = new Set([
  "horizontalLine", "lessonEQRS", "lessonSundaySchool", "lessonYouth", "lessonPrimary",
  "photo", "leader", "linkWithSpace", "generalStatement",
  "generalStatementWithLink", "oilLamp"
]);

/** Universal keys that may appear in any section */
const UNIVERSAL_KEYS = new Set(["horizontalLine", "photo", "oilLamp"]);

/** Program key order for insert positioning */
const PROGRAM_KEY_ORDER = [
  "presiding", "conducting", "musicDirector", "musicOrganist",
  "agendaAckVisitingLeaders", "agendaAnnouncements", "agendaGeneral",
  "openingHymn", "openingPrayer",
  "agendaBusinessReleases", "agendaBusinessCallings", "agendaBusinessPriesthood",
  "agendaBusinessNewMoveIns", "agendaBusinessNewConverts",
  "agendaBusinessGeneral", "agendaBusinessStake", "agendaGeneral",
  "sacramentHymn", "sacramentLine", "agendaGeneral",
  "speaker", "intermediateHymn", "speaker",
  "agendaGeneral", "closingHymn", "closingPrayer"
];

/** Maximum repeatable items per key type */
const MAX_REPEATABLE_ITEMS = {
  speaker: 10,
  intermediateHymn: 5,
  leader: 20,
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
  "generalStatement", "generalStatementWithLink", "horizontalLine",
  "lessonEQRS", "lessonSundaySchool", "lessonYouth", "lessonPrimary",
  "linkWithSpace", // text field only
  "photo" // caption only
]);

/** Keys that are language-independent (same value in all locales) */
const LANGUAGE_INDEPENDENT_KEYS = new Set([
  "unitName", "stakeName", "unitAddress", "date", "link", "leader",
  "photo", // url field
  "presiding", "conducting", "musicDirector", "musicOrganist",
  "openingPrayer", "closingPrayer", "speaker", // name + caption
  "agendaGeneral", "agendaAckVisitingLeaders", "agendaAnnouncements",
  "agendaBusinessReleases", "agendaBusinessCallings", "agendaBusinessPriesthood",
  "agendaBusinessNewMoveIns", "agendaBusinessNewConverts",
  "agendaBusinessGeneral", "agendaBusinessStake",
  "openingHymn", "sacramentHymn", "intermediateHymn", "closingHymn", "hymn",
  "linkWithSpace", // url + imageUrl fields
  "migrationUrl", "sacramentLine", "oilLamp"
]);

// --- Helper Functions ---

export function normalizeCmsKeyType(key) {
  if (!key) return key;
  return key.replace(/(\d+)$/, "");
}

function translateStaticText(text) {
  const translations = {
    "Unit Information": "cms.category.unitInfo",
    "Sacrament Meeting Program": "cms.category.program",
    "General Information": "cms.category.general",
    "Add Row": "cms.action.addRow",
    "Unsaved changes": "cms.status.unsaved",
    "All changes saved": "cms.status.saved",
    "Required": "cms.badge.required",
    "Optional": "cms.badge.optional",
    "Add": "cms.action.add",
    "Remove": "cms.action.remove",
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
      "January": 0, "February": 1, "March": 2, "April": 3,
      "May": 4, "June": 5, "July": 6, "August": 7,
      "September": 8, "October": 9, "November": 10, "December": 11
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
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date);
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
  return parts.filter(p => p !== "").join("|");
}

/**
 * Split a raw value by pipe delimiter
 */
function splitParts(raw) {
  return String(raw ?? "").split("|").map(part => part.trim());
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
      return { hymnNumber: parts[0] || "", titleOverride: parts[1] || "" };
    case "speaker":
      return { name: parts[0] || "", caption: parts[1] || "" };
    case "leader":
      return { name: parts[0] || "", calling: parts[1] || "", phone: parts[2] || "" };
    case "generalStatementWithLink":
      return { text: parts[0] || "", url: parts[1] || "" };
    case "link":
      return { text: parts[0] || "", url: parts[1] || "" };
    case "linkWithSpace":
      return { text: parts[0] || "", url: parts[1] || "", imageUrl: parts[2] || "" };
    case "photo":
      return { url: parts[0] || "", caption: parts[1] || "" };
    case "oilLamp":
      return { enabled: true };
    default:
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
      return joinParts([sanitisePart(value.hymnNumber), sanitisePart(value.titleOverride)]);
    case "speaker":
      return joinParts([sanitisePart(value.name), sanitisePart(value.caption)]);
    case "leader":
      return joinParts([sanitisePart(value.name), sanitisePart(value.calling), sanitisePart(value.phone)]);
    case "generalStatementWithLink":
      return joinParts([sanitisePart(value.text), sanitisePart(value.url)]);
    case "link":
      return joinParts([sanitisePart(value.text), sanitisePart(value.url)]);
    case "linkWithSpace":
      // Note: includeImageIcon has been removed per plan
      return joinParts([sanitisePart(value.text), sanitisePart(value.url), sanitisePart(value.imageUrl)]);
    case "photo":
      return joinParts([sanitisePart(value.url), sanitisePart(value.caption)]);
    case "oilLamp":
      return value.enabled ? "" : "";
    default:
      return sanitisePart(value.text);
  }
}

/**
 * Check if a value is empty for a given key type
 */
function isValueEmpty(keyType, value) {
  const normalizedKey = normalizeCmsKeyType(keyType);
  if (normalizedKey === "oilLamp") {
    return !value.enabled;
  }
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
 */
function parseRowsIntoSections(rows) {
  const rowList = Array.isArray(rows) ? rows.map(row => ({
    key: row.key ?? "",
    value: row.value ?? ""
  })) : [];
  
  const unitInfoRows = [];
  const programRows = [];
  const generalRows = [];
  
  // Partition rows based on key type
  for (const row of rowList) {
    const normalizedKey = normalizeCmsKeyType(row.key);
    
    if (UNIT_INFO_KEYS.includes(row.key)) {
      // Unit info keys go to unit section
      unitInfoRows.push({ ...row, _id: `unit-${unitInfoRows.length}` });
    } else if (PROGRAM_ALLOWED_KEYS.has(normalizedKey)) {
      // Program keys go to program section
      programRows.push({ ...row, _id: `program-${programRows.length}` });
    } else {
      // Everything else goes to general section (including universal keys)
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
  const hasPresiding = programRows.some(row => normalizeCmsKeyType(row.key) === "presiding");
  const hasClosingPrayer = programRows.some(row => normalizeCmsKeyType(row.key) === "closingPrayer");
  
  if (!hasPresiding) {
    corrections.push({ type: "add_presiding", message: "Added missing presiding row" });
    programRows.unshift({ key: "presiding", value: "", _id: `program-${programRows.length}` });
  }
  
  if (!hasClosingPrayer) {
    corrections.push({ type: "add_closingPrayer", message: "Added missing closingPrayer row" });
    programRows.push({ key: "closingPrayer", value: "", _id: `program-${programRows.length}` });
  }
  
  // Ensure presiding is first (after any agenda keys)
  const presidingIdx = programRows.findIndex(row => normalizeCmsKeyType(row.key) === "presiding");
  if (presidingIdx > 0) {
    const presidingRow = programRows.splice(presidingIdx, 1)[0];
    // Insert after first agenda key or at beginning
    let insertIdx = 0;
    for (let i = 0; i < programRows.length; i++) {
      if (programRows[i].key.startsWith("agenda")) {
        insertIdx = i + 1;
      } else {
        break;
      }
    }
    programRows.splice(insertIdx, 0, presidingRow);
    corrections.push({ type: "reorder_presiding", message: "Moved presiding to correct position" });
  }
  
  // Ensure closingPrayer is last
  const closingPrayerIdx = programRows.findIndex(row => normalizeCmsKeyType(row.key) === "closingPrayer");
  if (closingPrayerIdx < programRows.length - 1) {
    const closingPrayerRow = programRows.splice(closingPrayerIdx, 1)[0];
    programRows.push(closingPrayerRow);
    corrections.push({ type: "reorder_closingPrayer", message: "Moved closingPrayer to end" });
  }
  
  // Validate unit info section
  const unitInfoKeySet = new Set(UNIT_INFO_KEYS);
  const extraUnitInfoRows = unitInfoRows.filter(row => !unitInfoKeySet.has(row.key));
  if (extraUnitInfoRows.length > 0) {
    corrections.push({ type: "remove_extra_unit_info", message: `Removed ${extraUnitInfoRows.length} unauthorized keys from Unit Info` });
    for (const row of extraUnitInfoRows) {
      // Move to appropriate section based on key type
      if (PROGRAM_ALLOWED_KEYS.has(normalizeCmsKeyType(row.key))) {
        programRows.push({ ...row, _id: `program-${programRows.length}` });
      } else {
        generalRows.push({ ...row, _id: `general-${generalRows.length}` });
      }
    }
  }
  
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
    stakeName: { fields: [{ name: "text", type: "text", placeholder: "cms.input.stakeDistrictName" }] },
    unitAddress: { fields: [{ name: "text", type: "text", placeholder: "cms.input.meetingAddress" }] },
    date: { fields: [{ name: "text", type: "date", placeholder: "cms.input.meetingDate" }] },
    presiding: { fields: [{ name: "text", type: "text", placeholder: "cms.input.fullName" }] },
    conducting: { fields: [{ name: "text", type: "text", placeholder: "cms.input.fullName" }] },
    musicDirector: { fields: [{ name: "text", type: "text", placeholder: "cms.input.fullName" }] },
    musicOrganist: { fields: [{ name: "text", type: "text", placeholder: "cms.input.fullName" }] },
    openingHymn: { fields: [{ name: "hymnNumber", type: "text", placeholder: "cms.input.exampleHymnNumber" }, { name: "titleOverride", type: "text", placeholder: "cms.input.optionalCustomTitle" }] },
    sacramentHymn: { fields: [{ name: "hymnNumber", type: "text", placeholder: "cms.input.exampleHymnNumber" }, { name: "titleOverride", type: "text", placeholder: "cms.input.optionalCustomTitle" }] },
    intermediateHymn: { fields: [{ name: "hymnNumber", type: "text", placeholder: "cms.input.exampleHymnNumber" }, { name: "titleOverride", type: "text", placeholder: "cms.input.optionalCustomTitle" }] },
    closingHymn: { fields: [{ name: "hymnNumber", type: "text", placeholder: "cms.input.exampleHymnNumber" }, { name: "titleOverride", type: "text", placeholder: "cms.input.optionalCustomTitle" }] },
    hymn: { fields: [{ name: "hymnNumber", type: "text", placeholder: "cms.input.exampleHymnNumber" }, { name: "titleOverride", type: "text", placeholder: "cms.input.optionalCustomTitle" }] },
    openingPrayer: { fields: [{ name: "text", type: "text", placeholder: "cms.input.fullName" }] },
    closingPrayer: { fields: [{ name: "text", type: "text", placeholder: "cms.input.fullName" }] },
    speaker: { fields: [{ name: "name", type: "text", placeholder: "cms.input.name" }, { name: "caption", type: "text", placeholder: "cms.input.optionalCaptionTopic" }] },
    horizontalLine: { fields: [{ name: "text", type: "text", placeholder: "cms.input.optionalSectionLabel" }] },
    sacramentLine: { fields: [{ name: "text", type: "text", placeholder: "cms.input.optionalSacramentHeading" }] },
    oilLamp: { fields: [{ name: "enabled", type: "checkbox", label: "cms.input.displayOilLamp" }] },
    leader: { fields: [{ name: "name", type: "text", placeholder: "cms.input.name" }, { name: "calling", type: "text", placeholder: "cms.input.optionalCallingPosition" }, { name: "phone", type: "text", placeholder: "cms.input.optionalPhone" }] },
    generalStatement: { fields: [{ name: "text", type: "textarea", placeholder: "cms.input.generalNotes" }] },
    generalStatementWithLink: { fields: [{ name: "text", type: "textarea", placeholder: "cms.input.textWithLinkPlaceholder" }, { name: "url", type: "text", placeholder: "cms.input.url" }] },
    link: { fields: [{ name: "text", type: "text", placeholder: "cms.input.displayText" }, { name: "url", type: "text", placeholder: "cms.input.url" }] },
    linkWithSpace: { fields: [{ name: "text", type: "text", placeholder: "cms.input.displayText" }, { name: "url", type: "text", placeholder: "cms.input.url" }, { name: "imageUrl", type: "text", placeholder: "cms.input.optionalImageUrl" }] },
    photo: { fields: [{ name: "url", type: "text", placeholder: "cms.input.imageUrl" }, { name: "caption", type: "text", placeholder: "cms.input.optionalCaption" }] },
    migrationUrl: { fields: [{ name: "text", type: "text", placeholder: "cms.input.migrationUrl" }] },
    obsolete: { fields: [{ name: "text", type: "text", placeholder: "cms.input.obsolete" }] },
    lessonEQRS: { fields: [{ name: "text", type: "text", placeholder: "cms.input.lessonTitleOrTopic" }] },
    lessonSundaySchool: { fields: [{ name: "text", type: "text", placeholder: "cms.input.lessonTitleOrTopic" }] },
    lessonYouth: { fields: [{ name: "text", type: "text", placeholder: "cms.input.lessonTitleOrTopic" }] },
    lessonPrimary: { fields: [{ name: "text", type: "text", placeholder: "cms.input.lessonTitleOrTopic" }] },
    agendaGeneral: { fields: [{ name: "text", type: "textarea", placeholder: "cms.input.generalNotes" }] },
    agendaAnnouncements: { fields: [{ name: "text", type: "text", placeholder: "cms.input.announcement" }] },
    agendaAckVisitingLeaders: { fields: [{ name: "text", type: "text", placeholder: "cms.input.leaderName" }] },
    agendaBusinessStake: { fields: [{ name: "text", type: "textarea", placeholder: "cms.input.stakeBusiness" }] },
    agendaBusinessReleases: { fields: [{ name: "name", type: "text", placeholder: "cms.input.name" }, { name: "calling", type: "text", placeholder: "cms.input.calling" }] },
    agendaBusinessCallings: { fields: [{ name: "name", type: "text", placeholder: "cms.input.name" }, { name: "calling", type: "text", placeholder: "cms.input.calling" }] },
    agendaBusinessPriesthood: { fields: [{ name: "text", type: "textarea", placeholder: "cms.input.priesthoodBusiness" }] },
    agendaBusinessNewMoveIns: { fields: [{ name: "text", type: "text", placeholder: "cms.input.name" }] },
    agendaBusinessNewConverts: { fields: [{ name: "text", type: "text", placeholder: "cms.input.name" }] },
    agendaBusinessGeneral: { fields: [{ name: "text", type: "textarea", placeholder: "cms.input.otherBusiness" }] }
  };
  
  return definitions[normalizedKey] || { fields: [{ name: "text", type: "text", placeholder: "cms.input.value" }] };
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
    
    // Generate unique row IDs
    this.generateRowIds();
  }

  /**
   * Initialize the editor with rows data
   */
  initialize(rows = [], { includeAgenda = this.options.includeAgenda } = {}) {
    // Parse rows into sections
    const { unitInfoRows, programRows, generalRows } = parseRowsIntoSections(rows);
    
    // Store baseline for change detection
    this.baselineUnitRows = JSON.parse(JSON.stringify(unitInfoRows));
    this.baselineProgramRows = JSON.parse(JSON.stringify(programRows));
    this.baselineGeneralRows = JSON.parse(JSON.stringify(generalRows));
    
    // Apply auto-correction
    const { corrections, unitInfoRows: correctedUnitRows, programRows: correctedProgramRows, generalRows: correctedGeneralRows } = autoCorrectRows(unitInfoRows, programRows, generalRows);
    
    // Apply corrections
    this.unitRows = correctedUnitRows;
    this.programRows = correctedProgramRows;
    this.generalRows = correctedGeneralRows;
    
    // Update baseline after correction
    this.baselineUnitRows = JSON.parse(JSON.stringify(correctedUnitRows));
    this.baselineProgramRows = JSON.parse(JSON.stringify(correctedProgramRows));
    this.baselineGeneralRows = JSON.parse(JSON.stringify(correctedGeneralRows));
    
    // Show corrections if any
    if (corrections.length > 0) {
      this.showCorrectionsToast(corrections);
    }
    
    this.isDirty = false;
    this.render();
  }

  /**
   * Generate unique IDs for all rows
   */
  generateRowIds() {
    this.rowIdCounter = 0;
    this.unitRows.forEach(row => {
      row._id = `unit-${this.rowIdCounter++}`;
    });
    this.programRows.forEach(row => {
      row._id = `program-${this.rowIdCounter++}`;
    });
    this.generalRows.forEach(row => {
      row._id = `general-${this.rowIdCounter++}`;
    });
  }

  /**
   * Show toast for auto-corrections
   */
  showCorrectionsToast(corrections) {
    // Create toast notification
    const toast = document.createElement("div");
    toast.className = "cms-editor__toast";
    toast.innerHTML = `
      <div class="cms-editor__toast-content">
        <strong>Auto-Corrections Applied:</strong>
        <ul>
          ${corrections.map(c => `<li>${c.message}</li>`).join("")}
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
        toast.parentNode.removeChild(toast);
      });
    }
  }

  /**
   * Undo last auto-corrections
   */
  undoLastCorrections() {
    // Store current state for undo
    this.undoStack.push({
      unitRows: JSON.parse(JSON.stringify(this.unitRows)),
      programRows: JSON.parse(JSON.stringify(this.programRows)),
      generalRows: JSON.parse(JSON.stringify(this.generalRows))
    });
    
    // Restore baseline
    this.unitRows = JSON.parse(JSON.stringify(this.baselineUnitRows));
    this.programRows = JSON.parse(JSON.stringify(this.baselineProgramRows));
    this.generalRows = JSON.parse(JSON.stringify(this.baselineGeneralRows));
    
    this.isDirty = true;
    this.refreshDirtyState();
    this.render();
  }

  /**
   * Render the full editor HTML
   */
  render() {
    this.container.innerHTML = this.renderHtml();
    this.attachEventListeners();
    this.updateStatus();
  }

  /**
   * Render HTML for the editor
   */
  renderHtml() {
    return `
      <div class="cms-editor">
        <div class="cms-section" data-section="unitInfo">
          <h2>${translateStaticText("Unit Information")}</h2>
          <div class="cms-section__body">
            ${this.renderRows(this.unitRows, "unitInfo", { locked: true, allowedKeys: UNIT_INFO_KEYS })}
          </div>
        </div>
        <div class="cms-section" data-section="program">
          <h2>${translateStaticText("Sacrament Meeting Program")}</h2>
          <div class="cms-section__body">
            ${this.renderRows(this.programRows, "program", { locked: false, allowedKeys: PROGRAM_ALLOWED_KEYS })}
          </div>
          <button type="button" class="cms-editor__add-btn" data-section="program">+ ${translateStaticText("Add Row")}</button>
        </div>
        <div class="cms-section" data-section="general">
          <h2>${translateStaticText("General Information")}</h2>
          <div class="cms-section__body">
            ${this.renderRows(this.generalRows, "general", { locked: false, allowedKeys: GENERAL_ALLOWED_KEYS })}
          </div>
          <button type="button" class="cms-editor__add-btn" data-section="general">+ ${translateStaticText("Add Row")}</button>
        </div>
        <div class="cms-editor__status"></div>
        <button class="cms-editor__save-btn">Save</button>
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
    return rows.map((row, index) => {
      return this.renderRow(row, index, section, options, sectionRows);
    }).join("");
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
    
    // Key selector (dropdown)
    let keySelector = "";
    if (options.locked) {
      // Locked section - show readonly display
      keySelector = `<span class="cms-row__key-label">${this.getFieldLabel(normalizedKey)}</span>`;
    } else {
      // Editable section - show dropdown
      const allowedKeys = this.getAvailableKeysForSection(section, options.allowedKeys, row, sectionRows);
      keySelector = `
        <select class="cms-row__key-select" data-row-id="${row._id}" data-section="${section}">
          ${allowedKeys.map(k => `<option value="${k}" ${k === normalizedKey ? 'selected' : ''}>${this.getFieldLabel(k)}</option>`).join("")}
        </select>
      `;
    }
    
    // Field inputs
    const fieldInputs = this.renderFieldInputs(key, value, definition, isUserTranslated, isLanguageIndependent);
    
    // Actions (move up/down, delete)
    let actions = "";
    if (!options.locked) {
      const sectionMap = { unitInfo: "unitRows", program: "programRows", general: "generalRows" };
      const propertyName = sectionMap[section];
      const sectionRows = propertyName ? this[propertyName] : [];
      const canMoveUp = index > 0;
      const canMoveDown = index < sectionRows.length - 1;
      const canDelete = !REQUIRED_PROGRAM_KEYS.includes(normalizedKey);
      
      actions = `
        <div class="cms-row__actions">
          <button type="button" class="cms-row__action-btn cms-row__action--move-up" 
                  data-row-id="${row._id}" data-section="${section}" data-direction="up"
                  ${!canMoveUp ? 'disabled' : ''}>↑</button>
          <button type="button" class="cms-row__action-btn cms-row__action--move-down" 
                  data-row-id="${row._id}" data-section="${section}" data-direction="down"
                  ${!canMoveDown ? 'disabled' : ''}>↓</button>
          ${canDelete ? `<button type="button" class="cms-row__action-btn cms-row__action--delete" 
                  data-row-id="${row._id}" data-section="${section}">✕</button>` : ""}
        </div>
      `;
    }
    
    return `
      <div class="cms-row" data-row-id="${row._id}" data-section="${section}">
        <div class="cms-row__header">
          ${keySelector}
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
    
    for (const field of definition.fields) {
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
            const localeValue = value[`${field.name}_${locale}`] || value[field.name] || "";
            html += `
              <div class="cms-field cms-field--textarea">
                <label class="cms-field__label">${locale.toUpperCase()}: ${this.getFieldLabel(normalizedKey)}</label>
                <textarea class="cms-field__input" maxlength="5000" 
                          data-key="${key}" data-part="${field.name}" data-locale="${locale}">${escapeHtml(localeValue)}</textarea>
                ${normalizedKey === "generalStatementWithLink" ? `<button type="button" class="cms-field__token-btn" data-action="insert-token" data-token="<LINK>" data-key="${key}" data-part="${field.name}">${translateStaticText("Insert <LINK>")}</button>` : ""}
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
              ${normalizedKey === "generalStatementWithLink" ? `<button type="button" class="cms-field__token-btn" data-action="insert-token" data-token="<LINK>" data-key="${key}" data-part="${field.name}">${translateStaticText("Insert <LINK>")}</button>` : ""}
            </div>
          `;
        }
      } else {
        // Text/number field
        if (field.name === "hymnNumber") {
          // Hymn number field with dropdown
          const hymnOptions = getHymnOptions();
          html += `
            <div class="cms-field cms-field--hymn">
              <label class="cms-field__label">${this.getFieldLabel(normalizedKey)}</label>
              <select class="cms-field__input cms-field__hymn-select" 
                      data-key="${key}" data-part="${field.name}" data-locale="en">
                <option value="">Select Hymn...</option>
                ${hymnOptions.map(opt => `<option value="${opt.value}" ${opt.value === value[field.name] ? 'selected' : ''}>${opt.title}</option>`).join("")}
              </select>
            </div>
          `;
        } else {
          // Regular text field
          if (isUserTranslated) {
            // Show all locale columns
            for (const locale of localeColumns) {
              const localeValue = value[`${field.name}_${locale}`] || value[field.name] || "";
              html += `
                <div class="cms-field cms-field--text">
                  <label class="cms-field__label">${locale.toUpperCase()}: ${this.getFieldLabel(normalizedKey)}</label>
                  <input type="text" class="cms-field__input" maxlength="1000" 
                         data-key="${key}" data-part="${field.name}" data-locale="${locale}" 
                         value="${escapeHtml(localeValue)}">
                  ${normalizedKey === "linkWithSpace" ? `<button type="button" class="cms-field__token-btn" data-action="insert-token" data-token="<IMG>" data-key="${key}" data-part="${field.name}">${translateStaticText("Insert <IMG>")}</button>` : ""}
                </div>
              `;
            }
          } else {
            // Single field
            html += `
            <div class="cms-field cms-field--text">
              <label class="cms-field__label">${this.getFieldLabel(normalizedKey)}</label>
              <input type="text" class="cms-field__input" maxlength="1000" 
                     data-key="${key}" data-part="${field.name}" data-locale="en" 
                     value="${escapeHtml(value[field.name] || "")}">
              ${normalizedKey === "linkWithSpace" ? `<button type="button" class="cms-field__token-btn" data-action="insert-token" data-token="<IMG>" data-key="${key}" data-part="${field.name}">${translateStaticText("Insert <IMG>")}</button>` : ""}
              </div>
            `;
          }
        }
      }
    }
    
    return html;
  }

  /**
   * Get available keys for a section
   */
  getAvailableKeysForSection(section, allowedKeys, currentRow, sectionRows) {
    const normalizedKey = normalizeCmsKeyType(currentRow.key);
    const existingKeys = sectionRows.map(row => normalizeCmsKeyType(row.key));
    
    // Filter allowed keys
    const available = Array.from(allowedKeys).filter(key => {
      // Skip current key
      if (key === normalizedKey) return true;
      
      // Skip non-repeatable keys that already exist
      if (!isRepeatableKeyType(key) && existingKeys.includes(key)) {
        return false;
      }
      
      // Skip if at max repeatable limit
      if (isRepeatableKeyType(key) && existingKeys.filter(k => k === key).length >= getMaxRepeatableItems(key)) {
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
   * Attach event listeners
   */
  attachEventListeners() {
    // Key change handlers
    this.container.querySelectorAll(".cms-row__key-select").forEach(select => {
      select.addEventListener("change", (e) => this.handleKeyChange(e));
    });
    
    // Field value change handlers
    this.container.querySelectorAll(".cms-field__input").forEach(input => {
      input.addEventListener("input", (e) => this.handleFieldChange(e));
      input.addEventListener("change", (e) => this.handleFieldChange(e));
    });
    
    // Add row buttons
    this.container.querySelectorAll(".cms-editor__add-btn").forEach(btn => {
      btn.addEventListener("click", (e) => this.handleAddRow(e));
    });
    
    // Move/delete buttons
    this.container.querySelectorAll(".cms-row__action-btn").forEach(btn => {
      btn.addEventListener("click", (e) => this.handleActionClick(e));
    });
    
    // Token insertion buttons
    this.container.querySelectorAll(".cms-field__token-btn").forEach(btn => {
      btn.addEventListener("click", (e) => this.handleTokenInsert(e));
    });
    
    // Save button
    this.container.querySelector(".cms-editor__save-btn")?.addEventListener("click", () => this.handleSave());
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
    const row = rows.find(r => r._id === newRowId);
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
      const duplicateRows = rows.filter(r => 
        r._id !== newRowId && normalizeCmsKeyType(r.key) === newKey
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
    
    const row = rows.find(r => r._id === rowId);
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
   */
  showAddRowModal(section) {
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
    const allowedKeys = section === "program" ? PROGRAM_ALLOWED_KEYS : GENERAL_ALLOWED_KEYS;
    const existingKeys = sectionRows.map(row => normalizeCmsKeyType(row.key));
    
    for (const key of allowedKeys) {
      if (!existingKeys.includes(key) || isRepeatableKeyType(key)) {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = this.getFieldLabel(key);
        select.appendChild(option);
      }
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
      
      // Create new row
      const newRow = {
        key: newKey,
        value: "",
        _id: `${section}-${Date.now()}`
      };
      
      // Insert at appropriate position
      if (section === "program") {
        const insertIdx = this.getProgramInsertIndex(newKey);
        this.programRows.splice(insertIdx, 0, newRow);
      } else if (propertyName) {
        this[propertyName].push(newRow);
      }
      
      this.isDirty = true;
      this.refreshDirtyState();
      this.render();
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
    const direction = btn.dataset.direction;
    
    if (!section || !rowId) return;
    
    // Map section names to property names
    const sectionMap = { unitInfo: "unitRows", program: "programRows", general: "generalRows" };
    const propertyName = sectionMap[section];
    if (!propertyName) return;
    
    const rows = this[propertyName];
    const rowIdx = rows.findIndex(r => r._id === rowId);
    if (rowIdx === -1) return;
    
    if (direction === "up" && rowIdx > 0) {
      // Move up
      const temp = rows[rowIdx];
      rows[rowIdx] = rows[rowIdx - 1];
      rows[rowIdx - 1] = temp;
      this.isDirty = true;
      this.refreshDirtyState();
      this.render();
    } else if (direction === "down" && rowIdx < rows.length - 1) {
      // Move down
      const temp = rows[rowIdx];
      rows[rowIdx] = rows[rowIdx + 1];
      rows[rowIdx + 1] = temp;
      this.isDirty = true;
      this.refreshDirtyState();
      this.render();
    } else if (direction === "delete") {
      // Delete row
      if (!REQUIRED_PROGRAM_KEYS.includes(normalizeCmsKeyType(rows[rowIdx].key))) {
        rows.splice(rowIdx, 1);
        this.isDirty = true;
        this.refreshDirtyState();
        this.render();
      }
    }
  }

  /**
   * Handle token insertion
   */
  handleTokenInsert(event) {
    const btn = event.target;
    const token = btn.dataset.token;
    const key = btn.dataset.key;
    const part = btn.dataset.part;
    
    // Find the textarea associated with this button
    const textarea = btn.previousElementSibling;
    if (!textarea || textarea.tagName !== "TEXTAREA") return;
    
    // Insert token at cursor position
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    textarea.value = text.substring(0, start) + token + text.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + token.length, start + token.length);
    
    // Trigger change event
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /**
   * Handle save
   */
  handleSave() {
    // Validate before save
    const errors = this.validate();
    if (errors.length > 0) {
      this.showToast("Validation errors: " + errors.map(e => e.message).join(", "), "error");
      return;
    }
    
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
    const hasPresiding = this.programRows.some(row => normalizeCmsKeyType(row.key) === "presiding");
    const hasClosingPrayer = this.programRows.some(row => normalizeCmsKeyType(row.key) === "closingPrayer");
    
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
    
    // Check closingPrayer is last
    if (this.programRows.length > 0) {
      const lastKey = normalizeCmsKeyType(this.programRows[this.programRows.length - 1].key);
      if (lastKey !== "closingPrayer") {
        errors.push({ message: "closingPrayer should be the last row in program" });
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
    
    return errors;
  }

  /**
   * Check if a key is allowed in a section
   */
  isKeyAllowedInSection(key, section) {
    const normalizedKey = normalizeCmsKeyType(key);
    
    if (section === "unitInfo") {
      return UNIT_INFO_KEYS.includes(key) || UNIT_INFO_KEYS.includes(normalizedKey);
    } else if (section === "program") {
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
    
    for (const row of this.unitRows) {
      const value = parseFieldValue(row.key, row.value);
      allRows.push({
        key: row.key,
        value: serializeFieldValue(row.key, value)
      });
    }
    
    for (const row of this.programRows) {
      const value = parseFieldValue(row.key, row.value);
      allRows.push({
        key: row.key,
        value: serializeFieldValue(row.key, value)
      });
    }
    
    for (const row of this.generalRows) {
      const value = parseFieldValue(row.key, row.value);
      allRows.push({
        key: row.key,
        value: serializeFieldValue(row.key, value)
      });
    }
    
    return allRows;
  }

  /**
   * Get removed keys
   */
  getRemovedKeys() {
    const removedKeys = [];
    
    // Compare current rows with baseline
    const compareRows = (currentRows, baselineRows) => {
      const baselineKeys = new Set(baselineRows.map(r => r.key));
      const currentKeys = new Set(currentRows.map(r => r.key));
      
      for (const key of baselineKeys) {
        if (!currentKeys.has(key)) {
          removedKeys.push(key);
        }
      }
    };
    
    compareRows(this.unitRows, this.baselineUnitRows);
    compareRows(this.programRows, this.baselineProgramRows);
    compareRows(this.generalRows, this.baselineGeneralRows);
    
    return removedKeys;
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
    for (const row of this.baselineProgramRows) {
      baselineRows.push({ key: row.key, value: row.value });
    }
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
      const matchingRows = rows.filter(r => normalizeCmsKeyType(r.key) === mapping.key);
      
      if (index < matchingRows.length) {
        const targetRow = matchingRows[index];
        targetRow.value = serializeFieldValue(normalizedKey, value);
        this.isDirty = true;
        this.refreshDirtyState();
        this.render();
      } else if (index === matchingRows.length) {
        // Create new row at the end
        const maxIndex = matchingRows.reduce((max, r) => {
          const numMatch = r.key.match(/(\d+)$/);
          return numMatch ? Math.max(max, parseInt(numMatch[1], 10)) : max;
        }, 0);
        
        const newRowKey = `${normalizedKey}${maxIndex + 1}`;
        const newRow = { key: newRowKey, value: serializeFieldValue(normalizedKey, value) };
        rows.push(newRow);
        this.isDirty = true;
        this.refreshDirtyState();
        this.render();
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
          this.render();
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
    const existingRows = rows.filter(r => normalizeCmsKeyType(r.key) === normalizedKey);
    
    // Find next available index
    const maxIndex = existingRows.reduce((max, r) => {
      const numMatch = r.key.match(/(\d+)$/);
      return numMatch ? Math.max(max, parseInt(numMatch[1], 10)) : max;
    }, 0);
    
    const newRowKey = `${normalizedKey}${maxIndex + 1}`;
    this[mapping.section].push({ key: newRowKey, value: "" });
    this.isDirty = true;
    this.refreshDirtyState();
    this.render();
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
    const matchingRows = rows.filter(r => normalizeCmsKeyType(r.key) === normalizedKey);
    
    if (index < matchingRows.length) {
      const targetRow = matchingRows[index];
      targetRow.value = "";
      this.isDirty = true;
      this.refreshDirtyState();
      this.render();
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

  /**
   * Destroy the editor
   */
  destroy() {
    this.container.innerHTML = "";
  }
}

export default CmsEditor;
