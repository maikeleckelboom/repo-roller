# CLI Reference

repo-roller provides a comprehensive command-line interface with options organized into logical categories.

## Quick Reference

```bash
repo-roller [path] [options]
```

**Aliases:** `rr` (short form)

## Basic Usage

```bash
# Generate with defaults
repo-roller

# Specify directory
repo-roller ./my-project

# Use preset
repo-roller --preset ts

# Interactive mode
repo-roller -I

# Custom output
repo-roller -o bundle.md --format md
```

## Option Categories

### [Output Options](/cli/output-options)

Control where and how output is generated:

- `-o, --out` - Output file path
- `--out-template` - Filename template
- `-f, --format` - Output format (md, json, yaml, txt)
- `--compact` - Minify JSON output
- `--toc` - Add table of contents
- `--front-matter` - Add YAML front matter

### [File Selection](/cli/file-selection)

Filter which files are included:

- `-i, --include` - Include patterns
- `-x, --exclude` - Exclude patterns
- `--ext` - File extensions
- `--lang` - Language filter
- `--max-size` - Maximum file size
- `--no-tests` - Exclude tests
- `--no-deps` - Exclude dependencies

### [Content Options](/cli/content-options)

Control what appears in output:

- `--strip-comments` - Remove comments
- `--no-tree` - Disable directory tree
- `--no-stats` - Disable statistics
- `--sort` - Sort mode

### [Token Management](/cli/token-management)

Manage tokens and costs:

- `--target` - Target LLM provider
- `--max-tokens` - Token budget
- `--max-cost` - Cost budget (USD)
- `--warn-tokens` - Warning threshold
- `--no-token-count` - Disable counting

### [Display Control](/cli/display-control)

Control terminal output:

- `-v, --verbose` - Verbose output
- `-q, --quiet` - Minimal output
- `--hide-composition` - Hide code composition
- `--hide-cost` - Hide cost estimates
- `--hide-warnings` - Hide warnings

### [Modes](/cli/modes)

Execution modes:

- `-I, --interactive` - Interactive TUI mode
- `--dry-run` - Preview without generating
- `--stats-only` - Show statistics only

### [Git Commands](/cli/git-commands)

Git integration options:

- `--diff` - Files changed since ref
- `--most-recent` - Recently committed files

### [Utility Commands](/cli/utility-commands)

Additional utilities:

- `-c, --copy` - Copy to clipboard
- `--validate` - Validate configuration
- `--list-presets` - List available presets
- `--list-providers` - List LLM providers
- `--examples` - Show usage examples

## Global Options

### Help and Version

```bash
# Show help
repo-roller --help
repo-roller -h

# Show version
repo-roller --version
repo-roller -v
```

### Configuration

```bash
# Use preset
repo-roller --preset <name>

# Use profile
repo-roller --profile <name>

# Use model preset
repo-roller --model <name>
```

### Common Combinations

```bash
# TypeScript with budget
repo-roller --preset ts --max-tokens 100000

# Interactive with target
repo-roller -I --target claude-3.5-sonnet

# JSON output with validation
repo-roller --format json --validate

# Dry run with stats
repo-roller --dry-run --stats-only
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Validation error |
| 4 | File system error |
| 5 | Budget exceeded |

## Environment Variables

```bash
# Set default target provider
export REPO_ROLLER_TARGET=claude-3.5-sonnet

# Set default output directory
export REPO_ROLLER_OUTPUT_DIR=./bundles

# Disable color output
export NO_COLOR=1
```

## Configuration Files

repo-roller looks for configuration in:

1. Command-line arguments (highest priority)
2. `.reporoller.yml` in current directory
3. `repo-roller.config.mjs` in current directory
4. User settings in `~/.config/repo-roller/settings.json`
5. Built-in defaults (lowest priority)

## Examples

### Example 1: TypeScript Project

```bash
repo-roller --preset ts --no-tests -o typescript-bundle.md
```

### Example 2: Budget-Constrained

```bash
repo-roller --max-cost 1.00 --target gpt-4-turbo --format json
```

### Example 3: Recent Changes

```bash
repo-roller --most-recent 10 --include "src/**/*.ts"
```

### Example 4: Custom Filtering

```bash
repo-roller \
  --include "src/**/*.ts" \
  --exclude "**/*.test.ts" \
  --exclude "**/*.spec.ts" \
  --max-size 100 \
  --strip-comments
```

### Example 5: Interactive with Preview

```bash
repo-roller -I --dry-run
```

## Advanced Usage

### Chaining Commands

```bash
# Generate and copy to clipboard
repo-roller --preset ts -o bundle.md && cat bundle.md | pbcopy

# Generate and show stats
repo-roller --stats-only > stats.txt && cat stats.txt
```

### Using with Git

```bash
# Files changed in last commit
repo-roller --diff HEAD~1

# Files changed in PR
repo-roller --diff main

# Recent work
repo-roller --most-recent 5
```

### Daemon Mode

```bash
# Start daemon
repo-roller daemon start

# Check status
repo-roller daemon status

# Stop daemon
repo-roller daemon stop
```

### History Management

```bash
# List history
repo-roller history list

# Search history
repo-roller history search --tag "review"

# Show specific entry
repo-roller history show <id>

# Replay generation
repo-roller history show <id> --replay
```

## Next Steps

- **[Output Options](/cli/output-options)** - Detailed output configuration
- **[File Selection](/cli/file-selection)** - Advanced filtering techniques
- **[Token Management](/cli/token-management)** - Budget and cost control
- **[Examples](/guide/examples)** - Real-world use cases
