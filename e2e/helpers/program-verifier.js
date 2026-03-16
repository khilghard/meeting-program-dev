/**
 * program-verifier.js
 * Verification utilities for comprehensive program data checking
 */

/**
 * Map of expected keys to verify in the rendered program
 * Each key maps to expected value and optional verification method
 */
export const programKeysToVerify = {
  unitName: {
    expectedValue: "Complete Test Ward",
    selector: null, // Will search in text content
    testName: "Unit Name"
  },
  stakeName: {
    expectedValue: "Complete Stake",
    selector: null,
    testName: "Stake Name"
  },
  unitAddress: {
    expectedValue: "100 Complete Street",
    selector: null,
    testName: "Unit Address"
  },
  date: {
    expectedValue: "March 5",
    selector: null,
    testName: "Date"
  },
  presiding: {
    expectedValue: "Bishop Complete Leader",
    selector: null,
    testName: "Presiding Officer"
  },
  conducting: {
    expectedValue: "Brother Conducting Leader",
    selector: null,
    testName: "Conducting Officer"
  },
  musicDirector: {
    expectedValue: "Sister Music Director",
    selector: null,
    testName: "Music Director"
  },
  musicOrganist: {
    expectedValue: "Brother Music Organist",
    selector: null,
    testName: "Music Organist"
  },
  openingHymn: {
    expectedValue: "#97",
    selector: ".hymn, [class*='hymn'], .opening",
    testName: "Opening Hymn"
  },
  openingPrayer: {
    expectedValue: "Sister Opening Prayer",
    selector: "[class*='prayer'], [class*='opening']",
    testName: "Opening Prayer"
  },
  sacramentHymn: {
    expectedValue: "#169 Bread of Life",
    selector: "[class*='sacrament'], [class*='hymn']",
    testName: "Sacrament Hymn"
  },
  speaker1: {
    expectedValue: "Brother Speaker One Topic",
    selector: "[class*='speaker']",
    testName: "Speaker 1"
  },
  speaker2: {
    expectedValue: "Sister Speaker Two Topic",
    selector: "[class*='speaker']",
    testName: "Speaker 2"
  },
  intermediateHymn: {
    expectedValue: "#228 My Heavenly Father Loves Me",
    selector: "[class*='intermediate'], [class*='hymn']",
    testName: "Intermediate Hymn"
  },
  closingHymn: {
    expectedValue: "#347 God is Love",
    selector: "[class*='closing'], [class*='hymn']",
    testName: "Closing Hymn"
  },
  closingPrayer: {
    expectedValue: "Brother Closing Prayer",
    selector: "[class*='prayer'], [class*='closing']",
    testName: "Closing Prayer"
  }
};

/**
 * Verify that a program data value is rendered in the DOM
 * @param {Page} page - Playwright page object
 * @param {string} key - The data key to verify
 * @param {string} expectedValue - Expected value to find
 * @returns {Promise<boolean>} Whether verification passed
 */
export async function verifyProgramKeyRendered(page, key, expectedValue) {
  const mainProgram = page.locator("#main-program");
  
  // Get all text content from main program
  const textContent = await mainProgram.textContent();
  
  if (!textContent) {
    return {
      passed: false,
      message: `${key}: No program content found`
    };
  }

  // Check if expected value is in the rendered content
  const found = textContent.includes(expectedValue);
  
  return {
    passed: found,
    message: found 
      ? `✓ ${key}: "${expectedValue}" found`
      : `✗ ${key}: "${expectedValue}" NOT found in rendered program`
  };
}

/**
 * Verify all critical keys are rendered in the program
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object>} Results with passed/failed arrays and summary
 */
export async function verifyComprehensiveProgram(page) {
  const results = {
    passed: [],
    failed: [],
    summary: null
  };

  const mainProgram = page.locator("#main-program");
  const programContent = await mainProgram.textContent();

  if (!programContent) {
    return {
      passed: [],
      failed: Object.keys(programKeysToVerify),
      summary: "No program content found in DOM"
    };
  }

  // Verify each key
  for (const [key, config] of Object.entries(programKeysToVerify)) {
    const found = programContent.includes(config.expectedValue);
    
    if (found) {
      results.passed.push({
        key,
        value: config.expectedValue,
        testName: config.testName
      });
    } else {
      results.failed.push({
        key,
        value: config.expectedValue,
        testName: config.testName,
        message: `Expected value not found: "${config.expectedValue}"`
      });
    }
  }

  results.summary = `${results.passed.length}/${Object.keys(programKeysToVerify).length} keys verified`;
  
  return results;
}

/**
 * Log comprehensive verification results
 * @param {Object} results - Results from verifyComprehensiveProgram
 */
export function logVerificationResults(results) {
  console.log("\n📋 Program Data Verification Results");
  console.log("═".repeat(50));
  
  if (results.passed.length > 0) {
    console.log(`✓ PASSED (${results.passed.length}):`);
    results.passed.forEach(item => {
      console.log(`  • ${item.testName}: "${item.value}"`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log(`✗ FAILED (${results.failed.length}):`);
    results.failed.forEach(item => {
      console.log(`  • ${item.testName}: "${item.value}" - ${item.message}`);
    });
  }
  
  console.log(`\nSummary: ${results.summary}`);
  console.log("═".repeat(50) + "\n");
}

/**
 * Helper to wait for program data to load and render
 * @param {Page} page - Playwright page object
 * @param {number} timeout - Timeout in ms
 */
export async function waitForProgramDataLoaded(page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const mainProgram = document.getElementById("main-program");
      if (!mainProgram) return false;
      const text = mainProgram.textContent || "";
      // Check for at least some content
      return text.length > 100;
    },
    { timeout }
  );
}
