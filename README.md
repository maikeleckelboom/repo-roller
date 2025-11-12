# 📦 repo-roller

A CLI tool that transforms source code repositories into structured, narrative-driven outputs. Go beyond simple aggregation with intelligent context packaging for LLMs, developers, and documentation.

## ✨ Features

- 🎯 **Git-aware**: Automatically respects `.gitignore` patterns
- 🎨 **Interactive mode**: Checkbox-based file selection with filters
- 📁 **Directory tree**: Optional visual tree structure of your codebase
- 📊 **Statistics**: File counts, size breakdowns, extension analysis
- 🔧 **Configurable**: Presets, glob patterns, size limits, and more
- 🚀 **Fast**: Efficient file scanning with parallel processing
- 💪 **Type-safe**: Written in strict TypeScript
- 📝 **Multi-format**: Output as Markdown, JSON, YAML, or plain text
- 🏗️ **Profiles**: Control narrative structure and file ordering
- 🎭 **Architectural Overview**: Inject context about your project's structure

## 🚀 Quick Start

```bash
# Run in current directory
npx repo-roller .

# Interactive mode with file selection
npx repo-roller . -I

# Specify output file
npx repo-roller . -o my-code.md

# Filter by extensions
npx repo-roller . --ext ts,tsx,md

# Exclude patterns
npx repo-roller . -x "**/*.test.ts" -x "**/dist/**"
```

## 📦 Installation

```bash
# Global installation
npm install -g repo-roller

# Use with npx (no installation)
npx repo-roller
```

## 🎯 Usage

### Basic Usage

```bash
repo-roller [root] [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `[root]` | Root directory to scan | `.` (current directory) |
| `-o, --out <file>` | Output file path | `source_code.md` |
| `-i, --include <patterns...>` | Include glob patterns | All files |
| `-x, --exclude <patterns...>` | Exclude glob patterns | None |
| `--ext <extensions>` | Comma-separated extensions (e.g., `ts,tsx,md`) | All extensions |
| `--max-size <kb>` | Maximum file size in KB | 1024 |
| `--strip-comments` | Remove comments from source files | `false` |
| `--no-tree` | Disable directory tree view | Tree enabled |
| `--no-stats` | Disable statistics section | Stats enabled |
| `--sort <mode>` | Sort mode: `path`, `size`, or `extension` | `path` |
| `-I, --interactive` | Force interactive mode | Auto-detect TTY |
| `--preset <name>` | Use preset from config file | None |
| `--profile <name>` | Use profile from `.reporoller.yml` | `llm-context` |
| `-f, --format <type>` | Output format: `md`, `json`, `yaml`, `txt` | `md` |
| `-v, --verbose` | Verbose output | `false` |

### Examples

**Include only TypeScript files:**
```bash
repo-roller . --ext ts,tsx
```

**Exclude test and build files:**
```bash
repo-roller . -x "**/*.test.ts" -x "**/dist/**" -x "**/node_modules/**"
```

**Strip comments and sort by size:**
```bash
repo-roller . --strip-comments --sort size
```

**Interactive mode with custom output:**
```bash
repo-roller . -I -o codebase-snapshot.md
```

## ⚙️ Configuration File

Create a `repo-roller.config.mjs` (or `.mts`, `.cjs`, `.ts`, `.js`) in your project root:

```javascript
export default {
  root: '.',
  defaultPreset: 'typescript',
  presets: {
    typescript: {
      extensions: ['ts', 'tsx'],
      exclude: ['**/*.test.ts', '**/dist/**', '**/node_modules/**'],
      stripComments: true,
      withTree: true,
      withStats: true,
      sort: 'path',
    },
    docs: {
      extensions: ['md', 'mdx'],
      withTree: false,
      withStats: false,
    },
    minimal: {
      extensions: ['ts', 'tsx', 'js', 'jsx'],
      maxFileSizeBytes: 512 * 1024, // 512 KB
      stripComments: true,
      withTree: false,
      withStats: false,
    },
  },
};
```

**Use a preset:**
```bash
repo-roller . --preset typescript
```

## 🏗️ Profiles & .reporoller.yml

Profiles provide intelligent control over narrative structure and file ordering, perfect for tailoring output to different consumers (LLMs, developers, documentation).

### Creating a `.reporoller.yml` File

Create a `.reporoller.yml` in your project root:

```yaml
# Introductory text injected into the output
architectural_overview: |
  repo-roller is a CLI tool written in TypeScript for aggregating source code.
  The main entry point is `src/cli.ts`, which uses `commander` for argument parsing.
  Core logic is separated into scanning (`scan.ts`) and rendering (`render.ts`).
  Interactive mode is handled by `ink` via `tui.ts`.

