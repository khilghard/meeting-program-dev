---
name: i18n-compliance
description: Checks internationalization compliance for multi-language support (en, es, fr, swa). Validates translation completeness, key consistency, and fallback behavior. Use when adding new features, updating translations, or debugging language issues.
license: MIT
metadata:
  audience: developers
  workflow: i18n-validation
---

# i18n Compliance Checker

## What I Do

- Validate translation completeness across 4 languages
- Check key consistency in translation files
- Verify fallback behavior (English as default)
- Detect missing translations
- Validate Church name translations
- Check honorific translations

## When to Use Me

Use this skill when:

- Adding new UI strings
- Updating translation files
- Debugging language switching issues
- Preparing for multi-language release
- Validating translation completeness

## Supported Languages

| Code  | Language  | Native Name |
| ----- | --------- | ----------- |
| `en`  | English   | English     |
| `es`  | Español   | Español     |
| `fr`  | Français  | Français    |
| `swa` | Kiswahili | Kiswahili   |

## Church Name Translations

### Required Translations

```javascript
const churchNames = {
  en: "The Church of Jesus Christ of Latter-day Saints",
  es: "La Iglesia de Jesucristo de los Santos de los Últimos Días",
  fr: "L'Église de Jésus-Christ des Saints des Derniers Jours",
  swa: "Kanisa La Yesu Kristo La Watakatifu wa Siku za Mwisho"
};
```

### Validation

- Must match official Church translations exactly
- No variations or abbreviations allowed
- Check for proper diacritics (é, ñ, etc.)

## Translation File Structure

### i18n JSON Format

```json
{
  "en": {
    "appTitle": "Meeting Program",
    "scanQrCode": "Scan QR Code",
    "useNewQrCode": "Use New QR Code"
  },
  "es": {
    "appTitle": "Programa de Reunión",
    "scanQrCode": "Escanear Código QR",
    "useNewQrCode": "Usar Nuevo Código QR"
  },
  "fr": {
    "appTitle": "Programme de Réunion",
    "scanQrCode": "Scanner le QR Code",
    "useNewQrCode": "Utiliser Nouveau QR Code"
  },
  "swa": {
    "appTitle": "Programu ya Mkutano",
    "scanQrCode": "Sakania Kodi ya QR",
    "useNewQrCode": "Tumia Kodi Mpya ya QR"
  }
}
```

### Google Sheets Multi-Language CSV

```csv
key,en,es,fr,swa
unitName,Unit Name,Nombre de la unidad,Nom de l'unité,Jina la kizio
openingHymn,Opening Hymn,Canto de apertura,Hymne d'ouverture,Mwimbaji wa kwanza
```

## Validation Rules

### 1. Key Consistency

```javascript
// All languages must have same keys
function validateKeyConsistency(translations) {
  const allKeys = Object.values(translations).map((lang) => Object.keys(lang));
  const uniqueKeys = new Set(allKeys.flat());

  for (const lang of Object.keys(translations)) {
    const missingKeys = [...uniqueKeys].filter((key) => !translations[lang][key]);
    if (missingKeys.length > 0) {
      warn(`Missing keys in ${lang}: ${missingKeys.join(", ")}`);
    }
  }
}
```

### 2. Empty Value Fallback

```javascript
// Empty values should fallback to English
function getTranslation(lang, key, translations) {
  const value = translations[lang]?.[key];
  if (!value || value.trim() === "") {
    return translations["en"][key]; // Fallback
  }
  return value;
}
```

### 3. Translation Completeness

```javascript
// Calculate completeness percentage
function calculateCompleteness(targetLang, translations) {
  const EnglishKeys = Object.keys(translations["en"]);
  const targetKeys = Object.keys(translations[targetLang]);

  const translated = EnglishKeys.filter(
    (key) => translations[targetLang][key] && translations[targetLang][key].trim() !== ""
  ).length;

  return (translated / EnglishKeys.length) * 100;
}
```

## Honorific Translations

### Required Honorifics

| English               | Spanish         | French         | Swahili     |
| --------------------- | --------------- | -------------- | ----------- |
| Brother               | Hermano         | Frère          | Kaka        |
| Sister                | Hermana         | Sœur           | Dada        |
| Elder                 | Élder           | Ancien         | Mzee        |
| Sister (Elder's wife) | Esposa de Élder | Femme d'Ancien | Mke wa Mzee |
| Bishop                | Obispo          | Évêque         | Mkaaji      |
| President             | Presidente      | Président      | Mwenyekiti  |

### Validation

- Honorifics must be translated based on selected language
- Names remain untranslated
- Check for proper capitalization

## Common Issues

### 1. Missing Diacritics

```
❌ Espanol     → Should be: Español
❌ Eglise      → Should be: Église
❌ Utimishi    → Should be: Utumishi (check context)
```

### 2. Incomplete Translations

```javascript
// Bad: Partial translation
es: {
  appTitle: "Programa",  // Missing rest of translations
  scanQrCode: ""         // Empty field
}

// Good: Complete translation
es: {
  appTitle: "Programa de Reunión",
  scanQrCode: "Escanear Código QR"
}
```

### 3. Wrong Language Codes

```
❌ "sp" or "spa"  → Should be: "es"
❌ "french"       → Should be: "fr"
❌ "sw"           → Should be: "swa"
```

## Testing Checklist

- [ ] All UI strings have translations for all 4 languages
- [ ] Church names are officially correct
- [ ] Honorifics translate correctly
- [ ] Empty values fallback to English
- [ ] Language selector works for all languages
- [ ] Program content loads correctly in each language
- [ ] No hardcoded English strings in UI

## References

- [README: Multi-Language Support](../../README.md#-multi-language-support)
- [js/i18n/translations.js](../../js/i18n/translations.js)
- [Official Church Translation Guidelines](https://www.churchofjesuschrist.org/study/manual/general-handbook/13?lang=eng)
