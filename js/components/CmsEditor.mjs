import { ALLOWED_KEYS } from "../sanitize.js";
import { getLanguage, loadTranslations, t } from "../i18n/index.js";

// Keys that belong to Unit Information section (in display order)
const UNIT_INFO_KEYS = ["unitName", "stakeName", "obsolete", "migrationUrl", "unitAddress", "link", "date"];

// Required keys that must be preserved in the program section
const REQUIRED_PROGRAM_KEYS = ["presiding", "closingPrayer"];

// Convert ALLOWED_KEYS Set to sorted array for dropdown
const KEY_OPTIONS = Array.from(ALLOWED_KEYS).sort();

const CATEGORY_ORDER = [
  { id: "unit-info", title: "Unit Information", keys: ["unitName", "unitAddress", "stakeName", "date"] },
  { id: "conducting", title: "Conducting", keys: ["presiding", "conducting", "musicDirector", "musicOrganist"] },
  { id: "hymns", title: "Hymns", keys: ["openingHymn", "sacramentHymn", "intermediateHymn", "closingHymn", "hymn"] },
  { id: "prayers", title: "Prayers", keys: ["openingPrayer", "closingPrayer"] },
  { id: "speakers", title: "Speakers", keys: ["speaker"] },
  { id: "structural", title: "Structural", keys: ["horizontalLine", "sacramentLine", "oilLamp"] },
  { id: "leaders", title: "Leaders", keys: ["leader"] },
  { id: "statements-links", title: "Statements & Links", keys: ["generalStatement", "generalStatementWithLink", "link", "linkWithSpace"] },
  { id: "media", title: "Media", keys: ["photo", "migrationUrl", "obsolete"] },
  { id: "lessons", title: "Lessons", keys: ["lessonEQRS", "lessonSundaySchool", "lessonYouth", "lessonPrimary"] },
  { id: "agenda", title: "Agenda", keys: ["agendaGeneral", "agendaAnnouncements", "agendaAckVisitingLeaders", "agendaBusinessStake", "agendaBusinessReleases", "agendaBusinessCallings", "agendaBusinessPriesthood", "agendaBusinessNewMoveIns", "agendaBusinessNewConverts", "agendaBusinessGeneral"], optional: true }
];

function normalizeCmsKeyType(key) {
  if (!key) return key;
  return key.replace(/(\d+)$/, "");
}

function translateStaticText(text) {
  const translations = { "Required": "Required", "Optional": "Optional", "Unsaved changes": "Unsaved changes", "All changes saved": "All changes saved", "Add": "Add", "Remove": "Remove", "Insert Row": "Insert Row", "Delete Row": "Delete Row", "Move Up": "Move Up", "Move Down": "Move Down", "Unit Information": "Unit Information", "Sacrament Meeting Program": "Sacrament Meeting Program", "General Information": "General Information" };
  return translations[text] || text;
}

function translate(key, fallback) {
  if (typeof t === "function") return t(key) || fallback;
  return fallback;
}

function getFieldLabel(keyType) {
  const labels = { unitName: "Unit Name", stakeName: "Stake Name", unitAddress: "Address", date: "Date", presiding: "Presiding", conducting: "Conducting", musicDirector: "Music Director", musicOrganist: "Organist", openingHymn: "Opening Hymn", openingPrayer: "Opening Prayer", sacramentHymn: "Sacrament Hymn", closingHymn: "Closing Hymn", closingPrayer: "Closing Prayer", speaker: "Speaker", leader: "Leader", hymn: "Hymn", intermediateHymn: "Intermediate Hymn" };
  return labels[keyType] || keyType;
}

function getFieldDefinition(keyType) {
  const definitions = { unitName: { required: true, fields: [{ name: "text", type: "text", placeholder: "Ward/Branch name" }] }, stakeName: { fields: [{ name: "text", type: "text", placeholder: "Stake/District name" }] }, date: { required: true, fields: [{ name: "text", type: "text", placeholder: "Meeting date" }] }, presiding: { required: true, fields: [{ name: "text", type: "text", placeholder: "Full name" }] }, closingPrayer: { required: true, fields: [{ name: "text", type: "text", placeholder: "Full name" }] } };
  return definitions[keyType] || { fields: [{ name: "text", type: "text", placeholder: "Value" }] };
}

