# 📦 repo-roller

**Context Engine for LLMs** - Transform your codebase into optimized, cost-aware context for Claude, GPT-4, Gemini, and other AI assistants.

## Why repo-roller?

When working with LLMs, context is everything. repo-roller doesn't just concatenate files—it intelligently packages your codebase with:

- **Token counting & cost estimation** for major LLM providers
- **Context window awareness** to prevent overflow
- **Smart file prioritization** based on your needs
- **Architectural context** that helps LLMs understand your project

## 🚀 Quick Start

```bash
# Generate context optimized for Claude
npx repo-roller . --target claude-sonnet

# Preview token usage before generating
npx repo-roller . --dry-run

# List supported LLM providers
npx repo-roller --list-providers

# Interactive file selection
npx repo-roller . --interactive
```

## ✨ Key Features

### 🎯 LLM-Optimized Output
- **Token counting** with cost estimates for Claude, GPT-4, Gemini, and more
- **Context window warnings** when output exceeds provider limits
- **Smart file naming** with project, profile, and date

### 💰 Cost-Aware Generation
```bash
$ repo-roller . --target claude-sonnet

✅ Found 15 files (234.56 KB)
📝 Rendering MD output...
✨ Output written to my-project-2025-11-15.md

📊 Token Analysis
   Estimated tokens: 58,234

   Cost estimates:
   ✓ Claude 3.5 Sonnet: $0.1747
   ✓ GPT-4o: $0.1456
   ✓ Claude 3.5 Haiku: $0.0466
   ✓ Gemini 1.5 Pro: $0.0728

   💡 Recommendations:
   • Most cost-effective: Claude 3.5 Haiku at $0.0466
```

### 🛡️ Configuration Validation
```bash
$ repo-roller . --validate

🔍 Validating configuration files...

✅ repo-roller.config is valid
⚠️  Warnings in .reporoller.yml:
  profiles
    Warning: No profiles defined
    Suggestion: Add profiles to customize file ordering
```

### 🎨 Multi-Format Output
- **Markdown** - Rich, readable format for documentation
- **JSON** - Structured data for programmatic use
- **YAML** - Human-friendly structured format
- **Plain Text** - Simple, parseable format

### 🏗️ Profile System
Control file ordering and context structure:

```yaml
# .reporoller.yml
architectural_overview: |
  This is a TypeScript CLI tool...

profiles:
  llm-context:
    layout:
      - package.json
      - src/core/types.ts
      - 'src/**/*.ts'
```

## 📦 Installation

```bash
# Global installation
npm install -g repo-roller

# Use with npx (no installation required)
npx repo-roller .
```

## 🎯 Common Workflows

### 1. Create Context for Claude Projects
```bash
repo-roller . --target claude-sonnet
# Optimized for 200K context window
# Shows cost estimate and utilization %
```

### 2. Budget-Friendly Context Generation
```bash
repo-roller . --preset minimal --target claude-haiku
# Stripped comments, smaller files
# Uses cheapest provider
```

### 3. Preview Before Generating
```bash
repo-roller . --dry-run
# See file list, token estimate, and cost
# without generating output
```

### 4. TypeScript Project (No Tests)
```bash
repo-roller . --lang typescript --no-tests
# Quick filter for source code only
```

### 5. Custom Token Threshold
```bash
repo-roller . --warn-tokens 100000
# Warns if output exceeds 100K tokens
```

### 6. Validate Configuration
```bash
repo-roller . --validate
# Check configs for errors before running
```

## ⚙️ CLI Options

### Core Options
| Option | Description | Default |
|--------|-------------|---------|
| `[root]` | Root directory to scan | `.` |
| `-o, --out <file>` | Output file path | `{project}-{date}.{ext}` |
| `--out-template <template>` | Custom filename template | - |
| `-f, --format <type>` | Output format: md, json, yaml, txt | `md` |

### Filter Options
| Option | Description |
|--------|-------------|
| `--ext <extensions>` | File extensions (e.g., `ts,tsx`) |
| `--lang <languages>` | Language shortcut (e.g., `typescript`) |
| `--max-size <kb>` | Maximum file size in KB |
| `--no-tests` | Exclude test files |
| `--no-deps` | Exclude dependency directories |
| `--no-generated` | Exclude build directories |

### Token & Cost Options
| Option | Description |
|--------|-------------|
| `--target <provider>` | Target LLM provider for cost estimates |
| `--warn-tokens <number>` | Warn if tokens exceed threshold |
| `--no-token-count` | Disable token analysis |
| `--list-providers` | Show all supported providers |

