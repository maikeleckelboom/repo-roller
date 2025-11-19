# Rendering API

The rendering API transforms scanned files into various output formats including Markdown, JSON, YAML, and plain text with support for customization and structured metadata.

## Quick Start

```typescript
import { render, scanFiles, resolveOptions } from 'repo-roller'

// Scan and render files
const options = resolveOptions({
  root: './my-project',
  format: 'md'
})

const scanResult = await scanFiles(options)
const output = await render(scanResult, options)

console.log(output)
```

## Core Functions

### render()

Main rendering function that dispatches to format-specific renderers.

**Signature:**

```typescript
function render(
  scan: ScanResult,
  options: ResolvedOptions
): Promise<string>
```

**Parameters:**

- `scan` - Result from `scanFiles()` containing discovered files
- `options` - Resolved configuration options

**Returns:**

Promise resolving to formatted output string ready for writing or display.

**Example:**

```typescript
const scanResult = await scanFiles(options)

// Render as Markdown
const markdown = await render(scanResult, { ...options, format: 'md' })

// Render as JSON
const json = await render(scanResult, { ...options, format: 'json' })

// Render as YAML
const yaml = await render(scanResult, { ...options, format: 'yaml' })

// Render as plain text
const text = await render(scanResult, { ...options, format: 'txt' })
```

### renderMarkdown()

Render files as Markdown with code blocks and syntax highlighting.

**Signature:**

```typescript
function renderMarkdown(
  scan: ScanResult,
  opts: RenderOptions,
  options: ResolvedOptions,
  architecturalOverview?: string
): Promise<string>
```

**Parameters:**

- `scan` - Scan result with files to render
- `opts` - Rendering options (tree, stats, comment stripping)
- `options` - Full resolved options
- `architecturalOverview` - Optional architectural overview text

**Returns:**

Promise resolving to Markdown-formatted string.

**Example:**

```typescript
import { renderMarkdown } from 'repo-roller'

const markdown = await renderMarkdown(
  scanResult,
  {
    withTree: true,
    withStats: true,
    stripComments: false
  },
  options,
  'This is a TypeScript project for...'
)
```

**Output format:**

```markdown
# 📦 Source Code Archive

**Root**: `/path/to/project`
**Files**: 25
**Total size**: 145 KB

---

## 📂 Directory Structure

```
└── 📁 src
    ├── 📄 index.ts
    └── 📁 components
        └── 📄 Button.tsx
```

## 📊 Statistics

- **Total files**: 25
- **Total size**: 145 KB
- **Files by extension**:
  - ts: 15 files
  - tsx: 10 files

## 📄 Files

### `src/index.ts`

```typescript
// File: src/index.ts

export * from './components'
```
```

### renderJson()

Render files as structured JSON.

**Signature:**

```typescript
function renderJson(
  scan: ScanResult,
  options: ResolvedOptions
): Promise<string>
```

**Returns:**

Promise resolving to JSON string with metadata and file contents.

**Example:**

```typescript
import { renderJson } from 'repo-roller'

const json = await renderJson(scanResult, options)
const data = JSON.parse(json)

console.log(data.metadata.fileCount) // 25
console.log(data.files[0].path)      // "src/index.ts"
```

**Output structure:**

```json
{
  "metadata": {
    "sourceRepository": "https://github.com/user/repo",
    "profile": "llm-context",
    "timestamp": "2025-11-19T10:30:00.000Z",
    "fileCount": 25
  },
  "architecturalOverview": "Optional overview text...",
  "files": [
    {
      "path": "src/index.ts",
      "language": "typescript",
      "content": "export * from './components'"
    }
  ]
}
```

### renderYaml()

Render files as YAML.

**Signature:**

```typescript
function renderYaml(
  scan: ScanResult,
  options: ResolvedOptions
): Promise<string>
```

**Returns:**

Promise resolving to YAML-formatted string.

**Example:**

```typescript
import { renderYaml } from 'repo-roller'

const yaml = await renderYaml(scanResult, options)
```

**Output structure:**

```yaml
metadata:
  sourceRepository: https://github.com/user/repo
  profile: llm-context
  timestamp: '2025-11-19T10:30:00.000Z'
  fileCount: 25
files:
  - path: src/index.ts
    language: typescript
    content: |
      export * from './components'
```

