#!/usr/bin/env node

/**
 * Version Update Script
 *
 * Usage: node update-version.js <new-version>
 * Example: node update-version.js 2.2.3
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current file's directory (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version from command line
const newVersion = process.argv[2];

if (!newVersion) {
  console.error("❌ Error: Please provide a version number");
  console.error("Usage: node update-version.js <version>");
  console.error("Example: node update-version.js 2.2.3");
  process.exit(1);
}

// Validate version format (should be semantic versioning)
if (!/^\d+\.\d+\.\d+/.test(newVersion)) {
  console.error(`❌ Error: Invalid version format "${newVersion}"`);
  console.error("Version should be in format: X.Y.Z (e.g., 2.2.3)");
  process.exit(1);
}

const projectRoot = __dirname;

// Function to get previous version from version.json
function getPreviousVersion() {
  try {
    const versionFile = path.join(projectRoot, "version.json");
    const content = JSON.parse(fs.readFileSync(versionFile, "utf8"));
    return content.version || "unknown";
  } catch (e) {
    return "unknown";
  }
}

// Files to update with their paths and replacement functions
const filesToUpdate = [
  {
    name: "version.json",
    path: path.join(projectRoot, "version.json"),
    update: (content) => {
      let json;
      try {
        json = JSON.parse(content);
      } catch (err) {
        console.error(`[VERSION] Failed to parse version.json:`, err);
        throw err;
      }
      const oldVersion = json.version;
      json.version = newVersion;
      json.previousVersion = oldVersion;
      json.releaseDate = new Date().toISOString().split("T")[0];
      json.compatibility.current = newVersion;
      return JSON.stringify(json, null, 2);
    }
  },
  {
    name: "js/version.js",
    path: path.join(projectRoot, "js", "version.js"),
    update: (content) => {
      return content.replace(
        /export const VERSION = "[\d.]+";/,
        `export const VERSION = "${newVersion}";`
      );
    }
  },
  {
    name: "service-worker.js",
    path: path.join(projectRoot, "service-worker.js"),
    update: (content) => {
      return content.replace(/const VERSION = "[\d.]+";/, `const VERSION = "${newVersion}";`);
    }
  },
  {
    name: "manifest.dev.webmanifest",
    path: path.join(projectRoot, "manifest.dev.webmanifest"),
    update: (content) => {
      let json;
      try {
        json = JSON.parse(content);
      } catch (err) {
        console.error(`[VERSION] Failed to parse manifest.dev.webmanifest:`, err);
        throw err;
      }
      json.version = newVersion;
      return JSON.stringify(json, null, 2);
    }
  },
  {
    name: "manifest.webmanifest",
    path: path.join(projectRoot, "manifest.webmanifest"),
    update: (content) => {
      let json;
      try {
        json = JSON.parse(content);
      } catch (err) {
        console.error(`[VERSION] Failed to parse manifest.webmanifest:`, err);
        throw err;
      }
      json.version = newVersion;
      return JSON.stringify(json, null, 2);
    }
  },
  {
    name: "manifest.prod.webmanifest",
    path: path.join(projectRoot, "manifest.prod.webmanifest"),
    update: (content) => {
      let json;
      try {
        json = JSON.parse(content);
      } catch (err) {
        console.error(`[VERSION] Failed to parse manifest.prod.webmanifest:`, err);
        throw err;
      }
      json.version = newVersion;
      return JSON.stringify(json, null, 2);
    }
  }
];

console.log(`\n🚀 Updating version to ${newVersion}\n`);

let successCount = 0;
let failureCount = 0;

filesToUpdate.forEach(({ name, path: filePath, update }) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipped (file not found): ${name}`);
      return;
    }

    const originalContent = fs.readFileSync(filePath, "utf8");
    const updatedContent = update(originalContent);

    fs.writeFileSync(filePath, updatedContent, "utf8");
    console.log(`✅ Updated: ${name}`);
    successCount++;
  } catch (error) {
    console.error(`❌ Failed: ${name}`);
    console.error(`   Error: ${error.message}`);
    failureCount++;
  }
});

console.log(`\n${successCount} files updated successfully`);
if (failureCount > 0) {
  console.error(`${failureCount} files failed to update`);
  process.exit(1);
}

console.log(`✨ Version successfully updated to ${newVersion}\n`);
