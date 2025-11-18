# What is repo-roller?

repo-roller is a CLI tool and library that aggregates source code files from a repository into a single, optimized output file designed for Large Language Models (LLMs).

## The Problem

When working with AI coding assistants like Claude, GPT-4, or Gemini, developers face several challenges:

1. **Token Limits**: LLMs have context window limits, but it's hard to know if your code will fit
2. **Manual Selection**: Copying and pasting files is tedious and error-prone
3. **Cost Uncertainty**: You don't know the cost until after generation
4. **Context Optimization**: Hard to select the most relevant files within budget
5. **Reproducibility**: Difficult to recreate the same code snapshot later

## The Solution

repo-roller automates the entire process:

```bash
# Generate a code bundle with token estimation
repo-roller --preset ts --max-tokens 100000 --target claude-3.5-sonnet
```

This command will:
- Scan your repository for TypeScript files
- Estimate token count and cost
- Filter files to fit within 100k token budget
- Generate optimized output in your preferred format
- Track the generation in history for later replay

## Key Features

### 🎯 Smart File Selection

Automatically scan and filter files using:
- Glob patterns (`**/*.ts`, `src/**/*.js`)
- File extensions and sizes
- Git history (changed files, diffs)
- Built-in exclusions (.gitignore, node_modules, etc.)

### 💰 Token & Cost Awareness

Get accurate estimates before generation:
- Support for 25+ LLM providers
- Real-time token counting
- Cost estimation in USD and EUR
- Provider comparison tool

### 📦 Multiple Output Formats

Generate output in the format that works best for your use case:
- **Markdown**: Human-readable with syntax highlighting
- **JSON**: Structured data for programmatic use
- **YAML**: Configuration-friendly format
- **Plain Text**: Simple concatenation

### 🎨 Presets & Profiles

Quick-start configurations for common scenarios:
- Language-specific presets (TypeScript, Python, Go, Rust)
- Use-case presets (docs, minimal, full)
- Custom profiles with file ordering
- Model-specific presets

### 💻 Interactive Terminal UI

Beautiful TUI for visual workflow:
- Interactive file tree with preview
- Real-time token/cost updates
- Output configuration
- Settings management

### 🔍 Budget Management

Ensure output fits within constraints:
- Set max tokens or cost budget
- Automatic file prioritization
- Budget usage visualization
- Warning thresholds

## Use Cases

### AI Code Review
```bash
# Share full context with Claude
repo-roller --preset ts -o review.md --target claude-3.5-sonnet
```

### Documentation Generation
```bash
# Extract all documentation
repo-roller --preset docs --format json
```

### Bug Investigation
```bash
# Get recently changed files
repo-roller --most-recent 10 --include "**/*.ts"
```

### Code Migration
```bash
# Bundle specific directories
repo-roller --include "src/legacy/**" --max-tokens 50000
```

### Security Audit
```bash
# Analyze authentication code
repo-roller --include "**/auth/**" --include "**/security/**"
```

## How It Works

1. **Scan**: Discover files using fast-glob with .gitignore support
2. **Filter**: Apply patterns, extensions, sizes, and git filters
3. **Estimate**: Count tokens for selected files and calculate costs
4. **Budget**: If budget set, prioritize and select files to fit
5. **Render**: Generate output in chosen format with metadata
6. **Track**: Record generation in history for future reference

## Architecture

repo-roller is built with modularity and performance in mind:

```
┌─────────────┐
│  CLI / TUI  │  User Interface Layer
└──────┬──────┘
       │
┌──────▼──────┐
│   Config    │  Configuration & Validation
└──────┬──────┘
       │
┌──────▼──────┐
│   Scanner   │  File Discovery & Filtering
└──────┬──────┘
       │
┌──────▼──────┐
│   Tokens    │  Estimation & Cost Calculation
└──────┬──────┘
       │
┌──────▼──────┐
│   Budget    │  Budget Constraints & Selection
└──────┬──────┘
       │
┌──────▼──────┐
│   Render    │  Output Generation
└─────────────┘
```

## Installation

Install globally via npm:

```bash
npm install -g repo-roller
```

Or use locally in your project:

```bash
npm install --save-dev repo-roller
```

## Quick Example

```bash
# Interactive mode - easiest way to get started
repo-roller -I

# TypeScript files only
repo-roller --preset ts

# Within budget
repo-roller --max-tokens 100000 --target claude-3.5-sonnet

# Recent changes only
repo-roller --most-recent 5

# Custom output
repo-roller --format json --out bundle.json
```

## Next Steps

- [Getting Started Guide](/guide/getting-started) - Installation and first steps
- [CLI Reference](/cli/) - Complete command-line options
- [Configuration Guide](/guide/configuration) - Config files and presets
- [API Reference](/api/) - Programmatic usage
