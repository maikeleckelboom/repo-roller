# Git Integration

Filter files based on git history and changes.

## Overview

repo-roller integrates with git to intelligently filter files based on:
- Changes since a reference (branch, tag, commit)
- Recently committed files
- Git status and working tree
- Commit metadata

**Benefits:**
- Focus on relevant changes
- Reduce context size
- Speed up code review
- Track incremental work

## Git Repository Detection

repo-roller automatically detects git repositories:

```bash
# Auto-detects .git in current directory or parents
repo-roller

# Specify repository root
repo-roller /path/to/repo

# Works in subdirectories
cd src/core
repo-roller  # Detects repo at project root
```

**Detection logic:**
1. Checks current directory for `.git`
2. Walks up directory tree
3. Uses git repository root
4. Falls back to directory scanning if not in git repo

**Non-git directories:**
```bash
# Works without git
repo-roller /path/to/non-git-dir
# Scans normally, git features disabled
```

## Changed Files

### `--diff <ref>`

Include only files changed since git reference.

```bash
# Changes since main branch
repo-roller --diff main

# Changes since last commit
repo-roller --diff HEAD~1

# Changes since tag
repo-roller --diff v1.0.0

# Changes since specific commit
repo-roller --diff abc1234

# Changes in last 3 commits
repo-roller --diff HEAD~3
```

**How it works:**
1. Runs `git diff --name-only <ref>...HEAD`
2. Filters file list to changed files
3. Applies other filters (`--include`, `--exclude`, etc.)
4. Generates bundle with only changed files

**Output:**
```
✓ Scanning ./my-project
✓ Found 8 changed files since main (12.3 KB)

Changed files:
  ✓ src/core/scanner.ts (modified)
  ✓ src/cli/commands.ts (modified)
  ✓ src/utils/helpers.ts (added)
  ✓ tests/scanner.test.ts (modified)
```

### Branch Comparison

```bash
# Changes in current branch vs main
repo-roller --diff main

# Changes in feature branch vs develop
git checkout feature/auth
repo-roller --diff develop

# Changes between branches
git checkout main
repo-roller --diff feature/auth  # Shows what's in feature/auth
```

### Tag Comparison

```bash
# Changes since last release
repo-roller --diff v1.0.0

# Changes between tags
repo-roller --diff v1.0.0..v1.1.0  # Not yet supported, use commits
```

### Commit Range

```bash
# Last commit
repo-roller --diff HEAD~1

# Last 5 commits
repo-roller --diff HEAD~5

# Specific commit
repo-roller --diff abc1234567

# Since specific date (via commit)
repo-roller --diff $(git rev-list -1 --before="2024-01-01" HEAD)
```

## Recent Files

### `--most-recent <n>`

Include N most recently committed files.

```bash
# Last 5 changed files
repo-roller --most-recent 5

# Last 10 files
repo-roller --most-recent 10

# Last 20 with TypeScript filter
repo-roller --most-recent 20 --ext ts,tsx
```

**How it works:**
1. Runs `git log --name-only --pretty=format: HEAD`
2. Collects unique file paths
3. Takes first N files
4. Filters by other criteria
5. Sorts by commit recency

**Output:**
```
✓ Scanning ./my-project
✓ Found 5 most recently committed files (8.9 KB)

Recent files (by commit time):
  ✓ src/core/scanner.ts (2 hours ago)
  ✓ src/cli/commands.ts (3 hours ago)
  ✓ src/utils/helpers.ts (5 hours ago)
  ✓ tests/scanner.test.ts (1 day ago)
  ✓ docs/api.md (2 days ago)
```

### With Other Filters

```bash
# Recent TypeScript files only
repo-roller --most-recent 10 --ext ts,tsx

# Recent files in src/ directory
repo-roller --most-recent 15 --include "src/**"

# Recent files, exclude tests
repo-roller --most-recent 20 --no-tests
```

## Use Cases

### Code Review

