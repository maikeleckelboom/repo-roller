# repo-roller

A modern CLI tool for aggregating source code into optimized bundles for LLM consumption.

## Overview

repo-roller scans your codebase and creates structured bundles (Markdown, JSON, YAML, or plain text) that are optimized for feeding to Large Language Models. It provides intelligent file selection, token estimation, cost analysis, and model-specific optimizations.

## Quick Start

```bash
# Interactive mode (default)
repo-roller .

# Non-interactive with specific model preset
repo-roller . --model claude-3.5-sonnet

# Show prompt suggestions
repo-roller . --prompt-helper

# Quick TypeScript-only bundle
repo-roller . --lang typescript --no-tests
```

## Core Features

### Interactive Workflow

The interactive mode provides a full TUI experience:

1. **File Selection**: Hierarchical tree view with checkbox selection
2. **Real-time Token Counting**: See token estimates as you select files
3. **Option Prompts**: Configure strip comments, tree view, stats
4. **Generation Summary**: Detailed dashboard before generation
5. **Preferences**: Saves your choices for next time

```bash
repo-roller . -I                    # Force interactive
repo-roller . -y                    # Skip prompts, use saved preferences
repo-roller . --no-interactive      # Force non-interactive
```

### Model Preset System

Built-in presets for popular LLMs with context limits and safety margins:

```bash
# List all available model presets
repo-roller . --list-models

# Use specific model preset
repo-roller . --model claude-3.5-sonnet
repo-roller . --model gpt-5.1
repo-roller . --model gemini-1.5-pro

# Common aliases
repo-roller . --model sonnet     # claude-3.5-sonnet
repo-roller . --model opus       # claude-3.5-opus
repo-roller . --model haiku      # claude-3.5-haiku
repo-roller . --model gpt5       # gpt-5.1
repo-roller . --model gpt4       # gpt-4.1
repo-roller . --model o3         # gpt-o3
repo-roller . --model gemini     # gemini-1.5-pro
repo-roller . --model flash      # gemini-2.0-flash
```

**Available Model Presets:**

| Model | Context Limit | Safety Margin | Cost/1M tokens |
|-------|--------------|---------------|----------------|
| gpt-5.1 | 256K | 75% | $5.00 |
| gpt-5.1-thinking | 256K | 65% | $8.00 |
| gpt-4.1 | 128K | 75% | $2.50 |
| gpt-o3 | 200K | 70% | $15.00 |
| gpt-o3-mini | 128K | 75% | $3.00 |
| claude-3.5-sonnet | 200K | 75% | $3.00 |
| claude-3.5-opus | 200K | 75% | $15.00 |
| claude-3.5-haiku | 200K | 80% | $0.80 |
| gemini-1.5-pro | 2M | 80% | $1.25 |
| gemini-2.0-flash | 1M | 85% | $0.075 |

**Safety Margin**: The percentage of context used. For example, 75% margin on 200K context = 150K effective budget. This leaves room for the LLM's response and system prompts.

### Generation Summary Dashboard

The dashboard provides comprehensive metrics in both compact (non-interactive) and detailed (interactive) modes:

**Core Metrics:**
- Files selected (with delta from previous run)
- Total size (with delta)
- Lines of code estimate
- Estimated tokens (with delta)
- Output file path

**Code Composition:**
Colored visual bars showing:
- **Languages**: TypeScript, JavaScript, Markdown, etc.
- **File Roles**:
  - Source (green)
  - Tests (amber)
  - Docs (blue)
  - Config (orange)

**Context Fit:**
- Token budget vs estimated tokens
- Utilization percentage
- Warning level (safe/caution/danger)
- Model-specific cost estimate
- Warnings for near-limit situations

**Health Hints:**
Intelligent suggestions based on bundle composition:
- Large file count warnings
- High token density alerts
- Test/config heavy bundle detection
- Context limit warnings

### LLM Prompt Helper

Generate context-aware system and user message templates:

```bash
repo-roller . --prompt-helper
```

The prompt helper analyzes your bundle composition and suggests:

**For code-heavy bundles:**
```
System: You are a senior software engineer reviewing a TypeScript codebase...
User: Please analyze this codebase and:
1. Identify the main architectural patterns
2. Highlight any code quality concerns
3. Suggest specific improvements
```

**For docs-heavy bundles:**
```
System: You are a technical writer and documentation specialist...
User: Please review the documentation and:
1. Check for completeness and accuracy
2. Identify any gaps or unclear sections
3. Suggest improvements for developer experience
```

Bundle types detected:
- **code-heavy**: >60% source files
- **docs-heavy**: >40% documentation
- **test-heavy**: >40% test files
- **config-heavy**: >30% configuration
- **mixed**: Balanced composition

## Dashboard Semantics

### Context Fit Indicators

- ✓ **Safe** (green): Well under budget, plenty of room for response
- ⚠ **Caution** (yellow): Tight fit, limited response space
- ✗ **Danger** (red): Exceeds budget, will be truncated

### File Role Classification

Files are classified based on patterns:
- **Source**: Main application code (.ts, .js, .py, etc.)
- **Tests**: Test files (*.test.*, *.spec.*, __tests__/)
- **Docs**: Documentation (.md, .mdx, README, etc.)
- **Config**: Configuration (package.json, tsconfig.json, etc.)

### Delta Tracking

When a previous run exists, deltas show:
- Green negative: Reduction (good for staying under budget)
- Orange positive: Increase (watch for budget overflow)

## Advanced Usage

### Token Budgets

