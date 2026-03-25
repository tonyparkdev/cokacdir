# AI Provider Specifications

Verified 2026-03-25. Based on live testing against actual CLI tools.

---

## OpenCode

- **Binary**: `opencode` (v latest)
- **CLI command**: `opencode run --format json --dir <dir> [--model <provider/model>] [--session <id> --continue] [-- <message>]`
- **Output format**: JSONL (one JSON object per line)
- **Session storage**: SQLite at `~/.local/share/opencode/opencode.db`

### Event Types (streaming JSONL)

#### `step_start`
```json
{
  "type": "step_start",
  "timestamp": 1774405183145,
  "sessionID": "ses_...",
  "part": {
    "id": "prt_...",
    "sessionID": "ses_...",
    "messageID": "msg_...",
    "type": "step-start"
  }
}
```

#### `text`
```json
{
  "type": "text",
  "timestamp": 1774405211768,
  "sessionID": "ses_...",
  "part": {
    "id": "prt_...",
    "sessionID": "ses_...",
    "messageID": "msg_...",
    "type": "text",
    "text": "Hello!",
    "time": { "start": 1774405211767, "end": 1774405211767 },
    "metadata": { "openai": { "itemId": "msg_..." } }
  }
}
```

#### `tool_use`
```json
{
  "type": "tool_use",
  "timestamp": 1774405187972,
  "sessionID": "ses_...",
  "part": {
    "id": "prt_...",
    "sessionID": "ses_...",
    "messageID": "msg_...",
    "type": "tool",
    "callID": "call_...",
    "tool": "bash",
    "state": {
      "status": "completed",
      "input": { "command": "echo test", "description": "..." },
      "output": "test\n",
      "title": "...",
      "metadata": { "output": "test\n", "exit": 0, "truncated": false },
      "time": { "start": 1774405187937, "end": 1774405187970 }
    },
    "metadata": { "openai": { "itemId": "fc_..." } }
  }
}
```

Tool error variant:
```json
"state": {
  "status": "error",
  "input": { "filePath": "/nonexistent" },
  "error": "File not found: /nonexistent",
  "time": { "start": ..., "end": ... }
}
```

Pending variant (rare, interrupted session):
```json
"state": {
  "status": "pending",
  "input": {},
  "raw": ""
}
```

#### `reasoning`
```json
{
  "type": "reasoning",
  "timestamp": ...,
  "sessionID": "ses_...",
  "part": {
    "type": "reasoning",
    "text": "I think the best approach is..."
  }
}
```

#### `step_finish`
```json
{
  "type": "step_finish",
  "timestamp": 1774405211898,
  "sessionID": "ses_...",
  "part": {
    "id": "prt_...",
    "sessionID": "ses_...",
    "messageID": "msg_...",
    "type": "step-finish",
    "reason": "stop",
    "cost": 0,
    "tokens": {
      "total": 9577,
      "input": 8419,
      "output": 812,
      "reasoning": 76,
      "cache": { "read": 0, "write": 0 }
    }
  }
}
```

`reason` values: `"stop"` (final), `"tool-calls"` (continuing)

#### `error`
```json
{
  "type": "error",
  "timestamp": 1774403321731,
  "sessionID": "ses_...",
  "error": {
    "name": "UnknownError",
    "data": {
      "message": "Model not found: invalid/nonexistent-model."
    }
  }
}
```

### Tools (9 confirmed)

| Tool name | Input fields | Notes |
|---|---|---|
| `bash` | `command: string`, `timeout?: number`, `workdir?: string`, `description: string` | |
| `read` | `filePath: string`, `offset?: number`, `limit?: number` | camelCase `filePath` |
| `glob` | `pattern: string`, `path?: string` | |
| `grep` | `pattern: string`, `path?: string`, `include?: string` | |
| `apply_patch` | `patchText: string` | Used for both create and edit |
| `webfetch` | `url: string`, `format: "text"\|"markdown"\|"html"`, `timeout?: number` | |
| `todowrite` | `todos: Array<{content, status, priority}>` | |
| `task` | `description: string`, `prompt: string`, `subagent_type: string`, `task_id?: string`, `command?: string` | |
| `skill` | `name: string` | Field is `name`, not `skill` |

`multi_tool_use.parallel` exists as a meta-tool but decomposes into individual tool events.

### Normalization (opencode.rs)

Tool names (`normalize_tool_name`):
```
bash → Bash,  read → Read,  glob → Glob,  grep → Grep,
apply_patch → Edit,  webfetch → WebFetch,  todowrite → TodoWrite,
task → Task,  skill → Skill
```