Bundle only changed files for PR review:

```bash
# Review changes in current branch
repo-roller --diff main -o pr-review.md --copy

# With interactive selection
repo-roller --diff main -I

# Add context with related files
repo-roller --diff main --include "src/core/**"
```

**Workflow:**
```bash
# 1. Create feature branch
git checkout -b feature/auth

# 2. Make changes
git commit -am "Add authentication"

# 3. Review changes
repo-roller --diff main --dry-run

# 4. Generate PR bundle
repo-roller --diff main -o pr-context.md --copy

# 5. Paste into PR description or LLM
```

### Bug Investigation

Focus on recently changed files:

```bash
# Last 5 changes
repo-roller --most-recent 5 --copy

# Recent changes in specific module
repo-roller --most-recent 10 --include "src/auth/**"

# Track down regression
repo-roller --diff v1.2.0 --include "src/payments/**"
```

### Incremental Documentation

Document recent work:

```bash
# Last week's changes
repo-roller --diff HEAD~20 --lang markdown

# Recent code changes only
repo-roller --most-recent 15 --no-tests --ext ts
```

### Feature Context

Gather context for specific feature:

```bash
# Feature branch changes
git checkout feature/payments
repo-roller --diff main --include "src/payments/**"

# With tests
repo-roller --diff main --include "src/payments/**" --include "tests/payments/**"
```

### Release Notes

Changes since last release:

```bash
# Since last tag
repo-roller --diff v1.0.0 --format md -o changelog-context.md

# By language
repo-roller --diff v1.0.0 --lang typescript
```

### Hot Fix Analysis

Recent critical changes:

```bash
# Last 3 commits
repo-roller --diff HEAD~3 --include "src/core/**"

# Specific commit
repo-roller --diff abc1234 --verbose
```

## Combining Git Filters

### With File Filters

```bash
# TypeScript changes since main
repo-roller --diff main --ext ts,tsx

# No tests, changed files only
repo-roller --diff main --no-tests

# Specific directories
repo-roller --diff main --include "src/**" --include "lib/**"
```

### With Token Budget

```bash
# Recent changes within budget
repo-roller --most-recent 20 --max-tokens 50000

# Changed files within cost
repo-roller --diff main --max-cost 1.00
```

### With Modes

```bash
# Preview changes
repo-roller --diff main --dry-run

# Interactive selection of changed files
repo-roller --diff main -I

# Stats on recent changes
repo-roller --most-recent 10 --stats-only
```

## Advanced Patterns

### Staged vs Committed

```bash
# Committed changes only (default)
repo-roller --diff HEAD~1

# Include unstaged changes (use git status)
git diff --name-only > /tmp/changed.txt
repo-roller --include $(cat /tmp/changed.txt)
```

### Multiple Branches

```bash
# Compare feature branch to main
git checkout feature/auth
repo-roller --diff main

# Compare to develop
repo-roller --diff develop

# Different base branch
repo-roller --diff origin/staging
```

### Specific Commit Range

```bash
# Last commit
repo-roller --diff HEAD~1

# Specific range (approximate)
repo-roller --diff HEAD~5

# Since merge base
repo-roller --diff $(git merge-base main HEAD)
```

### Authored Files

```bash
# Your recent commits
repo-roller --most-recent 20 --include $(git log --author="$(git config user.name)" --name-only --pretty=format: | sort -u)
```

## Examples

### Example 1: PR Review Bundle

```bash
# Create PR review context
git checkout feature/new-api
repo-roller --diff main --copy
```

**Result:** Clipboard contains only changed files, ready to paste into LLM.

### Example 2: Bug Fix Context

```bash
# Last 5 changed files for investigation
repo-roller --most-recent 5 -o bug-context.md
```

**Result:** Recent changes in a file for analysis.

### Example 3: Feature Development

```bash
# Review feature branch changes
git checkout feature/payments
repo-roller --diff main --include "src/payments/**" -I
```

