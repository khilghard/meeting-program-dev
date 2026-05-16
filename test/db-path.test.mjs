/**
 * db-path.test.mjs
 *
 * AD-02 regression test: ensures getDeploymentPath() resolves the same
 * deployment prefix for the main app path AND the CMS sub-paths.
 * If this ever fails, CMS pages would silently open an empty database.
 */
import { describe, test, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

async function getDeploymentPathFor(pathname) {
  vi.resetModules();
  vi.stubGlobal("location", { pathname });
  const { DB_NAME } = await import("../js/data/db.js");
  return DB_NAME;
}

describe("DB deployment path — CMS sub-path isolation (AD-02)", () => {
  test("main app path produces a deployment suffix", async () => {
    const name = await getDeploymentPathFor("/meeting-program/");
    expect(name).toContain("meeting-program");
  });

  test("/meeting-program/cms/ produces the same DB name as the main app", async () => {
    const main = await getDeploymentPathFor("/meeting-program/");
    const cms = await getDeploymentPathFor("/meeting-program/cms/");
    expect(cms).toBe(main);
  });

  test("/meeting-program/cms_agenda/ produces the same DB name as the main app", async () => {
    const main = await getDeploymentPathFor("/meeting-program/");
    const agenda = await getDeploymentPathFor("/meeting-program/cms_agenda/");
    expect(agenda).toBe(main);
  });

  test("/meeting-program-dev/cms/ produces the dev DB name, not the prod one", async () => {
    const dev = await getDeploymentPathFor("/meeting-program-dev/cms/");
    const prod = await getDeploymentPathFor("/meeting-program/");
    expect(dev).not.toBe(prod);
    expect(dev).toContain("meeting-program-dev");
  });

  test("/meeting-program without trailing slash resolves to same DB as /meeting-program/ (P-7)", async () => {
    const withSlash = await getDeploymentPathFor("/meeting-program/");
    const withoutSlash = await getDeploymentPathFor("/meeting-program");
    expect(withoutSlash).toBe(withSlash);
  });
});
