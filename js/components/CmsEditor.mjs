import { ALLOWED_KEYS } from "../sanitize.js";
import { getLanguage, loadTranslations, t } from "../i18n/index.js";

const CATEGORY_ORDER = [
  {
    id: "unit-info",
    title: "Unit Information",
    keys: ["unitName", "unitAddress", "stakeName", "date"]
  },
  {
    id: "conducting",
    title: "Conducting",
    keys: ["presiding", "conducting", "musicDirector", "musicOrganist"]
  },
  {
    id: "hymns",
    title: "Hymns",
    keys: ["openingHymn", "sacramentHymn", "intermediateHymn", "closingHymn", "hymn"]
  },
  {
    id: "prayers",
    title: "Prayers",
    keys: ["openingPrayer", "closingPrayer"]
  },
  {
    id: "speakers",
    title: "Speakers",
    keys: ["speaker"]
  },
  {
    id: "structural",
    title: "Structural",
    keys: ["horizontalLine", "sacramentLine", "oilLamp"]
  },
  {
    id: "leaders",
    title: "Leaders",
    keys: ["leader"]
  },
  {
    id: "statements-links",
    title: "Statements & Links",
    keys: ["generalStatement", "generalStatementWithLink", "link", "linkWithSpace"]
  },
  {
    id: "media",
    title: "Media",
    keys: ["photo", "migrationUrl", "obsolete"]
  },
  {
    id: "lessons",
    title: "Lessons",
    keys: ["lessonEQRS", "lessonSundaySchool", "lessonYouth", "lessonPrimary"]
  },
  {
    id: "agenda",
    title: "Agenda",
    keys: [
      "agendaGeneral",
      "agendaAnnouncements",
      "agendaAckVisitingLeaders",
      "agendaBusinessStake",
      "agendaBusinessReleases",
      "agendaBusinessCallings",
      "agendaBusinessPriesthood",
      "agendaBusinessNewMoveIns",
      "agendaBusinessNewConverts",
      "agendaBusinessGeneral"
    ],
    optional: true
  }
];

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

function translateStaticText(text) {
  if (!text) {
    return text;
  }

  const translationKey = STATIC_TEXT_KEYS[text];
  return translationKey ? translate(translationKey, text) : text;
}

function translate(key, fallback = key) {
  if (!translationsReady) {
    loadTranslations(getLanguage());
    translationsReady = true;
  }

  const translated = t(key);
  return translated === key ? fallback : translated;
}

export function normalizeCmsKeyType(key) {
  if (/^speaker\d+$/i.test(key)) return "speaker";
  if (/^intermediatehymn\d+$/i.test(key)) return "intermediateHymn";
  if (/^leader\d+$/i.test(key)) return "leader";
  return key;
}

export function getFieldsForKeyType(keyType) {
  const normalizedKeyType = normalizeCmsKeyType(keyType);
  const definition = FIELD_DEFINITIONS[normalizedKeyType];
  if (!definition) {
    throw new Error(`CmsEditor: unsupported key type \"${keyType}\"`);
  }
  return clone(definition.fields);
}

export function sanitisePart(str) {
  return String(str ?? "")
    .replaceAll("|", "")
    .trim();
}

function getFieldDefinition(keyType) {
  return FIELD_DEFINITIONS[normalizeCmsKeyType(keyType)];
}

function getFieldLabel(keyType) {
  const normalizedKeyType = normalizeCmsKeyType(keyType);
  if (LABEL_MAP[normalizedKeyType]) {
    return translateStaticText(LABEL_MAP[normalizedKeyType]());
  }

  return translate(
    normalizedKeyType,
    normalizedKeyType
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim()
  );
}

function createEmptyValue(keyType) {
  const definition = getFieldDefinition(keyType);
  return Object.fromEntries(
    definition.fields.map((field) => [field.name, field.type === "checkbox" ? false : ""])
  );
}

function splitParts(raw) {
  return String(raw ?? "")
    .split("|")
    .map((part) => part.trim());
}

function joinParts(parts) {
  const normalized = [...parts];
  while (normalized.length > 0 && !normalized[normalized.length - 1]) {
    normalized.pop();
  }
  return normalized.join(" | ");
}

