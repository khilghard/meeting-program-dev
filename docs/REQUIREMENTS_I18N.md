# Internationalization (i18n) Requirements

## Overview

The app supports multiple languages for the user interface. Meeting program content is translated separately via Google Sheets columns.

---

## Supported Languages

| Code | Language | Direction |
| ---- | -------- | --------- |
| en   | English  | LTR       |
| es   | Spanish  | LTR       |
| fr   | French   | LTR       |
| swa  | Swahili  | LTR       |

---

## Language Detection

### Priority Order

```
1. localStorage preference
2. Browser language
3. Default: English
```

### Browser Detection

- Use `navigator.language` or `navigator.userLanguage`
- Extract language code (e.g., "en" from "en-US")
- Match against supported languages

---

## Language Storage

### Key

`localStorage.meeting_program_language`

### Values

- `"en"`, `"es"`, `"fr"`, `"swa"`

---

## Translation Function

### Usage

```javascript
t("key"); // Returns translated string
```

### Missing Keys

- Log warning to console
- Return the key itself as fallback

---

## Translation Structure

### File Location

`js/i18n/index.js`

### Format

```javascript
const translationsData = {
  en: {
    key1: "value",
    key2: "value"
  },
  es: {
    key1: "valor",
    key2: "valor"
  }
};
```

---

## Required Translations

All UI strings must be translated:

| Key                   | Description          |
| --------------------- | -------------------- |
| churchName            | Church name header   |
| sacramentServices     | Page title           |
| scanProgramQR         | Button text          |
| enterSheetUrlManually | Button text          |
| cancel                | Cancel button        |
| loading               | Loading message      |
| offlineMode           | Offline banner       |
| updateAvailable       | Update banner        |
| presiding             | Label                |
| conducting            | Label                |
| openingHymn           | Label                |
| openingPrayer         | Label                |
| sacramentHymn         | Label                |
| speaker               | Label                |
| closingHymn           | Label                |
| closingPrayer         | Label                |
| ...                   | All other UI strings |

---

## Language Selector

### UI

- Dropdown in header area
- Shows current language
- Lists all supported languages

### Behavior

- Click opens dropdown
- Selection immediately changes UI
- Persists to localStorage

---

## HTML lang Attribute

- Update `<html lang="">` when language changes
- Important for screen readers

---

## Meeting Program Translation

### Separate from UI

- UI is translated by app
- Meeting content is translated via Google Sheets columns

### CSV Format

```
key,en,es,fr,swa
openingHymn,Opening Hymn,Himno de Apertura,Chant d'ouverture,Himna ya Kuanza
```

### Fallback

If selected language column is empty → fall back to English column.

---

## Non-Requirements

- RTL language support
- Dynamic language loading
- User-contributed translations
- Date/number formatting per locale