### renderTxt()

Render files as plain text with separators.

**Signature:**

```typescript
function renderTxt(
  scan: ScanResult,
  options: ResolvedOptions
): Promise<string>
```

**Returns:**

Promise resolving to plain text string.

**Example:**

```typescript
import { renderTxt } from 'repo-roller'

const text = await renderTxt(scanResult, options)
```

**Output format:**

```
==================================================
File: src/index.ts
==================================================

export * from './components'

==================================================
File: src/components/Button.tsx
==================================================

export const Button = () => <button>Click</button>
```

## Type Definitions

### RenderOptions

Options controlling rendering behavior.

```typescript
interface RenderOptions {
  readonly withTree: boolean      // Include directory tree
  readonly withStats: boolean     // Include statistics section
  readonly stripComments: boolean // Strip comments from code
}
```

### StructuredOutput

Structure for JSON/YAML output.

```typescript
interface StructuredOutput {
  readonly metadata: {
    readonly sourceRepository?: string
    readonly profile: string
    readonly timestamp: string
    readonly fileCount: number
  }
  readonly architecturalOverview?: string
  readonly files: readonly {
    readonly path: string
    readonly language: string
    readonly content: string
  }[]
}
```

## Format-Specific Features

### Markdown

**Tree view:**

```typescript
const output = await render(scanResult, {
  ...options,
  format: 'md',
  withTree: true
})
// Includes directory tree visualization
```

**Statistics:**

```typescript
const output = await render(scanResult, {
  ...options,
  withStats: true
})
// Includes file count, size, extension breakdown
```

**Table of contents:**

```typescript
const output = await render(scanResult, {
  ...options,
  toc: true
})
// Adds clickable TOC at the top
```

**Front matter:**

```typescript
const output = await render(scanResult, {
  ...options,
  frontMatter: true
})
// Adds YAML front matter with metadata
```

### JSON

**Compact mode:**

```typescript
const output = await render(scanResult, {
  ...options,
  format: 'json',
  compact: true
})
// Minified JSON (no whitespace)
```

**Custom indentation:**

```typescript
const output = await render(scanResult, {
  ...options,
  format: 'json',
  indent: 4
})
// 4-space indentation
```

### YAML

**Custom indentation:**

```typescript
const output = await render(scanResult, {
  ...options,
  format: 'yaml',
  indent: 2
})
// 2-space indentation
```

## Comment Stripping

Remove comments to reduce token count:

```typescript
const output = await render(scanResult, {
  ...options,
  stripComments: true
})
```

**Supported languages:**

- JavaScript/TypeScript: `//` and `/* */`
- Python/Ruby/Shell: `#`
- Java/C/C++/Go/Rust: `//` and `/* */`

**Limitations:**

Comment stripping uses regex-based detection and has known limitations:

- Comments in strings are incorrectly removed
- Regular expressions with `//` are affected
- Template literals are not parsed
- Escape sequences are not handled

For production use, consider language-specific parsers (TypeScript compiler API, Babel, etc.).

## Language Mapping

Files are syntax-highlighted based on extension:

```typescript
import { getLanguage } from 'repo-roller'

console.log(getLanguage('ts'))   // 'typescript'
console.log(getLanguage('py'))   // 'python'
console.log(getLanguage('jsx'))  // 'jsx'
console.log(getLanguage('yaml')) // 'yaml'
```

**Supported languages:**

TypeScript, JavaScript, Python, Ruby, Go, Rust, Java, C, C++, C#, PHP, Shell, SQL, GraphQL, Protobuf, Dockerfile, HTML, CSS, SCSS, Markdown, JSON, YAML, TOML, XML

## Preset Headers and Footers

Add context to generated bundles:

```yaml
# .reporoller.yml
presets:
  code-review:
    header: |
      ## Task: Code Review

      Please review the following code for:
      - Code quality and style
      - Potential bugs
      - Performance issues
      - Security vulnerabilities
    footer: |
      ## Guidelines

      - Be constructive and specific
      - Suggest improvements with examples
      - Prioritize issues by severity
    include:
      - "src/**/*.ts"
```

```typescript
const options = resolveOptions({
  root: '.',
  preset: 'code-review'
})

const result = await scanFiles(options)
const output = await render(result, options)
// Output includes header and footer from preset
```

