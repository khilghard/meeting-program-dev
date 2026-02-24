import { describe, test, expect, beforeEach } from "vitest";

describe("honorifics.js", () => {
  let translateHonorifics, getHonorificTranslation, getAllHonorifics, HONORIFICS;

  beforeEach(async () => {
    const module = await import("../js/i18n/honorifics.js");
    translateHonorifics = module.translateHonorifics;
    getHonorificTranslation = module.getHonorificTranslation;
    getAllHonorifics = module.getAllHonorifics;
    HONORIFICS = module.HONORIFICS;
  });

  describe("translateHonorifics", () => {
    test("should translate Brother to Spanish", () => {
      const result = translateHonorifics("Brother John Smith", "es");
      expect(result).toBe("Hermano John Smith");
    });

    test("should translate Sister to Spanish", () => {
      const result = translateHonorifics("Sister Mary Jones", "es");
      expect(result).toBe("Hermana Mary Jones");
    });

    test("should translate Elder to Spanish", () => {
      const result = translateHonorifics("Elder Johnson", "es");
      expect(result).toBe("Élder Johnson");
    });

    test("should translate Bishop to Spanish", () => {
      const result = translateHonorifics("Bishop Brown", "es");
      expect(result).toBe("Obispo Brown");
    });

    test("should translate President to Spanish", () => {
      const result = translateHonorifics("President Davis", "es");
      expect(result).toBe("Presidente Davis");
    });

    test("should translate to French", () => {
      expect(translateHonorifics("Brother John", "fr")).toBe("Frère John");
      expect(translateHonorifics("Sister Mary", "fr")).toBe("Sœur Mary");
      expect(translateHonorifics("Bishop Brown", "fr")).toBe("Évêque Brown");
      expect(translateHonorifics("President Davis", "fr")).toBe("Président Davis");
    });

    test("should translate to Swahili", () => {
      expect(translateHonorifics("Brother John", "swa")).toBe("Ndugu John");
      expect(translateHonorifics("Sister Mary", "swa")).toBe("Sista Mary");
      expect(translateHonorifics("Bishop Brown", "swa")).toBe("Askofu Brown");
      expect(translateHonorifics("President Davis", "swa")).toBe("Raisi Davis");
    });

    test("should handle lowercase honorifics", () => {
      const result = translateHonorifics("brother john smith", "es");
      expect(result).toBe("Hermano john smith");
    });

    test("should handle mixed case honorifics", () => {
      const result = translateHonorifics("bRoThEr John Smith", "es");
      expect(result).toBe("Hermano John Smith");
    });

    test("should not translate when target is English", () => {
      const result = translateHonorifics("Brother John Smith", "en");
      expect(result).toBe("Brother John Smith");
    });

    test("should return original text if empty", () => {
      expect(translateHonorifics("", "es")).toBe("");
      expect(translateHonorifics(null, "es")).toBe(null);
      expect(translateHonorifics("John Smith", "es")).toBe("John Smith");
    });

    test("should return original text if targetLang is empty", () => {
      const result = translateHonorifics("Brother John Smith", "");
      expect(result).toBe("Brother John Smith");
    });

    test("should handle multiple honorifics in text", () => {
      const result = translateHonorifics("Brother John and Sister Mary", "es");
      expect(result).toBe("Hermano John and Hermana Mary");
    });

    test("should handle honorific at end of text", () => {
      const result = translateHonorifics("Led by Brother Smith", "es");
      expect(result).toBe("Led by Hermano Smith");
    });

    test("should not translate words that contain honorific as substring", () => {
      const result = translateHonorifics("The brothers and sisters", "es");
      expect(result).toBe("The brothers and sisters");
    });

    test("should handle President at beginning of text", () => {
      const result = translateHonorifics("President Smith conducted", "es");
      expect(result).toBe("Presidente Smith conducted");
    });
  });

  describe("getHonorificTranslation", () => {
    test("should return translation object for Spanish", () => {
      const result = getHonorificTranslation("es");
      expect(result.Brother).toBe("Hermano");
      expect(result.Sister).toBe("Hermana");
      expect(result.Elder).toBe("Élder");
      expect(result.Bishop).toBe("Obispo");
      expect(result.President).toBe("Presidente");
    });

    test("should return English object for unknown language", () => {
      const result = getHonorificTranslation("xx");
      expect(result.Brother).toBe("Brother");
    });

    test("should return English object when no lang specified", () => {
      const result = getHonorificTranslation();
      expect(result.Brother).toBe("Brother");
    });
  });

  describe("getAllHonorifics", () => {
    test("should return all honorific translations", () => {
      const result = getAllHonorifics();

      expect(result).toHaveProperty("en");
      expect(result).toHaveProperty("es");
      expect(result).toHaveProperty("fr");
      expect(result).toHaveProperty("swa");

      expect(result.en.Brother).toBe("Brother");
      expect(result.es.Brother).toBe("Hermano");
      expect(result.fr.Brother).toBe("Frère");
      expect(result.swa.Brother).toBe("Ndugu");
    });
  });

  describe("HONORIFICS constants", () => {
    test("should have correct Spanish translations", () => {
      expect(HONORIFICS.es.Brother).toBe("Hermano");
      expect(HONORIFICS.es.Sister).toBe("Hermana");
      expect(HONORIFICS.es.Elder).toBe("Élder");
      expect(HONORIFICS.es.Bishop).toBe("Obispo");
      expect(HONORIFICS.es.President).toBe("Presidente");
    });

    test("should have correct French translations", () => {
      expect(HONORIFICS.fr.Brother).toBe("Frère");
      expect(HONORIFICS.fr.Sister).toBe("Sœur");
      expect(HONORIFICS.fr.Elder).toBe("Elder");
      expect(HONORIFICS.fr.Bishop).toBe("Évêque");
      expect(HONORIFICS.fr.President).toBe("Président");
    });

    test("should have correct Swahili translations", () => {
      expect(HONORIFICS.swa.Brother).toBe("Ndugu");
      expect(HONORIFICS.swa.Sister).toBe("Sista");
      expect(HONORIFICS.swa.Elder).toBe("Elder");
      expect(HONORIFICS.swa.Bishop).toBe("Askofu");
      expect(HONORIFICS.swa.President).toBe("Raisi");
    });
  });
});
