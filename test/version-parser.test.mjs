import { describe, it, expect } from "vitest";
import { parseVersion, isNewer } from "../js/version-parser.js";

describe("parseVersion", () => {
  describe("valid formats", () => {
    it('parses "1.0.0"', () => {
      expect(parseVersion("1.0.0")).toEqual([1, 0, 0]);
    });

    it('parses "1.2.3"', () => {
      expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
    });

    it('parses "10.20.30"', () => {
      expect(parseVersion("10.20.30")).toEqual([10, 20, 30]);
    });

    it('parses "0.0.0"', () => {
      expect(parseVersion("0.0.0")).toEqual([0, 0, 0]);
    });

    it('parses "999.999.999"', () => {
      expect(parseVersion("999.999.999")).toEqual([999, 999, 999]);
    });
  });

  describe("invalid formats", () => {
    it("handles empty string", () => {
      expect(parseVersion("")).toEqual([0, 0, 0]);
    });

    it("handles null", () => {
      expect(parseVersion(null)).toEqual([0, 0, 0]);
    });

    it("handles undefined", () => {
      expect(parseVersion(undefined)).toEqual([0, 0, 0]);
    });

    it("handles non-string input", () => {
      expect(parseVersion(123)).toEqual([0, 0, 0]);
      expect(parseVersion({})).toEqual([0, 0, 0]);
      expect(parseVersion([])).toEqual([0, 0, 0]);
    });

    it('handles "abc"', () => {
      expect(parseVersion("abc")).toEqual([0, 0, 0]);
    });

    it('handles "1.2" (missing patch)', () => {
      expect(parseVersion("1.2")).toEqual([0, 0, 0]);
    });

    it('handles "1.2.3.4" (too many parts)', () => {
      expect(parseVersion("1.2.3.4")).toEqual([0, 0, 0]);
    });
  });

  describe("edge cases", () => {
    it('handles leading zeros "01.02.03"', () => {
      expect(parseVersion("01.02.03")).toEqual([1, 2, 3]);
    });

    it('handles whitespace " 1 . 2 . 3 "', () => {
      expect(parseVersion(" 1 . 2 . 3 ")).toEqual([1, 2, 3]);
    });

    it('handles whitespace around versions " 1.2.3 "', () => {
      expect(parseVersion(" 1.2.3 ")).toEqual([1, 2, 3]);
    });

    it("handles non-numeric parts", () => {
      expect(parseVersion("1.a.3")).toEqual([0, 0, 0]);
    });
  });
});

describe("isNewer", () => {
  describe("major version increments", () => {
    it("returns true when remote major > local major", () => {
      expect(isNewer("2.0.0", "1.9.9")).toBe(true);
    });

    it("returns false when remote major < local major", () => {
      expect(isNewer("1.0.0", "2.0.0")).toBe(false);
    });
  });

  describe("minor version increments", () => {
    it("returns true when remote minor > local minor (same major)", () => {
      expect(isNewer("1.1.0", "1.0.9")).toBe(true);
    });

    it("returns false when remote minor < local minor (same major)", () => {
      expect(isNewer("1.0.0", "1.1.0")).toBe(false);
    });
  });

  describe("patch version increments", () => {
    it("returns true when remote patch > local patch", () => {
      expect(isNewer("1.0.1", "1.0.0")).toBe(true);
    });

    it("handles two-digit patch versions numerically", () => {
      expect(isNewer("2.2.10", "2.2.9")).toBe(true);
      expect(isNewer("2.1.10", "2.1.9")).toBe(true);
    });

    it("does not use lexical ordering for patch versions", () => {
      expect(isNewer("2.2.9", "2.2.10")).toBe(false);
      expect(isNewer("2.1.10", "2.1.11")).toBe(false);
    });

    it("returns false when remote patch < local patch", () => {
      expect(isNewer("1.0.0", "1.0.1")).toBe(false);
    });
  });

  describe("equal versions", () => {
    it("returns false when versions are equal", () => {
      expect(isNewer("1.0.0", "1.0.0")).toBe(false);
      expect(isNewer("1.2.3", "1.2.3")).toBe(false);
    });
  });

  describe("zero transitions", () => {
    it("handles major version zero transition", () => {
      expect(isNewer("1.0.0", "0.9.9")).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("handles invalid remote version", () => {
      expect(isNewer("invalid", "1.0.0")).toBe(false);
    });

    it("handles invalid local version", () => {
      expect(isNewer("2.0.0", "invalid")).toBe(true);
    });

    it("handles null versions", () => {
      expect(isNewer(null, null)).toBe(false);
    });
  });
});
