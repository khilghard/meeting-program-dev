# Frequently Asked Questions (FAQ)

## Getting Started

### How do I use this app for the first time?

1. **Open the app** in your mobile browser: https://khilghard.github.io/meeting-program/
2. **Scan the Program QR Code** displayed at your meetinghouse
   - Tap the "Scan Program QR Code" button
   - Point your camera at the QR code
   - Allow camera access if prompted
3. **View the program** - It loads automatically!
4. **Install the app** (optional but recommended) - See instructions below

---

### How do I scan a QR code?

1. Tap the **"Scan Program QR Code"** button (or "Use New QR Code" if you already have a program loaded)
2. **Allow camera access** when your browser asks
3. **Point your camera** at the QR code displayed at the meetinghouse
4. The app will automatically detect and load the program

**Tip:** Make sure the QR code is well-lit and centered in your camera view.

---

### Why is my camera not working?

If you see a "Camera permission denied" error, you need to enable camera access:

#### On iPhone/iPad (Safari):

1. Go to **Settings** → **Safari** → **Camera**
2. Select **"Allow"**
3. Return to the app and try scanning again

#### On Android (Chrome):

1. Tap the **three dots menu** (⋮) in your browser
2. Go to **Settings** → **Site settings** → **Camera**
3. Find the meeting-program site and select **"Allow"**
4. Return to the app and try scanning again

---

### How do I install the app on my phone?

Installing the app gives you quick access from your home screen, just like a native app!

#### On Android:

1. Open the app in **Chrome**
2. Tap the **three dots menu** (⋮) in the top right
3. Select **"Add to Home screen"** or **"Install app"**
4. Tap **"Install"**
5. The app icon will appear on your home screen

#### On iPhone/iPad:

