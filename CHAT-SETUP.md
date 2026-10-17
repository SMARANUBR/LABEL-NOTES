# Chat setup

Chat (private chats, group rooms and threads) needs one extra block of Firestore rules.

1. Firebase console → Firestore Database → Rules.
2. Paste the contents of `firestore-chat.rules` directly **below** the `// ===== end of attachments =====` line
   (it reuses the `ubrOnTeam()` and `ubrEmail()` helpers from the attachments block).
3. Click **Publish**.

Until then the Chat page shows "Chat isn't switched on yet". Notes, mentions and attachments work without it.

How it's stored:
- `rooms/{id}`: `type` ("dm" or "group"), `name`, `members` (emails), `last` message preview, `seen` (per-user read time).
- `rooms/{id}/messages/{id}`: the main chat.
- `rooms/{id}/threads/{id}` and `.../threads/{id}/messages/{id}`: threads. Saved messages are copies, so they stay in the main chat too.
- Pings go into `notifications` with type `chat` (private message, once per unread burst) or `chat-mention` (@mention in any room).
