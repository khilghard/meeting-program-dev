import { AGENDA_KEYS } from "../agenda/constants.js";
import { t } from "../i18n/index.js";

const TEXTAREA_KEYS = new Set([
  "agendaGeneral",
  "agendaBusinessStake",
  "agendaBusinessPriesthood",
  "agendaBusinessGeneral"
]);

const REPEATABLE_SINGLE_KEYS = new Set([
  "agendaAnnouncements",
  "agendaAckVisitingLeaders",
  "agendaBusinessNewMoveIns",
  "agendaBusinessNewConverts"
]);

const REPEATABLE_PAIR_KEYS = new Set(["agendaBusinessReleases", "agendaBusinessCallings"]);

const REQUIRED_PARTS_BY_KEY = {
  agendaBusinessCallings: [true, true],
  agendaBusinessReleases: [true, false]
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toTextareaValue(entries) {
  return entries.map(entry => entry[0] ?? "").join("\n\n");
}

function fromTextareaValue(value) {
  return String(value ?? "")
    .split(/\n\s*\n/g)
    .map(item => sanitiseAgendaPart(item).trim())
    .filter(Boolean)
    .map(item => [item]);
}

function makeBlankRow(key) {
  const definition = getAgendaFieldDefinition(key);
  return Array.from({ length: definition.parts.length }, () => "");
}

function normalizeEntries(key, values) {
  const definition = getAgendaFieldDefinition(key);
  const input = Array.isArray(values) ? values : [];

  if (definition.type === "textarea") {
    if (input.length === 0) return [[""]];
    return [[toTextareaValue(input)]];
  }

  const normalized = input.map(row => {
    const rowValues = Array.isArray(row) ? row : [row];
    return definition.parts.map((_, partIndex) => sanitiseAgendaPart(rowValues[partIndex] ?? ""));
  });

  return normalized.length > 0 ? normalized : [makeBlankRow(key)];
}

export function sanitiseAgendaPart(value) {
  return String(value ?? "").replaceAll("|", "");
}

export function getAgendaFieldDefinition(key) {
  if (!AGENDA_KEYS.includes(key)) {
    throw new Error(`Unsupported agenda key: ${key}`);
  }

  if (TEXTAREA_KEYS.has(key)) {
    return {
      type: "textarea",
      label: t(key),
      parts: [{ label: t("cmsAgenda.detailsLabel"), placeholder: t("cmsAgenda.detailsPlaceholder") }]
    };
  }

  if (REPEATABLE_PAIR_KEYS.has(key)) {
    const required = REQUIRED_PARTS_BY_KEY[key] ?? [true, true];
    return {
      type: "repeatable-pair",
      label: t(key),
      parts: [
        {
          label: t("cmsAgenda.nameLabel"),
          placeholder: t("cmsAgenda.namePlaceholder"),
          required: Boolean(required[0])
        },
        {
          label: t("cmsAgenda.callingLabel"),
          placeholder: t("cmsAgenda.callingPlaceholder"),
          required: Boolean(required[1])
        }
      ]
    };
  }

  return {
    type: "repeatable-single",
    label: t(key),
    parts: [{ label: t("cmsAgenda.itemLabel"), placeholder: t("cmsAgenda.itemPlaceholder") }]
  };
}

export function validateAgendaValues(key, values) {
  const definition = getAgendaFieldDefinition(key);
  const rows = Array.isArray(values) ? values : [];
  const errors = [];

  if (definition.type === "textarea") {
    return errors;
  }

  rows.forEach((row, rowIndex) => {
    const normalized = definition.parts.map((_, partIndex) =>
      sanitiseAgendaPart(Array.isArray(row) ? row[partIndex] ?? "" : "").trim()
    );

    const hasAnyValue = normalized.some(Boolean);
    if (!hasAnyValue) {
      return;
    }

    definition.parts.forEach((part, partIndex) => {
      if (!part.required) {
        return;
      }

      if (!normalized[partIndex]) {
        errors.push(
          `${t(key)} row ${rowIndex + 1}: ${part.label || `field ${partIndex + 1}`} is required.`
        );
      }
    });
  });

  return errors;
}

export default class AgendaKeyEditor {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.key = AGENDA_KEYS[0];
    this.entries = [makeBlankRow(this.key)];
  }

  initialize({ key, values = [] }) {
    this.key = key;
    this.entries = normalizeEntries(key, values);
    this.render();
  }

  setValue(rowIndex, partIndex, value) {
    if (!this.entries[rowIndex]) {
      this.entries[rowIndex] = makeBlankRow(this.key);
    }
    this.entries[rowIndex][partIndex] = sanitiseAgendaPart(value);
    this.emitChange();
  }

  addItem() {
    this.entries.push(makeBlankRow(this.key));
    this.render();
    this.emitChange();
  }

  removeItem(index) {
    if (this.entries.length === 1) {
      this.entries[0] = makeBlankRow(this.key);
    } else {
      this.entries.splice(index, 1);
    }
    this.render();
    this.emitChange();
  }

  getValues() {
    const definition = getAgendaFieldDefinition(this.key);
    if (definition.type === "textarea") {
      return fromTextareaValue(this.entries[0]?.[0] ?? "");
    }

    return this.entries
      .map(row => definition.parts.map((_, partIndex) => sanitiseAgendaPart(row[partIndex] ?? "").trim()))
      .filter(row => row.some(Boolean));
  }

  render() {
    if (!this.container) {
      return;
    }

    const definition = getAgendaFieldDefinition(this.key);
    if (definition.type === "textarea") {
      this.renderTextarea(definition);
      return;
    }

    const rowsHtml = this.entries
      .map((row, rowIndex) => {
        const fields = definition.parts
          .map((part, partIndex) => {
            const value = escapeHtml(row[partIndex] ?? "");
            return `
              <label class="agenda-key-editor__field">
                <span>${escapeHtml(part.label)}</span>
                <input
                  type="text"
                  class="agenda-key-editor__input"
                  data-row-index="${rowIndex}"
                  data-part-index="${partIndex}"
                  placeholder="${escapeHtml(part.placeholder)}"
                  value="${value}"
                />
              </label>`;
          })
          .join("");

        return `
          <div class="agenda-key-editor__row" data-row-index="${rowIndex}">
            ${fields}
            <div class="agenda-key-editor__row-actions">
              <button type="button" class="cms-agenda-btn--remove" data-action="remove-item" data-row-index="${rowIndex}">${escapeHtml(t("remove"))}</button>
            </div>
          </div>`;
      })
      .join("");

    this.container.innerHTML = `
      <section class="agenda-key-editor" data-key="${escapeHtml(this.key)}">
        <header class="agenda-key-editor__header">
          <h2>${escapeHtml(definition.label)}</h2>
        </header>
        <div class="agenda-key-editor__rows">${rowsHtml}</div>
        <button type="button" class="cms-agenda-btn--add" data-action="add-item">${escapeHtml(t("cmsAgenda.addItem"))}</button>
      </section>`;

    this.bindRepeatableInputs();
  }

  renderTextarea(definition) {
    const value = escapeHtml(this.entries[0]?.[0] ?? "");
    this.container.innerHTML = `
      <section class="agenda-key-editor" data-key="${escapeHtml(this.key)}">
        <header class="agenda-key-editor__header">
          <h2>${escapeHtml(definition.label)}</h2>
        </header>
        <label class="agenda-key-editor__field agenda-key-editor__field--textarea">
          <span>${escapeHtml(definition.parts[0].label)}</span>
          <textarea
            class="agenda-key-editor__textarea"
            rows="6"
            placeholder="${escapeHtml(definition.parts[0].placeholder)}"
          >${value}</textarea>
        </label>
      </section>`;

    const textarea = this.container.querySelector(".agenda-key-editor__textarea");
    textarea?.addEventListener("input", event => {
      this.entries = [[event.currentTarget.value]];
      this.emitChange();
    });
  }

  bindRepeatableInputs() {
    this.container.querySelectorAll(".agenda-key-editor__input").forEach(input => {
      input.addEventListener("input", event => {
        const rowIndex = Number.parseInt(event.currentTarget.dataset.rowIndex ?? "0", 10);
        const partIndex = Number.parseInt(event.currentTarget.dataset.partIndex ?? "0", 10);
        this.setValue(rowIndex, partIndex, event.currentTarget.value);
      });
    });

    this.container.querySelector('[data-action="add-item"]')?.addEventListener("click", () => {
      this.addItem();
    });

    this.container.querySelectorAll('[data-action="remove-item"]').forEach(button => {
      button.addEventListener("click", event => {
        const rowIndex = Number.parseInt(event.currentTarget.dataset.rowIndex ?? "0", 10);
        this.removeItem(rowIndex);
      });
    });
  }

  emitChange() {
    this.options.onChangeCallback?.(this.getValues());
  }
}
