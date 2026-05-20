import { describe, test, expect, beforeEach, vi } from "vitest";
import CmsEditor, {
  getFieldsForKeyType,
  normalizeCmsKeyType,
  parseFieldValue,
  sanitisePart,
  serializeFieldValue
} from "../../js/components/CmsEditor.mjs";
import { setLanguage, loadTranslations } from "../../js/i18n/index.js";
import { ALLOWED_KEYS } from "../../js/sanitize.js";

describe("CmsEditor helpers", () => {
  test("getFieldsForKeyType resolves every supported CMS key type from ALLOWED_KEYS", () => {
    const keyTypes = new Set([...ALLOWED_KEYS].map((key) => normalizeCmsKeyType(key)));
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

  test("serializeFieldValue serializes linkWithSpace", () => {
    const value = serializeFieldValue("linkWithSpace", {
      text: "Library",
      url: "https://example.com",
      imageUrl: "https://img.com/icon.png"
    });

    expect(value).toBe("Library|https://example.com|https://img.com/icon.png");
  });

  test("parseFieldValue decodes linkWithSpace", () => {
    expect(
      parseFieldValue(
        "linkWithSpace",
        "Library | https://example.com | https://img.com/icon.png"
      )
    ).toEqual({
      text: "Library",
      url: "https://example.com",
      imageUrl: "https://img.com/icon.png"
    });
  });
});

describe("CmsEditor component", () => {
  let container;
  let editor;

  beforeEach(async () => {
    document.body.innerHTML = "<div id='cms-editor-container'></div>";
    container = document.getElementById("cms-editor-container");
    await loadTranslations("en");
    editor = new CmsEditor("cms-editor-container");
  });

  test("renders desktop CMS sections", () => {
    editor.initialize([
      { key: "unitName", value: "Millcreek 5th Ward" },
      { key: "openingHymn", value: "62 | All Creatures of Our God and King" }
    ]);

    expect(container.querySelector(".cms-editor")).toBeTruthy();
    expect(container.querySelectorAll(".cms-section").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("Unit Information");
    expect(container.textContent).toContain("Sacrament Meeting Program");
  });

  test("exports existing numbered speaker rows", () => {
    editor.initialize([
      { key: "speaker1", value: "Alice | Faith in Christ" },
      { key: "speaker2", value: "Bob" }
    ]);

    expect(editor.getAllRows()).toEqual(
      expect.arrayContaining([
        { key: "speaker1", value: "Alice|Faith in Christ" },
        { key: "speaker2", value: "Bob" }
      ])
    );
  });

  test("allows adding repeatable speakers and exports concrete numbered keys", () => {
    editor.initialize([]);
    editor.setItemValue("speaker", 0, { name: "Alice", caption: "Faith in Christ" });
    editor.addRepeatableItem("speaker");
    editor.setItemValue("speaker", 1, { name: "Bob", caption: "" });

    const speakerRows = editor.getAllRows().filter((row) => /^speaker\d+$/.test(row.key));
    expect(speakerRows).toEqual([
      { key: "speaker1", value: "Alice|Faith in Christ" },
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

    const speakerRows = editor.getAllRows().filter((row) => /^speaker\d+$/.test(row.key));
    expect(speakerRows).toEqual([
      { key: "speaker1", value: "Alice|Faith in Christ" },
      { key: "speaker2", value: "Bob|Hope" },
      { key: "speaker3", value: "Carol|Charity" }
    ]);
  });

  test("clears removed existing repeatable rows on export", () => {
    editor.initialize([
      { key: "speaker1", value: "Alice | Faith in Christ" },
      { key: "speaker2", value: "Bob" }
    ]);

    editor.removeRepeatableItem("speaker", 0);

    const speakerRows = editor.getAllRows().filter((row) => /^speaker\d+$/.test(row.key));
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

    const rows = editor.getAllRows().filter((row) => /^intermediateHymn\d+$/.test(row.key));
    expect(rows).toEqual([
      { key: "intermediateHymn1", value: "120|Be Thou Humble" },
      { key: "intermediateHymn2", value: "130|Be Thou My Vision" }
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

    const leaderRows = editor.getAllRows().filter((row) => /^leader\d+$/.test(row.key));
    expect(leaderRows).toEqual([
      { key: "leader1", value: "Bishop Smith|Bishop|801-555-1111" },
      { key: "leader2", value: "Brother Jones|Executive Secretary" }
    ]);
  });

  test("inserts the <LINK> placeholder into general statements with link", () => {
    editor.initialize([
      { key: "generalStatementWithLink", value: "Welcome | https://example.com" }
    ]);

    const textarea = container.querySelector(
      '.cms-field__input[data-key="generalStatementWithLink"][data-part="text"]'
    );
    textarea.focus();
    textarea.setSelectionRange(7, 7);

    const insertButton = container.querySelector("[data-action='insert-token']");
    insertButton.click();

    expect(textarea.value).toBe("Welcome<LINK>");
    expect(editor.getAllRows()).toEqual(
      expect.arrayContaining([
        { key: "generalStatementWithLink", value: "Welcome<LINK>|https://example.com" }
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
    expect(container.querySelector("textarea").value).toBe(
      '</textarea><img src="x" alt="injected">'
    );
  });

  test("renders translated component chrome without missing translation warnings", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await setLanguage("es");

    editor.initialize([{ key: "unitName", value: "Barrio Centro" }]);

    expect(container.textContent).toContain("Informaci\u00f3n de la unidad");
    expect(container.textContent).toContain("Todos los cambios guardados");
     expect(container.textContent).toContain("Nombre de la unidad");

    const missingTranslationWarnings = warnSpy.mock.calls.filter(
      (call) => call[0] === "Missing translation for key:"
    );
    expect(missingTranslationWarnings).toEqual([]);

    warnSpy.mockRestore();
    await setLanguage("en");
  });
});

describe("CmsEditor — oilLamp", () => {
  let container;
  let editor;

  const mount = () => {
    document.body.innerHTML = "<div id='cms-editor-container'></div>";
    container = document.getElementById("cms-editor-container");
    editor = new CmsEditor("cms-editor-container");
  };

  test("shows checked checkbox when sheet has an oilLamp row", () => {
    mount();
    editor.initialize([{ key: "oilLamp", value: "" }]);

    const checkbox = container.querySelector('[data-key="oilLamp"][type="checkbox"]');
    expect(checkbox).toBeTruthy();
    expect(checkbox.checked).toBe(true);
  });

  test("does not show oilLamp checkbox when sheet has no oilLamp row", () => {
    mount();
    editor.initialize([{ key: "unitName", value: "Millcreek 5th Ward" }]);

    const checkbox = container.querySelector('[data-key="oilLamp"][type="checkbox"]');
    expect(checkbox).toBeFalsy();
  });

  test("when oilLamp row exists, includes it in getAllRows", () => {
    mount();
    editor.initialize([{ key: "unitName", value: "Millcreek 5th Ward" }, { key: "oilLamp", value: "" }]);

    const rows = editor.getAllRows();
    const oilLampRow = rows.find((r) => r.key === "oilLamp");
    expect(oilLampRow).toBeTruthy();
    expect(oilLampRow.value).toBe("");
  });

  test("when oilLamp row does not exist, does not include it in getAllRows", () => {
    mount();
    editor.initialize([{ key: "unitName", value: "Millcreek 5th Ward" }]);

    const rows = editor.getAllRows();
    const oilLampRow = rows.find((r) => r.key === "oilLamp");
    expect(oilLampRow).toBeFalsy();
  });

  test("when oilLamp row is removed, adds oilLamp to removedKeys", () => {
    mount();
    editor.initialize([{ key: "unitName", value: "Millcreek 5th Ward" }, { key: "oilLamp", value: "" }]);

    // Verify oilLamp row exists
    const initialRows = editor.getAllRows();
    const initialOilLamp = initialRows.find((r) => r.key === "oilLamp");
    expect(initialOilLamp).toBeTruthy();

    // Remove the oilLamp row by clicking its delete button
    const generalRows = container.querySelectorAll('.cms-row[data-section="general"]');
    for (const row of generalRows) {
      const label = row.querySelector('.cms-row__key-label');
      if (label && label.textContent.trim() === "Oil Lamp") {
        const removeBtn = row.querySelector('.cms-row__action--delete');
        if (removeBtn) {
          removeBtn.click();
          break;
        }
      }
    }
    
    // If no delete button was found or clicked, directly remove from generalRows
    const oilLampRowIdx = editor.generalRows.findIndex(r => r.key === "oilLamp");
    if (oilLampRowIdx !== -1) {
      editor.generalRows.splice(oilLampRowIdx, 1);
      editor.isDirty = true;
      editor.refreshDirtyState();
      editor.render();
    }

    // Check removedKeys
    const removedKeys = editor.getRemovedKeys();
    expect(removedKeys).toContain("oilLamp");
  });

  test("when oilLamp row exists, does not add to removedKeys", () => {
    mount();
    editor.initialize([{ key: "oilLamp", value: "" }]);

    const removedKeys = editor.getRemovedKeys();
    expect(removedKeys).not.toContain("oilLamp");
  });
});
