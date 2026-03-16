const HONORIFICS = {
  en: {
    Brother: "Brother",
    Sister: "Sister",
    Elder: "Elder",
    Bishop: "Bishop",
    President: "President"
  },
  es: {
    Brother: "Hermano",
    Sister: "Hermana",
    Elder: "Élder",
    Bishop: "Obispo",
    President: "Presidente"
  },
  fr: {
    Brother: "Frère",
    Sister: "Sœur",
    Elder: "Elder",
    Bishop: "Évêque",
    President: "Président"
  },
  swa: {
    Brother: "Ndugu",
    Sister: "Sista",
    Elder: "Elder",
    Bishop: "Askofu",
    President: "Raisi"
  }
};

const HONORIFIC_PATTERNS = {
  en: ["Brother", "Sister", "Elder", "Bishop", "President"],
  es: ["Hermano", "Hermana", "Élder", "Obispo", "Presidente"],
  fr: ["Frère", "Sœur", "Elder", "Évêque", "Président"],
  swa: ["Ndugu", "Sista", "Elder", "Askofu", "Raisi"]
};

export function getHonorificTranslation(targetLang = "en") {
  return HONORIFICS[targetLang] || HONORIFICS.en;
}

export function translateHonorifics(text, targetLang) {
  if (!text || !targetLang) return text;

  const sourceLang = "en";
  const sourceHonorifics = HONORIFICS[sourceLang];
  const targetHonorifics = HONORIFICS[targetLang] || HONORIFICS.en;

  if (!sourceHonorifics || !targetHonorifics) return text;

  let result = text;

  for (const [enTerm, translatedTerm] of Object.entries(sourceHonorifics)) {
    if (translatedTerm !== targetHonorifics[enTerm]) {
      const regex = new RegExp(`\\b${enTerm}\\b`, "gi");
      result = result.replace(regex, targetHonorifics[enTerm]);
    }
  }

  return result;
}

export function getAllHonorifics() {
  return HONORIFICS;
}

export { HONORIFICS, HONORIFIC_PATTERNS };
