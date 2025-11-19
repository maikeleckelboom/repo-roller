# Interactive Mode

Interactive mode provides a rich Terminal User Interface (TUI) for generating code bundles. It features visual file selection, real-time token estimates, and a guided 4-step wizard that makes bundle generation intuitive and efficient.

## Launching Interactive Mode

Start interactive mode with the `-I` or `--interactive` flag:

```bash
# Launch interactive mode
repo-roller -I

# Interactive mode with preset
repo-roller -I --preset typescript

# Interactive mode for specific directory
repo-roller -I --root ./src
```

## The 4-Step Wizard

Interactive mode guides you through a structured workflow:

1. **File Selection** - Visual tree with multi-select
2. **Output Options** - Configure generation options
3. **Format Selection** - Choose output format
4. **Filename Input** - Set output filename

### Step 1: File Selection

A visual file tree with checkbox selection.

```
┌─ Select Files ──────────────────────────────────────────┐
│                                                          │
│  ☑ src/                                                  │
│    ☑ core/                                               │
│      ☑ index.ts                  (2.3 KB, ts)            │
│      ☑ types.ts                  (1.8 KB, ts)            │
│      ☐ helpers.ts                (4.2 KB, ts)            │
│    ☑ cli/                                                │
│      ☑ commands.ts               (5.1 KB, ts)            │
│  ☐ tests/                                                │
│    ☐ core.test.ts                (3.4 KB, ts)            │
│                                                          │
│  Selected: 4 files (13.4 KB)                             │
│  Estimated: ~3,800 tokens                                │
│                                                          │
│  [Space] Select  [Enter] Continue  [Esc] Cancel          │
└──────────────────────────────────────────────────────────┘
```

**Keyboard shortcuts:**

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate files/folders |
| `Space` | Toggle file/folder selection |
| `→` | Expand folder |
| `←` | Collapse folder |
| `Enter` | Confirm selection and continue |
| `Esc` | Cancel and exit |
| `a` | Select all files |
| `n` | Deselect all files |

**Features:**

- **Multi-select** - Select individual files or entire folders
- **Pre-selection** - Files matching your filters are pre-checked
- **Real-time estimates** - Token count updates as you select
- **Folder toggling** - Select/deselect entire directories
- **Smart defaults** - Common patterns (tests, node_modules) excluded

### Step 2: Output Options

Configure how the bundle is generated.

```
┌─ Output Options ────────────────────────────────────────┐
│                                                          │
│  Selection Summary                                       │
│  • 4 files selected                                      │
│  • 3 files hidden (tests, configs)                       │
│  • 13.4 KB total size                                    │
│                                                          │
│  Options                                                 │
│  ☑ Strip comments        Remove code comments           │
│  ☑ Include tree          Add directory tree             │
│  ☑ Include stats         Add statistics                 │
│                                                          │
│  [Space] Toggle  [Enter] Continue  [r] Reselect Files    │
└──────────────────────────────────────────────────────────┘
```

**Keyboard shortcuts:**

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate options |
| `Space` | Toggle option on/off |
| `Enter` | Confirm and continue |
| `r` | Go back to file selection |
| `Esc` | Cancel and exit |

**Options:**

- **Strip comments** - Remove code comments to reduce tokens
- **Include tree** - Add directory tree visualization
- **Include stats** - Add file statistics and metrics

These options default to your [user settings](/guide/user-settings) and are saved for next time.

### Step 3: Format Selection

Choose the output format.

```
┌─ Select Output Format ──────────────────────────────────┐
│                                                          │
│  ● Markdown (.md)                                        │
│    Best for LLMs, human-readable, syntax highlighting    │
│                                                          │
│  ○ JSON (.json)                                          │
│    Structured data, programmatic access                  │
│                                                          │
│  ○ YAML (.yaml)                                          │
│    Human-readable config format                          │
│                                                          │
│  ○ Text (.txt)                                           │
│    Plain text, minimal formatting                        │
│                                                          │
│  [↑/↓] Navigate  [Enter] Select  [Esc] Cancel            │
└──────────────────────────────────────────────────────────┘
```

**Keyboard shortcuts:**

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate formats |
| `Enter` | Select format |
| `Esc` | Cancel and exit |

**Format descriptions:**

- **Markdown** - Recommended for LLMs, includes syntax highlighting
- **JSON** - Structured format for programmatic use
- **YAML** - Human-readable alternative to JSON
- **Text** - Plain text with minimal formatting

### Step 4: Filename Input

Specify the output filename.

```
┌─ Output Filename ───────────────────────────────────────┐
│                                                          │
│  Format: Markdown (.md)                                  │
│                                                          │
│  Enter filename (without extension):                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │ my-project-core-2024-01-15_                        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Will save to: ./my-project-core-2024-01-15.md           │
│                                                          │
│  [Enter] Confirm  [Esc] Cancel                           │
└──────────────────────────────────────────────────────────┘
```

**Keyboard shortcuts:**