Input fields (`normalize_opencode_params`):
```
read:        filePath → file_path
apply_patch: patchText → extract file_path from patch header lines
skill:       name → skill
```

### SQLite Storage (`~/.local/share/opencode/opencode.db`)

#### Session table

```sql
CREATE TABLE session (
  id TEXT PRIMARY KEY,             -- e.g. "ses_2dca1d650ffeR8a4SoLsWZHLqM"
  project_id TEXT NOT NULL,        -- e.g. "global"
  parent_id TEXT,                  -- null for non-forked sessions
  slug TEXT NOT NULL,              -- human-readable slug e.g. "neon-nebula"
  directory TEXT NOT NULL,         -- working directory e.g. "/tmp/storage_test"
  title TEXT NOT NULL,             -- auto-generated title e.g. "Grep search and TXT file globbing"
  version TEXT NOT NULL,           -- opencode version e.g. "1.3.2"
  share_url TEXT,                  -- null unless shared
  summary_additions INTEGER,      -- file change stats (0 if no file changes)
  summary_deletions INTEGER,
  summary_files INTEGER,
  summary_diffs TEXT,              -- JSON array of diffs, null if none
  revert TEXT,                     -- null
  permission TEXT,                 -- JSON array of permission rules
  time_created INTEGER NOT NULL,   -- unix timestamp ms
  time_updated INTEGER NOT NULL,   -- unix timestamp ms
  time_compacting INTEGER,         -- null
  time_archived INTEGER,           -- null
  workspace_id TEXT                -- null
);
```

`permission` example:
```json
[
  {"permission":"question","pattern":"*","action":"deny"},
  {"permission":"plan_enter","pattern":"*","action":"deny"},
  {"permission":"plan_exit","pattern":"*","action":"deny"}
]
```

#### Message table

```sql
CREATE TABLE message (
  id TEXT PRIMARY KEY,             -- e.g. "msg_d235e29db001scWO..."
  session_id TEXT NOT NULL,        -- FK to session.id
  time_created INTEGER NOT NULL,   -- unix timestamp ms
  time_updated INTEGER NOT NULL,   -- unix timestamp ms
  data TEXT NOT NULL               -- JSON (see below)
);
```

`data` JSON for user message:
```json
{
  "role": "user",
  "time": {"created": 1774414866907},
  "summary": {"diffs": []},
  "agent": "build",
  "model": {"providerID": "openai", "modelID": "gpt-5.4"}
}
```

`data` JSON for assistant message:
```json
{
  "role": "assistant",
  "time": {"created": 1774414866914, "completed": 1774414872134},
  "parentID": "msg_...",
  "modelID": "gpt-5.4",
  "providerID": "openai",
  "mode": "build",
  "agent": "build",
  "path": {"cwd": "/tmp/storage_test", "root": "/"},
  "cost": 0,
  "tokens": {
    "total": 8478,
    "input": 8374,
    "output": 104,
    "reasoning": 39,
    "cache": {"read": 0, "write": 0}
  },
  "finish": "tool-calls"
}
```

`finish` values: `"stop"` (final), `"tool-calls"` (continuing)

#### Part table

```sql
CREATE TABLE part (
  id TEXT PRIMARY KEY,             -- e.g. "prt_d235e29db002rmQ6..."
  message_id TEXT NOT NULL,        -- FK to message.id
  session_id TEXT NOT NULL,        -- FK to session.id
  time_created INTEGER NOT NULL,   -- unix timestamp ms
  time_updated INTEGER NOT NULL,   -- unix timestamp ms
  data TEXT NOT NULL               -- JSON (see below)
);
```

Part types stored in `data.type`:

**`text`** — user prompt or assistant response text
```json
{"type": "text", "text": "hello world"}
```
With metadata (assistant text):
```json
{
  "type": "text",
  "text": "Found hello in a.txt...",
  "time": {"start": 1774414873670, "end": 1774414874723},
  "metadata": {"openai": {"itemId": "msg_..."}}
}
```
Note: user text is stored with surrounding quotes and trailing newline (e.g. `"\"say hello\"\n"`).

**`tool`** — tool invocation with input, output, and status
```json
{
  "type": "tool",
  "callID": "call_cljKhQL8z24oJ8RhJDjM",
  "tool": "grep",
  "state": {
    "status": "completed",
    "input": {"pattern": "hello", "path": "/tmp/storage_test"},
    "output": "Found 1 matches\n/tmp/storage_test/a.txt:\n  Line 1: hello world",
    "title": "hello",
    "metadata": {"matches": 1, "truncated": false},
    "time": {"start": 1774414872079, "end": 1774414872106}
  },
  "metadata": {"openai": {"itemId": "fc_..."}}
}
```

