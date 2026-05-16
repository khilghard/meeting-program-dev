/**
 * test/data/EditorStateManager.test.mjs
 *
 * Unit tests for Editor State Manager
 * Tests cover: session management, change tracking, snapshots, state reconstruction, exports
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import EditorStateManager from "../../js/data/EditorStateManager.js";

describe("EditorStateManager", () => {
  beforeEach(async () => {
    // Clear database before each test
    await EditorStateManager.clearAll();
  });

  afterEach(async () => {
    await EditorStateManager.clearAll();
  });

  // ============================================================================
  // startSession() Tests
  // ============================================================================

  describe("startSession()", () => {
    it("should create a new session with valid parameters", async () => {
      const sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe("string");
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it("should return UUID format session ID", async () => {
      const sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
      // UUID v4 format
      expect(sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should throw error if sheet ID is missing", async () => {
      await expect(EditorStateManager.startSession(null, "user@example.com")).rejects.toThrow(
        "[EditorStateManager] Sheet ID is required"
      );
    });

    it("should throw error if email is missing", async () => {
      await expect(EditorStateManager.startSession("ABC123", null)).rejects.toThrow(
        "[EditorStateManager] User email is required"
      );
    });

    it("should throw error if sheet ID is empty string", async () => {
      await expect(EditorStateManager.startSession("", "user@example.com")).rejects.toThrow(
        "[EditorStateManager] Sheet ID is required"
      );
    });

    it("should normalize email to lowercase", async () => {
      const sessionId = await EditorStateManager.startSession("ABC123", "USER@EXAMPLE.COM");
      const session = await EditorStateManager.getSession(sessionId);
      expect(session.userEmail).toBe("user@example.com");
    });

    it("should trim email whitespace", async () => {
      const sessionId = await EditorStateManager.startSession("ABC123", "  user@example.com  ");
      const session = await EditorStateManager.getSession(sessionId);
      expect(session.userEmail).toBe("user@example.com");
    });

    it("should set session status to active", async () => {
      const sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
      const session = await EditorStateManager.getSession(sessionId);
      expect(session.status).toBe(EditorStateManager.SESSION_STATUS.ACTIVE);
    });

    it("should set timestamps", async () => {
      const before = Date.now();
      const sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
      const after = Date.now();

      const session = await EditorStateManager.getSession(sessionId);
      expect(session.startTime).toBeGreaterThanOrEqual(before);
      expect(session.startTime).toBeLessThanOrEqual(after);
      expect(session.lastModified).toBeGreaterThanOrEqual(before);
      expect(session.lastModified).toBeLessThanOrEqual(after);
    });

    it("should resume existing session for same sheet+user", async () => {
      const sessionId1 = await EditorStateManager.startSession("ABC123", "user@example.com");
      const sessionId2 = await EditorStateManager.startSession("ABC123", "user@example.com");
      expect(sessionId2).toBe(sessionId1);
    });

    it("should create separate sessions for different users on same sheet", async () => {
      const sessionId1 = await EditorStateManager.startSession("ABC123", "user1@example.com");
      const sessionId2 = await EditorStateManager.startSession("ABC123", "user2@example.com");
      expect(sessionId2).not.toBe(sessionId1);
    });

    it("should create separate sessions for same user on different sheets", async () => {
      const sessionId1 = await EditorStateManager.startSession("ABC123", "user@example.com");
      const sessionId2 = await EditorStateManager.startSession("XYZ789", "user@example.com");
      expect(sessionId2).not.toBe(sessionId1);
    });
  });

  // ============================================================================
  // getSession() Tests
  // ============================================================================

  describe("getSession()", () => {
    it("should return session object by ID", async () => {
      const sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
      const session = await EditorStateManager.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(sessionId);
      expect(session.sheetId).toBe("ABC123");
      expect(session.userEmail).toBe("user@example.com");
    });

    it("should return null for non-existent session", async () => {
      const session = await EditorStateManager.getSession("non-existent-id");
      expect(session).toBeNull();
    });

    it("should throw error if session ID is missing", async () => {
      await expect(EditorStateManager.getSession(null)).rejects.toThrow(
        "[EditorStateManager] Session ID is required"
      );
    });
  });

  // ============================================================================
  // recordChange() Tests
  // ============================================================================

  describe("recordChange()", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
    });

    it("should record a change and return change ID", async () => {
      const changeId = await EditorStateManager.recordChange(
        sessionId,
        "greetings.hello",
        "en",
        "Hello",
        "Hi"
      );

      expect(changeId).toBeDefined();
      expect(typeof changeId).toBe("string");
      expect(changeId.length).toBeGreaterThan(0);
    });

    it("should throw error if session ID is missing", async () => {
      await expect(
        EditorStateManager.recordChange(null, "key", "en", "old", "new")
      ).rejects.toThrow("[EditorStateManager] Session ID is required");
    });

    it("should throw error if session doesn't exist", async () => {
      await expect(
        EditorStateManager.recordChange("non-existent", "key", "en", "old", "new")
      ).rejects.toThrow("[EditorStateManager] Session not found");
    });

    it("should throw error if key is missing", async () => {
      await expect(
        EditorStateManager.recordChange(sessionId, null, "en", "old", "new")
      ).rejects.toThrow("[EditorStateManager] Key is required");
    });

    it("should throw error if language is missing", async () => {
      await expect(
        EditorStateManager.recordChange(sessionId, "key", null, "old", "new")
      ).rejects.toThrow("[EditorStateManager] Language is required");
    });

    it("should allow empty old/new values", async () => {
      const changeId = await EditorStateManager.recordChange(
        sessionId,
        "key",
        "en",
        "",
        ""
      );
      expect(changeId).toBeDefined();
    });

    it("should update session lastModified timestamp", async () => {
      const sessionBefore = await EditorStateManager.getSession(sessionId);

      // Wait a tiny bit to ensure time difference
      await new Promise((r) => setTimeout(r, 10));

      await EditorStateManager.recordChange(sessionId, "key", "en", "old", "new");

      const sessionAfter = await EditorStateManager.getSession(sessionId);
      expect(sessionAfter.lastModified).toBeGreaterThan(sessionBefore.lastModified);
    });

    it("should record multiple changes with different keys", async () => {
      await EditorStateManager.recordChange(sessionId, "key1", "en", "a", "b");
      await EditorStateManager.recordChange(sessionId, "key2", "es", "c", "d");

      const changes = await EditorStateManager.getSessionChanges(sessionId);
      expect(changes).toHaveLength(2);
    });

    it("should record multiple changes on same key different languages", async () => {
      await EditorStateManager.recordChange(sessionId, "key1", "en", "a", "b");
      await EditorStateManager.recordChange(sessionId, "key1", "es", "c", "d");
      await EditorStateManager.recordChange(sessionId, "key1", "fr", "e", "f");

      const changes = await EditorStateManager.getSessionChanges(sessionId);
      expect(changes).toHaveLength(3);
      expect(changes.every((c) => c.key === "key1")).toBe(true);
    });
  });

  // ============================================================================
  // getSessionChanges() Tests
  // ============================================================================

  describe("getSessionChanges()", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
    });

    it("should return empty array for new session", async () => {
      const changes = await EditorStateManager.getSessionChanges(sessionId);
      expect(Array.isArray(changes)).toBe(true);
      expect(changes).toHaveLength(0);
    });

    it("should return all changes for session", async () => {
      await EditorStateManager.recordChange(sessionId, "key1", "en", "a", "b");
      await EditorStateManager.recordChange(sessionId, "key2", "es", "c", "d");

      const changes = await EditorStateManager.getSessionChanges(sessionId);
      expect(changes).toHaveLength(2);
    });

    it("should throw error if session ID missing", async () => {
      await expect(EditorStateManager.getSessionChanges(null)).rejects.toThrow(
        "[EditorStateManager] Session ID is required"
      );
    });

    it("should not return changes from other sessions", async () => {
      const sessionId2 = await EditorStateManager.startSession("XYZ789", "other@example.com");

      await EditorStateManager.recordChange(sessionId, "key1", "en", "a", "b");
      await EditorStateManager.recordChange(sessionId2, "key2", "es", "c", "d");

      const changes1 = await EditorStateManager.getSessionChanges(sessionId);
      expect(changes1).toHaveLength(1);
      expect(changes1[0].key).toBe("key1");
    });
  });

  // ============================================================================
  // getChangesByKey() Tests
  // ============================================================================

  describe("getChangesByKey()", () => {
    let sessionId1, sessionId2;

    beforeEach(async () => {
      sessionId1 = await EditorStateManager.startSession("ABC123", "user1@example.com");
      sessionId2 = await EditorStateManager.startSession("ABC123", "user2@example.com");
    });

    it("should return all changes for a key across sessions", async () => {
      await EditorStateManager.recordChange(sessionId1, "key1", "en", "a", "b");
      await EditorStateManager.recordChange(sessionId2, "key1", "es", "c", "d");

      const changes = await EditorStateManager.getChangesByKey("key1");
      expect(changes).toHaveLength(2);
    });

    it("should return empty array for non-existent key", async () => {
      const changes = await EditorStateManager.getChangesByKey("non-existent");
      expect(changes).toHaveLength(0);
    });

    it("should throw error if key is missing", async () => {
      await expect(EditorStateManager.getChangesByKey(null)).rejects.toThrow(
        "[EditorStateManager] Key is required"
      );
    });
  });

  // ============================================================================
  // reconstructSessionState() Tests
  // ============================================================================

  describe("reconstructSessionState()", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
    });

    it("should return empty object for new session with no baseline", async () => {
      const state = await EditorStateManager.reconstructSessionState(sessionId, {});
      expect(state).toEqual({});
    });

    it("should preserve baseline data", async () => {
      const baseline = {
        "key1": { en: "Hello", es: "Hola", fr: "Bonjour", swa: "Habari" }
      };

      const state = await EditorStateManager.reconstructSessionState(sessionId, baseline);
      expect(state.key1).toBeDefined();
      expect(state.key1.en).toBe("Hello");
    });

    it("should apply single change to baseline", async () => {
      const baseline = {
        "key1": { en: "Hello", es: "Hola", fr: "Bonjour", swa: "Habari", _changed: false }
      };

      await EditorStateManager.recordChange(sessionId, "key1", "en", "Hello", "Hi");

      const state = await EditorStateManager.reconstructSessionState(sessionId, baseline);
      expect(state.key1.en).toBe("Hi");
      expect(state.key1._changed).toBe(true);
    });

    it("should apply multiple changes to same key", async () => {
      const baseline = {
        "key1": { en: "Hello", es: "Hola", fr: "Bonjour", swa: "Habari", _changed: false }
      };

      await EditorStateManager.recordChange(sessionId, "key1", "en", "Hello", "Hi");
      await EditorStateManager.recordChange(sessionId, "key1", "es", "Hola", "Ola");

      const state = await EditorStateManager.reconstructSessionState(sessionId, baseline);
      expect(state.key1.en).toBe("Hi");
      expect(state.key1.es).toBe("Ola");
      expect(state.key1.fr).toBe("Bonjour"); // Unchanged
      expect(state.key1._changed).toBe(true);
    });

    it("should create new keys for changes not in baseline", async () => {
      const baseline = {};

      await EditorStateManager.recordChange(sessionId, "newKey", "en", "", "New Value");

      const state = await EditorStateManager.reconstructSessionState(sessionId, baseline);
      expect(state.newKey).toBeDefined();
      expect(state.newKey.en).toBe("New Value");
      expect(state.newKey._changed).toBe(true);
    });

    it("should not modify original baseline object", async () => {
      const baseline = {
        "key1": { en: "Hello", es: "Hola", fr: "Bonjour", swa: "Habari" }
      };
      const originalEn = baseline.key1.en;

      await EditorStateManager.recordChange(sessionId, "key1", "en", "Hello", "Hi");

      await EditorStateManager.reconstructSessionState(sessionId, baseline);
      expect(baseline.key1.en).toBe(originalEn); // Unchanged
    });

    it("should throw error if session ID is missing", async () => {
      await expect(
        EditorStateManager.reconstructSessionState(null, {})
      ).rejects.toThrow("[EditorStateManager] Session ID is required");
    });
  });

  // ============================================================================
  // saveSnapshot() Tests
  // ============================================================================

  describe("saveSnapshot()", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
    });

    it("should save snapshot and return snapshot ID", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";
      const snapshotId = await EditorStateManager.saveSnapshot(sessionId, csv);

      expect(snapshotId).toBeDefined();
      expect(typeof snapshotId).toBe("string");
    });

    it("should throw error if session ID is missing", async () => {
      await expect(
        EditorStateManager.saveSnapshot(null, "csv data")
      ).rejects.toThrow("[EditorStateManager] Session ID is required");
    });

    it("should throw error if CSV data is missing", async () => {
      await expect(
        EditorStateManager.saveSnapshot(sessionId, null)
      ).rejects.toThrow("[EditorStateManager] CSV data is required");
    });

    it("should throw error if session doesn't exist", async () => {
      await expect(
        EditorStateManager.saveSnapshot("non-existent", "csv data")
      ).rejects.toThrow("[EditorStateManager] Session not found");
    });

    it("should store metadata with row count", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari\nbye,Goodbye,Adiós,Au revoir,Kwaheri";
      const snapshotId = await EditorStateManager.saveSnapshot(sessionId, csv);

      const snapshot = await EditorStateManager.getLatestSnapshot(sessionId);
      expect(snapshot.metadata.rowCount).toBe(3);
    });

    it("should accept additional metadata", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";
      const metadata = { description: "User draft before review", author: "user@example.com" };

      const snapshotId = await EditorStateManager.saveSnapshot(
        sessionId,
        csv,
        metadata
      );

      const snapshot = await EditorStateManager.getLatestSnapshot(sessionId);
      expect(snapshot.metadata.description).toBe("User draft before review");
      expect(snapshot.metadata.author).toBe("user@example.com");
    });
  });

  // ============================================================================
  // getLatestSnapshot() Tests
  // ============================================================================

  describe("getLatestSnapshot()", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
    });

    it("should return null for session with no snapshots", async () => {
      const snapshot = await EditorStateManager.getLatestSnapshot(sessionId);
      expect(snapshot).toBeNull();
    });

    it("should return latest snapshot when multiple exist", async () => {
      const csv1 = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";
      const csv2 = "key,en,es,fr,swa\nhello,Hi,Hola,Bonjour,Habari";

      const id1 = await EditorStateManager.saveSnapshot(sessionId, csv1);

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      const id2 = await EditorStateManager.saveSnapshot(sessionId, csv2);

      const latest = await EditorStateManager.getLatestSnapshot(sessionId);
      expect(latest.snapshotId).toBe(id2);
      expect(latest.csvData).toBe(csv2);
    });

    it("should throw error if session ID is missing", async () => {
      await expect(EditorStateManager.getLatestSnapshot(null)).rejects.toThrow(
        "[EditorStateManager] Session ID is required"
      );
    });
  });

  // ============================================================================
  // markSessionSaved() Tests
  // ============================================================================

  describe("markSessionSaved()", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
    });

    it("should change session status to saved", async () => {
      await EditorStateManager.markSessionSaved(sessionId);

      const session = await EditorStateManager.getSession(sessionId);
      expect(session.status).toBe(EditorStateManager.SESSION_STATUS.SAVED);
    });

    it("should throw error if session doesn't exist", async () => {
      await expect(EditorStateManager.markSessionSaved("non-existent")).rejects.toThrow(
        "[EditorStateManager] Session not found"
      );
    });

    it("should update lastModified timestamp", async () => {
      const sessionBefore = await EditorStateManager.getSession(sessionId);

      await new Promise((r) => setTimeout(r, 10));

      await EditorStateManager.markSessionSaved(sessionId);

      const sessionAfter = await EditorStateManager.getSession(sessionId);
      expect(sessionAfter.lastModified).toBeGreaterThan(sessionBefore.lastModified);
    });
  });

  // ============================================================================
  // discardSession() Tests
  // ============================================================================

  describe("discardSession()", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
    });

    it("should delete session and all changes", async () => {
      await EditorStateManager.recordChange(sessionId, "key1", "en", "a", "b");
      await EditorStateManager.recordChange(sessionId, "key2", "es", "c", "d");

      await EditorStateManager.discardSession(sessionId);

      const session = await EditorStateManager.getSession(sessionId);
      expect(session).toBeNull();

      const changes = await EditorStateManager.getSessionChanges(sessionId);
      expect(changes).toHaveLength(0);
    });

    it("should delete session snapshots", async () => {
      const csv = "key,en,es,fr,swa\nhello,Hello,Hola,Bonjour,Habari";
      await EditorStateManager.saveSnapshot(sessionId, csv);

      await EditorStateManager.discardSession(sessionId);

      const snapshot = await EditorStateManager.getLatestSnapshot(sessionId);
      expect(snapshot).toBeNull();
    });

    it("should throw error if session ID is missing", async () => {
      await expect(EditorStateManager.discardSession(null)).rejects.toThrow(
        "[EditorStateManager] Session ID is required"
      );
    });
  });

  // ============================================================================
  // exportChanges() Tests
  // ============================================================================

  describe("exportChanges()", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
    });

    it("should export only changed rows as CSV", async () => {
      const baseline = {
        "key1": { en: "Hello", es: "Hola", fr: "Bonjour", swa: "Habari", _changed: false },
        "key2": { en: "Goodbye", es: "Adiós", fr: "Au revoir", swa: "Kwaheri", _changed: false }
      };

      await EditorStateManager.recordChange(sessionId, "key1", "en", "Hello", "Hi");

      const csv = await EditorStateManager.exportChanges(sessionId, baseline);

      expect(csv).toContain("key,en,es,fr,swa");
      expect(csv).toContain("key1");
      expect(csv).not.toContain("key2");
    });

    it("should include header row", async () => {
      const baseline = {};

      await EditorStateManager.recordChange(sessionId, "key1", "en", "", "New");

      const csv = await EditorStateManager.exportChanges(sessionId, baseline);

      const [header] = csv.split("\n");
      expect(header).toBe("key,en,es,fr,swa");
    });

    it("should quote fields with commas", async () => {
      const baseline = {};

      await EditorStateManager.recordChange(sessionId, "key1", "en", "", "Hello, world");

      const csv = await EditorStateManager.exportChanges(sessionId, baseline);

      expect(csv).toContain('"Hello, world"');
    });

    it("should escape quotes in fields", async () => {
      const baseline = {};

      await EditorStateManager.recordChange(sessionId, "key1", "en", "", 'Say "Hi"');

      const csv = await EditorStateManager.exportChanges(sessionId, baseline);

      expect(csv).toContain('Say ""Hi""');
    });

    it("should throw error if session ID is missing", async () => {
      await expect(EditorStateManager.exportChanges(null, {})).rejects.toThrow(
        "[EditorStateManager] Session ID is required"
      );
    });

    it("should return empty data rows if no changes", async () => {
      const csv = await EditorStateManager.exportChanges(sessionId, {});

      const lines = csv.split("\n");
      expect(lines[0]).toBe("key,en,es,fr,swa");
      expect(lines).toHaveLength(1); // Only header
    });
  });

  // ============================================================================
  // exportFullState() Tests
  // ============================================================================

  describe("exportFullState()", () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await EditorStateManager.startSession("ABC123", "user@example.com");
    });

    it("should export all rows including unchanged", async () => {
      const baseline = {
        "key1": { en: "Hello", es: "Hola", fr: "Bonjour", swa: "Habari", _changed: false },
        "key2": { en: "Goodbye", es: "Adiós", fr: "Au revoir", swa: "Kwaheri", _changed: false }
      };

      await EditorStateManager.recordChange(sessionId, "key1", "en", "Hello", "Hi");

      const csv = await EditorStateManager.exportFullState(sessionId, baseline);

      expect(csv).toContain("key1");
      expect(csv).toContain("key2");
    });

    it("should include header row", async () => {
      const baseline = {};

      const csv = await EditorStateManager.exportFullState(sessionId, baseline);

      const [header] = csv.split("\n");
      expect(header).toBe("key,en,es,fr,swa");
    });

    it("should throw error if session ID is missing", async () => {
      await expect(EditorStateManager.exportFullState(null, {})).rejects.toThrow(
        "[EditorStateManager] Session ID is required"
      );
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("Integration: Full Editing Workflow", () => {
    it("should handle complete edit-snapshot-export workflow", async () => {
      const baseline = {
        "greetings.hello": {
          en: "Hello",
          es: "Hola",
          fr: "Bonjour",
          swa: "Habari",
          _changed: false
        }
      };

      // Start session
      const sessionId = await EditorStateManager.startSession("ABC123", "editor@example.com");

      // Record changes
      await EditorStateManager.recordChange(
        sessionId,
        "greetings.hello",
        "en",
        "Hello",
        "Hi"
      );
      await EditorStateManager.recordChange(
        sessionId,
        "greetings.hello",
        "es",
        "Hola",
        "Ola"
      );

      // Save snapshot
      const state = await EditorStateManager.reconstructSessionState(sessionId, baseline);
      const csv = "key,en,es,fr,swa\ngreetings.hello,Hi,Ola,Bonjour,Habari";
      const snapshotId = await EditorStateManager.saveSnapshot(sessionId, csv);

      expect(snapshotId).toBeDefined();

      // Export changes
      const changedCsv = await EditorStateManager.exportChanges(sessionId, baseline);
      expect(changedCsv).toContain("greetings.hello");
      expect(changedCsv).toContain("Hi");
      expect(changedCsv).toContain("Ola");

      // Mark as saved
      await EditorStateManager.markSessionSaved(sessionId);

      const session = await EditorStateManager.getSession(sessionId);
      expect(session.status).toBe(EditorStateManager.SESSION_STATUS.SAVED);
    });

    it("should handle multiple concurrent editing sessions", async () => {
      // Session 1: User 1 on Sheet A
      const session1 = await EditorStateManager.startSession("SheetA", "user1@example.com");
      await EditorStateManager.recordChange(session1, "key1", "en", "a", "b");

      // Session 2: User 2 on Sheet A
      const session2 = await EditorStateManager.startSession("SheetA", "user2@example.com");
      await EditorStateManager.recordChange(session2, "key2", "es", "c", "d");

      // Session 3: User 1 on Sheet B
      const session3 = await EditorStateManager.startSession("SheetB", "user1@example.com");
      await EditorStateManager.recordChange(session3, "key3", "fr", "e", "f");

      // Verify session isolation
      const changes1 = await EditorStateManager.getSessionChanges(session1);
      expect(changes1).toHaveLength(1);
      expect(changes1[0].key).toBe("key1");

      const changes2 = await EditorStateManager.getSessionChanges(session2);
      expect(changes2).toHaveLength(1);
      expect(changes2[0].key).toBe("key2");

      const changes3 = await EditorStateManager.getSessionChanges(session3);
      expect(changes3).toHaveLength(1);
      expect(changes3[0].key).toBe("key3");
    });
  });
});
