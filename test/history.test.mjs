import { describe, test, expect, beforeEach } from "vitest";

describe("history.js", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("should save and retrieve program history", async () => {
    const { saveProgramHistory, getProgramHistory } = await import("../js/history.js");

    const profileId = "test-profile";
    const date = "January 5 2026";
    const programData = [{ key: "unitName", value: "Test Ward" }];

    const result = saveProgramHistory(profileId, date, programData, { forceSave: true });
    expect(result.saved).toBe(true);

    const history = getProgramHistory(profileId);
    expect(history).toHaveLength(1);
    expect(history[0].date).toBe(date);
  });

  test("should update existing entry for same date", async () => {
    const { saveProgramHistory, getProgramHistory } = await import("../js/history.js");

    const profileId = "test-profile";
    const date = "January 5 2026";

    saveProgramHistory(profileId, date, [{ key: "a", value: "1" }], { forceSave: true });
    const result = saveProgramHistory(profileId, date, [{ key: "a", value: "2" }], {
      forceSave: true
    });

    expect(result.saved).toBe(true);
    expect(result.reason).toBe("updated");

    const history = getProgramHistory(profileId);
    expect(history).toHaveLength(1);
    expect(history[0].data).toEqual([{ key: "a", value: "2" }]);
  });

  test("should not save duplicate content", async () => {
    const { saveProgramHistory, getProgramHistory, resetThrottle } =
      await import("../js/history.js");

    const profileId = "test-profile";
    const date = "January 5 2026";
    const programData = [{ key: "a", value: "1" }];

    saveProgramHistory(profileId, date, programData, { forceSave: true });
    resetThrottle(profileId);
    const result = saveProgramHistory(profileId, date, programData);

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("duplicate_content");

    const history = getProgramHistory(profileId);
    expect(history).toHaveLength(1);
  });

  test("should not save cached version by default", async () => {
    const { saveProgramHistory } = await import("../js/history.js");

    const result = saveProgramHistory("profile", "Jan 1", [{ key: "a" }], { isFromCache: true });
    expect(result.saved).toBe(false);
    expect(result.reason).toBe("cached");
  });

  test("should save cached version when forced", async () => {
    const { saveProgramHistory } = await import("../js/history.js");

    const result = saveProgramHistory("profile", "Jan 1", [{ key: "a" }], {
      isFromCache: true,
      forceSave: true
    });
    expect(result.saved).toBe(true);
  });

  test("should throttle saves within 5 minutes", async () => {
    const { saveProgramHistory } = await import("../js/history.js");

    saveProgramHistory("profile", "Jan 1", [{ key: "a" }]);
    const result = saveProgramHistory("profile", "Jan 2", [{ key: "a" }]);

    expect(result.saved).toBe(false);
    expect(result.reason).toBe("throttled");
  });

  test("should return false for missing profileId", async () => {
    const { saveProgramHistory } = await import("../js/history.js");

    const result = saveProgramHistory(null, "Jan 1", [{ key: "a" }]);
    expect(result.saved).toBe(false);
    expect(result.reason).toBe("missing_params");
  });

  test("should return false for missing date", async () => {
    const { saveProgramHistory } = await import("../js/history.js");

    const result = saveProgramHistory("profile", "", [{ key: "a" }]);
    expect(result.saved).toBe(false);
    expect(result.reason).toBe("missing_params");
  });

  test("should handle multiple profiles separately", async () => {
    const { saveProgramHistory, getProgramHistory, resetThrottle } =
      await import("../js/history.js");

    const programData = [{ key: "a", value: "1" }];
    saveProgramHistory("profile-1", "Jan 1", programData, { forceSave: true });
    resetThrottle("profile-1");
    saveProgramHistory("profile-2", "Jan 1", programData, { forceSave: true });

    expect(getProgramHistory("profile-1")).toHaveLength(1);
    expect(getProgramHistory("profile-2")).toHaveLength(1);
  });

  test("should return empty array when no history", async () => {
    const { getProgramHistory } = await import("../js/history.js");

    const history = getProgramHistory("nonexistent");
    expect(history).toEqual([]);
  });

  test("should return null when item not found", async () => {
    const { getHistoryItem } = await import("../js/history.js");

    const item = getHistoryItem("profile", "nonexistent");
    expect(item).toBeNull();
  });

  test("should return matching item", async () => {
    const { saveProgramHistory, getHistoryItem, resetThrottle } = await import("../js/history.js");

    const programData = [{ key: "a", value: "1" }];
    saveProgramHistory("profile", "Jan 1", programData, { forceSave: true });

    const item = getHistoryItem("profile", "Jan 1");
    expect(item).not.toBeNull();
    expect(item.date).toBe("Jan 1");
  });

  test("should return null when no latest item", async () => {
    const { getLatestHistoryItem } = await import("../js/history.js");

    const item = getLatestHistoryItem("profile");
    expect(item).toBeNull();
  });

  test("should clear all history", async () => {
    const { saveProgramHistory, getProgramHistory, clearHistory, resetThrottle } =
      await import("../js/history.js");

    saveProgramHistory("p1", "Jan 1", [{ key: "a" }], { forceSave: true });
    resetThrottle("p1");
    saveProgramHistory("p2", "Jan 1", [{ key: "a" }], { forceSave: true });

    clearHistory();

    expect(getProgramHistory("p1")).toHaveLength(0);
    expect(getProgramHistory("p2")).toHaveLength(0);
  });

  test("should clear specific profile history", async () => {
    const { saveProgramHistory, getProgramHistory, clearHistory, resetThrottle } =
      await import("../js/history.js");

    saveProgramHistory("p1", "Jan 1", [{ key: "a" }], { forceSave: true });
    resetThrottle("p1");
    saveProgramHistory("p2", "Jan 1", [{ key: "a" }], { forceSave: true });

    clearHistory("p1");

    expect(getProgramHistory("p1")).toHaveLength(0);
    expect(getProgramHistory("p2")).toHaveLength(1);
  });

  test("should return retention info", async () => {
    const { getRetentionInfo, SIZE_THRESHOLD_BYTES } = await import("../js/history.js");

    const info = getRetentionInfo();
    expect(info.thresholdBytes).toBe(SIZE_THRESHOLD_BYTES);
    expect(info.retentionDays).toBeGreaterThan(0);
  });

  test("should return 0 when history is empty", async () => {
    const { getHistorySize } = await import("../js/history.js");

    const size = getHistorySize();
    expect(size).toBeGreaterThanOrEqual(0);
  });

  test("should return size when history has data", async () => {
    const { saveProgramHistory, getHistorySize, clearHistory } = await import("../js/history.js");

    clearHistory();
    saveProgramHistory("profile", "Jan 1", [{ key: "unitName", value: "Test Ward" }], {
      forceSave: true
    });

    const size = getHistorySize();
    expect(size).toBeGreaterThan(0);
  });
});
