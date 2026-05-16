import { describe, test, expect } from "vitest";
import { sanitizeValue, sanitizeEntry, isSafeUrl } from "../js/sanitize.js";

describe("Sanitization Module", () => {
  describe("sanitizeValue()", () => {
    test("Strip HTML tags", () => {
      expect(sanitizeValue("<b>bold</b>")).toBe("bold");
    });

    test("Allow normal text", () => {
      expect(sanitizeValue("Hello World")).toBe("Hello World");
    });

    test("Allow LINK placeholder", () => {
      expect(sanitizeValue("See <LINK> here")).toBe("See <LINK> here");
    });

    test("Allow IMG placeholder", () => {
      expect(sanitizeValue("<IMG> Gospel Library")).toBe("<IMG> Gospel Library");
    });

    test("Block script tag", () => {
      expect(sanitizeValue("<script>alert(1)</script>")).toBe("");
    });

    test("Block style tag", () => {
      expect(sanitizeValue("<style>body { color: red; }</style>")).toBe("");
    });

    test("Block iframe tag", () => {
      expect(sanitizeValue("<iframe src='https://malicious.com'></iframe>")).toBe("");
    });

    test("Handle null input", () => {
      expect(sanitizeValue(null)).toBe("");
    });

    test("Handle undefined input", () => {
      expect(sanitizeValue(undefined)).toBe("");
    });

    test("Handle mixed case tags", () => {
      expect(sanitizeValue("<sCrIpT>alert(1)</ScRiPt>")).toBe("");
    });

    test("Preserve Unicode and Emojis", () => {
      const text = "José 🎵";
      expect(sanitizeValue(text)).toBe(text);
    });
  });

  describe("isSafeUrl()", () => {
    test("Valid URL https", () => {
      expect(isSafeUrl("https://example.com")).toBe(true);
    });

    test("Valid URL http", () => {
      expect(isSafeUrl("http://example.com")).toBe(true);
    });

    test("Block javascript URL", () => {
      expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    });

    test("Block data URL (potential XSS)", () => {
      expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    });
  });

  describe("sanitizeEntry()", () => {
    test("Allowed key unitName", () => {
      const entry = sanitizeEntry("unitName", "My Ward");
      expect(entry.key).toBe("unitName");
      expect(entry.value).toBe("My Ward");
    });

    test("Dynamic speaker key", () => {
      const entry = sanitizeEntry("speaker1", "John Doe");
      expect(entry.key).toBe("speaker");
      expect(entry.value).toBe("John Doe");
    });

    test("Unknown key blocked", () => {
      const entry = sanitizeEntry("evilKey", "test");
      expect(entry).toBe(null);
    });

    test("Trims keys and values", () => {
      const entry = sanitizeEntry("  unitName  ", "  My Ward  ");
      expect(entry.key).toBe("unitName");
      expect(entry.value).toBe("My Ward");
    });

    test("Agenda keys are allowed (private leadership panels)", () => {
      const agendaKeys = [
        "agendaGeneral",
        "agendaAnnouncements",
        "agendaAckVisitingLeaders",
        "agendaBusinessStake",
        "agendaBusinessReleases",
        "agendaBusinessCallings",
        "agendaBusinessPriesthood",
        "agendaBusinessNewMoveIns",
        "agendaBusinessNewConverts",
        "agendaBusinessGeneral"
      ];
      for (const key of agendaKeys) {
        const entry = sanitizeEntry(key, "ann-001");
        expect(entry).not.toBe(null);
        expect(entry.key).toBe(key);
      }
    });

    test("Lesson keys are allowed (public congregation panels)", () => {
      const lessonKeys = ["lessonEQRS", "lessonSundaySchool", "lessonYouth", "lessonPrimary"];
      for (const key of lessonKeys) {
        const entry = sanitizeEntry(key, "lesson-001");
        expect(entry).not.toBe(null);
        expect(entry.key).toBe(key);
      }
    });

    test("agendaLesson* keys (old naming) are blocked", () => {
      expect(sanitizeEntry("agendaLessonEQRS", "x")).toBe(null);
      expect(sanitizeEntry("agendaLessonSundaySchool", "x")).toBe(null);
      expect(sanitizeEntry("agendaLessonYouth", "x")).toBe(null);
      expect(sanitizeEntry("agendaLessonPrimary", "x")).toBe(null);
    });
  });
});
