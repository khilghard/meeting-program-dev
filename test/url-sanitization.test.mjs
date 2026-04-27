import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSheet, sanitizeSheetUrl } from "../js/utils/csv.js";

// Helper to mock fetch globally
function mockFetch(responseText, status = 200) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(responseText)
    })
  );
}

describe("URL Sanitization for CSV fetching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sanitizeSheetUrl()", () => {
    it("transforms a standard edit URL to gviz CSV endpoint, preserving gid", () => {
      const editUrl = "https://docs.google.com/spreadsheets/d/FILE_ID/edit?gid=0";
      const result = sanitizeSheetUrl(editUrl);
      expect(result).toBe(
        "https://docs.google.com/spreadsheets/d/FILE_ID/gviz/tq?tqx=out:csv&gid=0"
      );
    });

    it("transforms an edit URL without trailing slash", () => {
      const editUrl = "https://docs.google.com/spreadsheets/d/FILE_ID/edit";
      const result = sanitizeSheetUrl(editUrl);
      expect(result).toBe("https://docs.google.com/spreadsheets/d/FILE_ID/gviz/tq?tqx=out:csv");
    });

    it("transforms an edit URL with trailing slash", () => {
      const editUrl = "https://docs.google.com/spreadsheets/d/FILE_ID/edit/";
      const result = sanitizeSheetUrl(editUrl);
      expect(result).toBe("https://docs.google.com/spreadsheets/d/FILE_ID/gviz/tq?tqx=out:csv");
    });

    it("preserves a URL that already has tqx=out:csv", () => {
      const alreadyCsvUrl = "https://docs.google.com/spreadsheets/d/FILE_ID/gviz/tq?tqx=out:csv";
      const result = sanitizeSheetUrl(alreadyCsvUrl);
      expect(result).toBe(alreadyCsvUrl);
    });

    it("preserves a URL that has output=csv (published format)", () => {
      const publishedUrl = "https://docs.google.com/spreadsheets/d/FILE_ID/pub?output=csv";
      const result = sanitizeSheetUrl(publishedUrl);
      expect(result).toBe(publishedUrl);
    });

    it("preserves a URL that has both tqx and other params", () => {
      const urlWithParams =
        "https://docs.google.com/spreadsheets/d/FILE_ID/gviz/tq?tqx=out:csv&gid=123";
      const result = sanitizeSheetUrl(urlWithParams);
      expect(result).toBe(urlWithParams);
    });

    it("leaves non-Google URLs unchanged", () => {
      const otherUrl = "https://example.com/data.csv";
      const result = sanitizeSheetUrl(otherUrl);
      expect(result).toBe(otherUrl);
    });

    it("returns empty string for empty input", () => {
      const result = sanitizeSheetUrl("");
      expect(result).toBe("");
    });

    it("returns undefined for undefined input", () => {
      const result = sanitizeSheetUrl(undefined);
      expect(result).toBeUndefined();
    });

    it("handles URL with fragment (hash) by discarding it", () => {
      const urlWithHash = "https://docs.google.com/spreadsheets/d/FILE_ID/edit#gid=0";
      const result = sanitizeSheetUrl(urlWithHash);
      expect(result).toBe("https://docs.google.com/spreadsheets/d/FILE_ID/gviz/tq?tqx=out:csv");
    });
  });

  describe("fetchSheet() uses sanitized URL", () => {
    const sampleCSV = `key,value
agendaGeneral,Test agenda item`;

    it("fetches the transformed URL for a standard edit URL with gid", async () => {
      mockFetch(sampleCSV);
      const editUrl = "https://docs.google.com/spreadsheets/d/FILE_ID/edit?gid=0";

      await fetchSheet(editUrl);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toBe(
        "https://docs.google.com/spreadsheets/d/FILE_ID/gviz/tq?tqx=out:csv&gid=0"
      );
    });

    it("does not modify URL that already has tqx=out:csv", async () => {
      mockFetch(sampleCSV);
      const csvUrl = "https://docs.google.com/spreadsheets/d/FILE_ID/gviz/tq?tqx=out:csv";

      await fetchSheet(csvUrl);

      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toBe(csvUrl);
    });

    it("throws on HTTP error", async () => {
      mockFetch("Not Found", 404);
      const editUrl = "https://docs.google.com/spreadsheets/d/FILE_ID/edit?gid=0";

      await expect(fetchSheet(editUrl)).rejects.toThrow("HTTP error! status: 404");
    });
  });
});