1. Open the app in **Safari**
2. Tap the **Share button** (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"**
5. The app icon will appear on your home screen

---

## Using the App

### How do I switch between different programs?

If you have multiple programs saved (e.g., different wards or stakes):

1. Look for the **dropdown menu** at the top of the program
2. Tap the dropdown to see all saved programs
3. Select the program you want to view
4. The app will reload with that program

---

### How do I reload/refresh the program?

To get the latest updates from the Google Sheet:

1. Tap the **"Reload Program"** button at the bottom
2. Or pull down to refresh (on some browsers)

The app automatically loads the latest data each time you open it.

---

### Can I use the app offline?

Yes! The app saves the last program you viewed, so you can access it even without internet.

If you're offline, you'll see a banner that says **"Showing last available program (offline mode)"**. Tap **"Try Now"** to check if you're back online.

---

### How do I delete a saved program?

1. Tap the **⚙️ (gear icon)** next to the program dropdown
2. Find the program you want to delete
3. Tap the **"Delete"** button
4. Confirm the deletion

**Note:** You can't delete the currently active program. Switch to a different program first, then delete the old one.

---

### How do I enable dark mode?

Tap the **🌓 (moon icon)** in the top right corner to toggle between light and dark themes.

Your preference is saved automatically.

---

### How do I change the language?

Tap the language dropdown (next to the dark mode toggle) and select your preferred language:

- English
- Español (Spanish)
- Français (French)
- Kiswahili (Swahili)

Your language preference is saved automatically for future visits.

---

### Can I have a program in Spanish, French, or Swahili?

Yes! The app supports multi-language programs. You can provide program content in all four languages using the extended CSV format:

```csv
key,en,es,fr,swa
openingHymn,#1001 Come Thou Fount,#1001 Ven Ti Fount,#1001 Venez Source,#1001 Yesu Ni
speaker1,John Smith,Juan Garcia,Jean Dupont,Yohana Mto
```

If a cell is empty for the selected language, the English value is used as fallback.

See the [README.md](README.md#-example-multi-language-google-sheets-structure) for a complete example.

---

## Troubleshooting

### The program won't load. What should I do?

1. **Check your internet connection** - The app needs internet to load new programs
2. **Make sure the QR code is correct** - It should be a Google Sheets URL
3. **Try reloading** - Tap the "Reload Program" button
4. **Check the Google Sheet** - Make sure it's shared as "Anyone with the link can view"

---

### I scanned the QR code but nothing happened

1. **Check camera permissions** - See "Why is my camera not working?" above
2. **Make sure the QR code is valid** - It should be a Google Sheets URL
3. **Try scanning again** - Sometimes it takes a second try
4. **Check for errors** - Look for any error messages on screen

---

### The program looks wrong or incomplete

1. **Check the Google Sheet** - Make sure all data is entered correctly
2. **Reload the program** - Tap "Reload Program" to fetch fresh data
3. **Check for special characters** - Use `~` instead of commas in the Google Sheet

---

### How do I report a bug or request a feature?

Please open an issue on our GitHub repository:
https://github.com/khilghard/meeting-program/issues

Include:

- What you were trying to do
- What happened instead
- Your device and browser (e.g., "iPhone 12, Safari")
- Screenshots if possible

---

## For Program Coordinators

### How do I create a Google Sheet for my ward/stake?

See the detailed guide in the [README.md](README.md#-google-sheets-setup-for-normal-users).

Quick summary:

1. Create a Google Sheet with columns: `key` (and optionally `en`, `es`, `fr`, `swa` for multi-language)
2. Fill in your program data (see example in README)
3. Share the sheet as "Anyone with the link can view"
4. Convert the sheet URL to a CSV export link
5. Generate a QR code from the CSV link
6. Display the QR code at your meetinghouse

---

### How do I update the program each week?

1. Open your Google Sheet
2. Update the data (speakers, hymns, date, etc.)
3. Save the sheet
4. That's it! Users will see the updates next time they reload

**No new QR code needed!** The same QR code works every week.

---

### Can I have multiple people editing the Google Sheet?

Yes! Share edit access with trusted leaders (bishopric, clerk, music director, etc.).

Make sure regular members only have "view" access to the QR code link.

---

### How do I view past programs (history)?

The app automatically saves programs you load, so you can view them later:

1. Look for the **📜 (scroll) icon** in the header
2. Tap it to open the **Program History** modal
3. Select any past program from the list
4. The app loads that program for you

**Note:** History is saved per profile (per unit). Each unit's history is stored separately. Programs from the last 1-2 years are kept, depending on data size.

---

### How do I manage multiple programs?

If you have multiple units or wards, you can save each one:

1. Tap the **profile dropdown** (shows current program name at top)
2. Tap **"Manage Programs"** (⚙️ icon)
3. You can:
   - **Switch** between saved programs
   - **Delete** unused programs
   - **Add** new programs by scanning a QR code

**Note:** You cannot delete the currently active program. Switch to a different one first.

---

### Can I restore a deleted program?

Yes! If you delete a program by mistake:

1. Tap the **profile dropdown**
2. Look for **inactive programs** (shown as "archived" or grayed out)
3. Tap **"Reactivate"** to bring it back

This only works if you're still in the same browser/device. If you clear app data, cannot recover deleted programs.

---

## Privacy & Security

### Is my data private?

Yes! All program data is stored only on your device (in your browser). Nothing is sent to our servers.

The Google Sheet is only accessible to people who have the QR code link.

---

### What data does the app collect?

The app does not collect any personal data. It only stores on your device:

- Google Sheet URLs (for saved programs)
- Program content (displayed in the meetinghouse)
- Program history (past programs you loaded)
- Theme preference (light or dark mode)
- Language preference (English, Spanish, French, or Swahili)
- Installation status (for PWA on home screen)

**Everything is stored locally** in your browser using IndexedDB. Nothing is sent to our servers or any third party.

---

### How is my data protected?

- All program data is **sanitized** before displaying to prevent malicious scripts
- Only secure `https://` URLs are allowed
- No external scripts or tracking software
- No ads or analytics
- Your Google Sheet URL is private — only people with the QR code can access it

---

## Still Have Questions?

If your question isn't answered here, please:

1. Check the [README.md](README.md) for detailed documentation
2. Open an issue on [GitHub](https://github.com/khilghard/meeting-program/issues)
3. Contact the project maintainer
