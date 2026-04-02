# How to Use Schedules

## Overview

You can schedule tasks for the bot to execute at a specific time or on a recurring basis. Scheduled tasks run in their own isolated workspace and do not interfere with your current session.

The bot itself handles schedule registration through its AI session — you describe what you want scheduled in natural language, and the bot uses the built-in `--cron` command to register it. You can also manage schedules using bot commands.

---

## Schedule Types

### One-time (Absolute)

Runs once at a specific date and time, then is automatically deleted.

```
Schedule "check disk usage" at 2026-04-03 09:00:00
```

### One-time (Relative)

Runs once after a specified delay from now. Internally converted to an absolute time.

```
Schedule "run the backup script" in 30m
Schedule "send the report" in 4h
Schedule "clean temp files" in 1d
```

Supported units: `m` (minutes), `h` (hours), `d` (days).

### Recurring (Cron)

Runs on a recurring schedule using standard cron expressions (5 fields: minute, hour, day, month, day-of-week).

```
Schedule "check server health" at cron 0 9 * * 1-5      → 9:00 AM weekdays
Schedule "clean logs" at cron 0 0 * * 0                  → midnight every Sunday
Schedule "sync data" at cron */30 * * * *                → every 30 minutes
```

**Cron field reference:**

| Field | Range | Special |
|-------|-------|---------|
| Minute | 0–59 | `*`, `,`, `-`, `/` |
| Hour | 0–23 | `*`, `,`, `-`, `/` |
| Day | 1–31 | `*`, `,`, `-`, `/` |
| Month | 1–12 | `*`, `,`, `-`, `/` |
| Day of week | 0–6 (0=Sun) | `*`, `,`, `-`, `/` |

A recurring cron schedule can also be set to run only once with the `--once` flag. It will trigger at the next matching time and then be automatically deleted.

---

## Managing Schedules

### View Current Schedules

Ask the bot to list schedules, or the bot uses the `--cron-list` command internally to show all registered schedules for the chat.

### Cancel a Schedule

You can ask the bot to remove a schedule by its ID. When a scheduled task is running, you can use `/stop` to cancel its execution.

### Resume a Schedule Workspace

Each scheduled task creates a workspace at `~/.cokacdir/workspace/<schedule_id>/`. After a schedule completes, you can resume work in that workspace:

```
/start <schedule_id>
```

Or type `/<schedule_id>` as a shortcut.

---

## How Scheduled Tasks Execute

1. When the scheduled time arrives, the bot creates an isolated workspace.
2. A new AI session is started with the scheduled prompt.
3. The result is streamed to the chat as it would be for a normal message.
4. Your current session is not affected — it is backed up and restored after the schedule completes.
5. One-time schedules are deleted before execution. Recurring schedules update their `last_run` timestamp after execution.

### Context Continuity

If a schedule is registered with the `--session` parameter, the bot extracts a context summary from the previous session and includes it in the scheduled task's prompt. This allows scheduled tasks to build on prior work.

---

## Schedule Storage

Schedules are stored as JSON files in `~/.cokacdir/schedule/`. Each file is named `<ID>.json` where ID is an 8-character hex identifier. You can inspect or manually remove these files if needed.

---

## Cron Expression Examples

```
0 9 * * 1-5        → 9:00 AM every weekday
0 0 * * *           → midnight every day
*/30 * * * *        → every 30 minutes
0 12 1 * *          → noon on the 1st of each month
0 0 * * 0           → midnight every Sunday
30 9,17 * * *       → 9:30 AM and 5:30 PM daily
0 9-17 * * 1-5      → every hour from 9 AM to 5 PM on weekdays
```
