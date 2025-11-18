# Output Options

Control where and how repo-roller generates output files.

## Output File Path

### `-o, --out <file>`

Specify the output file path.

```bash
# Basic usage
repo-roller -o bundle.md

# Absolute path
repo-roller --out /path/to/output.md

# Relative path
repo-roller --out ../bundles/code.md
```

**Default:** `{repo}-{date}.md` (e.g., `my-project-2024-01-15.md`)

**Notes:**
- Directory will be created if it doesn't exist
- Existing files will be overwritten (use `--confirm` to prompt)
- Extension determines default format if `--format` not specified

## Output Template

### `--out-template <template>`

Use a template for the output filename.

```bash
# Date-based template
repo-roller --out-template "{repo}-{date}.md"

# Include time
repo-roller --out-template "{repo}-{datetime}.md"

# Custom prefix
repo-roller --out-template "bundle-{repo}-v{version}.md"
```

**Available placeholders:**

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{repo}` | Repository name | `my-project` |
| `{date}` | Current date (YYYY-MM-DD) | `2024-01-15` |
| `{datetime}` | Date and time | `2024-01-15-103045` |
| `{timestamp}` | Unix timestamp | `1705315845` |
| `{preset}` | Preset name | `typescript` |
| `{profile}` | Profile name | `core-first` |
| `{version}` | Package version | `1.2.3` |
| `{branch}` | Git branch | `main` |
| `{commit}` | Git commit (short) | `abc1234` |

**Example:**
```bash
repo-roller --out-template "review-{branch}-{date}.md"
# Outputs: review-feature-auth-2024-01-15.md
```

## Output Format

### `-f, --format <type>`

Specify the output format.

```bash
# Markdown (default)
repo-roller --format md

# JSON
repo-roller --format json

# YAML
repo-roller --format yaml

# Plain text
repo-roller --format txt
```

**Available formats:**

#### Markdown (`md`)

Human-readable format with syntax highlighting.

**Features:**
- Syntax-highlighted code blocks
- Directory tree visualization
- Statistics tables
- Table of contents (with `--toc`)
- YAML front matter (with `--front-matter`)

**Example output:**
```markdown
# Repository: my-project

## Statistics
- Total Files: 42
- Total Size: 156.7 KB

## Directory Tree
src/
├── core/
│   └── index.ts
└── utils/
    └── helpers.ts

## Files

### src/core/index.ts
\`\`\`typescript
export * from './types';
\`\`\`
```

#### JSON (`json`)

Structured data format for programmatic use.

**Features:**
- Machine-readable structure
- Includes all metadata
- Optional compaction with `--compact`
- Configurable indentation with `--indent`

**Example output:**
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
      "size": 1234,
      "tokens": 345
    }
  ],
  "tree": "src/\n├── core/\n│   └── index.ts"
}
```

#### YAML (`yaml`)

Configuration-friendly format.

**Features:**
- Human-readable structure
- Easy to parse
- Preserves formatting
- Configurable indentation

**Example output:**
```yaml
repository: my-project
generated: 2024-01-15T10:30:00Z
statistics:
  totalFiles: 42
  totalSize: 160435
  estimatedTokens: 45234
files:
  - path: src/core/index.ts
    content: |
      export * from './types';
    language: typescript
    size: 1234
    tokens: 345
```

#### Plain Text (`txt`)

Simple concatenation of files.

**Features:**
- No formatting
- File separators
- Optional headers
- Minimal overhead

**Example output:**
```
=== src/core/index.ts ===
export * from './types';

=== src/utils/helpers.ts ===
export function format() { }
```

## Format-Specific Options

### `--compact`

Minify JSON output (removes whitespace).

```bash
repo-roller --format json --compact
```

**Without `--compact`:**
```json
{
  "repository": "my-project",
  "files": []
}
```

**With `--compact`:**
```json
{"repository":"my-project","files":[]}
```

### `--indent <number>`

Set indentation level for JSON and YAML.

```bash
# 2 spaces (default)
repo-roller --format json --indent 2

# 4 spaces
repo-roller --format json --indent 4

# Tabs
repo-roller --format json --indent 0
```

### `--toc`

Add table of contents to Markdown output.

```bash
repo-roller --format md --toc
```

**Generates:**
```markdown
# Repository: my-project

## Table of Contents
- [Statistics](#statistics)
- [Directory Tree](#directory-tree)
- [Files](#files)
  - [src/core/index.ts](#srccore-indexts)
  - [src/utils/helpers.ts](#srcutils-helpersts)
```

### `--front-matter`

Add YAML front matter to Markdown output.

```bash
repo-roller --format md --front-matter
```

**Generates:**
```markdown
---
repository: my-project
generated: 2024-01-15T10:30:00Z
totalFiles: 42
totalSize: 160435
estimatedTokens: 45234
---

# Repository: my-project
...
```

## Output Confirmation

### `-y, --yes` / `--defaults`

Skip confirmation prompts (auto-accept defaults).

```bash
# Overwrite without prompting
repo-roller -o existing-file.md -y

# Use all defaults
repo-roller --defaults
```

## Copy to Clipboard

### `-c, --copy`

Copy output to clipboard in addition to file.

```bash
# Generate and copy
repo-roller -o bundle.md --copy

# Copy without file (stdout only)
repo-roller --copy -o -
```

**Platform support:**
- macOS: Uses `pbcopy`
- Linux: Uses `xclip` or `xsel`
- Windows: Uses `clip`

## Standard Output

### Output to stdout

Use `-` as the output path:

```bash
# Print to terminal
repo-roller -o -

# Pipe to other commands
repo-roller -o - | less

# Save with shell redirect
repo-roller -o - > bundle.md
```

## Examples

### Example 1: Markdown with TOC

```bash
repo-roller --format md --toc --front-matter -o docs/bundle.md
```

### Example 2: Compact JSON

```bash
repo-roller --format json --compact -o bundle.json
```

### Example 3: Dated Output

```bash
repo-roller --out-template "bundles/{repo}-{date}.md"
```

### Example 4: Copy to Clipboard

```bash
repo-roller --preset ts --copy -o -
```

### Example 5: YAML with Indentation

```bash
repo-roller --format yaml --indent 4 -o config.yml
```

## Best Practices

### For LLM Input

Use Markdown with metadata:
```bash
repo-roller --format md --toc --front-matter --strip-comments
```

### For CI/CD

Use dated filenames:
```bash
repo-roller --out-template "artifacts/{repo}-{datetime}.md" -y
```

### For Programmatic Use

Use JSON:
```bash
repo-roller --format json --compact -o data.json
```

### For Documentation

Use Markdown with tree:
```bash
repo-roller --format md --toc --no-stats
```

## Related Options

- [Content Options](/cli/content-options) - Control what appears in output
- [Display Control](/cli/display-control) - Control terminal output
- [File Selection](/cli/file-selection) - Filter included files