### Preview & Validation
| Option | Description |
|--------|-------------|
| `--dry-run` | Preview files without generating |
| `--stats-only` | Show statistics only |
| `--validate` | Validate configuration files |

### Preset & Profile Options
| Option | Description |
|--------|-------------|
| `--preset <name>` | Use a preset (llm, minimal, docs, etc.) |
| `--profile <name>` | Use profile from .reporoller.yml |
| `--list-presets` | Show available presets |
| `--list-profiles` | Show available profiles |

## 🤖 Supported LLM Providers

| Provider | Context Window | Input Cost (per 1M tokens) |
|----------|---------------|---------------------------|
| Claude 3.5 Sonnet | 200,000 | $3.00 |
| Claude 3 Opus | 200,000 | $15.00 |
| Claude 3.5 Haiku | 200,000 | $0.80 |
| GPT-4o | 128,000 | $2.50 |
| GPT-4 Turbo | 128,000 | $10.00 |
| GPT-4 | 8,192 | $30.00 |
| OpenAI o1 | 200,000 | $15.00 |
| Gemini 1.5 Pro | 2,000,000 | $1.25 |

## 📁 Configuration Files

### repo-roller.config.mjs

Define custom presets:

```javascript
export default {
  root: '.',
  defaultPreset: 'typescript',
  presets: {
    typescript: {
      extensions: ['ts', 'tsx'],
      exclude: ['**/*.test.ts'],
      stripComments: true,
      withTree: true,
    },
    minimal: {
      extensions: ['ts', 'tsx'],
      maxFileSizeBytes: 512 * 1024,
      stripComments: true,
      withTree: false,
      withStats: false,
    },
  },
};
```

### .reporoller.yml

Define profiles and architectural context:

```yaml
architectural_overview: |
  This project is a TypeScript CLI tool that...

profiles:
  llm-context:
    layout:
      - package.json
      - README.md
      - src/core/types.ts
      - 'src/**/*.ts'

  onboarding:
    layout:
      - README.md
      - CONTRIBUTING.md
      - 'docs/**/*.md'
      - src/cli.ts
```

## 🎨 Interactive Mode

Visual file selection with keyboard navigation:

```bash
repo-roller . --interactive
```

Features:
- Checkbox tree for file selection
- Directory expand/collapse
- Toggle hidden/excluded files (H key)
- Live selection count

## 📊 Example Output

### Token Analysis Report

```
📊 Token Analysis
   Estimated tokens: 45,678

   Cost estimates:
   ✓ Claude 3.5 Sonnet: $0.1370
   ✓ GPT-4o: $0.1142
   ✓ Claude 3.5 Haiku: $0.0365
   ✓ Gemini 1.5 Pro: $0.0571

   💡 Recommendations:
   • Most cost-effective: Claude 3.5 Haiku at $0.0365
```

### Markdown Output Structure

```markdown
# 📦 Source Code Archive

**Root**: `/path/to/project`
**Files**: 42
**Total size**: 523.45 KB

---

## 🏗️ Architectural Overview

[Your project description from .reporoller.yml]

---

## 📂 Directory Structure
[Visual tree of your codebase]

## 📊 Statistics
[File counts, extensions, sizes]

## 📄 Files
[Each file in syntax-highlighted code blocks]
```

## 🔧 Built-in Presets

| Preset | Description | Extensions |
|--------|-------------|------------|
| `llm` | Optimized for LLMs (2MB limit) | ts, tsx, js, jsx, py, md |
| `minimal` | Stripped, small files | Code files, 512KB limit |
| `docs` | Documentation only | md, mdx, txt |
| `full` | All files | Everything |
| `ts` | TypeScript only | ts, tsx |
| `js` | JavaScript only | js, jsx, mjs, cjs |
| `python` | Python projects | py, pyi |
| `go` | Go projects | go |
| `rust` | Rust projects | rs |

## 🚀 Advanced Usage

### Initialize Configuration
```bash
repo-roller init
# Interactive setup for presets and profiles
```

### Show Examples
```bash
repo-roller --examples
# Comprehensive workflow examples
```

### JSON Output for Automation
```bash
repo-roller . --format json --compact | jq '.metadata.fileCount'
```

### Custom Filename Template
```bash
repo-roller . --out-template "{project}-context-{date}.{ext}"
# Outputs: my-project-context-2025-11-15.md
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📝 License

MIT