| Key | Action |
|-----|--------|
| `Type` | Enter filename |
| `Enter` | Confirm filename |
| `Esc` | Cancel and exit |
| `Backspace` | Delete characters |

**Auto-generated filename:**

The default filename is intelligently generated:

```
{repo-name}-{folders}-{date}.{ext}
```

Examples:
- `my-project-core-2024-01-15.md`
- `api-server-auth-users-2024-01-15.json`
- `webapp-components-2024-01-15.md`

**Filename components:**

- **repo-name** - Repository directory name
- **folders** - Up to 3 unique folder paths from selection
- **date** - Current date (YYYY-MM-DD)
- **ext** - Format-appropriate extension

You can edit the filename or keep the default by pressing Enter.

## Tree State Persistence

Interactive mode remembers your tree state across sessions.

### What Is Persisted

- **Expanded folders** - Which directories are open/closed
- **Selected files** - Your last file selection
- **Root context** - Settings are per-project

### How It Works

When you return to the same project:

```bash
cd ~/my-project
repo-roller -I
```

The tree opens with:
- Same folders expanded/collapsed
- Same files selected (if they still exist)
- Ready to generate immediately or adjust selection

### Disable Persistence

Use `--yes` mode to skip selection and use cached state:

```bash
# Use last selection without interaction
repo-roller -I --yes
```

This generates a bundle using:
- Last selected files
- Last used options (strip comments, tree, stats)
- Auto-generated filename

Perfect for quick re-runs with the same configuration.

## User Preference Saving

Interactive mode saves your preferences automatically.

### Saved Preferences

After completing the wizard, these are saved:

- **stripComments** - Strip comments preference
- **withTree** - Include tree preference
- **withStats** - Include stats preference
- **treeViewState** - Expanded/collapsed folders
- **lastSelectedFiles** - File selection

### Where Preferences Are Stored

```
~/.config/repo-roller/settings.json
```

Example:

```json
{
  "stripComments": true,
  "withTree": true,
  "withStats": false,
  "treeViewState": {
    "expanded": ["src", "src/core", "src/cli"],
    "lastRoot": "/home/user/my-project"
  },
  "lastSelectedFiles": {
    "files": ["src/core/index.ts", "src/cli/commands.ts"],
    "root": "/home/user/my-project",
    "timestamp": 1704067200000
  }
}
```

### Reset Preferences

Clear saved preferences:

```bash
# Reset all user settings
repo-roller settings reset --all

# Or manually delete
rm ~/.config/repo-roller/settings.json
```

## Skip Mode (--yes)

Skip all interactive prompts and use defaults/saved preferences:

```bash
repo-roller -I --yes
```

**Behavior:**

1. **File selection** - Uses last selected files for this project
2. **Output options** - Uses saved preferences
3. **Format** - Uses default or `--format` flag
4. **Filename** - Auto-generated

**Use cases:**

- Quick re-runs with same configuration
- Scripts that need minimal interaction
- CI/CD pipelines with interactive mode

**Example workflow:**

```bash
# First run: Interactive selection
repo-roller -I

# Subsequent runs: Skip interaction
repo-roller -I --yes

# Or with format override
repo-roller -I --yes --format json
```

## Combining with Other Options

Interactive mode works with all CLI options:

### With Presets

Start with preset filters:

```bash
repo-roller -I --preset typescript
```

The file tree shows only TypeScript files.

### With Filters

Pre-filter before selection:

```bash
# Only source files
repo-roller -I --include "src/**/*.ts"

# Exclude tests
repo-roller -I --exclude "**/*.test.ts"

# Multiple filters
repo-roller -I --preset ts --no-tests --max-size 100
```

### With Token Budgets

Set token limits:

```bash
# Limit to 150k tokens
repo-roller -I --max-tokens 150000

# Limit by cost
repo-roller -I --max-cost 5.00 --target gpt-4-turbo
```

The file selector shows warnings if selection exceeds limits.

### With Profiles

Use profile for file ordering:

```bash
repo-roller -I --profile core-first
```

Files appear in profile order, but you can still select/deselect.

## Advanced Features

### Smart Folder Naming

The auto-generated filename includes smart folder analysis:

**Example 1: Single folder**

Selected files:
- `src/core/index.ts`
- `src/core/types.ts`
- `src/core/helpers.ts`

Generated filename:
```
my-project-core-2024-01-15.md
```

**Example 2: Multiple folders (max 3)**

Selected files:
- `src/auth/login.ts`
- `src/users/profile.ts`
- `src/billing/checkout.ts`

Generated filename:
```
my-project-auth-users-billing-2024-01-15.md
```

**Example 3: Nested folders (max 4 levels)**

Selected files:
- `packages/frontend/components/auth/LoginForm.tsx`

Generated filename:
```
my-project-frontend-components-auth-2024-01-15.md
```

### Real-Time Token Estimates

The file selector shows live token estimates:

