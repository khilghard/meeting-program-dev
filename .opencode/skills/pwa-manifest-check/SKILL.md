---
name: pwa-manifest-check
description: Validates PWA manifest configuration, service worker setup, and installation requirements. Checks manifest structure, icons, start_url, display mode, and service worker registration. Use when updating PWA configuration, before releases, or debugging installation issues.
license: MIT
metadata:
  audience: developers
  workflow: pwa-validation
---

# PWA Manifest Validator

## What I Do

- Validate PWA manifest structure and required fields
- Check service worker registration and caching
- Verify icon sizes and formats
- Validate start_url and display mode
- Check installability requirements
- Review offline page configuration

## When to Use Me

Use this skill when:

- Updating PWA manifest
- Before releasing new versions
- Debugging installation issues
- Adding new icons
- Modifying service worker
- Testing offline functionality

## Required Manifest Fields

### Minimum Required

```json
{
  "name": "Meeting Program",
  "short_name": "Meeting Program",
  "start_url": "/meeting-program/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#005a9c",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Recommended Fields

```json
{
  "description": "Meeting program display for sacrament meetings",
  "orientation": "portrait-primary",
  "scope": "/meeting-program/",
  "categories": ["productivity", "utilities"],
  "shortcuts": [
    {
      "name": "Scan QR Code",
      "url": "/meeting-program/?action=scan",
      "icons": [{ "src": "icon-qr.png", "sizes": "96x96" }]
    }
  ]
}
```

## Validation Rules

### 1. Icon Requirements

```javascript
// Required icon sizes
const requiredIconSizes = [192, 512];

// Recommended additional sizes
const recommendedIconSizes = [72, 96, 120, 144, 152, 180, 384, 1024];

// Valid formats
const validFormats = ["image/png", "image/svg+xml", "image/webp"];
```

### 2. Display Modes

```javascript
// Valid display modes
const displayModes = [
  "standalone", // Recommended for full app experience
  "fullscreen", // No browser chrome at all
  "minimal-ui", // Some browser UI
  "browser" // Regular browser tab
];

// For meeting program, 'standalone' is recommended
```

### 3. Start URL

```javascript
// Must be relative or same-origin
const validStartUrls = [
  "/meeting-program/",
  "./",
  "../meeting-program/",
  "/meeting-program/index.html"
];

// Invalid (cross-origin)
const invalidStartUrls = [
  "https://example.com/", // Different origin
  "//example.com/" // Different origin
];
```

### 4. Name Fields

```javascript
// Name requirements
- name: Required, displayed in app launcher
- short_name: Recommended (12 chars max for iOS)
- Both should be descriptive but concise
```

## Service Worker Checklist

### Registration

```javascript
// ✅ GOOD: Proper registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/meeting-program/service-worker.js")
      .then((registration) => {
        console.log("SW registered:", registration);
      })
      .catch((error) => {
        console.log("SW registration failed:", error);
      });
  });
}

// ❌ BAD: Missing error handling
navigator.serviceWorker.register("/sw.js");
```

### Caching Strategy

```javascript
// Check for proper caching in service-worker.js
const CACHE_VERSION = "v2.2.0";
const CACHE_NAME = `meeting-program-${CACHE_VERSION}`;

// Assets to cache
const ASSETS_TO_CACHE = [
  "/",
  "/meeting-program/",
  "/meeting-program/index.html",
  "/meeting-program/css/styles.css",
  "/meeting-program/js/main.js",
  "/meeting-program/offline.html"
];
```

### Offline Handling

```javascript
// Check for offline page
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
      .catch(() => {
        return caches.match("/meeting-program/offline.html");
      })
  );
});
```

## Installability Requirements

### 1. Manifest Requirements

- [ ] `name` or `short_name` present
- [ ] `icons` with at least 192px and 512px
- [ ] `start_url` is valid
- [ ] `display` mode is set
- [ ] Manifest is served with correct MIME type

### 2. Service Worker Requirements

- [ ] Service worker registered
- [ ] Fetch event handler present
- [ ] Offline page configured

### 3. HTTPS Requirement

- [ ] Site served over HTTPS (except localhost)
- [ ] No mixed content warnings

### 4. User Engagement

- [ ] App used at least once before
- [ ] User has visited multiple times (typically)

## Platform-Specific Checks

### iOS (Safari)

```html
<!-- Required meta tags -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Meeting Program" />
<link rel="apple-touch-icon" href="/meeting-program/icon-192.png" />
```

### Android (Chrome)

```html
<!-- Already handled by manifest -->
<meta name="theme-color" content="#005a9c" />
```

## Common Issues

### 1. Manifest Not Found

```
Error: Manifest manifest.webmanifest not found
Fix: Ensure manifest is in correct location and referenced in HTML
```

### 2. Invalid Icon Sizes

```
Error: Icons must include 192x192 and 512x512
Fix: Generate required icon sizes
```

### 3. Wrong MIME Type

```
Error: Manifest served with wrong content-type
Fix: Server should serve .webmanifest as application/manifest+json
```

### 4. start_url Mismatch

```
Error: start_url doesn't match current URL
Fix: Ensure start_url is relative or same-origin
```

## Testing Commands

### Check Installability (Chrome DevTools)

```javascript
// In DevTools Console
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("Install prompt available");
  e.preventDefault(); // Don't show prompt yet
  // Store event for later
});
```

### Validate Manifest

```bash
# Use Lighthouse
npm run lighthouse -- --audit pwa

# Or use online tools
# https://www.pwabuilder.com/
# https://manifest-validator.firebaseapp.com/
```

### Test Offline Mode

```javascript
// Service Worker debugging
navigator.serviceWorker.ready.then((registration) => {
  console.log("Service Worker:", registration);
  console.log("Cache:", registration.sync);
});

// Check cache contents
caches.keys().then((names) => {
  names.forEach((name) => {
    caches.open(name).then((cache) => {
      cache.keys().then((requests) => {
        console.log(
          "Cached URLs:",
          requests.map((r) => r.url)
        );
      });
    });
  });
});
```

## Files to Check

```
manifest.webmanifest          - Main manifest file
manifest.dev.webmanifest      - Development manifest
manifest.prod.webmanifest     - Production manifest
service-worker.js             - Service worker implementation
index.html                    - Manifest reference
offline.html                  - Offline fallback page
```

## References

- [README: Installing the App as PWA](../../README.md#-installing-the-app-as-pwa)
- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google PWA Builder](https://www.pwabuilder.com/)
