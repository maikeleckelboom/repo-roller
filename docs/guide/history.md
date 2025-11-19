# History Tracking

repo-roller automatically tracks every bundle generation in a persistent history database. This allows you to review past generations, compare changes over time, analyze usage patterns, and replay previous configurations.

## What Is Tracked

Every bundle generation creates a history entry containing:

- **Project information** - Name, path, git branch, commit hash
- **Command details** - Preset, profile, model, CLI arguments
- **Result metrics** - File count, size, tokens, cost, duration
- **File list** - All files included in the bundle
- **Output details** - Format, output file path
- **Metadata** - Timestamp, tags, notes

## History File Location

History is stored in:

```
~/.config/repo-roller/history.jsonl
```

This is a JSON Lines file (one JSON object per line), making it:
- Easy to parse
- Append-only for performance
- Compatible with standard tools

## Viewing History

### List Recent Entries

Display the most recent bundle generations:

```bash
# Show last 10 entries (default)
repo-roller history list

# Show last 20 entries
repo-roller history list --limit 20

# Show all entries
repo-roller history list --limit 0
```

**Example output:**

```
Bundle History
──────────────────────────────────────────────────────────

  a1b2c3d4  my-project@main
            42 files  12,500 tokens  $0.0188  [markdown]  2h ago
            typescript  core-first

  e5f6g7h8  api-server@develop
            28 files  8,200 tokens  $0.0123  [json]  1d ago
            api-review

  i9j0k1l2  webapp@feature/auth
            15 files  4,100 tokens  $0.0062  [markdown]  3d ago
            #auth #review

  Showing 3 most recent entries
  Use --show <id> to see details, --diff <id1>..<id2> to compare
```

### Show Entry Details

View complete information about a specific entry:

```bash
# By ID (full or partial)
repo-roller history show a1b2c3d4

# By index (negative for recent)
repo-roller history show -1  # Most recent
repo-roller history show -2  # Second most recent
repo-roller history show 0   # Oldest
```

**Example output:**

```
Bundle Details
──────────────────────────────────────────────────────────

  ID              a1b2c3d4e5f6g7h8
  Timestamp       2024-01-15, 14:30:45

  Project
    Name          my-project
    Path          /home/user/projects/my-project
    Branch        main
    Commit        a3f2c1d

  Command
    Preset        typescript
    Profile       core-first
    Model         claude-3.5-sonnet
    Args          --preset typescript --profile core-first...

  Results
    Files         42
    Size          156.3 KB
    Tokens        12,500
    Cost          $0.0188
    Format        markdown
    Output        ./my-project-core-2024-01-15.md
    Duration      1234ms

  Files Included
    • src/core/index.ts
    • src/core/types.ts
    • src/cli/commands.ts
    • src/cli/modes.ts
    ... and 38 more

  Tags
    #typescript #review

  Replay
    repo-roller --preset typescript --profile core-first --format markdown
```

### Filter by Project

Show history for a specific project:

```bash
# By project name
repo-roller history list --project my-project

# Searches history by project name
```

## Searching History

### Search by Tags

Find entries with specific tags:

```bash
# Find entries tagged 'review'
repo-roller history search --tag review

# Multiple tags (AND logic)
repo-roller history search --tag review --tag auth

# Show more details
repo-roller history search --tag review --verbose
```

### Search by Date Range

Find entries within a date range:

```bash
# Last 24 hours
repo-roller history search --since 24h

# Last 7 days
repo-roller history search --since 7d

# Last 30 days
repo-roller history search --since 30d

# Custom date
repo-roller history search --since 2024-01-01
```

### Search by Text

Search in project names, files, or notes:

```bash
# Search project names
repo-roller history search --query "api-server"

# Search file paths
repo-roller history search --files "auth"

# Combined search
repo-roller history search --query "project" --tag review
```

## Comparing Entries

### Diff Two Entries

Compare two history entries to see what changed:

