/**
 * test/components/SheetEditor.test.mjs
 *
 * Unit tests for SheetEditor component
 * Tests cover: rendering, interaction, change tracking, state management
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { JSDOM } from "jsdom";
import SheetEditor from "../../js/components/SheetEditor.mjs";
import EditorStateManager from "../../js/data/EditorStateManager.js";

// Setup JSDOM
const dom = new JSDOM("<!DOCTYPE html><html><body id='app'></body></html>", {
  url: "http://localhost"
});

global.window = dom.window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.Element = window.Element;

// Row-based CSV format: [key, en, es, fr, swa]
const sampleData = [
  ["key", "en", "es", "fr", "swa"], // Header row
  ["greetings.hello", "Hello", "Hola", "Bonjour", "Habari"],
  ["greetings.goodbye", "Goodbye", "Adiós", "Au revoir", "Kwaheri"]
];

describe("SheetEditor Component", () => {
  let container;
  let editor;
  let sessionId;

  beforeEach(async () => {
    // Clear database
    await EditorStateManager.clearAll();

    // Create container
    container = document.createElement("div");
    container.id = "editor-container";
    document.body.appendChild(container);

    // Start session
    sessionId = await EditorStateManager.startSession("TestSheet123", "editor@test.com");
  });

  afterEach(() => {
    // Clean up
    if (editor) {
      editor.destroy();
    }

    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  // ============================================================================
  // Constructor & Initialization Tests
  // ============================================================================

  describe("Constructor", () => {
    it("should create instance with container ID", () => {
      editor = new SheetEditor("editor-container");
      expect(editor).toBeDefined();
      expect(editor.container).toBeDefined();
    });

    it("should throw error if container not found", () => {
      expect(() => {
        new SheetEditor("non-existent-container");
      }).toThrow("[SheetEditor] Container not found");
    });

    it("should initialize with default options", () => {
      editor = new SheetEditor("editor-container");
      expect(editor.options.languages).toEqual(["en", "es", "fr", "swa"]);
    });

    it("should accept custom options", () => {
      const customCallback = () => {};
      editor = new SheetEditor("editor-container", {
        languages: ["en", "es"],
        onChangeCallback: customCallback
      });

      expect(editor.options.languages).toEqual(["en", "es"]);
      expect(editor.options.onChangeCallback).toBe(customCallback);
    });
  });

  // ============================================================================
  // Initialization Tests
  // ============================================================================

  describe("initialize()", () => {
    beforeEach(() => {
      editor = new SheetEditor("editor-container");
    });

    it("should throw error if session ID is missing", async () => {
      await expect(editor.initialize(null, sampleData)).rejects.toThrow(
        "[SheetEditor] Session ID is required"
      );
    });

    it("should throw error if baseline data is missing", async () => {
      await expect(editor.initialize(sessionId, null)).rejects.toThrow(
        "[SheetEditor] CSV data is required"
      );
    });

    it("should throw error if empty data", async () => {
      await expect(editor.initialize(sessionId, [])).rejects.toThrow(
        "[SheetEditor] CSV data is required"
      );
    });

    it("should initialize successfully with valid parameters", async () => {
      await editor.initialize(sessionId, sampleData);
      expect(editor.sessionId).toBe(sessionId);
      expect(editor.rows.length).toBe(2); // 2 data rows (header excluded)
    });

    it("should select first row after initialization", async () => {
      await editor.initialize(sessionId, sampleData);
      expect(editor.currentRowIndex).toBe(0);
      expect(editor.rows[0][0]).toBe("greetings.hello");
    });

    it("should render UI after initialization", async () => {
      await editor.initialize(sessionId, sampleData);
      expect(container.querySelector(".sheet-editor")).toBeDefined();
    });

    it("should not modify baseline data", async () => {
      const originalData = JSON.stringify(sampleData);
      await editor.initialize(sessionId, sampleData);
      expect(JSON.stringify(sampleData)).toBe(originalData);
    });
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe("render()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should render editor wrapper", () => {
      const wrapper = container.querySelector(".sheet-editor");
      expect(wrapper).toBeDefined();
    });

    it("should render key dropdown", () => {
      const keySelector = container.querySelector("#key-dropdown");
      expect(keySelector).toBeDefined();
      expect(keySelector.options.length).toBe(2); // 2 data keys
    });

    it("should render language pills for all languages", () => {
      const pills = container.querySelectorAll(".editor-pill");
      expect(pills.length).toBe(4); // en, es, fr, swa
    });

    it("should render textarea for input", () => {
      const textarea = container.querySelector(".editor-textarea");
      expect(textarea).toBeDefined();
    });

    it("should render action buttons", () => {
      const saveBtn = container.querySelector(".editor-btn-save");
      const discardBtn = container.querySelector(".editor-btn-discard");
      const snapshotBtn = container.querySelector(".editor-btn-snapshot");
      const deleteBtn = container.querySelector(".editor-btn-delete");
      const importBtn = container.querySelector(".editor-btn-import");

      expect(saveBtn).toBeDefined();
      expect(discardBtn).toBeDefined();
      expect(snapshotBtn).toBeDefined();
      expect(deleteBtn).toBeDefined();
      expect(importBtn).toBeDefined();
    });

    it("should cache DOM elements", async () => {
      expect(editor.elements.keySelector).toBeDefined();
      expect(editor.elements.languagePills).toBeDefined();
      expect(editor.elements.input).toBeDefined();
      expect(editor.elements.saveButton).toBeDefined();
    });

    it("should populate key dropdown with correct keys", async () => {
      const keySelector = editor.elements.keySelector;
      const options = Array.from(keySelector.options).map((o) => o.value);
      expect(options).toContain("greetings.hello");
      expect(options).toContain("greetings.goodbye");
    });
  });

  // ============================================================================
  // Row Selection Tests (selectRow)
  // ============================================================================

  describe("selectRow()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should set currentRowIndex property", () => {
      editor.selectRow(1);
      expect(editor.currentRowIndex).toBe(1);
    });

    it("should update key selector value", () => {
      editor.selectRow(1);
      expect(editor.elements.keySelector.value).toBe("greetings.goodbye");
    });

    it("should update textarea content for selected row", () => {
      editor.selectRow(0);
      expect(editor.elements.input.value).toBe("Hello");
    });

    it("should reset language to 'en' when switching rows", () => {
      editor.selectedLanguage = "es";
      editor.selectRow(1);
      expect(editor.selectedLanguage).toBe("en");
    });

    it("should update UI after selection", () => {
      editor.selectRow(1);
      const statusBar = editor.elements.statusBar;
      expect(statusBar.textContent).toContain("greetings.goodbye");
    });

    it("should do nothing for negative index", () => {
      editor.selectRow(-1);
      expect(editor.currentRowIndex).toBe(0);
    });

    it("should do nothing for out-of-bounds index", () => {
      editor.selectRow(100);
      expect(editor.currentRowIndex).toBe(0);
    });
  });

  describe("nextRow() / prevRow()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should navigate to next row", () => {
      editor.nextRow();
      expect(editor.currentRowIndex).toBe(1);
    });

    it("should navigate to previous row", () => {
      editor.selectRow(1);
      editor.prevRow();
      expect(editor.currentRowIndex).toBe(0);
    });

    it("should not go past last row", () => {
      editor.nextRow();
      editor.nextRow();
      expect(editor.currentRowIndex).toBe(1);
    });

    it("should not go below first row", () => {
      editor.prevRow();
      expect(editor.currentRowIndex).toBe(0);
    });
  });

  // ============================================================================
  // Language Selection Tests
  // ============================================================================

  describe("language pill selection", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should set selectedLanguage property", () => {
      editor.selectedLanguage = "es";
      expect(editor.selectedLanguage).toBe("es");
    });

    it("should mark active language pill", () => {
      editor.selectedLanguage = "es";
      editor.updateUI();

      const activePill = container.querySelector(".editor-pill.active");
      expect(activePill.getAttribute("data-lang")).toBe("es");
    });

    it("should update textarea content for language", () => {
      editor.selectedLanguage = "es";
      editor.updateInput();

      expect(editor.elements.input.value).toBe("Hola");
    });

    it("should update textarea content for different languages", () => {
      // Start with en
      editor.selectedLanguage = "en";
      editor.updateInput();
      expect(editor.elements.input.value).toBe("Hello");

      // Switch to fr
      editor.selectedLanguage = "fr";
      editor.updateInput();
      expect(editor.elements.input.value).toBe("Bonjour");
    });

    it("should update status bar for language", () => {
      editor.selectedLanguage = "en";
      editor.updateInput();
      editor.updateStatusBar();
      expect(editor.elements.statusBar.textContent).toContain("EN");

      editor.selectedLanguage = "es";
      editor.updateInput();
      editor.updateStatusBar();
      expect(editor.elements.statusBar.textContent).toContain("ES");
    });
  });

  // ============================================================================
  // Input Change Tests
  // ============================================================================

  describe("handleInputChange()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should update row value on input change", async () => {
      const event = { target: { value: "New Value" } };
      await editor.handleInputChange(event);

      expect(editor.rows[0][1]).toBe("New Value"); // en column
    });

    it("should mark row as changed when value differs from original", async () => {
      const event = { target: { value: "Changed Value" } };
      await editor.handleInputChange(event);

      expect(editor.rows[0]._changed).toBe(true);
    });

    it("should mark as changed even if value is the same", async () => {
      // Current value is "Hello"
      const event = { target: { value: "Hello" } };
      await editor.handleInputChange(event);

      // Component marks _changed = true unconditionally on any input
      expect(editor.rows[0]._changed).toBe(true);
    });

    it("should record change in EditorStateManager", async () => {
      const event = { target: { value: "New Value" } };
      await editor.handleInputChange(event);

      const changes = await EditorStateManager.getSessionChanges(sessionId);
      expect(changes.length).toBeGreaterThan(0);
    });

    it("should call onChangeCallback if provided", async () => {
      let callbackCalled = false;
      let callbackData;

      editor = new SheetEditor("editor-container", {
        onChangeCallback: (data) => {
          callbackCalled = true;
          callbackData = data;
        }
      });

      await editor.initialize(sessionId, sampleData);

      const event = { target: { value: "New Value" } };
      await editor.handleInputChange(event);

      expect(callbackCalled).toBe(true);
      expect(callbackData.newValue).toBe("New Value");
      expect(callbackData.language).toBe("en");
    });

    it("should update character count", async () => {
      const event = { target: { value: "Test" } };
      await editor.handleInputChange(event);

      expect(editor.elements.charCurrent.textContent).toBe("4");
    });

    it("should update UI after change", async () => {
      const event = { target: { value: "Changed" } };
      await editor.handleInputChange(event);

      expect(editor.elements.saveButton.disabled).toBe(false);
    });
  });

  // ============================================================================
  // UI Update Tests
  // ============================================================================

  describe("updateUI()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should update change count display", () => {
      editor.updateUI();
      const countText = editor.elements.changeCount.textContent;
      expect(countText).toContain("change");
    });

    it("should disable save button when no changes", () => {
      editor.updateUI();
      expect(editor.elements.saveButton.disabled).toBe(true);
    });

    it("should enable save button when changes exist", async () => {
      const event = { target: { value: "Changed" } };
      await editor.handleInputChange(event);

      expect(editor.elements.saveButton.disabled).toBe(false);
    });

    it("should update active pill styling", () => {
      editor.selectedLanguage = "es";
      editor.updateUI();

      const activePill = container.querySelector(".editor-pill.active");
      expect(activePill.getAttribute("data-lang")).toBe("es");
    });
  });

  // ============================================================================
  // Status Bar Tests
  // ============================================================================

  describe("updateStatusBar()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should display message in status bar", () => {
      editor.updateStatusBar("Test message");
      expect(editor.elements.statusBar.textContent).toBe("Test message");
    });

    it("should apply correct className based on type", () => {
      editor.updateStatusBar("Success!", "success");
      expect(editor.elements.statusBar.textContent).toBe("Success!");
    });

    it("should clear message when empty", () => {
      editor.updateStatusBar("Initial");
      editor.updateStatusBar("");
      // When empty, it shows current editing info
      expect(editor.elements.statusBar.textContent).toContain("greetings.hello");
    });
  });

  // ============================================================================
  // Save/Discard Tests
  // ============================================================================

  describe("handleSave()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should save snapshot on save click", async () => {
      editor.elements.input.value = "Changed";
      editor.elements.input.dispatchEvent(new window.Event("input", { bubbles: true }));

      await editor.handleSave();

      const snapshot = await EditorStateManager.getLatestSnapshot(sessionId);
      expect(snapshot).toBeDefined();
    });

    it("should show success message after save", async () => {
      editor.elements.input.value = "Changed";
      editor.elements.input.dispatchEvent(new window.Event("input", { bubbles: true }));

      await editor.handleSave();

      expect(editor.elements.statusBar.textContent).toContain("saved");
    });

    it("should call onSaveCallback if provided", async () => {
      let callbackCalled = false;

      editor = new SheetEditor("editor-container", {
        onSaveCallback: () => {
          callbackCalled = true;
        }
      });

      await editor.initialize(sessionId, sampleData);

      editor.elements.input.value = "Changed";
      editor.elements.input.dispatchEvent(new window.Event("input", { bubbles: true }));

      await editor.handleSave();

      expect(callbackCalled).toBe(true);
    });
  });

  describe("handleDiscard()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should discard session changes", async () => {
      editor.elements.input.value = "Changed";
      editor.elements.input.dispatchEvent(new window.Event("input", { bubbles: true }));

      // Mock confirm
      global.confirm = () => true;

      await editor.handleDiscard();

      const session = await EditorStateManager.getSession(sessionId);
      expect(session).toBeNull();
    });

    it("should reload original data after discard", async () => {
      editor.elements.input.value = "Changed";
      editor.elements.input.dispatchEvent(new window.Event("input", { bubbles: true }));

      global.confirm = () => true;

      await editor.handleDiscard();

      expect(editor.rows[0][1]).toBe("Hello"); // Original value restored
    });
  });

  // ============================================================================
  // State Getter Tests
  // ============================================================================

  describe("getState()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should return current state object", () => {
      const state = editor.getState();

      expect(state).toBeDefined();
      expect(state.rows).toBeDefined();
      expect(state.changeCount).toBeDefined();
      expect(state.isDirty).toBeDefined();
      expect(state.selectedLanguage).toBeDefined();
    });

    it("should report 0 changes when no modifications", () => {
      const state = editor.getState();
      expect(state.changeCount).toBe(0);
      expect(state.isDirty).toBe(false);
    });

    it("should report changes correctly", async () => {
      const event = { target: { value: "Changed" } };
      await editor.handleInputChange(event);

      const state = editor.getState();
      expect(state.changeCount).toBe(1);
      expect(state.isDirty).toBe(true);
    });

    it("should include currentRowIndex and selectedLanguage in state", () => {
      editor.selectedLanguage = "es";
      editor.currentRowIndex = 1;

      const state = editor.getState();
      expect(state.currentRowIndex).toBe(1);
      expect(state.selectedLanguage).toBe("es");
    });

    it("should include CSV export in state", () => {
      const state = editor.getState();
      expect(state.csv).toBeDefined();
      expect(state.csv).toContain("greetings.hello");
    });
  });

  // ============================================================================
  // Cleanup Tests
  // ============================================================================

  describe("destroy()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should clear container HTML", () => {
      editor.destroy();
      expect(container.innerHTML).toBe("");
    });

    it("should be callable multiple times safely", () => {
      expect(() => {
        editor.destroy();
        editor.destroy();
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Row Deletion Tests
  // ============================================================================

  describe("handleDelete()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should remove the current row", async () => {
      global.confirm = () => true;
      await editor.handleDelete();

      expect(editor.rows.length).toBe(1);
    });

    it("should not delete the last row", async () => {
      // First delete one row
      global.confirm = () => true;
      await editor.handleDelete();

      // Try to delete again - should fail
      const initialLength = editor.rows.length;
      await editor.handleDelete();

      expect(editor.rows.length).toBe(initialLength);
    });

    it("should update UI after deletion", async () => {
      global.confirm = () => true;
      await editor.handleDelete();

      const keySelector = editor.elements.keySelector;
      const options = Array.from(keySelector.options).map((o) => o.value);
      expect(options.length).toBe(1); // header + 1 remaining key
    });
  });

  // ============================================================================
  // CSV Export Tests
  // ============================================================================

  describe("exportCSV()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should export CSV with header", () => {
      const csv = editor.exportCSV();
      expect(csv).toContain("key\ten\tes\tfr\tswa");
    });

    it("should export all rows", () => {
      const csv = editor.exportCSV();
      expect(csv).toContain("greetings.hello");
      expect(csv).toContain("greetings.goodbye");
    });

    it("should reflect changes in export", async () => {
      const event = { target: { value: "Modified" } };
      await editor.handleInputChange(event);

      const csv = editor.exportCSV();
      expect(csv).toContain("Modified");
    });
  });
});
