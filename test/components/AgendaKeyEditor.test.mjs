import { beforeEach, describe, expect, test, vi } from "vitest";

import AgendaKeyEditor, {
  getAgendaFieldDefinition,
  sanitiseAgendaPart
} from "../../js/components/AgendaKeyEditor.mjs";

describe("AgendaKeyEditor helpers", () => {
  test("maps agenda keys to supported field definitions", () => {
    expect(getAgendaFieldDefinition("agendaGeneral").type).toBe("textarea");
    expect(getAgendaFieldDefinition("agendaAnnouncements").type).toBe("repeatable-single");
    expect(getAgendaFieldDefinition("agendaBusinessCallings").type).toBe("repeatable-pair");
  });

  test("strips pipe characters from agenda parts", () => {
    expect(sanitiseAgendaPart("Alice | Bishop")).toBe("Alice  Bishop");
  });
});

describe("AgendaKeyEditor component", () => {
  let container;
  let onChangeCallback;
  let editor;

  beforeEach(() => {
    document.body.innerHTML = "<div id='agenda-editor'></div>";
    container = document.getElementById("agenda-editor");
    onChangeCallback = vi.fn();
    editor = new AgendaKeyEditor("agenda-editor", { onChangeCallback });
  });

  test("renders textarea keys and serializes paragraphs", () => {
    editor.initialize({
      key: "agendaGeneral",
      values: [["First paragraph"], ["Second paragraph"]]
    });

    const textarea = container.querySelector("textarea");
    expect(textarea.value).toBe("First paragraph\n\nSecond paragraph");

    textarea.value = "Updated first\n\nUpdated second";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    expect(editor.getValues()).toEqual([["Updated first"], ["Updated second"]]);
    expect(onChangeCallback).toHaveBeenCalled();
  });

  test("renders repeatable pair keys and exports rows", () => {
    editor.initialize({
      key: "agendaBusinessCallings",
      values: [["Alice", "Primary President"]]
    });

    container.querySelector('[data-action="add-item"]').click();
    const inputs = container.querySelectorAll(".agenda-key-editor__input");
    inputs[2].value = "Bob";
    inputs[2].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[3].value = "Clerk";
    inputs[3].dispatchEvent(new Event("input", { bubbles: true }));

    expect(editor.getValues()).toEqual([
      ["Alice", "Primary President"],
      ["Bob", "Clerk"]
    ]);
  });

  test("removes repeatable rows", () => {
    editor.initialize({
      key: "agendaAnnouncements",
      values: [["Youth activity"], ["Temple trip"]]
    });

    container.querySelector('[data-action="remove-item"][data-row-index="0"]').click();

    expect(editor.getValues()).toEqual([["Temple trip"]]);
  });
});
