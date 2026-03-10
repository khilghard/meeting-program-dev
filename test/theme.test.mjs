import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Mock localStorage globally before any imports
const mockLocalStorage = {
  data: {},
  getItem: vi.fn((key) => mockLocalStorage.data[key] || null),
  setItem: vi.fn((key, value) => {
    mockLocalStorage.data[key] = value;
  }),
  removeItem: vi.fn((key) => {
    delete mockLocalStorage.data[key];
  }),
  clear: vi.fn(() => {
    mockLocalStorage.data = {};
  })
};

describe("theme.js", () => {
  let initTheme, toggleTheme, getTheme, applyTheme, setMetadataDependencies;
  let mockDocumentElement;
  let mockToggleBtn;
  let mockMatchMedia;
  let mockMediaQueryListener;
  let mockMetadata;
  let originalDocument;
  let originalWindow;

  beforeEach(async () => {
    // Clear localStorage before each test
    mockLocalStorage.data = {};
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();

    mockMetadata = {};
    mockDocumentElement = { dataset: {} };
    mockToggleBtn = { onclick: null };
    mockMediaQueryListener = null;

    mockMatchMedia = {
      matches: false,
      addEventListener: vi.fn((event, handler) => {
        if (event === "change") mockMediaQueryListener = handler;
      }),
      removeEventListener: vi.fn()
    };

    originalDocument = global.document;
    originalWindow = global.window;

    // Set up mocks BEFORE importing the module
    global.localStorage = mockLocalStorage;
    global.document = {
      documentElement: mockDocumentElement,
      getElementById: vi.fn((id) => (id === "theme-toggle" ? mockToggleBtn : null))
    };

    global.window = {
      matchMedia: vi.fn((query) => mockMatchMedia),
      localStorage: mockLocalStorage
    };

    const mockGetMetadata = vi.fn((key) => Promise.resolve(mockMetadata[key] || null));
    const mockSetMetadata = vi.fn((key, value) => {
      mockMetadata[key] = value;
      return Promise.resolve(true);
    });

    const module = await import("../js/theme.js");
    initTheme = module.initTheme;
    toggleTheme = module.toggleTheme;
    getTheme = module.getTheme;
    applyTheme = module.applyTheme;
    setMetadataDependencies = module.setMetadataDependencies;

    setMetadataDependencies(mockGetMetadata, mockSetMetadata);
  });

  afterEach(() => {
    global.document = originalDocument;
    global.window = originalWindow;
    delete global.localStorage;
    vi.restoreAllMocks();
  });

  describe("applyTheme", () => {
    test("should apply dark theme", () => {
      applyTheme("dark");
      expect(mockDocumentElement.dataset.theme).toBe("dark");
    });

    test("should apply light theme", () => {
      applyTheme("light");
      expect(mockDocumentElement.dataset.theme).toBe("light");
    });
  });

  describe("getTheme", () => {
    test("should return current theme", () => {
      mockDocumentElement.dataset.theme = "dark";
      expect(getTheme()).toBe("dark");
    });

    test("should return light when no theme set", () => {
      expect(getTheme()).toBe("light");
    });
  });

  describe("toggleTheme", () => {
    test("should toggle from dark to light", async () => {
      mockDocumentElement.dataset.theme = "dark";
      await toggleTheme();
      expect(mockDocumentElement.dataset.theme).toBe("light");
    });

    test("should toggle from light to dark", async () => {
      mockDocumentElement.dataset.theme = "light";
      await toggleTheme();
      expect(mockDocumentElement.dataset.theme).toBe("dark");
    });
  });

  describe("initTheme", () => {
    test("should use saved theme from IndexedDB", async () => {
      mockMetadata["userPreference_theme"] = "dark";
      await initTheme();
      expect(mockDocumentElement.dataset.theme).toBe("dark");
    });

    test("should use system preference when no saved theme", async () => {
      mockMatchMedia.matches = true;
      await initTheme();
      expect(mockDocumentElement.dataset.theme).toBe("dark");
    });

    test("should default to light when no saved theme and system is light", async () => {
      mockMatchMedia.matches = false;
      await initTheme();
      expect(mockDocumentElement.dataset.theme).toBe("light");
    });

    test("should setup toggle button click handler", async () => {
      await initTheme();
      expect(mockToggleBtn.onclick).toBeDefined();
    });

    test("should toggle theme when button clicked", async () => {
      mockDocumentElement.dataset.theme = "light";
      await initTheme();
      await mockToggleBtn.onclick();
      expect(mockDocumentElement.dataset.theme).toBe("dark");
    });

    test("should listen for system theme changes", async () => {
      await initTheme();
      expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    });

    test("should update theme on system change when no saved preference", async () => {
      await initTheme();
      await mockMediaQueryListener({ matches: true });
      expect(mockDocumentElement.dataset.theme).toBe("dark");
    });

    test("should not update theme on system change when saved preference exists", async () => {
      mockMetadata["userPreference_theme"] = "light";
      mockDocumentElement.dataset.theme = "light";
      await initTheme();
      await mockMediaQueryListener({ matches: true });
      expect(mockDocumentElement.dataset.theme).toBe("light");
    });
  });
});
