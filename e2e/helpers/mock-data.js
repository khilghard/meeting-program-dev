/**
 * mock-data.js
 * All CSV data templates for E2E testing
 * These mock Google Sheets CSV responses
 */

export const DB_NAME = "MeetingProgramDB";

/**
 * Full program with all sections populated
 * Represents a complete sacrament meeting program
 */
export const fullProgram = `key,value
unitName,Alpine Ward
unitAddress,100 Main Street~ Alpine~ UT 84004
stakeName,Alpine Stake
date,2026-02-15
presiding,Bishop John Smith
conducting,Stake Patriarch David Johnson
openingHymn,#131 I Believe in Christ
openingPrayer,Brother Richard Brown
sacramentHymn,#169 Bread of Life
administering,Deacon Quorum
confirmation,Youth Sunday School
fastOffering,Relief Society
talks,Primary Children
specialMusicalNumber,Young Women
closingHymn,#193 God Be With You Till We Meet Again
closingPrayer,Sister Mary Wilson
announcements,Bishopric Meeting Sunday at 6 PM
bulletinItems,wardbc.org
`;

export const fullProgramUrl =
  "https://docs.google.com/spreadsheets/d/alpine-ward-2026-02-15/gviz/tq";

/**
 * Comprehensive program with ALL required keys
 * Used for comprehensive E2E testing to verify all data is rendered
 */
export const comprehensiveProgram = `key,value
unitName,Complete Test Ward
stakeName,Complete Stake
obsolete,false
migrationUrl,https://docs.google.com/spreadsheets/d/migrated-ward/gviz/tq
unitAddress,100 Complete Street~ Test City~ UT 12345
link,Ward Homepage | https://example-ward.org
date,March 5~ 2026
presiding,Bishop Complete Leader
conducting,Brother Conducting Leader
musicDirector,Sister Music Director
musicOrganist,Brother Music Organist
horizontalLine,Opening
openingHymn,#97 Lord We Come Before Thee Now | Accompanied on the piano by Sister Smith
openingPrayer,Sister Opening Prayer
horizontalLine,Sacrament Service
sacramentHymn,#169 Bread of Life
horizontalLine,Speakers and Music
speaker1,Brother Speaker One Topic
intermediateHymn,#228 My Heavenly Father Loves Me
speaker2,Sister Speaker Two Topic
closingHymn,#347 God is Love
closingPrayer,Brother Closing Prayer
horizontalLine,Closing
`;

export const comprehensiveProgramUrl =
  "https://docs.google.com/spreadsheets/d/comprehensive-ward/gviz/tq";

/**
 * Minimal program with just essential fields
 */
export const minimalProgram = `key,value
unitName,Minimal Ward
date,2026-02-15
openingHymn,#1 The Morning Breaks
`;

export const minimalProgramUrl = "https://docs.google.com/spreadsheets/d/minimal-ward/gviz/tq";

/**
 * Week 1 program for archive testing
 */
export const week1WardA = `key,value
unitName,Alpha Ward
unitAddress,200 First Avenue
stakeName,Alpha Stake
date,2026-02-08
presiding,Bishop Adams
conducting,Brother Baker
openingHymn,#100 Rock of Ages
openingPrayer,Sister Carter
sacramentHymn,#140 Nearer My God to Thee
talks,Youth Speaker - Emma Davis
closingHymn,#215 Abide With Me
closingPrayer,Brother Evans
`;

export const week1WardAUrl = "https://docs.google.com/spreadsheets/d/alpha-ward-week1/gviz/tq";

/**
 * Week 2 program for archive testing
 */
export const week2WardA = `key,value
unitName,Alpha Ward
unitAddress,200 First Avenue
stakeName,Alpha Stake
date,2026-02-15
presiding,Bishop Adams
conducting,Sister Garcia
openingHymn,#105 Lead Kindly Light
openingPrayer,Brother Harris
sacramentHymn,#142 I Stand All Amazed
talks,Adult Speaker - John Miller
closingHymn,#219 Bless This House
closingPrayer,Sister Ingram
`;

export const week2WardAUrl = "https://docs.google.com/spreadsheets/d/alpha-ward-week2/gviz/tq";

/**
 * Alternative ward for multi-profile testing
 */
export const wardB = `key,value
unitName,Beta Ward
unitAddress,300 Second Street
stakeName,Beta Stake
date,2026-02-15
presiding,Bishop Wilson
conducting,Brother Taylor
openingHymn,#2 The Spirit of God
openingPrayer,Sister Martinez
sacramentHymn,#175 In Remembrance
talks,Member - Robert Brown
closingHymn,#336 Teach Me to Walk in the Light
closingPrayer,Sister Lee
`;

export const wardBUrl = "https://docs.google.com/spreadsheets/d/beta-ward/gviz/tq";

/**
 * Week 1 for Beta Ward
 */
export const week1WardB = `key,value
unitName,Beta Ward
unitAddress,300 Second Street
stakeName,Beta Stake
date,2026-02-08
presiding,Bishop Wilson
conducting,Brother Anderson
openingHymn,#7 Come Thou Fount
openingPrayer,Sister Thompson
sacramentHymn,#180 There Is a Green Hill Far Away
talks,Primary President
closingHymn,#250 Secret Prayer
closingPrayer,Brother White
`;