function parseFieldValue(keyType, value, options = {}) {
  if (!value) return { text: "", parts: [] };
  return { text: value, parts: [{ text: value, name: "text" }] };
}

function createEmptyValue(keyType) {
  return { text: "", parts: [] };
}

function sortConcreteRows(rows, keyType) {
  const order = { presiding: 1, conducting: 2, openingHymn: 3, openingPrayer: 4, sacramentHymn: 5, intermediateHymn: 6, closingHymn: 7, closingPrayer: 8 };
  return [...rows].sort((a, b) => {
    const aOrder = order[normalizeCmsKeyType(a.key)] ?? 999;
    const bOrder = order[normalizeCmsKeyType(b.key)] ?? 999;
    return aOrder - bOrder;
  });
}

// Parse rows into 3 sections: Unit Info, Program, General
function parseRowsIntoSections(rows) {
  const rowList = Array.isArray(rows) ? rows.map((row) => ({ key: row.key ?? "", value: row.value ?? "" })) : [];
  
  const unitInfoRows = [];
  const programRows = [];
  const generalRows = [];
  
  let currentSection = "unitInfo";
  let foundClosingPrayer = false;
  
  for (const row of rowList) {
    const key = row.key;
    const normalizedKey = normalizeCmsKeyType(key);
    
    if (currentSection === "unitInfo") {
      if (UNIT_INFO_KEYS.includes(key) || UNIT_INFO_KEYS.includes(normalizedKey)) {
        unitInfoRows.push({ ...row, originalIndex: unitInfoRows.length });
      } else {
        currentSection = "program";
        programRows.push({ ...row, originalIndex: programRows.length });
      }
    } else if (currentSection === "program") {
      if (key === "closingPrayer" || normalizedKey === "closingPrayer") {
        programRows.push({ ...row, originalIndex: programRows.length });
        foundClosingPrayer = true;
        currentSection = "general";
      } else {
        programRows.push({ ...row, originalIndex: programRows.length });
      }
    } else {
      generalRows.push({ ...row, originalIndex: generalRows.length });
    }
  }
  
  return { unitInfoRows, programRows, generalRows };
}

