/**
 * QrScannerPage - Composed page object for QR scanning
 * Composes: HeaderComponent, QrScannerComponent, ModalComponent, ProgramListComponent
 */

import { BasePage } from "../base.js";
import { HeaderComponent } from "../components/HeaderComponent.js";
import { ModalComponent } from "../components/ModalComponent.js";
import { QrScannerComponent } from "../components/QrScannerComponent.js";
import { ProgramListComponent } from "../components/ProgramListComponent.js";

export class QrScannerPage extends BasePage {
  constructor(page) {
    super(page);
    this.page = page;

    // Compose sub-components
    this.header = new HeaderComponent(page);
    this.modal = new ModalComponent(page);
    this.qrScanner = new QrScannerComponent(page);
    this.programList = new ProgramListComponent(page);
  }

  // Navigation
  async goto() {
    await super.goto("index.html");
    await this.waitForInit();
  }

  // QR scanning flow
  async openQrScanner() {
    await this.header.openQrScanner();
    await this.qrScanner.open();
  }

  async scanQRAndLoad(qrUrl) {
    await this.openQrScanner();
    await this.qrScanner.mockQRScan(qrUrl);
    await this.qrScanner.waitForScanResult();
    await this.page.waitForTimeout(1500);
  }

  async closeQrScanner() {
    await this.qrScanner.close();
  }

  // Program loading after scan
  async waitForProgramsAfterScan(timeout = 10000) {
    await this.programList.waitForProgramsToLoad(timeout);
  }

  async getProgramsAfterScan() {
    return this.programList.getPrograms();
  }

  async loadProgramByIndex(index) {
    const program = await this.programList.getNthProgram(index);
    await program.clickLoad();
    await this.page.waitForTimeout(1000);
  }

  async loadLastProgram() {
    const count = await this.programList.getProgramCount();
    if (count > 0) {
      await this.loadProgramByIndex(count - 1);
    }
  }

  // Profile operations after scan
  async selectProfile(profileLabel) {
    await this.header.selectProfile(profileLabel);
    await this.page.waitForTimeout(500);
  }

  async getAvailableProfiles() {
    return this.header.getProfileOptions();
  }

  async switchProfileAndWait(profileLabel) {
    await this.selectProfile(profileLabel);
    await this.page.waitForTimeout(1000);
  }

  // QR result handling
  async getScanResult() {
    return this.qrScanner.getScanResult();
  }

  async isScannerReady() {
    return this.qrScanner.isScannerReady();
  }

  // Verification
  async isReady() {
    return (await this.header.isQrButtonVisible()) && (await this.programList.isVisible());
  }

  async hasProgramsLoaded() {
    return this.programList.hasPrograms();
  }

  // Console error checking
  async verifyNoConsoleErrors(ignorePatterns = []) {
    await this.expectNoConsoleErrors(ignorePatterns);
  }
}