```bash
# Compare by ID
repo-roller history diff a1b2c3d4..e5f6g7h8

# Compare recent entries
repo-roller history diff -2..-1

# Compare oldest to newest
repo-roller history diff 0..-1
```

**Example output:**

```
Bundle Comparison
──────────────────────────────────────────────────────────

  Entries
    From: a1b2c3d4 (Jan 15, 2024, 14:30:45)
    To:   e5f6g7h8 (Jan 16, 2024, 10:15:22)

  Changes
    Files          +8
    Bytes          +42,156
    Tokens         +3,200
    Cost           +$0.0048
    Duration (ms)  -234

  Files
    Added:       8
    Removed:     0
    Unchanged:   42

  Added Files
    + src/features/billing/checkout.ts
    + src/features/billing/payment.ts
    + src/features/billing/invoice.ts
    + src/features/billing/types.ts
    + src/features/billing/index.ts
    ... and 3 more
```

### Common Diff Use Cases

**Track feature development:**
```bash
# Compare before and after feature work
repo-roller history diff feature-start..feature-end
```

**Optimization impact:**
```bash
# See token reduction from optimization
repo-roller history diff before-optimization..after-optimization
```

**Cost analysis:**
```bash
# Track cost changes over time
repo-roller history diff -7..-1
```

## Exporting History

### Export to JSON

Export history for analysis or backup:

```bash
# Export all history to JSON
repo-roller history export --format json > history.json

# Export with filters
repo-roller history search --project my-project | repo-roller history export --format json
```

**JSON structure:**

```json
[
  {
    "id": "a1b2c3d4e5f6g7h8",
    "timestamp": "2024-01-15T14:30:45.123Z",
    "project": {
      "name": "my-project",
      "path": "/home/user/projects/my-project",
      "gitBranch": "main",
      "gitCommit": "a3f2c1d"
    },
    "command": {
      "preset": "typescript",
      "profile": "core-first",
      "model": "claude-3.5-sonnet",
      "args": ["--preset", "typescript", "--profile", "core-first"]
    },
    "result": {
      "fileCount": 42,
      "totalBytes": 156300,
      "estimatedTokens": 12500,
      "estimatedCost": 0.0188,
      "format": "markdown",
      "outputFile": "./my-project-core-2024-01-15.md",
      "duration": 1234
    },
    "files": {
      "included": ["src/core/index.ts", "src/core/types.ts"]
    },
    "tags": ["typescript", "review"]
  }
]
```

### Export to CSV

Export for spreadsheet analysis:

```bash
# Export to CSV
repo-roller history export --format csv > history.csv
```

**CSV columns:**
- id
- timestamp
- project
- branch
- files
- bytes
- tokens
- cost
- format
- duration
- tags

### Export to YAML

Human-readable export:

```bash
# Export to YAML
repo-roller history export --format yaml > history.yaml
```

## Replaying Generations

### Replay a Previous Command

Re-run a previous generation with the exact same configuration:

```bash
# Show replay command
repo-roller history show a1b2c3d4

# Copy the replay command shown at the bottom
repo-roller --preset typescript --profile core-first --format markdown
```

### Automatic Replay

Use the `--replay` flag to automatically execute:

```bash
# Replay most recent
repo-roller history replay -1

# Replay specific entry
repo-roller history replay a1b2c3d4

# Replay with modifications
repo-roller history replay -1 --format json  # Change format
repo-roller history replay -1 --out new-bundle.md  # New output file
```

**Use cases:**
- Reproduce exact bundles for debugging
- Generate consistent bundles for CI/CD
- Re-create bundles after accidental deletion

## Tagging and Annotations

### Add Tags

Tag history entries for organization:

```bash
# Tag an entry
repo-roller history tag a1b2c3d4 review

# Multiple tags
repo-roller history tag a1b2c3d4 review,auth,v1.0

# Tag most recent
repo-roller history tag -1 production
```

### Add Notes

Annotate entries with notes:

```bash
# Add note
repo-roller history note a1b2c3d4 "Pre-merge code review for auth feature"

# Update note
repo-roller history note a1b2c3d4 "Updated after review feedback"
```

