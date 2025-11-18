---
layout: home

hero:
  name: "repo-roller"
  text: "Code Aggregation for LLMs"
  tagline: Aggregate source code files from your repository into a single, optimized output file designed for Large Language Models
  image:
    src: /logo.svg
    alt: repo-roller
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/maikeleckelboom/repo-roller
    - theme: alt
      text: API Reference
      link: /api/

features:
  - icon: 🎯
    title: Smart File Selection
    details: Scan directories with intelligent filtering by patterns, extensions, size, and git history while respecting .gitignore

  - icon: 💰
    title: Token & Cost Estimation
    details: Estimate token counts and costs for 25+ LLM providers including OpenAI, Anthropic, Google, and more

  - icon: 📦
    title: Multiple Output Formats
    details: Generate output in Markdown, JSON, YAML, or plain text with customizable formatting and structure

  - icon: 🎨
    title: Built-in Presets
    details: Quick-start presets for TypeScript, Python, Go, Rust, docs, and more with full customization

  - icon: 💻
    title: Interactive TUI
    details: Beautiful terminal UI for file selection, configuration, and preview before generation

  - icon: 🔍
    title: Budget Management
    details: Set token or cost budgets to ensure output fits within your LLM's context window

  - icon: 📊
    title: History Tracking
    details: Track, search, compare, and replay your generation history with tags and annotations

  - icon: ⚙️
    title: Flexible Configuration
    details: Configure via CLI flags, config files, profiles, or interactive mode with validation

  - icon: 🚀
    title: Developer-Friendly
    details: Clean programmatic API with TypeScript support for integration into your tools and workflows
---

## Quick Start

Install repo-roller globally via npm:

```bash
npm install -g repo-roller
```

Generate a code bundle for your project:

```bash
# Basic usage
repo-roller

# With TypeScript preset
repo-roller --preset ts

# Interactive mode
repo-roller -I

# With token budget
repo-roller --max-tokens 100000 --target claude-3.5-sonnet
```

## Why repo-roller?

When working with AI coding assistants, you often need to share your entire codebase context. repo-roller solves common challenges:

- **Token Awareness**: Know exactly how many tokens and cost before generating
- **Smart Filtering**: Exclude tests, dependencies, and generated files automatically
- **Context Optimization**: Fit your code within LLM context windows with budget management
- **Format Flexibility**: Choose the best format for your LLM provider
- **History & Reproducibility**: Track and replay previous generations

## Example Output

repo-roller generates structured output with comprehensive metadata:

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
// ... file contents
\`\`\`
```

## Features at a Glance

| Feature | Description |
|---------|-------------|
| **CLI & TUI** | Command-line interface with optional interactive terminal UI |
| **File Scanning** | Fast scanning with glob patterns and .gitignore support |
| **Token Estimation** | Accurate token counting for 25+ LLM providers |
| **Budget Constraints** | Enforce token or cost limits with automatic file selection |
| **Multiple Formats** | Markdown, JSON, YAML, or plain text output |
| **Presets & Profiles** | Pre-configured settings for common use cases |
| **Git Integration** | Filter by git diff or most recently changed files |
| **History Tracking** | Search, compare, and replay previous generations |
| **Daemon Mode** | Background service for faster repeated operations |
| **Programmatic API** | Full TypeScript API for integration |

## Use Cases

- **AI Code Review**: Share full codebase context with Claude, GPT, or Gemini
- **Documentation**: Generate comprehensive code snapshots for analysis
- **Code Migration**: Bundle code for LLM-assisted refactoring or migration
- **Bug Reports**: Provide complete context when reporting issues
- **Code Analysis**: Feed code to LLMs for security, performance, or quality analysis
- **Learning**: Study codebases by creating structured, readable bundles

## Community

- [GitHub Repository](https://github.com/maikeleckelboom/repo-roller)
- [Report Issues](https://github.com/maikeleckelboom/repo-roller/issues)
- [Contribute](https://github.com/maikeleckelboom/repo-roller/blob/main/CONTRIBUTING.md)

## License

MIT License - see [LICENSE](https://github.com/maikeleckelboom/repo-roller/blob/main/LICENSE) for details.
