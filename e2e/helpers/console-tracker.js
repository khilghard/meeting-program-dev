/**
 * console-tracker.js - Utility for tracking and asserting console errors
 * Provides hybrid console validation: automatic tracking + explicit assertions
 */

export class ConsoleTracker {
  constructor(page) {
    this.page = page;
    this.initialErrorCount = 0;
    this.initialWarningCount = 0;
    this.errors = [];
    this.warnings = [];
    this.ignoredPatterns = [];
  }

  // Setup tracking at test start
  listenToConsoleMessages() {
    this.page.on("console", (msg) => {
      if (msg.type() === "error") {
        this.errors.push({
          timestamp: new Date(),
          text: msg.text(),
          location: msg.location(),
        });
      } else if (msg.type() === "warning") {
        this.warnings.push({
          timestamp: new Date(),
          text: msg.text(),
        });
      }
    });

    this.page.on("pageerror", (exception) => {
      this.errors.push({
        timestamp: new Date(),
        text: `Page Error: ${exception.message}`,
        location: exception.stack,
      });
    });
  }

  // Get all new errors since tracking started
  getNewErrors() {
    return this.errors.filter((err) => !this._shouldIgnore(err.text));
  }

  // Get all new warnings since tracking started
  getNewWarnings() {
    return this.warnings.filter((warn) => !this._shouldIgnore(warn.text));
  }

  // Add patterns to ignore (string or regex)
  ignorePattern(pattern) {
    this.ignoredPatterns.push(pattern);
  }

  _shouldIgnore(text) {
    return this.ignoredPatterns.some((pattern) => {
      if (typeof pattern === "string") {
        return text.includes(pattern);
      }
      if (pattern instanceof RegExp) {
        return pattern.test(text);
      }
      return false;
    });
  }

  // Assert no new errors (throws if errors found)
  async assertNoNewErrors(failOnWarnings = false) {
    const newErrors = this.getNewErrors();
    const newWarnings = failOnWarnings ? this.getNewWarnings() : [];

    const allIssues = [
      ...newErrors.map((e) => `ERROR: ${e.text}`),
      ...newWarnings.map((w) => `WARNING: ${w.text}`),
    ];

    if (allIssues.length > 0) {
      throw new Error(
        `Console issues detected:\n${allIssues.map((issue, i) => `  ${i + 1}. ${issue}`).join("\n")}`
      );
    }
  }

  // Soft assertion: log but don't throw
  logConsoleIssues() {
    const issues = [
      ...this.getNewErrors().map((e) => ({ type: "ERROR", text: e.text })),
      ...this.getNewWarnings().map((w) => ({ type: "WARNING", text: w.text })),
    ];

    if (issues.length > 0) {
      console.log("Console issues detected:");
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.type}] ${issue.text}`);
      });
    }

    return issues;
  }

  // Reset tracking
  reset() {
    this.errors = [];
    this.warnings = [];
  }

  // Get count
  getErrorCount() {
    return this.getNewErrors().length;
  }

  getWarningCount() {
    return this.getNewWarnings().length;
  }
}
