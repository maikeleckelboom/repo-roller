# Output Formats

repo-roller supports multiple output formats optimized for different use cases. Choose the format that best suits your workflow.

## Supported Formats

| Format | Best For | Extension |
|--------|----------|-----------|
| **Markdown** | Human reading, LLM context | `.md` |
| **JSON** | Programmatic processing | `.json` |
| **YAML** | Configuration, human-friendly data | `.yaml` |
| **Plain Text** | Simple concatenation | `.txt` |

## Markdown Format

The default format, optimized for readability and LLM consumption.

### Basic Usage

```bash
# Default (markdown)
repo-roller

# Explicit
repo-roller --format md
repo-roller -o output.md
```

### Structure

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

### Options

```bash
# Include table of contents
repo-roller --format md --toc

# Add YAML front matter
repo-roller --format md --front-matter

# Include directory tree (default: true)
repo-roller --format md --tree

# Include statistics (default: true)
repo-roller --format md --stats

# Disable tree and stats
repo-roller --format md --no-tree --no-stats
```

### Language Detection

Markdown output includes automatic syntax highlighting:

| Extension | Language |
|-----------|----------|
| `.ts`, `.tsx` | `typescript` |
| `.js`, `.jsx` | `javascript` |
| `.py` | `python` |
| `.go` | `go` |
| `.rs` | `rust` |
| `.java` | `java` |
| `.c`, `.cpp` | `cpp` |
| `.rb` | `ruby` |
| `.php` | `php` |
| `.sh`, `.bash` | `bash` |
| `.sql` | `sql` |
| `.yaml`, `.yml` | `yaml` |
| `.json` | `json` |
| `.md` | `markdown` |

## JSON Format

Structured data format for programmatic use.

### Basic Usage

```bash
# JSON format
repo-roller --format json -o bundle.json

# Compact (minified)
repo-roller --format json --compact

# Pretty-printed (default)
repo-roller --format json
```

### Structure

```json
{
  "metadata": {
    "repository": "my-project",
    "generatedAt": "2024-01-15T10:30:00Z",
    "totalFiles": 42,
    "totalBytes": 160435,
    "estimatedTokens": 45234,
    "estimatedCost": {
      "provider": "claude-3.5-sonnet",
      "inputCost": 0.68,
      "currency": "USD"
    }
  },
  "tree": {
    "name": "src",
    "type": "directory",
    "children": [
      {
        "name": "core",
        "type": "directory",
        "children": [
          {
            "name": "index.ts",
            "type": "file",
            "sizeBytes": 1234
          }
        ]
      }
    ]
  },
  "files": [
    {
      "path": "src/core/index.ts",
      "relativePath": "src/core/index.ts",
      "content": "export * from './types';",
      "language": "typescript",
      "extension": "ts",
      "sizeBytes": 1234,
      "estimatedTokens": 350,
      "linesOfCode": 45
    }
  ],
  "statistics": {
    "byLanguage": {
      "TypeScript": {
        "fileCount": 38,
        "totalBytes": 145234,
        "estimatedTokens": 42000
      }
    },
    "byRole": {
      "code": 35,
      "test": 3,
      "config": 4
    }
  }
}
```

### Options

```bash
# Compact JSON (no whitespace)
repo-roller --format json --compact

# Custom indentation
repo-roller --format json --indent 4

# Include/exclude sections
repo-roller --format json --no-tree --no-stats
```

### Use Cases

**1. Process with jq:**
```bash
repo-roller --format json | jq '.files[] | select(.language == "typescript") | .path'
```

**2. Parse in Node.js:**
```javascript
import { readFile } from 'fs/promises';

const bundle = JSON.parse(await readFile('bundle.json', 'utf-8'));
console.log(`Total tokens: ${bundle.metadata.estimatedTokens}`);
```

**3. Filter by language:**
```bash
repo-roller --format json | jq '.files[] | select(.language == "typescript")'
```

## YAML Format

Human-friendly structured format, similar to JSON but more readable.

### Basic Usage

```bash
# YAML format
repo-roller --format yaml -o bundle.yaml
```

### Structure

```yaml
metadata:
  repository: my-project
  generatedAt: 2024-01-15T10:30:00Z
  totalFiles: 42
  totalBytes: 160435
  estimatedTokens: 45234
  estimatedCost:
    provider: claude-3.5-sonnet
    inputCost: 0.68
    currency: USD

files:
  - path: src/core/index.ts
    relativePath: src/core/index.ts
    content: |
      export * from './types';
      export { processFiles } from './processor';
    language: typescript
    extension: ts
    sizeBytes: 1234
    estimatedTokens: 350

statistics:
  byLanguage:
    TypeScript:
      fileCount: 38
      totalBytes: 145234
      estimatedTokens: 42000
```

