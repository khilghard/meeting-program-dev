---
name: hymn-number-validation
description: Validates hymn numbers against Church hymnbook, checks children's songs (CS), and generates hymn links. Use when processing hymn numbers, validating program content, or generating hymn references.
license: MIT
metadata:
  audience: developers
  workflow: validation
---

# Hymn Number Validator

## What I Do

- Validate hymn numbers exist in Church hymnbook
- Check children's song format (CS + number)
- Generate hymn title lookups
- Create hymn website links
- Validate hymn formatting in program data

## When to Use Me

Use this skill when:

- Adding hymn numbers to program
- Validating existing program data
- Debugging hymn display issues
- Generating hymn links
- Checking children's song format

## Valid Hymn Formats

### Regular Hymns

- Format: Number only
- Examples: `62`, `1001`, `188`, `2`
- Range: 1-317 (current hymnbook)

### Children's Songs

- Format: `CS` + space + number
- Examples: `CS 2`, `CS 73a`, `CS 15`
- Range: CS 1-CS 100+

### Hymns with Notes

- Format: Number + `|` + note
- Examples:
  - `62|Sung by the Primary Children`
  - `CS 2|Accompanied on the piano by Sister Smith`
  - `188|Organ prelude`

## Validation Rules

### 1. Number Range Check

```javascript
// Regular hymns: 1-317
if (number < 1 || number > 317) {
  error: "Hymn number out of range";
}

// Children's songs: 1-100+
if (csNumber < 1 || csNumber > 100) {
  error: "Children's song number out of range";
}
```

### 2. Format Validation

```javascript
// Valid patterns
/^\d+$/           // Regular hymn
/^CS \d+[a-z]?$/  // Children's song (allows 73a, 73b, etc.)
/^\d+\|.+$/       // Hymn with note
/^CS \d+[a-z]?\|.+$/ // Children's song with note
```

### 3. Special Cases

- **Custom hymns**: Not supported, use text only
- **Multiple hymns**: Each hymn is separate row
- **Intermediate hymns**: Use `intermediateHymn`, `intermediateHymn2`, etc.

## Hymnbook Reference

### Common Hymns by Category

- **Opening/Closing**: 1-50 (often used)
- **Sacrament**: 180-200 (sacrament hymn)
- **Testimony**: 130-160
- **Children**: CS series

### Hymn Link Generation

```javascript
// Generate hymn link
function getHymnLink(number) {
  return `https://www.churchofjesuschrist.org/study/hymns/${number}?lang=eng`;
}

// Children's song link
function getChildrensSongLink(number) {
  return `https://www.churchofjesuschrist.org/study/manual/childrens-songbook/${number}?lang=eng`;
}
```

## Common Errors

### 1. Missing Space in CS

```
❌ CS2     → Should be: CS 2
❌ CS73a   → Should be: CS 73a
```

### 2. Invalid Characters

```
❌ Hymn 62   → Should be: 62
❌ #188      → Should be: 188
❌ 62 hymn   → Should be: 62
```

### 3. Wrong Separator

```
❌ 62,Sung by Primary  → Should be: 62|Sung by Primary
❌ 62;Sung by Primary  → Should be: 62|Sung by Primary
```

## Testing

### Unit Tests

```javascript
// Valid hymns
isValidHymn("62"); // true
isValidHymn("1001"); // true
isValidHymn("CS 2"); // true
isValidHymn("CS 73a"); // true
isValidHymn("62|Note"); // true

// Invalid hymns
isValidHymn("0"); // false
isValidHymn("318"); // false
isValidHymn("CS2"); // false (missing space)
isValidHymn("CS 150"); // false (out of range)
```

## References

- [Official Hymnbook](https://www.churchofjesuschrist.org/study/hymns?lang=eng)
- [Children's Songbook](https://www.churchofjesuschrist.org/study/manual/childrens-songbook?lang=eng)
- [README: Hymn Formatting Guide](../../README.md#-speakers--hymns)
