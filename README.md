# 📦 repo-roller

A CLI tool that aggregates source code from a repository into a single, well-formatted Markdown file. Perfect for sharing codebases with LLMs, creating documentation snapshots, or code reviews.

## ✨ Features

- 🎯 **Git-aware**: Automatically respects `.gitignore` patterns
- 🎨 **Interactive mode**: Checkbox-based file selection with filters
- 📁 **Directory tree**: Optional visual tree structure of your codebase
- 📊 **Statistics**: File counts, size breakdowns, extension analysis
- 🔧 **Configurable**: Presets, glob patterns, size limits, and more
- 🚀 **Fast**: Efficient file scanning with parallel processing
- 💪 **Type-safe**: Written in strict TypeScript

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

## 📄 Output Format

The generated Markdown includes:

1. **Header**: Project metadata (root, file count, total size)
2. **Directory Tree** (optional): Visual representation of file structure
3. **Statistics** (optional): Extension counts and size breakdowns
4. **File Contents**: Each file in a fenced code block with syntax highlighting

Example output structure:

```markdown
# 📦 Source Code Archive

**Root**: `/path/to/project`
**Files**: 42
**Total size**: 523.45 KB

---

## 📂 Directory Structure
...

## 📊 Statistics
...

## 📄 Files

### src/index.ts
```typescript
// File contents here
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📝 License

MIT
