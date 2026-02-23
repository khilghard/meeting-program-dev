# Contributing to Meeting Program

Thank you for your interest in contributing to the Meeting Program PWA! This document provides guidelines and instructions for contributors.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Deployment](#deployment)

---

## Code of Conduct

This project serves members of The Church of Jesus Christ of Latter-day Saints. Please be respectful, kind, and professional in all interactions.

- Be welcoming and inclusive
- Respect differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community

---

## Getting Started

### Prerequisites

- **Node.js** 16+ and npm
- **Git**
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/meeting-program.git
   cd meeting-program
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Navigate to http://localhost:8000/meeting-program/

---

## Development Workflow

### Branching Strategy

- `master` - Production branch (deployed to GitHub Pages)
- `develop` - Development branch (all features merge here first)
- `feature/*` - Feature branches (branch from `develop`)
- `bugfix/*` - Bug fix branches (branch from `develop`)

### Creating a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in your feature branch
2. Follow the [Coding Standards](#coding-standards)
3. Write or update tests as needed
4. Run linting and tests locally
5. Commit your changes with clear messages

---

## Testing

### Running Tests

```bash
# Run unit tests
npm test

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Writing Tests

- **Unit tests:** Use Vitest, place in `test/` directory
- **E2E tests:** Use Playwright, place in `e2e/scenarios/`
- Aim for 80%+ code coverage
- Test edge cases and error conditions

### Test Naming Conventions

```javascript
// Unit tests
describe('Module Name', () => {
  describe('functionName()', () => {
    test('should do something specific', () => {
      // ...
    });
  });
});

// E2E tests
test.describe('Feature Name', () => {
  test('should complete user flow', async ({ page }) => {
    // ...
  });
});
```

---

## Coding Standards

### JavaScript

- Use **ES6 modules** (`import`/`export`)
- Use **const** and **let**, never `var`
- Use **arrow functions** for callbacks
- Use **async/await** instead of promises when possible
- **No semicolons** (enforced by Prettier)
- **2-space indentation**

### Code Style

We use ESLint and Prettier to enforce code style:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Fix formatting
npm run format
```

### Security

- **Always sanitize user input** using `sanitize.js`
- **Validate URLs** before using them
- **Never use `innerHTML`** with unsanitized data
- **Use `textContent`** or DOM methods instead

### File Organization

```
meeting-program/
├── js/              # JavaScript modules
│   ├── main.js      # Main application logic
│   ├── profiles.js  # Profile management
│   ├── qr.js        # QR code scanning
│   └── sanitize.js  # Input sanitization
├── css/             # Stylesheets
│   └── styles.css   # Main stylesheet
├── e2e/             # End-to-end tests
│   ├── scenarios/   # Test scenarios
│   ├── fixtures/    # Test data
│   └── helpers/     # Test utilities
├── test/            # Unit tests
└── index.html       # Main HTML file
```

---

## Submitting Changes

### Before Submitting

1. **Run all tests:**
   ```bash
   npm test
   npm run test:e2e
   ```

2. **Run linting:**
   ```bash
   npm run lint
   npm run format:check
   ```

3. **Test manually** in your browser

4. **Update documentation** if needed (README, FAQ, etc.)

### Creating a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub:
   - Base: `develop`
   - Compare: `feature/your-feature-name`

3. **Fill out the PR template:**
   - Describe what changed and why
   - Link to any related issues
   - Include screenshots for UI changes
   - List any breaking changes

4. **Wait for review:**
   - Address any feedback
   - Make requested changes
   - Push updates to your branch

### Commit Message Guidelines

Use clear, descriptive commit messages:

```
feat: Add share program via link feature
fix: Resolve camera permission issue on iOS
docs: Update FAQ with installation instructions
test: Add E2E tests for program switching
refactor: Extract CSV parsing into separate module
style: Fix linting issues in main.js
```

Prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `style:` - Code style changes (formatting, etc.)
- `chore:` - Build process or tooling changes

---

## Deployment

### Deployment Process

The app is deployed to GitHub Pages automatically:

1. **Merge to `develop`** for testing
2. **Create PR from `develop` → `master`** when ready to deploy
3. **Merge to `master`** triggers automatic deployment
4. **GitHub Actions** builds and deploys to https://khilghard.github.io/meeting-program/

### Manual Deployment

If needed, you can manually trigger deployment:

1. Ensure you're on the `master` branch
2. Push to GitHub
3. GitHub Actions will automatically deploy

---

## Project Structure

### Key Files

- **`index.html`** - Main HTML structure
- **`js/main.js`** - Application entry point and main logic
- **`js/profiles.js`** - Multi-program management
- **`js/qr.js`** - QR code scanning functionality
- **`js/sanitize.js`** - Input sanitization and security
- **`css/styles.css`** - All application styles
- **`service-worker.js`** - PWA offline support
- **`manifest.webmanifest`** - PWA configuration

### Dependencies

- **Production:** `express` (dev server only)
- **Development:**
  - `vitest` - Unit testing
  - `@playwright/test` - E2E testing
  - `eslint` - Linting
  - `prettier` - Code formatting
  - `husky` - Git hooks
  - `jsdom` - DOM testing environment

---

## Common Tasks

### Adding a New Feature

1. Create a feature branch
2. Implement the feature
3. Write unit tests
4. Write E2E tests if needed
5. Update documentation
6. Submit a pull request

### Fixing a Bug

1. Create a bugfix branch
2. Write a failing test that reproduces the bug
3. Fix the bug
4. Verify the test passes
5. Submit a pull request

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update a specific package
npm update package-name

# Update all packages (carefully!)
npm update

# Run tests after updating
npm test
npm run test:e2e
```

---

## Getting Help

- **Questions?** Open a [GitHub Discussion](https://github.com/khilghard/meeting-program/discussions)
- **Bug reports:** Open a [GitHub Issue](https://github.com/khilghard/meeting-program/issues)
- **Feature requests:** Open a [GitHub Issue](https://github.com/khilghard/meeting-program/issues) with the "enhancement" label

---

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](LICENSE)).

---

Thank you for contributing! 🎉