const FIELD_DEFINITIONS = {
  unitName: {
    required: true,
    fields: [{ name: "text", type: "text", placeholder: "Ward/Branch name" }]
  },
  unitAddress: {
    fields: [{ name: "text", type: "text", placeholder: "Meeting address" }]
  },
  stakeName: {
    fields: [{ name: "text", type: "text", placeholder: "Stake/District name" }]
  },
  date: {
    required: true,
    fields: [{ name: "text", type: "text", placeholder: "Meeting date" }]
  },
  presiding: {
    fields: [{ name: "text", type: "text", placeholder: "Full name" }],
    helpText: "Honorifics will be auto-translated"
  },
  conducting: {
    fields: [{ name: "text", type: "text", placeholder: "Full name" }],
    helpText: "Honorifics will be auto-translated"
  },
  musicDirector: {
    fields: [{ name: "text", type: "text", placeholder: "Full name" }]
  },
  musicOrganist: {
    fields: [{ name: "text", type: "text", placeholder: "Full name" }]
  },
  openingHymn: {
    required: true,
    fields: [
      { name: "hymnNumber", type: "text", placeholder: "e.g. 62" },
      { name: "titleOverride", type: "text", placeholder: "(optional) Custom title" }
    ]
  },
  sacramentHymn: {
    fields: [
      { name: "hymnNumber", type: "text", placeholder: "e.g. 62" },
      { name: "titleOverride", type: "text", placeholder: "(optional) Custom title" }
    ]
  },
  intermediateHymn: {
    repeatable: true,
    addLabel: "Add Intermediate Hymn",
    fields: [
      { name: "hymnNumber", type: "text", placeholder: "e.g. 62" },
      { name: "titleOverride", type: "text", placeholder: "(optional) Custom title" }
    ]
  },
  closingHymn: {
    fields: [
      { name: "hymnNumber", type: "text", placeholder: "e.g. 62" },
      { name: "titleOverride", type: "text", placeholder: "(optional) Custom title" }
    ]
  },
  hymn: {
    fields: [
      { name: "hymnNumber", type: "text", placeholder: "e.g. 62" },
      { name: "titleOverride", type: "text", placeholder: "(optional) Custom title" }
    ]
  },
  openingPrayer: {
    fields: [{ name: "text", type: "text", placeholder: "Full name" }],
    helpText: "Honorifics will be auto-translated"
  },
  closingPrayer: {
    fields: [{ name: "text", type: "text", placeholder: "Full name" }],
    helpText: "Honorifics will be auto-translated"
  },
  speaker: {
    repeatable: true,
    addLabel: "Add Speaker",
    fields: [
      { name: "name", type: "text", placeholder: "Name" },
      { name: "caption", type: "text", placeholder: "(Optional) Caption/topic" }
    ]
  },
  horizontalLine: {
    fields: [{ name: "text", type: "text", placeholder: "(Optional) Section label" }]
  },
  sacramentLine: {
    fields: [{ name: "text", type: "text", placeholder: "(Optional) Custom sacrament heading" }]
  },
  oilLamp: {
    fields: [{ name: "enabled", type: "checkbox", label: "Display oil lamp" }]
  },
  leader: {
    repeatable: true,
    addLabel: "Add Leader",
    fields: [
      { name: "name", type: "text", placeholder: "Name" },
      { name: "phone", type: "text", placeholder: "Phone (optional)" },
      { name: "calling", type: "text", placeholder: "Calling/Position (optional)" }
    ]
  },
  generalStatement: {
    fields: [{ name: "text", type: "textarea", placeholder: "Text" }]
  },
  generalStatementWithLink: {
    fields: [
      { name: "text", type: "textarea", placeholder: "Text with <LINK> placeholder" },
      { name: "url", type: "text", placeholder: "URL (https://...)" }
    ]
  },
  link: {
    fields: [
      { name: "text", type: "text", placeholder: "Display text" },
      { name: "url", type: "text", placeholder: "URL (https://...)" }
    ]
  },
  linkWithSpace: {
    fields: [
      { name: "includeImageIcon", type: "checkbox", label: "Include image icon" },
      { name: "text", type: "text", placeholder: "Display text" },
      { name: "url", type: "text", placeholder: "URL (https://...)" },
      { name: "imageUrl", type: "text", placeholder: "Image URL (optional, https://...)" }
    ]
  },
  photo: {
    fields: [
      { name: "url", type: "text", placeholder: "Image URL (https://...)" },
      { name: "caption", type: "text", placeholder: "(Optional) Caption" }
    ]
  },
  migrationUrl: {
    fields: [{ name: "text", type: "text", placeholder: "Migration URL" }]
  },
  obsolete: {
    fields: [{ name: "text", type: "text", placeholder: "Obsolete value" }]
  },
  lessonEQRS: {
    fields: [{ name: "text", type: "text", placeholder: "Lesson title or topic" }]
  },
  lessonSundaySchool: {
    fields: [{ name: "text", type: "text", placeholder: "Lesson title or topic" }]
  },
  lessonYouth: {
    fields: [{ name: "text", type: "text", placeholder: "Lesson title or topic" }]
  },
  lessonPrimary: {
    fields: [{ name: "text", type: "text", placeholder: "Lesson title or topic" }]
  },
  agendaGeneral: {
    fields: [{ name: "text", type: "textarea", placeholder: "General notes" }]
  },
  agendaAnnouncements: {
    repeatable: true,
    addLabel: "Add Announcement",
    fields: [{ name: "text", type: "text", placeholder: "Announcement" }]
  },
  agendaAckVisitingLeaders: {
    repeatable: true,
    addLabel: "Add Leader",
    fields: [{ name: "text", type: "text", placeholder: "Leader name" }]
  },
  agendaBusinessStake: {
    fields: [{ name: "text", type: "textarea", placeholder: "Stake business" }]
  },
  agendaBusinessReleases: {
    repeatable: true,
    addLabel: "Add Release",
    fields: [
      { name: "name", type: "text", placeholder: "Name" },
      { name: "calling", type: "text", placeholder: "Calling" }
    ]
  },
  agendaBusinessCallings: {
    repeatable: true,
    addLabel: "Add Calling",
    fields: [
      { name: "name", type: "text", placeholder: "Name" },
      { name: "calling", type: "text", placeholder: "Calling" }
    ]
  },
  agendaBusinessPriesthood: {
    fields: [{ name: "text", type: "textarea", placeholder: "Priesthood business" }]
  },
  agendaBusinessNewMoveIns: {
    repeatable: true,
    addLabel: "Add Move-In",
    fields: [{ name: "text", type: "text", placeholder: "Name" }]
  },
  agendaBusinessNewConverts: {
    repeatable: true,
    addLabel: "Add Convert",
    fields: [{ name: "text", type: "text", placeholder: "Name" }]
  },
  agendaBusinessGeneral: {
    fields: [{ name: "text", type: "textarea", placeholder: "Other business" }]
  }
};

