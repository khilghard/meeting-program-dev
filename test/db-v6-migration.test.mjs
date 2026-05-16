/**
 * db-v6-migration.test.mjs
 *
 * Phase 3 — Dexie v6 migration tests (AD-04)
 *
 * Verifies:
 *   - Fresh database at v6 has a working `drafts` store
 *   - getDraft / saveDraft / clearDraft functions operate correctly
 *   - A v5-style database upgrades to v6 with existing profiles untouched
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import Dexie from "dexie";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unique DB name per test to avoid cross-test pollution with fake-indexeddb */
let testDbSeq = 0;
function uniqueDbName() {
  return `MeetingProgramDB__test_v6_${++testDbSeq}`;
}

/**
 * Open the real app DB by resetting modules and stubbing location so the
 * computed DB_NAME is predictable (uses the test-unique name via DEPLOYMENT_PATH).
 */
async function openAppDb(dbName) {
  vi.resetModules();
  // Override the DB name computation: stub DEPLOYMENT_PATH so suffix == dbName suffix
  // Instead, directly test the Dexie-level schema via the module itself.
  // We use location stub so the suffix matches the unique db name.
  // NOTE: easiest approach — just import db.js fresh each time (fake-indexeddb is per-process).
  const { db, DB_NAME } = await import("../js/data/db.js");
  await db.open();
  return { db, DB_NAME };
}

// ---------------------------------------------------------------------------
// Suite: drafts store schema
// ---------------------------------------------------------------------------

describe("DB v6 — drafts store exists", () => {
  let db;
  let DB_NAME;

  beforeEach(async () => {
    vi.resetModules();
    ({ db, DB_NAME } = await import("../js/data/db.js"));
    await db.open();
  });

  afterEach(async () => {
    if (db.isOpen()) db.close();
    await Dexie.delete(DB_NAME);
    vi.unstubAllGlobals();
  });

  test("database opens at version 6", async () => {
    expect(db.verno).toBe(6);
  });

  test("drafts object store is accessible", async () => {
    // If drafts store does not exist this will throw
    const count = await db.drafts.count();
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Suite: getDraft / saveDraft / clearDraft
// ---------------------------------------------------------------------------

describe("DB v6 — draft CRUD via IndexedDBManager", () => {
  let getDraft, saveDraft, clearDraft, clearProfileDrafts, db, DB_NAME;

  beforeEach(async () => {
    vi.resetModules();
    ({ getDraft, saveDraft, clearDraft, clearProfileDrafts, db } =
      await import("../js/data/IndexedDBManager.js"));
    ({ DB_NAME } = await import("../js/data/db.js"));
    await db.open();
  });

  afterEach(async () => {
    if (db.isOpen()) db.close();
    await Dexie.delete(DB_NAME);
    vi.unstubAllGlobals();
  });

  test("getDraft returns null for a key that has never been saved", async () => {
    const result = await getDraft("cms_draft_profile-unknown");
    expect(result).toBeNull();
  });

  test("saveDraft persists data and getDraft retrieves it", async () => {
    const key = "cms_draft_profile-abc";
    const payload = { title: "Test Program", verse: "John 3:16" };

    await saveDraft(key, payload);
    const retrieved = await getDraft(key);

    expect(retrieved).toEqual(payload);
  });

  test("saveDraft upserts — second call overwrites first", async () => {
    const key = "cms_draft_profile-abc";

    await saveDraft(key, { version: 1 });
    await saveDraft(key, { version: 2 });

    const retrieved = await getDraft(key);
    expect(retrieved).toEqual({ version: 2 });
  });

  test("clearDraft removes the record; getDraft returns null afterward", async () => {
    const key = "agenda_draft_profile-xyz";

    await saveDraft(key, { items: ["A", "B"] });
    await clearDraft(key);

    const retrieved = await getDraft(key);
    expect(retrieved).toBeNull();
  });

  test("clearDraft is safe to call on a key that does not exist", async () => {
    await expect(clearDraft("cms_draft_nonexistent")).resolves.toBe(true);
  });

  test("saveDraft stores updatedAt as a numeric timestamp", async () => {
    const key = "cms_draft_profile-ts";
    const before = Date.now();
    await saveDraft(key, {});
    const after = Date.now();

    const raw = await db.drafts.get(key);
    expect(raw.profileId).toBe("profile-ts");
    expect(typeof raw.updatedAt).toBe("number");
    expect(raw.updatedAt).toBeGreaterThanOrEqual(before);
    expect(raw.updatedAt).toBeLessThanOrEqual(after);
  });

  test("saveDraft preserves the full profileId when it contains underscores", async () => {
    const key = "cms_draft_legacy_profile_with_underscores";

    await saveDraft(key, { title: "Draft" });

    const raw = await db.drafts.get(key);
    expect(raw.profileId).toBe("legacy_profile_with_underscores");
  });

  test("clearProfileDrafts removes only drafts for the target profile", async () => {
    await saveDraft("cms_draft_profile_alpha", { value: 1 });
    await saveDraft("agenda_draft_profile_alpha", { value: 2 });
    await saveDraft("cms_draft_profile_beta", { value: 3 });

    await clearProfileDrafts("profile_alpha");

    await expect(getDraft("cms_draft_profile_alpha")).resolves.toBeNull();
    await expect(getDraft("agenda_draft_profile_alpha")).resolves.toBeNull();
    await expect(getDraft("cms_draft_profile_beta")).resolves.toEqual({ value: 3 });
  });

  test("STORES constant includes 'drafts'", async () => {
    const { STORES } = await import("../js/data/IndexedDBManager.js");
    expect(STORES).toContain("drafts");
  });
});

// ---------------------------------------------------------------------------
// Suite: v5 → v6 upgrade preserves existing data
// ---------------------------------------------------------------------------

describe("DB v6 — v5 → v6 upgrade leaves profiles intact", () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test("profiles written at v5 are readable after upgrade to v6", async () => {
    // Create a v5-style database with a profile
    const legacyDb = new Dexie("MeetingProgramDB");
    legacyDb.version(5).stores({
      profiles: "id, url, lastUsed, inactive, agendaUrl, agendaLastLoaded, agendaValid",
      archives: "id, profileId, programDate, [profileId+programDate], agendaCsvData, agendaRows",
      metadata: "key",
      migrations: "profileId",
      history: "id, profileId, date, cachedAt, [profileId+cachedAt]"
    });

    const legacyProfile = {
      id: "profile-legacy",
      name: "Legacy Ward",
      url: "https://docs.google.com/spreadsheets/d/LEGACY/",
      lastUsed: Date.now()
    };

    await legacyDb.profiles.add(legacyProfile);
    legacyDb.close();

    // Now open with v6 schema (app module)
    vi.resetModules();
    // Point location to the default path so DB_NAME == "MeetingProgramDB"
    vi.stubGlobal("location", { pathname: "/" });
    const { db } = await import("../js/data/db.js");
    await db.open();

    const profiles = await db.profiles.toArray();
    const match = profiles.find((p) => p.id === "profile-legacy");
    expect(match).toBeDefined();
    expect(match.name).toBe("Legacy Ward");

    // drafts store should exist and be empty
    const draftCount = await db.drafts.count();
    expect(draftCount).toBe(0);

    db.close();
    await Dexie.delete("MeetingProgramDB");
  });
});
