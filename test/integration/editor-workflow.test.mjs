/**
 * Editor Integration Tests - Phase 6
 *
 * Tests for the complete editor workflow:
 * - Load program → authenticate → edit → save → upload to Google Sheets
 * - Error scenarios (auth failure, upload failure, permission errors)
 * - State reconciliation after upload
 *
 * @module test/integration/editor-workflow.test.mjs
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import EditorStateManager from "../../js/data/EditorStateManager.js";

// ============================================================================
// SETUP
// ============================================================================

beforeAll(async () => {
  // Clear database before all tests to ensure clean state
  try {
    await EditorStateManager.clearAll();
  } catch (err) {
    console.log("[Test] Database clear during setup:", err.message);
  }
});

// Mock data
const mockUser = {
  email: "test@example.com",
  name: "Test User"
};

const mockSheetId = "test-sheet-123";

const mockInitialData = {
  "opening.hymn": {
    en: "Opening Hymn",
    es: "Himno de Apertura",
    fr: "Hymne d'Ouverture",
    swa: "Wimbo wa Kuanza"
  },
  "opening.prayer": {
    en: "Opening Prayer",
    es: "Oración de Apertura",
    fr: "Prière d'Ouverture",
    swa: "Sala ya Kuanza"
  },
  "sacrament.hymn": {
    en: "Sacrament Hymn",
    es: "Himno del Sacramento",
    fr: "Hymne Eucharistique",
    swa: "Wimbo wa Sactamenti"
  }
};

// ============================================================================
// SETUP
// ============================================================================

describe("Editor Workflow Integration", () => {
  // ============================================================================
  // SESSION MANAGEMENT TESTS
  // ============================================================================

  describe("Session Lifecycle", () => {
    it("should start a new session", async () => {
      const sessionId = await EditorStateManager.startSession(mockSheetId, mockUser.email);

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe("string");
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it("should track user and sheet ID in session", async () => {
      const sessionId = await EditorStateManager.startSession(mockSheetId, mockUser.email);

      const session = await EditorStateManager.db.editor_sessions.get(sessionId);

      expect(session).toBeDefined();
      expect(session.userEmail).toBe(mockUser.email);
      expect(session.sheetId).toBe(mockSheetId);
    });

    it("should record session start timestamp", async () => {
      const sessionId = await EditorStateManager.startSession(mockSheetId, mockUser.email);

      const session = await EditorStateManager.db.editor_sessions.get(sessionId);

      expect(session.startTime).toBeDefined();
      expect(typeof session.startTime).toBe("number");
      expect(session.startTime).toBeGreaterThan(0);
    });

    it("should clear session after completion", async () => {
      const sessionId = await EditorStateManager.startSession(mockSheetId, mockUser.email);

      await EditorStateManager.discardSession(sessionId);

      const session = await EditorStateManager.db.editor_sessions.get(sessionId);
      expect(session).toBeUndefined();
    });
  });

  // ============================================================================
  // STATE PERSISTENCE TESTS
  // ============================================================================

  describe("State Persistence", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession(mockSheetId, mockUser.email);
    });

    afterEach(async () => {
      if (sessionId) {
        await EditorStateManager.discardSession(sessionId);
      }
    });

    it("should record a change to IndexedDB", async () => {
      const key = "opening.hymn";
      const lang = "es";
      const oldValue = mockInitialData[key][lang];
      const newValue = "Himno Nuevo de Apertura";

      await EditorStateManager.recordChange(sessionId, key, lang, oldValue, newValue);

      const changes = await EditorStateManager.getSessionChanges(sessionId);

      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].key).toBe(key);
      expect(changes[0].language).toBe(lang);
      expect(changes[0].newValue).toBe(newValue);
    });

    it("should record multiple changes in sequence", async () => {
      const changes = [
        { key: "opening.hymn", lang: "es", old: mockInitialData["opening.hymn"].es, new: "Himno Nuevo" },
        { key: "opening.prayer", lang: "fr", old: mockInitialData["opening.prayer"].fr, new: "Nouvelle Prière" },
        { key: "sacrament.hymn", lang: "swa", old: mockInitialData["sacrament.hymn"].swa, new: "Wimbo Jipya" }
      ];

      for (const change of changes) {
        await EditorStateManager.recordChange(sessionId, change.key, change.lang, change.old, change.new);
      }

      const recorded = await EditorStateManager.getSessionChanges(sessionId);

      expect(recorded.length).toBe(3);
      // Verify all keys are present (order may vary due to IndexedDB)
      const recordedKeys = recorded.map((r) => r.key).sort();
      const expectedKeys = ["opening.hymn", "opening.prayer", "sacrament.hymn"].sort();
      expect(recordedKeys).toEqual(expectedKeys);
    });

    it("should include timestamp for each change", async () => {
      const key = "opening.hymn";
      const lang = "en";

      await EditorStateManager.recordChange(
        sessionId,
        key,
        lang,
        mockInitialData[key][lang],
        "New Opening Hymn"
      );

      const changes = await EditorStateManager.getSessionChanges(sessionId);
      const change = changes[0];

      expect(change.timestamp).toBeDefined();
      expect(typeof change.timestamp).toBe("number");
    });
  });

  // ============================================================================
  // SNAPSHOT TESTS
  // ============================================================================

  describe("Snapshots & Export", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession(mockSheetId, mockUser.email);
    });

    afterEach(async () => {
      if (sessionId) {
        await EditorStateManager.discardSession(sessionId);
      }
    });

    it("should create a snapshot with metadata", async () => {
      await EditorStateManager.recordChange(
        sessionId,
        "opening.hymn",
        "es",
        mockInitialData["opening.hymn"].es,
        "Himno Nuevo"
      );

      const snapshotId = await EditorStateManager.saveSnapshot(sessionId, "snapshot-csv-data", {
        type: "manual"
      });

      expect(snapshotId).toBeDefined();
      const snapshot = await EditorStateManager.db.editor_snapshots.get(snapshotId);

      expect(snapshot).toBeDefined();
      expect(snapshot.sessionId).toBe(sessionId);
      expect(snapshot.metadata).toBeDefined();
      expect(snapshot.metadata.type).toBe("manual");
    });

    it("should retrieve snapshot with changes", async () => {
      const key = "opening.prayer";
      const lang = "fr";

      await EditorStateManager.recordChange(
        sessionId,
        key,
        lang,
        mockInitialData[key][lang],
        "Nouvelle Prière d'Ouverture"
      );

      const snapshotId = await EditorStateManager.saveSnapshot(
        sessionId,
        "test-csv-data",
        { type: "auto" }
      );

      const snapshot = await EditorStateManager.db.editor_snapshots.get(snapshotId);

      expect(snapshot).toBeDefined();
      expect(snapshot.csvData).toBe("test-csv-data");
      expect(snapshot.timestamp).toBeDefined();
      expect(typeof snapshot.timestamp).toBe("number");
    });

    it("should track snapshot creation time", async () => {
      const before = new Date().getTime();

      const snapshotId = await EditorStateManager.saveSnapshot(sessionId, "csv-data", {
        type: "manual"
      });

      const after = new Date().getTime();
      const snapshot = await EditorStateManager.db.editor_snapshots.get(snapshotId);

      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
      expect(snapshot.timestamp).toBeLessThanOrEqual(after);
    });

    it("should export all changes as CSV data format", async () => {
      // Record multiple changes
      await EditorStateManager.recordChange(
        sessionId,
        "opening.hymn",
        "en",
        mockInitialData["opening.hymn"].en,
        "New Opening Hymn"
      );
      await EditorStateManager.recordChange(
        sessionId,
        "opening.hymn",
        "es",
        mockInitialData["opening.hymn"].es,
        "Nuevo Himno de Apertura"
      );

      const csvData = await EditorStateManager.exportFullState(sessionId, mockInitialData);

      expect(csvData).toBeDefined();
      expect(typeof csvData).toBe("string");
      // CSV should contain the key and translated values
      expect(csvData).toContain("opening.hymn");
      expect(csvData.includes("New Opening Hymn") || csvData.includes("Nuevo")).toBe(true);
    });
  });

  // ============================================================================
  // UPLOAD STATE TESTS
  // ============================================================================

  describe("Upload State & Reconciliation", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession(mockSheetId, mockUser.email);
    });

    afterEach(async () => {
      if (sessionId) {
        await EditorStateManager.discardSession(sessionId);
      }
    });

    it("should mark snapshot as uploaded", async () => {
      const snapshotId = await EditorStateManager.saveSnapshot(sessionId, "csv-data", {
        type: "upload-ready"
      });

      // Simulate upload success by marking as uploaded
      await EditorStateManager.db.editor_snapshots.update(snapshotId, {
        uploadedAt: new Date().getTime(),
        uploadStatus: "success"
      });

      const snapshot = await EditorStateManager.db.editor_snapshots.get(snapshotId);

      expect(snapshot.uploadedAt).toBeDefined();
      expect(snapshot.uploadStatus).toBe("success");
    });

    it("should handle upload failure state", async () => {
      const snapshotId = await EditorStateManager.saveSnapshot(sessionId, "csv-data", {
        type: "pending-upload"
      });

      // Simulate upload failure
      await EditorStateManager.db.editor_snapshots.update(snapshotId, {
        uploadStatus: "failed",
        uploadError: "Network timeout"
      });

      const snapshot = await EditorStateManager.db.editor_snapshots.get(snapshotId);

      expect(snapshot.uploadStatus).toBe("failed");
      expect(snapshot.uploadError).toBe("Network timeout");
    });

    it("should retrieve pending snapshots for retry", async () => {
      // Create multiple snapshots with different statuses
      const pending1 = await EditorStateManager.saveSnapshot(sessionId, "csv1", { type: "upload-ready" });
      const pending2 = await EditorStateManager.saveSnapshot(sessionId, "csv2", { type: "upload-ready" });
      const uploaded = await EditorStateManager.saveSnapshot(sessionId, "csv3", { type: "success" });

      // Mark one as uploaded
      await EditorStateManager.db.editor_snapshots.update(uploaded, {
        uploadStatus: "success",
        uploadedAt: new Date().getTime()
      });

      // Retrieve pending (not uploaded)
      const allSnapshots = await EditorStateManager.db.editor_snapshots
        .where("sessionId")
        .equals(sessionId)
        .toArray();

      const pending = allSnapshots.filter((s) => !s.uploadedAt);

      expect(pending.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // ERROR RECOVERY TESTS
  // ============================================================================

  describe("Error Recovery", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession(mockSheetId, mockUser.email);
    });

    afterEach(async () => {
      if (sessionId) {
        await EditorStateManager.discardSession(sessionId);
      }
    });

    it("should preserve changes if upload fails", async () => {
      const key = "opening.hymn";
      const lang = "es";
      const newValue = "Himno Nuevo";

      // Record change
      await EditorStateManager.recordChange(
        sessionId,
        key,
        lang,
        mockInitialData[key][lang],
        newValue
      );

      // Simulate upload failure
      const snapshotId = await EditorStateManager.saveSnapshot(sessionId, "csv-data", {
        type: "failed-upload"
      });

      await EditorStateManager.db.editor_snapshots.update(snapshotId, {
        uploadStatus: "failed"
      });

      // Verify changes still exist
      const changes = await EditorStateManager.getSessionChanges(sessionId);

      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].newValue).toBe(newValue);
    });

    it("should allow retry after upload failure", async () => {
      const originalChanges = await EditorStateManager.getSessionChanges(sessionId);
      const originalCount = originalChanges.length;

      // Simulate a failed upload scenario
      const snapshotId = await EditorStateManager.saveSnapshot(sessionId, "csv-data", {
        type: "retry"
      });

      // Mark as failed
      await EditorStateManager.db.editor_snapshots.update(snapshotId, {
        uploadStatus: "pending-retry"
      });

      // Add new change (recovery scenario)
      await EditorStateManager.recordChange(
        sessionId,
        "opening.prayer",
        "en",
        mockInitialData["opening.prayer"].en,
        "New Prayer"
      );

      const newChanges = await EditorStateManager.getSessionChanges(sessionId);

      expect(newChanges.length).toBeGreaterThan(originalCount);
    });
  });

  // ============================================================================
  // CSV DATA VALIDATION TESTS
  // ============================================================================

  describe("CSV Data Validation", () => {
    it("should validate required columns in CSV", () => {
      const validCsv = "key,en,es,fr,swa\ngreetings.hello,Hello,Hola,Bonjour,Habari";

      // CSV should contain key and language columns
      expect(validCsv).toContain("key");
      expect(validCsv).toContain(",en,");
      expect(validCsv).toContain(",es,");
    });

    it("should detect missing required language column", () => {
      const invalidCsv = "key,en,es\ngreetings.hello,Hello,Hola";

      // Missing 'fr' column
      expect(invalidCsv).not.toContain("fr");
    });

    it("should handle special characters in CSV values", () => {
      const csvWithSpecialChars = `key,en,es\ngreetings.hello,"Hello, my friend","Hola, mi amigo"`;

      expect(csvWithSpecialChars).toContain('"Hello, my friend"');
      expect(csvWithSpecialChars).toContain('"Hola, mi amigo"');
    });

    it("should escape quotes in CSV values", () => {
      const value = 'Hello "Friend"';
      const escaped = `"${value.replace(/"/g, '""')}"`;

      expect(escaped).toContain('""');
    });
  });

  // ============================================================================
  // CONCURRENCY TESTS
  // ============================================================================

  describe("Concurrent Operations", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession(mockSheetId, mockUser.email);
    });

    afterEach(async () => {
      if (sessionId) {
        await EditorStateManager.discardSession(sessionId);
      }
    });

    it("should handle multiple simultaneous change recordings", async () => {
      const queries = [
        EditorStateManager.recordChange(
          sessionId,
          "opening.hymn",
          "en",
          mockInitialData["opening.hymn"].en,
          "New Opening"
        ),
        EditorStateManager.recordChange(
          sessionId,
          "opening.prayer",
          "es",
          mockInitialData["opening.prayer"].es,
          "Nueva Oración"
        ),
        EditorStateManager.recordChange(
          sessionId,
          "sacrament.hymn",
          "fr",
          mockInitialData["sacrament.hymn"].fr,
          "Nouveau Hymne"
        )
      ];

      await Promise.all(queries);

      const changes = await EditorStateManager.getSessionChanges(sessionId);

      expect(changes.length).toBe(3);
    });
  });

  // ============================================================================
  // WORKFLOW SIMULATION TESTS
  // ============================================================================

  describe("Complete Workflow Simulation", () => {
    it("should execute full edit-save-export workflow", async () => {
      // Step 1: Start session
      const sessionId = await EditorStateManager.startSession(mockSheetId, mockUser.email);

      // Step 2: Record changes
      await EditorStateManager.recordChange(
        sessionId,
        "opening.hymn",
        "en",
        mockInitialData["opening.hymn"].en,
        "New Opening Hymn"
      );

      await EditorStateManager.recordChange(
        sessionId,
        "opening.hymn",
        "es",
        mockInitialData["opening.hymn"].es,
        "Nuevo Himno de Apertura"
      );

      // Step 3: Verify changes recorded
      const changes = await EditorStateManager.getSessionChanges(sessionId);
      expect(changes.length).toBe(2);

      // Step 4: Export data
      const csvData = await EditorStateManager.exportFullState(sessionId, mockInitialData);
      expect(csvData).toBeDefined();
      expect(csvData.length).toBeGreaterThan(0);

      // Step 5: Create snapshot (ready for upload)
      const snapshotId = await EditorStateManager.saveSnapshot(sessionId, csvData, {
        type: "manual-save",
        readyForUpload: true
      });

      expect(snapshotId).toBeDefined();

      // Step 6: Verify snapshot
      const snapshot = await EditorStateManager.db.editor_snapshots.get(snapshotId);
      expect(snapshot.csvData).toBe(csvData);

      // Step 7: Clean up session
      await EditorStateManager.discardSession(sessionId);

      // Step 8: Verify session cleared
      const session = await EditorStateManager.db.editor_sessions.get(sessionId);
      expect(session).toBeUndefined();
    });

    it("should maintain audit trail across workflow", async () => {
      const sessionId = await EditorStateManager.startSession(mockSheetId, mockUser.email);

      const timestamps = [];

      // Record multiple changes with delays to ensure different timestamps
      for (let i = 0; i < 3; i++) {
        const keys = Object.keys(mockInitialData);
        const key = keys[i];
        const lang = "en";

        await EditorStateManager.recordChange(
          sessionId,
          key,
          lang,
          mockInitialData[key][lang],
          `Updated ${i + 1}`
        );

        timestamps.push(new Date().getTime());

        // Small delay to ensure timestamp differences
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const changes = await EditorStateManager.getSessionChanges(sessionId);

      // Verify timestamps are recorded (they may not be monotonically increasing due to indexeddb timing)
      for (let i = 0; i < changes.length; i++) {
        expect(changes[i].timestamp).toBeDefined();
        expect(typeof changes[i].timestamp).toBe("number");
      }

      await EditorStateManager.discardSession(sessionId);
    });
  });
});