## Error Handling

```typescript
import { render } from 'repo-roller'

try {
  const output = await render(scanResult, options)
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('File not found during rendering')
  } else if (error.code === 'EACCES') {
    console.error('Permission denied reading file')
  } else {
    console.error('Render error:', error.message)
  }
}
```

## Integration Examples

### Save to File

```typescript
import { writeFile } from 'node:fs/promises'
import { render, scanFiles, resolveOptions } from 'repo-roller'

async function generateBundle(root: string, outputPath: string) {
  const options = resolveOptions({ root, format: 'md' })
  const scanResult = await scanFiles(options)
  const output = await render(scanResult, options)

  await writeFile(outputPath, output, 'utf-8')
  console.log(`Bundle saved to ${outputPath}`)
}

await generateBundle('./my-project', 'bundle.md')
```

### Multiple Formats

```typescript
async function exportAllFormats(root: string) {
  const baseOptions = resolveOptions({ root })
  const scanResult = await scanFiles(baseOptions)

  const formats = ['md', 'json', 'yaml', 'txt'] as const
  const outputs: Record<string, string> = {}

  for (const format of formats) {
    const options = { ...baseOptions, format }
    outputs[format] = await render(scanResult, options)
  }

  return outputs
}

const { md, json, yaml, txt } = await exportAllFormats('./my-project')
```

### Stream Large Output

```typescript
import { createWriteStream } from 'node:fs'
import { render } from 'repo-roller'

async function streamOutput(scanResult: ScanResult, options: ResolvedOptions) {
  const output = await render(scanResult, options)
  const stream = createWriteStream('large-bundle.md')

  // Write in chunks to avoid memory issues
  const chunkSize = 64 * 1024 // 64KB chunks
  for (let i = 0; i < output.length; i += chunkSize) {
    stream.write(output.slice(i, i + chunkSize))
  }

  stream.end()
}
```

### Custom Post-Processing

```typescript
async function renderWithCustomProcessing(
  scanResult: ScanResult,
  options: ResolvedOptions
) {
  let output = await render(scanResult, options)

  // Add custom metadata
  output = `<!-- Generated by CI/CD Pipeline -->\n${output}`

  // Remove sensitive patterns
  output = output.replace(/API_KEY=.+/g, 'API_KEY=***')

  // Add footer
  output += '\n\n---\n\n*Generated with repo-roller*'

  return output
}
```

### Parse JSON Output

```typescript
import { renderJson } from 'repo-roller'
import type { StructuredOutput } from 'repo-roller'

async function analyzeJsonOutput(
  scanResult: ScanResult,
  options: ResolvedOptions
) {
  const json = await renderJson(scanResult, options)
  const data: StructuredOutput = JSON.parse(json)

  // Analyze metadata
  console.log(`Repository: ${data.metadata.sourceRepository}`)
  console.log(`Files: ${data.metadata.fileCount}`)
  console.log(`Generated: ${data.metadata.timestamp}`)

  // Process files
  for (const file of data.files) {
    console.log(`${file.path} (${file.language}): ${file.content.length} chars`)
  }
}
```

## Performance Considerations

**Memory usage:**

Large repositories can generate multi-megabyte outputs. Consider:

```typescript
// For large repositories, use streaming or pagination
const options = resolveOptions({
  root: '.',
  maxFileSizeBytes: 100 * 1024 // Limit individual file sizes
})

// Or use budget constraints
const budgetedOptions = resolveOptions({
  root: '.',
  maxTokens: '50k' // Limit total output size
})
```

**Rendering speed:**

- Markdown: ~1-2ms per file
- JSON: ~0.5-1ms per file (faster, no formatting)
- YAML: ~1-2ms per file
- Comment stripping: Adds ~0.5ms per file

## Related APIs

- [Scanning API](/api/scanning) - Discover files to render
- [Token API](/api/tokens) - Estimate output token count
- [Budget API](/api/budget) - Constrain output size
- [Types API](/api/types) - TypeScript type definitions

## See Also

- [Output Formats Guide](/guide/output-formats)
- [Configuration Guide](/guide/configuration)
- [LLM Workflows](/guide/llm-workflows)
