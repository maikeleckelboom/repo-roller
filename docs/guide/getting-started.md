# Getting Started

This guide will help you install repo-roller and generate your first code bundle.

## Installation

### Global Installation

Install repo-roller globally to use it anywhere:

```bash
npm install -g repo-roller
```

Verify the installation:

```bash
repo-roller --version
```

### Local Installation

Install as a dev dependency in your project:

```bash
npm install --save-dev repo-roller
```

Use via npx or package.json scripts:

```bash
npx repo-roller
```

## First Steps

### 1. Basic Usage

Navigate to your project directory and run:

```bash
repo-roller
```

This will:
- Scan your current directory
- Apply default filters (.gitignore, node_modules, etc.)
- Generate a Markdown file with all source code
- Show statistics and token estimates

### 2. Interactive Mode

For the best experience, use interactive mode:

```bash
repo-roller -I
```

Interactive mode provides:
- Visual file tree with multi-select
- Real-time token/cost estimates
- Output format selection
- Preview before generation

### 3. Using Presets

Presets provide quick-start configurations:

```bash
# TypeScript files only
repo-roller --preset ts

# Python project
repo-roller --preset python

# Documentation only
repo-roller --preset docs

# See all available presets
repo-roller --list-presets
```

### 4. Specifying Output

Control where output is saved:

```bash
# Specify output file
repo-roller -o my-code.md

# Change format
repo-roller -o bundle.json --format json

# Use filename template
repo-roller --out-template "{repo}-{date}.md"
```

## Common Workflows

### Workflow 1: Share Code with Claude

```bash
# Generate TypeScript bundle within Claude's context
repo-roller --preset ts --max-tokens 150000 --target claude-3.5-sonnet -o for-claude.md
```

### Workflow 2: Document Your API

```bash
# Extract all source files, exclude tests
repo-roller --include "src/**/*.ts" --no-tests -o api-docs.md
```

### Workflow 3: Review Recent Changes

```bash
# Get 10 most recently changed files
repo-roller --most-recent 10 --include "**/*.ts"
```

### Workflow 4: Budget-Constrained Generation

```bash
# Stay within $1 budget for GPT-4
repo-roller --max-cost 1.00 --target gpt-4-turbo
```

### Workflow 5: Export to JSON

```bash
# Generate JSON for programmatic use
repo-roller --format json --compact -o bundle.json
```

## Understanding the Output

### Markdown Format

The default Markdown output includes:

```markdown
# Repository: my-project

## Statistics
- Total Files: 42
- Total Size: 156.7 KB
- Estimated Tokens: 45,234
- Estimated Cost: $0.68 (Claude 3.5 Sonnet)

## Directory Tree
src/
├── core/
│   ├── index.ts
│   └── types.ts
└── utils/
    └── helpers.ts

## Files

### src/core/index.ts
\`\`\`typescript
export * from './types';
export { processFiles } from './processor';
\`\`\`

### src/core/types.ts
\`\`\`typescript
export interface Config {
  input: string;
  output: string;
}
\`\`\`
```

### JSON Format

JSON output provides structured data:

```json
{
  "repository": "my-project",
  "generated": "2024-01-15T10:30:00Z",
  "statistics": {
    "totalFiles": 42,
    "totalSize": 160435,
    "estimatedTokens": 45234
  },
  "files": [
    {
      "path": "src/core/index.ts",
      "content": "export * from './types';",
      "language": "typescript",
      "size": 1234
    }
  ]
}
```

## Token Estimation

repo-roller provides token estimates for multiple providers:

```bash
# See token breakdown
repo-roller --stats-only

# Compare across providers
repo-roller --list-providers

# Target specific provider
repo-roller --target claude-3.5-sonnet
```

### Example Output

```
Code Composition by Language:
┌────────────┬───────┬──────────┬────────────┐
│ Language   │ Files │ Size     │ Tokens     │
├────────────┼───────┼──────────┼────────────┤
│ TypeScript │ 38    │ 142.3 KB │ 41,234     │
│ JSON       │ 3     │ 12.1 KB  │ 3,456      │
│ Markdown   │ 1     │ 2.3 KB   │ 544        │
└────────────┴───────┴──────────┴────────────┘

Context Fit Analysis (Claude 3.5 Sonnet - 200k tokens):
Your code uses 45,234 tokens (22.6% of context window)
✓ Fits comfortably with room for conversation

Estimated Cost: $0.68 (input) + $3.39 (output, assuming 1:1)
```

## File Filtering

### Include Patterns

```bash
# Include specific files
repo-roller --include "src/**/*.ts" --include "lib/**/*.js"

# By extension
repo-roller --ext ts,tsx,js

# By language
repo-roller --lang typescript,javascript
```

### Exclude Patterns

```bash
# Exclude specific patterns
repo-roller --exclude "**/*.test.ts" --exclude "**/*.spec.ts"

# Quick exclusions
repo-roller --no-tests --no-deps --no-generated
```

### Size Limits

```bash
# Exclude large files
repo-roller --max-size 100  # Files larger than 100KB
```

## Configuration

### Initialize Configuration

Create a configuration file interactively:

```bash
repo-roller init
```

This creates `repo-roller.config.mjs` with custom presets.

### Create Profile

Create `.reporoller.yml` for file ordering and profiles:

```yaml
profiles:
  core-first:
    layout:
      - package.json
      - src/index.ts
      - src/core/**/*.ts
      - src/**/*.ts

presets:
  my-preset:
    description: "My custom configuration"
    include:
      - "src/**/*.ts"
    exclude:
      - "**/*.test.ts"
    stripComments: true
```

Use the profile:

```bash
repo-roller --profile core-first
```

## History Tracking

repo-roller tracks all generations:

```bash
# View history
repo-roller history list

# Search history
repo-roller history search --tag "api-review"

# Replay previous generation
repo-roller history show <id> --replay

# Tag entries
repo-roller history tag <id> "v1.0-release"
```

## Next Steps

Now that you've generated your first bundle:

- **Learn more about [CLI options](/cli/)** - Explore all available flags
- **Configure [presets and profiles](/guide/presets)** - Customize for your workflow
- **Understand [token management](/guide/token-estimation)** - Optimize for LLM context
- **Use the [programmatic API](/api/)** - Integrate into your tools
- **Explore [advanced features](/guide/interactive-mode)** - TUI, daemon mode, git integration

## Getting Help

```bash
# Show help
repo-roller --help

# Show examples
repo-roller --examples

# List presets
repo-roller --list-presets

# List LLM providers
repo-roller --list-providers
```

## Troubleshooting

### No files found

Check your filters:
```bash
repo-roller --verbose  # See what's being filtered
```

### Token estimation seems off

Ensure correct target:
```bash
repo-roller --target claude-3.5-sonnet  # Use specific model
```

### Output too large

Use budget constraints:
```bash
repo-roller --max-tokens 100000  # Set hard limit
```

### Need to exclude more files

Use .gitignore or explicit excludes:
```bash
repo-roller --exclude "**/dist/**" --exclude "**/build/**"
```
