---
name: system-prompt-optimizer
description: Optimizes system prompts for AI assistants to reduce token usage while maintaining effectiveness. Provides templates, patterns, and strategies for efficient prompt engineering. Use when creating system prompts, optimizing AI behavior, or reducing context window usage.
license: MIT
metadata:
  audience: developers
  workflow: prompt-optimization
---

# System Prompt Optimizer

## What I Do

- Create efficient system prompts
- Reduce token usage in prompts
- Maintain effectiveness while compressing
- Provide prompt templates
- Optimize AI behavior instructions

## When to Use Me

Use this skill when:

- Creating new system prompts
- Optimizing existing prompts
- Reducing token costs
- Improving AI consistency
- Setting up agent instructions

## Token-Efficient Prompt Patterns

### 1. Compact Role Definition

**❌ Inefficient (25 tokens):**

```
You are an AI assistant that helps developers write code and solve programming problems.
```

**✅ Efficient (12 tokens):**

```
AI coding assistant. Help with code, debugging, and implementation.
```

### 2. Concise Instructions

**❌ Inefficient:**

```
When you are asked to help with a task, you should first think about what the user is asking for.
Then you should consider the best approach to solve their problem. After that, you should provide a solution.
```

**✅ Efficient:**

```
Workflow: 1) Understand request 2) Analyze approach 3) Provide solution
```

### 3. Bullet Point Lists

**❌ Inefficient:**

```
You should avoid using var statements in JavaScript. You should also avoid using console.log in production code.
You should make sure to use async/await instead of promises when possible.
```

**✅ Efficient:**

```
Avoid: var, console.log, promise chains
Prefer: const/let, proper logging, async/await
```

### 4. Abbreviated Context

**❌ Inefficient:**

```
This project is a meeting program that displays sacrament meeting schedules and programs. It uses Google Sheets for data storage.
```

**✅ Efficient:**

```
Project: meeting-program (PWA for sacrament programs)
Data: Google Sheets CSV
Stack: Vanilla JS, IndexedDB, Service Worker
```

## System Prompt Templates

### Template 1: Code Review Assistant

```
Role: Code reviewer
Focus: Quality, security, maintainability
Actions:
- Identify issues (security, bugs, anti-patterns)
- Suggest fixes with examples
- Explain reasoning briefly
Constraints:
- No breaking changes without warning
- Prioritize security over convenience
- Follow project conventions
```

### Template 2: Development Assistant

```
Role: Coding assistant
Context: {{project_name}} - {{brief_description}}
Stack: {{languages}}, {{frameworks}}
Workflow:
1. Understand task
2. Check existing patterns (rigour_check_pattern)
3. Implement following conventions
4. Test and validate
Rules:
- No TODOs or FIXMEs
- Max 50 lines per function
- Async/await preferred
- Security-first mindset
```

### Template 3: Debugging Assistant

```
Role: Debugging expert
Approach:
1. Reproduce issue mentally
2. Identify root cause
3. Propose fix
4. Verify solution
Output format:
- Problem: [brief description]
- Cause: [root cause]
- Fix: [code change]
- Prevention: [how to avoid]
```

### Template 4: Multi-Agent Coordinator

```
Role: Agent coordinator
Scope: {{file_patterns}}
Responsibilities:
- Own {{domain}} implementation
- Coordinate with {{other_agents}}
- Checkpoint every 15min
- Handoff on scope change
Quality gates:
- Pass rigour_check before completion
- Score ≥80 on all metrics
- No security vulnerabilities
```

## Token Optimization Strategies

### 1. Remove Filler Words

```
❌ "You should make sure to always"
✅ "Always"

❌ "It is important to note that"
✅ (Remove entirely)

❌ "In order to"
✅ "To"
```

### 2. Use Symbols and Abbreviations

```
❌ "and"
✅ "&"

❌ "with"
✅ "w/"

❌ "without"
✅ "w/o"

❌ "example"
✅ "ex:"

❌ "therefore"
✅ "→"
```

### 3. Compress Lists

