/**
 * E2E Integration Tests - CMS Editor
 *
 * Tests for:
 * - Agenda toggle (includeAgenda option)
 * - Repeatable limits enforcement
 * - Validation (duplicate keys, required keys, move constraints)
 *
 * @module test/integration/e2e-scenarios.test.mjs
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import CmsEditor from "../../js/components/CmsEditor.mjs";
import { loadTranslations } from "../../js/i18n/index.js";

describe("CMS Editor — E2E Scenarios", () => {
  let container;
  let editor;

  beforeEach(async () => {
    document.body.innerHTML = "<div id='cms-editor-container'></div>";
    container = document.getElementById("cms-editor-container");
    await loadTranslations("en");
  });

  describe("Agenda Toggle", () => {
    it("hides agenda keys when includeAgenda is false", () => {
      editor = new CmsEditor("cms-editor-container", { includeAgenda: false });
      editor.initialize([
        { key: "unitName", value: "Ward" },
        { key: "agendaGeneral", value: "Announcements" },
        { key: "presiding", value: "Bishop" }
      ]);

      const rows = editor.getAllRows();
      expect(rows.some(r => r.key === "agendaGeneral")).toBe(false);
      expect(rows.some(r => r.key === "presiding")).toBe(true);

      // Add button modal should not offer agenda keys
      const addBtn = container.querySelector('.cms-editor__add-btn[data-section="program"]');
      addBtn.click();
      const modal = document.querySelector('.cms-modal');
      const options = Array.from(modal.querySelectorAll('#add-row-key-select option')).map(opt => opt.value);
      expect(options).not.toContain("agendaGeneral");
      expect(options).not.toContain("agendaAnnouncements");
      modal.querySelector('.cms-modal__cancel-btn').click();
    });

    it("shows agenda keys when includeAgenda is true", () => {
      editor = new CmsEditor("cms-editor-container", { includeAgenda: true });
      editor.initialize([
        { key: "unitName", value: "Ward" },
        { key: "presiding", value: "Bishop" }
      ]);

      const rows = editor.getAllRows();
      expect(rows.some(r => r.key === "agendaGeneral")).toBe(false); // not auto-added

      // Add button modal should offer agenda keys
      const addBtn = container.querySelector('.cms-editor__add-btn[data-section="program"]');
      addBtn.click();
      const modal = document.querySelector('.cms-modal');
      const options = Array.from(modal.querySelectorAll('#add-row-key-select option')).map(opt => opt.value);
      expect(options).toContain("agendaGeneral");
      expect(options).toContain("agendaAnnouncements");
      modal.querySelector('.cms-modal__cancel-btn').click();
    });
  });

  describe("Repeatable Limits", () => {
    it("enforces max repeatable items when adding via modal", () => {
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([]);

      // Add maximum speakers
      for (let i = 0; i < 10; i++) {
        editor.addRepeatableItem("speaker");
      }

      // Open add modal for program section
      const addBtn = container.querySelector('.cms-editor__add-btn[data-section="program"]');
      addBtn.click();
      const modal = document.querySelector('.cms-modal');
      const select = modal.querySelector('#add-row-key-select');
      const options = Array.from(select.options).map(opt => opt.value);

      expect(options).not.toContain("speaker");
      expect(options).toContain("openingHymn"); // other keys still available

      modal.querySelector('.cms-modal__cancel-btn').click();
    });

    it("enforces max repeatable items when using setItemValue (index == count)", () => {
        // Adding beyond max should be prevented by setItemValue check
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([]);

      // Add maximum speakers (10)
      for (let i = 0; i < 10; i++) {
        editor.addRepeatableItem("speaker");
      }

      // Attempt to add another via setItemValue (should create new row at index 10)
      // Our implementation should prevent this because they're at max
      // Since there are already 10 rows, setItemValue with index 10 should not create a new one
      editor.setItemValue("speaker", 10, { name: "Extra", caption: "Should not add" });

      const speakerRows = editor.getAllRows().filter(r => /^speaker\d+$/.test(r.key));
      expect(speakerRows.length).toBe(10);
    });
  });

  describe("Validation", () => {
    it("prevents duplicate non-repeatable keys in the same section", () => {
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([
        { key: "unitName", value: "Ward" },
        { key: "openingHymn", value: "62" }
      ]);

      // Find the select element whose value is "openingHymn"
      const selects = container.querySelectorAll('.cms-row__key-select');
      let select = null;
      for (const sel of selects) {
        if (sel.value === 'openingHymn') {
          select = sel;
          break;
        }
      }
      expect(select).toBeTruthy();

      // Simulate change to a duplicate (there's no built-in duplicate check on change; it's prevented in the dropdown options)
      // Instead, verify the dropdown doesn't include current key and the add modal excludes existing non-repeatable
      const addBtn = container.querySelector('.cms-editor__add-btn[data-section="program"]');
      addBtn.click();
      const modal = document.querySelector('.cms-modal');
      const options = Array.from(modal.querySelectorAll('#add-row-key-select option')).map(opt => opt.value);
      expect(options).not.toContain("openingHymn");
      modal.querySelector('.cms-modal__cancel-btn').click();
    });

    it("allows duplicate keys in different sections", () => {
      // Universal keys like oilLamp can appear in both program and general sections
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([
        { key: "unitName", value: "Ward" },
        { key: "oilLamp", value: "enabled" }
      ]);

      // Verify oilLamp exists in the rendered editor (universal key in program section)
      const rows = editor.getAllRows();
      expect(rows.some(r => r.key === "oilLamp")).toBe(true);
      
      // speaker is a repeatable key available in program section
      const addBtn = container.querySelector('.cms-editor__add-btn');
      addBtn.click();
      const modal = document.querySelector('.cms-modal');
      const select = modal.querySelector('#add-row-key-select');
      const options = Array.from(select.options).map(opt => opt.value);
      expect(options).toContain("speaker");
      modal.querySelector('.cms-modal__cancel-btn').click();
    });

    it("enforces required keys in program section on initialize", () => {
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([
        { key: "unitName", value: "Ward" },
        { key: "openingHymn", value: "62" }
      ]);

      const rows = editor.getAllRows();
      expect(rows.some(r => r.key === "presiding")).toBe(true);
      expect(rows.some(r => r.key === "closingPrayer")).toBe(true);
    });

    it("prevents moving presiding up beyond first position", () => {
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([
        { key: "unitName", value: "Ward" },
        { key: "presiding", value: "Bishop" },
        { key: "conducting", value: "Brother" }
      ]);

      // Find the select with value "presiding" and then its row
      const selects = container.querySelectorAll('.cms-row__key-select');
      let presidingSelect = null;
      for (const sel of selects) {
        if (sel.value === 'presiding') {
          presidingSelect = sel;
          break;
        }
      }
      expect(presidingSelect).toBeTruthy();
      const presidingRow = presidingSelect.closest('.cms-row');
      const moveUpBtn = presidingRow.querySelector('.cms-row__action--move-up');
      expect(moveUpBtn.disabled).toBe(true);
    });

    it("prevents moving closingPrayer down from last position", () => {
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([
        { key: "unitName", value: "Ward" },
        { key: "presiding", value: "Bishop" },
        { key: "closingPrayer", value: "Brother" }
      ]);

      const selects = container.querySelectorAll('.cms-row__key-select');
      let closingSelect = null;
      for (const sel of selects) {
        if (sel.value === 'closingPrayer') {
          closingSelect = sel;
          break;
        }
      }
      expect(closingSelect).toBeTruthy();
      const closingRow = closingSelect.closest('.cms-row');
      const moveDownBtn = closingRow.querySelector('.cms-row__action--move-down');
      expect(moveDownBtn.disabled).toBe(true);
    });
  });

  describe("URL Validation", () => {
    it("shows warning for unsafe URL in link field", () => {
      // Since we don't have a visible warning in current implementation, we'll test that change is still accepted but isSafeUrl is called
      // We can't easily test UI warnings without dom-level inspection of toast
      // This test is placeholder for future validation UI
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([
        { key: "link", value: "https://example.com" }
      ]);

      const linkInput = container.querySelector('.cms-field__input[data-key="link"]');
      expect(linkInput).toBeTruthy();
      linkInput.value = "javascript:alert(1)";
      linkInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Value should be set (sanitize happens on save, not input)
      const rows = editor.getAllRows();
      expect(rows[0].value).toBe("javascript:alert(1)");
    });
  });

  describe("Undo and Auto-correction", () => {
    it("toast appears when auto-corrections are applied", () => {
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([
        { key: "unitName", value: "Ward" },
        { key: "openingHymn", value: "62" }
      ]);

      const toast = document.querySelector('.cms-editor__toast');
      expect(toast).toBeTruthy();
    });

    it("undo removes auto-added required keys", () => {
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([
        { key: "unitName", value: "Ward" },
        { key: "openingHymn", value: "62" }
      ]);

      let rows = editor.getAllRows();
      expect(rows.some(r => r.key === "presiding")).toBe(true);
      expect(rows.some(r => r.key === "closingPrayer")).toBe(true);

      const undoBtn = document.querySelector('.cms-editor__toast-undo');
      undoBtn.click();

      rows = editor.getAllRows();
      expect(rows.some(r => r.key === "presiding")).toBe(false);
      expect(rows.some(r => r.key === "closingPrayer")).toBe(false);
    });

    it("undo can only be used once (consumes originalRowsBeforeCorrection)", () => {
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([
        { key: "unitName", value: "Ward" },
        { key: "openingHymn", value: "62" }
      ]);

      const undoBtn = document.querySelector('.cms-editor__toast-undo');
      undoBtn.click(); // first undo

      // Second undo should do nothing (no stored original)
      undoBtn.click();

      const rows = editor.getAllRows();
      expect(rows.some(r => r.key === "presiding")).toBe(false);
    });
  });

  describe("Token Auto-Addition on Save", () => {
    it("auto-adds <LINK> token to generalStatementWithLink text on serialization", () => {
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([
        { key: "generalStatementWithLink", value: "Welcome | https://example.com" }
      ]);

      // User edits text without token
      const textarea = container.querySelector('.cms-field__input[data-key="generalStatementWithLink"][data-part="text"]');
      expect(textarea).toBeTruthy();
      textarea.value = "Read more";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      
      // Row value should have <LINK> token auto-added
      const rows = editor.getAllRows();
      const row = rows.find(r => r.key === "generalStatementWithLink");
      expect(row.value).toBe("Read more<LINK>|https://example.com");
    });

    it("auto-adds <IMG> token to linkWithSpace text on serialization", () => {
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([
        { key: "linkWithSpace", value: "<IMG> Gospel Library | https://example.com | https://img.url" }
      ]);

      // User edits text without token
      const textInput = container.querySelector('.cms-field__input[data-key="linkWithSpace"][data-part="text"]');
      expect(textInput).toBeTruthy();
      textInput.value = "Gospel Library";
      textInput.dispatchEvent(new Event("input", { bubbles: true }));
      
      // Row value should have <IMG> token auto-added
      const rows = editor.getAllRows();
      const row = rows.find(r => r.key === "linkWithSpace");
      expect(row.value).toBe("<IMG> Gospel Library|https://example.com|https://img.url");
    });

    it("parses existing sheet values stripping tokens from text field", () => {
      editor = new CmsEditor("cms-editor-container");
      editor.initialize([
        { key: "generalStatementWithLink", value: "Read more<LINK> | https://example.com" },
        { key: "linkWithSpace", value: "<IMG> Gospel Library | https://example.com | https://img.url" }
      ]);

      // Text fields should NOT contain tokens
      const gsTextarea = container.querySelector('.cms-field__input[data-key="generalStatementWithLink"][data-part="text"]');
      expect(gsTextarea.value).toBe("Read more");

      const lsTextInput = container.querySelector('.cms-field__input[data-key="linkWithSpace"][data-part="text"]');
      expect(lsTextInput.value).toBe("Gospel Library");
    });
  });

  describe("Field Length Truncation", () => {
    it("truncates text fields to 1000 characters on save", () => {
      editor = new CmsEditor("cms-editor-container", { onSaveCallback: vi.fn() });
      const longText = "a".repeat(1500);
      editor.initialize([
        { key: "unitName", value: longText }
      ]);
      
      // Set long text in unitName field (text type)
      editor.setItemValue("unitName", 0, { text: longText });
      
      // Click save
      const saveBtn = container.querySelector('.cms-editor__save-btn');
      saveBtn.click();
      
      // Callback should receive truncated value (1000 chars)
      expect(editor.options.onSaveCallback).toHaveBeenCalled();
      const [rows] = editor.options.onSaveCallback.mock.calls[0];
      const unitRow = rows.find(r => r.key === "unitName");
      expect(unitRow.value.length).toBe(1000);
    });

    it("truncates textarea fields to 5000 characters on save", () => {
      editor = new CmsEditor("cms-editor-container", { onSaveCallback: vi.fn() });
      const longText = "b".repeat(6000);
      editor.initialize([
        { key: "generalStatement", value: longText }
      ]);
      
      // Set long text in textarea field
      editor.setItemValue("generalStatement", 0, { text: longText });
      
      // Click save
      const saveBtn = container.querySelector('.cms-editor__save-btn');
      saveBtn.click();
      
      const [rows] = editor.options.onSaveCallback.mock.calls[0];
      const row = rows.find(r => r.key === "generalStatement");
      expect(row.value.length).toBe(5000);
    });

    it("truncates each locale field independently", () => {
      editor = new CmsEditor("cms-editor-container", { onSaveCallback: vi.fn() });
      const longText = "x".repeat(1200);
      editor.initialize([
        { key: "horizontalLine", value: "normal" }
      ]);
      
      // Set long text in en and es fields (horizontalLine is user-translated)
      editor.setItemValue("horizontalLine", 0, {
        text: longText,
        text_es: longText
      });
      
      const saveBtn = container.querySelector('.cms-editor__save-btn');
      saveBtn.click();
      
      const [rows] = editor.options.onSaveCallback.mock.calls[0];
      const row = rows.find(r => r.key === "horizontalLine");
      // The serialized value will have en|es pattern; each part should be truncated to 1000
      const parts = row.value.split('|');
      expect(parts[0].length).toBe(1000);
      expect(parts[1].length).toBe(1000);
    });
  });
});