```
Selected: 12 files (45.2 KB)
Estimated: ~12,500 tokens
```

Updates in real-time as you select/deselect files.

### Context Fit Indicators

When using `--target` or `--model`, see context fit:

```bash
repo-roller -I --target claude-3.5-sonnet
```

```
Selected: 25 files (156.3 KB)
Estimated: ~42,000 tokens (21% of Claude 3.5 Sonnet context)
✓ Fits comfortably
```

## Use Cases

### Use Case 1: Code Review

```bash
# Interactive selection for review
repo-roller -I --preset ts --no-tests

# Select specific modules
# → Navigate to src/auth/
# → Select all files with Space
# → Continue through wizard
```

### Use Case 2: Documentation Generation

```bash
# Start with docs preset
repo-roller -I --preset docs

# Select relevant documentation
# → Expand docs/
# → Select guides/, api/, tutorials/
# → Strip comments: No
# → Format: Markdown
```

### Use Case 3: Bug Investigation

```bash
# Include test files
repo-roller -I --include "**/*.ts"

# Select problematic module and its tests
# → Select src/payment/
# → Select tests/payment/
# → Include tree and stats
```

### Use Case 4: LLM Context Building

```bash
# Start with token budget
repo-roller -I --max-tokens 100000 --target claude-3.5-sonnet

# Select most relevant files
# Monitor token count in real-time
# Deselect large files if needed
```

### Use Case 5: Quick Re-runs

```bash
# First time: Interactive selection
repo-roller -I

# Subsequent runs: Use saved state
repo-roller -I --yes

# Different format, same files
repo-roller -I --yes --format json
```

## Tips and Tricks

### 1. Start Broad, Then Narrow

```bash
# Start with preset
repo-roller -I --preset typescript

# Then deselect what you don't need in the tree
```

### 2. Use Folder Selection

Instead of selecting individual files:
- Navigate to parent folder
- Press Space to select entire folder
- Deselect specific files if needed

### 3. Check Token Estimates

Watch the token estimate at the bottom of the file selector. If it's too high:
- Deselect large files
- Enable strip comments
- Exclude generated code

### 4. Save Time with --yes

After your first interactive run, use `--yes` for identical configurations:

```bash
alias rr-quick='repo-roller -I --yes'
```

### 5. Combine with Git

Select only changed files interactively:

```bash
repo-roller -I --diff main
```

Only files changed since `main` appear in the tree.

## Troubleshooting

### File Tree Not Showing Files

**Problem:** File tree is empty

**Solution:** Check your filters:

```bash
# Verbose mode shows filtering
repo-roller -I --verbose

# Try without filters
repo-roller -I --include "**/*"
```

### Tree State Not Persisting

**Problem:** Tree doesn't remember expanded folders

**Solution:** Check settings file permissions:

```bash
ls -la ~/.config/repo-roller/settings.json
chmod 644 ~/.config/repo-roller/settings.json
```

### Selection Not Saved

**Problem:** `--yes` mode doesn't use last selection

**Solution:** Ensure you completed the wizard in a previous run. `--yes` only works if there's a saved selection for this project.

### TUI Rendering Issues

**Problem:** Corrupted or broken display

**Solution:**

```bash
# Disable colors
NO_COLOR=1 repo-roller -I

# Check terminal compatibility
echo $TERM

# Use non-interactive mode if TUI issues persist
repo-roller --include "src/**/*.ts"
```

### Can't Cancel Selection

**Problem:** Esc key doesn't work

**Solution:** Try `Ctrl+C` to force exit.

## Best Practices

### 1. Use Interactive Mode for Exploration

When you're not sure what to include, interactive mode helps you discover and select files visually.

### 2. Save Configurations as Presets

Once you've found a good file selection pattern, create a preset:

```javascript
// repo-roller.config.mjs
export default {
  presets: {
    'my-workflow': {
      include: ['src/core/**/*.ts', 'src/api/**/*.ts'],
      exclude: ['**/*.test.ts'],
      stripComments: true
    }
  }
};
```

Then use: `repo-roller --preset my-workflow`

### 3. Use --yes for Repeated Tasks

For tasks you run frequently:

```bash
# Add to package.json scripts
{
  "scripts": {
    "bundle": "repo-roller -I --yes"
  }
}
```

### 4. Leverage Tree State

Let repo-roller remember your expanded folders. Don't collapse everything each time - it persists.

### 5. Monitor Token Counts

Always check the estimated token count before generating, especially for large selections.

## Related Documentation

- **[User Settings](/guide/user-settings)** - Configure interactive defaults
- **[Getting Started](/guide/getting-started)** - Basic usage guide
- **[File Selection](/cli/file-selection)** - File filtering options
- **[Presets](/guide/presets)** - Pre-configured settings

## Next Steps

- **Try interactive mode** - `repo-roller -I`
- **Experiment with file selection** - Use Space and Enter to select
- **Set your preferences** - Configure output options
- **Use --yes mode** - For quick re-runs