```
❌ "You should use const, you should use let, you should not use var"
✅ "Use: const, let. Avoid: var"

❌ "Check for null, check for undefined, check for empty strings"
✅ "Validate: null, undefined, empty"
```

### 4. Implicit Context

```
❌ "This function should handle errors. The function is an async function."
✅ "Async function: handle errors"

❌ "When you are editing files, you should use the edit tool."
✅ "Edit files: use edit tool"
```

### 5. Reference External Docs

```
❌ [Long explanation of project structure]
✅ See: docs/ARCH.md, docs/SPEC.md

❌ [Detailed security guidelines]
✅ Follow: .opencode/skills/security-audit/SKILL.md

❌ [Full coding standards]
✅ Standards: rigour.yml gates
```

## Example System Prompts

### Example 1: Minimal (100 tokens)

```
Role: Coding assistant
Project: meeting-program (PWA sacrament programs)
Stack: Vanilla JS, IndexedDB, PWA

Rules:
- No TODOs/FIXMEs
- Security-first (XSS prevention)
- Follow rigour.yml gates
- Use skills when relevant

Workflow:
1. Understand task
2. Check patterns (rigour_check_pattern)
3. Implement
4. Test (npm test)
5. Validate (rigour_check)

Tools:
- Skills: Load on-demand
- Rigour: Check before commit
- Webfetch: For docs
```

### Example 2: Balanced (200 tokens)

```
Role: Senior developer assistant
Project: meeting-program
- PWA for sacrament meeting programs
- Google Sheets CSV data source
- 4 languages: en, es, fr, swa
- Offline-first with IndexedDB

Stack:
- Vanilla JavaScript (ES Modules)
- Vitest + Playwright testing
- Service Worker for PWA
- Google Sheets integration

Conventions:
- No var, use const/let
- Async/await over promises
- textContent over innerHTML
- Validate all user input
- Sanitize before rendering

Quality Gates (rigour.yml):
- Max 500 lines/file
- Complexity ≤10
- Max 5 params/function
- Max 2 nesting levels
- No TODOs/FIXMEs

Workflow:
1. Load relevant skills
2. Check patterns before coding
3. Implement following conventions
4. Run tests (npm test)
5. Validate (rigour_check --deep quick)
6. Document changes

Security:
- XSS prevention (security-audit skill)
- Input sanitization
- URL validation
- No eval() or innerHTML
- DLP hooks enabled

Multi-language:
- i18n-compliance skill
- Fallback to English
- Official Church translations
```

### Example 3: Comprehensive (400 tokens)