const STATIC_TEXT_KEYS = {
  "Unit Information": "cms.category.unitInfo",
  Conducting: "cms.category.conducting",
  Hymns: "cms.category.hymns",
  Prayers: "cms.category.prayers",
  Speakers: "cms.category.speakers",
  Structural: "cms.category.structural",
  Leaders: "cms.category.leaders",
  "Statements & Links": "cms.category.statementsLinks",
  Media: "cms.category.media",
  Lessons: "cms.category.lessons",
  Agenda: "cms.category.agenda",
  "Unit Name": "cms.label.unitName",
  "Unit Address": "cms.label.unitAddress",
  "Stake Name": "cms.label.stakeName",
  Date: "cms.label.date",
  "Horizontal Line": "cms.label.horizontalLine",
  "Sacrament Line": "cms.label.sacramentLine",
  "Oil Lamp": "cms.label.oilLamp",
  "General Statement": "cms.label.generalStatement",
  "General Statement With Link": "cms.label.generalStatementWithLink",
  Link: "cms.label.link",
  "Link With Space": "cms.label.linkWithSpace",
  Photo: "cms.label.photo",
  "Migration URL": "cms.label.migrationUrl",
  Obsolete: "cms.label.obsolete",
  Required: "cms.badge.required",
  Optional: "cms.badge.optional",
  "Unsaved changes": "cms.status.unsaved",
  "All changes saved": "cms.status.saved",
  "Ward/Branch name": "cms.input.wardBranchName",
  "Meeting address": "cms.input.meetingAddress",
  "Stake/District name": "cms.input.stakeDistrictName",
  "Meeting date": "cms.input.meetingDate",
  "Full name": "cms.input.fullName",
  "Honorifics will be auto-translated": "cms.help.honorificAutoTranslated",
  "e.g. 62": "cms.input.exampleHymnNumber",
  "(optional) Custom title": "cms.input.optionalCustomTitle",
  "Add Intermediate Hymn": "cms.action.addIntermediateHymn",
  "Add Speaker": "cms.action.addSpeaker",
  "Insert Link Placeholder": "cms.action.insertLinkPlaceholder",
  Name: "cms.input.name",
  "(Optional) Caption/topic": "cms.input.optionalCaptionTopic",
  "(Optional) Section label": "cms.input.optionalSectionLabel",
  "(Optional) Custom sacrament heading": "cms.input.optionalSacramentHeading",
  "Display oil lamp": "cms.input.displayOilLamp",
  "Phone (optional)": "cms.input.optionalPhone",
  "Calling/Position (optional)": "cms.input.optionalCallingPosition",
  Text: "cms.input.text",
  "Text with <LINK> placeholder": "cms.input.textWithLinkPlaceholder",
  "URL (https://...)": "cms.input.url",
  "Display text": "cms.input.displayText",
  "Include image icon": "cms.input.includeImageIcon",
  "Image URL (optional, https://...)": "cms.input.optionalImageUrl",
  "Image URL (https://...)": "cms.input.imageUrl",
  "(Optional) Caption": "cms.input.optionalCaption",
  "Lesson title or topic": "cms.input.lessonTitleOrTopic",
  "General notes": "cms.input.generalNotes",
  "Add Announcement": "cms.action.addAnnouncement",
  Announcement: "cms.input.announcement",
  "Add Leader": "cms.action.addLeader",
  "Leader name": "cms.input.leaderName",
  "Stake business": "cms.input.stakeBusiness",
  "Add Release": "cms.action.addRelease",
  Calling: "cms.input.calling",
  "Add Calling": "cms.action.addCalling",
  "Priesthood business": "cms.input.priesthoodBusiness",
  "Add Move-In": "cms.action.addMoveIn",
  "Add Convert": "cms.action.addConvert",
  "Other business": "cms.input.otherBusiness"
};

