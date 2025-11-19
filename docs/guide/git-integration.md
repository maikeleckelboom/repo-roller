# Git Integration

repo-roller integrates with Git to help you generate bundles based on repository changes. Filter files by commits, branches, or recent activity to create focused bundles for code review, debugging, or LLM analysis.

## Git-Aware Features

repo-roller provides two main Git features:

1. **Diff-based filtering** - Include only files changed since a reference
2. **Recent file selection** - Include the N most recently committed files

Both features require a Git repository and automatically exclude deleted files.

## Diff-Based Filtering

Generate bundles containing only files that have changed since a specific Git reference.

### Basic Usage

```bash
# Files changed since main branch
repo-roller --diff main

# Files changed since develop
repo-roller --diff develop

# Files changed since specific commit
repo-roller --diff abc123

# Files changed in last 3 commits
repo-roller --diff HEAD~3
```

### How It Works

The `--diff` flag:

1. Runs `git diff --name-only <ref>` to get changed files
2. Filters the repo-roller scan to only include those files
3. Excludes deleted files (only Added/Modified)
4. Applies additional filters (preset, extensions, etc.)

### Use Cases

#### Code Review

Generate bundles of changes for review:

```bash
# Review changes before merging feature branch
git checkout feature/new-auth
repo-roller --diff main -o review.md

# Share with team for review
```

#### Pull Request Context

Create bundles for PR descriptions:

```bash
# Get all changes in current branch
repo-roller --diff origin/main --preset ts -o pr-context.md

# Include in PR description for LLM review
```

#### Incremental Analysis

Analyze changes incrementally:

```bash
# Day 1
git checkout feature/api
# ... work ...
git commit -m "Add user endpoints"

# Day 2
# ... more work ...
git commit -m "Add validation"

# Review day 2 changes only
repo-roller --diff HEAD~1 -o day2-changes.md
```

#### Bug Investigation

Focus on recent changes related to a bug:

```bash
# What changed since the last working version?
repo-roller --diff v1.2.3 --include "src/billing/**"
```

#### Cross-Branch Comparison

Compare different branches:

```bash
# See what's in feature branch but not main
git checkout feature/payments
repo-roller --diff main -o feature-diff.md

# See what's in main but not feature (reverse)
git checkout main
repo-roller --diff feature/payments -o main-diff.md
```

### Examples

**Example 1: Review feature branch**

```bash
# Switch to feature branch
git checkout feature/user-auth

# Generate bundle of all changes
repo-roller --diff main \
  --preset typescript \
  --no-tests \
  -o auth-feature-review.md

# Result: Only files changed in the auth feature
```

**Example 2: Recent commits**

```bash
# Last 5 commits
repo-roller --diff HEAD~5 \
  --include "src/**/*.ts" \
  --strip-comments \
  -o recent-changes.md
```

**Example 3: Compare with remote**

```bash
# Fetch latest
git fetch origin

# Compare with remote main
repo-roller --diff origin/main -o local-changes.md

# See what you're about to push
```

**Example 4: Specific file types**

```bash
# Only TypeScript files changed since main
repo-roller --diff main --ext ts,tsx -o ts-changes.md

# Only documentation changes
repo-roller --diff main --ext md --include "docs/**"
```

## Recent File Selection

Include the N most recently committed files, regardless of branch.

### Basic Usage

```bash
# 10 most recently committed files
repo-roller --most-recent 10

# 50 most recent files
repo-roller --most-recent 50

# Recent files with specific extensions
repo-roller --most-recent 20 --ext ts
```

### How It Works

The `--most-recent` flag:

1. Runs `git log --name-only --diff-filter=AM` to get committed files
2. Deduplicates and orders by recency (most recent first)
3. Takes the first N unique files
4. Filters to only Added/Modified files (excludes deleted)
5. Applies additional filters (extensions, includes, etc.)

### Use Cases

#### Quick Context Building

Get the most relevant recent files:

```bash
# 20 most recent TypeScript files
repo-roller --most-recent 20 --ext ts -o recent-work.md

# Share with LLM for context about recent changes
```

#### Activity Summary

See what's been actively developed:

```bash
# Recent 30 files to understand current focus
repo-roller --most-recent 30 --preset typescript
```

#### Onboarding

Help new developers see active areas:

```bash
# Recent 50 files to see what's being worked on
repo-roller --most-recent 50 \
  --include "src/**" \
  --no-tests \
  -o active-codebase.md
```

#### Debugging

Focus on recently changed code:

```bash
# Bug appeared recently? Check recent changes
repo-roller --most-recent 15 \
  --include "src/payment/**" \
  -o recent-payment-changes.md
```

### Examples

**Example 1: Recent work summary**

```bash
# 25 most recent files, no tests
repo-roller --most-recent 25 \
  --no-tests \
  --strip-comments \
  -o recent-summary.md
```

**Example 2: Specific module**

```bash
# Recent changes in auth module
repo-roller --most-recent 10 \
  --include "src/auth/**" \
  --ext ts
```

