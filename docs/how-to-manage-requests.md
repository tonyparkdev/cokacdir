# How to Manage Requests

## Overview

When you send a message to the bot, it starts an AI request. While a request is in progress, additional messages are placed in a queue (up to 20) and processed in order. You can cancel requests, manage the queue, and remove individual queued messages.

---

## /stop

Cancels the currently in-progress AI request for the chat.

- The running AI process is terminated immediately.
- A "Stopping..." message is shown while cancellation completes.
- The message queue is **not** affected — the next queued message will begin processing automatically after cancellation.
- If no request is in progress, nothing happens.

## /stopall

Cancels the in-progress request **and** clears the entire message queue in one operation.

- Use this when you want to cancel everything and start fresh.
- Reports how many queued messages were cleared.

```
Stopping... (3 queued message(s) cleared)
```

## /stop \<ID\>

Removes a specific message from the queue by its ID.

When a message is queued, the bot assigns it a short hex ID (e.g., `A394FDA`) and shows it in the queue confirmation. Use this ID to cancel that specific queued message:

```
/stop A394FDA
```

The match is case-insensitive. `/stop_A394FDA` also works.

---

## Message Queue

### How It Works

When the AI is busy processing a request, any new messages you send are placed in a queue instead of being rejected. Queued messages are processed one by one in the order they were received (FIFO).

When a message is queued, the bot responds with:

```
Queued (A394FDA) "preview of your message..."
- /stopall to cancel all
- /stop_A394FDA to cancel this
```

### Queue Limits

- Maximum queue size: **20 messages**
- If the queue is full, new messages are rejected with: "Queue full (max 20). Use /stopall to clear."

### File Uploads

If you send a file while the AI is busy, the file upload is captured at queue time and attached to the queued message. When the message is later processed, the file context is correctly preserved.

### /queue

Toggles queue mode on or off for the current chat.

- **Queue ON** (default): Messages sent while AI is busy are queued and processed in order.
- **Queue OFF**: Messages sent while AI is busy are rejected with "AI request in progress. Use /stop to cancel."

When turning queue off, any existing queued messages are cleared.

---

## How /stop and Queue Interact

| Situation | /stop | /stopall |
|-----------|-------|----------|
| AI busy, queue has messages | Cancels current request; next queued message starts automatically | Cancels current request and clears all queued messages |
| AI busy, queue empty | Cancels current request | Cancels current request |
| AI idle, queue has messages | No effect | Clears all queued messages |
