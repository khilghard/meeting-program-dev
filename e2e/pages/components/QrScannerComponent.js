/**
 * QrScannerComponent - Encapsulates QR scanner functionality
 * Handles: scanner UI, QR mocking, result handling
 */

export class QrScannerComponent {
  constructor(page) {
    this.page = page;

    this.qrScanner = page.locator("#qr-scanner, .qr-scanner, [data-qr-scanner]");
    this.qrVideo = page.locator("#qr-video, video[id*='qr']");
    this.scanButton = page.locator("button:has-text('Scan'), button:has-text('Start Scan'), #scan-btn");
    this.closeScannerBtn = page.locator("button:has-text('Close'), button:has-text('Cancel'), .close-scanner-btn");
    this.scanResultContainer = page.locator("#scan-result, .scan-result, [data-scan-result]");
  }

  // Scanner operations
  async open() {
    // Usually opened via header button, this waits for it to be visible
    await this.qrScanner.waitFor({ state: "visible", timeout: 5000 });
  }

  async close() {
    if (await this.qrScanner.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.closeScannerBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async isOpen() {
    return this.qrScanner.isVisible({ timeout: 1000 }).catch(() => false);
  }

  // QR mocking (requires mock setup in fixtures)
  async mockQRScan(qrUrl) {
    // This injects a mocked QR result via the page object
    // Assumes helper has set up the mock on page load
    await this.page.evaluate((url) => {
      // Trigger the QR result handling
      window.dispatchEvent(
        new CustomEvent("qr-scan-result", {
          detail: { text: url },
        })
      );
    }, qrUrl);
    await this.page.waitForTimeout(1000);
  }

  // Result handling
  async waitForScanResult(timeout = 5000) {
    await this.scanResultContainer.waitFor({ state: "visible", timeout });
  }

  async getScanResult() {
    return this.scanResultContainer.textContent();
  }

  async isScannerReady() {
    const videoVisible = await this.qrVideo.isVisible({ timeout: 1000 }).catch(() => false);
    const scannerVisible = await this.qrScanner.isVisible({ timeout: 1000 }).catch(() => false);
    return videoVisible && scannerVisible;
  }

  // Camera mock status
  async isCameraMocked() {
    const hasMediaDevices = await this.page.evaluate(() => !!navigator.mediaDevices);
    return hasMediaDevices;
  }
}
