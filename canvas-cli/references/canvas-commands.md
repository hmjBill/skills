# Canvas CLI — command cheatsheet

Condensed reference loaded on demand by the `canvas-cli` skill. Authoritative
docs: https://jjuanrivvera.github.io/canvas-cli/

## Global flags (any command)

| Flag | Meaning |
|---|---|
| `-o, --output table\|json\|yaml\|csv` | Output format (default table) |
| `--filter TEXT` | Case-insensitive substring match across all fields |
| `--columns a,b,c` | Select columns to display |
| `--sort field` / `--sort -field` | Sort ascending / descending |
| `--limit N` | Cap list results (0 = unlimited) |
| `--instance NAME` | Use a specific configured Canvas instance |
| `--dry-run` | Print the request as a curl command, send nothing |
| `--show-token` | Don't redact auth in `--dry-run` output |
| `--no-cache` | Bypass the response cache |
| `--as-user ID` | Masquerade as another user (admin permission required) |
| `--quiet` | Data and errors only (for scripts) |
| `-v, --verbose` | Debug logging to stderr |

## Meta commands

```bash
canvas version
canvas doctor                                   # install/auth/connectivity diagnostics
canvas auth login | status | logout
canvas auth token set <instance> [--url URL] [--token T] | remove <instance>
canvas config add <name> --url URL | list | use <name> | show | remove <name>
canvas context set course|assignment|user|account <id> | show | clear [type]
canvas alias set <name> "<expansion>" | list | delete <name>
canvas cache stats | clear
canvas completion bash|zsh|fish|powershell
canvas repl                                     # interactive shell
canvas mcp start | stream | tools | claude|cursor|vscode enable
canvas skills install [--global] [--agent claude|cursor|…] | path | print
canvas update check | status
```

## Resources and notable actions

| Resource | Actions beyond list/get/create/update/delete |
|---|---|
| `courses` | — (admin listing via `--account-id`) |
| `assignments` | `--bucket upcoming\|overdue\|past…`, `--json file` / `--stdin` bodies |
| `assignment-groups` | — |
| `overrides` | per-assignment date/audience overrides |
| `submissions` | `grade`, `bulk-grade --csv`, `comments`, `add-comment`, `delete-comment` |
| `grades` | `history`, `feed`, `columns {list\|create\|update\|delete\|data}` |
| `modules` | `publish`, `unpublish`, `relock`, `items {list\|get\|create\|update\|delete\|done}` |
| `pages` | `front`, `duplicate`, `revisions`, `revert` |
| `quizzes` | `questions {…}`, `submissions {list\|get}` |
| `discussions` | `entries`, `post`, `reply`, `subscribe`, `unsubscribe` |
| `announcements` | — |
| `users` | `me`, `search <term>` |
| `enrollments` | `accept`, `reject`, `conclude`, `reactivate` |
| `sections` | `crosslist`, `uncrosslist` |
| `groups` | `members {add\|list\|remove}`, `categories {…}` |
| `conversations` | `reply`, `archive`, `star`, `mark-read`, `unread-count` |
| `files` | `upload <path>`, `download <id>`, `quota` |
| `calendar` | `reserve` (appointment slots) |
| `rubrics` | `associate` |
| `outcomes` | `groups`, `link`, `unlink`, `results`, `alignments` |
| `peer-reviews` | — |
| `analytics` | `activity`, `assignments`, `students`, `user`, `department` |
| `accounts` | `sub` (sub-accounts) |
| `admins` | `add`, `remove` |
| `roles` | `activate`, `deactivate` |
| `blueprint` | `associations {add\|list\|remove}`, `sync`, `migrations`, `changes` |
| `content-migrations` | `migrators`, `issues`, `content` |
| `sis-imports` | `errors`, `abort`, `restore` |
| `external-tools` | `launch` |
| `sync` | `course`, `assignments` (cross-instance) |
| `api` | raw `GET\|POST\|PUT\|DELETE\|PATCH /api/v1/…` with `-d`, `-q`, `--paginate` |
| `webhook` | `listen`, `events` |

## Common ID-scoping flags

Most course-scoped commands take `--course-id`; only `assignments list`/`get`
inherit it from `canvas context set course N`. Submission commands additionally
take `--assignment-id` and `--user-id`. Admin commands take `--account-id`.

## Body input (create/update)

Flag-based fields are the norm (`--name`, `--points`, `--due-at …`). Where
supported (e.g. assignments), JSON bodies work too:

```bash
canvas assignments create --course-id 123 --json assignment.json
echo '{"name":"Quiz","points_possible":10}' | canvas assignments create --course-id 123 --stdin
```

## Quick recipes

```bash
# Roster export
canvas users list --course-id 123 --enrollment-type student -o csv > students.csv

# Find ungraded submissions
canvas submissions list --course-id 123 --assignment-id 456 --workflow-state submitted

# Upcoming assignments sorted by due date
canvas assignments list --course-id 123 --bucket upcoming --sort due_at

# Publish all of a course's modules (script over JSON)
canvas modules list --course-id 123 -o json | jq -r '.[].id' \
  | xargs -I{} canvas modules publish --course-id 123 {}

# Cross-instance course copy
canvas sync course prod 12345 staging 67890 --interactive
```