export function parseFieldValue(keyType, raw = "", { rowExists = false } = {}) {
  const normalizedKeyType = normalizeCmsKeyType(keyType);
  const parts = splitParts(raw);

  switch (normalizedKeyType) {
    case "openingHymn":
    case "sacramentHymn":
    case "intermediateHymn":
    case "closingHymn":
    case "hymn":
      return { hymnNumber: parts[0] ?? "", titleOverride: parts[1] ?? "" };
    case "speaker":
      return { name: parts[0] ?? "", caption: parts[1] ?? "" };
    case "leader":
      return { name: parts[0] ?? "", phone: parts[1] ?? "", calling: parts[2] ?? "" };
    case "generalStatementWithLink":
      return { text: parts[0] ?? "", url: parts[1] ?? "" };
    case "link":
      return { text: parts[0] ?? "", url: parts[1] ?? "" };
    case "linkWithSpace": {
      const textRaw = parts[0] ?? "";
      return {
        includeImageIcon: /<IMG>/i.test(textRaw),
        text: textRaw.replace(/<IMG>/gi, "").trim(),
        url: parts[1] ?? "",
        imageUrl: parts[2] ?? ""
      };
    }
    case "photo":
      return { url: parts[0] ?? "", caption: parts[1] ?? "" };
    case "oilLamp":
      return { enabled: rowExists };
    default:
      return { text: String(raw ?? "") };
  }
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

function sortConcreteRows(rows, keyType) {
  if (isNumberedRepeatableKeyType(keyType)) {
    return [...rows].sort(
      (left, right) => getTrailingNumber(left.key) - getTrailingNumber(right.key)
    );
  }
  return rows;
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
    this.activeSectionId = CATEGORY_ORDER[0].id;
    this._stylesInjected = false;
  }

  initialize(rows = [], { includeAgenda = this.options.includeAgenda } = {}) {
    this.groups = buildFieldGroups(rows, includeAgenda);
    this.baselineGroups = cloneGroups(this.groups);
    this.isDirty = false;
    this.activeSectionId = this.groups[0]?.id ?? CATEGORY_ORDER[0].id;
    this.render();
  }

  render() {
    this.injectStyles();
    const navHtml = this.groups
      .map((category) => {
        const activeClass = category.id === this.activeSectionId ? " is-active" : "";
        return `<button type="button" class="cms-editor__nav-item${activeClass}" data-section-id="${category.id}">${category.title}</button>`;
      })
      .join("");

    const sectionsHtml = this.groups.map((category) => this.renderCategory(category)).join("");

    this.container.innerHTML = `
      <div class="cms-editor">
        <aside class="cms-editor__nav">${navHtml}</aside>
        <div class="cms-editor__content">
          <div class="cms-editor__status">${translateStaticText(this.isDirty ? "Unsaved changes" : "All changes saved")}</div>
          ${sectionsHtml}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderCategory(category) {
    const fieldsHtml = category.fields.map((field) => this.renderField(field)).join("");
    return `
      <section class="cms-editor__section" data-section-id="${category.id}">
        <h2 class="cms-editor__section-title">${translateStaticText(category.title)}</h2>
        ${fieldsHtml}
      </section>
    `;
  }

  renderField(field) {
    const badge = translateStaticText(field.definition.required ? "Required" : "Optional");
    const helpHtml = field.definition.helpText
      ? `<p class="cms-editor__field-help">${translateStaticText(field.definition.helpText)}</p>`
      : "";
    const itemsHtml = field.items
      .map((item, index) => this.renderFieldItem(field, item, index))
      .join("");
    const addButtonHtml = field.definition.repeatable
      ? `<button type="button" class="cms-editor__add-item" data-action="add-item" data-key-type="${field.keyType}">${translateStaticText(field.definition.addLabel || `${translate("add", "Add")} ${field.label}`)}</button>`
      : "";

    return `
      <div class="cms-editor__field" data-key-type="${field.keyType}">
        <div class="cms-editor__field-header">
          <div>
            <h3 class="cms-editor__field-title">${field.label}</h3>
            ${helpHtml}
          </div>
          <span class="cms-editor__badge">${badge}</span>
        </div>
        <div class="cms-editor__field-items">${itemsHtml}</div>
        ${addButtonHtml}
      </div>
    `;
  }

  renderFieldItem(field, item, itemIndex) {
    const inputsHtml = field.definition.fields
      .map((part) => this.renderInput(field.keyType, item.value, part, itemIndex))
      .join("");
    const removeButton = field.definition.repeatable
      ? `<button type="button" class="cms-editor__remove-item" data-action="remove-item" data-key-type="${field.keyType}" data-item-index="${itemIndex}">${translate("remove", "Remove")}</button>`
      : "";

    return `
      <div class="cms-editor__field-item" data-item-index="${itemIndex}">
        ${inputsHtml}
        ${removeButton}
      </div>
    `;
  }

  renderInput(keyType, value, part, itemIndex) {
    const inputId = `${keyType}-${itemIndex}-${part.name}`;
    const prompt = translateStaticText(part.label || part.placeholder || "");
    if (part.type === "textarea") {
      const insertTokenButton =
        keyType === "generalStatementWithLink" && part.name === "text"
          ? `<button type="button" class="cms-editor__insert-token" data-action="insert-token" data-key-type="${keyType}" data-item-index="${itemIndex}" data-part-name="${part.name}" data-token="<LINK>">${translateStaticText("Insert Link Placeholder")}</button>`
          : "";
      return `
        <label class="cms-editor__input-label" for="${inputId}">${prompt}</label>
        <textarea id="${inputId}" class="cms-editor__input cms-editor__textarea" data-key-type="${keyType}" data-item-index="${itemIndex}" data-part-name="${part.name}">${this.escapeHtml(value[part.name] ?? "")}</textarea>
        ${insertTokenButton}
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
        this.activeSectionId = button.dataset.sectionId;
        this.render();
      });
    });

    this.container
      .querySelectorAll(".cms-editor__input, .cms-editor__textarea, .cms-editor__checkbox")
      .forEach((element) => {
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
        this.removeRepeatableItem(button.dataset.keyType, Number(button.dataset.itemIndex));
      });
    });

    this.container.querySelectorAll("[data-action='insert-token']").forEach((button) => {
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      button.addEventListener("click", () => {
        this.insertToken(
          button.dataset.keyType,
          Number(button.dataset.itemIndex),
          button.dataset.partName,
          button.dataset.token
        );
      });
    });
  }

  handleValueChange(event) {
    const element = event.currentTarget;
    const keyType = element.dataset.keyType;
    const itemIndex = Number(element.dataset.itemIndex);
    const partName = element.dataset.partName;
    const value = element.type === "checkbox" ? element.checked : element.value;
    this.setPartValue(keyType, itemIndex, partName, value);
  }

  setPartValue(keyType, itemIndex, partName, value) {
    const field = this.findField(keyType);
    if (!field) return;
    const item = field.items[itemIndex];
    const oldValue = { ...item.value };
    item.value[partName] = value;
    const serialized = serializeFieldValue(field.keyType, item.value);
    if (item.key && !serialized && isValueEmpty(field.keyType, item.value)) {
      field.removedKeys = Array.from(new Set([...(field.removedKeys ?? []), item.key]));
      item.key = null;
    }
    this.refreshDirtyState();
  }

  setItemValue(keyType, itemIndex, value) {
    const field = this.findField(keyType);
    if (!field) {
      throw new Error(`CmsEditor: unknown field \"${keyType}\"`);
    }
    field.items[itemIndex].value = clone(value);
    this.refreshDirtyState();
  }

  insertToken(keyType, itemIndex, partName, token) {
    const textarea = this.container.querySelector(
      `.cms-editor__textarea[data-key-type="${keyType}"][data-item-index="${itemIndex}"][data-part-name="${partName}"]`
    );
    if (!textarea) return;

    const currentValue = textarea.value ?? "";
    const tokenValue = token ?? "";
    const start = textarea.selectionStart ?? currentValue.length;
    const end = textarea.selectionEnd ?? start;
    const nextValue = `${currentValue.slice(0, start)}${tokenValue}${currentValue.slice(end)}`;

    textarea.value = nextValue;
    textarea.focus();
    textarea.setSelectionRange(start + tokenValue.length, start + tokenValue.length);
    this.setPartValue(keyType, itemIndex, partName, nextValue);
  }

  addRepeatableItem(keyType) {
    const field = this.findField(keyType);
    if (!field?.definition.repeatable) return;
    field.items.push({ key: null, value: createEmptyValue(keyType) });
    this.refreshDirtyState();
    this.render();
  }

  removeRepeatableItem(keyType, itemIndex) {
    const field = this.findField(keyType);
    if (!field?.definition.repeatable) return;
    const item = field.items[itemIndex];
    if (!item) return;

    if (item.key) {
      field.removedKeys = Array.from(new Set([...(field.removedKeys ?? []), item.key]));
      field.items.splice(itemIndex, 1);
    } else if (field.items.length === 1) {
      field.items[0].value = createEmptyValue(keyType);
    } else {
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
      status.textContent = translateStaticText(
        this.isDirty ? "Unsaved changes" : "All changes saved"
      );
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
          nextOrdinal += 1;
          return;
        }

        rows.push({ key: field.keyType, value: serialized });
      });

      for (const removedKey of field.removedKeys ?? []) {
        rows.push({ key: removedKey, value: "" });
      }
    }

    return rows;
  }

  getBaselineRows() {
    const currentGroups = this.groups;
    this.groups = cloneGroups(this.baselineGroups);
    const baselineRows = this.getRows();
    this.groups = currentGroups;
    return baselineRows;
  }

  getState() {
    return {
      rows: this.getRows(),
      isDirty: this.isDirty,
      activeSectionId: this.activeSectionId
    };
  }

  getRemovedKeys() {
    const removedKeys = [];
    for (const group of this.groups) {
      for (const field of group.fields) {
        const fieldRemovedKeys = field.removedKeys ?? [];
        removedKeys.push(...fieldRemovedKeys);
      }
    }
    return removedKeys;
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

  injectStyles() {
    if (this._stylesInjected || document.getElementById("cms-editor-styles")) {
      this._stylesInjected = true;
      return;
    }

    const style = document.createElement("style");
    style.id = "cms-editor-styles";
    style.textContent = `
      .cms-editor {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 1rem;
      }
      .cms-editor__nav {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        position: sticky;
        top: 1rem;
        align-self: start;
      }
      .cms-editor__nav-item {
        border: 1px solid #d0d7de;
        background: #fff;
        border-radius: 0.75rem;
        padding: 0.75rem 1rem;
        text-align: left;
        cursor: pointer;
      }
      .cms-editor__nav-item.is-active {
        border-color: #0969da;
        background: #eef6ff;
      }
      .cms-editor__content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .cms-editor__status {
        font-weight: 600;
      }
      .cms-editor__section {
        border: 1px solid #d0d7de;
        border-radius: 1rem;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .cms-editor__field {
        border-top: 1px solid #eaeef2;
        padding-top: 1rem;
      }
      .cms-editor__field:first-of-type {
        border-top: none;
        padding-top: 0;
      }
      .cms-editor__field-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: start;
      }
      .cms-editor__badge {
        background: #eef2ff;
        border-radius: 999px;
        padding: 0.25rem 0.75rem;
        font-size: 0.85rem;
      }
      .cms-editor__field-items,
      .cms-editor__field-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .cms-editor__input,
      .cms-editor__textarea {
        width: 100%;
        border: 1px solid #d0d7de;
        border-radius: 0.75rem;
        padding: 0.75rem;
      }
      .cms-editor__textarea {
        min-height: 5rem;
      }
      .cms-editor__add-item,
      .cms-editor__insert-token,
      .cms-editor__remove-item {
        align-self: start;
        border: none;
        border-radius: 999px;
        padding: 0.5rem 0.9rem;
        background: #eef6ff;
        cursor: pointer;
      }
      .cms-editor__checkbox-label {
        display: inline-flex;
        gap: 0.5rem;
        align-items: center;
      }
    `;
    document.head.appendChild(style);
    this._stylesInjected = true;
  }
}

export default CmsEditor;