### View Tagged Entries

```bash
# Find all production bundles
repo-roller history search --tag production

# Find all v1.0 releases
repo-roller history search --tag v1.0

# Multiple tags (AND)
repo-roller history search --tag review --tag auth
```

## History Statistics

### View Usage Stats

Get aggregate statistics about your history:

```bash
repo-roller history stats
```

**Example output:**

```
History Statistics
──────────────────────────────────────────────────────────

  Summary
    Total Runs           156
    Unique Projects      8
    Avg Files/Run        34

  Totals
    Tokens Generated     1,234,567
    Total Cost          $18.52

  Favorites
    Most Used Preset    typescript (67 runs)
    Most Active Project my-project (45 runs)

  Recent Activity
    Last 24h            12 runs
    Last 7 days         43 runs
    Last 30 days        98 runs
```

### Track Costs

Monitor spending over time:

```bash
# Total cost from all history
repo-roller history stats | grep "Total Cost"

# Cost for specific project
repo-roller history list --project my-project | grep cost

# Cost by date range
repo-roller history search --since 30d | repo-roller history export --format csv | awk -F, '{sum+=$8} END {print "$" sum}'
```

### Analyze Patterns

```bash
# Most common presets
repo-roller history export --format json | jq '.[] | .command.preset' | sort | uniq -c | sort -rn

# Average tokens per project
repo-roller history export --format json | jq 'group_by(.project.name) | map({project: .[0].project.name, avg_tokens: (map(.result.estimatedTokens) | add / length)})'

# Peak usage times
repo-roller history export --format json | jq '.[] | .timestamp' | cut -d'T' -f2 | cut -d':' -f1 | sort | uniq -c
```

## History Entry Structure

Each history entry contains:

```typescript
{
  // Unique identifier
  id: string;

  // When the bundle was generated
  timestamp: string; // ISO 8601

  // Project information
  project: {
    name: string;
    path: string;
    gitBranch?: string;
    gitCommit?: string;
  };

  // Command that was executed
  command: {
    preset?: string;
    profile: string;
    model?: string;
    args: string[];
  };

  // Generation results
  result: {
    fileCount: number;
    totalBytes: number;
    estimatedTokens: number;
    estimatedCost?: number;
    format: string;
    outputFile: string;
    duration: number; // milliseconds
  };

  // File information
  files: {
    included: string[];
  };

  // Optional metadata
  tags?: string[];
  notes?: string;
}
```

## Use Cases

### Use Case 1: Track Project Evolution

```bash
# View all generations for a project
repo-roller history list --project my-app

# Compare first and latest
repo-roller history diff 0..-1

# See how the codebase grew
```

### Use Case 2: Cost Management

```bash
# View recent costs
repo-roller history list --limit 30

# Export for budget tracking
repo-roller history export --format csv > costs.csv

# Analyze cost trends
repo-roller history stats
```

### Use Case 3: Audit Trail

```bash
# Tag production bundles
repo-roller history tag -1 production,v2.1.0

# Find all production bundles
repo-roller history search --tag production

# Export for compliance
repo-roller history export --format json > audit-trail.json
```

### Use Case 4: Reproduce Bundles

```bash
# Show exact command used
repo-roller history show a1b2c3d4

# Replay for debugging
repo-roller history replay a1b2c3d4

# Generate same bundle, different format
repo-roller history replay a1b2c3d4 --format json
```

### Use Case 5: Compare Branches

```bash
# Generate bundle on main
git checkout main
repo-roller --preset ts --tag main-branch

# Generate bundle on feature
git checkout feature/new-api
repo-roller --preset ts --tag feature-branch

# Compare
repo-roller history diff main-branch..feature-branch
```

## Advanced Features

### Query History Programmatically

