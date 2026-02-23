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
1. Create a Google Sheet with two columns: `key` and `value`
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

## Privacy & Security

### Is my data private?

Yes! All program data is stored only on your device (in your browser). Nothing is sent to our servers.

The Google Sheet is only accessible to people who have the QR code link.

---

### What data does the app collect?

The app does not collect any personal data. It only stores:
- Google Sheet URLs (on your device only)
- Program names (on your device only)
- Theme preference (on your device only)

---

## Still Have Questions?

If your question isn't answered here, please:
1. Check the [README.md](README.md) for detailed documentation
2. Open an issue on [GitHub](https://github.com/khilghard/meeting-program/issues)
3. Contact the project maintainer

