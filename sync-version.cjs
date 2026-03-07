const fs = require("fs");
const path = require("path");

// File paths
const VERSION_JS_PATH = path.join(__dirname, "js", "version.js");
const SERVICE_WORKER_PATH = path.join(__dirname, "service-worker.js");
const VERSION_JSON_PATH = path.join(__dirname, "version.json");

// Read version from version.js
const versionJsContent = fs.readFileSync(VERSION_JS_PATH, "utf8");
const versionMatch = versionJsContent.match(/export const VERSION = "(.*?)";/);
if (!versionMatch) {
  throw new Error("Could not find version in version.js");
}
const version = versionMatch[1];

console.log(`Found version: ${version}`);

// Update service-worker.js
const serviceWorkerContent = fs.readFileSync(SERVICE_WORKER_PATH, "utf8");
const updatedServiceWorker = serviceWorkerContent.replace(
  /const VERSION = ".*?";/g,
  `const VERSION = "${version}";`
);
fs.writeFileSync(SERVICE_WORKER_PATH, updatedServiceWorker);
console.log("Updated service-worker.js");

// Update version.json
let versionJson;
try {
  versionJson = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, "utf8"));
} catch (error) {
  console.error("Failed to parse version.json:", error.message);
  versionJson = {};
}
versionJson.version = version;
fs.writeFileSync(VERSION_JSON_PATH, JSON.stringify(versionJson, null, 2) + "\n");
console.log("Updated version.json");

console.log("Version synchronization completed successfully!");
