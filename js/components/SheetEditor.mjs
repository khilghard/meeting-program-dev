/**
 * SheetEditor.mjs
 *
 * Form-based editor component for Google Sheets CMS data.
 * Features: scrollable key list, language pills, text input, change tracking.
 *
 * Integrates with:
 * - EditorStateManager (for state tracking)
 * - SheetsAPI (for metadata)
 * - Bootstrap 5 (for styling)
 * - CSS theme system (respects light/dark modes)
 */

import EditorStateManager from "../data/EditorStateManager.js";

/**
 * SheetEditor Component
 *
 * Renders a form-based editor UI with:
 * - Scrollable list of keys (left side)
 * - Language selector pills
 * - Single text input for current field
 * - Change tracking
 */
class SheetEditor {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`[SheetEditor] Container not found: ${containerId}`);
    }

    // Configuration
    this.options = {
      languages: ["en", "es", "fr", "swa"],
      onChangeCallback: options.onChangeCallback || null,
      onSaveCallback: options.onSaveCallback || null,
      ...options
    };

    // State
    this.sessionId = null;
    this.baselineData = {};
    this.currentData = {};
    this.selectedKey = null;
    this.selectedLanguage = "en";
    this.isDirty = false;
    this.isLoading = false;

    // DOM elements
    this.elements = {
      keyList: null,
      languagePills: null,
      input: null,
      statusBar: null,
      saveButton: null,
      discardButton: null,
      changeCount: null
    };

    console.log("[SheetEditor] Component initialized");
  }

  /**
   * Initialize editor with data and session
   *
   * @param {string} sessionId - Editor session ID
   * @param {Array} csvData - Raw CSV rows from Google Sheets
   * @returns {Promise<void>}
   */
  async initialize(sessionId, csvData) {
    if (!sessionId) {
      throw new Error("[SheetEditor] Session ID is required");
    }
    if (!Array.isArray(csvData) || csvData.length === 0) {
      throw new Error("[SheetEditor] CSV data is required");
    }

    this.sessionId = sessionId;

    // Store raw CSV data - first row is headers
    this.csvData = csvData;
    this.currentRowIndex = 0; // Start at first data row

    // Parse CSV structure - assume columns: [key, en, es, fr, swa]
    this.rows = csvData.slice(1).map((row) => {
      // Ensure each row has at least 5 columns (key, en, es, fr, swa)
      const normalizedRow = [...row];
      while (normalizedRow.length < 5) {
        normalizedRow.push("");
      }
      normalizedRow._changed = false;
      return normalizedRow;
    });

    console.log("[SheetEditor] Initialized with", this.rows.length, "data rows");

    // Render UI
    this.render();

    // Select first row if available
    if (this.rows.length > 0) {
      this.selectRow(0);
    }
  }

  /**
   * Render the editor UI
   */
  render() {
    this.container.innerHTML = "";
    this.container.className = "sheet-editor";

    // Build HTML structure - Row-based navigation with modern minimal design
    const html = `
      <div class="editor-wrapper">
        <!-- Editor main area -->
        <div class="editor-main-panel">
          <!-- Header with status -->
          <div class="editor-header">
            <h2 class="editor-title">Edit Program Row</h2>
            <div class="editor-status-info">
              <span class="editor-row-indicator">Row <span class="current-row">1</span> of <span class="total-rows">${this.rows.length}</span></span>
              <span class="editor-change-count" title="Number of changed rows">0 changes</span>
              <span class="editor-status-indicator" role="status" aria-live="polite"></span>
            </div>
          </div>

          <!-- Key dropdown -->
          <div class="editor-key-group">
            <label for="key-dropdown" class="editor-label">Field:</label>
            <select id="key-dropdown" class="editor-key-selector" aria-label="Select field key"></select>
          </div>

          <!-- Language pills -->
          <div class="editor-languages">
            <label class="editor-label">Language:</label>
            <div class="editor-pills">
              <button class="editor-pill" data-lang="en" aria-label="English">EN</button>
              <button class="editor-pill" data-lang="es" aria-label="Spanish">ES</button>
              <button class="editor-pill" data-lang="fr" aria-label="French">FR</button>
              <button class="editor-pill" data-lang="swa" aria-label="Swahili">SW</button>
            </div>
          </div>

          <!-- Text input -->
          <div class="editor-input-wrapper">
            <textarea
              class="editor-textarea"
              placeholder="Enter value for this language..."
              aria-label="Field value"
            ></textarea>
            <div class="editor-char-count">
              <span class="editor-char-current">0</span> /
              <span class="editor-char-limit">500</span> chars
            </div>
          </div>

          <!-- Navigation arrows below input -->
          <div class="editor-nav-controls">
            <button class="editor-btn-nav editor-btn-prev" title="Previous row" aria-label="Go to previous row">
              ← Prev
            </button>
            <button class="editor-btn-nav editor-btn-next" title="Next row" aria-label="Go to next row">
              Next →
            </button>
          </div>

          <!-- Action buttons -->
          <div class="editor-actions">
            <button class="editor-btn editor-btn-save" disabled>
              <span class="btn-icon">💾</span> Save Changes
            </button>
            <button class="editor-btn editor-btn-discard" disabled>
              <span class="btn-icon">✕</span> Discard
            </button>
            <button class="editor-btn editor-btn-import" title="Import from current profile">
              <span class="btn-icon">📥</span> Import Current
            </button>
            <button class="editor-btn editor-btn-delete" title="Delete this row">
              <span class="btn-icon">🗑️</span> Delete Row
            </button>
            <button class="editor-btn editor-btn-snapshot" title="Save current state">
              <span class="btn-icon">📸</span> Snapshot
            </button>
          </div>

          <!-- Status bar -->
          <div class="editor-footer">
            <div class="editor-status-bar" aria-live="assertive"></div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    // Cache DOM elements
    this.elements = {
      keySelector: this.container.querySelector("#key-dropdown"),
      languagePills: this.container.querySelectorAll(".editor-pill"),
      input: this.container.querySelector(".editor-textarea"),
      statusBar: this.container.querySelector(".editor-status-bar"),
      saveButton: this.container.querySelector(".editor-btn-save"),
      discardButton: this.container.querySelector(".editor-btn-discard"),
      deleteButton: this.container.querySelector(".editor-btn-delete"),
      importButton: this.container.querySelector(".editor-btn-import"),
      snapshotButton: this.container.querySelector(".editor-btn-snapshot"),
      prevButton: this.container.querySelector(".editor-btn-prev"),
      nextButton: this.container.querySelector(".editor-btn-next"),
      changeCount: this.container.querySelector(".editor-change-count"),
      charCurrent: this.container.querySelector(".editor-char-current"),
      charLimit: this.container.querySelector(".editor-char-limit"),
      statusIndicator: this.container.querySelector(".editor-status-indicator"),
      currentRow: this.container.querySelector(".current-row"),
      totalRows: this.container.querySelector(".total-rows")
    };

    // Add CSS styles to document if not already present
    this.injectStyles();

    // Populate key dropdown
    this.populateKeyDropdown();

    // Attach event listeners
    this.attachEventListeners();

    // Update UI state
    this.updateUI();

    console.log("[SheetEditor] UI rendered");
  }

  /**
   * Inject component-specific CSS styles
   */
  injectStyles() {
    // Check if styles already injected
    if (document.getElementById("sheet-editor-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "sheet-editor-styles";
    style.textContent = `
      /* ============================================================
         Sheet Editor Component Styles - Modern Minimal Design
         ============================================================ */

      .sheet-editor {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background-color: var(--bg-color);
        color: var(--text-color);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
        transition: background-color var(--transition-speed), color var(--transition-speed);
      }

      .editor-wrapper {
        display: flex;
        flex-direction: column;
        padding: 2rem;
        height: 100%;
        overflow: hidden;
        gap: 1.5rem;
      }

      /* ---- Main Panel ---- */
      .editor-main-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        overflow-y: auto;
        min-width: 0;
      }

      .editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--hr-line);
      }

      .editor-title {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 600;
        color: var(--text-color);
        letter-spacing: -0.5px;
      }

      .editor-status-info {
        display: flex;
        gap: 1rem;
        align-items: center;
        font-size: 0.875rem;
      }

      .editor-row-indicator {
        font-weight: 500;
        opacity: 0.8;
      }

      .editor-change-count {
        padding: 0.375rem 0.875rem;
        background-color: var(--card-bg);
        border-radius: 2rem;
        color: var(--text-color);
        font-weight: 500;
        font-size: 0.85rem;
      }

      .editor-status-indicator {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #d0d0d0;
      }

      .editor-status-indicator.saving {
        background-color: #ffc107;
        animation: pulse 1s infinite;
      }

      .editor-status-indicator.success {
        background-color: #28a745;
      }

      .editor-status-indicator.error {
        background-color: #dc3545;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      /* ---- Labels ---- */
      .editor-label {
        display: block;
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
        color: var(--text-color);
        letter-spacing: 0.3px;
      }

      /* ---- Key Dropdown (Modern Minimal) ---- */
      .editor-key-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .editor-key-selector {
        padding: 0.75rem 1rem;
        background-color: var(--card-bg);
        color: var(--text-color);
        border: 1px solid var(--hr-line);
        border-radius: 0.5rem;
        font-family: inherit;
        font-size: 1rem;
        cursor: pointer;
        transition: all var(--transition-speed);
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M1 4l5 4 5-4'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 1rem center;
        padding-right: 2.5rem;
      }

      .editor-key-selector:hover {
        border-color: var(--accent-color);
        background-color: var(--card-bg);
      }

      .editor-key-selector:focus {
        outline: none;
        border-color: var(--accent-color);
        box-shadow: 0 0 0 3px rgba(13, 101, 158, 0.1);
      }

      [data-theme="dark"] .editor-key-selector {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ccc' d='M1 4l5 4 5-4'/%3E%3C/svg%3E");
      }

      /* ---- Language Pills ---- */
      .editor-languages {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .editor-pills {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .editor-pill {
        padding: 0.625rem 1.25rem;
        background-color: var(--card-bg);
        border: 2px solid transparent;
        border-radius: 2rem;
        cursor: pointer;
        color: var(--text-color);
        font-weight: 600;
        font-size: 0.9rem;
        transition: all var(--transition-speed) ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 60px;
        text-align: center;
      }

      .editor-pill:hover {
        background-color: var(--accent-color);
        color: var(--accent-text);
        border-color: var(--accent-color);
        transform: scale(1.05);
      }

      .editor-pill.active {
        background-color: var(--accent-color);
        color: var(--accent-text);
        border-color: var(--accent-color);
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(13, 101, 158, 0.25);
      }

      /* ---- Text Input ---- */
      .editor-input-wrapper {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        flex: 1;
        min-height: 0;
      }

      .editor-textarea {
        flex: 1;
        padding: 1rem;
        background-color: var(--card-bg);
        color: var(--text-color);
        border: 1px solid var(--hr-line);
        border-radius: 0.5rem;
        font-family: inherit;
        font-size: 1rem;
        line-height: 1.5;
        resize: none;
        transition: all var(--transition-speed);
        min-height: 150px;
      }

      .editor-textarea:hover {
        border-color: var(--accent-color);
      }

      .editor-textarea:focus {
        outline: none;
        border-color: var(--accent-color);
        box-shadow: 0 0 0 3px rgba(13, 101, 158, 0.1);
      }

      .editor-textarea::placeholder {
        color: var(--text-color);
        opacity: 0.5;
      }

      .editor-char-count {
        font-size: 0.8rem;
        color: var(--text-color);
        opacity: 0.65;
        text-align: right;
      }

      /* ---- Navigation Controls (Below Input) ---- */
      .editor-nav-controls {
        display: flex;
        gap: 1rem;
        justify-content: space-between;
      }

      .editor-btn-nav {
        padding: 0.75rem 1.5rem;
        background-color: var(--card-bg);
        border: 1px solid var(--hr-line);
        border-radius: 0.5rem;
        color: var(--text-color);
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all var(--transition-speed);
        flex: 1;
      }

      .editor-btn-nav:hover:not(:disabled) {
        background-color: var(--accent-color);
        color: var(--accent-text);
        border-color: var(--accent-color);
      }

      .editor-btn-nav:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* ---- Action Buttons ---- */
      .editor-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        padding-top: 1rem;
      }

      .editor-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-speed);
        font-size: 0.95rem;
      }

      .btn-icon {
        font-size: 1.1em;
      }

      .editor-btn-save {
        background-color: var(--accent-color);
        color: var(--accent-text);
      }

      .editor-btn-save:hover:not(:disabled) {
        background-color: var(--accent-hover);
        box-shadow: 0 4px 12px rgba(13, 101, 158, 0.2);
      }

      .editor-btn-save:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .editor-btn-discard {
        background-color: #6c757d;
        color: white;
      }

      .editor-btn-discard:hover:not(:disabled) {
        background-color: #5a6268;
        box-shadow: 0 4px 12px rgba(108, 117, 125, 0.2);
      }

      .editor-btn-discard:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .editor-btn-import {
        background-color: #28a745;
        color: white;
      }

      .editor-btn-import:hover {
        background-color: #218838;
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
      }

      .editor-btn-delete {
        background-color: #dc3545;
        color: white;
      }

      .editor-btn-delete:hover {
        background-color: #c82333;
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
      }

      .editor-btn-snapshot {
        background-color: #17a2b8;
        color: white;
      }

      .editor-btn-snapshot:hover {
        background-color: #138496;
        box-shadow: 0 4px 12px rgba(23, 162, 184, 0.2);
      }

      /* ---- Status Bar ---- */
      .editor-footer {
        border-top: 1px solid var(--hr-line);
        padding-top: 1rem;
        min-height: 2rem;
      }

      .editor-status-bar {
        font-size: 0.9rem;
        color: var(--text-color);
        min-height: 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .editor-status-bar.success {
        color: #28a745;
      }

      .editor-status-bar.error {
        color: #dc3545;
      }

      .editor-status-bar.info {
        color: var(--accent-color);
      }

      /* ---- Responsive ---- */
      @media (max-width: 768px) {
        .editor-wrapper {
          padding: 1.5rem;
          gap: 1rem;
        }

        .editor-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .editor-title {
          font-size: 1.5rem;
        }

        .editor-status-info {
          width: 100%;
        }

        .editor-main-panel {
          gap: 1rem;
        }

        .editor-textarea {
          min-height: 120px;
        }
      }
    `;

    document.head.appendChild(style);
    console.log("[SheetEditor] Styles injected");
  }

  /**
   * Update status bar message (new simple version)
   */
  updateStatusBar(message = "") {
    if (message) {
      this.elements.statusBar.textContent = message;
    } else {
      const row = this.rows[this.currentRowIndex];
      const key = row ? row[0] : "N/A";
      const lang = this.selectedLanguage.toUpperCase();
      this.elements.statusBar.textContent = `Editing: ${key} (${lang})`;
    }
  }

  /**
   * Update text input based on current row and language
   */
  updateInput() {
    const row = this.rows[this.currentRowIndex];
    if (!row) {
      this.elements.input.value = "";
      return;
    }

    // Map language to column index: en=1, es=2, fr=3, swa=4
    const columnMap = { en: 1, es: 2, fr: 3, swa: 4 };
    const columnIndex = columnMap[this.selectedLanguage] || 1;

    const value = row[columnIndex] || "";
    this.elements.input.value = value;
    this.updateCharCount();

    // Update status
    this.updateStatusBar();
  }

  /**
   * Update character count display
   */
  updateCharCount() {
    const len = this.elements.input.value.length;
    const limit = parseInt(this.elements.charLimit.textContent);

    this.elements.charCurrent.textContent = len;

    // Warn if near limit
    if (len >= limit * 0.9) {
      this.elements.charCurrent.style.color = "#ff9800";
    } else {
      this.elements.charCurrent.style.color = "inherit";
    }
  }

  /**
   * Populate the key dropdown with available keys
   */
  populateKeyDropdown() {
    this.elements.keySelector.innerHTML = "";

    // Get all unique keys from the rows (assuming key is in column 0)
    const keys = new Set();
    this.rows.forEach((row) => {
      if (row[0] && row[0].trim()) {
        keys.add(row[0].trim());
      }
    });

    keys.forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key;
      this.elements.keySelector.appendChild(option);
    });

    // Select first key from current row
    if (this.rows.length > 0) {
      const firstKey = this.rows[0][0];
      if (firstKey) {
        this.elements.keySelector.value = firstKey;
      }
    }
  }

  /**
   * Select a specific row by index
   *
   * @param {number} rowIndex - Index in rows array (0-based)
   */
  selectRow(rowIndex) {
    if (rowIndex < 0 || rowIndex >= this.rows.length) {
      console.warn("[SheetEditor] Row index out of bounds:", rowIndex);
      return;
    }

    this.currentRowIndex = rowIndex;
    const row = this.rows[rowIndex];

    // Update dropdown to reflect current row's key
    const key = row[0];
    if (key) {
      this.elements.keySelector.value = key;
    }

    // Reset language to 'en' when switching rows
    this.selectedLanguage = "en";

    // Update input and UI (which updates pill states)
    this.updateUI();
    this.updateRowIndicator();
  }

  /**
   * Update the row indicator (Row X of Y)
   */
  updateRowIndicator() {
    if (this.elements.currentRow) {
      this.elements.currentRow.textContent = this.currentRowIndex + 1;
    }
    if (this.elements.totalRows) {
      this.elements.totalRows.textContent = this.rows.length;
    }
  }

  /**
   * Navigate to next row
   */
  nextRow() {
    if (this.currentRowIndex < this.rows.length - 1) {
      this.selectRow(this.currentRowIndex + 1);
    } else {
      console.log("[SheetEditor] Already at last row");
    }
  }

  /**
   * Navigate to previous row
   */
  prevRow() {
    if (this.currentRowIndex > 0) {
      this.selectRow(this.currentRowIndex - 1);
    } else {
      console.log("[SheetEditor] Already at first row");
    }
  }

  /**
   * Update UI based on current state
   */
  updateUI() {
    // Update textarea content for selected language
    this.updateInput();

    // Update active pill styling
    this.elements.languagePills.forEach((pill) => {
      const lang = pill.getAttribute("data-lang");
      if (lang === this.selectedLanguage) {
        pill.classList.add("active");
      } else {
        pill.classList.remove("active");
      }
    });

    // Count changed rows
    const changedCount = this.rows.filter((r) => r._changed).length;
    this.elements.changeCount.textContent = `${changedCount} change${changedCount !== 1 ? "s" : ""}`;

    // Enable/disable buttons
    this.elements.saveButton.disabled = changedCount === 0;
    this.elements.discardButton.disabled = changedCount === 0;

    // Disable prev/next if no rows
    this.elements.prevButton.disabled = this.rows.length === 0 || this.currentRowIndex === 0;
    this.elements.nextButton.disabled =
      this.rows.length === 0 || this.currentRowIndex === this.rows.length - 1;

    // Disable delete if only one row
    this.elements.deleteButton.disabled = this.rows.length <= 1;
  }

  attachEventListeners() {
    // Text input change
    this.elements.input.addEventListener("input", (e) => this.handleInputChange(e));

    // Language pill buttons
    this.elements.languagePills.forEach((pill) => {
      pill.addEventListener("click", (e) => {
        e.preventDefault();
        const lang = pill.getAttribute("data-lang");
        if (lang) {
          this.selectedLanguage = lang;
          this.updateUI();
        }
      });
    });

    // Key dropdown change
    this.elements.keySelector.addEventListener("change", (e) => {
      // When user changes key, update the current row's key
      const newKey = e.target.value;
      if (this.rows[this.currentRowIndex]) {
        this.rows[this.currentRowIndex][0] = newKey;
        this.selectRow(this.currentRowIndex); // Refresh UI
      }
    });

    // Navigation buttons
    this.elements.prevButton.addEventListener("click", () => this.prevRow());
    this.elements.nextButton.addEventListener("click", () => this.nextRow());

    // Delete button
    this.elements.deleteButton.addEventListener("click", () => this.handleDelete());

    // Import button
    this.elements.importButton.addEventListener("click", () => this.handleImport());

    // Save button
    this.elements.saveButton.addEventListener("click", () => this.handleSave());

    // Discard button
    this.elements.discardButton.addEventListener("click", () => this.handleDiscard());

    // Snapshot button
    this.elements.snapshotButton.addEventListener("click", () => this.handleSnapshot());

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" && e.ctrlKey) {
        e.preventDefault();
        this.prevRow();
      } else if (e.key === "ArrowDown" && e.ctrlKey) {
        e.preventDefault();
        this.nextRow();
      }
    });

    console.log("[SheetEditor] Event listeners attached");
  }

  /**
   * Handle text input change
   */
  async handleInputChange(event) {
    const row = this.rows[this.currentRowIndex];
    if (!row) return;

    const newValue = event.target.value;

    // Map language to column index
    const columnMap = { en: 1, es: 2, fr: 3, swa: 4 };
    const columnIndex = columnMap[this.selectedLanguage] || 1;

    const oldValue = row[columnIndex] || "";
    row[columnIndex] = newValue;

    // Mark row as changed
    if (!row._changed) {
      row._changed = true;
    }

    // Record change in session
    if (this.sessionId && oldValue !== newValue) {
      try {
        await EditorStateManager.recordChange(
          this.sessionId,
          row[0],
          this.selectedLanguage,
          oldValue,
          newValue
        );
      } catch (err) {
        console.error("[SheetEditor] Failed to record change:", err);
      }
    }

    // Update UI
    this.updateCharCount();
    this.updateUI();

    // Invoke callback
    if (this.options.onChangeCallback) {
      this.options.onChangeCallback({
        key: row[0],
        language: this.selectedLanguage,
        oldValue,
        newValue,
        rowIndex: this.currentRowIndex
      });
    }

    console.log("[SheetEditor] Change recorded:", row[0], this.selectedLanguage);
  }

  /**
   * Handle delete row button click
   */
  async handleDelete() {
    if (this.rows.length <= 1) {
      alert("Cannot delete the last row");
      return;
    }

    const row = this.rows[this.currentRowIndex];
    const key = row ? row[0] : "unknown";

    if (!confirm(`Delete row with key "${key}"? This cannot be undone.`)) {
      return;
    }

    // Remove the row
    this.rows.splice(this.currentRowIndex, 1);

    // Adjust current row index if we deleted the last row
    if (this.currentRowIndex >= this.rows.length) {
      this.currentRowIndex = Math.max(0, this.rows.length - 1);
    }

    // Update UI
    this.populateKeyDropdown();
    this.selectRow(this.currentRowIndex);
    this.updateStatusBar();

    console.log("[SheetEditor] Row deleted:", key);
  }

  /**
   * Handle import button click - import from current profile
   */
  async handleImport() {
    if (!confirm("Import data from current profile? This will replace all current data.")) {
      return;
    }

    // Emit event so editor.js can handle the import
    const event = new CustomEvent("import-requested", {
      detail: { importType: "current-profile" }
    });
    document.dispatchEvent(event);
  }

  async handleSave() {
    if (!this.sessionId) {
      this.updateStatusBar("No session active");
      return;
    }

    this.isLoading = true;
    this.elements.statusIndicator.className = "editor-status-indicator saving";

    try {
      // Export current CSV state
      const csv = this.exportCSV();

      // Save snapshot via EditorStateManager
      await EditorStateManager.saveSnapshot(this.sessionId, csv, { type: "manual-save" });

      this.updateStatusBar("Changes saved successfully!");
      this.elements.statusIndicator.className = "editor-status-indicator success";

      if (this.options.onSaveCallback) {
        this.options.onSaveCallback({
          sessionId: this.sessionId,
          rowCount: this.rows.length,
          csv: csv
        });
      }
    } catch (err) {
      console.error("[SheetEditor] Save failed:", err);
      this.updateStatusBar("Failed to save: " + err.message);
      this.elements.statusIndicator.className = "editor-status-indicator error";
    } finally {
      this.isLoading = false;

      // Reset indicator after 3 seconds
      setTimeout(() => {
        this.elements.statusIndicator.className = "editor-status-indicator";
      }, 3000);
    }
  }

  /**
   * Handle discard button click
   */
  async handleDiscard() {
    if (!this.sessionId) {
      this.updateStatusBar("No session active");
      return;
    }

    if (!confirm("Discard all changes? This cannot be undone.")) {
      return;
    }

    this.isLoading = true;
    this.elements.statusIndicator.className = "editor-status-indicator saving";

    try {
      // Reload original data from session
      await EditorStateManager.discardSession(this.sessionId);

      // Reinitialize
      this.rows = this.csvData.slice(1);
      this.isDirty = false;
      this.currentRowIndex = 0;

      this.populateKeyDropdown();
      this.selectRow(0);
      this.updateStatusBar("Changes discarded");
      this.elements.statusIndicator.className = "editor-status-indicator";

      console.log("[SheetEditor] Changes discarded");
    } catch (err) {
      console.error("[SheetEditor] Discard failed:", err);
      this.updateStatusBar("Failed to discard: " + err.message);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Handle snapshot button click
   */
  async handleSnapshot() {
    if (!this.sessionId) {
      this.updateStatusBar("No session active");
      return;
    }

    this.isLoading = true;
    this.elements.statusIndicator.className = "editor-status-indicator saving";

    try {
      const csv = this.exportCSV();
      const snapshotId = await EditorStateManager.saveSnapshot(this.sessionId, csv, {
        type: "manual-snapshot",
        timestamp: new Date().toISOString()
      });

      this.updateStatusBar(`Snapshot saved (${snapshotId.substring(0, 8)}...)`);

      setTimeout(() => {
        this.elements.statusIndicator.className = "editor-status-indicator";
      }, 2000);
    } catch (err) {
      console.error("[SheetEditor] Snapshot failed:", err);
      this.updateStatusBar("Failed to save snapshot: " + err.message);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Export current data as CSV string
   *
   * @returns {string} CSV formatted data
   */
  exportCSV() {
    // Build CSV with header row
    const lines = [];

    // Header
    lines.push("key\ten\tes\tfr\tswa");

    // Data rows
    this.rows.forEach((row) => {
      // Ensure all columns exist
      const key = row[0] || "";
      const en = row[1] || "";
      const es = row[2] || "";
      const fr = row[3] || "";
      const swa = row[4] || "";

      // Escape quotes and join with tabs
      const escapedRow = [key, en, es, fr, swa]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join("\t");

      lines.push(escapedRow);
    });

    return lines.join("\n");
  }

  /**
   * Get current editor state
   *
   * @returns {Object} { rows, changeCount, isDirty }
   */
  getState() {
    const changeCount = this.rows.filter((r) => r._changed).length;

    return {
      rows: this.rows,
      csv: this.exportCSV(),
      changeCount,
      isDirty: changeCount > 0,
      currentRowIndex: this.currentRowIndex,
      selectedLanguage: this.selectedLanguage
    };
  }

  /**
   * Destroy component and clean up
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = "";
    }

    console.log("[SheetEditor] Component destroyed");
  }
}

export default SheetEditor;
