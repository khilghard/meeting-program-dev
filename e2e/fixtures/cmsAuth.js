const BASE_URL = "http://localhost:8000/meeting-program/";
const DB_VERSION = 6;
const SELECTED_PROFILE_KEY = "meeting_program_selected_id";
const GOOGLE_STORAGE_KEYS = {
  ACCESS_TOKEN: "gm_access_token",
  USER_EMAIL: "gm_user_email",
  USER_NAME: "gm_user_name",
  TOKEN_EXPIRES: "gm_token_expires"
};

function getDbName(pathname) {
  if (pathname.includes("/meeting-program-dev/")) {
    return "MeetingProgramDB__meeting-program-dev";
  }
  if (pathname.includes("/meeting-program/")) {
    return "MeetingProgramDB__meeting-program";
  }
  return "MeetingProgramDB";
}

function openDatabase(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains("profiles")) {
        const profiles = database.createObjectStore("profiles", { keyPath: "id" });
        profiles.createIndex("url", "url", { unique: false });
        profiles.createIndex("lastUsed", "lastUsed", { unique: false });
        profiles.createIndex("inactive", "inactive", { unique: false });
        profiles.createIndex("agendaUrl", "agendaUrl", { unique: false });
        profiles.createIndex("agendaLastLoaded", "agendaLastLoaded", { unique: false });
        profiles.createIndex("agendaValid", "agendaValid", { unique: false });
      }

      if (!database.objectStoreNames.contains("archives")) {
        const archives = database.createObjectStore("archives", { keyPath: "id" });
        archives.createIndex("profileId", "profileId", { unique: false });
        archives.createIndex("programDate", "programDate", { unique: false });
        archives.createIndex("profileId_programDate", ["profileId", "programDate"], {
          unique: false
        });
        archives.createIndex("agendaCsvData", "agendaCsvData", { unique: false });
        archives.createIndex("agendaRows", "agendaRows", { unique: false });
      }

      if (!database.objectStoreNames.contains("metadata")) {
        database.createObjectStore("metadata", { keyPath: "key" });
      }

      if (!database.objectStoreNames.contains("migrations")) {
        database.createObjectStore("migrations", { keyPath: "profileId" });
      }

      if (!database.objectStoreNames.contains("history")) {
        const history = database.createObjectStore("history", { keyPath: "id" });
        history.createIndex("profileId", "profileId", { unique: false });
        history.createIndex("date", "date", { unique: false });
        history.createIndex("cachedAt", "cachedAt", { unique: false });
        history.createIndex("profileId_cachedAt", ["profileId", "cachedAt"], {
          unique: false
        });
      }

      if (!database.objectStoreNames.contains("drafts")) {
        const drafts = database.createObjectStore("drafts", { keyPath: "id" });
        drafts.createIndex("profileId", "profileId", { unique: false });
        drafts.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearCmsStorage(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();

    if (typeof indexedDB.databases === "function") {
      const databases = await indexedDB.databases();
      await Promise.all(
        databases.map(
          database =>
            new Promise(resolve => {
              if (!database.name) {
                resolve();
                return;
              }
              const request = indexedDB.deleteDatabase(database.name);
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            })
        )
      );
    }
  });
}

