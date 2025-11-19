# Content Options

Control what content appears in the generated output.

## Comment Stripping

### `--strip-comments`

Remove comments from source code to save tokens.

```bash
# Strip comments
repo-roller --strip-comments

# Strip comments with TypeScript preset
repo-roller --preset ts --strip-comments
```

**How it works:**
- Removes single-line comments (`//`)
- Removes multi-line comments (`/* */`)
- Preserves JSDoc comments
- Respects language syntax
- Works with 50+ languages

**Token savings:**
```bash
# Without stripping
Total tokens: 45,234
Comments: 2,456 tokens (5.4%)

# With stripping
Total tokens: 42,778
Saved: 2,456 tokens
```

**When to use:**
- Maximizing token budget
- Comments not needed for context
- Reducing LLM input costs
- Fitting within context window

**Supported languages:**
- JavaScript, TypeScript, JSX, TSX
- Python
- Go, Rust, Java, C/C++
- Ruby, PHP, Swift, Kotlin
- And 40+ more...

## Directory Tree

### `--no-tree`

Disable directory tree visualization in output.

```bash
# Disable tree
repo-roller --no-tree

# JSON without tree
repo-roller --format json --no-tree
```

**Default tree output:**
```
Directory Tree
src/
├── core/
│   ├── index.ts
│   ├── scanner.ts
│   └── types.ts
├── cli/
│   ├── commands.ts
│   └── display.ts
└── utils/
    └── helpers.ts
```

**Use cases:**
- Minimal output
- Programmatic parsing (JSON/YAML)
- Known directory structure
- Token optimization

**Token savings:**
```bash
# With tree (default)
Tree section: ~300 tokens

# Without tree
Saved: 300 tokens
```

## Statistics

### `--no-stats`

Disable statistics section in output.

```bash
# Disable statistics
repo-roller --no-stats

# Minimal output
repo-roller --no-tree --no-stats
```

**Default statistics output:**
```
Statistics
Total Files: 42
Total Size: 156.7 KB
Estimated Tokens: 45,234

Files by Language:
- TypeScript: 38 files (91.2%)
- JSON: 3 files (7.1%)
- Markdown: 1 file (1.7%)

Files by Extension:
- .ts: 35 files
- .tsx: 3 files
- .json: 3 files
- .md: 1 file
```

**Use cases:**
- Pure code output
- Custom statistics
- Token optimization
- Programmatic use

**Token savings:**
```bash
# With stats (default)
Stats section: ~150 tokens

# Without stats
Saved: 150 tokens
```

## Table of Contents

### `--toc`

Add table of contents to Markdown output.

```bash
# Add TOC
repo-roller --format md --toc

# TOC with front matter
repo-roller --format md --toc --front-matter
```

**Generated TOC:**
```markdown
# Repository: my-project

## Table of Contents
- [Statistics](#statistics)
- [Directory Tree](#directory-tree)
- [Files](#files)
  - [src/core/index.ts](#srccore-indexts)
  - [src/core/scanner.ts](#srccore-scannerts)
  - [src/cli/commands.ts](#srccli-commandsts)
  - [src/utils/helpers.ts](#srcutils-helpersts)

## Statistics
...
```

**Features:**
- Auto-generated links
- Hierarchical structure
- GitHub-compatible
- Clickable navigation

**When to use:**
- Large bundles (20+ files)
- Documentation
- Human review
- GitHub README

**Notes:**
- Only works with `--format md`
- Adds ~100-500 tokens depending on file count
- Updates automatically based on content

## YAML Front Matter

### `--front-matter`

Add YAML front matter to Markdown output.

```bash
# Add front matter
repo-roller --format md --front-matter

# Front matter with TOC
repo-roller --format md --front-matter --toc
```

**Generated front matter:**
```markdown
---
repository: my-project
generated: 2024-01-15T10:30:00Z
totalFiles: 42
totalSize: 160435
estimatedTokens: 45234
format: md
preset: llm
target: claude-3.5-sonnet
---

# Repository: my-project
...
```

**Metadata included:**
- Repository name
- Generation timestamp
- File count and size
- Token estimate
- Output format
- Preset used
- Target provider (if specified)
- Git branch/commit (if available)

**Use cases:**
- Documentation sites (VitePress, Jekyll, Hugo)
- Static site generators
- Metadata tracking
- Automated processing

**When to use:**
- Documentation publishing
- Automated workflows
- Metadata required by tools
- Historical tracking

**Notes:**
- Only works with `--format md`
- Adds ~50-100 tokens
- YAML-compatible format

## File Sorting

### `--sort <mode>`

Control file ordering in output.

```bash
# Sort by path (default)
repo-roller --sort path

# Sort by size (largest first)
repo-roller --sort size

# Sort by extension
repo-roller --sort extension
```

**Available modes:**

