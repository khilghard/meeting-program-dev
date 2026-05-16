# ⚡ Quick Start Guide

Get your meeting program up and running in under 10 minutes.

> **Need more detail?** See the full [README.md](README.md) for complete documentation.

---

## What You Need

- A Google account
- A browser (Chrome recommended)
- The app URL: **https://khilghard.github.io/meeting-program**

---

## Step 1 — Create Your Google Sheet

1. Go to **https://sheets.google.com** and create a **Blank** spreadsheet
2. Name it something like "Sacrament Program — [Your Ward]"
3. In **Row 1**, type the headers:
   - Cell **A1**: `key`
   - Cell **B1**: `en`
4. Copy the example program below starting at **Row 2**

### Example Program (copy this into your sheet)

| key | en |
|-----|-----|
| unitName | Your Ward Name |
| unitAddress | 123 Main St, Your City, State ZIP |
| date | January 5, 2026 |
| presiding | President Smith |
| conducting | Brother Jones |
| musicDirector | Sister Nelson |
| musicOrganist | Sister Brown |
| horizontalLine | Announcements |
| openingHymn | 62 |
| openingPrayer | By Invitation |
| horizontalLine | Sacrament Meeting |
| sacramentHymn | 188 |
| sacramentLine | |
| speaker1 | Sister Williams |
| speaker2 | Brother Davis |
| closingHymn | 2 |
| closingPrayer | By Invitation |
| horizontalLine | Local Leaders |
| leader | John Doe \| Bishop \| (000) 000-0000 |
| leader | Jane Smith \| Relief Society President \| (000) 000-0000 |

> **Tip:** Replace all names, dates, and hymn numbers with your actual program. Delete any rows you don't need.

---

## Step 2 — Set Sheet Sharing

The app reads your sheet as a CSV. It needs **public read access**.

1. Click **Share** (top right in Google Sheets)
2. Click **"Anyone with the link"**
3. Set the permission to **Viewer** (not Editor)
4. Click **Done**

This keeps your data accessible to members with the link, but no one can edit it except you.

---

## Step 3 — Get the CSV Export Link

The app does **not** use the normal Google Sheets URL. You need the CSV export version.

1. Look at your sheet's URL:
   ```
   https://docs.google.com/spreadsheets/d/ABC123XYZ/edit#gid=0
   ```
2. Copy the ID between `/d/` and `/edit` (e.g., `ABC123XYZ`)
3. Build your CSV link:
   ```
   https://docs.google.com/spreadsheets/d/ABC123XYZ/gviz/tq?tqx=out:csv
   ```
4. Test it in your browser — you should see a CSV download

> **This CSV link is your program key** — keep it private. Anyone with this link can read your program data.

---

## Step 4 — Load the Program in the App

1. Open **https://khilghard.github.io/meeting-program**
2. Click **Scan QR Code** (or paste your CSV link directly)
   - If scanning: create a QR code for your CSV link at [qr.io](https://qr.io) or similar
   - If pasting: paste the CSV URL into the input field
3. Your program appears

The app saves your program for **offline use** automatically.

---

## Step 5 — Update the Program Each Week

Each week before Sunday:

1. Open your Google Sheet
2. Update names, dates, hymn numbers
3. Refresh the app — it checks for updates automatically

The app shows an "Update available" banner when new data is ready. Tap it to refresh.

---

## Optional — Use the CMS to Edit (Desktop)

Instead of editing Google Sheets directly, use the built-in CMS on your laptop or desktop:

1. Go to **https://khilghard.github.io/meeting-program/cms/**
2. First visit: click **Configure Google Settings** and enter your Google Client ID and Spreadsheet ID
3. Click **Sign in with Google** and authorize the app
4. Edit program fields using the form — no CSV syntax needed
5. Click **Save to Sheets** when done

> See [FEATURE_CMS_EDIT.md](docs/FEATURE_CMS_EDIT.md) for CMS setup details.  
> CMS is designed for desktop use on Friday/Saturday evening. Not for mobile.

---

## Key Reference (Common Keys)

| Key | What it does | Example value |
|-----|-------------|---------------|
| `unitName` | Ward/branch name | `Millcreek 5th Ward` |
| `date` | Meeting date | `January 5, 2026` |
| `presiding` | Who is presiding | `President Smith` |
| `conducting` | Who is conducting | `Brother Jones` |
| `openingHymn` | Opening hymn number | `62` |
| `speaker1`, `speaker2` | Speakers (numbered) | `Sister Williams` |
| `leader` | Leadership contact (repeatable) | `John Doe \| Bishop \| (801) 555-1234` |
| `horizontalLine` | Section divider with label | `Announcements` |
| `generalStatement` | Plain text block | `Youth activity Wednesday 7pm` |
| `photo` | Image with caption | `https://example.com/img.jpg \| Our Ward` |

> For the full key reference, see [README.md → Keys & Values Reference](README.md#-keys--values-reference).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Program won't load | Check sharing is set to "Anyone with link, Viewer" |
| CSV link gives error | Verify the spreadsheet ID is correct in the CSV URL |
| Old program showing | Tap the "Update available" banner, or pull-to-refresh |
| App stuck offline | Check your internet connection; cached version loads if offline |
| Hymn shows wrong title | Hymn numbers must match the official LDS hymnal numbers |

> More troubleshooting at [README.md → Troubleshooting](README.md#-troubleshooting).

---

## Install as an App (Optional)

On Android: tap the three-dot menu → **Add to Home screen**  
On iPhone: tap Share → **Add to Home Screen**

Once installed, the app opens full-screen and works offline.

---

**That's it!** For advanced topics (multi-language, leadership agenda, QR codes, deployment), see the full [README.md](README.md).
