# Execution Modes

Different ways to run repo-roller for various workflows.

## Interactive Mode

### `-I, --interactive`

Launch visual TUI (Terminal User Interface) for file selection.

```bash
# Interactive mode
repo-roller -I

# Interactive with preset
repo-roller -I --preset ts

# Interactive with filters
repo-roller -I --include "src/**/*.ts"
```

**Features:**
- Visual file browser
- Real-time token estimation
- File filtering and search
- Multi-select with space
- Preview file contents
- Toggle filters on/off
- Keyboard navigation

**Interface:**
```
┌─────────────────────────────────────────────────────────────────┐
│  repo-roller - Interactive File Selection                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ◉ src/core/index.ts              4.2 KB    1,234 tokens       │
│  ◉ src/core/scanner.ts            8.1 KB    2,456 tokens       │
│  ☐ src/core/types.ts              2.3 KB      678 tokens       │
│  ◉ src/cli/commands.ts           12.3 KB    3,789 tokens       │
│  ☐ src/cli/display.ts             6.7 KB    2,012 tokens       │
│  ◉ src/utils/helpers.ts           3.4 KB    1,023 tokens       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Selected: 4/6 files  |  24.0 KB  |  8,502 tokens              │
│                                                                  │
│  [Space] Toggle  [Enter] Generate  [/] Search  [q] Quit        │
└─────────────────────────────────────────────────────────────────┘
```

**Keyboard shortcuts:**
- `Space` - Toggle file selection
- `Enter` - Generate with selected files
- `↑/↓` or `j/k` - Navigate files
- `/` - Search files
- `a` - Select all
- `n` - Deselect all
- `f` - Toggle filters
- `p` - Preview file
- `?` - Show help
- `q` - Quit

**Use cases:**
- Reviewing files before bundling
- Fine-grained file selection
- Learning what would be included
- Visual exploration
- Custom file sets

**Notes:**
- Respects all CLI filters (`--include`, `--exclude`, etc.)
- Real-time token counting
- Shows file previews
- Saves preferences
- Works with presets

### `--no-interactive`

Force non-interactive mode (skip TUI even if terminal supports it).

```bash
# Force non-interactive
repo-roller --no-interactive

# Useful in scripts
repo-roller --preset ts --no-interactive -o bundle.md
```

**Use cases:**
- CI/CD pipelines
- Automated scripts
- Batch processing
- Headless environments

## Preview Modes

### `--dry-run`

Preview what would be included without generating output.

```bash
# Dry run
repo-roller --dry-run

# Dry run with preset
repo-roller --preset ts --dry-run

# Dry run with verbose
repo-roller --dry-run --verbose
```

**Output:**
```
┌─────────────────────────────────────────────────────────┐
│  repo-roller                                            │
└─────────────────────────────────────────────────────────┘

✓ Scanning ./my-project

Preview
Would include 42 files

  ✓ src/core/index.ts (4.2 KB)
  ✓ src/core/scanner.ts (8.1 KB)
  ✓ src/core/types.ts (2.3 KB)
  ✓ src/cli/commands.ts (12.3 KB)
  ✓ src/cli/display.ts (6.7 KB)
  ...
  … and 37 more files

Total: 42 files, 156.7 KB
Estimated tokens: 45,234

Claude Sonnet: $0.68 (22.6% of context)

Run without --dry-run to generate output
```

**Use cases:**
- Testing filters
- Verifying selection
- Checking token estimate
- Previewing before generation
- Learning file discovery

**With verbose:**
```bash
repo-roller --dry-run --verbose
```

Shows detailed filtering decisions:
```
→ File filtering
  Initial: 156 files
  After .gitignore: 98 files
  After --exclude: 58 files
  After --no-tests: 42 files
  Final: 42 files
```

### `--stats-only`

Show statistics without generating output.

```bash
# Stats only
repo-roller --stats-only

# Stats with target
repo-roller --stats-only --target claude-sonnet

# Stats with LLM analysis
repo-roller --stats-only --llm
```