Error variant:
```json
{
  "type": "tool",
  "callID": "call_...",
  "tool": "read",
  "state": {
    "status": "error",
    "input": {"filePath": "/nonexistent"},
    "error": "File not found: /nonexistent",
    "time": {"start": ..., "end": ...}
  }
}
```

Pending variant (interrupted session):
```json
{
  "type": "tool",
  "callID": "call_...",
  "tool": "bash",
  "state": {"status": "pending", "input": {}, "raw": ""}
}
```

**`step-start`** — marks beginning of a processing step
```json
{"type": "step-start"}
```

**`step-finish`** — marks end of a step with token/cost stats
```json
{
  "type": "step-finish",
  "reason": "tool-calls",
  "cost": 0,
  "tokens": {
    "total": 8478,
    "input": 8374,
    "output": 104,
    "reasoning": 39,
    "cache": {"read": 0, "write": 0}
  }
}
```

**`reasoning`** — model's internal reasoning (thinking)
```json
{
  "type": "reasoning",
  "text": "I've got to comply with the task here...",
  "time": {"start": 1774414868835, "end": 1774414872077},
  "metadata": {"openai": {"itemId": "rs_..."}}
}
```

#### Summary of DB types

| Part type | `data.type` value | Status values | Key fields |
|---|---|---|---|
| User/assistant text | `text` | — | `text` |
| Tool invocation | `tool` | `completed`, `error`, `pending` | `tool`, `callID`, `state.input`, `state.output`/`state.error` |
| Step boundary start | `step-start` | — | (none) |
| Step boundary end | `step-finish` | — | `reason`, `cost`, `tokens` |
| Reasoning | `reasoning` | — | `text` |

#### Key queries
```sql
-- Resolve session by ID
SELECT id, directory FROM session WHERE id = ?1 LIMIT 1;

-- Find latest session by working directory
SELECT id FROM session WHERE directory = ?1 ORDER BY time_updated DESC LIMIT 1;

-- Parse session history
SELECT json_extract(m.data, '$.role'),
       json_extract(p.data, '$.type'),
       json_extract(p.data, '$.text'),
       json_extract(p.data, '$.tool')
FROM message m JOIN part p ON p.message_id = m.id
WHERE m.session_id = ?1 ORDER BY p.time_created ASC;
```

### Model format

`opencode run --model <provider/model>` — e.g., `openai/gpt-5-codex`

In cokacdir: user sets `/model opencode:openai/gpt-5-codex` → `strip_opencode_prefix` returns `openai/gpt-5-codex`

---

## Gemini CLI

- **Binary**: `gemini` (v0.34.0)
- **CLI command**: `gemini -p <prompt> --output-format <text|json|stream-json> [--model <model>] [--resume <session_id>] [--yolo]`
- **Output format**: JSONL for stream-json, single JSON for json
- **Session storage**: `~/.gemini/tmp/<project_hash>/chats/session-<datetime>-<uuid8>.json`
- **Project root**: `~/.gemini/tmp/<project_hash>/.project_root` (contains working directory path)

### Event Types (stream-json)

#### `init`
```json
{
  "type": "init",
  "timestamp": "2026-03-25T02:23:50.704Z",
  "session_id": "bb14362f-d723-47af-8409-ccc4a23612c8",
  "model": "auto-gemini-3"
}
```

#### `message` (role: user)
```json
{
  "type": "message",
  "timestamp": "2026-03-25T02:23:50.706Z",
  "role": "user",
  "content": "say hello"
}
```

#### `message` (role: assistant)
```json
{
  "type": "message",
  "timestamp": "2026-03-25T02:23:59.983Z",
  "role": "assistant",
  "content": "Hello! How can I help you?",
  "delta": true
}
```

`delta: true` means this is a streaming chunk to be appended. Multiple message events build up the full response.

#### `tool_use`
```json
{
  "type": "tool_use",
  "timestamp": "2026-03-25T02:24:45.291Z",
  "tool_name": "run_shell_command",
  "tool_id": "run_shell_command_1774405485290_0",
  "parameters": {
    "command": "echo test",
    "description": "Execute echo command."
  }
}
```

#### `tool_result`
```json
{
  "type": "tool_result",
  "timestamp": "2026-03-25T02:24:45.595Z",
  "tool_id": "run_shell_command_1774405485290_0",
  "status": "success",
  "output": "test"
}
```

Error variant:
```json
{
  "type": "tool_result",
  "tool_id": "...",
  "status": "error",
  "error": { "message": "command not found" }
}
```