```
# Role & Context
Senior developer assistant for meeting-program
- LDS sacrament meeting PWA
- Google Sheets → CSV → IndexedDB
- Offline-first, 4 languages
- QR code sheet loading

# Technical Stack
Frontend:
- Vanilla JavaScript (ES Modules)
- No frameworks (performance)
- IndexedDB for data
- Service Worker for offline
- QR code scanning

Testing:
- Vitest (unit)
- Playwright (E2E)
- Coverage ≥80%

Data:
- Google Sheets CSV export
- Multi-language format: key,en,es,fr,swa
- Hymn numbers (1-317, CS 1-100)
- Sanitization pipeline

# Coding Standards
JavaScript:
- const/let only (no var)
- Async/await (no .then chains)
- Arrow functions preferred
- Destructuring for objects
- Template literals for strings

Architecture:
- Max 50 lines/function
- Max 10 methods/class
- Max 2 nesting levels
- Max 5 function params
- Single responsibility

Naming:
- camelCase variables
- PascalCase classes
- kebab-case files
- UPPER_CASE constants

# Quality Gates (rigour.yml)
Required:
- Pass all gates before commit
- Complexity ≤10
- No hallucinated imports
- Promise safety checks
- Security pattern validation

Deep Analysis:
- quick mode: normal work
- full mode: pre-release
- pro model: critical paths

# Security Requirements
Mandatory:
- XSS prevention (textContent)
- Input sanitization
- URL validation (http/https only)
- No eval() or Function()
- DLP hooks enabled
- Secret detection

Sensitive Areas:
- Google Sheets parsing
- QR code data
- User input
- External URLs
- IndexedDB storage

# Skills to Use
Core:
- google-sheets-formatting: Validate CSV
- hymn-number-validation: Check hymns
- i18n-compliance: Translation check
- security-audit: Security review
- pwa-manifest-check: PWA validation
- rigour-usage: MCP tool guidance
- token-optimizer: Reduce token usage

Workflow:
1. Load relevant skill(s)
2. Follow skill instructions
3. Validate with skill checks
4. Document in skill if pattern discovered

# Testing Requirements
Before commit:
- npm test (unit tests pass)
- npm run test:e2e (E2E pass)
- npm run lint (no errors)
- rigour_check --deep quick

Coverage:
- ≥80% overall
- ≥90% critical paths
- No empty tests
- No tautological assertions

# Documentation
Required files:
- README.md (user guide)
- docs/SPEC.md (requirements)
- docs/ARCH.md (architecture)
- JSDoc for public APIs
- Inline comments for complex logic

Updates:
- Update README for user-facing changes
- Update SPEC for requirements changes
- Update ARCH for architecture changes

# Workflow
1. Understand: Clarify requirements
2. Plan: Outline approach
3. Check: rigour_check_pattern for duplicates
4. Implement: Follow standards
5. Test: npm test + E2E
6. Validate: rigour_check --deep quick
7. Document: Update docs
8. Review: Self-review checklist

# Communication
- Be concise but thorough
- Show code examples
- Explain reasoning
- Ask clarifying questions
- Suggest alternatives
- Flag risks early

# Token Optimization
- Use skills for context
- Summarize old conversation
- Load tools on-demand
- Batch multi-step tasks
- Monitor token usage
```

## Integration with Token-Optimizer

### Using Both Skills Together

1. **Load both skills:**

```
skill({ name: "system-prompt-optimizer" })
skill({ name: "token-optimizer" })
```

2. **Optimize existing prompt:**

```
"Here's my current system prompt: [paste prompt]
Use system-prompt-optimizer to reduce tokens
Then use token-optimizer to verify savings"
```

3. **Create optimized prompt:**

```
"Create a system prompt for [project]
Target: <200 tokens
Include: role, stack, conventions, quality gates
Use system-prompt-optimizer templates"
```

### Token Comparison

**Original Prompt:** 1,200 tokens
**Optimized Prompt:** 350 tokens
**Savings:** 850 tokens (71% reduction)

## Best Practices

### 1. Start Minimal

```
Begin with 100-token version
Add complexity only when needed
```

### 2. Use Skills for Detail

```
Instead of embedding all info in prompt:
"Follow security guidelines in security-audit skill"
```

### 3. Reference Configuration

```
"Follow rigour.yml gates"
"Use MCP settings from .rigour/mcp-settings.json"
```

### 4. Iterative Optimization

```
1. Create functional prompt
2. Measure tokens
3. Compress using patterns
4. Test effectiveness
5. Repeat
```

### 5. A/B Test Prompts

```
Test A: Original prompt
Test B: Optimized prompt
Compare: Quality, token usage, response time
```

## Troubleshooting

### Issue: Prompt Too Short

**Symptoms**: AI misses important context

**Solution:**

```
Add critical context only:
- Project purpose
- Key constraints
- Non-negotiable rules
Refer to skills/docs for details
```

### Issue: AI Ignores Instructions

**Symptoms**: Instructions not followed

**Solution:**

```
1. Move critical rules to top
2. Use imperative mood ("Do X" not "You should X")
3. Repeat key rules in multiple sections
4. Add examples
```

### Issue: Token Count Still High

**Symptoms**: Optimization not working

**Solution:**

```
1. Remove all filler words
2. Use abbreviations
3. Reference external docs
4. Compress lists to bullets
5. Remove redundant instructions
```

## References

- [Token Optimizer Skill](./token-optimizer/SKILL.md)
- [Rigour Usage Skill](./rigour-usage/SKILL.md)
- [Rigour Configuration](./rigour.yml)
- [Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
