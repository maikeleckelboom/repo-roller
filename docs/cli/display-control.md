# Display Control

Control terminal output verbosity and visibility of different sections.

## Output Modes

### `-v, --verbose`

Show detailed output including file scanning, filtering decisions, and progress.

```bash
# Verbose output
repo-roller --verbose

# Verbose with preset
repo-roller --preset ts --verbose
```

**Default output:**
```
┌─────────────────────────────────────────────────────────┐
│  repo-roller                                            │
└─────────────────────────────────────────────────────────┘

✓ Scanning ./my-project
✓ Found 42 files (156.7 KB)
✓ Rendering MD output
✓ Generation complete

Output file: my-project-2024-01-15.md
```

**Verbose output:**
```
┌─────────────────────────────────────────────────────────┐
│  repo-roller v1.0.0                                     │
└─────────────────────────────────────────────────────────┘

→ Configuration
  Root: /home/user/my-project
  Preset: typescript
  Format: md
  Target: claude-3.5-sonnet

→ Scanning files
  Scanning directory: ./my-project
  Found: src/core/index.ts (4.2 KB)
  Found: src/core/scanner.ts (8.1 KB)
  Found: src/cli/commands.ts (12.3 KB)
  ...
  Excluded: src/tests/unit.test.ts (test file)
  Excluded: node_modules/** (dependency)

→ File filtering
  Initial: 156 files
  After .gitignore: 98 files
  After --exclude: 58 files
  After --no-tests: 42 files
  Final: 42 files (156.7 KB)

→ Token estimation
  Source code: 41,234 tokens
  Comments: 2,456 tokens
  Metadata: 1,234 tokens
  Total: 44,924 tokens

→ Rendering
  Format: Markdown
  Tree: enabled
  Stats: enabled
  TOC: disabled

→ Output
  File: my-project-2024-01-15.md
  Size: 158.3 KB
  Tokens: 44,924

✓ Generation complete
```

**Use cases:**
- Debugging filters
- Understanding exclusions
- Verifying configuration
- Troubleshooting issues
- Learning repo-roller behavior

### `-q, --quiet`

Minimal output - hide all summaries except essential info.

```bash
# Quiet mode
repo-roller --quiet

# Quiet with output file
repo-roller -q -o bundle.md
```

**Default output:**
```
┌─────────────────────────────────────────────────────────┐
│  repo-roller                                            │
└─────────────────────────────────────────────────────────┘

✓ Found 42 files (156.7 KB)

Code Composition by Language:
┌────────────┬───────┬──────────┬────────────┐
│ Language   │ Files │ Size     │ Tokens     │
├────────────┼───────┼──────────┼────────────┤
│ TypeScript │ 38    │ 142.3 KB │ 41,234     │
│ JSON       │ 3     │ 12.1 KB  │ 3,456      │
│ Markdown   │ 1     │ 2.3 KB   │ 544        │
└────────────┴───────┴──────────┴────────────┘

Context Fit: 22.6% of 200k window

✓ Generation complete
Output file: my-project-2024-01-15.md
```

**Quiet output:**
```
✓ Generation complete
Output file: my-project-2024-01-15.md
```

**Use cases:**
- CI/CD pipelines
- Automated scripts
- Batch processing
- Clean logs
- Exit code checking

**Notes:**
- Errors still shown
- Exit codes preserved
- File path always shown
- Useful with `--yes` for fully automated runs

## Section Visibility

Control which dashboard sections are displayed.

### `--hide-composition`

Hide code composition section (language breakdown).

```bash
# Hide composition
repo-roller --hide-composition

# Hide with verbose
repo-roller --hide-composition --verbose
```

**Hidden section:**
```
Code Composition by Language:
┌────────────┬───────┬──────────┬────────────┐
│ Language   │ Files │ Size     │ Tokens     │
├────────────┼───────┼──────────┼────────────┤
│ TypeScript │ 38    │ 142.3 KB │ 41,234     │
│ JSON       │ 3     │ 12.1 KB  │ 3,456      │
└────────────┴───────┴──────────┴────────────┘
```

