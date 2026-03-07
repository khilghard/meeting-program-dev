# 📘 meeting-program

[![GitHub Pages](https://img.shields.io/badge/Host-GitHub%20Pages-blue)](https://khilghard.github.io/meeting-program)
[![GitHub Release](https://img.shields.io/github/v/release/khilghard/meeting-program)](https://github.com/khilghard/meeting-program/releases)
[![License](https://img.shields.io/github/license/khilghard/meeting-program)](LICENSE)

Provides meeting notes highlighting the program for the day. Hosted on a GitHub Page and pulling data dynamically from Google Sheets. Designed for use on phones and tablets during sacrament meetings via QR code.

The challenge this program solves:

1. Need a small hosting location, ready to be a PWA on a phone or tablet at no cost
2. Need a way to give people access to private data that is private to the unit (non-public information), also at no cost
3. Need to be able to update the data in real time, and have it automatically updated on the website without manual intervention.

The solution was:

1. Github pages (since we are not expecting much traffic)
2. Google Sheets for the CSV, as we can keep the data private as you need the exact url to view the information.
3. A PWA that can be used offline and updated in real time.

---

## 🚀 Quick Start

1. Open the app: **https://khilghard.github.io/meeting-program**
2. Scan your program's QR code
3. That's it!

Your program loads automatically. The app works offline and remembers your last program.

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [What's New in v2.2.0](#-whats-new-in-v220)
- [Site Assets](#️-site-assets)
- [Multi-Language Support](#-multi-language-support)
- [Installing the App as PWA](#-installing-the-app-as-pwa)
- [Hosting on GitHub](#-hosting-on-github)
- [Development](#-development)
- [Testing](#-testing)
- [Feature Work](#-feature-work)
- [Deploying](#-deploying)
- [Google Sheets Setup](#-google-sheets-setup-for-normal-users)
- [Keys & Values Reference](#-keys--values-reference)
- [Create a QR Code](#-5-create-a-qr-code-for-the-csv-link)
- [Load the Sheet](#-6-load-the-sheet-in-the-app)
- [Updating the Program](#-7-updating-the-program)
- [Privacy & Safety](#-8-privacy--safety-notes)
- [Security & Sanitization](#-security--sanitization)
- [Setting Up the Next Meeting](#-setting-up-the-next-meeting)
- [Example Sheets](#-example-google-sheets-structure)
- [Troubleshooting](#-troubleshooting)
- [What's New in v2.0](#-whats-new-in-v20)
- [Migration from v1.x](#migration-from-v1x)

---

## 🆕 What's New in v2.2.0

**Version 2.2.0** (Released March 4, 2025) brings performance and usability improvements:

- **Enhanced PWA Support** — Better service worker caching and lifecycle management
- **Installation Promotion** — Prompts to install the app on your home screen (iOS & Android)
- **Performance Optimizations** — Faster initial load times, optimized CSS, reduced bundle size
- **Accessibility Improvements** — Better keyboard navigation, improved screen reader support, enhanced ARIA labels
- **Storage Improvements** — Better handling of IndexedDB initialization and legacy data migration

**For upgrading from v2.0 or v2.1:** Your data will be automatically migrated. No action needed.

---

## 🛠️ Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
npm install
```

### Commands

| Command                 | Description                  |
| ----------------------- | ---------------------------- |
| `npm run dev`           | Run local development server |
| `npm run lint`          | Check code style             |
| `npm run lint:fix`      | Auto-fix lint issues         |
| `npm run format`        | Auto-format code             |
| `npm run format:check`  | Check formatting             |
| `npm test`              | Run unit tests               |
| `npm run test:run`      | Run unit tests once          |
| `npm run test:coverage` | Run tests with coverage      |
| `npm run test:e2e`      | Run E2E tests                |
| `npm run test:e2e:ui`   | Open Playwright UI           |

### Tech Stack

- Vanilla JavaScript (ES Modules)
- [Vitest](https://vitest.dev/) - Unit testing
- [Playwright](https://playwright.dev/) - E2E testing
- IndexedDB - Offline data storage
- Service Worker - PWA capabilities

## 🖼️ Site Assets

Local units should **not** use official Church wordmarks or copyrighted branding.  
This program avoids those assets and focuses on simple, readable, unit‑generated content.

The program is intended for:

- Members attending in person
- Quick access via QR code
- Mobile‑friendly display
- Weekly updates without redeployment

---

## 🌍 Multi-Language Support

The app supports 4 languages:

| Language | Code  | Display Name |
| -------- | ----- | ------------ |
| English  | `en`  | English      |
| Spanish  | `es`  | Español      |
| French   | `fr`  | Français     |
| Swahili  | `swa` | Kiswahili    |

### Changing Language

1. Tap the language selector dropdown (next to the dark mode toggle 🌓)
2. Select your preferred language
3. The app will reload with the new language

Your language preference is saved automatically for future visits.

### How It Works

- **UI Labels** (Opening Hymn, Invocation, Benediction, etc.) are automatically translated
- **Program Content** (speaker names, hymn titles, announcements) comes from your Google Sheet
- The app supports two CSV formats:
  - **Simple format**: `key,value` (English only)
  - **Multi-language format**: `key,en,es,fr,swa` (all 4 languages)

### Multi-Language CSV Format

To provide program content in multiple languages, use the extended CSV format:

```csv
key,en,es,fr,swa
unitName,Riverview Branch,Rama Riverview,Branche Riverview,Tawi la Riverview
openingHymn,#1001 Come Thou Fount,#1001 Ven Ti Fount,#1001 Venez Source,#1001 Yesu Ni
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
```

**Fallback behavior**: If a cell is empty for the selected language, the English value is used instead.

### Official Church Names

The app displays the official Church name in each language:

| Language | Church Name                                                |
| -------- | ---------------------------------------------------------- |
| English  | The Church of Jesus Christ of Latter-day Saints            |
| Spanish  | La Iglesia de Jesucristo de los Santos de los Últimos Días |
| French   | L'Église de Jésus-Christ des Saints des Derniers Jours     |
| Swahili  | Kanisa La Yesu Kristo La Watakatifu wa Siku za Mwisho      |

---

## 📱 Installing the App as PWA

The app can be installed on your home screen just like a native app. This gives you quick access without opening a browser.

### On Android (Chrome)

1. Open the app: https://khilghard.github.io/meeting-program
2. Tap the **three dots menu** (⋮) at the top right
3. Select **"Add to Home screen"** or **"Install app"**
4. Tap **"Install"**
5. The app icon appears on your home screen

**Tip:** The app may also show an installation prompt automatically on first visit.

### On iPhone/iPad (Safari)

1. Open the app: https://khilghard.github.io/meeting-program
2. Tap the **Share button** (square with arrow) at the bottom
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"**
5. The app icon appears on your home screen

**Note:** On iOS, the app works best in "standalone" mode (appears full-screen without Safari UI).

### Benefits of Installing

- **Quick access** from your home screen
- **Offline access** to programs you've viewed
- **No browser chrome** — app looks native
- **Fast loading** — app launches instantly
- **Works without internet** — uses cached data

---

## 🌐 Hosting on GitHub

The page is hosted as a GitHub Pages project site:

```
https://khilghard.github.io/meeting-program/
```

GitHub Pages automatically builds and deploys the site after merges into `master`.

Learn more:

> GitHub Pages allows you to publish static websites directly from a repository.

---

## 🧪 Debugging Locally

To run the site locally with the same `/meeting-program/` path structure as GitHub Pages:

```bash
npm run dev
```

Then open:

```
http://localhost:8000/meeting-program/
```

---

## 🧪 Testing

### End-to-End (E2E) Tests

We use [Playwright](https://playwright.dev/) for E2E testing to ensure critical user flows work as expected.

To run tests:

```bash
npm run test:e2e
```

Other test commands:

- `npm run test:e2e:ui`: Open Playwright UI
- `npm run test:e2e:debug`: Run tests in debug mode
- `npm run test:e2e:headed`: Run tests with visible browser

### Unit Tests

We use [Vitest](https://vitest.dev/) for unit testing our core logic.

To run unit tests:

```bash
npm test
```

---

## 🌱 Feature Work

1. Branch from `develop`
2. Implement your feature
3. Push your branch
4. Open a pull request back into `develop`

This keeps `master` clean and deploy‑ready.

---

## 🚀 Deploying

To deploy:

1. Open a pull request from `develop` → `master`
2. Merge the PR
3. GitHub Actions runs the `pages-build-deployment` workflow
4. The site updates automatically

Learn more:

> GitHub Actions automates CI/CD workflows, including GitHub Pages deployments.

---

## 📊 Google Sheets Setup (For Normal Users)

This section explains how to create your own Google Sheet, format it correctly, share it safely, and generate the link needed for the QR code. Anyone in your unit can follow these steps — no technical background required.

---

### 📝 1. Create Your Google Sheet

1. Go to **https://sheets.google.com**
2. Click **Blank**
3. Rename the sheet (e.g., “Sacrament Program”)
4. Create two columns:

```
A: key
B: value
```

Your sheet should look like:

| key         | value                    |
| ----------- | ------------------------ |
| unitName    | Your Ward Name           |
| unitAddress | 123 Main St, City, State |
| date        | January 1, 2026          |
| openingHymn | #62 All Creatures…       |
| …           | …                        |

You can copy/paste the example table below directly into your sheet.

---

### 🧩 2. Follow the Required Format

The app expects:

- **Column A** → the key (e.g., `unitName`, `speaker1`, `closingHymn`)
- **Column B** → the value (what appears in the program)

Guidelines:

- No extra columns
- No blank rows in the middle
- Delete rows you don’t need
- Keep keys exactly as shown (case‑sensitive)

---

### 🔒 3. Set Sharing Permissions Correctly

Your sheet must be viewable by anyone who scans your QR code — but **not editable**.

Steps:

1. Click **Share** (top‑right)
2. Select **Anyone with the link**
3. Set permission to **Viewer**
4. Copy the link (you’ll need it next)

This ensures:

- Members can load the program
- Only authorized editors can make changes

---

### 🔗 4. Convert the Sheet to a CSV Export Link

The app does **not** use the normal Google Sheets link.  
It needs a special CSV export link.

#### How to get it:

1. Look at your sheet’s URL:

```
https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
```

2. Copy the ID between `/d/` and `/edit`:

```
ABC123XYZ
```

3. Build the CSV link:

```
https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
```

This is the link your PWA loads.

**NOTE: Turn the google sheets link into your QR code. This is the QR code that you scan after the website loads. You click on the `Scan QR Code` button and point your camera at the Google Sheet QR code to load the program data.**

---

## 🧩 Keys & Values Reference

The meeting program is generated entirely from the **key/value pairs** in your Google Sheet.  
Each row represents one piece of information the app will display.

This section explains:

- What each key means
- What type of value it expects
- How it appears in the program
- Whether it is optional or required

This helps both technical and non‑technical users build sheets confidently.

---

### 📘 How Keys Work

- **Keys** are fixed identifiers the app recognizes (e.g., `unitName`, `speaker1`, `openingHymn`).
- **Values** are the text you want displayed in the program.
- Keys must be **spelled exactly** as shown — they are case‑sensitive.
- You can include as many or as few rows as you want.
- Rows appear in the program **in the same order** they appear in your sheet.

---

### 🗂️ Key Categories

To make things easier, keys fall into several groups:

1. **Unit Information**
2. **Program Structure**
3. **Speakers & Hymns**
4. **Leaders**
5. **Links & Resources**
6. **General Statements**
7. **Section Breaks**

Each group is explained below.

---

### 1️⃣ Unit Information

These keys define the header of the program.

| Key           | Description                  | Example Value             | Required |
| ------------- | ---------------------------- | ------------------------- | -------- |
| `unitName`    | Name of your ward/branch     | “Maplewood Ward”          | Yes      |
| `unitAddress` | Meetinghouse address         | “123 Main St, City, ST”   | Yes      |
| `date`        | Date of the meeting          | “January 1, 2026”         | Yes      |
| `link`        | A link to your unit homepage | `Homepage \| https://...` | Optional |
| `speaker4`    | A speaker in the meeting     | John Smith                | Optional |

**Notes:**

- Use `|` to separate link text from the URL.
- The app formats these automatically.

---

### 2️⃣ Program Structure

These keys define who is conducting, presiding, and directing music.

| Key             | Description       | Example Value   |
| --------------- | ----------------- | --------------- |
| `presiding`     | Who is presiding  | “Bishop Smith”  |
| `conducting`    | Who is conducting | “Brother Jones” |
| `musicDirector` | Music director    | “Sister Brown”  |
| `musicOrganist` | Organist          | “Brother Lee”   |

All optional — include only what your unit uses.

---

### 3️⃣ Speakers & Hymns

These keys define the main flow of the meeting.

| Key                | Description       | Example Value                           |
| ------------------ | ----------------- | --------------------------------------- |
| `openingHymn`      | Opening hymn      | “#62 All Creatures of Our God and King” |
| `openingPrayer`    | Opening prayer    | “By Invitation”                         |
| `sacramentHymn`    | Sacrament hymn    | “#188 Thy Will, O Lord, Be Done”        |
| `speaker1`         | First speaker     | “Sister Johnson”                        |
| `speaker2`         | Second speaker    | “Elder Brown”                           |
| `speaker3`         | Third speaker     | “Youth Speaker”                         |
| `intermediateHymn` | Intermediate hymn | “#228 My Heavenly Father Loves Me”      |
| `closingHymn`      | Closing hymn      | “#2 Praise to the Lord, the Almighty”   |
| `closingPrayer`    | Closing prayer    | “By Invitation”                         |

**Notes:**

- You can add as many speakers as you want (`speaker1`, `speaker2`, `speaker3`, etc.).
- Hymns can include numbers, titles, or both.

---

### 4️⃣ Leaders

These rows list leadership information at the bottom of the program.

| Key      | Description                                | Example Value                          |
| -------- | ------------------------------------------ | -------------------------------------- |
| `leader` | A leader’s name, calling, and phone number | `John Doe \| Bishop \| (000) 000-0000` |

_Note:_ The phone number field requires a value of some kind. It can be “None” or “N/A” for those who prefer not to share it.

**Notes:**

- You can include as many `leader` rows as you want.
- Use `|` to separate name, calling, and phone.
- Phone numbers are required, but are text fields and any value can be placed there.

---

### 5️⃣ Links & Resources

These keys create rows with icons, text, and links.

| Key             | Description                | Example Value                                              |
| --------------- | -------------------------- | ---------------------------------------------------------- |
| `linkWithSpace` | A link with optional image | `<IMG> Gospel Library \| https://... \| https://image-url` |

**Notes:**

- `<IMG>` tells the app to show an icon.
- If no image is available, use `NONE`.

---

### 6️⃣ General Statements

These are flexible text rows used for announcements, events, or notes.

| Key                        | Description      | Example Value                             |
| -------------------------- | ---------------- | ----------------------------------------- |
| `generalStatement`         | Plain text       | “Wednesdays 7pm: Activity Night”          |
| `generalStatementWithLink` | Text with a link | `Lesson: January 1 <LINK> \| https://...` |

**Notes:**

- Use `<LINK>` to indicate where the link should appear.

---

### 7️⃣ Section Breaks

These create labeled dividers in the program.

| Key              | Description      | Example Value   |
| ---------------- | ---------------- | --------------- |
| `horizontalLine` | A section header | “Announcements” |

**Notes:**

- The value becomes the section title.
- You can use as many as you want.

---

### 🎯 Tips for Setting Values

- Use `~` in place of commas. This is a comma separated document, so adding commas will cause the program to split your text into a new column.
- Use `|` to separate multiple fields in a single value.
- Keep keys simple and lowercase.
- Delete rows you don’t need — the app ignores missing keys.
- The order of rows in your sheet is the order shown in the program.

---

## 📱 5. Create a QR Code for the CSV Link

You can use any QR generator.

### Command‑line example:

```bash
qrencode -s 6 -l H -o "sheet-url.png" "https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv"
```

### Online generators:

- https://www.qr-code-generator.com/
- https://www.qrstuff.com/

Paste the CSV link into the generator.

---

## 📥 6. Load the Sheet in the App

1. Open the meeting program app
2. Tap **Scan QR Code**
3. Scan your Google Sheets QR code
4. The app loads your program automatically

The app remembers your sheet URL until you reset it.

---

## 🔄 7. Updating the Program

Any time you update the Google Sheet:

- The app loads the new data on refresh
- No new QR code needed
- No redeployment needed

This makes weekly updates simple for clerks, presidencies, or music directors.

---

## 🛡️ 8. Privacy & Safety Notes

- Avoid listing minors by name
- Use public callings only
- The phone number field needs text of some kind; use “N/A” when the member would like to keep it private
- Alternately, use an email address for the phone number field
- Keep the sheet **view‑only** for the public
- Share edit access only with trusted leaders

---

# 🛡️ Security & Sanitization

Because the app loads data directly from a Google Sheet, all content is treated as **untrusted input**. To protect members and prevent malicious or accidental breakage, the app uses a strict sanitization pipeline.

This ensures:

- No JavaScript can run
- No HTML can be injected
- No unsafe URLs can load
- No layout‑breaking markup can appear
- Only safe, expected content is rendered

Below is a clear explanation of what **will** work and what **will not** work.

---

## ✔️ What _Will_ Work

### **Normal text**

- Names
- Hymn titles
- Callings
- Announcements
- Unicode characters
- Accents
- Emojis
- Punctuation

### **Hymn formatting**

```
#62 All Creatures of Our God and King
#188 Thy Will~ O Lord, Be Done
```

### **Leadership formatting**

```
John Doe | Bishop | (000) 000-0000
```

### **Section headers**

```
Announcements
Branch or Stake Business
```

### **Links**

```
Homepage | https://example.com
```

### **Links with images**

```
<IMG> Gospel Library | https://... | https://image-url
```

### **Placeholders**

- `<LINK>`
- `<IMG>`

These are explicitly allowed.

### **Dynamic keys**

- `speaker1`, `speaker2`, etc.
- `intermediateHymn1`, `intermediateHymn2`, etc.

---

## ❌ What _Will Not_ Work

### **HTML tags**

These are stripped:

- `<b>bold</b>` → `bold`
- `<i>italic</i>` → `italic`
- `<div>stuff</div>` → `stuff`

### **JavaScript injection**

Blocked:

- `<script>alert(1)</script>`
- `<img src=x onerror=alert(1)>`
- `<a href="javascript:alert(1)">Click</a>`

### **Inline event handlers**

Blocked:

- `onclick="alert(1)"`
- `onload="evil()"`

### **HTML entities that decode into tags**

Blocked:

- `&lt;script&gt;alert(1)&lt;/script&gt;`

### **Unsafe URLs**

Only `http://` and `https://` are allowed.

Blocked:

- `javascript:alert(1)`
- `data:text/html;base64,...`
- `file:///etc/passwd`

### **Embedded HTML formatting**

These will no longer work:

- `<br>`
- `<span>`
- `<strong>`
- `<em>`

Use plain text only.

### **Extra columns or unknown keys**

Unknown keys are ignored.

### **Rich text from Google Sheets**

Bold, colors, hyperlinks, and formatting do **not** carry over.

---

## 📝 Tips for Safe Content

- Use plain text
- Use `|` to separate fields
- Use `<LINK>` and `<IMG>` only where documented
- Use `~` for commas. Google Sheets will import as a comma separated document. Using a comma denotes a third or fourth column which will be ignored during parsing.
- Always start URLs with `https://`

---

## 🗓️ Setting Up the Next Meeting

Many units prefer **not** to share future meeting details with members until the day of the meeting. The easiest way to manage this is to maintain **two Google Sheets**:

1. **A private “working” sheet** — where you prepare next week’s program
2. **Your public sheet** — the one members access through the QR code

Here’s the recommended workflow:

### 1. Prepare next week’s program privately

Create a separate Google Sheet (not shared publicly) and follow the same setup steps described in the Google Sheets section.  
Use this sheet to draft:

- Speakers
- Hymns
- Announcements
- Leadership updates
- Any other program details

You can load this private sheet into your app by:

1. Opening the app
2. Tapping **Use New QR Code**
3. Scanning the QR code for your private sheet

The app will load your draft program so you can preview and refine it.

### 2. Finalize the program before Sunday

On Saturday night or Sunday morning:

1. Select all rows from your private sheet
2. Copy them into your **public** Google Sheet (the one shared with members)
3. Save the sheet

This updates the program that members will see.

### 3. Verify the public program

To ensure everything is correct:

1. Open the app
2. Tap **Use New QR Code**
3. Scan the QR code for your **public** sheet
4. Confirm the program loads correctly

This guarantees that the program members see on Sunday matches what you intended.

---

## 📋 Example Google Sheets Structure

| key              | en                                                                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unitName         | Unit Name                                                                                                                                                                                                                     |
| stakeName        | Stake Name                                                                                                                                                                                                                    |
| unitAddress      | 123 Actual Ave~ City US 123245                                                                                                                                                                                                |
| link             | Homepage \| <OfficialHomePageLink>                                                                                                                                                                                            |
| date             | January 1~ 2026                                                                                                                                                                                                               |
| presiding        | Leader1                                                                                                                                                                                                                       |
| conducting       | Leader2                                                                                                                                                                                                                       |
| musicDirector    | Person1                                                                                                                                                                                                                       |
| musicOrganist    | Person2                                                                                                                                                                                                                       |
| horizontalLine   | Announcements                                                                                                                                                                                                                 |
| openingHymn      | #62 All Creatures of Our God and King                                                                                                                                                                                         |
| openingPrayer    | By Invitation                                                                                                                                                                                                                 |
| horizontalLine   | Branch or Stake Business                                                                                                                                                                                                      |
| sacramentHymn    | #188 Thy Will~ O Lord~ Be Done                                                                                                                                                                                                |
| horizontalLine   | Ordinance of the Sacrament                                                                                                                                                                                                    |
| speaker1         | Speaker One                                                                                                                                                                                                                   |
| speaker2         | Speaker Two                                                                                                                                                                                                                   |
| intermediateHymn | #228 (CS) My Heavenly Father Loves Me                                                                                                                                                                                         |
| speaker3         | Speaker Three                                                                                                                                                                                                                 |
| speaker4         | Speaker Four                                                                                                                                                                                                                  |
| closingHymn      | #2 Praise to the Lord~ the Almighty                                                                                                                                                                                           |
| closingPrayer    | By Invitation                                                                                                                                                                                                                 |
| horizontalLine   | Dismiss to Class                                                                                                                                                                                                              |
| horizontalLine   | Local Leaders                                                                                                                                                                                                                 |
| leader           | John Doe \| Bishop \| (000) 000-0000                                                                                                                                                                                          |
| leader           | John Smith \| 1st Councilor \| (000) 000-0000                                                                                                                                                                                 |
| leader           | John Michaels \| 2nd Councilor \| (000) 000-0000                                                                                                                                                                              |
| leader           | John Miles \| Executive Secretary \| (000) 000-0000                                                                                                                                                                           |
| leader           | John Red \| Ward Clerk \| (000) 000-0000                                                                                                                                                                                      |
| horizontalLine   | Auxiliary Leaders                                                                                                                                                                                                             |
| leader           | Peter Smith \| Elders Quorum President \| (000) 000-0000                                                                                                                                                                      |
| leader           | Jane Doe \| Relief Society Presient \| (000) 000-0000                                                                                                                                                                         |
| leader           | Michael Smith \| Sunday School President \| (000) 000-0000                                                                                                                                                                    |
| leader           | Mary Smith \| Young Women's President \| (000) 000-0000                                                                                                                                                                       |
| leader           | Ruth Smith \| Primary President \| (000) 000-0000                                                                                                                                                                             |
| horizontalLine   | Other Leaders                                                                                                                                                                                                                 |
| leader           | Thomas Smith \| Branch Mission Leader \| (000) 000-0000                                                                                                                                                                       |
| leader           | Hyrum Smith \| FamilySearch Center Director \| (000) 000-0000                                                                                                                                                                 |
| horizontalLine   | LDS Apps                                                                                                                                                                                                                      |
| linkWithSpace    | <IMG> Gospel Library \| https://www.churchofjesuschrist.org/learn/mobile-applications/gospel-library?lang=eng \| https://www.churchofjesuschrist.org/imgs/2fc43d5ac50d11ed9c00eeeeac1e68389ccf488f/full/!200%2C200/0/default  |
| linkWithSpace    | <IMG> Gospel Stream App \| https://www.churchofjesuschrist.org/learn/gospel-stream-mobile-and-ott-app?lang=eng \| https://www.churchofjesuschrist.org/imgs/1defb046330311eebde7eeeeac1e2458428d21d7/full/!200%2C200/0/default |
| linkWithSpace    | <IMG> Gospel Living \| https://www.churchofjesuschrist.org/youth/childrenandyouth/gospel-living-app?lang=eng \| https://www.churchofjesuschrist.org/imgs/8c92e16db3ab7e9219ca543fc04c58d77a968c3                              |

---

## 📋 Example Multi-Language Google Sheets Structure

To provide program content in multiple languages, use the extended CSV format with language columns:

```csv
English Term,Spanish,French,Swahili
Announcements,Anuncios,Annonces,Matangazo
Branch or Stake Business,Asuntos de la rama o de la estaca,Affaires de la branche ou du pieu,Shughuli za Tawi au Kigingi
Ward or Stake Business,Asuntos del barrio o de la estaca,Affaires de la paroisse ou du pieu,Shughuli za Kata au Kigingi
Ordinance of the Sacrament,Ordenanza de la Santa Cena,Ordonnance de la Sainte-Cène,Ordinansi ya Sakramenti
Bearing of Testimonies,Expresión de testimonios,Partage de témoignages,Kutoa Ushuhuda
Dismiss to Class,Salida a las clases,Départ pour les classes,Kuruhusiwa Kwenda Darasani
Local Leaders,Líderes locales,Dirigeants locaux,Viongozi wa Mahali Hapo
Auxiliary Leaders,Líderes de las organizaciones auxiliares,Dirigeants des organisations auxiliaires,Viongozi wa Mashirika ya Usaidizi
Other Leaders,Otros líderes,Autres dirigeants,Viongozi Wengine
LDS Apps,Aplicaciones SUD,Applications SDJ,Programu za LDS
Activities and Events,Actividades y eventos,Activités et événements,Shughuli na Matukio
Other Information,Otra información,Autres informations,Habari Nyingine
Sacrament Meeting on Zoom,Reunión de la Santa Cena por Zoom,Réunion de Sainte-Cène sur Zoom,Mkutano wa Sakramenti kupitia Zoom
General Information,Información general,Informations générales,Habari za Jumla
```

### Notes:

- The first column (`key`) must always be present
- Language columns (`en`, `es`, `fr`, `swa`) are optional
- If a language column is empty, the English (`en`) value is used as fallback
- You can mix formats: some rows can have all languages, others can have only English

---

## 🔧 Troubleshooting

### Service Worker Issues

If the app isn't updating or you're seeing old versions:

1. **Uninstall the PWA** (if installed):
   - Android: Long-press app icon → "Uninstall"
   - iOS: Long-press app icon → "Remove App" → "Remove from Home Screen"

2. **Clear browser cache**:
   - Open Settings in your browser
   - Find "Clear Browsing Data" or "Clear Cache"
   - Clear all data for the site

3. **Unregister the service worker**:
   - On most browsers: Settings → Advanced → Application → Service Workers
   - Find the meeting-program worker and click "Unregister"

4. **Reload the app**:
   - Visit https://khilghard.github.io/meeting-program
   - Force refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

5. **Reinstall the PWA** (if desired)

### QR Scanner Not Working

- **Check camera permissions**: Your browser needs permission to access the camera
  - Go to Settings → Site Settings → Camera
  - Make sure the meeting-program site is allowed
- **Try manual URL entry**: Use "Enter Sheet URL Manually" button instead
- **Use good lighting**: Make sure the QR code is well-lit and in focus
- **Try a different browser**: Some browsers have better QR detection

### Program Won't Load

- **Check internet connection**: You need internet to load programs initially
- **Verify the QR code**: Make sure it scans correctly and points to a valid Google Sheet
- **Check Google Sheets settings**: Make sure the sheet is shared with "Anyone with the link" (Viewer access)
- **Check the CSV link**: Make sure it ends with `/gviz/tq?tqx=out:csv`

### Offline Mode Shows Old Program

- **This is intentional**: The app shows the last cached program when offline
- **Check your internet**: The banner should disappear when you go back online
- **Reload when online**: Tap "Try Now" to refresh the program when internet returns

### Language Not Changing

- **Check storage**: Your language preference is saved locally
- **Reload the page**: Changes may not take effect until you reload
- **Try clearing cache**: If persistent, clear browser cache for the site
- **Check supported languages**: Only English (en), Spanish (es), French (fr), and Swahili (swa) are supported

### Data Loss After Update

- **Data is usually preserved**: Updates shouldn't affect your saved programs
- **Copy another device**: If on a different device, profile data is separate. Reload the program using the share QR code from a neighbor

Still having issues? Open a GitHub issue with:
- Device and browser (e.g., "iPhone 13, Safari")
- What you were doing when the problem occurred
- Steps you've already tried
- Screenshots if possible

## 🖥️ Developer Documentation

For developers looking to contribute or understand the codebase:

- **[FEATURES.md](FEATURES.md)** — Complete list of current features and implementation details
- **[docs/REQUIREMENTS_*.md](docs/)** — Detailed specifications for each feature area
- **[js/](js/)** — Main application code
  - `main.js` — App initialization
  - `i18n/` — Internationalization (translations)
  - `data/` — IndexedDB and data management
  - `utils/` — Utilities (CSV parsing, sanitization, rendering)
- **[test/](test/)** — Unit tests with Vitest
- **[e2e/](e2e/)** — End-to-end tests with Playwright
- **[css/styles.css](css/styles.css)** — App styling and theme variables

See [Contributing Guide](CONTRIBUTING.md) for branch strategy and PR guidelines.

---

## 🆕 What's New in v2.0 & v2.1

These sections describe major improvements from earlier versions. Current version is v2.2.0 — see [What's New in v2.2.0](#-whats-new-in-v220) for latest changes.

### Offline-First Architecture (v2.0)

- **IndexedDB** replaces localStorage for reliable data persistence
- **Service Worker** caches all assets for offline use
- **Works without internet** - previous programs available offline
- **Auto-sync** when network returns

### Archive System (v2.0)

- **2 years of history** or up to 10MB of storage
- **Timeline view** — newest programs first
- **Automatic cleanup** — oldest programs removed as needed
- **Data integrity** — checksums verify archive content

### Print-Friendly (v2.0)

- **One-click print** button
- **Clean output** — no UI elements
- **Optimized layout** — easy to read

### Data Backup (v2.0)

- **Export** all data as JSON
- **Import** from backup file
- **Transfer** between devices

### Migration Guidance (v2.0)

- **Automatic detection** when programs need updating
- **Non-intrusive notifications** — doesn't interrupt service
- **"Remind Me Later"** — defers until next Sunday
- **Works offline** — migration checks run in background

### Enhanced Profile Management (v2.0)

- **Multiple wards** — switch between congregations easily
- **Visual status** — green (active), yellow (needs update), gray (archived)
- **Search/filter** — find profiles quickly
- **Language flags** — see language at a glance

### v2.1 Enhancements

- **Archives per profile** — separate history for each unit
- **Hymn website links** — click hymn numbers to see full lyrics
- **Honorific translation** — automatically translates titles like "Brother", "Sister", etc. to your language
- **Improved UI translations** — archive pages now support all 4 languages
- **Performance optimizations** — faster rendering and better caching

## Migration from v1.x

v2.0 automatically migrates your existing profiles from localStorage to IndexedDB. Your data is preserved and will be available after the update. No action required.

If you encounter any issues, you can manually export your data from v1.x and import it into v2.0 using the new backup feature.

**v2.2.0** continues to support these migrations and automatically handles any remaining legacy data.
