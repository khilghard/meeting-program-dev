import { beforeEach, describe, expect, test, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

import CmsEditor, { parseFieldValue } from "../../js/components/CmsEditor.mjs";
import { loadTranslations } from "../../js/i18n/index.js";
import {
  fromEditorRows,
  parseCsv,
  toCsv,
  toEditorRows
} from "./csv-roundtrip.helpers.mjs";

const SAFE_CSV_PATH = path.resolve(process.cwd(), "test/safe.csv");

function findRowByKeyValue(container, keyValue) {
  const rows = Array.from(container.querySelectorAll(".cms-row"));
  return rows.find((row) => {
    const select = row.querySelector(".cms-row__key-select");
    const readonly = row.querySelector(".cms-row__key-label");
    if (select) return select.value === keyValue;
    return (readonly?.textContent || "").toLowerCase().includes(keyValue.toLowerCase());
  });
}

function findRowsByKeyValue(container, keyValue) {
  const rows = Array.from(container.querySelectorAll(".cms-row"));
  return rows.filter((row) => {
    const select = row.querySelector(".cms-row__key-select");
    const readonly = row.querySelector(".cms-row__key-label");
    if (select) return select.value === keyValue;
    return (readonly?.textContent || "").toLowerCase().includes(keyValue.toLowerCase());
  });
}

function clickButton(element, selector) {
  const button = element.querySelector(selector);
  expect(button).toBeTruthy();
  button.click();
  return button;
}

function setInputValue(inputEl, value) {
  expect(inputEl).toBeTruthy();
  inputEl.value = value;
  inputEl.dispatchEvent(new Event("input", { bubbles: true }));
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom(rng, items) {
  if (!items.length) return null;
  const idx = Math.floor(rng() * items.length);
  return items[idx];
}

function addRepeatableProgramRowViaModal(key) {
  const insertButtons = document.querySelectorAll('.cms-section-tint--program .cms-insert-btn');
  expect(insertButtons.length).toBeGreaterThan(0);
  const addButton = insertButtons[insertButtons.length - 1];
  addButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

  const modal = document.querySelector(".cms-modal");
  expect(modal).toBeTruthy();

  const select = modal.querySelector(".cms-modal__key-select");
  const confirm = modal.querySelector(".cms-modal__confirm-btn");
  expect(select).toBeTruthy();
  expect(confirm).toBeTruthy();

  select.value = key;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  confirm.disabled = false;
  confirm.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function addRowViaInlineInsertButton(buttonSelector, key) {
  const insertButton = document.querySelector(buttonSelector);
  expect(insertButton).toBeTruthy();
  insertButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

  const modal = document.querySelector(".cms-modal");
  expect(modal).toBeTruthy();

  const select = modal.querySelector(".cms-modal__key-select");
  const confirm = modal.querySelector(".cms-modal__confirm-btn");
  expect(select).toBeTruthy();
  expect(confirm).toBeTruthy();

  select.value = key;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  confirm.disabled = false;
  confirm.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function countRowsByNormalizedKey(activeEditor, key) {
  return activeEditor
    .getAllRows()
    .filter((row) => row.key.replace(/\d+$/, "") === key).length;
}

function getModalOptionValuesForSection(activeEditor, section) {
  activeEditor.showAddRowModal(section);
  const modal = document.querySelector(".cms-modal");
  expect(modal).toBeTruthy();
  const select = modal.querySelector(".cms-modal__key-select");
  expect(select).toBeTruthy();

  const values = Array.from(select.options)
    .map((opt) => opt.value)
    .filter(Boolean);

  const cancelButton = modal.querySelector(".cms-modal__cancel-btn");
  expect(cancelButton).toBeTruthy();
  cancelButton.click();
  return values;
}

async function createEditorWithRows(containerId, rows, includeAgenda = true) {
  document.body.innerHTML = `<div id='${containerId}'></div>`;
  await loadTranslations("en");
  const instance = new CmsEditor(containerId, { includeAgenda });
  instance.initialize(rows);
  return instance;
}

function createBaseRowsForRestrictionTests() {
  return [
    { key: "unitName", value: "Ward" },
    { key: "stakeName", value: "Stake" },
    { key: "obsolete", value: "" },
    { key: "migrationUrl", value: "" },
    { key: "unitAddress", value: "Address" },
    { key: "link", value: "Home|https://example.org" },
    { key: "date", value: "March 29, 2026" },
    { key: "split:program", value: "" },
    { key: "presiding", value: "A" },
    { key: "closingPrayer", value: "B" },
    { key: "split:general", value: "" }
  ];
}

function assertEditorInvariants(activeEditor, baseRecords) {
  const rows = activeEditor.getAllRows();
  const splitProgramCount = rows.filter((row) => row.key === "split:program").length;
  const splitGeneralCount = rows.filter((row) => row.key === "split:general").length;
  const splitProgramIdx = rows.findIndex((row) => row.key === "split:program");
  const splitGeneralIdx = rows.findIndex((row) => row.key === "split:general");
  const closingPrayerIdx = rows.findIndex((row) => row.key === "closingPrayer");

  expect(splitProgramCount).toBe(1);
  expect(splitGeneralCount).toBe(1);
  expect(splitProgramIdx).toBeGreaterThan(-1);
  expect(splitGeneralIdx).toBeGreaterThan(splitProgramIdx);
  expect(closingPrayerIdx).toBeGreaterThan(-1);
  expect(closingPrayerIdx).toBeGreaterThan(splitProgramIdx);
  expect(closingPrayerIdx).toBeLessThan(splitGeneralIdx);

  const rebuilt = fromEditorRows(baseRecords, rows);
  expect(rebuilt.some((record) => record.key.startsWith("split:"))).toBe(false);
}

class MockSheetClient {
  constructor(header, records) {
    this.header = [...header];
    this.records = records.map((record) => ({ ...record }));
  }

  saveRows(editorRows) {
    this.records = fromEditorRows(this.records, editorRows);
    return toCsv(this.header, this.records);
  }

  loadCsv() {
    return parseCsv(toCsv(this.header, this.records));
  }
}

describe("Murat CSV roundtrip suite", () => {
  let csvText;
  let parsed;
  let container;
  let editor;

  beforeEach(async () => {
    csvText = fs.readFileSync(SAFE_CSV_PATH, "utf8");
    parsed = parseCsv(csvText);

    document.body.innerHTML = "<div id='murat-editor'></div>";
    container = document.getElementById("murat-editor");
    await loadTranslations("en");

    editor = new CmsEditor("murat-editor", { includeAgenda: true });
    editor.initialize(toEditorRows(parsed.records));
  });

  test("parses safe.csv fixture and preserves header shape", () => {
    expect(parsed.header).toEqual(["key", "en", "es", "fr", "swa"]);
    expect(parsed.records.length).toBeGreaterThan(60);
    expect(parsed.records[0].key).toBe("unitName");
  });

  test("no-op editor export preserves non-EN locale columns", () => {
    const exported = editor.getAllRows();
    const rebuiltRecords = fromEditorRows(parsed.records, exported);

    expect(rebuiltRecords.length).toBe(parsed.records.length);
    for (let i = 0; i < rebuiltRecords.length; i += 1) {
      expect(rebuiltRecords[i].key).toBe(parsed.records[i].key);
      expect(rebuiltRecords[i].es).toBe(parsed.records[i].es);
      expect(rebuiltRecords[i].fr).toBe(parsed.records[i].fr);
      expect(rebuiltRecords[i].swa).toBe(parsed.records[i].swa);
    }
  });

  test("moves a row down and changes exported order", () => {
    const before = editor.getAllRows().map((r) => r.key);

    const conductingRow = findRowByKeyValue(container, "conducting");
    expect(conductingRow).toBeTruthy();

    const downButton = conductingRow.querySelector('.cms-row__action--move-down');
    expect(downButton).toBeTruthy();
    downButton.click();

    const after = editor.getAllRows().map((r) => r.key);
    expect(after).not.toEqual(before);

    const beforeIdx = before.indexOf("conducting");
    const afterIdx = after.indexOf("conducting");
    expect(afterIdx).toBeGreaterThan(beforeIdx);
  });

  test("edits grouped locale fields for linkWithSpace and maps to CSV locale columns", () => {
    const esNameInput = container.querySelector(
      '.cms-field__input[data-key="linkWithSpace"][data-part="text"][data-locale="es"]'
    );
    const esUrlInput = container.querySelector(
      '.cms-field__input[data-key="linkWithSpace"][data-part="url"][data-locale="es"]'
    );
    const esImgInput = container.querySelector(
      '.cms-field__input[data-key="linkWithSpace"][data-part="imageUrl"][data-locale="es"]'
    );

    expect(esNameInput).toBeTruthy();
    expect(esUrlInput).toBeTruthy();
    expect(esImgInput).toBeTruthy();

    esNameInput.value = "Biblioteca del Evangelio";
    esNameInput.dispatchEvent(new Event("input", { bubbles: true }));
    esUrlInput.value = "https://example.org/es";
    esUrlInput.dispatchEvent(new Event("input", { bubbles: true }));
    esImgInput.value = "https://example.org/es-image.png";
    esImgInput.dispatchEvent(new Event("input", { bubbles: true }));

    const rebuiltRecords = fromEditorRows(parsed.records, editor.getAllRows());
    const firstLinkRow = rebuiltRecords.find((r) => r.key === "linkWithSpace");

    expect(firstLinkRow.en).toContain("<IMG>");
    expect(firstLinkRow.es).toContain("Biblioteca del Evangelio");
    expect(firstLinkRow.es).toContain("https://example.org/es");
  });

  test("recreates CSV output from edited rows", () => {
    const exported = editor.getAllRows();
    const rebuiltRecords = fromEditorRows(parsed.records, exported);
    const rebuiltCsv = toCsv(parsed.header, rebuiltRecords);

    expect(rebuiltCsv.startsWith('"key","en","es","fr","swa"')).toBe(true);
    expect(rebuiltCsv.includes('"linkWithSpace"')).toBe(true);
    expect(rebuiltCsv.split("\n").length).toBeGreaterThan(60);
  });

  test("edits grouped locale fields for generalStatementWithLink and maps to CSV locale columns", () => {
    const esTextInput = container.querySelector(
      '.cms-field__input[data-key="generalStatementWithLink"][data-part="text"][data-locale="es"]'
    );
    const esUrlInput = container.querySelector(
      '.cms-field__input[data-key="generalStatementWithLink"][data-part="url"][data-locale="es"]'
    );

    setInputValue(esTextInput, "Detalles semanales");
    setInputValue(esUrlInput, "https://example.org/es-weekly");

    const rebuiltRecords = fromEditorRows(parsed.records, editor.getAllRows());
    const firstGeneralStatementWithLink = rebuiltRecords.find((r) => r.key === "generalStatementWithLink");

    expect(firstGeneralStatementWithLink).toBeTruthy();
    expect(firstGeneralStatementWithLink.es).toContain("Detalles semanales");
    expect(firstGeneralStatementWithLink.es).toContain("https://example.org/es-weekly");
  });

  test("split boundary move keeps program constraints intact", () => {
    const beforeRows = editor.getAllRows();
    const beforeProgramSplitIndex = beforeRows.findIndex((row) => row.key === "split:program");

    editor._applySplitBoundaryMove("split:program", -1000);
    editor._applySplitBoundaryMove("split:general", 0);

    const afterRows = editor.getAllRows();
    const afterProgramSplitIndex = afterRows.findIndex((row) => row.key === "split:program");
    const generalSplitIndex = afterRows.findIndex((row) => row.key === "split:general");
    const closingPrayerIndex = afterRows.findIndex((row) => row.key === "closingPrayer");

    expect(afterProgramSplitIndex).toBe(beforeProgramSplitIndex);
    expect(closingPrayerIndex).toBeGreaterThan(-1);
    expect(generalSplitIndex).toBeGreaterThan(closingPrayerIndex);
    expect(closingPrayerIndex).toBe(generalSplitIndex - 1);
  });

  test("initialization auto-corrects missing required keys and split markers", async () => {
    const rowsMissingRequired = [
      { key: "unitName", value: "Ward" },
      { key: "stakeName", value: "Stake" },
      { key: "unitAddress", value: "Address" },
      { key: "date", value: "March 29, 2026" },
      { key: "speaker1", value: "Jane Doe|Faith" },
      { key: "generalStatement", value: "General note" }
    ];

    const correctionEditor = await createEditorWithRows(
      "murat-corrections",
      rowsMissingRequired,
      true
    );

    const allRows = correctionEditor.getAllRows();
    const splitProgramIdx = allRows.findIndex((row) => row.key === "split:program");
    const splitGeneralIdx = allRows.findIndex((row) => row.key === "split:general");
    const presidingIdx = allRows.findIndex((row) => row.key === "presiding");
    const closingPrayerIdx = allRows.findIndex((row) => row.key === "closingPrayer");

    expect(splitProgramIdx).toBeGreaterThan(-1);
    expect(splitGeneralIdx).toBeGreaterThan(splitProgramIdx);
    expect(presidingIdx).toBe(splitProgramIdx + 1);
    expect(closingPrayerIdx).toBe(splitGeneralIdx - 1);
  });

  test("mocked save and reload remains idempotent", async () => {
    const mockClient = new MockSheetClient(parsed.header, parsed.records);
    let savedCsv = "";

    const saveContainerId = "murat-editor-save";
    document.body.innerHTML = `<div id='${saveContainerId}'></div><div id='murat-editor-reload'></div>`;
    await loadTranslations("en");

    const saveEditor = new CmsEditor(saveContainerId, {
      includeAgenda: true,
      onSaveCallback: (rows) => {
        savedCsv = mockClient.saveRows(rows);
      }
    });
    saveEditor.initialize(toEditorRows(parsed.records));

    const saveContainer = document.getElementById(saveContainerId);
    const esTextInput = saveContainer.querySelector(
      '.cms-field__input[data-key="generalStatementWithLink"][data-part="text"][data-locale="es"]'
    );
    const esUrlInput = saveContainer.querySelector(
      '.cms-field__input[data-key="generalStatementWithLink"][data-part="url"][data-locale="es"]'
    );
    setInputValue(esTextInput, "Recordatorio semanal");
    setInputValue(esUrlInput, "https://example.org/es-reminder");

    const conductingRow = findRowByKeyValue(saveContainer, "conducting");
    expect(conductingRow).toBeTruthy();
    const downButton = conductingRow.querySelector('.cms-row__action--move-down');
    expect(downButton).toBeTruthy();
    downButton.click();

    savedCsv = mockClient.saveRows(saveEditor.getAllRows());
    expect(savedCsv).not.toBe("");

    const loaded = mockClient.loadCsv();
    const reloadEditor = new CmsEditor("murat-editor-reload", { includeAgenda: true });
    reloadEditor.initialize(toEditorRows(loaded.records));

    const noOpRows = reloadEditor.getAllRows();
    const noOpRecords = fromEditorRows(loaded.records, noOpRows);
    const reSavedCsv = toCsv(loaded.header, noOpRecords);

    expect(reSavedCsv).toBe(savedCsv);
  });

  test("blocks save when linkWithSpace EN required fields are incomplete", () => {
    const saveSpy = vi.fn();
    editor.options.onSaveCallback = saveSpy;

    const enNameInput = container.querySelector(
      '.cms-field__input[data-key="linkWithSpace"][data-part="text"][data-locale="en"]'
    );
    const enUrlInput = container.querySelector(
      '.cms-field__input[data-key="linkWithSpace"][data-part="url"][data-locale="en"]'
    );
    const enImageUrlInput = container.querySelector(
      '.cms-field__input[data-key="linkWithSpace"][data-part="imageUrl"][data-locale="en"]'
    );

    setInputValue(enNameInput, "");
    setInputValue(enUrlInput, "");
    setInputValue(enImageUrlInput, "");

    const validateErrors = editor.validate().map((error) => error.message);
    expect(validateErrors).toContain("linkWithSpace requires EN name, link, and image link URL.");

    editor.handleSave();
    expect(saveSpy).not.toHaveBeenCalled();
    expect(editor.isDirty).toBe(true);
  });

  test("blocks save when generalStatementWithLink EN fields are incomplete", () => {
    const saveSpy = vi.fn();
    editor.options.onSaveCallback = saveSpy;

    const enTextInput = container.querySelector(
      '.cms-field__input[data-key="generalStatementWithLink"][data-part="text"][data-locale="en"]'
    );
    const enUrlInput = container.querySelector(
      '.cms-field__input[data-key="generalStatementWithLink"][data-part="url"][data-locale="en"]'
    );

    setInputValue(enTextInput, "");
    setInputValue(enUrlInput, "");

    const validateErrors = editor.validate().map((error) => error.message);
    expect(validateErrors).toContain("generalStatementWithLink requires EN text and link.");

    editor.handleSave();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  test("parseCsv handles quoted commas and escaped quotes", () => {
    const trickyCsv = [
      '"key","en","es","fr","swa"',
      '"generalStatementWithLink","A ""quoted"", value|https://example.org","","",""',
      '"linkWithSpace","<IMG> Name, Inc.|https://x.test|https://x.test/img.png","","",""'
    ].join("\n");

    const parsedTricky = parseCsv(trickyCsv);

    expect(parsedTricky.header).toEqual(["key", "en", "es", "fr", "swa"]);
    expect(parsedTricky.records).toHaveLength(2);
    expect(parsedTricky.records[0].en).toContain('A "quoted", value');
    expect(parsedTricky.records[1].en).toContain("<IMG> Name, Inc.");
  });

  test("parseCsv best-effort recovers rows before a malformed quoted line", () => {
    const malformedCsv = [
      '"key","en","es","fr","swa"',
      '"unitName","Alpha","Alfa","",""',
      '"generalStatement","Open quote starts here',
      'and absorbs the rest of the file',
      '"closingPrayer","Will not be reached","","",""'
    ].join("\n");

    const parsedMalformed = parseCsv(malformedCsv);

    expect(parsedMalformed.records[0]).toEqual({
      key: "unitName",
      en: "Alpha",
      es: "Alfa",
      fr: "",
      swa: ""
    });
    expect(parsedMalformed.records).toHaveLength(2);
    expect(parsedMalformed.records[1].key).toBe("generalStatement");
    expect(parsedMalformed.records[1].en).toContain("Open quote starts here");
    expect(parsedMalformed.records[1].en).toContain("closingPrayer");
  });

  test("supports UI add and delete cycles for repeatable program rows", () => {
    const startingRows = editor.getAllRows().length;
    const startingSpeakerCount = countRowsByNormalizedKey(editor, "speaker");

    for (let i = 0; i < 3; i += 1) {
      addRepeatableProgramRowViaModal("speaker");

      const speakerCountAfterAdd = countRowsByNormalizedKey(editor, "speaker");
      expect(speakerCountAfterAdd).toBe(startingSpeakerCount + 1);

      const speakerRows = findRowsByKeyValue(container, "speaker");
      expect(speakerRows.length).toBeGreaterThan(0);

      const newestSpeakerRow = speakerRows[speakerRows.length - 1];
      clickButton(newestSpeakerRow, ".cms-row__action--delete");
      expect(countRowsByNormalizedKey(editor, "speaker")).toBe(startingSpeakerCount);
    }

    expect(editor.getAllRows().length).toBe(startingRows);
  });

  test("renders inline insert buttons between editable program rows", () => {
    const programRows = editor.programRows.length;
    const insertButtons = container.querySelectorAll('.cms-section-tint--program .cms-insert-btn');

    expect(insertButtons.length).toBe(programRows);
    expect(insertButtons[0].dataset.insertIndex).toBe("1");
    expect(insertButtons[insertButtons.length - 1].dataset.insertIndex).toBe(String(programRows));
  });

  test("inline insert button places a row at the requested gap", () => {
    const beforeKeys = editor.programRows.map((row) => row.key.replace(/\d+$/, ""));
    expect(beforeKeys[2]).not.toBe("speaker");

    addRowViaInlineInsertButton('.cms-section-tint--program .cms-insert-btn[data-insert-index="2"]', "speaker");

    const afterKeys = editor.programRows.map((row) => row.key.replace(/\d+$/, ""));
    expect(afterKeys[2]).toBe("speaker");
    expect(afterKeys).toHaveLength(beforeKeys.length + 1);
  });

  test("fromEditorRows ignores split markers and preserves row cardinality", () => {
    const editorRowsWithSplits = [
      ...editor.getAllRows(),
      { key: "split:program", value: "" },
      { key: "split:general", value: "" }
    ];

    const rebuiltRecords = fromEditorRows(parsed.records, editorRowsWithSplits);
    expect(rebuiltRecords).toHaveLength(parsed.records.length);
    expect(rebuiltRecords.some((record) => record.key.startsWith("split:"))).toBe(false);
  });

  test("seeded random mutations preserve structural invariants", () => {
    const rng = mulberry32(20260521);

    for (let i = 0; i < 80; i += 1) {
      const op = Math.floor(rng() * 4);

      if (op === 0) {
        const rows = Array.from(container.querySelectorAll(".cms-row"));
        const movable = rows.filter((row) => {
          const down = row.querySelector(".cms-row__action--move-down");
          return Boolean(down && !down.disabled);
        });
        const chosen = pickRandom(rng, movable);
        const downBtn = chosen?.querySelector(".cms-row__action--move-down");
        if (downBtn) downBtn.click();
      } else if (op === 1) {
        const rows = Array.from(container.querySelectorAll(".cms-row"));
        const movable = rows.filter((row) => {
          const up = row.querySelector(".cms-row__action--move-up");
          return Boolean(up && !up.disabled);
        });
        const chosen = pickRandom(rng, movable);
        const upBtn = chosen?.querySelector(".cms-row__action--move-up");
        if (upBtn) upBtn.click();
      } else if (op === 2) {
        const targetIndex = Math.floor(rng() * (editor.getAllRows().length + 3)) - 2;
        editor._applySplitBoundaryMove("split:general", targetIndex);
      } else {
        const esTextInput = container.querySelector(
          '.cms-field__input[data-key="generalStatementWithLink"][data-part="text"][data-locale="es"]'
        );
        if (esTextInput) {
          setInputValue(esTextInput, `ES fuzz ${i}`);
        }
      }

      assertEditorInvariants(editor, parsed.records);
    }
  });

  test("truncates text fields at 1000 and textarea at 5000 on save", async () => {
    const boundaryRows = [
      { key: "unitName", value: "Ward" },
      { key: "stakeName", value: "Stake" },
      { key: "obsolete", value: "" },
      { key: "migrationUrl", value: "" },
      { key: "unitAddress", value: "Address" },
      { key: "link", value: "Home|https://example.org" },
      { key: "date", value: "March 29, 2026" },
      { key: "split:program", value: "" },
      { key: "presiding", value: "A" },
      { key: "closingPrayer", value: "B" },
      { key: "split:general", value: "" },
      { key: "generalStatement", value: "ok" }
    ];

    document.body.innerHTML = "<div id='murat-boundary'></div>";
    await loadTranslations("en");

    let savedRows = null;
    const boundaryEditor = new CmsEditor("murat-boundary", {
      includeAgenda: true,
      onSaveCallback: (rows) => {
        savedRows = rows;
      }
    });
    boundaryEditor.initialize(boundaryRows);

    const boundaryContainer = document.getElementById("murat-boundary");
    const presidingInput = boundaryContainer.querySelector(
      '.cms-field__input[data-key="presiding"][data-part="text"][data-locale="en"]'
    );
    const generalStatementInput = boundaryContainer.querySelector(
      '.cms-field__input[data-key="generalStatement"][data-part="text"][data-locale="en"]'
    );

    setInputValue(presidingInput, "P".repeat(1001));
    setInputValue(generalStatementInput, "G".repeat(5001));

    boundaryEditor.handleSave();
    expect(savedRows).toBeTruthy();

    const savedPresiding = savedRows.find((row) => row.key === "presiding");
    const savedGeneral = savedRows.find((row) => row.key === "generalStatement");
    expect(parseFieldValue("presiding", savedPresiding.value).text).toHaveLength(1000);
    expect(parseFieldValue("generalStatement", savedGeneral.value).text).toHaveLength(5000);
  });

  test("parseCsv tolerates missing and reordered headers with positional mapping", () => {
    const missingColumnsCsv = [
      '"key","en"',
      '"unitName","Provo 9th"',
      '"presiding","Jane Doe"'
    ].join("\n");

    const reorderedHeaderCsv = [
      '"en","key","es","fr","swa"',
      '"Unit Name in wrong slot","unitName","Nombre de unidad","",""'
    ].join("\n");

    const parsedMissing = parseCsv(missingColumnsCsv);
    expect(parsedMissing.header).toEqual(["key", "en"]);
    expect(parsedMissing.records[0]).toEqual({
      key: "unitName",
      en: "Provo 9th",
      es: "",
      fr: "",
      swa: ""
    });

    const parsedReordered = parseCsv(reorderedHeaderCsv);
    expect(parsedReordered.header).toEqual(["en", "key", "es", "fr", "swa"]);
    expect(parsedReordered.records[0].key).toBe("Unit Name in wrong slot");
    expect(parsedReordered.records[0].en).toBe("unitName");
  });

  test("rejects duplicate non-repeatable key swaps under rapid attempts", () => {
    const toastSpy = vi.spyOn(editor, "showToast");
    const conductingRow = findRowByKeyValue(container, "conducting");
    expect(conductingRow).toBeTruthy();

    const select = conductingRow.querySelector(".cms-row__key-select");
    expect(select).toBeTruthy();
    const originalValue = select.value;

    // Simulate hostile rapid key swaps by injecting duplicate non-repeatable keys.
    const duplicateTargets = ["presiding", "closingPrayer", "musicDirector"];
    for (const key of duplicateTargets) {
      if (!Array.from(select.options).some((opt) => opt.value === key)) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = key;
        select.appendChild(opt);
      }
      select.value = key;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      expect(select.value).toBe(originalValue);
    }

    const rows = editor.getAllRows().filter((row) => !row.key.startsWith("split:"));
    const keyCounts = rows.reduce((acc, row) => {
      const key = row.key.replace(/(\d+)$/, "");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    expect(keyCounts.presiding).toBe(1);
    expect(keyCounts.closingPrayer).toBe(1);
    expect(keyCounts.musicDirector).toBe(1);
    expect(toastSpy).toHaveBeenCalled();
    expect(toastSpy.mock.calls.some((call) =>
      String(call[0]).includes("already exists") && call[1] === "error"
    )).toBe(true);
  });

  test("shows warning toast for invalid url and imageUrl on change", () => {
    const toastSpy = vi.spyOn(editor, "showToast");

    const urlInput = container.querySelector(
      '.cms-field__input[data-key="linkWithSpace"][data-part="url"][data-locale="en"]'
    );
    const imageUrlInput = container.querySelector(
      '.cms-field__input[data-key="linkWithSpace"][data-part="imageUrl"][data-locale="en"]'
    );

    expect(urlInput).toBeTruthy();
    expect(imageUrlInput).toBeTruthy();

    urlInput.value = "javascript:alert(1)";
    editor.handleFieldChange({ target: urlInput, type: "change" });

    imageUrlInput.value = "not-a-url";
    editor.handleFieldChange({ target: imageUrlInput, type: "change" });

    const warningCalls = toastSpy.mock.calls.filter((call) => call[1] === "warning");
    expect(warningCalls.length).toBeGreaterThanOrEqual(2);
    expect(warningCalls.some((call) => String(call[0]).includes("Invalid URL"))).toBe(true);
  });

  test("program add modal shows expected key inventory with includeAgenda enabled", async () => {
    const restrictionEditor = await createEditorWithRows(
      "murat-restrictions-program-agenda",
      createBaseRowsForRestrictionTests(),
      true
    );

    const options = getModalOptionValuesForSection(restrictionEditor, "program");
    expect(options).toEqual([
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
      "closingHymn"
    ]);
  });

  test("program add modal excludes agenda keys when includeAgenda is disabled", async () => {
    const restrictionEditor = await createEditorWithRows(
      "murat-restrictions-program-no-agenda",
      createBaseRowsForRestrictionTests(),
      false
    );

    const options = getModalOptionValuesForSection(restrictionEditor, "program");
    expect(options.some((key) => key.startsWith("agenda"))).toBe(false);
    expect(options).toContain("speaker");
    expect(options).toContain("openingHymn");
  });

  test("general add modal shows expected key inventory", async () => {
    const restrictionEditor = await createEditorWithRows(
      "murat-restrictions-general",
      createBaseRowsForRestrictionTests(),
      true
    );

    const options = getModalOptionValuesForSection(restrictionEditor, "general");
    expect(options).toEqual([
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
  });

  test("program add modal suppresses speaker once max repeatable count is reached", async () => {
    const rows = createBaseRowsForRestrictionTests();
    const closingPrayerIndex = rows.findIndex((row) => row.key === "closingPrayer");
    for (let i = 1; i <= 10; i += 1) {
      rows.splice(closingPrayerIndex, 0, { key: `speaker${i}`, value: "Speaker Name|Topic" });
    }

    const restrictionEditor = await createEditorWithRows(
      "murat-restrictions-speaker-max",
      rows,
      true
    );

    const options = getModalOptionValuesForSection(restrictionEditor, "program");
    expect(options).not.toContain("speaker");
    expect(options).toContain("intermediateHymn");
  });

  test("general add modal suppresses leader once max repeatable count is reached", async () => {
    const rows = createBaseRowsForRestrictionTests();
    const generalSplitIndex = rows.findIndex((row) => row.key === "split:general");
    for (let i = 1; i <= 20; i += 1) {
      rows.splice(generalSplitIndex + i, 0, { key: `leader${i}`, value: "Name|Calling|555-000-0000" });
    }

    const restrictionEditor = await createEditorWithRows(
      "murat-restrictions-leader-max",
      rows,
      true
    );

    const options = getModalOptionValuesForSection(restrictionEditor, "general");
    expect(options).not.toContain("leader");
    expect(options).toContain("generalStatement");
  });
});

describe("Auto-correction toast behaviour", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  function getToast() {
    return document.querySelector(".cms-editor__toast");
  }

  function makeBaseRows(programRows) {
    return [
      { key: "unitName", value: "Ward" },
      { key: "stakeName", value: "Stake" },
      { key: "unitAddress", value: "Address" },
      { key: "date", value: "March 29, 2026" },
      { key: "split:program", value: "" },
      ...programRows,
      { key: "split:general", value: "" },
    ];
  }

  test("no toast when data is clean (presiding first, closingPrayer last)", async () => {
    const rows = makeBaseRows([
      { key: "presiding", value: "A" },
      { key: "conducting", value: "B" },
      { key: "closingPrayer", value: "C" },
    ]);
    await createEditorWithRows("toast-clean", rows);
    expect(getToast()).toBeNull();
  });

  test("no toast when agendaGeneral legitimately precedes presiding", async () => {
    // This is the real-world case that was emitting a spurious toast
    const rows = makeBaseRows([
      { key: "agendaGeneral", value: "Notes" },
      { key: "presiding", value: "A" },
      { key: "conducting", value: "B" },
      { key: "closingPrayer", value: "C" },
    ]);
    await createEditorWithRows("toast-agenda-before-presiding", rows);
    expect(getToast()).toBeNull();
  });

  test("toast fires when presiding is genuinely misplaced (non-agenda row before it)", async () => {
    const rows = makeBaseRows([
      { key: "conducting", value: "B" },
      { key: "presiding", value: "A" },
      { key: "closingPrayer", value: "C" },
    ]);
    const ed = await createEditorWithRows("toast-presiding-misplaced", rows);
    expect(getToast()).not.toBeNull();
    const toastText = getToast().textContent;
    expect(toastText).toMatch(/presiding/i);
    // presiding should now be at index 0 of program rows
    const programRows = ed.getAllRows().filter(r => !["unitName","stakeName","unitAddress","date"].includes(r.key) && !r.key.startsWith("split:"));
    expect(programRows[0].key).toBe("presiding");
  });

  test("toast fires when presiding is missing and gets added", async () => {
    const rows = makeBaseRows([
      { key: "conducting", value: "B" },
      { key: "closingPrayer", value: "C" },
    ]);
    await createEditorWithRows("toast-presiding-missing", rows);
    expect(getToast()).not.toBeNull();
    expect(getToast().textContent).toMatch(/presiding/i);
  });

  test("toast fires when closingPrayer is missing and gets added", async () => {
    const rows = makeBaseRows([
      { key: "presiding", value: "A" },
      { key: "conducting", value: "B" },
    ]);
    await createEditorWithRows("toast-closing-missing", rows);
    expect(getToast()).not.toBeNull();
    expect(getToast().textContent).toMatch(/closingPrayer/i);
  });

  test("multiple agenda keys before presiding do not trigger toast", async () => {
    const rows = makeBaseRows([
      { key: "agendaGeneral", value: "Note 1" },
      { key: "agendaGeneral", value: "Note 2" },
      { key: "presiding", value: "A" },
      { key: "closingPrayer", value: "C" },
    ]);
    await createEditorWithRows("toast-multi-agenda-before-presiding", rows);
    expect(getToast()).toBeNull();
  });
});