```bash
# Get history as JSON for scripting
repo-roller history export --format json | jq '.[] | select(.result.estimatedCost > 0.5)'

# Find expensive bundles
repo-roller history export --format json | jq 'sort_by(.result.estimatedCost) | reverse | .[0:10]'

# Get average tokens
repo-roller history export --format json | jq '[.[] | .result.estimatedTokens] | add / length'
```

### Cleanup Old Entries

History files can grow large over time. Clean up manually:

```bash
# Backup first
cp ~/.config/repo-roller/history.jsonl ~/.config/repo-roller/history.backup.jsonl

# Keep only last 100 entries
tail -n 100 ~/.config/repo-roller/history.jsonl > ~/.config/repo-roller/history.tmp.jsonl
mv ~/.config/repo-roller/history.tmp.jsonl ~/.config/repo-roller/history.jsonl
```

### Share History

Export and share with team:

```bash
# Export specific project history
repo-roller history list --project my-app | repo-roller history export --format json > project-history.json

# Import on another machine (manual merge required)
# Append to existing history file
cat project-history.json | jq -c '.[]' >> ~/.config/repo-roller/history.jsonl
```

## Troubleshooting

### History Not Recording

**Problem:** New generations don't appear in history

**Solution:** Check file permissions:

```bash
ls -la ~/.config/repo-roller/history.jsonl
chmod 644 ~/.config/repo-roller/history.jsonl
```

### Corrupted History File

**Problem:** History commands fail with parse errors

**Solution:** Validate and fix:

```bash
# Validate JSON Lines format
cat ~/.config/repo-roller/history.jsonl | while read line; do echo "$line" | jq empty || echo "Invalid: $line"; done

# Backup and start fresh
mv ~/.config/repo-roller/history.jsonl ~/.config/repo-roller/history.corrupted.jsonl
touch ~/.config/repo-roller/history.jsonl
```

### Large History File

**Problem:** History file is very large

**Solution:** Archive old entries:

```bash
# Archive entries older than 90 days
# (requires jq and manual implementation)

# Or simply truncate to recent entries
tail -n 1000 ~/.config/repo-roller/history.jsonl > ~/.config/repo-roller/history.tmp.jsonl
mv ~/.config/repo-roller/history.tmp.jsonl ~/.config/repo-roller/history.jsonl
```

### Can't Find Entry

**Problem:** Can't find a specific history entry

**Solution:** Use search and filters:

```bash
# Search by project
repo-roller history search --query "project-name"

# Search by date
repo-roller history search --since "2024-01-15"

# Export and search manually
repo-roller history export --format json | jq '.[] | select(.project.name == "my-project")'
```

## Best Practices

### 1. Tag Important Generations

Tag production bundles, releases, or significant milestones:

```bash
repo-roller history tag -1 production,v2.0,release
```

### 2. Add Context with Notes

Add notes to explain why a bundle was generated:

```bash
repo-roller history note -1 "Pre-deployment bundle for security review"
```

### 3. Periodic Exports

Back up history regularly:

```bash
# Add to crontab
0 0 * * 0 repo-roller history export --format json > ~/backups/repo-roller-history-$(date +%Y%m%d).json
```

### 4. Use Diff for Code Reviews

Compare bundles before and after code changes:

```bash
# Before changes
repo-roller --preset ts --tag before-refactor

# After changes
repo-roller --preset ts --tag after-refactor

# Compare
repo-roller history diff before-refactor..after-refactor
```

### 5. Monitor Costs

Review costs periodically:

```bash
# Weekly cost review
repo-roller history search --since 7d | repo-roller history stats
```

## Related Documentation

- **[Getting Started](/guide/getting-started)** - Basic usage
- **[Interactive Mode](/guide/interactive-mode)** - Interactive bundle generation
- **[User Settings](/guide/user-settings)** - Configure repo-roller
- **[CI/CD Integration](/guide/ci-cd)** - Use history in automation

## Next Steps

- **View your history** - `repo-roller history list`
- **Explore a past generation** - `repo-roller history show -1`
- **Compare two bundles** - `repo-roller history diff -2..-1`
- **Tag important bundles** - `repo-roller history tag -1 important`
