# How to Use Group Chat

## Overview

You can invite multiple bots into a Telegram group chat to collaborate on tasks. Each bot operates independently with its own session and working directory.

## Sending Messages to Bots

In group chats, bots do not listen to every message. You must prefix your message with `;` for bots to receive it:

```
; check the server status
```

All bots in the group will receive this message.

## Targeting a Specific Bot

Instead of broadcasting to all bots with `;`, use `@botname` to direct a message to a specific bot:

```
@mybot check the server status
```

Only the mentioned bot will respond. This is the recommended approach — giving the same instruction to all bots at once often leads to duplicated work. Direct your instructions to specific bots for better results.

The same applies to commands. For example:

```
/pwd           → all bots respond
@mybot /pwd    → only @mybot responds
```

## /query — Alternative Message Syntax

You can also use `/query` to send a message to the AI. This works like `;` but supports `@botname` targeting:

```
/query check the server status           → all bots receive
/query@mybot check the server status     → only @mybot receives
```

This is useful when you want the message to be clearly structured as a command.

---

## /public — Controlling Access

By default, only the bot owner can use the bot in group chats. Use `/public` to allow all group members to interact:

```
/public on      → all members can use the bot
/public off     → owner only (default)
/public         → show current setting
```

Only the bot owner can change this setting.

---

## Bots Work Sequentially

Bots in a group chat do not work simultaneously. They process messages one at a time in sequence. When one bot is busy, other messages wait in each bot's queue until it is their turn.

## /context — Controlling Shared Awareness

In a group chat, each bot can see recent messages from other bots via a shared chat log. The `/context` command controls how many recent log entries are included in the bot's prompt.

```
/context        → show current setting
/context 20     → include the last 20 log entries
/context 0      → disable shared context
```

The default is **12** entries.

When set to **0**, the bot will have no visibility into what other bots in the group have said. The bots remain in the same group chat, but they are completely unaware of each other's existence. This is useful when you want bots to work independently without being influenced by each other.

Each bot has its own `/context` setting, so you can configure them individually using `@botname /context <n>`.

---

## Customizing Co-work Behavior

The guidelines that govern how bots collaborate in group chats can be customized by editing the file:

```
~/.cokacdir/prompt/cowork.md
```

This file is auto-generated with default guidelines on first use. You can edit it directly to change how bots coordinate, avoid duplicate work, communicate with each other, and divide tasks. Changes take effect on the next message processed.