**Example 3: Active development areas**

```bash
# See what's being actively developed
repo-roller --most-recent 40 \
  --preset typescript \
  --with-tree \
  -o active-areas.md
```

**Example 4: Cross-language recent work**

```bash
# Recent files across languages
repo-roller --most-recent 30 \
  --ext ts,py,go \
  -o recent-polyglot.md
```

## Combining Git Features with Other Options

Git features work with all repo-roller options.

### With Presets

```bash
# Changed TypeScript files since main
repo-roller --diff main --preset typescript

# Recent Python files
repo-roller --most-recent 20 --preset python
```

### With Token Budgets

```bash
# Recent files within token limit
repo-roller --most-recent 50 \
  --max-tokens 100000 \
  --target claude-3.5-sonnet

# If exceeds limit, repo-roller stops at the token limit
```

### With Interactive Mode

```bash
# Interactive selection of changed files
repo-roller -I --diff main

# Interactive selection of recent files
repo-roller -I --most-recent 20
```

The file tree shows only the filtered files, pre-selected.

### With Profiles

```bash
# Changed files in profile order
repo-roller --diff main --profile core-first

# Recent files ordered by profile
repo-roller --most-recent 30 --profile api-first
```

### With Output Formats

```bash
# Changed files as JSON
repo-roller --diff main --format json -o changes.json

# Recent files as YAML
repo-roller --most-recent 15 --format yaml
```

## Git Integration Details

### Repository Detection

repo-roller automatically detects Git repositories:

```bash
# In a git repo
cd /path/to/git/repo
repo-roller --diff main  # ✓ Works

# Not in a git repo
cd /tmp
repo-roller --diff main  # ✗ Error: Not a git repository
```

### Branch Information

When in a Git repository, history entries include:

- **Branch name** - Current branch
- **Commit hash** - Current HEAD commit

This helps track which branch a bundle was generated from.

### Git References

The `--diff` flag accepts any valid Git reference:

```bash
# Branch names
repo-roller --diff main
repo-roller --diff develop
repo-roller --diff feature/auth

# Remote branches
repo-roller --diff origin/main
repo-roller --diff upstream/develop

# Commit hashes
repo-roller --diff abc123
repo-roller --diff a1b2c3d4e5f6

# Relative references
repo-roller --diff HEAD~1   # Last commit
repo-roller --diff HEAD~5   # Last 5 commits
repo-roller --diff HEAD^    # Parent of HEAD

# Tags
repo-roller --diff v1.0.0
repo-roller --diff release/2024-01
```

### Deleted Files

Both `--diff` and `--most-recent` automatically exclude deleted files:

```bash
# File deleted in last commit
git rm src/old-file.ts
git commit -m "Remove old file"

# Won't appear in diff or recent
repo-roller --diff HEAD~1  # old-file.ts excluded
repo-roller --most-recent 10  # old-file.ts excluded
```

Only Added (A) and Modified (M) files are included.

## Workflows

### Workflow 1: Pre-Merge Review

Before merging a feature branch:

```bash
# Switch to feature branch
git checkout feature/new-api

# Generate review bundle
repo-roller --diff main \
  --preset typescript \
  --no-tests \
  --strip-comments \
  -o review-before-merge.md

# Review or share with team
```

### Workflow 2: Daily Standup Summary

Share what you worked on:

```bash
# Yesterday's work
repo-roller --most-recent 15 \
  --ext ts \
  -o daily-summary.md

# Quick overview for standup
```

### Workflow 3: Bug Bisect

Find when a bug was introduced:

```bash
# Check changes in last 10 commits
for i in {1..10}; do
  echo "Checking HEAD~$i"
  repo-roller --diff HEAD~$i --diff HEAD~$((i-1)) \
    -o commit-$i-diff.md
done

# Review each diff to find the problematic commit
```

### Workflow 4: Release Notes

Generate release notes from changes:

```bash
# Changes since last release
repo-roller --diff v1.0.0 \
  --include "src/**" \
  --no-tests \
  --format markdown \
  -o v1.1.0-changes.md

# Use for release notes or changelog
```

### Workflow 5: Code Review Preparation

Prepare for code review:

```bash
# Create focused bundles for review
repo-roller --diff main \
  --include "src/auth/**" \
  -o auth-review.md

repo-roller --diff main \
  --include "src/api/**" \
  -o api-review.md

# Review each area separately
```

### Workflow 6: LLM-Assisted Review

Get LLM help reviewing changes:

```bash
# Generate diff bundle
repo-roller --diff main \
  --preset typescript \
  --max-tokens 150000 \
  --target claude-3.5-sonnet \
  -o changes-for-review.md

# Send to Claude with prompt:
# "Review these changes for bugs, security issues, and best practices"
```

### Workflow 7: Track Refactoring

Document refactoring changes:

```bash
# Before refactoring
git checkout main
git tag before-refactor
git checkout -b refactor/cleanup

# ... do refactoring ...
git commit -m "Refactor authentication"

# After refactoring, generate diff
repo-roller --diff before-refactor \
  --include "src/auth/**" \
  -o refactoring-changes.md

# Document what changed
```

