# Utility Commands

Helper commands for configuration, introspection, and management.

## Information Commands

Commands that display available options and help without generating output.

### `--list-presets`

List all available presets (built-in and custom).

```bash
# List presets
repo-roller --list-presets
```

**Output:**
```
Available Presets
═════════════════

Built-in Presets:
  llm              LLM-optimized bundle (comments stripped, efficient)
  ts               TypeScript files only
  js               JavaScript files only
  python           Python files only
  go               Go files only
  rust             Rust files only
  docs             Documentation files only (md, mdx, txt)
  minimal          Minimal output (no tree, no stats)
  full             Include all files
  compact          Compact JSON output

Custom Presets (from .reporoller.yml):
  typescript-strict   TypeScript with strict settings
  backend-api        Backend API files
  frontend-ui        Frontend UI components

Usage:
  repo-roller --preset llm
  repo-roller --preset typescript-strict
```

**Use cases:**
- Discover available presets
- Learn preset names
- Verify custom presets
- Quick reference

### `--list-profiles`

List all available profiles from `.reporoller.yml`.

```bash
# List profiles
repo-roller --list-profiles
```

**Output:**
```
Available Profiles
══════════════════

Profiles (from .reporoller.yml):
  llm-context      Optimized for LLM context (default)
  core-first       Core files prioritized in layout
  feature-focused  Feature directory first
  docs-heavy       Documentation-centric layout
  api-first        API files at top

Usage:
  repo-roller --profile llm-context
  repo-roller --profile core-first

Default profile: llm-context
```

**Use cases:**
- List available profiles
- Learn profile names
- Check default profile
- Verify configuration

### `--list-providers`

List all supported LLM providers with pricing.

```bash
# List providers
repo-roller --list-providers
```

**Output:**
```
Supported LLM Providers
═══════════════════════

Anthropic (Claude)
  claude-3.5-sonnet    Claude 3.5 Sonnet
    Context: 200,000 tokens
    Input: $15.00 / 1M tokens
    Output: $75.00 / 1M tokens

  claude-3-opus        Claude 3 Opus
    Context: 200,000 tokens
    Input: $15.00 / 1M tokens
    Output: $75.00 / 1M tokens

  claude-3-haiku       Claude 3 Haiku
    Context: 200,000 tokens
    Input: $0.25 / 1M tokens
    Output: $1.25 / 1M tokens

OpenAI (GPT)
  gpt-4-turbo          GPT-4 Turbo
    Context: 128,000 tokens
    Input: $10.00 / 1M tokens
    Output: $30.00 / 1M tokens

  gpt-4o               GPT-4o
    Context: 128,000 tokens
    Input: $5.00 / 1M tokens
    Output: $15.00 / 1M tokens

Google (Gemini)
  gemini-1.5-pro       Gemini 1.5 Pro
    Context: 1,000,000 tokens
    Input: $3.50 / 1M tokens
    Output: $10.50 / 1M tokens

  gemini-1.5-flash     Gemini 1.5 Flash
    Context: 1,000,000 tokens
    Input: $0.35 / 1M tokens
    Output: $1.05 / 1M tokens

Usage:
  repo-roller --target claude-3.5-sonnet
  repo-roller --target gpt-4o --warn-tokens 100000
```

**Use cases:**
- Compare provider costs
- Check context windows
- Find cheapest option
- Plan budget

### `--list-models`

List all model presets with optimal settings.

```bash
# List model presets
repo-roller --list-models
```

**Output:**
```
Available Model Presets
═══════════════════════

Anthropic Claude
  claude-sonnet        Claude 3.5 Sonnet
    Context: 200k tokens
    Recommended: 160k tokens (80% of context)
    Settings: strip-comments, compact

  claude-opus          Claude 3 Opus
    Context: 200k tokens
    Recommended: 160k tokens
    Settings: full context, preserve comments

OpenAI GPT
  gpt-4                GPT-4 Turbo
    Context: 128k tokens
    Recommended: 100k tokens
    Settings: balanced

  gpt-4o               GPT-4o
    Context: 128k tokens
    Recommended: 100k tokens
    Settings: optimized

Google Gemini
  gemini               Gemini 1.5 Pro
    Context: 1M tokens
    Recommended: 800k tokens
    Settings: large context

Usage:
  repo-roller --model claude-sonnet
  repo-roller --model gpt-4o
```