### Use Cases

**1. Configuration analysis:**
```bash
repo-roller --format yaml --include "**/*.config.*"
```

**2. Parse with yq:**
```bash
repo-roller --format yaml | yq '.files[] | .path'
```

## Plain Text Format

Simple concatenation of files with separators.

### Basic Usage

```bash
# Plain text format
repo-roller --format txt -o bundle.txt
```

### Structure

```text
=== Repository: my-project ===
Total Files: 42
Total Size: 156.7 KB

=== src/core/index.ts ===
export * from './types';
export { processFiles } from './processor';

=== src/core/types.ts ===
export interface Config {
  input: string;
  output: string;
}

=== END ===
```

### Options

```bash
# No separators
repo-roller --format txt --no-separators

# Custom separator
repo-roller --format txt --separator "---"
```

### Use Cases

**1. Quick grep:**
```bash
repo-roller --format txt | grep "export"
```

**2. Word count:**
```bash
repo-roller --format txt | wc -l
```

## Format Comparison

| Feature | Markdown | JSON | YAML | Plain Text |
|---------|----------|------|------|------------|
| **Syntax Highlighting** | ✓ | ✗ | ✗ | ✗ |
| **Directory Tree** | ✓ | ✓ | ✓ | ✗ |
| **Statistics** | ✓ | ✓ | ✓ | Basic |
| **Programmatic** | ✗ | ✓ | ✓ | ✗ |
| **Human Readable** | ✓ | ✗ | ✓ | ✓ |
| **LLM Optimized** | ✓ | ✗ | ✗ | ✗ |
| **File Size** | Medium | Large | Medium | Small |
| **Parse Speed** | N/A | Fast | Medium | N/A |

## Customization

### Headers and Footers

Add custom text to the beginning or end:

```yaml
# .reporoller.yml
presets:
  custom:
    header: |
      # My Project
      This is a custom header with project context.
    footer: |
      ---
      Generated by repo-roller
```

Use the preset:

```bash
repo-roller --preset custom
```

### Content Options

Control what appears in the output:

```bash
# Strip code comments
repo-roller --strip-comments

# Include only specific sections
repo-roller --no-tree --stats

# Minimal output
repo-roller --no-tree --no-stats --compact
```

### File Metadata

Include additional metadata:

```bash
# Include token estimates per file (JSON/YAML only)
repo-roller --format json --token-count

# Include git information
repo-roller --format json --git-info
```

## Output Templates

Use filename templates:

```bash
# Template with repo name and date
repo-roller --out-template "{repo}-{date}.md"

# Template with preset name
repo-roller --out-template "{repo}-{preset}-{timestamp}.json"
```

**Available placeholders:**
- `{repo}` - Repository name
- `{date}` - Current date (YYYY-MM-DD)
- `{timestamp}` - Unix timestamp
- `{preset}` - Preset name (if used)
- `{profile}` - Profile name (if used)

## Best Practices

### For LLMs (Claude, GPT, Gemini)

```bash
# Recommended: Markdown with tree and stats
repo-roller --format md --tree --stats --target claude-3.5-sonnet
```

### For Documentation

```bash
# Markdown with table of contents
repo-roller --format md --toc --front-matter
```

### For CI/CD Pipelines

```bash
# JSON for parsing and artifact storage
repo-roller --format json --compact --no-tree
```

### For Analysis Tools

```bash
# YAML for human review and tool parsing
repo-roller --format yaml --stats --git-info
```

### For Quick Review

```bash
# Plain text for quick grep and search
repo-roller --format txt
```

## Examples

### Example 1: LLM-Ready Markdown

```bash
repo-roller \
  --preset ts \
  --format md \
  --tree \
  --stats \
  --max-tokens 100000 \
  --target claude-3.5-sonnet \
  -o for-claude.md
```

### Example 2: JSON for Processing

```bash
repo-roller \
  --format json \
  --compact \
  --no-tree \
  -o bundle.json
```

### Example 3: YAML Configuration Bundle

```bash
repo-roller \
  --include "**/*.config.*" \
  --include "**/*.yaml" \
  --include "**/*.yml" \
  --format yaml \
  -o configs.yaml
```

### Example 4: Documentation in Plain Text

```bash
repo-roller \
  --include "**/*.md" \
  --format txt \
  -o docs.txt
```

## Next Steps

- **[Token Estimation](/guide/token-estimation)** - Estimate tokens and costs
- **[Budget Management](/guide/budget-management)** - Stay within limits
- **[Configuration](/guide/configuration)** - Customize output
- **[Presets](/guide/presets)** - Pre-configured formats

## Related

- [Output Options CLI Reference](/cli/output-options)
- [Examples](/guide/examples)
