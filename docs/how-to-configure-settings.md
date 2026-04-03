# How to Configure Settings

## /silent

Toggles silent mode for the current chat. Default: **ON**.

- **ON** — Tool calls (Bash, Read, Edit, etc.) are hidden from the response. Only the AI's text output and errors are shown.
- **OFF** — Full tool call details are displayed, including commands run and file contents read.

Silent mode reduces message noise, especially in group chats.

---

## /debug

Toggles debug logging. Default: **OFF**.

When enabled, detailed logs are printed for Telegram API operations, AI service calls, and the cron scheduler. This is a **global** toggle — it affects all chats.

---

## /greeting

Toggles the startup greeting style.

- **Compact**: `cokacdir started (v0.4.80, Claude)`
- **Full**: Includes session path, community links, GitHub URL, and update notices.

---

## /setpollingtime \<ms\>

Sets the API polling interval in milliseconds. This controls how frequently streaming responses and shell command output are updated on screen.

```
/setpollingtime 3000
```

- **Minimum**: 2500ms
- **Recommended**: 3000ms or higher
- Setting it too low may cause Telegram API rate limits.
- Without arguments, shows the current value.

---

## /help

Displays the full command reference with all available commands and usage examples.