export const week1WardBUrl = "https://docs.google.com/spreadsheets/d/beta-ward-week1/gviz/tq";

/**
 * Children's song program
 */
export const childrensSongProgram = `key,value
unitName,Sunshine Ward
unitAddress,400 Sunshine Lane
stakeName,Sunshine Stake
date,2026-03-01
presiding,Bishop Sunshine
openingHymn,#140 I Am a Child of God
openingPrayer,Sister Rainbow
sacramentHymn,#175 In Remembrance
talks,Primary Children - "I Know My Father Lives"
specialMusicalNumber,Primary Chorister
closingHymn,#301 POP Goes the Weasel (Arranged)
closingPrayer,Brother Cloud
`;

export const childrensSongProgramUrl =
  "https://docs.google.com/spreadsheets/d/sunshine-ward/gviz/tq";

/**
 * Stake conference program
 */
export const stakeConference = `key,value
unitName,Alpine Stake
unitAddress,Stake Center, 500 Main St
stakeName,Alpine Stake
date,2026-03-15
presiding,Elder Richard G. Scott
conducting,Bishop Maxwell
openingHymn,#257 High on the Mountain Top
openingPrayer,Stake Patriarch
sacramentHymn,#20 O God Where Art Thou
speaker,Stake Young Men President
speaker,Stake Relief Society President
specialMusicalNumber,Stake Choir
closingHymn,#347 God Is Love
closingPrayer,Bishop Johnson
`;

export const stakeConferenceUrl = "https://docs.google.com/spreadsheets/d/stake-conference/gviz/tq";

/**
 * Program with obsolete flag for migration testing
 */
export const obsoleteProgram = `key,value
unitName,Old Ward
date,2025-01-01
obsolete,true
migrationUrl,https://docs.google.com/spreadsheets/d/new-ward/gviz/tq
`;

export const obsoleteProgramUrl = "https://docs.google.com/spreadsheets/d/old-ward/gviz/tq";

export const migratedProgramUrl = "https://docs.google.com/spreadsheets/d/new-ward/gviz/tq";

/**
 * Program with all optional sections
 */
export const fullOptionalSections = `key,value
unitName,Full Ward
unitAddress,100 Test Street
stakeName,Test Stake
date,2026-02-15
presiding,Bishop Test
conducting,Brother Test
openingHymn,#100 hymn
openingPrayer,Brother Test
sacramentHymn,#140 hymn
interpreter,Brother Spanish
administering,Deacon Quorum
talks,Speaker One
talks,Speaker Two
talks,Speaker Three
specialMusicalNumber,Solo
musicalNumber,Violin Solo
specialMusicalNumber,Choir
closingHymn,#200 hymn
closingPrayer,Sister Test
announcements,Test announcement 1
announcements,Test announcement 2
bulletinItems,Test bulletin
`;

export const fullOptionalSectionsUrl = "https://docs.google.com/spreadsheets/d/full-ward/gviz/tq";

/**
 * Empty/edge case program - minimal possible
 */
export const emptyProgram = `key,value
unitName,Empty Ward
`;

export const emptyProgramUrl = "https://docs.google.com/spreadsheets/d/empty-ward/gviz/tq";

/**
 * Program with special characters
 */
export const specialCharsProgram = `key,value
unitName,O'Brien & Smith's Ward
unitAddress,123 D'Angelo Way, Orem UT
stakeName,St. George's Stake
date,2026-02-15
presiding,Bishop O'Brien (Sr.)
conducting,Brother Smith
openingHymn,#1#2 Test
openingPrayer,Sister O'Brien
sacramentHymn,#169
talks,Test "quoted" speaker
closingHymn,#193
closingPrayer,Brother & Sister Test
announcements,Test (parentheses)
`;

export const specialCharsProgramUrl =
  "https://docs.google.com/spreadsheets/d/special-chars/gviz/tq";

/**
 * All available mock programs keyed by name
 */
export const mockPrograms = {
  fullProgram,
  comprehensiveProgram,
  minimalProgram,
  week1WardA,
  week2WardA,
  wardB,
  week1WardB,
  childrensSongProgram,
  stakeConference,
  obsoleteProgram,
  fullOptionalSections,
  emptyProgram,
  specialCharsProgram
};

export const mockProgramUrls = {
  fullProgram: fullProgramUrl,
  comprehensiveProgram: comprehensiveProgramUrl,
  minimalProgram: minimalProgramUrl,
  week1WardA: week1WardAUrl,
  week2WardA: week2WardAUrl,
  wardB: wardBUrl,
  week1WardB: week1WardBUrl,
  childrensSongProgram: childrensSongProgramUrl,
  stakeConference: stakeConferenceUrl,
  obsoleteProgram: obsoleteProgramUrl,
  fullOptionalSections: fullOptionalSectionsUrl,
  emptyProgram: emptyProgramUrl,
  specialCharsProgram: specialCharsProgramUrl
};

/**
 * Get CSV data by program name
 */
export function getMockProgram(programName) {
  return mockPrograms[programName] || fullProgram;
}

export function getMockProgramUrl(programName) {
  return mockProgramUrls[programName] || fullProgramUrl;
}
