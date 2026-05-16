import { describe, test, expect } from "vitest";
import {
  AGENDA_KEYS,
  LESSON_KEYS,
  LESSON_ICONS,
  isAgendaKey,
  isLessonKey,
  isBusinessKey
} from "../js/agenda/constants.js";

describe("agenda/constants.js", () => {
  describe("AGENDA_KEYS", () => {
    test("contains all expected private agenda keys", () => {
      const expected = [
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
      for (const key of expected) {
        expect(AGENDA_KEYS).toContain(key);
      }
    });

    test("does not contain lesson keys", () => {
      expect(AGENDA_KEYS).not.toContain("lessonEQRS");
      expect(AGENDA_KEYS).not.toContain("lessonSundaySchool");
      expect(AGENDA_KEYS).not.toContain("lessonYouth");
      expect(AGENDA_KEYS).not.toContain("lessonPrimary");
    });
  });

  describe("LESSON_KEYS", () => {
    test("contains all four public lesson keys", () => {
      expect(LESSON_KEYS).toEqual(
        expect.arrayContaining(["lessonEQRS", "lessonSundaySchool", "lessonYouth", "lessonPrimary"])
      );
      expect(LESSON_KEYS).toHaveLength(4);
    });

    test("does not overlap with AGENDA_KEYS", () => {
      for (const key of LESSON_KEYS) {
        expect(AGENDA_KEYS).not.toContain(key);
      }
    });
  });

  describe("isAgendaKey()", () => {
    test("returns true for every key in AGENDA_KEYS", () => {
      for (const key of AGENDA_KEYS) {
        expect(isAgendaKey(key)).toBe(true);
      }
    });

    test("returns false for all lesson keys", () => {
      for (const key of LESSON_KEYS) {
        expect(isAgendaKey(key)).toBe(false);
      }
    });

    test("returns false for regular program keys", () => {
      expect(isAgendaKey("unitName")).toBe(false);
      expect(isAgendaKey("speaker1")).toBe(false);
      expect(isAgendaKey("openingHymn")).toBe(false);
    });

    test("returns false for empty and unknown keys", () => {
      expect(isAgendaKey("")).toBe(false);
      expect(isAgendaKey("unknown")).toBe(false);
    });
  });

  describe("isLessonKey()", () => {
    test("returns true for every key in LESSON_KEYS", () => {
      for (const key of LESSON_KEYS) {
        expect(isLessonKey(key)).toBe(true);
      }
    });

    test("returns false for all private agenda keys", () => {
      for (const key of AGENDA_KEYS) {
        expect(isLessonKey(key)).toBe(false);
      }
    });

    test("returns false for regular program keys", () => {
      expect(isLessonKey("unitName")).toBe(false);
      expect(isLessonKey("speaker1")).toBe(false);
    });

    test("returns false for partial matches", () => {
      expect(isLessonKey("lesson")).toBe(false);
      expect(isLessonKey("lessonEQRSExtra")).toBe(false);
    });

    test("returns false for empty key", () => {
      expect(isLessonKey("")).toBe(false);
    });
  });

  describe("isBusinessKey()", () => {
    test("returns true for all agendaBusiness* keys", () => {
      const businessKeys = AGENDA_KEYS.filter((k) => k.startsWith("agendaBusiness"));
      expect(businessKeys.length).toBeGreaterThan(0);
      for (const key of businessKeys) {
        expect(isBusinessKey(key)).toBe(true);
      }
    });

    test("returns false for non-business agenda keys", () => {
      expect(isBusinessKey("agendaGeneral")).toBe(false);
      expect(isBusinessKey("agendaAnnouncements")).toBe(false);
      expect(isBusinessKey("agendaAckVisitingLeaders")).toBe(false);
    });

    test("returns false for all lesson keys", () => {
      for (const key of LESSON_KEYS) {
        expect(isBusinessKey(key)).toBe(false);
      }
    });

    test("returns false for regular program keys", () => {
      expect(isBusinessKey("unitName")).toBe(false);
      expect(isBusinessKey("speaker1")).toBe(false);
    });

    test("returns false for empty key", () => {
      expect(isBusinessKey("")).toBe(false);
    });
  });

  describe("LESSON_ICONS", () => {
    test("is an object with an entry for each lesson key", () => {
      for (const key of LESSON_KEYS) {
        expect(LESSON_ICONS).toHaveProperty(key);
        expect(typeof LESSON_ICONS[key]).toBe("string");
        expect(LESSON_ICONS[key].length).toBeGreaterThan(0);
      }
    });

    test("has exactly as many entries as LESSON_KEYS", () => {
      expect(Object.keys(LESSON_ICONS)).toHaveLength(LESSON_KEYS.length);
    });

    test("does not contain any agenda key", () => {
      for (const key of AGENDA_KEYS) {
        expect(LESSON_ICONS).not.toHaveProperty(key);
      }
    });
  });
});