**Use cases:**
- Find optimal settings per model
- Understand context limits
- Quick model setup
- Best practices

### `--show-preset <name>`

Show detailed configuration of a specific preset.

```bash
# Show built-in preset
repo-roller --show-preset llm

# Show custom preset
repo-roller --show-preset typescript-strict
```

**Output:**
```
Preset: llm
═══════════

Description:
  LLM-optimized bundle with minimal overhead

Configuration:
  include:
    - "**/*.{ts,tsx,js,jsx,py,go,rs,java,cpp,c,h}"
    - "**/*.{json,yaml,yml,toml}"
    - "**/*.md"

  exclude:
    - "**/*.test.*"
    - "**/*.spec.*"
    - "**/dist/**"
    - "**/build/**"

  options:
    stripComments: true
    noStats: false
    noTree: false
    format: md
    sort: path

Example usage:
  repo-roller --preset llm
  repo-roller --preset llm --max-tokens 100000
```

**Use cases:**
- Learn preset configuration
- Copy preset settings
- Debug preset behavior
- Customize based on preset

### `--show-profile <name>`

Show detailed configuration of a specific profile.

```bash
# Show profile
repo-roller --show-profile llm-context
```

**Output:**
```
Profile: llm-context
════════════════════

Description:
  Optimized file ordering for LLM context

Layout sections:
  1. Essential files (README, package.json, config)
  2. Type definitions (types/, *.d.ts)
  3. Core source (src/core/, src/lib/)
  4. Features (src/features/, src/modules/)
  5. UI components (src/components/)
  6. Tests (tests/, **/*.test.*)
  7. Documentation (docs/)

Configuration:
  layout:
    - pattern: "{README*,package.json,tsconfig.json}"
      priority: 100
    - pattern: "types/**"
      priority: 90
    - pattern: "src/core/**"
      priority: 80

Example usage:
  repo-roller --profile llm-context
  repo-roller --profile llm-context --preset ts
```

**Use cases:**
- Understand profile layout
- Learn prioritization
- Copy profile structure
- Debug file ordering

### `--examples`

Show usage examples and common workflows.

```bash
# Show examples
repo-roller --examples
```

**Output:**
```
Usage Examples
══════════════

Basic Usage:
  # Current directory with defaults
  repo-roller

  # Specific directory
  repo-roller ./my-project

  # With output file
  repo-roller -o bundle.md

TypeScript Projects:
  # TypeScript files only
  repo-roller --preset ts

  # TypeScript, no tests, no comments
  repo-roller --preset ts --no-tests --strip-comments

  # TypeScript within token budget
  repo-roller --preset ts --max-tokens 100000

Python Projects:
  # Python files only
  repo-roller --preset python

  # Python with docs
  repo-roller --lang python --include "**/*.md"

Code Review:
  # Changed files in branch
  repo-roller --diff main

  # Recent changes with preview
  repo-roller --most-recent 10 --dry-run

  # PR review bundle
  repo-roller --diff main --copy

Budget-Constrained:
  # Stay under 100k tokens
  repo-roller --max-tokens 100000

  # Stay under $1 USD
  repo-roller --max-cost 1.00 --target claude-sonnet

  # Token-optimized output
  repo-roller --strip-comments --no-tree --no-stats

Interactive Workflows:
  # Visual file picker
  repo-roller -I

  # Interactive with preset
  repo-roller -I --preset ts

  # Preview then interactive
  repo-roller --dry-run && repo-roller -I

CI/CD Automation:
  # Automated, no prompts, quiet
  repo-roller --yes --quiet --no-interactive -o bundle.md

  # Validate then generate
  repo-roller --validate && repo-roller --yes -o bundle.md

For more examples, visit:
  https://github.com/maikeleckelboom/repo-roller/blob/main/docs/guide/examples.md
```

**Use cases:**
- Learn common patterns
- Quick reference
- Copy-paste examples
- Discover features

### `--help` / `-h`

Show help message with all options.

```bash
# Show help
repo-roller --help
repo-roller -h
```

