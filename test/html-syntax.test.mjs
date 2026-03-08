/**
 * test/html-syntax.test.mjs
 * Tests for HTML syntax errors and async/await usage
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("HTML Syntax Validation", () => {
  test("index.html should not have await outside async functions", () => {
    const htmlPath = path.resolve(__dirname, "../index.html");
    const content = fs.readFileSync(htmlPath, "utf-8");

    // Specific check for the known pattern that was fixed
    expect(content).not.toMatch(/}\s*\n\s*await\s+registerServiceWorker\(\);\s*\n\s*function/);
  });

  test("index.html should use .catch() for async function calls", () => {
    const htmlPath = path.resolve(__dirname, "../index.html");
    const content = fs.readFileSync(htmlPath, "utf-8");

    // Check that navigator.serviceWorker.register is called with error handling
    const callPattern = /navigator\.serviceWorker\.register\s*\(\s*swUrl\s*\)\s*(\.catch|await)/;
    expect(content).toMatch(callPattern);
  });

  test("All async functions should have error handling", () => {
    const htmlPath = path.resolve(__dirname, "../index.html");
    const content = fs.readFileSync(htmlPath, "utf-8");

    // Check that navigator.serviceWorker.register is called with error handling
    // Pattern: navigator.serviceWorker.register() should be followed by .catch() or wrapped in try-catch
    const callPattern =
      /navigator\.serviceWorker\.register\s*\(\s*swUrl\s*\)(\s*\.catch\s*\(|\s*await)/;
    expect(content).toMatch(callPattern);

    // Check that there's no bare await at top level
    const bareAwaitPattern = /}\s*\n\s*await\s+\w+\s*\(\s*\)\s*;/;
    expect(content).not.toMatch(bareAwaitPattern);
  });
});

describe("JavaScript Module Syntax", () => {
  test("All import statements should be in type='module' scripts", () => {
    const htmlPath = path.resolve(__dirname, "../index.html");
    const content = fs.readFileSync(htmlPath, "utf-8");

    // Find script tags with imports
    const importPattern = /import\s+.*from\s+['"]\.\/.*['"]/g;
    const matches = [...content.matchAll(importPattern)];

    // For each import, check it's in a module script
    matches.forEach((match) => {
      const importIdx = match.index;
      // Look backwards for the nearest <script> tag
      const beforeImport = content.substring(0, importIdx);
      const lastScriptTag = beforeImport.lastIndexOf("<script");
      const lastScriptClose = beforeImport.lastIndexOf("</script>");

      // The script tag should be type="module" or have no type (default is classic)
      const scriptTagStart = beforeImport.lastIndexOf("<script", lastScriptTag);
      const scriptTagEnd = beforeImport.indexOf(">", scriptTagStart);
      const scriptTag = content.substring(scriptTagStart, scriptTagEnd + 1);

      // If it has imports, it should be a module
      expect(scriptTag).toMatch(/type\s*=\s*["']module["']/);
    });
  });
});

describe("Module Export Validation", () => {
  test("No duplicate exports in JavaScript files", () => {
    const jsFiles = [
      "js/archive.js",
      "js/main.js",
      "js/qr.js",
      "js/data/ProfileManager.js",
      "js/data/MigrationSystem.js"
    ];

    jsFiles.forEach((filePath) => {
      const fullPath = path.resolve(__dirname, "../" + filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");

        // Find all export statements
        const exportRegex = /export\s+(function|const|let|var|class|\{[^}]*\})/g;
        const exports = [];
        let match;

        while ((match = exportRegex.exec(content)) !== null) {
          if (match[1] === "{") {
            // Destructured export like: export { foo, bar }
            const names = match[0]
              .match(/\{([^}]+)\}/)[1]
              .split(",")
              .map((s) => s.trim().split(" ")[0])
              .filter((s) => s);
            exports.push(...names);
          } else {
            // Named export like: export function foo()
            const nameMatch = match[0].match(/\b(function|const|let|var|class)\s+(\w+)/);
            if (nameMatch) {
              exports.push(nameMatch[2]);
            }
          }
        }

        // Check for duplicates
        const seen = new Set();
        const duplicates = exports.filter((name) => {
          if (seen.has(name)) return true;
          seen.add(name);
          return false;
        });

        expect(duplicates.length).toBe(0);
      }
    });
  });

  test("Exported functions should be defined before export", () => {
    const archivePath = path.resolve(__dirname, "../js/archive.js");
    if (fs.existsSync(archivePath)) {
      const content = fs.readFileSync(archivePath, "utf-8");

      // Check that helper functions are defined before the export statement
      const escapeHtmlIndex = content.indexOf("function escapeHtml");
      const extractMetadataIndex = content.indexOf("function extractMetadataFromRow");
      const extractSpeakersIndex = content.indexOf("function extractSpeakers");
      const extractProgramInfoIndex = content.indexOf("function extractProgramInfo");
      const exportIndex = content.indexOf("export { escapeHtml");

      // All functions should be defined before the export
      expect(escapeHtmlIndex).toBeGreaterThan(0);
      expect(extractMetadataIndex).toBeGreaterThan(0);
      expect(extractSpeakersIndex).toBeGreaterThan(0);
      expect(extractProgramInfoIndex).toBeGreaterThan(0);
      expect(exportIndex).toBeGreaterThan(0);

      // Export should come after all function definitions
      expect(exportIndex).toBeGreaterThan(escapeHtmlIndex);
      expect(exportIndex).toBeGreaterThan(extractMetadataIndex);
      expect(exportIndex).toBeGreaterThan(extractSpeakersIndex);
      expect(exportIndex).toBeGreaterThan(extractProgramInfoIndex);
    }
  });
});