**Use cases:**
- Known language distribution
- Cleaner output
- Focus on other metrics
- Terminal width constraints

### `--hide-context-fit`

Hide context fit analysis section.

```bash
# Hide context fit
repo-roller --hide-context-fit

# Hide with target
repo-roller --target claude-sonnet --hide-context-fit
```

**Hidden section:**
```
Context Fit Analysis (Claude 3.5 Sonnet - 200k context):
Your code uses 45,234 tokens (22.6% of context window)
✓ Fits comfortably with room for conversation
```

**Use cases:**
- Not using for LLM
- Known context size
- Cleaner output
- Multiple generations

### `--hide-cost`

Hide cost estimates.

```bash
# Hide cost
repo-roller --hide-cost

# Hide with target
repo-roller --target claude-sonnet --hide-cost
```

**Hidden section:**
```
Estimated Cost (Claude 3.5 Sonnet):
Input:  $0.68 (45,234 tokens @ $15 / 1M)
Output: $3.39 (estimated at 1:1 ratio)
Total:  $4.07
```

**Use cases:**
- Not concerned with cost
- Internal use
- Development/testing
- Clean output

### `--hide-warnings`

Hide token warning messages.

```bash
# Hide warnings
repo-roller --hide-warnings

# Hide warnings with threshold
repo-roller --warn-tokens 80000 --hide-warnings
```

**Hidden warnings:**
```
⚠️  Warning: Token count (85,234) exceeds threshold (80,000)
⚠️  Consider using --max-tokens or excluding files
⚠️  Output exceeds Claude 3 Haiku context window (200k)
```

**Use cases:**
- Suppressing known issues
- Clean CI output
- Ignoring warnings
- Automated runs

### `--hide-health-hints`

Hide health hints section.

```bash
# Hide health hints
repo-roller --hide-health-hints
```

**Hidden section:**
```
Health Hints:
✓ Token usage efficient (22.6% of context)
⚠️  2,456 tokens in comments (5.4%) - consider --strip-comments
💡 Using --no-stats would save ~150 tokens
```

**Use cases:**
- Known optimizations
- Clean output
- Production runs

### `--hide-recommendations`

Hide optimization recommendations.

```bash
# Hide recommendations
repo-roller --hide-recommendations
```

**Hidden section:**
```
Recommendations:
✓ Excellent fit - plenty of room for conversation
✓ Consider stripping comments to save 2,456 tokens
⚠️  If generating output, budget ~45k tokens for response
💡 Use --preset ts to focus on TypeScript files
```

**Use cases:**
- Known best practices
- Experienced users
- Cleaner output
- Automated workflows

## Persistent Settings

Control default visibility via settings command.

### View Settings

```bash
# Show current display settings
repo-roller settings
```

**Output:**
```
Display Settings
Current settings (stored in ~/.config/repo-roller/settings.json)
────────────────────────────────────────────────────────────

✓ Generation Summary     shown
✓ Code Composition       shown
✓ Context Fit            shown
✓ Health Hints           shown
✓ Token Warnings         shown
✓ Cost Estimates         shown
✓ Recommendations        shown
```

### Modify Settings

```bash
# Hide code composition by default
repo-roller settings --set showCodeComposition=false

# Hide cost estimates by default
repo-roller settings --set showCostEstimates=false

# Hide all hints
repo-roller settings --set showHealthHints=false
repo-roller settings --set showRecommendations=false
```

### Reset Settings

```bash
# Reset display settings to defaults
repo-roller settings --reset

# Reset all settings (including interactive preferences)
repo-roller settings --reset-all
```

**Available settings:**
- `showGenerationSummary` - Generation summary section
- `showCodeComposition` - Language breakdown table
- `showContextFit` - Context fit analysis
- `showHealthHints` - Health hints section
- `showTokenWarnings` - Token warning messages
- `showCostEstimates` - Cost estimate section
- `showRecommendations` - Optimization recommendations

**Note:** CLI flags (`--hide-*`) override persistent settings.

## Color Output

### `--color` / `--no-color`

Control ANSI color output.

```bash
# Force color (even in non-TTY)
repo-roller --color

# Disable color
repo-roller --no-color

# Environment variable
NO_COLOR=1 repo-roller
```

