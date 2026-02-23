import { describe, test, expect, beforeEach, vi } from "vitest";

// Prevent init() from auto-running during tests
window.__VITEST__ = true;

// Mock sanitize.js
vi.mock("../js/sanitize.js", () => ({
    sanitizeEntry: vi.fn((key, value) => {
        if (!key || !key.trim()) return null;
        return { key: key.trim(), value: value || "" };
    }),
    isSafeUrl: vi.fn((url) => url.startsWith("http"))
}));

// Mock qr.js
vi.mock("../js/qr.js", () => ({
    showScanner: vi.fn(),
    stopQRScanner: vi.fn()
}));

// Mock profiles.js
vi.mock("../js/profiles.js", () => ({
    getProfiles: vi.fn(() => []),
    getCurrentProfile: vi.fn(() => null),
    addProfile: vi.fn(),
    selectProfile: vi.fn(),
    removeProfile: vi.fn()
}));

// Import main.js AFTER mocks
import * as Main from "../js/main.js";
import * as Profiles from "../js/profiles.js";

const {
    splitHymn,
    splitLeadership,
    appendRow,
    appendRowHymn,
    renderSpeaker,
    renderLeader,
    renderGeneralStatementWithLink,
    renderGeneralStatement,
    renderLink,
    renderLinkWithSpace,
    renderProgram,
    init,
    fetchSheet,
    parseCSV,
    renderers,
    fetchWithTimeout
} = Main;

// ------------------------------------------------------------
// 4. Global beforeEach — DOM, mocks, fetch, URL, localStorage
// ------------------------------------------------------------
beforeEach(() => {
    // Mock window.scrollTo since JSDOM doesn't implement it
    window.scrollTo = vi.fn();

    document.body.innerHTML = `
    <header id="program-header" class="hidden">
        <h2 class="sacrament-unit-header-h2"><span id="unitname"></span></h2>
        <h6 class="sacrament-unit-header-h6"><span id="unitaddress"></span></h6>
        <p id="date"></p>
    </header>
    <div id="offline-banner" hidden></div>
    <div id="main-program"></div>
    <button id="qr-action-btn"></button>
    <button id="reload-btn" class="hidden"></button>
    <div id="app-version"></div>
    <div id="last-updated" class="hidden"></div>
  `;

    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();

    delete window.location;
    window.location = new URL("https://example.com/");
});

import { afterEach } from "vitest";
afterEach(() => {
    vi.useRealTimers();
});

// ------------------------------------------------------------
// 5. TESTS
// ------------------------------------------------------------

// ---------- splitHymn ----------
describe("splitHymn()", () => {
    test("parses hymn number and title", () => {
        expect(splitHymn("#12 Be Still")).toEqual({
            number: "#12",
            title: "Be Still"
        });
    });

    test("handles missing title", () => {
        expect(splitHymn("45")).toEqual({
            number: "45",
            title: ""
        });
    });
});

// ---------- splitLeadership ----------
describe("splitLeadership()", () => {
    test("splits name, phone, and position", () => {
        expect(splitLeadership("John Doe | 555-1234 | Bishop")).toEqual({
            name: "John Doe",
            phone: "555-1234",
            position: "Bishop"
        });
    });
});

// ---------- appendRow ----------
describe("appendRow()", () => {
    test("creates a labeled row", () => {
        appendRow("Speaker", "Alice", "speaker");

        const row = document.querySelector("#speaker .leader-of-dots");
        expect(row).not.toBeNull();
        expect(row.querySelector(".label").textContent).toBe("Speaker");
        expect(row.querySelector(".value-on-right").textContent).toBe("Alice");
    });
});

// ---------- appendRowHymn ----------
describe("appendRowHymn()", () => {
    test("renders hymn number and title", () => {
        appendRowHymn("Opening Hymn", "#12 Be Still", "openingHymn");

        const div = document.querySelector("#openingHymn");
        expect(div.querySelector(".value-on-right").textContent).toBe("#12");
        expect(div.querySelector(".hymn-title").textContent).toBe("Be Still");
    });
});

// ---------- renderSpeaker ----------
describe("renderSpeaker()", () => {
    test("renders a speaker row", () => {
        renderSpeaker("Alice");
        expect(document.querySelector("#speaker .value-on-right").textContent).toBe("Alice");
    });
});