const LABEL_MAP = {
  musicOrganist: () => t("organist"),
  unitName: () => "Unit Name",
  unitAddress: () => "Unit Address",
  stakeName: () => "Stake Name",
  date: () => "Date",
  horizontalLine: () => "Horizontal Line",
  sacramentLine: () => "Sacrament Line",
  oilLamp: () => "Oil Lamp",
  generalStatement: () => "General Statement",
  generalStatementWithLink: () => "General Statement With Link",
  link: () => "Link",
  linkWithSpace: () => "Link With Space",
  photo: () => "Photo",
  migrationUrl: () => "Migration URL",
  obsolete: () => "Obsolete"
};

let translationsReady = false;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getFieldsForKeyType(keyType) {
  const normalizedKeyType = normalizeCmsKeyType(keyType);
  const definition = FIELD_DEFINITIONS[normalizedKeyType];
  if (!definition) {
    throw new Error(`CmsEditor: unsupported key type "${keyType}"`);
  }
  return clone(definition.fields);
}

export function sanitisePart(str) {
  return String(str ?? "")
    .replaceAll("|", "")
    .trim();
}

export function serializeFieldValue(keyType, value = {}) {
  const normalizedKeyType = normalizeCmsKeyType(keyType);
  switch (normalizedKeyType) {
    case "openingHymn":
    case "sacramentHymn":
    case "intermediateHymn":
    case "closingHymn":
    case "hymn":
      return joinParts([sanitisePart(value.hymnNumber), sanitisePart(value.titleOverride)]);
    case "speaker":
      return joinParts([sanitisePart(value.name), sanitisePart(value.caption)]);
    case "leader":
      return joinParts([
        sanitisePart(value.name),
        sanitisePart(value.phone),
        sanitisePart(value.calling)
      ]);
    case "generalStatementWithLink":
      return joinParts([sanitisePart(value.text), sanitisePart(value.url)]);
    case "link":
      return joinParts([sanitisePart(value.text), sanitisePart(value.url)]);
    case "linkWithSpace": {
      const text = sanitisePart(value.text);
      const textWithImg = value.includeImageIcon ? `<IMG> ${text}`.trim() : text;
      return joinParts([textWithImg, sanitisePart(value.url), sanitisePart(value.imageUrl)]);
    }
    case "photo":
      return joinParts([sanitisePart(value.url), sanitisePart(value.caption)]);
    case "oilLamp":
      return value.enabled ? "" : "";
    default:
      return sanitisePart(value.text);
  }
}

function splitParts(raw) {
  return String(raw ?? "")
    .split("|")
    .map((part) => part.trim());
}

function joinParts(parts) {
  return parts.filter((part) => part).join("|");
}

function isValueEmpty(keyType, value) {
  const normalizedKeyType = normalizeCmsKeyType(keyType);
  if (normalizedKeyType === "oilLamp") {
    return !value.enabled;
  }

  return !serializeFieldValue(normalizedKeyType, value);
}

function isRepeatableKeyType(keyType) {
  return getFieldDefinition(keyType).repeatable === true;
}