**Output:**
```
Usage: repo-roller [root] [options]

Aggregate source code into LLM-friendly bundles

Arguments:
  root                   Root directory to scan (default: ".")

Options:
  -o, --out <file>       Output file path
  -f, --format <type>    Output format: md, json, yaml, txt
  -i, --include <patterns...>  Include glob patterns
  -x, --exclude <patterns...>  Exclude glob patterns
  --preset <name>        Use a preset
  -I, --interactive      Force interactive mode
  --dry-run              Preview without generating
  --copy                 Copy output to clipboard
  -h, --help             Display help
  -v, --version          Display version

Quick Reference:
  Basic:      repo-roller .
  TypeScript: repo-roller . --preset ts --no-tests
  Preview:    repo-roller . --dry-run
  Interactive: repo-roller . -I
  Copy:       repo-roller . --copy

Common Workflows:
  --examples             Show detailed usage examples
  --list-presets         See available presets
  --list-providers       See LLM provider costs
  --validate             Check configuration files

Documentation: https://github.com/maikeleckelboom/repo-roller
```

### `--version`

Show version number.

```bash
# Show version
repo-roller --version
```

**Output:**
```
1.0.0
```

### `--validate`

Validate configuration files.

```bash
# Validate current directory
repo-roller --validate

# Validate specific directory
repo-roller ./my-project --validate
```