# Define profiles with custom file layouts
profiles:
  llm-context:  # Optimized for LLM comprehension
    layout:
      - package.json
      - .reporoller.yml
      - 'src/core/types.ts'
      - 'src/cli.ts'
      - 'src/core/**/*.ts'
      - 'src/**/*.tsx'

  human-readable:  # Optimized for human developers
    layout:
      - README.md
      - 'src/cli.ts'
      - 'src/**/*.ts'
      - 'src/**/*.tsx'
      - '*.test.ts'
```

### Using Profiles

```bash
# Use the llm-context profile (default)
repo-roller . --profile llm-context

# Use a different profile
repo-roller . --profile human-readable

# Without a .reporoller.yml, falls back to --sort behavior
repo-roller . --sort path
```

**How Profiles Work:**
- The `layout` array defines glob patterns in priority order
- Files matching earlier patterns appear first in the output
- Files not matching any pattern appear at the end, sorted alphabetically
- The `architectural_overview` is injected into Markdown output

## 📝 Multi-Format Output

Generate structured outputs in different formats for various use cases.

### Available Formats

**Markdown (default)** - Rich, human-readable format with sections
```bash
repo-roller . --format md -o output.md
```

**JSON** - Structured data with metadata
```bash
repo-roller . --format json -o output.json
```

Output structure:
```json
{
  "metadata": {
    "sourceRepository": "https://github.com/user/repo",
    "profile": "llm-context",
    "timestamp": "2025-11-12T02:58:00Z",
    "fileCount": 15
  },
  "architecturalOverview": "...",
  "files": [
    {
      "path": "package.json",
      "language": "json",
      "content": "{\n  \"name\": \"repo-roller\"\n}"
    }
  ]
}
```

**YAML** - Human-friendly structured format
```bash
repo-roller . --format yaml -o output.yaml
```

**Plain Text** - Simple, parseable format
```bash
repo-roller . --format txt -o output.txt
```

Output format:
```
==================================================
File: package.json
==================================================

{
  "name": "repo-roller"
}

==================================================
File: src/cli.ts
==================================================

#!/usr/bin/env node
...
```

### Combining Features

```bash
# Use a profile with JSON output for LLM processing
repo-roller . --profile llm-context --format json -o context.json

# Human-readable YAML for documentation
repo-roller . --profile human-readable --format yaml -o docs.yaml

# Markdown with custom profile and no stats
repo-roller . --profile core-only --format md --no-stats -o core.md
```

## 🎨 Interactive Mode

Interactive mode provides a rich TUI for selecting files and configuring options:

1. **File selection**: Checkbox list grouped by directory
2. **Options**: Strip comments, include tree, include stats
3. **Summary**: Review selections before generating
4. **Confirmation**: Generate or cancel

Enable interactive mode:
```bash
repo-roller . -I
```

Interactive mode is automatically enabled when:
- Running in a TTY (terminal)
- Not in CI/CD environment
- Unless explicitly disabled with `--no-interactive`

## 📄 Markdown Output Format

When using `--format md` (default), the generated Markdown includes:

1. **Header**: Project metadata (root, file count, total size)
2. **Architectural Overview** (optional): Injected from `.reporoller.yml`
3. **Directory Tree** (optional): Visual representation of file structure
4. **Statistics** (optional): Extension counts and size breakdowns
5. **File Contents**: Each file in a fenced code block with syntax highlighting

Example output structure:

```markdown
# 📦 Source Code Archive

**Root**: `/path/to/project`
**Files**: 42
**Total size**: 523.45 KB

---

## 🏗️ Architectural Overview

repo-roller is a CLI tool written in TypeScript...

---

## 📂 Directory Structure
...

## 📊 Statistics
...

## 📄 Files

### `src/index.ts`

```typescript
// File: src/index.ts

export function main() {
  // File contents here
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📝 License

MIT
