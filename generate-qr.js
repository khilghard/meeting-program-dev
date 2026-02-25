#!/usr/bin/env node

import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_WEBSITE_URL = "https://khilghard.github.io/meeting-program/";

function extractSheetId(url) {
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/edit/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function convertToCsvUrl(url) {
  const sheetId = extractSheetId(url);
  if (!sheetId) {
    throw new Error("Could not extract Google Sheets ID from URL");
  }

  if (url.includes("/gviz/tq") && url.includes("tqx=out:csv")) {
    return url;
  }

  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
}

function buildProgramUrl(websiteUrl, csvUrl, forceUpdate = false, nocache = false) {
  const trimmedWebsite = websiteUrl.replace(/\/$/, "");
  const params = new URLSearchParams();

  if (csvUrl) {
    params.set("url", csvUrl);
  }

  if (forceUpdate) {
    params.set("forceUpdate", "true");
  }

  if (nocache) {
    params.set("nocache", "true");
  }

  const queryString = params.toString();
  return `${trimmedWebsite}${queryString ? "?" + queryString : ""}`;
}

async function generateQRCode(
  websiteUrl,
  sheetUrl,
  outputPath,
  forceUpdate = false,
  nocache = false
) {
  let csvUrl = null;

  if (sheetUrl) {
    try {
      if (sheetUrl.includes("gviz/tq")) {
        csvUrl = sheetUrl;
      } else {
        csvUrl = convertToCsvUrl(sheetUrl);
      }
    } catch (error) {
      console.error("Error processing Google Sheets URL:", error.message);
      process.exit(1);
    }
  }

  const programUrl = buildProgramUrl(websiteUrl, csvUrl, forceUpdate, nocache);

  console.log("Generating QR code for:");
  console.log(`  Website: ${websiteUrl}`);
  if (sheetUrl) {
    console.log(`  Sheet:   ${sheetUrl}`);
    console.log(`  CSV:     ${csvUrl}`);
  }
  if (forceUpdate) {
    console.log(`  Force Update: true`);
  }
  if (nocache) {
    console.log(`  No Cache: true`);
  }
  console.log(`  Combined: ${programUrl}`);
  console.log("");

  try {
    const qrBuffer = await QRCode.toBuffer(programUrl, {
      type: "png",
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });

    fs.writeFileSync(outputPath, qrBuffer);
    console.log(`QR code saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error generating QR code:", error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
QR Code Generator for Meeting Program

Usage: node generate-qr.js [options]

Options:
  -w, --website <url>   Website URL (default: ${DEFAULT_WEBSITE_URL})
  -s, --sheet <url>     Google Sheets URL (normal or CSV format)
  -o, --output <path>   Output file path (default: ./program-qr.png)
  -f, --force-update    Add force update parameter (clears PWA cache)
  -n, --nocache         Add nocache parameter (browsers cache, forces fresh load)
  -h, --help            Show this help message

Examples:
  node generate-qr.js -s "https://docs.google.com/spreadsheets/d/ABC123/edit"
  node generate-qr.js -s "https://docs.google.com/spreadsheets/d/ABC123/gviz/tq?tqx=out:csv" -o my-ward.png
  node generate-qr.js -f -o force-update.png
  node generate-qr.js -n -o clear-cache.png
  node generate-qr.js -f -n -o force-clear.png
  `);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    showHelp();
    process.exit(0);
  }

  let websiteUrl = DEFAULT_WEBSITE_URL;
  let sheetUrl = null;
  let outputPath = "./program-qr.png";
  let forceUpdate = false;
  let nocache = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-w":
      case "--website":
        websiteUrl = args[++i];
        break;
      case "-s":
      case "--sheet":
        sheetUrl = args[++i];
        break;
      case "-o":
      case "--output":
        outputPath = args[++i];
        break;
      case "-f":
      case "--force-update":
        forceUpdate = true;
        break;
      case "-n":
      case "--nocache":
        nocache = true;
        break;
    }
  }

  if (!sheetUrl && !forceUpdate && !nocache) {
    console.error(
      "Error: either --sheet (or -s), --force-update (or -f), or --nocache (or -n) is required"
    );
    console.error("Run with --help for usage information");
    process.exit(1);
  }

  await generateQRCode(websiteUrl, sheetUrl, outputPath, forceUpdate, nocache);
}

main();