**Output:**
```
┌─────────────────────────────────────────────────────────┐
│  repo-roller                                            │
└─────────────────────────────────────────────────────────┘

✓ Scanning ./my-project

Statistics
Total files: 42
Total size: 156.7 KB

Extensions
──────────────────────────────────
  .ts         35 files
  .tsx        3 files
  .json       3 files
  .md         1 file
```

**With `--llm`:**
```
Statistics
Total files: 42
Total size: 156.7 KB
Estimated tokens: 45,234

LLM Analysis
════════════

Provider Comparison:
┌─────────────────────┬──────────┬────────────┬──────────┐
│ Provider            │ Fits?    │ Input Cost │ Output   │
├─────────────────────┼──────────┼────────────┼──────────┤
│ Claude 3.5 Sonnet   │ ✓ 22.6%  │ $0.68      │ $3.39    │
│ GPT-4 Turbo         │ ✓ 35.3%  │ $1.42      │ $4.26    │
│ Gemini 1.5 Pro      │ ✓ 4.5%   │ $0.51      │ $2.04    │
└─────────────────────┴──────────┴────────────┴──────────┘
```

**Use cases:**
- Quick repository analysis
- Token estimation
- Cost planning
- Language breakdown
- No output needed

## Confirmation Control

### `-y, --yes` / `--defaults`

Skip all confirmation prompts and use defaults.

```bash
# Auto-accept all prompts
repo-roller --yes

# Alias for --yes
repo-roller --defaults

# Useful for automation
repo-roller -y -o bundle.md
```

**Prompts skipped:**
- Overwrite existing file?
- Token budget exceeded, continue?
- Large bundle detected, proceed?
- Cost estimate high, continue?

**Default behaviors:**
- Overwrites existing files
- Proceeds despite warnings
- Uses default output filename
- Accepts budget constraints

**Use cases:**
- CI/CD automation
- Batch processing
- Scripting
- Non-interactive environments

**Example:**
```bash
# Without --yes (prompted)
repo-roller -o existing-file.md
# Output: File exists. Overwrite? (y/N)

# With --yes (auto-overwrite)
repo-roller -o existing-file.md --yes
# Output: ✓ Generation complete
```

## Clipboard Integration

### `-c, --copy`

Copy generated output to clipboard in addition to file.

```bash
# Copy to clipboard
repo-roller --copy

# Copy and save
repo-roller -o bundle.md --copy

# Copy only (stdout)
repo-roller --copy -o -
```

**Platform support:**

#### macOS
Uses `pbcopy`:
```bash
repo-roller --copy
# Copied to clipboard ✓
```

#### Linux
Uses `xclip` or `xsel`:
```bash
# Install xclip first
sudo apt-get install xclip

repo-roller --copy
# Copied to clipboard ✓
```

#### Windows
Uses `clip`:
```bash
repo-roller --copy
# Copied to clipboard ✓
```

**Use cases:**
- Quick paste into LLM chat
- Email/Slack sharing
- Documentation
- Code review

**Notes:**
- Requires clipboard utility installed
- Falls back gracefully if unavailable
- Works with all output formats
- File still generated (unless `-o -`)

**Copy without file:**
```bash
# Output to stdout and clipboard only
repo-roller --copy -o -

# Pipe to clipboard
repo-roller -o - | pbcopy
```

## Validation

### `--validate`

Validate configuration files without generating output.

```bash
# Validate config
repo-roller --validate

# Validate specific directory
repo-roller ./my-project --validate
```

**Checks:**
- `.reporoller.yml` syntax
- `repo-roller.config.mjs` syntax
- Preset definitions
- Profile configurations
- Include/exclude patterns
- File paths
- Model references

**Success output:**
```
✓ Configuration validation

Config files:
  ✓ .reporoller.yml (valid YAML)
  ✓ repo-roller.config.mjs (valid ESM)

Presets:
  ✓ custom-preset (valid)
  ✓ typescript-strict (valid)

Profiles:
  ✓ llm-context (valid)
  ✓ core-first (valid)

All configuration files are valid
```

