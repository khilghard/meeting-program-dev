/**
 * EditorStateManager.js
 *
 * IndexedDB-backed state management for CMS editor sessions.
 * Handles: session tracking, change recording, snapshot management, state reconstruction.
 *
 * Database: meeting_program_editor
 * Stores:
 *   - editor_sessions: Track active editing sessions
 *   - editor_changes: Record individual field modifications
 *   - editor_snapshots: Save draft snapshots of entire CSV state
 */

import Dexie from "dexie";
import { v4 as uuidv4 } from "uuid";

/**
 * Initialize IndexedDB schema
 */
const editorDb = new Dexie("meeting_program_editor");
editorDb.version(1).stores({
  editor_sessions: "sessionId, &sheetId_email", // sessionId primary, unique compound index
  editor_changes: "changeId, sessionId, key", // changeId primary, two secondary indexes
  editor_snapshots: "snapshotId, sessionId" // snapshotId primary, sessionId index
});

/**
 * Editor State Manager
 *
 * Manages editing state in IndexedDB with session isolation.
 * Each edit operation is tracked and can be exported as CSV.
 */
const EditorStateManager = (() => {
  // Constants
  const SESSION_STATUS = {
    ACTIVE: "active",
    SAVED: "saved",
    ABANDONED: "abandoned"
  };

  /**
   * Start a new editing session
   *
   * Creates a new session record in IndexedDB.
   * If editing same sheet+user, closes old session first.
   *
   * @param {string} sheetId - Google Sheet ID
   * @param {string} userEmail - Authenticated user email
   * @returns {Promise<string>} Session ID (UUID)
   * @throws {Error} If parameters invalid
   */
  async function startSession(sheetId, userEmail) {
    if (!sheetId || typeof sheetId !== "string") {
      throw new Error("[EditorStateManager] Sheet ID is required");
    }
    if (!userEmail || typeof userEmail !== "string") {
      throw new Error("[EditorStateManager] User email is required");
    }

    const normalizedEmail = userEmail.toLowerCase().trim();
    const compoundKey = `${sheetId}_${normalizedEmail}`;

    try {
      // Check if session already exists for this user+sheet
      const existingSession = await editorDb.editor_sessions.get({
        sheetId_email: compoundKey
      });

      if (existingSession && existingSession.status === SESSION_STATUS.ACTIVE) {
        console.log(`[EditorStateManager] Resuming existing session: ${existingSession.sessionId}`);
        return existingSession.sessionId;
      }

      // Create new session
      const sessionId = uuidv4();
      const now = Date.now();

      await editorDb.editor_sessions.add({
        sessionId,
        sheetId,
        userEmail: normalizedEmail,
        startTime: now,
        lastModified: now,
        status: SESSION_STATUS.ACTIVE,
        sheetId_email: compoundKey // Compound key for uniqueness
      });

      console.log(`[EditorStateManager] Session started: ${sessionId}`);
      return sessionId;
    } catch (err) {
      console.error("[EditorStateManager] Failed to start session:", err);
      throw err;
    }
  }

  /**
   * Get session by ID
   *
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Object|null>} Session object or null if not found
   */
  async function getSession(sessionId) {
    if (!sessionId) {
      throw new Error("[EditorStateManager] Session ID is required");
    }

    try {
      const session = await editorDb.editor_sessions.get(sessionId);
      return session || null;
    } catch (err) {
      console.error("[EditorStateManager] Failed to get session:", err);
      throw err;
    }
  }

  /**
   * Record a single field change within a session
   *
   * @param {string} sessionId - Session UUID
   * @param {string} key - Data key (e.g., "greetings.hello")
   * @param {string} language - Language code (en, es, fr, swa)
   * @param {string} oldValue - Previous value
   * @param {string} newValue - New value
   * @returns {Promise<string>} Change ID (UUID)
   * @throws {Error} If session invalid or parameters missing
   */
  async function recordChange(sessionId, key, language, oldValue, newValue) {
    if (!sessionId) {
      throw new Error("[EditorStateManager] Session ID is required");
    }
    if (!key) {
      throw new Error("[EditorStateManager] Key is required");
    }
    if (!language) {
      throw new Error("[EditorStateManager] Language is required");
    }

    try {
      // Verify session exists
      const session = await editorDb.editor_sessions.get(sessionId);
      if (!session) {
        throw new Error(`[EditorStateManager] Session not found: ${sessionId}`);
      }

      // Record the change
      const changeId = uuidv4();
      const now = Date.now();

      await editorDb.editor_changes.add({
        changeId,
        sessionId,
        key,
        language,
        oldValue: oldValue || "",
        newValue: newValue || "",
        timestamp: now
      });

      // Update session lastModified
      await editorDb.editor_sessions.update(sessionId, {
        lastModified: now
      });

      console.log(
        `[EditorStateManager] Change recorded: ${key}[${language}] = "${newValue}"`
      );
      return changeId;
    } catch (err) {
      console.error("[EditorStateManager] Failed to record change:", err);
      throw err;
    }
  }

  /**
   * Get all changes for a session
   *
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Array>} Array of change objects
   */
  async function getSessionChanges(sessionId) {
    if (!sessionId) {
      throw new Error("[EditorStateManager] Session ID is required");
    }

    try {
      const changes = await editorDb.editor_changes
        .where("sessionId")
        .equals(sessionId)
        .toArray();

      console.log(`[EditorStateManager] Retrieved ${changes.length} changes`);
      return changes;
    } catch (err) {
      console.error("[EditorStateManager] Failed to get changes:", err);
      throw err;
    }
  }

  /**
   * Get all changes for a specific key across all languages
   *
   * @param {string} key - Data key
   * @returns {Promise<Array>} Array of change objects
   */
  async function getChangesByKey(key) {
    if (!key) {
      throw new Error("[EditorStateManager] Key is required");
    }

    try {
      const changes = await editorDb.editor_changes.where("key").equals(key).toArray();

      return changes;
    } catch (err) {
      console.error("[EditorStateManager] Failed to get changes by key:", err);
      throw err;
    }
  }

  /**
   * Reconstruct current state from all changes in a session
   *
   * Returns object: { key: { en, es, fr, swa, _changed: true/false } }
   *
   * @param {string} sessionId - Session UUID
   * @param {Object} baselineData - Original CSV data as object (from initial load)
   * @returns {Promise<Object>} Current state after all changes
   */
  async function reconstructSessionState(sessionId, baselineData = {}) {
    if (!sessionId) {
      throw new Error("[EditorStateManager] Session ID is required");
    }

    try {
      // Start with baseline
      const state = JSON.parse(JSON.stringify(baselineData)); // Deep clone

      // Replay all changes
      const changes = await getSessionChanges(sessionId);

      for (const change of changes) {
        const { key, language, newValue } = change;

        // Create key entry if not exists
        if (!state[key]) {
          state[key] = { en: "", es: "", fr: "", swa: "", _changed: false };
        }

        // Apply change
        state[key][language] = newValue;
        state[key]._changed = true;
      }

      console.log(
        `[EditorStateManager] State reconstructed from ${changes.length} changes`
      );
      return state;
    } catch (err) {
      console.error("[EditorStateManager] Failed to reconstruct state:", err);
      throw err;
    }
  }

  /**
   * Save a snapshot of current editor state
   *
   * Useful for persisting draft state before uploading.
   *
   * @param {string} sessionId - Session UUID
   * @param {string} csvData - Current CSV data as string
   * @param {Object} metadata - Optional metadata (description, etc)
   * @returns {Promise<string>} Snapshot ID (UUID)
   */
  async function saveSnapshot(sessionId, csvData, metadata = {}) {
    if (!sessionId) {
      throw new Error("[EditorStateManager] Session ID is required");
    }
    if (!csvData) {
      throw new Error("[EditorStateManager] CSV data is required");
    }

    try {
      // Verify session exists
      const session = await editorDb.editor_sessions.get(sessionId);
      if (!session) {
        throw new Error(`[EditorStateManager] Session not found: ${sessionId}`);
      }

      const snapshotId = uuidv4();
      const now = Date.now();

      await editorDb.editor_snapshots.add({
        snapshotId,
        sessionId,
        csvData,
        timestamp: now,
        metadata: {
          ...metadata,
          rowCount: csvData.split("\n").length
        }
      });

      console.log(`[EditorStateManager] Snapshot saved: ${snapshotId}`);
      return snapshotId;
    } catch (err) {
      console.error("[EditorStateManager] Failed to save snapshot:", err);
      throw err;
    }
  }

  /**
   * Get latest snapshot for a session
   *
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Object|null>} Latest snapshot or null
   */
  async function getLatestSnapshot(sessionId) {
    if (!sessionId) {
      throw new Error("[EditorStateManager] Session ID is required");
    }

    try {
      const snapshots = await editorDb.editor_snapshots
        .where("sessionId")
        .equals(sessionId)
        .toArray();

      if (snapshots.length === 0) {
        return null;
      }

      // Sort by timestamp descending and return first (latest)
      snapshots.sort((a, b) => b.timestamp - a.timestamp);
      return snapshots[0];
    } catch (err) {
      console.error("[EditorStateManager] Failed to get snapshot:", err);
      throw err;
    }
  }

  /**
   * Mark session as saved and clear its changes
   *
   * Called after successful upload to Google Sheets.
   * Marks changes as committed.
   *
   * @param {string} sessionId - Session UUID
   * @returns {Promise<void>}
   */
  async function markSessionSaved(sessionId) {
    if (!sessionId) {
      throw new Error("[EditorStateManager] Session ID is required");
    }

    try {
      const session = await editorDb.editor_sessions.get(sessionId);
      if (!session) {
        throw new Error(`[EditorStateManager] Session not found: ${sessionId}`);
      }

      await editorDb.editor_sessions.update(sessionId, {
        status: SESSION_STATUS.SAVED,
        lastModified: Date.now()
      });

      console.log(`[EditorStateManager] Session marked as saved: ${sessionId}`);
    } catch (err) {
      console.error("[EditorStateManager] Failed to mark session saved:", err);
      throw err;
    }
  }

  /**
   * Discard a session and all its changes
   *
   * Removes all associated data from IndexedDB.
   *
   * @param {string} sessionId - Session UUID
   * @returns {Promise<void>}
   */
  async function discardSession(sessionId) {
    if (!sessionId) {
      throw new Error("[EditorStateManager] Session ID is required");
    }

    try {
      // Delete all changes for this session
      const deleted = await editorDb.editor_changes
        .where("sessionId")
        .equals(sessionId)
        .delete();

      console.log(`[EditorStateManager] Deleted ${deleted} changes`);

      // Delete all snapshots for this session
      const snapshotDeleted = await editorDb.editor_snapshots
        .where("sessionId")
        .equals(sessionId)
        .delete();

      console.log(`[EditorStateManager] Deleted ${snapshotDeleted} snapshots`);

      // Delete session itself
      await editorDb.editor_sessions.delete(sessionId);

      console.log(`[EditorStateManager] Session discarded: ${sessionId}`);
    } catch (err) {
      console.error("[EditorStateManager] Failed to discard session:", err);
      throw err;
    }
  }

  /**
   * Export changes as CSV (only changed rows)
   *
   * Reconstructs state and generates CSV with only rows that have changes.
   * Format: key,en,es,fr,swa
   *
   * @param {string} sessionId - Session UUID
   * @param {Object} baselineData - Original data object
   * @returns {Promise<string>} CSV data of changed rows only
   */
  async function exportChanges(sessionId, baselineData = {}) {
    if (!sessionId) {
      throw new Error("[EditorStateManager] Session ID is required");
    }

    try {
      const state = await reconstructSessionState(sessionId, baselineData);

      // Build CSV header
      const header = "key,en,es,fr,swa";
      const rows = [header];

      // Add only changed rows
      for (const [key, values] of Object.entries(state)) {
        if (values._changed) {
          const row = [
            key,
            values.en || "",
            values.es || "",
            values.fr || "",
            values.swa || ""
          ];

          // Quote fields with commas, newlines, or quotes
          const quotedRow = row.map((field) => {
            if (typeof field === "string" && (field.includes(",") || field.includes("\n") || field.includes('"'))) {
              return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
          });

          rows.push(quotedRow.join(","));
        }
      }

      const csv = rows.join("\n");
      console.log(
        `[EditorStateManager] Exported ${rows.length - 1} changed rows as CSV`
      );
      return csv;
    } catch (err) {
      console.error("[EditorStateManager] Failed to export changes:", err);
      throw err;
    }
  }

  /**
   * Export full state as CSV (all rows, including unchanged)
   *
   * @param {string} sessionId - Session UUID
   * @param {Object} baselineData - Original data object
   * @returns {Promise<string>} Complete CSV data
   */
  async function exportFullState(sessionId, baselineData = {}) {
    if (!sessionId) {
      throw new Error("[EditorStateManager] Session ID is required");
    }

    try {
      const state = await reconstructSessionState(sessionId, baselineData);

      // Build CSV with all rows
      const header = "key,en,es,fr,swa";
      const rows = [header];

      for (const [key, values] of Object.entries(state)) {
        const row = [
          key,
          values.en || "",
          values.es || "",
          values.fr || "",
          values.swa || ""
        ];

        const quotedRow = row.map((field) => {
          if (typeof field === "string" && (field.includes(",") || field.includes("\n") || field.includes('"'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        });

        rows.push(quotedRow.join(","));
      }

      const csv = rows.join("\n");
      console.log(`[EditorStateManager] Exported ${rows.length - 1} total rows as CSV`);
      return csv;
    } catch (err) {
      console.error("[EditorStateManager] Failed to export full state:", err);
      throw err;
    }
  }

  /**
   * Clear all data from editor database (testing only)
   *
   * @returns {Promise<void>}
   */
  async function clearAll() {
    try {
      await editorDb.delete();
      await editorDb.open();
      console.log("[EditorStateManager] Database cleared");
    } catch (err) {
      console.error("[EditorStateManager] Failed to clear database:", err);
      throw err;
    }
  }

  // Public API
  return {
    startSession,
    getSession,
    recordChange,
    getSessionChanges,
    getChangesByKey,
    reconstructSessionState,
    saveSnapshot,
    getLatestSnapshot,
    markSessionSaved,
    discardSession,
    exportChanges,
    exportFullState,
    clearAll,
    // Expose constants
    SESSION_STATUS,
    // Expose database for testing
    db: editorDb
  };
})();

export default EditorStateManager;