#### `result` (success)
```json
{
  "type": "result",
  "timestamp": "2026-03-25T02:24:57.340Z",
  "status": "success",
  "stats": {
    "total_tokens": 25253,
    "input_tokens": 25099,
    "output_tokens": 97,
    "cached": 10057,
    "input": 15042,
    "duration_ms": 15007,
    "tool_calls": 1,
    "models": {
      "gemini-2.5-flash-lite": {
        "total_tokens": 4930,
        "input_tokens": 4827,
        "output_tokens": 46,
        "cached": 0,
        "input": 4827
      },
      "gemini-3-flash-preview": {
        "total_tokens": 20323,
        "input_tokens": 20272,
        "output_tokens": 51,
        "cached": 10057,
        "input": 10215
      }
    }
  }
}
```

#### `result` (error)
```json
{
  "type": "result",
  "timestamp": "2026-03-25T02:25:09.107Z",
  "status": "error",
  "error": {
    "type": "Error",
    "message": "[API Error: Requested entity was not found.]"
  },
  "stats": { "total_tokens": 0, ... }
}
```

### JSON mode (non-streaming)

Single JSON object:
```json
{
  "session_id": "a0ceb921-...",
  "response": "Hello! How can I help you today?",
  "stats": {
    "models": {
      "<model_name>": {
        "api": { "totalRequests": 1, "totalErrors": 0, "totalLatencyMs": 1632 },
        "tokens": {
          "input": 4815, "prompt": 4815, "candidates": 36,
          "total": 5024, "cached": 0, "thoughts": 173, "tool": 0
        }
      }
    }
  }
}
```

### Tools (13 confirmed)

| Tool name | Input fields | Notes |
|---|---|---|
| `run_shell_command` | `command: string`, `description: string`, `dir_path?: string`, `is_background?: boolean` | |
| `read_file` | `file_path: string`, `start_line?: number`, `end_line?: number` | |
| `list_directory` | `dir_path: string`, `file_filtering_options?: object`, `ignore?: string[]` | |
| `glob` | `pattern: string`, `dir_path?: string`, `case_sensitive?: boolean` | Lowercase `glob` |
| `grep_search` | `pattern: string`, `dir_path?: string`, `include_pattern?: string`, `exclude_pattern?: string`, `case_sensitive?: boolean`, ... | |
| `replace` | `file_path: string`, `old_string: string`, `new_string: string`, `instruction?: string`, `allow_multiple?: boolean` | |
| `write_file` | `file_path: string`, `content: string` | |
| `web_fetch` | `prompt: string` | `prompt` not `url` |
| `google_web_search` | `query: string` | |
| `save_memory` | `fact: string` | No Claude equivalent |
| `activate_skill` | `name: string` | `name` not `skill` |
| `codebase_investigator` | `objective: string` | Sub-agent |
| `generalist` | `request: string` | Sub-agent |
| `cli_help` | `question: string` | Sub-agent |

### Normalization (bridge.rs)

Tool names (`normalize_gemini_tool`):
```
run_shell_command → Bash,  read_file → Read,  list_directory → Read,
write_file → Write,  replace → Edit,  glob → Glob,  grep_search → Grep,
web_fetch → WebFetch,  google_web_search → WebSearch,
activate_skill → Skill,  save_memory → Memory,
codebase_investigator → Task,  generalist → Task,  cli_help → Task
```

Input fields (`normalize_gemini_params`):
```
(all tools):           dir_path → path
replace:               allow_multiple → replace_all
web_fetch:             prompt → url
activate_skill:        name → skill
sub-agents:            objective/request/question → description
```

### Session File Storage (`~/.gemini/tmp/`)

#### Directory structure
```
~/.gemini/tmp/
  <project_dir_name>/              -- derived from working directory name
    .project_root                  -- contains absolute path, e.g. "/tmp/storage_test"
    chats/
      session-<YYYY-MM-DDThh-mm>-<uuid_first8>.json
      session-<YYYY-MM-DDThh-mm>-<uuid_first8>.json
      ...
```

Example: working directory `/tmp/storage_test` → project dir `storage-test`

#### Session JSON structure

Top-level fields:
```json
{
  "sessionId": "ea2009c0-6480-4b78-8008-4b7d187a2d0e",
  "projectHash": "0c8efb8004fb60edd4455352a42885eccc898d703954c77453e29bcd84da393b",
  "startTime": "2026-03-25T05:02:51.873Z",
  "lastUpdated": "2026-03-25T05:03:27.698Z",
  "messages": [...],
  "kind": "main"
}
```

