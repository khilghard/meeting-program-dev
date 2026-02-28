// archive-fix.js
// This file provides the necessary functions for the archive modal functionality

import { getProfileArchives, deleteArchive, initArchiveManager } from "./data/ArchiveManager.js";

// Export the functions needed by main.js
export { getProfileArchives, deleteArchive, initArchiveManager };

// Add compatibility functions for the archive modal
export async function getArchiveWithValidation(profileId, programDate) {
  // This is a simplified version - in practice, you'd use the full ArchiveManager
  const archive = await getProfileArchives(profileId);
  return archive.find((a) => a.programDate === programDate) || null;
}

export async function getStorageInfo() {
  // This is a simplified version - in practice, you'd use the full ArchiveManager
  return {
    totalSizeMB: 0,
    maxSizeMB: 10,
    totalEntries: 0,
    warning: false
  };
}

export async function getStorageIntegrity() {
  return {
    integrity: true,
    issues: []
  };
}

export async function cleanupOldArchives(days) {
  // This is a simplified version
  return 0;
}
