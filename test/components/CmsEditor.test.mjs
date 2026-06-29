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

  test("serializeFieldValue serializes linkWithSpace with auto-added <IMG> token", () => {
    const value = serializeFieldValue("linkWithSpace", {
      text: "Library",
      url: "https://example.com",
      imageUrl: "https://img.com/icon.png"
    });

    expect(value).toBe("<IMG> Library|https://example.com|https://img.com/icon.png");
  });

  test("parseFieldValue decodes linkWithSpace stripping <IMG> token", () => {
    expect(
      parseFieldValue(
        "linkWithSpace",
        "<IMG> Library | https://example.com | https://img.com/icon.png"
      )
    ).toEqual({
      text: "Library",
      url: "https://example.com",
      imageUrl: "https://img.com/icon.png"
    });
  });

  test("serializeFieldValue serializes generalStatementWithLink with auto-added <LINK> token", () => {
    const value = serializeFieldValue("generalStatementWithLink", {
      text: "Read more",
      url: "https://example.com"
    });

    expect(value).toBe("Read more<LINK>|https://example.com");
  });

  test("parseFieldValue decodes generalStatementWithLink stripping <LINK> token", () => {
    expect(
      parseFieldValue(
        "generalStatementWithLink",
        "Read more<LINK> | https://example.com"
      )
    ).toEqual({
      text: "Read more",
      url: "https://example.com"
    });
  });

  test("serializeFieldValue serializes lesson keys as locale name+link pairs", () => {
    const value = serializeFieldValue("lessonEQRS", {
      text: "February 8 - No One Sits Alone",
      url: "https://example.com/en",
      text_es: "8 de febrero - Nadie se sienta solo",
      url_es: "https://example.com/es"
    });

    expect(value).toBe(
      "February 8 - No One Sits Alone|https://example.com/en|8 de febrero - Nadie se sienta solo|https://example.com/es"
    );
  });

  test("parseFieldValue parses lesson locale name+link pairs", () => {
    expect(
      parseFieldValue(
        "lessonPrimary",
        "I Am a Child of God|https://example.com/en|Soy un hijo de Dios|https://example.com/es"
      )
    ).toEqual({
      text: "I Am a Child of God",
      url: "https://example.com/en",
      text_es: "Soy un hijo de Dios",
      url_es: "https://example.com/es",
      text_fr: "",
      url_fr: "",
      text_swa: "",
      url_swa: ""
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
    expect(container.querySelectorAll(".cms-section-tint").length).toBeGreaterThan(0);
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
      hymnNumber: "120"
    });
    editor.addRepeatableItem("intermediateHymn");
    editor.setItemValue("intermediateHymn", 1, {
      hymnNumber: "130"
    });

    const rows = editor.getAllRows().filter((row) => /^intermediateHymn\d+$/.test(row.key));
    expect(rows).toEqual([
      { key: "intermediateHymn1", value: "120" },
      { key: "intermediateHymn2", value: "130" }
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

  test("auto-adds <LINK> token to generalStatementWithLink on serialization", () => {
    editor.initialize([
      { key: "generalStatementWithLink", value: "Welcome | https://example.com" }
    ]);

    // Textarea should show text WITHOUT token
    const textarea = container.querySelector(
      '.cms-field__input[data-key="generalStatementWithLink"][data-part="text"]'
    );
    expect(textarea.value).toBe("Welcome");

    // No insert button should exist
    const insertButton = container.querySelector("[data-action='insert-token']");
    expect(insertButton).toBeFalsy();

    // Serialized value should have token auto-added
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
  // --- Integration tests: rendering, constraints, undo, save flow ---
  
  test("presiding row move up button is disabled", () => {
    editor.initialize([
      { key: "unitName", value: "Ward" },
      { key: "presiding", value: "Bishop" },
      { key: "openingHymn", value: "62" }
    ]);

    // Find the select element with value "presiding"
    const selects = container.querySelectorAll('.cms-row__key-select');
    let presidingSelect = null;
    for (const sel of selects) {
      if (sel.value === 'presiding') {
        presidingSelect = sel;
        break;
      }
    }
    expect(presidingSelect).toBeTruthy();
    const presidingRow = presidingSelect.closest('.cms-row');
    const moveUpBtn = presidingRow.querySelector('.cms-row__action--move-up');
    expect(moveUpBtn).toBeTruthy();
    expect(moveUpBtn.disabled).toBe(true);
  });

  test("closingPrayer row move down button is disabled", () => {
    editor.initialize([
      { key: "unitName", value: "Ward" },
      { key: "presiding", value: "Bishop" },
      { key: "closingPrayer", value: "Brother Smith" }
    ]);

    const selects = container.querySelectorAll('.cms-row__key-select');
    let closingSelect = null;
    for (const sel of selects) {
      if (sel.value === 'closingPrayer') {
        closingSelect = sel;
        break;
      }
    }
    expect(closingSelect).toBeTruthy();
    const closingRow = closingSelect.closest('.cms-row');
    const moveDownBtn = closingRow.querySelector('.cms-row__action--move-down');
    expect(moveDownBtn).toBeTruthy();
    expect(moveDownBtn.disabled).toBe(true);
  });

  test("onSaveCallback receives rows and removedKeys", () => {
    const onSave = vi.fn();
    editor.options.onSaveCallback = onSave;
    
    editor.initialize([
      { key: "unitName", value: "Ward" },
      { key: "oilLamp", value: "" }
    ]);
    
    // Edit unitName
    editor.setItemValue("unitName", 0, { text: "New Ward" });
    
    // Delete oilLamp row directly from editor state (simulate removal)
    let oilLampIdx = editor.programRows.findIndex(r => r.key === "oilLamp");
    let section = 'program';
    if (oilLampIdx === -1) {
      oilLampIdx = editor.generalRows.findIndex(r => r.key === "oilLamp");
      section = 'general';
    }
    expect(oilLampIdx).toBeGreaterThan(-1);
    if (section === 'program') {
      editor.programRows.splice(oilLampIdx, 1);
    } else {
      editor.generalRows.splice(oilLampIdx, 1);
    }
    editor.isDirty = true;
    editor.refreshDirtyState();
    
    // Click save
    const saveBtn = container.querySelector('.cms-editor__save-btn');
    expect(saveBtn).toBeTruthy();
    saveBtn.click();
    
    expect(onSave).toHaveBeenCalledTimes(1);
    const [rows, removedKeys] = onSave.mock.calls[0];
    expect(rows).toBeInstanceOf(Array);
    expect(removedKeys).toContain("oilLamp");
    
    // Verify rows content
    const unitRow = rows.find(r => r.key === "unitName");
    expect(unitRow).toBeTruthy();
    expect(unitRow.value).toBe("New Ward");
    expect(rows.find(r => r.key === "oilLamp")).toBeFalsy();
    
    // Verify dirty state cleared
    expect(editor.getState().isDirty).toBe(false);
    expect(container.querySelector('.cms-editor__status').textContent).toContain("All changes saved");
  });

  test("undoLastCorrections reverts auto-corrections", () => {
    editor.initialize([
      { key: "unitName", value: "Ward" },
      { key: "openingHymn", value: "62" }
    ]);
    
    let rows = editor.getAllRows();
    expect(rows.some(r => r.key === "presiding")).toBe(true);
    expect(rows.some(r => r.key === "closingPrayer")).toBe(true);
    
    const undoBtn = document.querySelector('.cms-editor__toast-undo');
    expect(undoBtn).toBeTruthy();
    undoBtn.click();
    
    rows = editor.getAllRows();
    expect(rows.some(r => r.key === "presiding")).toBe(false);
    expect(rows.some(r => r.key === "closingPrayer")).toBe(false);
  });

  test("add row modal excludes non-repeatable keys that already exist", () => {
    // Initialize with some keys that are already present (conducting and openingHymn).
    // Auto-correction will also add presiding and closingPrayer.
    editor.initialize([
      { key: "unitName", value: "Ward" },
      { key: "conducting", value: "Brother Smith" },
      { key: "openingHymn", value: "62" }
    ]);
    
    const addBtn = container.querySelector('.cms-insert-btn[data-insert-section="program"]');
    expect(addBtn).toBeTruthy();
    addBtn.click();
    
    const modal = document.querySelector('.cms-modal');
    expect(modal).toBeTruthy();
    const select = modal.querySelector('#add-row-key-select');
    const options = Array.from(select.options).map(opt => opt.value);
    
    // Keys that are already present (conducting, openingHymn, and auto-added presiding) should be excluded
    expect(options).not.toContain("conducting");
    expect(options).not.toContain("openingHymn");
    // A key that is allowed and not present (e.g., musicDirector) should be available
    expect(options).toContain("musicDirector");
    
    modal.querySelector('.cms-modal__cancel-btn').click();
    expect(document.querySelector('.cms-modal')).toBeFalsy();
  });

  test("add row modal enforces max repeatable items", () => {
    editor.initialize([]);
    for (let i = 0; i < 10; i++) {
      editor.addRepeatableItem("speaker");
    }
    
    const addBtn = container.querySelector('.cms-insert-btn[data-insert-section="program"]');
    addBtn.click();
    
    const modal = document.querySelector('.cms-modal');
    const select = modal.querySelector('#add-row-key-select');
    const options = Array.from(select.options).map(opt => opt.value);
    
    expect(options).not.toContain("speaker");
    
    modal.querySelector('.cms-modal__cancel-btn').click();
  });

      test("general section insert modal includes all lesson keys", () => {
        editor.initialize([
          { key: "unitName", value: "Ward" },
          { key: "presiding", value: "Bishop" },
          { key: "closingPrayer", value: "Brother Smith" }
        ]);

        const addBtn = container.querySelector('.cms-insert-btn[data-insert-section="general"]');
        expect(addBtn).toBeTruthy();
        addBtn.click();

        const modal = document.querySelector('.cms-modal');
        expect(modal).toBeTruthy();
        const select = modal.querySelector('#add-row-key-select');
        const options = Array.from(select.options).map((opt) => opt.value);

        expect(options).toContain("lessonEQRS");
        expect(options).toContain("lessonSundaySchool");
        expect(options).toContain("lessonYouth");
        expect(options).toContain("lessonPrimary");

        modal.querySelector('.cms-modal__cancel-btn').click();
      });

  test("general section row key dropdown includes all lesson keys", () => {
    editor.initialize([
      { key: "unitName", value: "Ward" },
      { key: "presiding", value: "Bishop" },
      { key: "closingPrayer", value: "Brother Smith" },
      { key: "horizontalLine", value: "General" }
    ]);

    const generalSelect = container.querySelector(
      '.cms-row[data-section="general"] .cms-row__key-select'
    );
    expect(generalSelect).toBeTruthy();

    const options = Array.from(generalSelect.options).map((opt) => opt.value);
    expect(options).toContain("lessonEQRS");
    expect(options).toContain("lessonSundaySchool");
    expect(options).toContain("lessonYouth");
    expect(options).toContain("lessonPrimary");
  });

  test("general dropdown keeps EQRS and Sunday School available when already present", () => {
    editor.initialize([
      { key: "unitName", value: "Ward" },
      { key: "presiding", value: "Bishop" },
      { key: "closingPrayer", value: "Brother Smith" },
      { key: "lessonEQRS", value: "EQRS topic|https://example.com/eqrs" },
      {
        key: "lessonSundaySchool",
        value: "Sunday School topic|https://example.com/sunday"
      },
      { key: "horizontalLine", value: "General" }
    ]);

    const horizontalLineRowSelect = Array.from(
      container.querySelectorAll('.cms-row[data-section="general"] .cms-row__key-select')
    ).find((select) => select.value === "horizontalLine");

    expect(horizontalLineRowSelect).toBeTruthy();

    const options = Array.from(horizontalLineRowSelect.options).map((opt) => opt.value);
    expect(options).toContain("lessonEQRS");
    expect(options).toContain("lessonSundaySchool");
    expect(options).toContain("lessonYouth");
    expect(options).toContain("lessonPrimary");
  });

  test("lesson rows render locale name and link fields with EN required", () => {
    editor.initialize([
      { key: "unitName", value: "Ward" },
      {
        key: "lessonEQRS",
        value:
          "February 8 - No One Sits Alone|https://example.com/en|8 de febrero - Nadie se sienta solo|https://example.com/es"
      }
    ]);

    const lessonRow = container.querySelector(
      '.cms-row[data-section="general"] .cms-field__input[data-key="lessonEQRS"]'
    )?.closest(".cms-row");
    expect(lessonRow).toBeTruthy();

    const textInputs = lessonRow.querySelectorAll('.cms-field__input[data-key="lessonEQRS"][data-part="text"]');
    const urlInputs = lessonRow.querySelectorAll('.cms-field__input[data-key="lessonEQRS"][data-part="url"]');
    const localeTitles = Array.from(lessonRow.querySelectorAll('.cms-locale-group__title')).map((el) =>
      el.textContent.trim()
    );
    const lessonLabels = Array.from(lessonRow.querySelectorAll('.cms-field__label')).map((el) =>
      el.textContent.trim()
    );
    const twoUpGroups = lessonRow.querySelectorAll('.cms-locale-group__fields--two-up');

    expect(textInputs.length).toBe(4);
    expect(urlInputs.length).toBe(4);
    expect(localeTitles).toEqual(["EN", "ES", "FR", "SWA"]);
    expect(lessonLabels).toContain("Name for Lesson");
    expect(lessonLabels).toContain("Link to Lesson");
    expect(twoUpGroups.length).toBe(4);
    expect(textInputs[0].required).toBe(true);
    expect(urlInputs[0].required).toBe(true);
    expect(textInputs[1].required).toBe(false);
    expect(urlInputs[1].required).toBe(false);
  });

  test("lesson rows require EN name and link on validate", () => {
    editor.initialize([
      { key: "unitName", value: "Ward" },
      { key: "lessonYouth", value: "Youth Topic Only" }
    ]);

    const errors = editor.validate();
    expect(errors.some((error) => error.message.includes("lessonYouth requires EN name and link."))).toBe(true);
  });

  test("date field uses date picker and round-trips correctly", () => {
    editor.initialize([
      { key: "date", value: "May 20, 2026" }
    ]);
    
    const dateInput = container.querySelector('.cms-field__input[data-key="date"]');
    expect(dateInput).toBeTruthy();
    expect(dateInput.type).toBe("date");
    expect(dateInput.value).toBe("2026-05-20");
    
    dateInput.value = "2027-01-15";
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    const rows = editor.getAllRows();
    const dateRow = rows.find(r => r.key === "date");
    expect(dateRow.value).toBe("January 15, 2027");
  });

  test("hymn field renders dropdown with hymn options", () => {
    editor.initialize([
      { key: "openingHymn", value: "62" }
    ]);
    
    const hymnSelect = container.querySelector('.cms-field__input.cms-field__hymn-select');
    expect(hymnSelect).toBeTruthy();
    expect(hymnSelect.tagName.toLowerCase()).toBe("select");
    
    const options = hymnSelect.querySelectorAll('option');
    expect(options.length).toBeGreaterThan(300);
    
    expect(hymnSelect.value).toBe("62");
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

  test("shows oilLamp optional caption input when sheet has an oilLamp row", () => {
    mount();
    editor.initialize([{ key: "oilLamp", value: "" }]);

    const captionInput = container.querySelector('[data-key="oilLamp"][data-part="caption"]');
    expect(captionInput).toBeTruthy();
    expect(captionInput.getAttribute("type")).toBe("text");
  });

  test("does not show oilLamp optional caption input when sheet has no oilLamp row", () => {
    mount();
    editor.initialize([{ key: "unitName", value: "Millcreek 5th Ward" }]);

    const captionInput = container.querySelector('[data-key="oilLamp"][data-part="caption"]');
    expect(captionInput).toBeFalsy();
  });

  test("when oilLamp row exists, includes it in getAllRows", () => {
    mount();
    editor.initialize([{ key: "unitName", value: "Millcreek 5th Ward" }, { key: "oilLamp", value: "" }]);

    const rows = editor.getAllRows();
    const oilLampRow = rows.find((r) => r.key === "oilLamp");
    expect(oilLampRow).toBeTruthy();
    expect(oilLampRow.value).toBe("");
  });

  test("preserves oilLamp caption value in getAllRows", () => {
    mount();
    editor.initialize([
      { key: "unitName", value: "Millcreek 5th Ward" },
      { key: "oilLamp", value: "Keep your lamp trimmed" }
    ]);

    const rows = editor.getAllRows();
    const oilLampRow = rows.find((r) => r.key === "oilLamp");
    expect(oilLampRow).toBeTruthy();
    expect(oilLampRow.value).toBe("Keep your lamp trimmed");
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
    
     // If no delete button was found or clicked, remove from whichever section contains oilLamp
     let oilLampRowIdx = editor.generalRows.findIndex(r => r.key === "oilLamp");
     let section = 'general';
     if (oilLampRowIdx === -1) {
       oilLampRowIdx = editor.programRows.findIndex(r => r.key === "oilLamp");
       section = 'program';
     }
     if (oilLampRowIdx !== -1) {
       if (section === 'general') {
         editor.generalRows.splice(oilLampRowIdx, 1);
       } else {
         editor.programRows.splice(oilLampRowIdx, 1);
       }
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