// ---------- renderLeader ----------
describe("renderLeader()", () => {
    test("renders leader with name, phone, and position", () => {
        renderLeader("John Doe | 555-1234 | Bishop");

        const div = document.querySelector("#main-program > div");
        expect(div.querySelector(".label").textContent).toBe("John Doe");
        expect(div.querySelector(".hymn-title").textContent).toBe("555-1234");
        expect(div.querySelector(".value-on-right").textContent).toBe("Bishop");
    });
});

// ---------- renderGeneralStatementWithLink ----------
describe("renderGeneralStatementWithLink()", () => {
    test("renders text with clickable link", () => {
        renderGeneralStatementWithLink("Visit <LINK> our site | example.com");

        const link = document.querySelector(".general-link");
        expect(link.href).toBe("https://example.com/");
        expect(link.textContent).toBe("example.com");
    });
});

// ---------- renderGeneralStatement ----------
describe("renderGeneralStatement()", () => {
    test("renders plain text", () => {
        renderGeneralStatement("Hello world");
        expect(document.querySelector(".general-statement").textContent).toBe("Hello world");
    });
});

// ---------- renderLink ----------
describe("renderLink()", () => {
    test("renders centered link", () => {
        renderLink("Click here | example.com");

        const a = document.querySelector(".link-center a");
        expect(a.href).toBe("https://example.com/");
        expect(a.textContent).toBe("Click here");
    });
});

// ---------- renderLinkWithSpace ----------
describe("renderLinkWithSpace()", () => {
    test("renders link with optional image", () => {
        renderLinkWithSpace("Library <IMG> | example.com | https://img.com/icon.png");

        expect(document.querySelector(".link-icon")).not.toBeNull();
        expect(document.querySelector(".link-with-space a").href).toBe("https://example.com/");
    });
});

// ---------- renderProgram ----------
describe("renderProgram()", () => {
    test("calls correct renderer", () => {
        const spy = vi.spyOn(renderers, "speaker");
        renderProgram([{ key: "speaker", value: "Alice" }]);
        expect(spy).toHaveBeenCalledWith("Alice");
    });

    test("skips empty values but renders horizontalLine", () => {
        const spy = vi.spyOn(renderers, "horizontalLine");
        renderProgram([
            { key: "speaker", value: "" },
            { key: "horizontalLine", value: "" }
        ]);
        expect(spy).toHaveBeenCalledWith("");
    });
});

// ---------- fetchSheet ----------
describe("fetchSheet()", () => {
    test("returns null when no URL", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
        expect(await fetchSheet("")).toBeNull();
        expect(warn).toHaveBeenCalled();
    });
});

// ---------- parseCSV ----------
describe("parseCSV()", () => {
    test("parses simple CSV", () => {
        const csv = "key,value\nspeaker,Alice";
        expect(parseCSV(csv)).toEqual([{ key: "speaker", value: "Alice" }]);
    });

    test("handles tilde to comma replacement", () => {
        const csv = "key,value\nunitAddress,123 Main St~ City US";
        expect(parseCSV(csv)).toEqual([{ key: "unitAddress", value: "123 Main St, City US" }]);
    });

    test("handles empty lines", () => {
        const csv = "key,value\nspeaker,Alice\n\nunitName,My Ward";
        expect(parseCSV(csv)).toHaveLength(2);
    });

    test("handles Unicode characters", () => {
        const csv = "key,value\nspeaker,José Múñoz 🎵";
        const result = parseCSV(csv);
        expect(result[0].value).toBe("José Múñoz 🎵");
    });

    // These tests reflect currently failing/unsupported behavior that we plan to fix in Phase 2.1
    describe("RFC 4180 Compliance (Planned Improvements)", () => {
        test("handles quoted commas in values", () => {
            const csv = 'key,value\nspeaker,"Smith, John"';
            const result = parseCSV(csv);
            expect(result[0].key).toBe("speaker");
            expect(result[0].value).toBe("Smith, John");
        });

        test("handles escaped quotes", () => {
            const csv = 'key,value\ngeneralStatement,"He said ""Hello"""';
            const result = parseCSV(csv);
            expect(result[0].value).toBe('He said "Hello"');
        });
    });
});

describe("renderLineBreak()", () => {
    test("renders horizontal line", () => {
        Main.renderLineBreak("Announcements");
        const line = document.querySelector("#main-program > hr");
        expect(line.getAttribute("data-content")).toBe("Announcements");
    });
});

