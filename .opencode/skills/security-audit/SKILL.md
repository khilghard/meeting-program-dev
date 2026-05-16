---
name: security-audit
description: Performs security review focusing on XSS prevention, input sanitization, and data validation. Checks for script injection, HTML sanitization, URL validation, and safe data handling. Use when reviewing code changes, before deployments, or when handling user input.
license: MIT
metadata:
  audience: developers
  workflow: security-review
---

# Security Audit Skill

## What I Do

- Review code for XSS vulnerabilities
- Check input sanitization implementation
- Validate URL handling and validation
- Audit data sanitization pipeline
- Check for secure data storage practices
- Review third-party script usage

## When to Use Me

Use this skill when:

- Reviewing pull requests
- Before production deployments
- Adding new user input fields
- Implementing new data sources
- Security concerns arise
- Quarterly security reviews

## Security Checklist

### 1. Input Sanitization

```javascript
// ✅ GOOD: Proper sanitization
function sanitizeInput(input) {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+="[^"]*"/g, "");
}

// ❌ BAD: No sanitization
function processInput(input) {
  document.getElementById("output").innerHTML = input;
}
```

### 2. XSS Prevention

```javascript
// ✅ GOOD: Use textContent
element.textContent = userInput;

// ❌ BAD: Using innerHTML
element.innerHTML = userInput;

// ✅ GOOD: If HTML needed, use DOMParser
const parsed = new DOMParser().parseFromString(sanitizedHTML, "text/html");
```

### 3. URL Validation

```javascript
// ✅ GOOD: Strict URL validation
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

// ❌ BAD: No validation
window.location.href = userProvidedUrl;
```

### 4. Data Storage

```javascript
// ✅ GOOD: IndexedDB for sensitive data
const request = indexedDB.open("meeting-program", 1);
request.onupgradeneeded = (e) => {
  const db = e.target.result;
  db.createObjectStore("programs", { keyPath: "id" });
};

// ❌ BAD: localStorage for sensitive data
localStorage.setItem("user-data", sensitiveInfo);
```

## Project-Specific Checks

### Google Sheets Integration

```javascript
// Check 1: CSV parsing sanitization
- Verify CSV parser doesn't execute code
- Check for injection in cell values
- Validate key whitelist

// Check 2: URL validation
- Google Sheets URL format validation
- No javascript: protocol allowed
- No data: URIs allowed

// Check 3: Sharing permissions
- Verify sheet is view-only
- Check for edit access restrictions
```

### QR Code Handling

```javascript
// Check 1: QR data validation
- Validate QR contains expected URL format
- No executable code in QR data
- URL protocol whitelist

// Check 2: Camera permissions
- Request permissions only when needed
- Clear permission usage explanation
- No persistent camera access
```

### Hymn Number Processing

```javascript
// Check 1: Input validation
- Hymn number range validation (1-317)
- Children's song format validation (CS + space + number)
- No script injection in custom notes

// Check 2: Link generation
- Validate generated URLs
- No user-controlled URL parts
- HTTPS enforcement
```

## Common Vulnerabilities to Check

### 1. DOM-based XSS

```javascript
// ❌ VULNERABLE
document.querySelector(userSelector).innerHTML = userInput;

// ✅ SAFE
const element = document.getElementById("safe-id");
element.textContent = userInput;
```

### 2. Event Handler Injection

```javascript
// ❌ VULNERABLE
element.setAttribute("onclick", userInput);

// ✅ SAFE
element.addEventListener("click", () => {
  // Safe handler
});
```

### 3. JSON Injection

```javascript
// ❌ VULNERABLE
eval("(" + userString + ")");

// ✅ SAFE
JSON.parse(userString);
```

### 4. Prototype Pollution

```javascript
// ❌ VULNERABLE
const config = Object.assign({}, userInput);

// ✅ SAFE
const config = JSON.parse(JSON.stringify(userInput));
```

## Sanitization Pipeline Review

### Current Implementation (Check these files)

```
js/utils/sanitization.js - Main sanitization logic
js/utils/csv-parser.js   - CSV parsing safety
js/data/indexeddb.js     - Data storage safety
```

### Validation Points

1. **CSV Parsing**
   - [ ] No code execution in cell values
   - [ ] Key whitelist validation
   - [ ] Proper escaping of special characters

2. **Rendering**
   - [ ] All user content uses textContent
   - [ ] HTML tags stripped before rendering
   - [ ] Event handlers removed

3. **URLs**
   - [ ] Protocol whitelist (http, https only)
   - [ ] No javascript: protocol
   - [ ] No data: URIs
   - [ ] URL parsing before use

4. **Storage**
   - [ ] IndexedDB preferred over localStorage
   - [ ] Data validation before storage
   - [ ] No executable code in stored data

## Testing Security

### Manual Test Cases

```javascript
// Test 1: Script injection
const evilInput = '<script>alert("xss")</script>';
// Expected: Script removed, no execution

// Test 2: Event handler injection
const evilInput = "<img src=x onerror=\"alert('xss')\">";
// Expected: Handler removed, no execution

// Test 3: JavaScript URL
const evilUrl = 'javascript:alert("xss")';
// Expected: URL rejected

// Test 4: HTML entities
const evilInput = "&lt;script&gt;alert(1)&lt;/script&gt;";
// Expected: Entities decoded and stripped
```

### Automated Tests

```javascript
// test/security.test.js
describe("Security", () => {
  test("Sanitizes script tags", () => {
    const input = "<script>alert(1)</script>Hello";
    expect(sanitize(input)).toBe("Hello");
  });

  test("Removes event handlers", () => {
    const input = '<div onclick="evil()">Click</div>';
    expect(sanitize(input)).toBe("<div>Click</div>");
  });

  test("Validates URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });
});
```

## References

- [README: Security & Sanitization](../../README.md#-security--sanitization)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
