// Prevent init() from auto-running during tests
globalThis.window = globalThis.window || {};
window.__VITEST__ = true;

// In-memory storage
let storageData = {
  profiles: new Map(),
  archives: new Map(),
  metadata: new Map(),
  migrations: new Map()
};

globalThis.__resetStorage = () => {
  storageData.profiles.clear();
  storageData.archives.clear();
  storageData.metadata.clear();
  storageData.migrations.clear();
};

// Mock navigator.userAgent for isSafari() tests
if (!global.navigator) {
  global.navigator = {};
}

Object.defineProperty(navigator, "userAgent", {
  value:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
  writable: true
});

// Mock navigator.mediaDevices for camera tests
if (!global.navigator.mediaDevices) {
  global.navigator.mediaDevices = {};
}

navigator.mediaDevices.getUserMedia = vi.fn().mockImplementation(() => {
  return Promise.resolve({
    getTracks: () => []
  });
});

// Import and initialize i18n system before QR module
import { initI18n } from "../js/i18n/index.js";
initI18n();

// Import QR module functions from the actual module
import * as qrModule from "../js/qr.js";

// Make QR module functions available on window for tests
window.isSafari = qrModule.isSafari;
window.isValidSheetUrl = qrModule.isValidSheetUrl;
window.extractSheetUrl = qrModule.extractSheetUrl;
window.showScanner = qrModule.showScanner;
window.hideScanner = qrModule.hideScanner;
window.showManualUrlEntry = qrModule.showManualUrlEntry;
window.hideManualUrlEntry = qrModule.hideManualUrlEntry;
window.scanFrame = qrModule.scanFrame;
window.startQRScanner = qrModule.startQRScanner;
window.stopQRScanner = qrModule.stopQRScanner;
window.handleScannedUrl = qrModule.handleScannedUrl;
window.t = qrModule.t;

// Mock jsQR for QR scanning tests
if (typeof global === "undefined") {
  global = {};
}
global.jsQR = vi.fn().mockImplementation((data, width, height) => {
  return {
    data: "https://docs.google.com/spreadsheets/d/test"
  };
});

function createRequest(result) {
  let successHandler = null;
  let errorHandler = null;
  const req = {
    result,
    get onsuccess() {
      return successHandler;
    },
    set onsuccess(fn) {
      if (fn) {
        successHandler = (evt) => {
          setTimeout(() => fn(evt), 0);
        };
        Promise.resolve().then(() => {
          if (successHandler) successHandler({ target: req });
        });
      } else {
        successHandler = null;
      }
    },
    get onerror() {
      return errorHandler;
    },
    set onerror(fn) {
      errorHandler = fn;
    }
  };
  return req;
}

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

    const storeInstances = {};
    const db = {
      name,
      version,
      _storeInstances: storeInstances,
      objectStoreNames: {
        contains(storeName) {
          return this.list && this.list.includes(storeName);
        },
        list: [],
        get length() {
          return this.list ? this.list.length : 0;
        }
      },
      createObjectStore(storeName, options) {
        this.objectStoreNames.list.push(storeName);
        storageData[storeName] = new Map();
        const storeObj = {
          _data: storageData[storeName],
          _indexes: new Map(),
          get(key) {
            const result = this._data.get(key);
            return createRequest(result);
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
            return createRequest(results);
          },
          put(value) {
            const key =
              options && options.keyPath
                ? value[options.keyPath]
                : Array.from(this._data.keys()).pop() + 1;
            this._data.set(key, value);
            storageData[storeName] = this._data;
            if (
              storeName === "archives" &&
              value.profileId &&
              !storageData.profiles.has(value.profileId)
            ) {
              storageData.profiles.set(value.profileId, {
                id: value.profileId,
                url: "",
                lastUsed: Date.now()
              });
            }
            return createRequest(key);
          },
          delete(key) {
            this._data.delete(key);
            storageData[storeName] = this._data;
            return createRequest(undefined);
          },
          clear() {
            this._data.clear();
            storageData[storeName] = this._data;
            return createRequest(undefined);
          },
          createIndex(name, keyPath, options) {
            this._indexes.set(name, {
              keyPath,
              unique: options && options.unique,
              _data: this._data
            });
            return {
              _data: this._data,
              getAll() {
                const results = [];
                for (const v of this._data.values()) results.push(v);
                return createRequest(results);
              }
            };
          },
          index(name) {
            const idx = this._indexes.get(name);
            if (!idx) return null;
            const keyPath = idx.keyPath;
            return {
              _data: idx._data || this._data,
              get(key) {
                if (Array.isArray(keyPath) && Array.isArray(key)) {
                  for (const v of this._data.values()) {
                    let match = true;
                    for (let i = 0; i < keyPath.length; i++) {
                      if (v[keyPath[i]] !== key[i]) {
                        match = false;
                        break;
                      }
                    }
                    if (match) return createRequest(v);
                  }
                  return createRequest(undefined);
                }
                const result = this._data.get(key);
                return createRequest(result);
              },
              getAll() {
                const results = [];
                for (const v of this._data.values()) results.push(v);
                return createRequest(results);
              }
            };
          }
        };
        storeInstances[storeName] = storeObj;
        return storeObj;
      },
      transaction(storeNames, mode) {
        const stores = {};
        const dbStoreInstances = this._storeInstances;
        for (const storeName of storeNames) {
          if (dbStoreInstances[storeName]) {
            stores[storeName] = dbStoreInstances[storeName];
          } else {
            stores[storeName] = {
              _data: storageData[storeName] || new Map(),
              _indexes: new Map(),
              get(key) {
                const result = this._data.get(key);
                return createRequest(result);
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
                return createRequest(results);
              },
              put(value) {
                const key = Array.from(this._data.keys()).pop() + 1;
                this._data.set(key, value);
                storageData[storeName] = this._data;
                if (
                  storeName === "archives" &&
                  value.profileId &&
                  !storageData.profiles.has(value.profileId)
                ) {
                  storageData.profiles.set(value.profileId, {
                    id: value.profileId,
                    url: "",
                    lastUsed: Date.now()
                  });
                }
                return createRequest(key);
              },
              delete(key) {
                this._data.delete(key);
                storageData[storeName] = this._data;
                return createRequest(undefined);
              },
              clear() {
                this._data.clear();
                storageData[storeName] = this._data;
                return createRequest(undefined);
              },
              createIndex(name, keyPath, options) {
                this._indexes.set(name, {
                  keyPath,
                  unique: options && options.unique,
                  _data: this._data
                });
                return {
                  _data: this._data,
                  getAll() {
                    const results = [];
                    for (const v of this._data.values()) results.push(v);
                    return createRequest(results);
                  }
                };
              },
              index(name) {
                const idx = this._indexes.get(name);
                if (!idx) return null;
                const keyPath = idx.keyPath;
                return {
                  _data: idx._data || this._data,
                  get(key) {
                    if (Array.isArray(keyPath) && Array.isArray(key)) {
                      for (const v of this._data.values()) {
                        let match = true;
                        for (let i = 0; i < keyPath.length; i++) {
                          if (v[keyPath[i]] !== key[i]) {
                            match = false;
                            break;
                          }
                        }
                        if (match) return createRequest(v);
                      }
                      return createRequest(undefined);
                    }
                    const result = this._data.get(key);
                    return createRequest(result);
                  },
                  getAll() {
                    const results = [];
                    for (const v of this._data.values()) results.push(v);
                    return createRequest(results);
                  }
                };
              }
            };
          }
        }
        const tx = {
          objectStore(name) {
            return stores[name];
          },
          oncomplete: null,
          onerror: null
        };
        setTimeout(() => {
          if (tx.oncomplete) tx.oncomplete();
        }, 0);
        return tx;
      },
      close() {}
    };

    if (!storageData.profiles) storageData.profiles = new Map();
    if (!storageData.archives) storageData.archives = new Map();
    if (!storageData.metadata) storageData.metadata = new Map();
    if (!storageData.migrations) storageData.migrations = new Map();

    request.result = db;

    setTimeout(() => {
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: { result: db } });
      }
      if (request.onsuccess) {
        const successFn = request.onsuccess;
        request.onsuccess = null;
        setTimeout(() => successFn(), 0);
      }
    }, 0);

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

