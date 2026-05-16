import { afterEach, describe, expect, test, vi } from "vitest";
import Dexie from "dexie";

const PROD_DB_NAME = "MeetingProgramDB__meeting-program";
const DEV_DB_NAME = "MeetingProgramDB__meeting-program-dev";

async function seedProdV5Database() {
  const prodDb = new Dexie(PROD_DB_NAME);
  prodDb.version(5).stores({
    profiles: "id, url, lastUsed, inactive, agendaUrl, agendaLastLoaded, agendaValid",
    archives: "id, profileId, programDate, [profileId+programDate], agendaCsvData, agendaRows",
    metadata: "key",
    migrations: "profileId",
    history: "id, profileId, date, cachedAt, [profileId+cachedAt]"
  });

  await prodDb.open();
  await prodDb.profiles.put({
    id: "prod-profile-1",
    url: "https://docs.google.com/spreadsheets/d/PROD123",
    unitName: "Legacy Ward",
    stakeName: "Legacy Stake",
    lastUsed: 1715817600000
  });
  await prodDb.metadata.put({
    key: "meeting_program_selected_id",
    value: "prod-profile-1"
  });
  prodDb.close();
}

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.resetModules();
  await Dexie.delete(PROD_DB_NAME);
  await Dexie.delete(DEV_DB_NAME);
  await Dexie.delete("MeetingProgramDB");
});

describe("PROD 2.3.2 to DEV 2.4.1 migration", () => {
  test("copies profiles and selection from the production DB into the dev DB", async () => {
    await seedProdV5Database();

    vi.stubGlobal("location", { pathname: "/meeting-program-dev/" });
    const profileManager = await import("../js/data/ProfileManager.js");

    const result = await profileManager.initProfileManager("2.4.1");
    const profiles = await profileManager.getProfiles();
    const currentProfile = await profileManager.getCurrentProfile();

    expect(result).toEqual({ migratedSuccessfully: true, shouldReload: true });
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      id: "prod-profile-1",
      unitName: "Legacy Ward",
      stakeName: "Legacy Stake"
    });
    expect(currentProfile?.id).toBe("prod-profile-1");

    const prodDb = new Dexie(PROD_DB_NAME);
    prodDb.version(5).stores({
      profiles: "id, url, lastUsed, inactive, agendaUrl, agendaLastLoaded, agendaValid",
      archives: "id, profileId, programDate, [profileId+programDate], agendaCsvData, agendaRows",
      metadata: "key",
      migrations: "profileId",
      history: "id, profileId, date, cachedAt, [profileId+cachedAt]"
    });
    await prodDb.open();
    await expect(prodDb.profiles.get("prod-profile-1")).resolves.toMatchObject({
      id: "prod-profile-1"
    });
    prodDb.close();
  });
});