describe("renderDate()", () => {
    test("renders date", async () => {
        Main.renderDate("2024-01-01");
        const dateElement = document.querySelector("#date");
        expect(dateElement).not.toBeNull();
        expect(dateElement.textContent).toBe("2024-01-01");
    });
});

describe("renderUnitAddress()", () => {
    test("renders unit address", async () => {
        Main.renderUnitAddress("123 Main St");
        const addressElement = document.querySelector("#unitaddress");
        expect(addressElement).not.toBeNull();
        expect(addressElement.textContent).toBe("123 Main St");
    });
});

describe("renderUnitName()", () => {
    test("renders unit name", async () => {
        Main.renderUnitName("Unit A");
        const nameElement = document.querySelector("#unitname");
        expect(nameElement).not.toBeNull();
        expect(nameElement.textContent).toBe("Unit A");
    });
});

// ---------- Error Handling & Networking ----------
describe("Networking & Errors", () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    describe("fetchSheet()", () => {
        test("handles HTTP 404 error", async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 404,
                text: () => Promise.resolve("Not Found")
            });

            await expect(Main.fetchSheet("https://docs.google.com/spreadsheets/d/nonexistent")).rejects.toThrow(/status: 404/);
        });

        test("handles network failure", async () => {
            global.fetch.mockRejectedValue(new Error("Network Error"));
            await expect(Main.fetchSheet("https://docs.google.com/spreadsheets/d/test")).rejects.toThrow("Network Error");
        });
    });

    describe("fetchWithTimeout()", () => {
        test("resolves on success", async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve("data")
            });
            const result = await Main.fetchWithTimeout("https://example.com", 1000);
            expect(result).toBe("data");
        });

        test("rejects on timeout", async () => {
            vi.useFakeTimers();
            // Mock fetch to respect the abort signal
            global.fetch.mockImplementation((url, { signal }) => {
                return new Promise((resolve, reject) => {
                    if (signal.aborted) {
                        const err = new Error("Aborted");
                        err.name = "AbortError";
                        return reject(err);
                    }
                    signal.addEventListener("abort", () => {
                        const err = new Error("Aborted");
                        err.name = "AbortError";
                        reject(err);
                    });
                });
            });

            const promise = fetchWithTimeout("https://example.com", 100);

            vi.advanceTimersByTime(150);

            await expect(promise).rejects.toThrow(/timeout/i);
            vi.useRealTimers();
        });
    });

    describe("init()", () => {
        test("loads from sheetUrl if present in localStorage (legacy migration)", async () => {
            const url = "https://docs.google.com/spreadsheets/d/test";
            localStorage.setItem("sheetUrl", url);
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve("key,value\nspeaker,Alice")
            });

            await init();

            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("test"), expect.anything());
            expect(document.querySelector("#speaker")).not.toBeNull();

            // Should have migrated
            expect(Profiles.addProfile).toHaveBeenCalled();
            expect(localStorage.getItem("sheetUrl")).toBeNull();
        });

        test("loads from current profile", async () => {
            const profile = { id: "123", url: "https://profile.com", unitName: "U", stakeName: "S" };
            Profiles.getCurrentProfile.mockReturnValue(profile);

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve("key,value\nspeaker,Bob")
            });

            await init();

            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("profile.com"), expect.anything());
        });

        test("falls back to cache if fetch fails", async () => {
            localStorage.setItem("sheetUrl", "https://docs.google.com/spreadsheets/d/test");
            localStorage.setItem("programCache", JSON.stringify([{ key: "speaker", value: "Cached Alice" }]));
            global.fetch.mockRejectedValue(new Error("Offline"));

            await init();

            const speakerVal = document.querySelector("#speaker .value-on-right");
            expect(speakerVal).not.toBeNull();
            expect(speakerVal.textContent).toBe("Cached Alice");
        });

        test("shows offline banner when using cache", async () => {
            localStorage.setItem("sheetUrl", "https://docs.google.com/spreadsheets/d/test");
            localStorage.setItem("programCache", JSON.stringify([{ key: "speaker", value: "Cached Alice" }]));
            global.fetch.mockRejectedValue(new Error("Offline"));

            await init();

            const banner = document.getElementById("offline-banner");
            expect(banner.classList.contains("visible")).toBe(true);
        });
    });
});