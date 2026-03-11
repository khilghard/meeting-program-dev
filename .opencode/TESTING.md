# Testing Agent Skills

## Overview

This guide shows how to test and verify that your agent skills work correctly.

## Quick Test: List Available Skills

### Using OpenCode CLI

```bash
# List all available skills
opencode --list-skills

# Expected output:
# Available skills:
#   - google-sheets-formatting: Validates Google Sheets CSV format...
#   - hymn-number-validation: Validates hymn numbers...
#   - i18n-compliance: Checks internationalization compliance...
#   - security-audit: Performs security review...
#   - pwa-manifest-check: Validates PWA manifest...
#   - token-optimizer: Monitors and reduces token usage...
```

### Using OpenCode Provider

Start a conversation and ask:

```
What skills are available?
```

The AI should respond with a list of skills and their descriptions.

## Manual Skill Loading Test

### Test 1: Load Google Sheets Formatting Skill

```bash
opencode
```

Then ask:

```
Load the google-sheets-formatting skill and validate this CSV:

key,en,es,fr,swa
unitName,Riverview Branch,Unidad de Riverview,Unité de Riverview,Kizio cha Riverview
openingHymn,62,62,62,62
```

**Expected Result:**

- Skill loads automatically
- AI validates the CSV structure
- Points out any formatting issues
- Confirms valid hymn numbers

### Test 2: Validate Hymn Numbers

```
Load hymn-number-validation and check these hymns:
- 62
- CS 2
- CS73a
- 318
- 1001
```

**Expected Result:**

- `62` → Valid
- `CS 2` → Valid (correct format with space)
- `CS73a` → Invalid (missing space, should be "CS 73a")
- `318` → Invalid (out of range, max is 317)
- `1001` → Valid (if in extended hymnbook)

### Test 3: Check i18n Compliance

```
Load i18n-compliance and check this translation file:

{
  "en": { "appTitle": "Meeting Program", "scanQr": "Scan QR" },
  "es": { "appTitle": "Programa", "scanQr": "" },
  "fr": { "appTitle": "Programme", "scanQr": "Scanner" },
  "swa": { "appTitle": "Programu", "scanQr": "Sakania" }
}
```

**Expected Result:**

- Identifies missing Spanish translation for `scanQr`
- Warns about empty fallback behavior
- Suggests adding complete translation

### Test 4: Security Audit

```
Load security-audit and review this code:

function renderProgram(data) {
  document.getElementById('output').innerHTML = data.programContent;
}

function loadSheet(url) {
  window.location.href = userProvidedUrl;
}
```

**Expected Result:**

- Flags `innerHTML` usage as XSS risk
- Suggests using `textContent` instead
- Warns about unvalidated URL redirect
- Provides secure alternatives

### Test 5: PWA Manifest Check

```
Load pwa-manifest-check and validate this manifest:

{
  "name": "Meeting Program",
  "short_name": "Meeting",
  "start_url": "/",
  "display": "standalone"
}
```

**Expected Result:**

- Identifies missing `icons` array
- Notes missing `background_color` and `theme_color`
- Warns that 192px and 512px icons are required
- Suggests adding complete manifest structure

## Automated Testing

### Create a Test Script

```javascript
// test/skills.test.js
import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Agent Skills", () => {
  const skillsDir = path.join(".opencode", "skills");

  test("All skills have SKILL.md files", () => {
    const skillDirs = fs.readdirSync(skillsDir);

    skillDirs.forEach((skill) => {
      const skillPath = path.join(skillsDir, skill, "SKILL.md");
      expect(fs.existsSync(skillPath)).toBe(true);
    });
  });

  test("All SKILL.md files have valid frontmatter", () => {
    const skillDirs = fs.readdirSync(skillsDir);

    skillDirs.forEach((skill) => {
      const skillPath = path.join(skillsDir, skill, "SKILL.md");
      const content = fs.readFileSync(skillPath, "utf-8");

      // Check for YAML frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      expect(frontmatterMatch).not.toBeNull();

      // Check required fields
      const frontmatter = frontmatterMatch[1];
      expect(frontmatter).toContain("name:");
      expect(frontmatter).toContain("description:");

      // Validate name matches directory
      const nameMatch = frontmatter.match(/name:\s*(\S+)/);
      expect(nameMatch[1]).toBe(skill);
    });
  });

  test("Skill names follow naming conventions", () => {
    const skillDirs = fs.readdirSync(skillsDir);
    const validNamePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

    skillDirs.forEach((skill) => {
      expect(validNamePattern.test(skill)).toBe(true);
    });
  });

  test("Skill descriptions are within length limits", () => {
    const skillDirs = fs.readdirSync(skillsDir);

    skillDirs.forEach((skill) => {
      const skillPath = path.join(skillsDir, skill, "SKILL.md");
      const content = fs.readFileSync(skillPath, "utf-8");

      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = frontmatterMatch[1];
      const descMatch = frontmatter.match(/description:\s*(.+)/);

      expect(descMatch[1].length).toBeLessThanOrEqual(1024);
      expect(descMatch[1].length).toBeGreaterThan(0);
    });
  });
});
```