**Error output:**
```
✗ Configuration validation failed

.reporoller.yml:
  ✗ Line 12: Invalid YAML syntax
  ✗ Preset 'custom': Missing required field 'include'
  ✗ Profile 'broken': Unknown option 'invalidOption'

repo-roller.config.mjs:
  ✓ Valid ESM module

Fix errors and run --validate again
```

**Use cases:**
- Testing configuration changes
- CI validation
- Learning configuration
- Debugging presets/profiles
- Migration validation

**Exit codes:**
- `0` - All valid
- `3` - Validation errors

## Combining Modes

### Preview and Validate

```bash
# Validate then preview
repo-roller --validate && repo-roller --dry-run
```

### Interactive with Copy

```bash
# Select files interactively, copy result
repo-roller -I --copy
```

### Stats with Validation

```bash
# Validate config and show stats
repo-roller --validate --stats-only
```

### Dry Run with Verbose

```bash
# Detailed preview
repo-roller --dry-run --verbose
```

## Examples

### Example 1: Quick Preview

```bash
# See what would be included
repo-roller --dry-run --preset ts
```

### Example 2: Interactive Selection

```bash
# Visual file picker
repo-roller -I --target claude-sonnet
```

### Example 3: Automated CI Build

```bash
# Non-interactive, quiet, no prompts
repo-roller --yes --quiet --no-interactive -o dist/bundle.md
```

### Example 4: Copy to Clipboard

```bash
# Generate and copy
repo-roller --preset llm --copy
```

### Example 5: Validate Before Deploy

```bash
# Validate configuration
repo-roller --validate || exit 1

# Generate if valid
repo-roller --preset production -o bundle.md
```

### Example 6: Quick Stats

```bash
# Fast statistics
repo-roller --stats-only --llm
```

### Example 7: Development Workflow

```bash
# Interactive review, then generate with copy
repo-roller -I && repo-roller --copy -o bundle.md
```

## Workflow Patterns

### Development

```bash
# 1. Preview
repo-roller --dry-run --verbose

# 2. Interactive selection
repo-roller -I

# 3. Generate with copy
repo-roller --copy
```

### Production

```bash
# 1. Validate
repo-roller --validate

# 2. Stats check
repo-roller --stats-only --llm

# 3. Generate
repo-roller --yes -o bundle.md
```

### CI/CD

```bash
# Single automated command
repo-roller \
  --validate \
  --yes \
  --quiet \
  --no-interactive \
  --no-color \
  -o artifacts/bundle.md
```

### Code Review

```bash
# 1. Preview recent changes
repo-roller --diff main --dry-run

# 2. Interactive selection
repo-roller --diff main -I

# 3. Copy for review
repo-roller --diff main --copy
```

## Exit Codes

Modes respect standard exit codes:

| Code | Meaning | Example |
|------|---------|---------|
| 0 | Success | All modes completed successfully |
| 1 | General error | Unexpected failure |
| 2 | Invalid arguments | Bad CLI options |
| 3 | Validation error | `--validate` found errors |
| 4 | File system error | Cannot read/write |
| 5 | Budget exceeded | Over token/cost limit |

**Using in scripts:**
```bash
# Validate before proceeding
if repo-roller --validate; then
  repo-roller --yes -o bundle.md
else
  echo "Validation failed"
  exit 1
fi
```

## Best Practices

### For Learning

```bash
# Start with dry run
repo-roller --dry-run --verbose

# Then try interactive
repo-roller -I
```

### For Automation

```bash
# Always use --yes and --no-interactive
repo-roller --yes --no-interactive --quiet
```

### For Development

```bash
# Interactive mode for exploration
repo-roller -I --preset ts
```

### For CI/CD

```bash
# Validate, then generate with no prompts
repo-roller --validate && \
repo-roller --yes --quiet --no-color -o bundle.md
```

### For Code Review

```bash
# Preview changes, then copy
repo-roller --diff main --dry-run
repo-roller --diff main --copy
```

## Related Options

- [Display Control](/cli/display-control) - Control output verbosity
- [Utility Commands](/cli/utility-commands) - Helper commands
- [Output Options](/cli/output-options) - File and format options
- [Git Commands](/cli/git-commands) - Git integration
