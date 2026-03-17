import { describe, test, expect } from "vitest";
import { parseCSV } from "../js/workers/data.worker.js";

describe("data.worker parseCSV", () => {
  test("normalizes numbered speaker keys for rendering", () => {
    const csv = `key,value
speaker1,Alice Smith
speaker2,Bob Jones
speaker3,Carol Davis`;

    const result = parseCSV(csv);

    expect(result).toEqual([
      { key: "speaker", value: "Alice Smith" },
      { key: "speaker", value: "Bob Jones" },
      { key: "speaker", value: "Carol Davis" }
    ]);
  });

  test("normalizes numbered intermediate hymn keys", () => {
    const csv = `key,value
intermediateHymn1,120 Be Thou Humble
intermediateHymn2,130 Be Thou My Vision`;

    const result = parseCSV(csv);

    expect(result).toEqual([
      { key: "intermediateHymn", value: "120 Be Thou Humble" },
      { key: "intermediateHymn", value: "130 Be Thou My Vision" }
    ]);
  });
});
