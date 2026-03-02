# Sharing Requirements

## Overview

Users can share meeting programs via QR codes. The QR code encodes a URL that, when scanned, loads the program on another device.

---

## Sharing Flow

### Generate Share URL

The share URL must be in app format, not just the Google Sheets URL:

```
https://[site-url]/?url=[google-sheets-url]
```

Example:

```
https://example.com/meeting-program/?url=https://docs.google.com/spreadsheets/d/abc123
```

### URL Priority

The share URL is generated from (in priority order):

1. **URL parameter** - If current page has `?url=` param with app-format URL
2. **Profile URL** - If profile exists, use its Google Sheets URL

### Site URL Storage

- Store the deployed site URL when first loading a program
- Storage locations:
  - IndexedDB: `siteUrl` metadata
  - localStorage: `meeting_program_site_url` (for quick access)
- Default fallback: `https://khilghard.github.io/meeting-program/`

---

## QR Code Generation

### Format

- QR encodes the **full share URL** (site + sheet URL)
- Not just the Google Sheets URL
- Size: 250px x 250px
- Margin: 2

### Error Handling

| Error                 | Display Message              |
| --------------------- | ---------------------------- |
| QR library not loaded | "QR Code library not loaded" |
| No program loaded     | "No program loaded"          |
| Generation failed     | "Error generating QR code"   |

---

## Scanning Flow

### On Another Device

```
1. User scans QR code
2. Camera opens with URL
3. App loads with ?url= parameter
4. App checks for existing profile with that URL
5. If found → select that profile
6. If not found → create new profile
7. Program loads from Google Sheets
```

---

## UI Elements

### Share Modal

| Element      | Description                                                           |
| ------------ | --------------------------------------------------------------------- |
| Title        | "Share Program" (localized)                                           |
| Instructions | "Scan this QR code to load the program on another device" (localized) |
| QR Container | Displays QR code                                                      |
| URL Display  | Shows the share URL text                                              |
| Close Button | Closes modal                                                          |

### Share Button

- Located in header area
- Opens share modal on click

---

## Edge Cases

| Case                | Behavior                          |
| ------------------- | --------------------------------- |
| No profile loaded   | Show "No program loaded" in modal |
| Site URL not stored | Use default fallback              |
| Profile URL changes | Future shares use new URL         |

---

## Non-Requirements

- Direct URL copying (QR only)
- Share analytics
- Expiring share links
