import { describe, test, expect, beforeEach, vi } from "vitest";
import CmsEditor, {
  getFieldsForKeyType,
  normalizeCmsKeyType,
  parseFieldValue,
  sanitisePart,
  serializeFieldValue
} from "../../js/components/CmsEditor.mjs";
import { setLanguage } from "../../js/i18n/index.js";
import { ALLOWED_KEYS } from "../../js/sanitize.js";

describe("CmsEditor helpers", () => {
  test("getFieldsForKeyType resolves every supported CMS key type from ALLOWED_KEYS", () => {
    const keyTypes = new Set([...ALLOWED_KEYS].map(key => normalizeCmsKeyType(key)));
    keyTypes.add("speaker");
    keyTypes.add("intermediateHymn");

    for (const keyType of keyTypes) {
      expect(getFieldsForKeyType(keyType).length).toBeGreaterThan(0);
    }
  });

  test("getFieldsForKeyType resolves numbered repeatable CMS keys", () => {
    expect(getFieldsForKeyType("speaker7")).toEqual(getFieldsForKeyType("speaker"));
    expect(getFieldsForKeyType("intermediateHymn3")).toEqual(
      getFieldsForKeyType("intermediateHymn")
    );
    expect(getFieldsForKeyType("leader2")).toEqual(getFieldsForKeyType("leader"));
  });

  test("sanitisePart strips pipe characters", () => {
    expect(sanitisePart("Alice | Bob")).toBe("Alice  Bob");
  });

  test("serializeFieldValue adds <IMG> token for linkWithSpace", () => {
    const value = serializeFieldValue("linkWithSpace", {
      includeImageIcon: true,
      text: "Library",
      url: "https://example.com",
      imageUrl: "https://img.com/icon.png"
    });

    expect(value).toBe("<IMG> Library | https://example.com | https://img.com/icon.png");
  });

  test("parseFieldValue decodes <IMG> token from linkWithSpace", () => {
    expect(
      parseFieldValue("linkWithSpace", "<IMG> Library | https://example.com | https://img.com/icon.png")
    ).toEqual({
      includeImageIcon: true,
      text: "Library",
      url: "https://example.com",
      imageUrl: "https://img.com/icon.png"
    });
  });
});