```bash
# Hard token limit
repo-roller . --max-tokens 50000

# Cost-based limits
repo-roller . --max-cost 0.50          # USD
repo-roller . --max-cost-eur 0.45      # EUR

# Warning thresholds
repo-roller . --warn-tokens 100000
```

### Output Customization

```bash
# Custom output file
repo-roller . -o bundle.md

# Different formats
repo-roller . -f json
repo-roller . -f yaml
repo-roller . -f txt

# Template-based naming
repo-roller . --out-template "{project}-{profile}-{date}.{ext}"

# Format options
repo-roller . --toc                     # Table of contents
repo-roller . --front-matter            # YAML front matter
repo-roller . --compact                 # Minified JSON
repo-roller . --indent 4                # Custom indentation
```

### Filtering

```bash
# Language shortcuts
repo-roller . --lang typescript
repo-roller . --lang python,go

# Extension filtering
repo-roller . --ext ts,tsx,md

# Exclude patterns
repo-roller . --no-tests
repo-roller . --no-deps
repo-roller . --no-generated

# Custom exclusions
repo-roller . -x "**/*.min.js" -x "**/vendor/**"

# Size limits
repo-roller . --max-size 100            # KB
```

### Profiles and Presets

```bash
# Built-in presets
repo-roller . --preset ts              # TypeScript-focused
repo-roller . --preset llm             # LLM-optimized defaults
repo-roller . --preset minimal         # Minimal output
repo-roller . --preset full            # Include everything

# List available
repo-roller . --list-presets
repo-roller . --list-profiles

# Show details
repo-roller . --show-preset ts
repo-roller . --show-profile llm-context
```

### Validation and Dry-Run

```bash
# Preview without generating
repo-roller . --dry-run

# Statistics only
repo-roller . --stats-only

# Validate configuration
repo-roller . --validate
```

## Configuration Files

### .reporoller.yml

Project-specific configuration:

```yaml
architectural_overview: |
  This is a modern TypeScript CLI application
  using React/Ink for TUI components.

profiles:
  core-first:
    layout:
      - package.json
      - src/core/**/*.ts
      - src/**/*.ts

presets:
  docs-only:
    extensions: [md, mdx]
    withTree: false
    withStats: false
```

### repo-roller.config.mjs

JavaScript configuration:

```javascript
export default {
  presets: {
    mypreset: {
      extensions: ['ts', 'tsx'],
      exclude: ['**/*.test.ts'],
      stripComments: true,
      withTree: false,
      withStats: true,
    },
  },
};
```

## Tips for Optimal Usage

1. **Start with --model**: Always specify your target model for accurate budget calculations

2. **Use --prompt-helper**: Get tailored prompts that match your bundle composition

3. **Monitor health hints**: Pay attention to warnings about bundle composition

4. **Leverage profiles**: Create project-specific profiles for consistent bundling

5. **Track deltas**: Compare runs to ensure you're staying within budget

6. **Strip comments for code analysis**: Use --strip-comments to reduce token count

7. **Focus with --no-tests**: Exclude tests for code-focused analysis

8. **Interactive for exploration**: Use TUI mode to understand your codebase structure

## Command Reference

```bash
repo-roller [root] [options]

Options:
  -o, --out <file>              Output file path
  -f, --format <type>           Output format: md, json, yaml, txt
  -i, --include <patterns...>   Include glob patterns
  -x, --exclude <patterns...>   Exclude glob patterns
  --ext <extensions>            Comma-separated extensions
  --lang <languages>            Language filter
  --max-size <kb>               Maximum file size in KB
  --no-tests                    Exclude test files
  --no-deps                     Exclude dependencies
  --no-generated                Exclude generated files
  --strip-comments              Strip comments
  --no-tree                     Disable directory tree
  --no-stats                    Disable statistics
  --sort <mode>                 Sort: path, size, extension
  -I, --interactive             Force interactive mode
  --dry-run                     Preview without generating
  --stats-only                  Statistics only
  --preset <name>               Use preset
  --profile <name>              Use profile
  --model <name>                Model preset (claude-3.5-sonnet, etc.)
  --list-models                 List model presets
  --prompt-helper               Show LLM prompt suggestions
  --toc                         Add table of contents
  --front-matter                Add YAML front matter
  --llm                         Detailed LLM analysis
  --max-tokens <n>              Token budget
  --max-cost <$>                Cost budget (USD)
  --warn-tokens <n>             Warning threshold
  -y, --yes                     Skip prompts
  -v, --verbose                 Verbose output
  --validate                    Validate configuration
  --list-presets                List presets
  --list-profiles               List profiles
  --examples                    Show examples
  --list-providers              List LLM providers
  -h, --help                    Show help
  -V, --version                 Show version
```

## Architecture

repo-roller follows a clean modular architecture:

```
CLI Entry (src/cli.ts)
  ↓
Config Resolution (src/core/config.ts)
  ↓
File Scanning (src/core/scan.ts)
  ↓
[Interactive TUI] or [Non-Interactive]
  ↓
Budget Constraints (src/core/budget.ts)
  ↓
Output Rendering (src/core/render.ts)
  ↓
Dashboard Display (src/core/dashboard.ts)
  ↓
Prompt Helper (src/core/promptHelper.ts)
```

Key modules:
- **modelPresets.ts**: Model preset definitions and budget calculations
- **dashboard.ts**: Shared dashboard rendering for all modes
- **promptHelper.ts**: Context-aware prompt generation
- **tokens.ts**: Token estimation and cost calculations
- **ui.ts**: Terminal UI utilities and styling

## Contributing

The codebase is strictly typed TypeScript with no `any` types. All new features should include:
- Type definitions in src/core/types.ts
- Unit tests
- Documentation updates
- ANSI-aware width handling for terminal output