#### `path` (default)
Alphabetical by file path.

```
src/auth/index.ts
src/auth/login.ts
src/core/config.ts
src/core/index.ts
```

#### `size`
Largest files first.

```
src/generated/schema.ts (45 KB)
src/core/scanner.ts (23 KB)
src/cli/commands.ts (15 KB)
src/utils/helpers.ts (3 KB)
```

**Use cases:**
- Review largest files first
- Focus on substantial files
- Identify bloat

#### `extension`
Group by file extension.

```
# .ts files
src/core/index.ts
src/core/scanner.ts
src/cli/commands.ts

# .tsx files
src/components/App.tsx
src/components/Settings.tsx

# .json files
package.json
tsconfig.json
```

**Use cases:**
- Language-focused review
- Extension-based analysis
- Organized output

## JSON/YAML Formatting

### `--compact`

Minify JSON output (removes whitespace).

```bash
# Compact JSON
repo-roller --format json --compact
```

**Without `--compact`:**
```json
{
  "repository": "my-project",
  "files": [
    {
      "path": "src/index.ts",
      "content": "..."
    }
  ]
}
```

**With `--compact`:**
```json
{"repository":"my-project","files":[{"path":"src/index.ts","content":"..."}]}
```

**Use cases:**
- API transmission
- Storage optimization
- Log files
- Machine processing

**Token savings:**
```bash
# Pretty-printed
Size: 125 KB
Tokens: 35,000

# Compact
Size: 98 KB
Tokens: 28,000
Saved: 7,000 tokens (20%)
```

### `--indent <number>`

Set indentation level for JSON/YAML.

```bash
# 2 spaces (default)
repo-roller --format json --indent 2

# 4 spaces
repo-roller --format json --indent 4

# Tabs (0 = tabs)
repo-roller --format json --indent 0
```

**Examples:**

**2 spaces:**
```json
{
  "repository": "my-project",
  "files": [
    {
      "path": "src/index.ts"
    }
  ]
}
```

**4 spaces:**
```json
{
    "repository": "my-project",
    "files": [
        {
            "path": "src/index.ts"
        }
    ]
}
```

**Use cases:**
- Match coding standards
- YAML files (2 or 4 spaces)
- Makefiles (tabs)
- Custom formatting

## Output Sections

Control which sections appear in output.

### Combining Options

```bash
# Minimal output (code only)
repo-roller --no-tree --no-stats

# LLM-optimized
repo-roller --strip-comments --no-stats

# Documentation-ready
repo-roller --format md --toc --front-matter

# Token-efficient
repo-roller --strip-comments --no-tree --no-stats --compact
```

## Examples

### Example 1: LLM-Optimized Output

```bash
repo-roller \
  --strip-comments \
  --no-stats \
  --sort size \
  --format md
```

**Result:** Clean markdown with comments stripped, no stats, largest files first.

### Example 2: Documentation Bundle

```bash
repo-roller \
  --format md \
  --toc \
  --front-matter \
  --sort path
```

**Result:** Well-structured markdown with TOC and metadata.

### Example 3: Minimal JSON

```bash
repo-roller \
  --format json \
  --no-tree \
  --no-stats \
  --compact
```

**Result:** Compact JSON with just file contents.

### Example 4: Token-Optimized

```bash
repo-roller \
  --strip-comments \
  --no-tree \
  --no-stats \
  --format txt
```

**Result:** Plain text, minimum overhead, maximum token efficiency.

### Example 5: Review-Friendly

```bash
repo-roller \
  --format md \
  --toc \
  --sort size \
  --no-stats
```

**Result:** Markdown with TOC, sorted by size, no statistics.

## Best Practices

### For LLM Context

```bash
# Maximize useful code, minimize metadata
repo-roller --strip-comments --no-stats
```

### For Documentation

```bash
# Rich metadata, navigation
repo-roller --format md --toc --front-matter
```

### For Token Budget

```bash
# Every token counts
repo-roller --strip-comments --no-tree --no-stats --compact
```

### For Code Review

```bash
# Keep comments, show structure
repo-roller --format md --toc --sort size
```

## Token Impact

Understanding token overhead:

```bash
# Full output
Base content: 40,000 tokens
Comments: 2,500 tokens
Tree: 300 tokens
Stats: 150 tokens
Formatting: 500 tokens
Total: 43,450 tokens

# Optimized output
Base content: 40,000 tokens
Comments: 0 (stripped)
Tree: 0 (disabled)
Stats: 0 (disabled)
Formatting: 100 tokens (compact)
Total: 40,100 tokens

Saved: 3,350 tokens (7.7%)
```

## Related Options

- [Output Options](/cli/output-options) - File paths and formats
- [Display Control](/cli/display-control) - Terminal output control
- [Token Management](/cli/token-management) - Budget optimization
- [File Selection](/cli/file-selection) - Filter files