function isNumberedRepeatableKeyType(keyType) {
  return ["speaker", "intermediateHymn", "leader"].includes(keyType);
}

function getConcreteKeyForNewItem(keyType, existingKeys, nextOrdinal) {
  if (isNumberedRepeatableKeyType(keyType)) {
    return `${keyType}${nextOrdinal}`;
  }
  return existingKeys[nextOrdinal - 1] ?? keyType;
}

function getTrailingNumber(key) {
  const match = /(\d+)$/.exec(key);
  return match ? Number(match[1]) : 0;
}

function buildFieldGroups(rows, includeAgenda) {
  const rowList = Array.isArray(rows)
    ? rows.map((row) => ({ key: row.key, value: row.value ?? "" }))
    : [];
  const categories = CATEGORY_ORDER.filter((category) => includeAgenda || category.id !== "agenda");

  return categories.map((category) => ({
    ...category,
    fields: category.keys.map((keyType) => {
      const matchingRows = sortConcreteRows(
        rowList.filter((row) => normalizeCmsKeyType(row.key) === keyType),
        keyType
      );

      const items =
        matchingRows.length > 0
          ? matchingRows.map((row) => ({
              key: row.key,
              value: parseFieldValue(keyType, row.value, { rowExists: true })
            }))
          : [{ key: null, value: createEmptyValue(keyType) }];

      return {
        keyType,
        label: getFieldLabel(keyType),
        definition: getFieldDefinition(keyType),
        removedKeys: [],
        items
      };
    })
  }));
}

function flattenGroups(groups) {
  return groups.flatMap((category) => category.fields);
}