// Mock Worker for CSV parsing
class MockWorker {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.listeners = new Map();
  }
  addEventListener(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(handler);
  }
  removeEventListener(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
  }
  postMessage(data) {
    const handlers = this.listeners.get("message");
    if (handlers) {
      setTimeout(() => {
        handlers.forEach((h) => h({ data: { id: data.id, result: "mocked" } }));
      }, 0);
    }
  }
  terminate() {}
}

globalThis.Worker = MockWorker;

// Set up test environment
beforeEach(() => {
  document.body.innerHTML = "";

  const qrScanner = document.createElement("div");
  qrScanner.id = "qr-scanner";
  document.body.appendChild(qrScanner);

  const qrVideo = document.createElement("video");
  qrVideo.id = "qr-video";
  document.body.appendChild(qrVideo);

  const qrCanvas = document.createElement("canvas");
  qrCanvas.id = "qr-canvas";
  document.body.appendChild(qrCanvas);

  const qrOutput = document.createElement("div");
  qrOutput.id = "qr-output";
  document.body.appendChild(qrOutput);

  const qrActionBtn = document.createElement("button");
  qrActionBtn.id = "qr-action-btn";
  qrActionBtn.textContent = "Scan Program QR Code";
  document.body.appendChild(qrActionBtn);

  const manualUrlBtn = document.createElement("button");
  manualUrlBtn.id = "manual-url-btn";
  manualUrlBtn.textContent = "Enter Sheet URL Manually";
  document.body.appendChild(manualUrlBtn);

  const manualUrlContainer = document.createElement("div");
  manualUrlContainer.id = "manual-url-container";
  manualUrlContainer.hidden = true;
  document.body.appendChild(manualUrlContainer);

  const manualUrlInput = document.createElement("input");
  manualUrlInput.id = "manual-url-input";
  manualUrlInput.placeholder = "Enter Google Sheets URL";
  manualUrlContainer.appendChild(manualUrlInput);

  const manualUrlSubmit = document.createElement("button");
  manualUrlSubmit.id = "manual-url-submit";
  manualUrlSubmit.textContent = "Add";
  manualUrlContainer.appendChild(manualUrlSubmit);

  global.jsQR = vi.fn().mockImplementation((data, width, height) => {
    return {
      data: "https://docs.google.com/spreadsheets/d/test"
    };
  });

  window.t = qrModule.t;

  window.__TEST_ENV__ = true;

  window.__handleScannedUrl__ = vi.fn();
});

window.__TEST_ENV__ = true;