**With color:**
```
✓ Found 42 files (156.7 KB)
⚠️  Warning: Large bundle detected
```

**Without color:**
```
✓ Found 42 files (156.7 KB)
⚠  Warning: Large bundle detected
```

**Auto-detection:**
- Enabled by default in TTY
- Disabled by default in pipes/redirects
- Respects `NO_COLOR` environment variable
- Respects `FORCE_COLOR` environment variable

**Use cases:**
- CI/CD logs
- File redirection
- Terminal compatibility
- Accessibility

## Output Combinations

### Minimal CI Output

```bash
# Silent except for errors
repo-roller \
  --quiet \
  --hide-composition \
  --hide-context-fit \
  --hide-cost \
  --hide-warnings \
  --hide-health-hints \
  --hide-recommendations
```

**Or simply:**
```bash
repo-roller -q
```

### Development Debugging

```bash
# Maximum information
repo-roller \
  --verbose \
  --llm
```

### Clean Professional Output

```bash
# Hide optimization hints, keep metrics
repo-roller \
  --hide-health-hints \
  --hide-recommendations \
  --hide-warnings
```

### Production Automation

```bash
# Quiet, no prompts, no color
repo-roller \
  --quiet \
  --yes \
  --no-color
```

## Examples

### Example 1: CI/CD Pipeline

```bash
repo-roller \
  --quiet \
  --yes \
  --no-color \
  -o bundle.md
```

**Output:**
```
✓ Generation complete
Output file: bundle.md
```

### Example 2: Debug Filtering

```bash
repo-roller \
  --verbose \
  --dry-run \
  --include "src/**/*.ts"
```

**Output:** Detailed file scanning and filtering decisions.

### Example 3: Clean Production

```bash
repo-roller \
  --hide-health-hints \
  --hide-recommendations \
  --hide-warnings \
  -o bundle.md
```

**Output:** Professional output with core metrics only.

### Example 4: Focus on Code

```bash
repo-roller \
  --hide-composition \
  --hide-context-fit \
  --hide-cost
```

**Output:** Just file count and output location.

### Example 5: Maximum Information

```bash
repo-roller \
  --verbose \
  --llm \
  --dry-run
```

**Output:** Everything repo-roller knows about your code.

## Exit Codes

repo-roller uses standard exit codes:

| Code | Meaning | Description |
|------|---------|-------------|
| 0 | Success | Generation completed successfully |
| 1 | General error | Unexpected error occurred |
| 2 | Invalid arguments | CLI arguments invalid or missing |
| 3 | Validation error | Configuration file validation failed |
| 4 | File system error | Cannot read/write files |
| 5 | Budget exceeded | Token/cost budget exceeded |

**Check exit codes:**
```bash
repo-roller --quiet
echo $?  # Prints exit code

# In scripts
if repo-roller --quiet -o bundle.md; then
  echo "Success"
else
  echo "Failed with exit code $?"
fi
```

## Environment Variables

### `NO_COLOR`

Disable color output.

```bash
NO_COLOR=1 repo-roller
```

### `FORCE_COLOR`

Force color output even in non-TTY.

```bash
FORCE_COLOR=1 repo-roller
```

### `REPO_ROLLER_QUIET`

Default to quiet mode.

```bash
export REPO_ROLLER_QUIET=1
repo-roller  # Runs in quiet mode
```

## Best Practices

### For Development

```bash
# Verbose during development
repo-roller --verbose --dry-run
```

### For CI/CD

```bash
# Quiet, no prompts, no color
repo-roller --quiet --yes --no-color
```

### For Production

```bash
# Clean professional output
repo-roller --hide-health-hints --hide-recommendations
```

### For Learning

```bash
# See everything
repo-roller --verbose --llm
```

### For Automation

```bash
# Machine-readable, minimal output
repo-roller --quiet --format json --no-color
```

## Related Options

- [Content Options](/cli/content-options) - Control output content
- [Modes](/cli/modes) - Execution modes
- [Output Options](/cli/output-options) - File and format options
- [Token Management](/cli/token-management) - Budget and cost control