export async function seedCmsStorage(page, { profiles, selectedProfileId, metadata = {}, drafts = [] }) {
  await page.evaluate(
    async ({
      profiles: profileList,
      selectedProfileId: currentProfileId,
      metadata: metadataMap,
      drafts: draftList,
      selectedProfileKey
    }) => {
      function getBrowserDbName(pathname) {
        if (pathname.includes("/meeting-program-dev/")) {
          return "MeetingProgramDB__meeting-program-dev";
        }
        if (pathname.includes("/meeting-program/")) {
          return "MeetingProgramDB__meeting-program";
        }
        return "MeetingProgramDB";
      }

      function openBrowserDatabase(dbName) {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(dbName, 6);

          request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains("profiles")) {
              const profilesStore = database.createObjectStore("profiles", { keyPath: "id" });
              profilesStore.createIndex("url", "url", { unique: false });
              profilesStore.createIndex("lastUsed", "lastUsed", { unique: false });
              profilesStore.createIndex("inactive", "inactive", { unique: false });
              profilesStore.createIndex("agendaUrl", "agendaUrl", { unique: false });
              profilesStore.createIndex("agendaLastLoaded", "agendaLastLoaded", { unique: false });
              profilesStore.createIndex("agendaValid", "agendaValid", { unique: false });
            }

            if (!database.objectStoreNames.contains("archives")) {
              const archivesStore = database.createObjectStore("archives", { keyPath: "id" });
              archivesStore.createIndex("profileId", "profileId", { unique: false });
              archivesStore.createIndex("programDate", "programDate", { unique: false });
              archivesStore.createIndex("profileId_programDate", ["profileId", "programDate"], {
                unique: false
              });
              archivesStore.createIndex("agendaCsvData", "agendaCsvData", { unique: false });
              archivesStore.createIndex("agendaRows", "agendaRows", { unique: false });
            }

            if (!database.objectStoreNames.contains("metadata")) {
              database.createObjectStore("metadata", { keyPath: "key" });
            }

            if (!database.objectStoreNames.contains("migrations")) {
              database.createObjectStore("migrations", { keyPath: "profileId" });
            }

            if (!database.objectStoreNames.contains("history")) {
              const historyStore = database.createObjectStore("history", { keyPath: "id" });
              historyStore.createIndex("profileId", "profileId", { unique: false });
              historyStore.createIndex("date", "date", { unique: false });
              historyStore.createIndex("cachedAt", "cachedAt", { unique: false });
              historyStore.createIndex("profileId_cachedAt", ["profileId", "cachedAt"], {
                unique: false
              });
            }

            if (!database.objectStoreNames.contains("drafts")) {
              const draftsStore = database.createObjectStore("drafts", { keyPath: "id" });
              draftsStore.createIndex("profileId", "profileId", { unique: false });
              draftsStore.createIndex("updatedAt", "updatedAt", { unique: false });
            }
          };

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      const dbName = getBrowserDbName(window.location.pathname);
      const database = await openBrowserDatabase(dbName);

      await new Promise((resolve, reject) => {
        const transaction = database.transaction(
          ["profiles", "metadata", "drafts"],
          "readwrite"
        );

        const profilesStore = transaction.objectStore("profiles");
        const metadataStore = transaction.objectStore("metadata");
        const draftsStore = transaction.objectStore("drafts");

        profileList.forEach(profile => {
          profilesStore.put(profile);
        });

        metadataStore.put({ key: selectedProfileKey, value: currentProfileId });
        Object.entries(metadataMap).forEach(([key, value]) => {
          metadataStore.put({ key, value });
        });

        draftList.forEach(draft => {
          draftsStore.put({
            id: draft.id,
            profileId: draft.profileId,
            data: draft.data ?? {
              selectedTabTitle: draft.selectedTabTitle,
              selectedKey: draft.selectedKey,
              dirtyMap: draft.dirtyMap,
              savedAt: draft.savedAt ?? draft.updatedAt ?? Date.now()
            },
            updatedAt: draft.updatedAt ?? Date.now()
          });
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });

      database.close();
    },
    {
      profiles,
      selectedProfileId,
      metadata,
      drafts,
      selectedProfileKey: SELECTED_PROFILE_KEY
    }
  );
}

export async function seedCmsSessionStorage(page, entries = {}) {
  await page.evaluate((values) => {
    Object.entries(values).forEach(([key, value]) => {
      sessionStorage.setItem(key, String(value));
    });
  }, entries);
}

export async function injectFakeToken(
  page,
  {
    authenticated = true,
    token = "fake-access-token",
    email = "clerk@example.test",
    name = "Clerk User",
    expiresAt = Date.now() + 60 * 60 * 1000
  } = {}
) {
  const gsiScript = `
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: function initTokenClient(config) {
            return {
              requestAccessToken: function requestAccessToken() {
                config.callback({
                  access_token: ${JSON.stringify(token)},
                  expires_in: 3600
                });
              }
            };
          }
        }
      }
    };
  `;

  await page.context().route("https://accounts.google.com/gsi/client", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: gsiScript
    });
  });

  if (authenticated) {
    await page.evaluate(
      ({ token: authToken, email: userEmail, name: userName, expiresAt: tokenExpiresAt, keys }) => {
        sessionStorage.setItem(keys.ACCESS_TOKEN, authToken);
        sessionStorage.setItem(keys.USER_EMAIL, userEmail);
        sessionStorage.setItem(keys.USER_NAME, userName);
        sessionStorage.setItem(keys.TOKEN_EXPIRES, String(tokenExpiresAt));
      },
      { token, email, name, expiresAt, keys: GOOGLE_STORAGE_KEYS }
    );
  }
}

export async function bootstrapCmsPage(
  page,
  {
    relativePath,
    authenticated = true,
    profiles,
    selectedProfileId,
    metadata = {},
    drafts = [],
    sessionStorage = {}
  }
) {
  await clearCmsStorage(page);
  await seedCmsStorage(page, { profiles, selectedProfileId, metadata, drafts });
  await seedCmsSessionStorage(page, sessionStorage);
  await injectFakeToken(page, { authenticated });
  await page.goto(new URL(relativePath, BASE_URL).toString(), { waitUntil: "load" });
}
