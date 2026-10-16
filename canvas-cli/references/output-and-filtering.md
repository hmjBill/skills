# Canvas CLI — output formats and filtering

Loaded on demand by the `canvas-cli` skill. Authoritative docs:
https://jjuanrivvera.github.io/canvas-cli/user-guide/output-formats/

## Formats

```bash
canvas courses list                  # table (default, for humans)
canvas courses list -o json          # for scripts / jq — stable across versions
canvas courses list -o yaml
canvas courses list -o csv           # spreadsheet import
```

Always parse `-o json`; table layout may change between releases. There is no
env var for output format — pass `-o json` on each call.

## Built-in filtering, columns, sorting

Work on every list command and combine freely with any format:

```bash
canvas assignments list --course-id 123 --filter "exam"        # substring, case-insensitive, all fields
canvas assignments list --course-id 123 --columns id,name,due_at,points_possible
canvas assignments list --course-id 123 --sort -due_at         # '-' prefix = descending
canvas assignments list --course-id 123 \
  --filter "exam" --columns id,name,due_at --sort -due_at -o csv > exams.csv
```

`--limit N` caps how many records list commands return — use it on
account-level lists, which can be enormous.

## When to use jq instead

`--filter` is substring-only. For structural queries, use JSON + jq:

```bash
# Field selection
canvas courses list -o json | jq '.[].id'

# Conditional filtering
canvas courses list -o json | jq '.[] | select(.enrollment_term_id == 5)'

# Counting
canvas users list --course-id 123 -o json | jq length

# Reshaping
canvas submissions list --course-id 123 --assignment-id 456 -o json \
  | jq '.[] | {user_id, score, workflow_state}'
```

## Resource-specific list filters

Many list commands have server-side filters that are cheaper than
post-filtering — check `canvas <resource> list --help`. Examples:

```bash
canvas courses list --enrollment-type teacher --state available
canvas courses list --account-id 1 --search "Biology"
canvas assignments list --course-id 123 --bucket upcoming
canvas submissions list --course-id 123 --assignment-id 456 --workflow-state graded
canvas users list --course-id 123 --enrollment-type student
canvas users list --search "john" --limit 50
canvas courses list --include syllabus_body,term       # extra fields from the API
```

## Script hygiene

- `--quiet` suppresses informational messages — only data and errors.
- `--no-cache` when freshness matters (just-written data, polling).
- Exit code is non-zero on failure; check it in scripts.
- `--dry-run` prints the curl equivalent (token redacted; `--show-token` to
  reveal) — ideal for showing the user what a write will do.