describe("CmsEditor component", () => {
  let container;
  let editor;

  beforeEach(() => {
    document.body.innerHTML = "<div id='cms-editor-container'></div>";
    container = document.getElementById("cms-editor-container");
    editor = new CmsEditor("cms-editor-container");
  });

  test("renders desktop CMS sections", () => {
    editor.initialize([
      { key: "unitName", value: "Millcreek 5th Ward" },
      { key: "openingHymn", value: "62 | All Creatures of Our God and King" }
    ]);

    expect(container.querySelector(".cms-editor")).toBeTruthy();
    expect(container.querySelectorAll(".cms-editor__section").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("Unit Information");
    expect(container.textContent).toContain("Hymns");
  });

  test("exports existing numbered speaker rows", () => {
    editor.initialize([
      { key: "speaker1", value: "Alice | Faith in Christ" },
      { key: "speaker2", value: "Bob" }
    ]);

    expect(editor.getRows()).toEqual(
      expect.arrayContaining([
        { key: "speaker1", value: "Alice | Faith in Christ" },
        { key: "speaker2", value: "Bob" }
      ])
    );
  });

  test("allows adding repeatable speakers and exports concrete numbered keys", () => {
    editor.initialize([]);
    editor.setItemValue("speaker", 0, { name: "Alice", caption: "Faith in Christ" });
    editor.addRepeatableItem("speaker");
    editor.setItemValue("speaker", 1, { name: "Bob", caption: "" });

    const speakerRows = editor.getRows().filter(row => /^speaker\d+$/.test(row.key));
    expect(speakerRows).toEqual([
      { key: "speaker1", value: "Alice | Faith in Christ" },
      { key: "speaker2", value: "Bob" }
    ]);
  });

  test("appends repeatable speakers after existing numbered rows", () => {
    editor.initialize([
      { key: "speaker1", value: "Alice | Faith in Christ" },
      { key: "speaker2", value: "Bob | Hope" }
    ]);

    editor.addRepeatableItem("speaker");
    editor.setItemValue("speaker", 2, { name: "Carol", caption: "Charity" });

    const speakerRows = editor.getRows().filter(row => /^speaker\d+$/.test(row.key));
    expect(speakerRows).toEqual([
      { key: "speaker1", value: "Alice | Faith in Christ" },
      { key: "speaker2", value: "Bob | Hope" },
      { key: "speaker3", value: "Carol | Charity" }
    ]);
  });

  test("clears removed existing repeatable rows on export", () => {
    editor.initialize([
      { key: "speaker1", value: "Alice | Faith in Christ" },
      { key: "speaker2", value: "Bob" }
    ]);

    editor.removeRepeatableItem("speaker", 0);

    const speakerRows = editor.getRows().filter(row => /^speaker\d+$/.test(row.key));
    expect(speakerRows).toEqual(
      expect.arrayContaining([
        { key: "speaker1", value: "" },
        { key: "speaker2", value: "Bob" }
      ])
    );
  });

  test("exports intermediate hymns with numbered keys", () => {
    editor.initialize([]);
    editor.setItemValue("intermediateHymn", 0, {
      hymnNumber: "120",
      titleOverride: "Be Thou Humble"
    });
    editor.addRepeatableItem("intermediateHymn");
    editor.setItemValue("intermediateHymn", 1, {
      hymnNumber: "130",
      titleOverride: "Be Thou My Vision"
    });

    const rows = editor.getRows().filter(row => /^intermediateHymn\d+$/.test(row.key));
    expect(rows).toEqual([
      { key: "intermediateHymn1", value: "120 | Be Thou Humble" },
      { key: "intermediateHymn2", value: "130 | Be Thou My Vision" }
    ]);
  });

  test("allows adding repeatable leaders and exports concrete numbered keys", () => {
    editor.initialize([]);
    editor.setItemValue("leader", 0, {
      name: "Bishop Smith",
      phone: "801-555-1111",
      calling: "Bishop"
    });
    editor.addRepeatableItem("leader");
    editor.setItemValue("leader", 1, {
      name: "Brother Jones",
      phone: "",
      calling: "Executive Secretary"
    });

    const leaderRows = editor.getRows().filter(row => /^leader\d+$/.test(row.key));
    expect(leaderRows).toEqual([
      { key: "leader1", value: "Bishop Smith | 801-555-1111 | Bishop" },
      { key: "leader2", value: "Brother Jones |  | Executive Secretary" }
    ]);
  });

  test("inserts the <LINK> placeholder into general statements with link", () => {
    editor.initialize([{ key: "generalStatementWithLink", value: "Welcome | https://example.com" }]);

    const textarea = container.querySelector(
      '.cms-editor__textarea[data-key-type="generalStatementWithLink"][data-part-name="text"]'
    );
    textarea.focus();
    textarea.setSelectionRange(7, 7);

    const insertButton = container.querySelector("[data-action='insert-token']");
    insertButton.click();

    expect(textarea.value).toBe("Welcome<LINK>");
    expect(editor.getRows()).toEqual(
      expect.arrayContaining([
        { key: "generalStatementWithLink", value: "Welcome<LINK> | https://example.com" }
      ])
    );
  });

  test("tracks dirty state after edits", () => {
    editor.initialize([{ key: "unitName", value: "Millcreek 5th Ward" }]);
    editor.setItemValue("unitName", 0, { text: "Millcreek 6th Ward" });

    expect(editor.getState().isDirty).toBe(true);
    expect(container.querySelector(".cms-editor__status").textContent).toContain("Unsaved changes");
  });

  test("escapes textarea content when rendering stored sheet values", () => {
    editor.initialize([
      {
        key: "generalStatement",
        value: '</textarea><img src="x" alt="injected">'
      }
    ]);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("textarea").value).toBe('</textarea><img src="x" alt="injected">');
  });

  test("renders translated component chrome without missing translation warnings", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await setLanguage("es");

    editor.initialize([{ key: "unitName", value: "Barrio Centro" }]);

    expect(container.textContent).toContain("Informaci\u00f3n de la unidad");
    expect(container.textContent).toContain("Todos los cambios guardados");
    expect(container.textContent).toContain("Nombre del barrio o rama");

    const missingTranslationWarnings = warnSpy.mock.calls.filter(
      call => call[0] === "Missing translation for key:"
    );
    expect(missingTranslationWarnings).toEqual([]);

    warnSpy.mockRestore();
    await setLanguage("en");
  });
});