### Run Tests

```bash
npm test -- skills.test.js
```

**Expected Output:**

```
✓ Agent Skills > All skills have SKILL.md files
✓ Agent Skills > All SKILL.md files have valid frontmatter
✓ Agent Skills > Skill names follow naming conventions
✓ Agent Skills > Skill descriptions are within length limits

Test Files  1 passed
Tests       4 passed
```

## Verify Skill Discovery

### Check OpenCode Configuration

```bash
# Verify opencode.json is valid
cat .opencode/opencode.json | jq .

# Check skill permissions
opencode --config .opencode/opencode.json --list-skills
```

### Test Skill Permission Patterns

Create a test config:

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "internal-*": "deny",
      "experimental-*": "ask"
    }
  }
}
```

Test with different skill names:

- `google-sheets-formatting` → Should load (matches `*`)
- `internal-tool` → Should be denied (matches `internal-*`)
- `experimental-feature` → Should prompt (matches `experimental-*`)

## Token Usage Verification

### Manual Check

1. Start a conversation with OpenCode
2. Ask it to load a skill
3. Check the token usage in the response

### Automated Token Tracking

```javascript
// utils/token-tracker.js
export class TokenTracker {
  constructor() {
    this.usage = [];
  }

  logRequest(skillName, tokenCount) {
    this.usage.push({
      timestamp: new Date().toISOString(),
      skill: skillName,
      tokens: tokenCount
    });

    // Save to file
    this.save();
  }

  save() {
    fs.writeFileSync(".opencode/token-usage-log.json", JSON.stringify(this.usage, null, 2));
  }

  getSummary() {
    const total = this.usage.reduce((sum, u) => sum + u.tokens, 0);
    const avg = total / this.usage.length;

    return {
      totalRequests: this.usage.length,
      totalTokens: total,
      averageTokens: avg,
      skills: this.usage.map((u) => u.skill)
    };
  }
}
```

### View Token Usage Log

```bash
cat .opencode/token-usage-log.json
```

Example output:

```json
[
  {
    "timestamp": "2026-03-09T20:30:00.000Z",
    "skill": "google-sheets-formatting",
    "tokens": 450
  },
  {
    "timestamp": "2026-03-09T20:32:00.000Z",
    "skill": "hymn-number-validation",
    "tokens": 380
  }
]
```

## Common Issues and Solutions

### Issue: Skill Not Found

**Symptom**: AI says "Skill not found" or doesn't list it

**Solutions:**

1. Check file is named `SKILL.md` (all caps)
2. Verify directory name matches skill name in frontmatter
3. Ensure no typos in `name` field
4. Check `.opencode/skills/` structure

### Issue: Skill Loads but Content Missing

**Symptom**: Skill loads but description is empty

**Solutions:**

1. Check YAML frontmatter syntax
2. Verify `description` field exists
3. Ensure description is 1-1024 characters
4. Check for proper indentation

### Issue: Permission Denied

**Symptom**: AI says "You don't have permission to use this skill"

**Solutions:**

1. Check `opencode.json` permission settings
2. Verify skill name doesn't match denied patterns
3. Adjust permission rules if needed

## Best Practices

### 1. Test Each Skill Individually

```bash
# Test one skill at a time
opencode "Load google-sheets-formatting and check this: [test data]"
```

### 2. Test Edge Cases

```
# Test invalid hymn numbers
"Validate: CS2, 0, 999, CS 150"

# Test empty translations
"Check i18n: { es: { appTitle: '' } }"

# Test XSS payloads
"Security audit: <script>alert(1)</script>"
```

### 3. Test Real-World Scenarios

```
# Real Google Sheets CSV
"Validate this actual program CSV: [paste real data]"

# Real PWA manifest
"Check this production manifest: [paste real manifest]"
```

### 4. Document Test Cases

Add test examples to each SKILL.md file:

````markdown
## Test Cases

### Valid Input

```csv
key,en,es
unitName,Test,Prueba
```
````

Expected: Pass

### Invalid Input

```csv
key,en,es
unitName,Test,  # Empty value
```

Expected: Warning about missing translation

```

## Verification Checklist

- [ ] All 6 skills listed in OpenCode
- [ ] Each skill loads without errors
- [ ] Skills validate input correctly
- [ ] Skills provide helpful feedback
- [ ] Token usage is within limits (<5000 tokens per skill)
- [ ] Automated tests pass
- [ ] Token usage log is being tracked
- [ ] Permission patterns work correctly

## Next Steps

1. **Add More Test Cases**: Expand edge case coverage
2. **Create Integration Tests**: Test skills working together
3. **Monitor Token Usage**: Track and optimize further
4. **Add New Skills**: Create skills for other workflows
```
