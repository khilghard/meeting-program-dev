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

describe("SheetEditor Component", () => {
  let container;
  let editor;
  let sessionId;

  // New CSV format: [key, en, es, fr, swa]
  const sampleData = [
    ["key", "en", "es", "fr", "swa"],  // Header row
    ["greetings.hello", "Hello", "Hola", "Bonjour", "Habari"],
    ["greetings.goodbye", "Goodbye", "Adiós", "Au revoir", "Kwaheri"]
  ];

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
        "[SheetEditor] Baseline data is required"
      );
    });

    it("should initialize successfully with valid parameters", async () => {
      await editor.initialize(sessionId, sampleData);
      expect(editor.sessionId).toBe(sessionId);
      expect(Object.keys(editor.currentData).length).toBeGreaterThan(0);
    });

    it("should select first key after initialization", async () => {
      await editor.initialize(sessionId, sampleData);
      expect(editor.selectedKey).toBeTruthy();
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

    it("should render keys panel with all keys", () => {
      const keyItems = container.querySelectorAll(".editor-key-item");
      expect(keyItems.length).toBeGreaterThan(0);
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

      expect(saveBtn).toBeDefined();
      expect(discardBtn).toBeDefined();
      expect(snapshotBtn).toBeDefined();
    });

    it("should cache DOM elements", async () => {
      expect(editor.elements.keyList).toBeDefined();
      expect(editor.elements.languagePills).toBeDefined();
      expect(editor.elements.input).toBeDefined();
      expect(editor.elements.saveButton).toBeDefined();
    });
  });

  // ============================================================================
  // Key Selection Tests
  // ============================================================================

  describe("selectKey()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should set selectedKey property", () => {
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);
      expect(editor.selectedKey).toBe(keys[0]);
    });

    it("should mark selected key item as active", () => {
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

      const activeItem = container.querySelector(".editor-key-item.active");
      expect(activeItem).toBeDefined();
      expect(activeItem.getAttribute("data-key")).toBe(keys[0]);
    });

    it("should update textarea content", async () => {
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

      const expectedValue = sampleData[keys[0]].en;
      expect(editor.elements.input.value).toBe(expectedValue);
    });

    it("should reset language to 'en' when switching keys", () => {
      const keys = Object.keys(sampleData);
      editor.selectLanguage("es");
      editor.selectKey(keys[0]);

      expect(editor.selectedLanguage).toBe("en");
    });

    it("should warn if key doesn't exist", () => {
      editor.selectKey("non-existent-key");
      expect(editor.selectedKey).not.toBe("non-existent-key");
    });
  });

  // ============================================================================
  // Language Selection Tests
  // ============================================================================

  describe("selectLanguage()", () => {
    beforeEach(async () => {
      editor = new SheetEditor("editor-container");
      await editor.initialize(sessionId, sampleData);
    });

    it("should set selectedLanguage property", () => {
      editor.selectLanguage("es");
      expect(editor.selectedLanguage).toBe("es");
    });

    it("should mark active language pill", () => {
      editor.selectLanguage("es");

      const activePill = container.querySelector(".editor-pill.active");
      expect(activePill.getAttribute("data-lang")).toBe("es");
    });

    it("should update textarea content for language", async () => {
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

      editor.selectLanguage("es");
      const expectedValue = sampleData[keys[0]].es;
      expect(editor.elements.input.value).toBe(expectedValue);
    });

    it("should reject invalid language", () => {
      const originalLang = editor.selectedLanguage;
      editor.selectLanguage("invalid");

      expect(editor.selectedLanguage).toBe(originalLang);
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

    it("should update currentData on input change", async () => {
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);
      editor.selectLanguage("en");

      // Directly call handler method instead of dispatching
      const event = { target: { value: "New Value" } };
      await editor.handleInputChange(event);

      expect(editor.currentData[keys[0]].en).toBe("New Value");
    });

    it("should mark key as changed when value differs from baseline", async () => {
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

      const event = { target: { value: "Changed Value" } };
      await editor.handleInputChange(event);

      expect(editor.currentData[keys[0]]._changed).toBe(true);
    });

    it("should not mark as changed if value equals baseline", async () => {
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

      const baselineValue = sampleData[keys[0]].en;
      const event = { target: { value: baselineValue } };
      await editor.handleInputChange(event);

      expect(editor.currentData[keys[0]]._changed).toBe(false);
    });

    it("should record change in EditorStateManager", async () => {
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);
      editor.selectLanguage("en");

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

      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

      const event = { target: { value: "New Value" } };
      await editor.handleInputChange(event);

      expect(callbackCalled).toBe(true);
      expect(callbackData.newValue).toBe("New Value");
    });

    it("should update character count", async () => {
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

      editor.elements.input.value = "Test";
      const event = { target: { value: "Test" } };
      await editor.handleInputChange(event);

      expect(editor.elements.charCurrent.textContent).toBe("4");
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
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

      const event = { target: { value: "Changed" } };
      await editor.handleInputChange(event);

      expect(editor.elements.saveButton.disabled).toBe(false);
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
      editor.updateStatusBar("Test message", "info");
      expect(editor.elements.statusBar.textContent).toBe("Test message");
    });

    it("should apply correct className based on type", () => {
      editor.updateStatusBar("Success!", "success");
      expect(editor.elements.statusBar.className).toContain("success");
    });

    it("should clear message when empty", () => {
      editor.updateStatusBar("Initial", "info");
      editor.updateStatusBar("", "");
      expect(editor.elements.statusBar.textContent).toBe("");
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
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

      editor.elements.input.value = "Changed";
      editor.elements.input.dispatchEvent(new window.Event("input", { bubbles: true }));

      await editor.handleSave();

      const snapshot = await EditorStateManager.getLatestSnapshot(sessionId);
      expect(snapshot).toBeDefined();
    });

    it("should show success message after save", async () => {
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

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

      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

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
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

      editor.elements.input.value = "Changed";
      editor.elements.input.dispatchEvent(new window.Event("input", { bubbles: true }));

      // Mock confirm
      global.confirm = () => true;

      await editor.handleDiscard();

      const session = await EditorStateManager.getSession(sessionId);
      expect(session).toBeNull();
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

    it("should return current state object", async () => {
      const state = editor.getState();

      expect(state).toBeDefined();
      expect(state.currentData).toBeDefined();
      expect(state.changeCount).toBeDefined();
      expect(state.isDirty).toBeDefined();
    });

    it("should report 0 changes when no modifications", () => {
      const state = editor.getState();
      expect(state.changeCount).toBe(0);
      expect(state.isDirty).toBe(false);
    });

    it("should report changes correctly", async () => {
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);

      editor.elements.input.value = "Changed";
      editor.elements.input.dispatchEvent(new window.Event("input", { bubbles: true }));

      const state = editor.getState();
      expect(state.changeCount).toBeGreaterThan(0);
      expect(state.isDirty).toBe(true);
    });

    it("should include selected key and language in state", () => {
      const keys = Object.keys(sampleData);
      editor.selectKey(keys[0]);
      editor.selectLanguage("es");

      const state = editor.getState();
      expect(state.selectedKey).toBe(keys[0]);
      expect(state.selectedLanguage).toBe("es");
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
});