function cloneGroups(groups) {
  return clone(groups);
}

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

    this.groups = [];
    this.baselineGroups = [];
    this.isDirty = false;
  }

  initialize(rows = [], { includeAgenda = this.options.includeAgenda } = {}) {
    this.groups = buildFieldGroups(rows, includeAgenda);
    this.baselineGroups = cloneGroups(this.groups);
    this.isDirty = false;
    this.render();
  }

  render() {
    this.container.innerHTML = this.renderHtml();
    this.attachEventListeners();
  }

  renderHtml() {
    return `
      <div class="cms-editor">
        <div class="cms-editor__nav">
          ${this.groups.map((group, index) => `
            <button type="button" class="cms-editor__nav-item ${index === this.activeGroupIndex ? 'cms-editor__nav-item--active' : ''}" data-group-index="${index}">
              ${translateStaticText(group.title)}
            </button>
          `).join("")}
        </div>
        <div class="cms-editor__content">
          ${this.renderActiveGroup()}
        </div>
        <div class="cms-editor__status"></div>
      </div>
    `;
  }

  renderActiveGroup() {
    const group = this.groups[this.activeGroupIndex];
    if (!group) return "";

    return `
      <div class="cms-editor__group">
        <h3 class="cms-editor__group-title">${translateStaticText(group.title)}</h3>
        ${group.fields.map(field => this.renderField(field)).join("")}
      </div>
    `;
  }

  renderField(field) {
    const fieldLabel = getFieldLabel(field.keyType);
    const canAdd = field.definition.repeatable && field.items.length < MAX_REPEATABLE_ITEMS[field.keyType];
    const canRemove = field.definition.repeatable && field.items.length > 1;

    return `
      <div class="cms-editor__field" data-key-type="${field.keyType}">
        <div class="cms-editor__field-header">
          <span class="cms-editor__field-label">${fieldLabel}</span>
          ${canAdd ? `<button type="button" class="cms-editor__add-btn" data-action="add-item" data-key-type="${field.keyType}">+ ${translateStaticText("Add")}</button>` : ""}
        </div>
        <div class="cms-editor__field-items">
          ${field.items.map((item, itemIndex) => this.renderFieldItem(field, item, itemIndex)).join("")}
        </div>
      </div>
    `;
  }

  renderFieldItem(field, item, itemIndex) {
    const value = item.value ?? createEmptyValue(field.keyType);
    const canRemove = field.definition.repeatable && field.items.length > 1 && item.key === null;

    return `
      <div class="cms-editor__field-item" data-key-type="${field.keyType}" data-item-index="${itemIndex}">
        ${field.definition.fields.map(part => this.renderInput(field.keyType, itemIndex, part, value)).join("")}
        ${canRemove ? `<button type="button" class="cms-editor__remove-btn" data-action="remove-item" data-key-type="${field.keyType}" data-item-index="${itemIndex}">✕</button>` : ""}
      </div>
    `;
  }

  renderInput(keyType, itemIndex, part, value) {
    const inputId = `${keyType}-${itemIndex}-${part.name}`;
    const prompt = translateStaticText(part.label || part.placeholder || "");

    if (part.type === "textarea") {
      return `
        <label class="cms-editor__input-label" for="${inputId}">${prompt}</label>
        <textarea id="${inputId}" class="cms-editor__input cms-editor__textarea" data-key-type="${keyType}" data-item-index="${itemIndex}" data-part-name="${part.name}">${this.escapeHtml(value[part.name] ?? "")}</textarea>
      `;
    }

    if (part.type === "checkbox") {
      return `
        <label class="cms-editor__checkbox-label" for="${inputId}">
          <input id="${inputId}" type="checkbox" class="cms-editor__checkbox" data-key-type="${keyType}" data-item-index="${itemIndex}" data-part-name="${part.name}" ${value[part.name] ? "checked" : ""}>
          <span>${prompt}</span>
        </label>
      `;
    }

    return `
      <label class="cms-editor__input-label" for="${inputId}">${prompt}</label>
      <input id="${inputId}" type="text" class="cms-editor__input" data-key-type="${keyType}" data-item-index="${itemIndex}" data-part-name="${part.name}" value="${this.escapeHtml(value[part.name] ?? "")}">
    `;
  }

  attachEventListeners() {
    this.container.querySelectorAll(".cms-editor__nav-item").forEach((button) => {
      button.addEventListener("click", () => {
        this.activeGroupIndex = parseInt(button.dataset.groupIndex);
        this.render();
      });
    });

    this.container.querySelectorAll(".cms-editor__input, .cms-editor__textarea, .cms-editor__checkbox").forEach((element) => {
      element.addEventListener("input", (event) => this.handleValueChange(event));
      element.addEventListener("change", (event) => this.handleValueChange(event));
    });

    this.container.querySelectorAll("[data-action='add-item']").forEach((button) => {
      button.addEventListener("click", () => {
        this.addRepeatableItem(button.dataset.keyType);
      });
    });

    this.container.querySelectorAll("[data-action='remove-item']").forEach((button) => {
      button.addEventListener("click", () => {
        this.removeRepeatableItem(button.dataset.keyType, parseInt(button.dataset.itemIndex));
      });
    });
  }

  handleValueChange(event) {
    const keyType = event.target.dataset.keyType;
    const itemIndex = parseInt(event.target.dataset.itemIndex);
    const partName = event.target.dataset.partName;
    const newValue = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    this.setPartValue(keyType, itemIndex, partName, newValue);
  }

  setPartValue(keyType, itemIndex, partName, newValue) {
    const field = this.findField(keyType);
    if (!field) return;
    if (!field.items[itemIndex].value) {
      field.items[itemIndex].value = createEmptyValue(keyType);
    }
    field.items[itemIndex].value[partName] = newValue;
    this.refreshDirtyState();
  }

  addRepeatableItem(keyType) {
    const field = this.findField(keyType);
    if (!field || !field.definition.repeatable) return;
    field.items.push({ key: null, value: createEmptyValue(keyType) });
    this.refreshDirtyState();
    this.render();
  }

  removeRepeatableItem(keyType, itemIndex) {
    const field = this.findField(keyType);
    if (!field) return;
    if (field.items[itemIndex].key) {
      field.removedKeys = field.removedKeys || [];
      field.removedKeys.push(field.items[itemIndex].key);
    }
    if (field.items.length > 1) {
      field.items.splice(itemIndex, 1);
    }
    this.refreshDirtyState();
    this.render();
  }

  findField(keyType) {
    return flattenGroups(this.groups).find((field) => field.keyType === keyType) ?? null;
  }

  refreshDirtyState() {
    this.isDirty = JSON.stringify(this.getRows()) !== JSON.stringify(this.getBaselineRows());
    const status = this.container.querySelector(".cms-editor__status");
    if (status) {
      if (this.isDirty) {
        status.textContent = translateStaticText("Unsaved changes");
        status.classList.remove("cms-editor__status--saved");
      } else {
        status.textContent = translateStaticText("All changes saved");
        status.classList.add("cms-editor__status--saved");
        if (this.statusTimeout) {
          clearTimeout(this.statusTimeout);
        }
        this.statusTimeout = setTimeout(() => {
          status.textContent = "";
          status.classList.remove("cms-editor__status--saved");
        }, 10000);
      }
    }
    if (typeof this.options.onChangeCallback === "function") {
      this.options.onChangeCallback(this.getState());
    }
  }

  getRows() {
    const rows = [];
    for (const field of flattenGroups(this.groups)) {
      const trackedKeys = [
        ...field.items.filter((item) => item.key).map((item) => item.key),
        ...(field.removedKeys ?? [])
      ];
      let nextOrdinal = Math.max(0, ...trackedKeys.map(getTrailingNumber)) + 1;

      field.items.forEach((item) => {
        const serialized = serializeFieldValue(field.keyType, item.value);
        const originalKey = item.key;

        if (originalKey) {
          rows.push({ key: originalKey, value: serialized });
          return;
        }

        if (isValueEmpty(field.keyType, item.value)) {
          return;
        }

        if (isRepeatableKeyType(field.keyType)) {
          const newKey = getConcreteKeyForNewItem(field.keyType, trackedKeys, nextOrdinal);
          trackedKeys.push(newKey);
          rows.push({ key: newKey, value: serialized });
          nextOrdinal++;
        }
      });
    }
    return rows;
  }

  getBaselineRows() {
    const rows = [];
    for (const field of flattenGroups(this.baselineGroups)) {
      const trackedKeys = [
        ...field.items.filter((item) => item.key).map((item) => item.key),
        ...(field.removedKeys ?? [])
      ];
      let nextOrdinal = Math.max(0, ...trackedKeys.map(getTrailingNumber)) + 1;

      field.items.forEach((item) => {
        const serialized = serializeFieldValue(field.keyType, item.value);
        const originalKey = item.key;

        if (originalKey) {
          rows.push({ key: originalKey, value: serialized });
          return;
        }

        if (isValueEmpty(field.keyType, item.value)) {
          return;
        }

        if (isRepeatableKeyType(field.keyType)) {
          const newKey = getConcreteKeyForNewItem(field.keyType, trackedKeys, nextOrdinal);
          trackedKeys.push(newKey);
          rows.push({ key: newKey, value: serialized });
          nextOrdinal++;
        }
      });
    }
    return rows;
  }

  getRemovedKeys() {
    const removedKeys = [];
    for (const field of flattenGroups(this.groups)) {
      const baselineField = flattenGroups(this.baselineGroups).find((f) => f.keyType === field.keyType);
      if (!baselineField) continue;
      const baselineKeys = baselineField.items.filter((item) => item.key).map((item) => item.key);
      const currentKeys = field.items.filter((item) => item.key).map((item) => item.key);

      for (const key of baselineKeys) {
        if (!currentKeys.includes(key)) {
          removedKeys.push(key);
        }
      }

      if (field.removedKeys) {
        removedKeys.push(...field.removedKeys);
      }
    }
    return removedKeys;
  }

  getState() {
    return {
      rows: this.getRows(),
      removedKeys: this.getRemovedKeys(),
      isDirty: this.isDirty
    };
  }

  discardChanges() {
    this.groups = cloneGroups(this.baselineGroups);
    this.isDirty = false;
    this.render();
  }

  destroy() {
    this.container.innerHTML = "";
  }

  escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}


export default CmsEditor;
