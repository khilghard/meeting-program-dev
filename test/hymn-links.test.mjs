import { afterEach, beforeEach, describe, test, expect } from "vitest";
import * as Main from "../js/main.js";
import * as I18n from "../js/i18n/index.js";
import { getHymnData, getChildrenSongData } from "../js/data/hymnsLookup.js";

// Setup
function setupDOM() {
  document.body.innerHTML = "<div id=\"main-program\"></div>";
}

beforeEach(async () => {
  setupDOM();
  // Initialize i18n to load translations
  await I18n.initI18n();
});

afterEach(() => {
  document.body.innerHTML = "";
});

const { appendRowHymn } = Main;

describe("Hymn Links Integration Test", () => {
  test("verifies hymn lookup data exists for common hymns", () => {
    // Verify hymn #1 exists
    const hymn1 = getHymnData("1");
    expect(hymn1).not.toBeNull();
    expect(hymn1.title).toBe("The Morning Breaks");
    expect(hymn1.url).toContain("/media/music/songs/the-morning-breaks");

    // Verify hymn #120 exists
    const hymn120 = getHymnData("120");
    expect(hymn120).not.toBeNull();
    expect(hymn120.title).not.toBe("");
    expect(hymn120.url).toContain("/media/music/songs/");

    // Verify children's song CS 2 exists (note: CS 1 does not exist)
    const children2 = getChildrenSongData("CS 2");
    expect(children2).not.toBeNull();
    expect(children2.title).toBe("I Am a Child of God");
    expect(children2.url).toContain("/media/music/songs/");
  });

  test("renders hymn with valid number as clickable link", () => {
    // Use actual valid hymn number from the lookup
    appendRowHymn("Opening Hymn", "#1 The Morning Breaks", "openingHymn");

    const div = document.querySelector("#openingHymn");
    const link = div.querySelector(".hymn-link");

    // Verify link was created
    expect(link).not.toBeNull();
    expect(link.href).toContain("/media/music/songs/the-morning-breaks");
    expect(link.textContent).toBe("The Morning Breaks");
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
  });

  test("renders children's song as clickable link", () => {
    // Use actual valid children's song from the lookup (CS 2, not CS 1)
    appendRowHymn("Opening Hymn", "CS 2 I Am a Child of God", "openingHymn");

    const div = document.querySelector("#openingHymn");
    const link = div.querySelector(".hymn-link");

    // Verify link was created for children's song
    expect(link).not.toBeNull();
    expect(link.href).toContain("/media/music/songs/");
    expect(link.textContent).toBe("I Am a Child of God");
  });

  test("falls back to text for invalid hymn number", () => {
    // Use invalid hymn number (should not exist in lookup)
    appendRowHymn("Hymn", "#9999 No Such Hymn", "hymn");

    const div = document.querySelector("#hymn");
    const link = div.querySelector(".hymn-link");
    const titleDiv = div.querySelector(".hymn-title");

    // Verify no link was created, just text
    expect(link).toBeNull();
    expect(titleDiv.textContent).toBe("No Such Hymn");
  });
});