**Result:** Interactive selection of payment-related changes.

### Example 4: Release Comparison

```bash
# Changes since v1.0.0
repo-roller --diff v1.0.0 --no-tests -o release-1.1-changes.md
```

**Result:** Code changes for release notes.

### Example 5: Hot Fix Review

```bash
# Last 3 commits in production
repo-roller --diff HEAD~3 --target claude-sonnet --llm
```

**Result:** Recent critical changes with cost analysis.

### Example 6: Code Review with Context

```bash
# Changed files plus related types
repo-roller --diff main --include "src/**/*.ts" --include "types/**"
```

**Result:** Changes with type definitions for context.

### Example 7: Recent Work Summary

```bash
# Last 10 files, no tests or generated code
repo-roller --most-recent 10 --no-tests --no-generated
```

**Result:** Clean summary of recent work.

## Best Practices

### For Pull Requests

```bash
# Review before committing
repo-roller --diff main --dry-run

# Generate PR context
repo-roller --diff main --copy --strip-comments
```

### For Bug Investigation

```bash
# Start with recent changes
repo-roller --most-recent 5

# Expand if needed
repo-roller --most-recent 10 --include "src/**"
```

### For Code Review

```bash
# Preview first
repo-roller --diff main --dry-run --verbose

# Then generate
repo-roller --diff main -o review.md
```

### For Feature Context

```bash
# Feature branch changes
repo-roller --diff main --include "src/feature/**"

# With dependencies
repo-roller --diff main --include "src/feature/**" --include "src/core/**"
```

### For Release Planning

```bash
# Since last tag
repo-roller --diff v1.0.0 --stats-only --llm

# Generate release context
repo-roller --diff v1.0.0 --no-tests -o release-context.md
```

## Git Status Integration

repo-roller also considers git status:

### Untracked Files

```bash
# Includes untracked files by default
repo-roller

# Excludes .gitignore patterns
repo-roller --no-gitignore
```

### Ignored Files

```bash
# .gitignore files excluded by default
repo-roller

# Include .gitignore files
repo-roller --no-gitignore
```

### Staged Changes

```bash
# Includes staged and committed files
repo-roller --diff HEAD
```

## Troubleshooting

### Not a git repository

```bash
# Error
repo-roller --diff main
# fatal: not a git repository

# Solution: Initialize git or use without git filters
git init
# or
repo-roller  # Without --diff
```

### Unknown revision

```bash
# Error
repo-roller --diff unknown-branch
# fatal: ambiguous argument 'unknown-branch': unknown revision

# Solution: Use valid reference
git branch -a  # List branches
repo-roller --diff main
```

### No changes found

```bash
# No files since ref
repo-roller --diff main
# Warning: No changed files found

# Check git diff
git diff --name-only main

# Try different ref
repo-roller --diff HEAD~5
```

### Submodules

```bash
# Submodule changes not included by default
repo-roller --diff main

# Include submodule paths manually
repo-roller --diff main --include "submodule/**"
```

## Performance

Git filtering is fast:

```bash
# Scan 1000 files
repo-roller  # ~500ms

# Filter to 10 changed files
repo-roller --diff main  # ~150ms (3x faster)

# Most recent 5 files
repo-roller --most-recent 5  # ~100ms (5x faster)
```

**Tips:**
- Use git filters to reduce scanning
- Combine with `--ext` for best performance
- `--most-recent` faster than `--diff`
- Works with `--dry-run` for instant preview

## Exit Codes

| Code | Meaning | Example |
|------|---------|---------|
| 0 | Success | Files found and processed |
| 1 | General error | Git command failed |
| 2 | Invalid arguments | Bad git ref |
| 4 | No files | No changed files found |

## Related Options

- [File Selection](/cli/file-selection) - Basic file filtering
- [Modes](/cli/modes) - Preview and interactive modes
- [Content Options](/cli/content-options) - Control output content
- [Display Control](/cli/display-control) - Output verbosity