| Field | Type | Description |
|---|---|---|
| `sessionId` | string | UUID v4 |
| `projectHash` | string | SHA-256 hash of project identity |
| `startTime` | string | ISO 8601 timestamp |
| `lastUpdated` | string | ISO 8601 timestamp |
| `messages` | array | Ordered list of message objects |
| `kind` | string | Always `"main"` |

#### User message
```json
{
  "id": "fce3ff4d-c4bb-4f4f-b604-7ba21a28d756",
  "timestamp": "2026-03-25T05:02:51.873Z",
  "type": "user",
  "content": [
    {"text": "Search for 'hello' in all files using grep"}
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID v4 |
| `timestamp` | string | ISO 8601 |
| `type` | string | `"user"` |
| `content` | array | Array of `{text: string}` objects |

#### Gemini (assistant) message — text only
```json
{
  "id": "e85160dd-96ae-4fd0-8d9b-6e3c112b0b51",
  "timestamp": "2026-03-25T05:03:27.698Z",
  "type": "gemini",
  "content": "Found 'hello' in `a.txt`:\n```text\nhello world\n```",
  "thoughts": [],
  "tokens": {
    "input": 6188,
    "output": 94,
    "cached": 5946,
    "thoughts": 67,
    "tool": 0,
    "total": 6349
  },
  "model": "gemini-3-flash-preview"
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID v4 |
| `timestamp` | string | ISO 8601 |
| `type` | string | `"gemini"` |
| `content` | string | Plain text response (NOT array) |
| `thoughts` | array | Thinking/reasoning content (usually empty `[]`) |
| `tokens` | object | Token usage: `input`, `output`, `cached`, `thoughts`, `tool`, `total` |
| `model` | string | Model name e.g. `"gemini-3-flash-preview"` |

#### Gemini (assistant) message — with tool calls
```json
{
  "id": "5e791287-5c0d-448c-a0d3-17bf19bda216",
  "timestamp": "2026-03-25T05:03:25.264Z",
  "type": "gemini",
  "content": "I will search for the string 'hello'...",
  "thoughts": [],
  "tokens": {
    "input": 6045, "output": 41, "cached": 0,
    "thoughts": 56, "tool": 0, "total": 6142
  },
  "model": "gemini-3-flash-preview",
  "toolCalls": [
    {
      "id": "grep_search_1774415005213_0",
      "name": "grep_search",
      "args": {"pattern": "hello", "context": 50},
      "result": [
        {
          "functionResponse": {
            "id": "grep_search_1774415005213_0",
            "name": "grep_search",
            "response": {
              "output": "Found 1 match for pattern \"hello\"..."
            }
          }
        }
      ],
      "status": "success",
      "timestamp": "2026-03-25T05:03:25.264Z",
      "resultDisplay": "",
      "displayName": "SearchText",
      "description": "Searches for a pattern...",
      "renderOutputAsMarkdown": true
    }
  ]
}
```

#### toolCall object fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Tool call ID e.g. `"grep_search_1774415005213_0"` |
| `name` | string | Raw tool name e.g. `"grep_search"`, `"read_file"` |
| `args` | object | Tool-specific input parameters |
| `result` | array | Array of `{functionResponse: {id, name, response: {output}}}` |
| `status` | string | `"success"` or `"error"` |
| `timestamp` | string | ISO 8601 |
| `resultDisplay` | string | Display-friendly output (may be empty) |
| `displayName` | string | Human-readable name e.g. `"SearchText"`, `"ReadFile"`, `"FindFiles"`, `"Shell"` |
| `description` | string | Full tool description text |
| `renderOutputAsMarkdown` | boolean | Whether output should be rendered as markdown |

#### Tool displayName mapping (observed)

| Raw tool name | displayName |
|---|---|
| `run_shell_command` | `Shell` |
| `read_file` | `ReadFile` |
| `write_file` | `WriteFile` |
| `replace` | (not observed, likely `Replace`) |
| `glob` | `FindFiles` |
| `grep_search` | `SearchText` |

#### Session resolve logic
- **By ID**: scan `~/.gemini/tmp/*/chats/session-*.json`, filename contains first 8 chars of UUID, verify `sessionId` field inside JSON.
- **By cwd**: read `~/.gemini/tmp/*/.project_root`, match against working directory, find latest session file by mtime.

### Model format

`gemini -p ... --model <model_name>` — e.g., `gemini-2.5-pro`, `gemini-3-flash-preview`

In cokacdir: user sets `/model gemini:gemini-2.5-pro` → `strip_gemini_prefix` returns `gemini-2.5-pro`

Default model (no `--model` flag): Gemini CLI auto-selects (typically `auto-gemini-3`).
