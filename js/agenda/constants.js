/**
 * Agenda configuration constants
 */

export const AGENDA_KEYS = [
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

/** Lesson keys are public (congregation-visible) accordion panels. */
export const LESSON_KEYS = ["lessonEQRS", "lessonSundaySchool", "lessonYouth", "lessonPrimary"];

/** Per-class emoji icons shown in lesson panel headers. */
export const LESSON_ICONS = {
  lessonEQRS: "👥",
  lessonSundaySchool: "📖",
  lessonYouth: "🌟",
  lessonPrimary: "🌈"
};

/**
 * Check if a key is a private agenda key
 */
export function isAgendaKey(key) {
  return AGENDA_KEYS.includes(key);
}

/**
 * Check if a key is a public lesson panel key
 */
export function isLessonKey(key) {
  return LESSON_KEYS.includes(key);
}

/**
 * Check if a key is a business sub‑section
 */
export function isBusinessKey(key) {
  return key.startsWith("agendaBusiness");
}
