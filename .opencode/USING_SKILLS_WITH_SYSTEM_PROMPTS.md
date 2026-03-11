# Using Skills with System Prompts

## Overview

Learn how to integrate agent skills into your system prompts for optimal token efficiency and effectiveness.

## Quick Start

### Basic Integration

```javascript
// In your AI assistant configuration
const systemPrompt = `
Role: Coding assistant
Project: meeting-program

Skills available:
- google-sheets-formatting
- hymn-number-validation
- i18n-compliance
- security-audit
- pwa-manifest-check
- token-optimizer
- rigour-usage
- system-prompt-optimizer

When relevant, load skills:
skill({ name: "skill-name" })

Follow skill instructions when loaded.
`;
```

## System Prompt Templates

### Template 1: Minimal (50 tokens)

```
AI coding assistant for meeting-program.
Use skills when relevant: skill({ name: "X" })
Follow skill instructions.
Check rigour gates before commit.
```

### Template 2: Balanced (150 tokens)

```
Role: Coding assistant
Project: meeting-program (PWA sacrament programs)

Available Skills:
- google-sheets-formatting: Validate CSV
- hymn-number-validation: Check hymn numbers
- i18n-compliance: Translation checks
- security-audit: Security review
- pwa-manifest-check: PWA validation
- rigour-usage: MCP tool guidance
- token-optimizer: Reduce token usage
- system-prompt-optimizer: Optimize prompts

Workflow:
1. Understand task
2. Load relevant skill
3. Follow skill instructions
4. Test (npm test)
5. Validate (rigour_check)

Rules:
- No TODOs/FIXMEs
- Security-first
- Follow rigour.yml
```

### Template 3: Comprehensive (300 tokens)

```
# Role
Senior developer assistant for meeting-program

# Project Context
- PWA for sacrament meeting programs
- Google Sheets CSV data
- 4 languages: en, es, fr, swa
- Offline-first with IndexedDB

# Available Skills
Core Skills:
- google-sheets-formatting: CSV validation, multi-language checks
- hymn-number-validation: Hymn number range/format (1-317, CS 1-100)
- i18n-compliance: Translation completeness, Church names
- security-audit: XSS prevention, sanitization, URL validation
- pwa-manifest-check: Manifest, service worker, icons
- rigour-usage: Quality gates, MCP tools, security audits
- token-optimizer: Context window management, token reduction
- system-prompt-optimizer: Prompt compression, templates

# Skill Loading Pattern
When task matches skill domain:
1. Load skill: skill({ name: "skill-name" })
2. Read full instructions
3. Follow skill workflow
4. Reference skill examples
5. Document new patterns

# Quality Gates
- rigour_check before commit
- No hallucinated imports
- Security scan required
- Tests must pass
- Coverage ≥80%

# Workflow
1. Clarify requirements
2. Load relevant skill(s)
3. Check patterns (rigour_check_pattern)
4. Implement following skill guidance
5. Test (npm test + E2E)
6. Validate (rigour_check --deep quick)
7. Document changes

# Token Efficiency
- Load skills on-demand
- Summarize old conversation
- Use compact tool catalog
- Batch multi-step tasks
- Monitor token usage

# Security
- XSS prevention (textContent)
- Input sanitization
- URL validation
- No eval/innerHTML
- DLP hooks enabled
```

## Dynamic Skill Loading

### Context-Aware Loading

```javascript
// AI decides which skills to load based on task
function decideSkills(task) {
  if (task.includes("google sheets") || task.includes("CSV")) {
    return ["google-sheets-formatting"];
  }
  if (task.includes("hymn") || task.includes("song")) {
    return ["hymn-number-validation"];
  }
  if (task.includes("translation") || task.includes("i18n")) {
    return ["i18n-compliance"];
  }
  if (task.includes("security") || task.includes("XSS")) {
    return ["security-audit"];
  }
  if (task.includes("PWA") || task.includes("manifest")) {
    return ["pwa-manifest-check"];
  }
  if (task.includes("rigour") || task.includes("quality")) {
    return ["rigour-usage"];
  }
  if (task.includes("token") || task.includes("optimize")) {
    return ["token-optimizer"];
  }
  return [];
}
```

### Example Conversation Flow

```
User: "Validate this Google Sheets CSV format"

AI: [Automatically loads google-sheets-formatting skill]
    skill({ name: "google-sheets-formatting" })

    [Skill content loaded]

    "I've loaded the Google Sheets formatting validator.
    Please provide the CSV data to validate."

User: "key,en,es\nunitName,Test,Prueba"

AI: [Applies skill validation rules]
    "CSV structure is valid. Both English and Spanish
    translations present. No formatting issues detected."
```

## Token-Optimized System Prompts

### Compression Techniques

#### 1. Reference Skills Instead of Embedding

**❌ Inefficient (200 tokens):**

```
When validating Google Sheets CSV:
- Check for key column
- Validate multi-language columns (en, es, fr, swa)
- Ensure no extra columns
- Check hymn numbers are 1-317 or CS 1-100
- Verify sharing permissions are view-only
- Validate CSV export URL format
```

**✅ Efficient (30 tokens):**

```
Use google-sheets-formatting skill for CSV validation
```

#### 2. Use Skill Descriptions

**❌ Inefficient:**

```
You should check for XSS vulnerabilities, input sanitization,
URL validation, and secure data storage practices.
```

**✅ Efficient:**