See [Modes](/cli/modes#validation) for detailed documentation.

## Management Commands

Commands that run as subcommands for managing repo-roller.

### `init` Command

Initialize repo-roller configuration files.

```bash
# Initialize in current directory
repo-roller init

# Initialize in specific directory
repo-roller init ./my-project

# Initialize with interactive prompts
repo-roller init --interactive
```

**What it creates:**
```
.reporoller.yml       Main configuration file
.gitignore            Add repo-roller patterns (if exists)
```

**Generated `.reporoller.yml`:**
```yaml
# repo-roller configuration
version: 1

# Custom presets
presets:
  custom:
    include:
      - "src/**/*.ts"
    exclude:
      - "**/*.test.*"
    stripComments: true

# Profiles for file ordering
profiles:
  llm-context:
    layout:
      - pattern: "{README*,package.json}"
        priority: 100
      - pattern: "src/core/**"
        priority: 80

# Default settings
defaults:
  format: md
  preset: llm
```

**Use cases:**
- Project setup
- Team configuration
- Standardize settings
- Version control config

**Interactive mode:**
```bash
repo-roller init

? What's your primary language? › TypeScript
? Exclude test files by default? › Yes
? Strip comments by default? › No
? Default output format? › Markdown
✓ Created .reporoller.yml
```

### `settings` Command

Manage CLI display settings and preferences.

```bash
# Show current settings (interactive UI)
repo-roller settings

# Show settings (CLI)
repo-roller settings --show

# Show all settings
repo-roller settings --all

# Set a setting
repo-roller settings --set showCodeComposition=false

# Reset display settings
repo-roller settings --reset

# Reset all settings
repo-roller settings --reset-all

# Show settings file location
repo-roller settings --path

# Export settings
repo-roller settings --export

# Import settings
repo-roller settings --import '{"showCodeComposition":false}'
```

**Available settings:**

| Setting | Description | Default |
|---------|-------------|---------|
| `showGenerationSummary` | Show generation summary | `true` |
| `showCodeComposition` | Show language breakdown | `true` |
| `showContextFit` | Show context fit analysis | `true` |
| `showHealthHints` | Show health hints | `true` |
| `showTokenWarnings` | Show token warnings | `true` |
| `showCostEstimates` | Show cost estimates | `true` |
| `showRecommendations` | Show recommendations | `true` |

**Interactive UI:**
```bash
repo-roller settings
```

**Output:**
```
┌─────────────────────────────────────────────────────────┐
│  Settings                                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Display Settings                                       │
│  ✓ Generation Summary                                   │
│  ✓ Code Composition                                     │
│  ✓ Context Fit                                          │
│  ✓ Health Hints                                         │
│  ✓ Token Warnings                                       │
│  ✓ Cost Estimates                                       │
│  ✓ Recommendations                                      │
│                                                          │
│  [Space] Toggle  [r] Reset  [q] Quit                   │
└─────────────────────────────────────────────────────────┘
```

**Use cases:**
- Customize display
- Hide unwanted sections
- Persistent preferences
- Team standardization

**Settings location:**
```bash
repo-roller settings --path
# ~/.config/repo-roller/settings.json
```

### `history` Command

View and manage bundle generation history.

```bash
# List recent history (default)
repo-roller history
repo-roller history --list

# Show specific entry
repo-roller history --show -1        # Last entry
repo-roller history --show abc123    # By ID

# Compare two entries
repo-roller history --diff -1..-2

# Show replay command
repo-roller history --replay -1

# Export history
repo-roller history --export json
repo-roller history --export yaml
repo-roller history --export csv

# Show statistics
repo-roller history --stats

# Clear history
repo-roller history --clear

# Tag entry
repo-roller history --tag -1 --tags "pr-review,feature-auth"

# Annotate entry
repo-roller history --annotate -1 --notes "PR #123 review"

# Filter by project
repo-roller history --project my-project

# Limit entries
repo-roller history --limit 10
```

**List output:**
```
Bundle Generation History
═════════════════════════

Recent entries:
  #1  abc123  2024-01-15 10:30  my-project
      42 files, 45,234 tokens, $0.68
      Preset: llm, Format: md
      Tags: pr-review

  #2  def456  2024-01-14 15:45  my-project
      38 files, 41,123 tokens, $0.62
      Preset: ts, Format: json

  #3  ghi789  2024-01-13 09:20  other-project
      15 files, 12,456 tokens, $0.19
      Preset: minimal, Format: md
      Tags: docs-update

Use --show <id> to see details
```

**Show entry:**
```bash
repo-roller history --show -1
```

**Output:**
```
History Entry: abc123
═════════════════════

Timestamp: 2024-01-15 10:30:45
Project: my-project
Duration: 1.2 seconds

Configuration:
  Root: /home/user/my-project
  Preset: llm
  Format: md
  Output: my-project-2024-01-15.md

Files:
  Selected: 42 files
  Total size: 156.7 KB
  Estimated tokens: 45,234
  Estimated cost: $0.68

Tags: pr-review, feature-auth
Notes: PR #123 review bundle

CLI Command:
  repo-roller --preset llm --diff main -o my-project-2024-01-15.md
```

**Replay:**
```bash
repo-roller history --replay -1
```

**Output:**
```
Replay command:
  repo-roller --preset llm --diff main -o my-project-2024-01-15.md
```

**Use cases:**
- Track generations
- Repeat previous runs
- Compare changes
- Audit usage
- Cost tracking

### `daemon` Command

Run repo-roller as background daemon with RPC interface.

```bash
# Start daemon
repo-roller daemon --start

# Check status (default)
repo-roller daemon
repo-roller daemon --status

# Stop daemon
repo-roller daemon --stop

# Quick scan via daemon
repo-roller daemon --scan
repo-roller daemon --scan ./my-project

# Generate bundle via daemon
repo-roller daemon --bundle
repo-roller daemon --bundle --preset llm

# Token estimate via daemon
repo-roller daemon --tokens

# Cache statistics
repo-roller daemon --cache

# Clear cache
repo-roller daemon --cache-clear
repo-roller daemon --cache-clear my-project

# Force refresh (skip cache)
repo-roller daemon --scan --force

# Raw RPC call
repo-roller daemon --rpc history.stats
repo-roller daemon --rpc scan --params '{"root":"."}'
```

**Status output:**
```
Daemon Status
═════════════

Status: Running
PID: 12345
Uptime: 2 hours 15 minutes
Port: 9876

Cache:
  Entries: 5 projects
  Total size: 42.3 MB
  Hit rate: 87%

Recent operations:
  scan (./my-project) - 45ms
  bundle (./other-project) - 123ms
  tokens (./my-project) - 12ms
```

**Use cases:**
- Fast repeated operations
- IDE integration
- Editor plugins
- Watch mode
- Performance optimization

**Performance:**
```bash
# First scan (cold)
time repo-roller --stats-only
# 500ms

# Start daemon
repo-roller daemon --start

# Subsequent scans (warm cache)
time repo-roller daemon --scan
# 50ms (10x faster)
```

### `__schema` Command

Output machine-readable CLI schema for introspection.

```bash
# JSON Schema (default summary)
repo-roller __schema

# Full JSON Schema
repo-roller __schema --json

# LLM tool definition
repo-roller __schema --for-llm

# OpenAPI documentation
repo-roller __schema --openapi

# Shell completions
repo-roller __schema --completions bash
repo-roller __schema --completions zsh
repo-roller __schema --completions fish

# Options by category
repo-roller __schema --categories
```

**Summary output:**
```
repo-roller CLI Schema
══════════════════════

Commands: 6
  repo-roller          Main bundling command
  repo-roller init     Initialize configuration
  repo-roller history  Manage history
  repo-roller daemon   Background daemon
  repo-roller settings Manage settings
  repo-roller __schema CLI introspection

Options: 48
  Output: 6 options
  Filter: 10 options
  Processing: 5 options
  Budget: 4 options
  Mode: 3 options
  Info: 7 options

Presets: 10 built-in
Models: 15 supported
Providers: 25+ supported
```

**LLM tool definition:**
```bash
repo-roller __schema --for-llm > tool.json
```

**Output:**
```json
{
  "name": "repo_roller_bundle",
  "description": "Bundle repository source code into LLM-friendly format",
  "input_schema": {
    "type": "object",
    "properties": {
      "root": {
        "type": "string",
        "description": "Root directory to scan",
        "default": "."
      },
      "preset": {
        "type": "string",
        "enum": ["llm", "ts", "js", "python", "..."]
      },
      ...
    }
  }
}
```

**Shell completions:**
```bash
# Install bash completions
repo-roller __schema --completions bash > /etc/bash_completion.d/repo-roller

# Install zsh completions
repo-roller __schema --completions zsh > /usr/local/share/zsh/site-functions/_repo-roller

# Install fish completions
repo-roller __schema --completions fish > ~/.config/fish/completions/repo-roller.fish
```

**Use cases:**
- Tool integration
- Documentation generation
- Shell completions
- IDE plugins
- API clients

## Examples

### Example 1: Project Setup

```bash
# Initialize configuration
repo-roller init

# List available presets
repo-roller --list-presets

# Test configuration
repo-roller --validate
```

### Example 2: Discover Options

```bash
# See all examples
repo-roller --examples

# List providers
repo-roller --list-providers

# Show preset details
repo-roller --show-preset llm
```

### Example 3: Configure Display

```bash
# Open settings UI
repo-roller settings

# Or set directly
repo-roller settings --set showCodeComposition=false
repo-roller settings --set showCostEstimates=false
```

### Example 4: Review History

```bash
# List recent generations
repo-roller history

# See last generation
repo-roller history --show -1

# Replay last command
$(repo-roller history --replay -1)
```

### Example 5: Daemon Workflow

```bash
# Start daemon
repo-roller daemon --start

# Fast scans
repo-roller daemon --scan

# Fast bundles
repo-roller daemon --bundle --preset llm

# Check cache
repo-roller daemon --cache
```

### Example 6: Generate Completions

```bash
# Generate and install bash completions
repo-roller __schema --completions bash | \
  sudo tee /etc/bash_completion.d/repo-roller

# Reload shell
source ~/.bashrc

# Now use tab completion
repo-roller --pre<TAB>
```

## Best Practices

### Project Setup

```bash
# Initialize with team settings
repo-roller init

# Commit configuration
git add .reporoller.yml
git commit -m "Add repo-roller config"
```

### Learning

```bash
# Start with examples
repo-roller --examples

# Explore presets
repo-roller --list-presets
repo-roller --show-preset llm

# Try dry run
repo-roller --dry-run --verbose
```

### Team Collaboration

```bash
# Share configuration via .reporoller.yml
repo-roller init

# Document in README
echo "Use: repo-roller --preset team-standard" >> README.md

# Validate in CI
repo-roller --validate
```

### Performance

```bash
# Start daemon for repeated use
repo-roller daemon --start

# Use daemon for fast operations
alias rr-scan='repo-roller daemon --scan'
alias rr-bundle='repo-roller daemon --bundle'
```

## Exit Codes

| Code | Meaning | Commands |
|------|---------|----------|
| 0 | Success | All commands |
| 1 | General error | Any command |
| 2 | Invalid arguments | All commands |
| 3 | Validation error | `--validate`, `init` |
| 4 | File system error | Any I/O operation |

## Related Options

- [Modes](/cli/modes) - Execution modes
- [Display Control](/cli/display-control) - Output control
- [Configuration Guide](/guide/configuration) - Configuration details
- [Examples Guide](/guide/examples) - Real-world examples
