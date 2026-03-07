import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Theme Synchronization", () => {
  test("main.js should import from shared theme.js module", () => {
    const mainPath = path.resolve(__dirname, "../js/main.js");
    const content = fs.readFileSync(mainPath, "utf-8");

    // Should import theme functions from shared module
    expect(content).toMatch(/import.*initTheme.*from.*["']\.\/theme\.js["']/);

    // Should NOT have duplicate initTheme implementation
    const duplicatePattern =
      /function\s+initTheme\s*\(\)\s*\{[\s\S]*localStorage\.getItem\s*\(\s*["']theme["']\s*\)/;
    expect(content).not.toMatch(duplicatePattern);
  });

  test("archive.js should import from shared theme.js module", () => {
    const archivePath = path.resolve(__dirname, "../js/archive.js");
    const content = fs.readFileSync(archivePath, "utf-8");

    // Should import from theme.js (either static or dynamic)
    const hasStaticImport = content.includes('from "./theme.js"');
    const hasDynamicImport = content.includes('import("./theme.js")');

    expect(hasStaticImport || hasDynamicImport).toBe(true);
  });

  test("theme.js should be the single source of truth for theme logic", () => {
    const themePath = path.resolve(__dirname, "../js/theme.js");
    const content = fs.readFileSync(themePath, "utf-8");

    // Should export initTheme
    expect(content).toMatch(/export\s+(async\s+)?function\s+initTheme/);

    // Should export toggleTheme
    expect(content).toMatch(/export\s+(async\s+)?function\s+toggleTheme/);

    // Should export getTheme
    expect(content).toMatch(/export\s+(async\s+)?function\s+getTheme/);

    // Should export applyTheme
    expect(content).toMatch(/export\s+(async\s+)?function\s+applyTheme/);

    // Should use IndexedDB (v2.2.0+) with 'userPreference_theme' key
    expect(content).toMatch(/userPreference_theme/);
  });

  test("all pages should use consistent theme key for IndexedDB", () => {
    const files = ["js/theme.js", "js/main.js", "js/archive.js"];

    // All files should either:
    // 1. Import from theme.js (recommended), OR
    // 2. Use IndexedDB with 'userPreference_theme' key directly

    files.forEach((file) => {
      const filePath = path.resolve(__dirname, "../" + file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const importsFromTheme =
          content.includes('from "./theme.js"') || content.includes('import("./theme.js")');
        const usesThemeKey = /userPreference_theme/.test(content);

        // Should use theme.js OR the correct IndexedDB key
        expect(importsFromTheme || usesThemeKey).toBe(true);
      }
    });
  });

  test("theme toggle should persist across page reloads", () => {
    // This is an integration test concept - in real usage:
    // 1. User sets theme to dark on index.html
    // 2. setMetadata('userPreference_theme', 'dark') to IndexedDB
    // 3. User navigates to archive.html
    // 4. archive.html calls initTheme() which reads from IndexedDB
    // 5. Theme is restored to dark

    // The test verifies the mechanism:
    const themePath = path.resolve(__dirname, "../js/theme.js");
    const content = fs.readFileSync(themePath, "utf-8");

    // Should save to IndexedDB on toggle (via setMetadata)
    expect(content).toMatch(/toggleTheme[\s\S]*setThemeInStorage/);

    // Should read from IndexedDB on init (via getThemeFromStorage)
    expect(content).toMatch(/initTheme[\s\S]*getThemeFromStorage/);
  });
});
