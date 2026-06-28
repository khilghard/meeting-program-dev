import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const CMS_TRANSLATION_KEYS = [
  "cmsAgenda.detailsLabel",
  "cmsAgenda.detailsPlaceholder",
  "cmsAgenda.nameLabel",
  "cmsAgenda.namePlaceholder",
  "cmsAgenda.callingLabel",
  "cmsAgenda.callingPlaceholder",
  "cmsAgenda.itemLabel",
  "cmsAgenda.itemPlaceholder",
  "cmsAgenda.addItem",
  "cmsAgenda.loading",
  "cmsAgenda.signInAgainPrompt",
  "cmsAgenda.configurePrompt",
  "cmsAgenda.editGoogleSettings",
  "cmsAgenda.configureGoogleSettings",
  "cmsAgenda.noPendingChanges",
  "cmsAgenda.pendingStatus",
  "cmsAgenda.invalidStatus",
  "cmsAgenda.invalidClientId",
  "cmsAgenda.settingsSaved",
  "cmsAgenda.signInCancelled",
  "cmsAgenda.signInFailed",
  "cmsAgenda.sessionRestored",
  "cmsAgenda.draftSaved",
  "cmsAgenda.savedStatus",
  "cmsAgenda.savingStatus",
  "cmsAgenda.publishSuccess",
  "cmsAgenda.failedStatus",
  "cmsAgenda.publishFailed",
  "cmsAgenda.publishAllComplete",
  "cmsAgenda.publishAllPartial",
  "cmsAgenda.makeActiveSuccess",
  "cmsAgenda.makeActiveFailed",
  "cmsAgenda.noAgendaProfile",
  "cmsAgenda.loadFailed",
  "cms.pageTitle",
  "cms.loadingProfile",
  "cms.localeLabel",
  "cms.sheetTabLabel",
  "cms.saveButton",
  "cms.discardDraftButton",
  "cms.signInPrompt",
  "cms.configurePrompt",
  "cms.signInButton",
  "cms.editGoogleSettings",
  "cms.configureGoogleSettings",
  "cms.googleSettingsTitle",
  "cms.googleClientIdLabel",
  "cms.googleClientIdPlaceholder",
  "cms.programSheetUrlLabel",
  "cms.saveSettingsButton",
  "cms.loadingEditor",
  "cms.invalidClientId",
  "cms.settingsSaved",
  "cmsAgenda.pageTitle",
  "cmsAgenda.loadingProfile",
  "cmsAgenda.googleSettingsTitle",
  "cmsAgenda.googleClientIdLabel",
  "cmsAgenda.googleClientIdPlaceholder",
  "cmsAgenda.agendaSheetUrlLabel",
  "cmsAgenda.saveSettingsButton",
  "cmsAgenda.sheetTabLabel",
  "cmsAgenda.keyLabel",
  "cmsAgenda.makeActiveButton",
  "cmsAgenda.saveDraftButton",
  "cmsAgenda.publishButton",
  "cmsAgenda.publishAllButton",
  "cmsAgenda.pendingChangesTitle",
  "agendaGeneral",
  "agendaAnnouncements",
  "agendaAckVisitingLeaders",
  "agendaBusinessStake",
  "agendaBusinessReleases",
  "agendaBusinessCallings",
  "agendaBusinessPriesthood",
  "agendaBusinessNewMoveIns",
  "agendaBusinessNewConverts",
  "agendaBusinessGeneral",
  "editAgenda"
];

describe("CMS i18n coverage", () => {
  let loadTranslations;
  let getSupportedLanguages;

  beforeEach(async () => {
    global.navigator = { language: "en-US" };
    global.document = { documentElement: { setAttribute: vi.fn() } };

    vi.doMock("../js/data/IndexedDBManager.js", () => ({
      getMetadata: vi.fn().mockResolvedValue(null),
      setMetadata: vi.fn().mockResolvedValue(true)
    }));

    vi.resetModules();
    const module = await import("../js/i18n/index.js");
    loadTranslations = module.loadTranslations;
    getSupportedLanguages = module.getSupportedLanguages;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  test("defines CMS translation keys for every supported language", () => {
    for (const language of getSupportedLanguages()) {
      const translations = loadTranslations(language);
      for (const key of CMS_TRANSLATION_KEYS) {
        expect(translations[key], `${language} missing ${key}`).toBeTypeOf("string");
        expect(translations[key], `${language} empty ${key}`).not.toHaveLength(0);
      }
    }
  });
});
