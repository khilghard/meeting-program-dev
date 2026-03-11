---
name: google-sheets-formatting
description: Validates Google Sheets CSV format for meeting program, checks key/value structure, multi-language columns, and sharing permissions. Use when working with Google Sheets data, CSV parsing, or program loading.
license: MIT
metadata:
  audience: developers
  workflow: data-validation
---

# Google Sheets Formatting Validator

## What I Do

- Validate Google Sheets CSV structure for meeting program
- Check required keys and data formats
- Verify multi-language column structure (en, es, fr, swa)
- Validate sharing permissions and CSV export links
- Check for common formatting errors

## When to Use Me

Use this skill when:

- Setting up a new Google Sheet for meeting program
- Debugging CSV parsing issues
- Validating multi-language support
- Checking sharing permissions
- Troubleshooting program loading errors

## Validation Rules

### Required Structure

1. **Columns**: Must have `key` column (Column A)
2. **Multi-language**: Optional columns `en`, `es`, `fr`, `swa`
3. **No extra columns**: Only key + language columns allowed
4. **No blank rows**: All rows must have data

### Required Keys

- `unitName` - Ward/branch name
- `unitAddress` - Meetinghouse address
- `date` - Meeting date

### Optional Keys (Common)

- `presiding`, `conducting`, `musicDirector`, `musicOrganist`
- `openingHymn`, `sacramentHymn`, `closingHymn`
- `openingPrayer`, `closingPrayer`
- `speaker1` through `speaker4`
- `leader` (multiple allowed)
- `link`, `linkWithSpace`
- `generalStatement`, `generalStatementWithLink`
- `horizontalLine`

### Hymn Formatting

- Regular: Number only (e.g., `62`, `1001`)
- Children's songs: `CS` + space + number (e.g., `CS 2`, `CS 73a`)
- Custom text: Number + `|` + note (e.g., `62|Sung by Primary`)

### Sharing Permissions

- Must be "Anyone with the link" → Viewer
- CSV export link format: `https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv`

## Common Errors

1. **Comma in values**: Use `~` instead of commas
2. **HTML tags**: All HTML stripped by sanitization
3. **JavaScript**: Blocked for security
4. **Extra columns**: Unknown keys ignored
5. **Missing language fallback**: Empty cells use English value

## References

- [README: Google Sheets Setup](../../README.md#-google-sheets-setup-for-normal-users)
- [README: Keys & Values Reference](../../README.md#-keys--values-reference)
- [README: Multi-Language Support](../../README.md#-multi-language-support)
