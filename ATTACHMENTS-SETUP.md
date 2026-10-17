# Turning on attachments

Notes can now carry files: images, PDFs, audio (mp3, wav…), video, Word, Excel, anything up to 15 MB.
Files are stored in your existing Firestore database, so this works on the free Spark plan. No Storage bucket, no billing.

## 1. Upload the new files to GitHub
Replace these three files in the repo (Add file → Upload files, then Commit):
- `app.js`
- `index.html`
- `sw.js`

GitHub Pages updates in a minute or two. Reload the app twice (the second load picks up the new version).

## 2. Add the file rules in Firebase (one time)
1. Open console.firebase.google.com → project **ubr-keep-up** → **Firestore Database** → **Rules**.
2. Open `firestore-attachments.rules` from this folder and copy everything in it.
3. Paste it into your rules **just before the last two closing braces** `}` `}` (so it sits inside `match /databases/{database}/documents { … }`).
4. Click **Publish**.

If your rules for notes only allow a fixed list of fields (look for `hasOnly([...])` in the notes section), add `'attachments'` to that list too.

## How to use it
- **Attach files** button in the note box (next to Needs follow-up), or drag files onto the box, or paste a screenshot.
- Images show as small previews on the note; tap to see them full size.
- Audio and video play right in the app; PDFs open in a viewer; anything else has a Download button.
- Editing a note lets you add or remove files. Deleting a note deletes its files.
- Files in a project are only visible to that project's members.

## Limits
- 15 MB per file. For bigger files (full-quality masters, long videos), paste a Google Drive link in the note.
- The free Firestore plan includes 1 GB of storage and 50,000 reads a day. Opening a 15 MB file uses about 25 reads,
  so a small team won't get near the limit.
