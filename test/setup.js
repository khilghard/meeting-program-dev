// Prevent init() from auto-running during tests
globalThis.window = globalThis.window || {};
window.__VITEST__ = true;

// In-memory storage
const storageData = {
  profiles: new Map(),
  archives: new Map(),
  metadata: new Map(),
  migrations: new Map()
};

// Mock IndexedDB factory
class MockIDBFactory {
  constructor() {
    this.databases = new Map();
  }

  open(name, version) {
    const request = {
      name,
      version,
      result: null,
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null
    };

    setImmediate(() => {
      const db = {
        name,
        version,
        objectStoreNames: {
          contains(name) {
            return this.list && this.list.includes(name);
          },
          list: [],
          get length() {
            return this.list ? this.list.length : 0;
          }
        },
        createObjectStore(storeName, options) {
          this.objectStoreNames.list.push(storeName);
          storageData[storeName] = new Map();
          return {
            _data: storageData[storeName],
            _indexes: new Map(),
            get(key) {
              const result = this._data.get(key);
              return { result, onsuccess: null, onerror: null };
            },
            getAll(key) {
              const results = [];
              if (key !== undefined) {
                for (const entry of this._data) {
                  if (entry[1] && entry[1][key] !== undefined) results.push(entry[1]);
                }
              } else {
                for (const v of this._data.values()) results.push(v);
              }
              return { result: results, onsuccess: null, onerror: null };
            },
            put(value) {
              const key =
                options && options.keyPath
                  ? value[options.keyPath]
                  : Array.from(this._data.keys()).pop() + 1;
              this._data.set(key, value);
              storageData[storeName] = this._data;
              return { result: key, onsuccess: null, onerror: null };
            },
            delete(key) {
              this._data.delete(key);
              storageData[storeName] = this._data;
              return { result: undefined, onsuccess: null, onerror: null };
            },
            clear() {
              this._data.clear();
              storageData[storeName] = this._data;
              return { result: undefined, onsuccess: null, onerror: null };
            },
            createIndex(name, keyPath, options) {
              this._indexes.set(name, { keyPath, unique: options && options.unique });
              return {};
            },
            index(name) {
              return this._indexes.get(name);
            }
          };
        },
        transaction(storeNames, mode) {
          const stores = {};
          const self = this;
          for (const storeName of storeNames) {
            const data = storageData[storeName] || new Map();
            stores[storeName] = {
              _data: data,
              _indexes: new Map(),
              get(key) {
                const result = this._data.get(key);
                return { result, onsuccess: null, onerror: null };
              },
              getAll(key) {
                const results = [];
                if (key !== undefined) {
                  for (const entry of this._data) {
                    if (entry[1] && entry[1][key] !== undefined) results.push(entry[1]);
                  }
                } else {
                  for (const v of this._data.values()) results.push(v);
                }
                return { result: results, onsuccess: null, onerror: null };
              },
              put(value) {
                const key = value.id || Array.from(this._data.keys()).pop() + 1;
                this._data.set(key, value);
                storageData[storeName] = this._data;
                return { result: key, onsuccess: null, onerror: null };
              },
              delete(key) {
                this._data.delete(key);
                storageData[storeName] = this._data;
                return { result: undefined, onsuccess: null, onerror: null };
              },
              clear() {
                this._data.clear();
                storageData[storeName] = this._data;
                return { result: undefined, onsuccess: null, onerror: null };
              },
              createIndex() {
                return {};
              },
              index() {
                return null;
              }
            };
          }
          return {
            objectStore(name) {
              return stores[name];
            },
            oncomplete: null,
            onerror: null
          };
        },
        close() {}
      };

      // Create object stores on upgrade
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: { result: db } });
      }

      // Initialize stores if not created during upgrade
      if (!storageData.profiles) storageData.profiles = new Map();
      if (!storageData.archives) storageData.archives = new Map();
      if (!storageData.metadata) storageData.metadata = new Map();
      if (!storageData.migrations) storageData.migrations = new Map();

      request.result = db;
      if (request.onsuccess) request.onsuccess();
    });

    return request;
  }

  deleteDatabase(name) {
    this.databases.delete(name);
    return { name, onsuccess: null, onerror: null };
  }
}

globalThis.indexedDB = new MockIDBFactory();

// Mock crypto.subtle
if (!globalThis.crypto) globalThis.crypto = {};
if (!globalThis.crypto.subtle) {
  globalThis.crypto.subtle = {
    digest: async (algorithm, data) => {
      const str = new TextDecoder().decode(data);
      const hash = new Uint8Array(32);
      let h = 0;
      for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
      for (let j = 0; j < 32; j++) hash[j] = (h >> (j % 8)) & 0xff;
      return hash;
    }
  };
}

// Mock MessageChannel
if (typeof MessageChannel === "undefined") {
  globalThis.MessageChannel = class {
    constructor() {
      this.port1 = { postMessage: () => {} };
      this.port2 = { postMessage: () => {} };
    }
  };
}

// Mock fetch for migration validation tests
if (!globalThis.fetch) {
  globalThis.fetch = async (url) => {
    return {
      ok: true,
      text: async () =>
        "key,value\nobsolete,true\nmigrationUrl,https://docs.google.com/spreadsheets/d/new"
    };
  };
}

// Mock getLanguage from i18n
if (!globalThis.getLanguage) {
  globalThis.getLanguage = () => "en";
}
