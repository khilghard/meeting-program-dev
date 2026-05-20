/**
 * v211-localstorage.js - Synthetic 2.1.1 user localStorage fixture
 * Provides realistic but non-PII data for migration testing
 */

export function getV211StorageData() {
  return {
    lastProgramData: JSON.stringify({
      unitName: "1st Ward",
      unitAddress: "123 Main St, Anytown USA",
      stakeName: "Anytown Stake",
      date: "February 1, 2026",
      link: "https://local.churchofjesuschrist.org/en/units/us/",
      state: "February 1, 2026",
      presiding: "Branch President",
      conducting: "Bishopric",
      openingHymn: "100",
      openingSpeaker: ["John Doe"],
      sacramentSpeakers: [
        {
          name: "Jane Smith",
          minutes: 5,
        },
        {
          name: "Bob Johnson",
          minutes: 7,
        },
      ],
      closingSpeaker: ["Mary Garcia"],
      closingHymn: "300",
      specialNumber: "Hymn 280 - Choir",
    }),

    meeting_program_history: JSON.stringify([
      {
        date: "January 25, 2026",
        unitName: "1st Ward",
        link: "https://local.churchofjesuschrist.org/en/units/us/",
      },
      {
        date: "January 18, 2026",
        unitName: "1st Ward",
        link: "https://local.churchofjesuschrist.org/en/units/us/",
      },
      {
        date: "January 11, 2026",
        unitName: "Nortwest Ward",
        link: "https://local.churchofjesuschrist.org/en/units/us/",
      },
    ]),

    meeting_program_language: "en",

    theme: "light",

    last_program_help_shown: "true",

    programCache: JSON.stringify({
      timestamp: Date.now() - 86400000, // Yesterday
      unitName: "1st Ward",
      data: {
        unitName: "1st Ward",
        unitAddress: "123 Main St, Anytown USA",
        stakeName: "Anytown Stake",
        date: "February 1, 2026",
        presiding: "Branch President",
        sacramentSpeakers: [
          { name: "Jane Smith", minutes: 5 },
          { name: "Bob Johnson", minutes: 7 },
        ],
      },
    }),
  };
}

export async function injectV211Storage(page) {
  const storageData = getV211StorageData();
  await page.evaluate((data) => {
    Object.keys(data).forEach((key) => {
      try {
        localStorage.setItem(key, data[key]);
      } catch (e) {
        console.error(`Failed to set localStorage[${key}]:`, e.message);
      }
    });
  }, storageData);
}