## Advanced Patterns

### Combining Multiple Filters

```bash
# Changed TypeScript files in src/, excluding tests
repo-roller --diff main \
  --include "src/**/*.ts" \
  --exclude "**/*.test.ts" \
  --strip-comments
```

### Interactive Selection of Changed Files

```bash
# Show only changed files in interactive tree
repo-roller -I --diff main

# Select subset of changed files
```

### Different Diffs for Different Modules

```bash
# Frontend changes
repo-roller --diff main \
  --include "frontend/**" \
  -o frontend-changes.md

# Backend changes
repo-roller --diff main \
  --include "backend/**" \
  -o backend-changes.md
```

### Track File Churn

Find most-changed files:

```bash
# Get recent files, see which appear most often
repo-roller --most-recent 100 | sort | uniq -c | sort -rn
```

(Note: This requires additional scripting)

## Error Handling

### Not a Git Repository

**Error:**
```
Error: Not a git repository
The --diff flag requires a git repository.
```

**Solution:**
```bash
# Initialize git repo
git init

# Or run in a git repository
cd /path/to/git/repo
```

### Invalid Reference

**Error:**
```
Error: Invalid git reference: nonexistent-branch
Make sure the branch or commit exists.
```

**Solution:**
```bash
# Check available branches
git branch -a

# Check commits
git log --oneline

# Use valid reference
repo-roller --diff main
```

### No Commits

**Error:**
```
Error: Repository has no commits yet
```

**Solution:**
```bash
# Make initial commit
git add .
git commit -m "Initial commit"

# Then use --diff or --most-recent
```

### Empty Diff

**Result:** No files changed

```
No files found matching the criteria.
```

**This is normal when:**
- No files changed between references
- All changed files are filtered out (tests, etc.)
- Only deleted files in diff

## Tips and Best Practices

### 1. Use --diff for Focused Reviews

Instead of generating the entire codebase, use `--diff` to focus on changes:

```bash
# More focused
repo-roller --diff main

# Less focused
repo-roller  # All files
```

### 2. Combine with Token Budgets

Prevent huge diffs from exceeding LLM limits:

```bash
repo-roller --diff main \
  --max-tokens 100000 \
  --target claude-3.5-sonnet
```

### 3. Use Recent Files for Context

When asking LLMs about your project:

```bash
# Give LLM recent context
repo-roller --most-recent 30 \
  --preset typescript \
  -o context.md

# Include in your prompt
```

### 4. Tag Git-Based Bundles

Tag history entries for git-based bundles:

```bash
# After generating
repo-roller --diff main -o changes.md
repo-roller history tag -1 "diff-main"

# Later find all diff bundles
repo-roller history search --tag "diff-main"
```

### 5. Use Interactive Mode for Complex Diffs

When diff includes many files:

```bash
# Review and select interactively
repo-roller -I --diff main

# Deselect unimportant files
```

### 6. Fetch Before Diffing Remote Branches

Always fetch latest remote changes:

```bash
# Fetch first
git fetch origin

# Then diff
repo-roller --diff origin/main
```

### 7. Document Branch in Filenames

Include branch info in output filename:

```bash
# Current branch
BRANCH=$(git branch --show-current)

# Include in filename
repo-roller --diff main -o "diff-${BRANCH}.md"
```

## Troubleshooting

### Diff Shows No Files

**Problem:** `--diff main` shows "No files found"

**Solution:**

```bash
# Check if there are changes
git diff --name-only main

# If empty, no changes exist
# If has files, check filters
repo-roller --diff main --verbose
```

### Recent Files Not Showing

**Problem:** `--most-recent 10` shows fewer than 10 files

**Solution:**

Your repository might have fewer than 10 commits. Check:

```bash
# Count commits
git log --oneline | wc -l

# See available files
git log --name-only --pretty=format: | sort -u
```

### Wrong Files in Diff

**Problem:** Diff includes unexpected files

**Solution:**

```bash
# Verify git diff
git diff --name-only main

# Check for unintended filters
repo-roller --diff main --verbose
```

### Performance Issues with Large Diffs

**Problem:** Diff of thousands of files is slow

**Solution:**

```bash
# Add more filters
repo-roller --diff main \
  --include "src/**" \
  --no-tests

# Or use token limits
repo-roller --diff main --max-tokens 150000
```

## Related Documentation

- **[File Selection](/cli/file-selection)** - File filtering options
- **[Presets](/guide/presets)** - Pre-configured filters
- **[Interactive Mode](/guide/interactive-mode)** - Visual file selection
- **[History](/guide/history)** - Track generations

## Next Steps

- **Try diff filtering** - `repo-roller --diff main`
- **Explore recent files** - `repo-roller --most-recent 10`
- **Combine with presets** - `repo-roller --diff main --preset ts`
- **Use in code review** - Generate focused review bundles