```
Follow security-audit skill guidelines
```

#### 3. Reference External Docs

**❌ Inefficient:**

```
The project uses Google Sheets for data storage. The CSV export
URL format is https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv
You need to parse the CSV and validate the data structure.
```

**✅ Efficient:**

```
Data: Google Sheets CSV (see google-sheets-formatting skill)
```

## Complete System Prompt Example

### Production-Ready Prompt (250 tokens)

```
Role: Senior developer assistant
Project: meeting-program (PWA sacrament programs)

Stack: Vanilla JS, IndexedDB, PWA, Google Sheets CSV
Languages: en, es, fr, swa

Skills (load on-demand):
- google-sheets-formatting: CSV validation
- hymn-number-validation: Hymn number checks
- i18n-compliance: Translation validation
- security-audit: Security review
- pwa-manifest-check: PWA configuration
- rigour-usage: Quality gates, MCP tools
- token-optimizer: Token management
- system-prompt-optimizer: Prompt compression

Workflow:
1. Understand task
2. Load relevant skill(s)
3. Check patterns (rigour_check_pattern)
4. Implement following conventions:
   - const/let, no var
   - async/await, no .then
   - textContent, no innerHTML
   - Max 50 lines/function
   - No TODOs/FIXMEs
5. Test (npm test)
6. Validate (rigour_check --deep quick)
7. Document

Quality Gates:
- Pass rigour.yml requirements
- No hallucinated imports
- Security scan pass
- Tests ≥80% coverage

Security:
- XSS prevention
- Input sanitization
- URL validation (http/https only)
- DLP hooks enabled

Token Efficiency:
- Load skills on-demand
- Summarize old conversation
- Batch multi-step tasks
- Monitor usage

References:
- README.md (project overview)
- rigour.yml (quality gates)
- .opencode/skills/*/SKILL.md (detailed guidance)
```

## Integration with OpenCode

### opencode.json Configuration

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "skill": {
      "*": "allow"
    }
  },
  "agent": {
    "default": {
      "systemPrompt": "Use the balanced template from system-prompt-optimizer skill",
      "tools": {
        "skill": true
      }
    }
  }
}
```

### Custom Agent with System Prompt

```json
{
  "agent": {
    "code-reviewer": {
      "systemPrompt": "You are a code reviewer focused on security and quality. Load security-audit and rigour-usage skills for each review.",
      "tools": {
        "skill": true
      },
      "permission": {
        "skill": {
          "security-audit": "allow",
          "rigour-usage": "allow"
        }
      }
    }
  }
}
```

## Testing System Prompts

### A/B Test Prompt Effectiveness

```bash
# Test A: Original prompt
opencode --prompt "Original system prompt" --task "Validate CSV"

# Test B: Optimized prompt
opencode --prompt "Optimized system prompt" --task "Validate CSV"

# Compare:
# - Token usage
# - Response quality
# - Accuracy
# - Speed
```

### Measure Token Savings

```javascript
// Track token usage per request
const metrics = {
  originalPrompt: {
    tokens: 1200,
    accuracy: 85,
    speed: "2.5s"
  },
  optimizedPrompt: {
    tokens: 350,
    accuracy: 87,
    speed: "1.8s"
  }
};

// Result: 71% token reduction, 2% accuracy improvement
```

## Best Practices

### 1. Keep Core Rules in Prompt

```
✅ Include:
- Non-negotiable security rules
- Critical coding standards
- Essential workflow steps

❌ Exclude:
- Detailed examples (use skills)
- Comprehensive guidelines (use docs)
- Edge cases (use skills)
```

### 2. Use Skills for Domain Knowledge

```
Prompt: "Follow security guidelines"
Skill: security-audit (detailed security rules)
```

### 3. Reference Configuration Files

```
Prompt: "Follow quality gates"
File: rigour.yml (detailed thresholds)
```

### 4. Iterate and Optimize

```
1. Create functional prompt
2. Measure token usage
3. Identify compression opportunities
4. Apply system-prompt-optimizer patterns
5. Test effectiveness
6. Repeat
```

### 5. Monitor and Adjust

```
- Track token usage over time
- Note when skills are loaded
- Identify unused instructions
- Remove redundant rules
- Update based on feedback
```

## Troubleshooting

### Issue: AI Doesn't Load Skills

**Symptoms**: AI ignores skill references

**Solution:**

```
1. Verify skill permission in opencode.json
2. Check skill name spelling
3. Use explicit load command:
   "Load the X skill: skill({ name: 'x' })"
4. Ensure skill exists in .opencode/skills/
```

### Issue: Prompt Too Long

**Symptoms**: Token limit exceeded

**Solution:**

```
1. Load system-prompt-optimizer skill
2. Apply compression patterns
3. Reference external docs
4. Remove redundant instructions
5. Use abbreviations
```

### Issue: AI Misses Important Rules

**Symptoms**: Critical rules ignored

**Solution:**

```
1. Move critical rules to top of prompt
2. Use imperative mood
3. Repeat in multiple sections
4. Add examples
5. Increase weight with numbering
```

## References

- [System Prompt Optimizer Skill](./system-prompt-optimizer/SKILL.md)
- [Token Optimizer Skill](./token-optimizer/SKILL.md)
- [Rigour Usage Skill](./rigour-usage/SKILL.md)
- [OpenCode Skills Documentation](https://opencode.ai/docs/skills/)
