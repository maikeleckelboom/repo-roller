# File Scanning API

The scanning API discovers and filters files in your repository with support for gitignore rules, binary detection, and flexible filtering options.

## Quick Start

```typescript
import { scanFiles } from 'repo-roller'
import type { ResolvedOptions, ScanResult } from 'repo-roller'

// Basic scanning
const options: ResolvedOptions = {
  root: '/path/to/repo',
  include: ['src/**/*.ts'],
  exclude: ['**/*.test.ts'],
  extensions: ['ts', 'tsx'],
  maxFileSizeBytes: 1024 * 1024, // 1MB
  // ... other required options
}

const result = await scanFiles(options)
console.log(`Found ${result.files.length} files`)
```

## Core Function

### scanFiles()

Scans files in a directory respecting gitignore rules and filter criteria.

**Signature:**

```typescript
function scanFiles(options: ResolvedOptions): Promise<ScanResult>
```

**Parameters:**

- `options` - Fully resolved configuration options containing:
  - `root` - Root directory to scan
  - `include` - Glob patterns for files to include (default: `['**/*']`)
  - `exclude` - Glob patterns for files to exclude
  - `extensions` - File extensions to filter (without dots)
  - `maxFileSizeBytes` - Maximum file size limit
  - `sort` - Sort mode: `'path'`, `'size'`, or `'extension'`
  - `interactive` - Whether to include all files for interactive selection
  - `gitDiff` - Git diff filter (e.g., `'HEAD'`, `'main..HEAD'`)
  - `gitMostRecent` - Number of most recently modified files to include

**Returns:**

Promise resolving to a `ScanResult` object:

```typescript
interface ScanResult {
  readonly files: readonly FileInfo[]
  readonly totalBytes: number
  readonly rootPath: string
  readonly extensionCounts: Record<string, number>
}
```

**Example:**

```typescript
import { scanFiles, resolveOptions } from 'repo-roller'

const options = resolveOptions({
  root: './my-project',
  include: ['src/**/*.ts', 'lib/**/*.ts'],
  exclude: ['**/*.spec.ts'],
  ext: 'ts,tsx',
  maxSize: 500 // 500KB
})

const result = await scanFiles(options)

// Access scanned files
for (const file of result.files) {
  console.log(`${file.relativePath} - ${file.sizeBytes} bytes`)
}

// Check extension distribution
console.log('Extension counts:', result.extensionCounts)
// Output: { ts: 45, tsx: 12 }
```

## Type Definitions

### FileInfo

Information about a discovered file.

```typescript
interface FileInfo {
  readonly absolutePath: string      // Full filesystem path
  readonly relativePath: string      // Path relative to root
  readonly sizeBytes: number         // File size in bytes
  readonly extension: string         // File extension (without dot)
  readonly isBinary: boolean         // Whether file is binary
  readonly isDefaultIncluded: boolean // Pre-selected in interactive mode
}
```

### ScanResult

Result of the scanning operation.

```typescript
interface ScanResult {
  readonly files: readonly FileInfo[]              // Discovered files
  readonly totalBytes: number                      // Total size of all files
  readonly rootPath: string                        // Root directory scanned
  readonly extensionCounts: Record<string, number> // Files per extension
}
```

## File Filtering

### Glob Patterns

The scanner uses [minimatch](https://github.com/isaacs/minimatch) glob patterns:

```typescript
// Include TypeScript files in src
include: ['src/**/*.ts', 'src/**/*.tsx']

// Exclude test files
exclude: ['**/*.test.ts', '**/__tests__/**']

// Complex patterns
include: ['{src,lib}/**/*.{ts,tsx}']
exclude: ['**/node_modules/**', '**/dist/**']
```

### Extension Filtering

Filter by file extension (without dots):

```typescript
const options = resolveOptions({
  root: '.',
  extensions: ['ts', 'tsx', 'js', 'jsx']
})

const result = await scanFiles(options)
// Only includes .ts, .tsx, .js, .jsx files
```

### Size Filtering

Limit individual file sizes:

```typescript
const options = resolveOptions({
  root: '.',
  maxFileSizeBytes: 500 * 1024 // 500KB max per file
})

const result = await scanFiles(options)
// Files larger than 500KB are excluded
```

## Binary Detection

The scanner automatically detects binary files by sampling the first 8KB:

```typescript
const result = await scanFiles(options)

const textFiles = result.files.filter(f => !f.isBinary)
const binaryFiles = result.files.filter(f => f.isBinary)

console.log(`Text files: ${textFiles.length}`)
console.log(`Binary files: ${binaryFiles.length}`)
```

**Detection algorithm:**

- Samples first 8KB of file content
- Checks for null bytes and non-text characters
- Files with null bytes or >30% non-text characters are marked binary
- Binary files are automatically excluded from output

## Gitignore Support

The scanner respects `.gitignore` rules and includes default exclusions:

**Default exclusions:**

```typescript
const DEFAULT_IGNORE_PATTERNS = [
  '.git',
  'node_modules',
  'package-lock.json',
  'yarn.lock',
  'dist',
  'build',
  '.cache',
  'coverage',
  '.env',
  '*.log',
  // ... and more
]
```

**Custom gitignore:**

Place a `.gitignore` file in your repository root:

```gitignore
# Custom exclusions
*.secret
temp/
private/
```

These patterns are automatically loaded and applied during scanning.

## Git-Aware Filtering

### Changed Files Only

Scan only files modified in a git diff:

```typescript
const options = resolveOptions({
  root: '.',
  gitDiff: 'HEAD' // Uncommitted changes
})

const result = await scanFiles(options)
// Only includes files with uncommitted changes
```

**Git diff options:**

```typescript
gitDiff: 'HEAD'           // Uncommitted changes
gitDiff: 'main'           // Changes vs main branch
gitDiff: 'main..HEAD'     // Changes between main and HEAD
gitDiff: 'abc123'         // Changes vs specific commit
```

### Most Recent Files

Scan only recently modified files:

```typescript
const options = resolveOptions({
  root: '.',
  gitMostRecent: 10 // 10 most recently modified files
})

const result = await scanFiles(options)
// Only includes the 10 most recently committed files
```

## Sorting Files

Control the order of files in the result:

```typescript
// Sort by path (alphabetically)
const byPath = await scanFiles({ ...options, sort: 'path' })

// Sort by size (largest first)
const bySize = await scanFiles({ ...options, sort: 'size' })

// Sort by extension
const byExt = await scanFiles({ ...options, sort: 'extension' })
```

### Profile-Based Layouts

Use profiles from `.reporoller.yml` to define custom file ordering:

```yaml
# .reporoller.yml
profiles:
  documentation-first:
    layout:
      - "README.md"
      - "docs/**/*.md"
      - "src/**/*.ts"
      - "**/*"
```

```typescript
const options = resolveOptions({
  root: '.',
  profile: 'documentation-first'
})

const result = await scanFiles(options)
// Files are ordered according to the profile layout
```

## Interactive Mode

In interactive mode, all files are discovered (not filtered), allowing manual selection:

```typescript
const options = resolveOptions({
  root: '.',
  interactive: true,
  include: ['src/**/*.ts'],
  exclude: ['**/*.test.ts']
})

const result = await scanFiles(options)

// All files are included, but filtered files are marked
for (const file of result.files) {
  if (file.isDefaultIncluded) {
    console.log(`✓ ${file.relativePath}`) // Would be included by default
  } else {
    console.log(`  ${file.relativePath}`) // Filtered out by default
  }
}
```

## Performance Notes

The scanner is optimized for large repositories:

- Uses [fast-glob](https://github.com/mrmlnc/fast-glob) for efficient pattern matching
- Filters early to avoid unnecessary processing
- Does not load file contents during scan (only metadata)
- Handles repositories with 10,000+ files efficiently

**Performance tips:**

```typescript
// Good: Specific patterns reduce search space
include: ['src/**/*.ts']

// Avoid: Overly broad patterns
include: ['**/*']

// Good: Early exclusion of large directories
exclude: ['**/node_modules/**', '**/dist/**']
```

## Error Handling

```typescript
import { scanFiles, resolveOptions } from 'repo-roller'

try {
  const options = resolveOptions({ root: '/nonexistent/path' })
  const result = await scanFiles(options)
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Directory not found')
  } else if (error.code === 'EACCES') {
    console.error('Permission denied')
  } else {
    console.error('Scan error:', error.message)
  }
}
```

## Integration Examples

### Filter by Language

```typescript
import { scanFiles, resolveOptions } from 'repo-roller'

async function scanTypeScriptFiles(root: string) {
  const options = resolveOptions({
    root,
    lang: 'typescript' // Shorthand for ts,tsx extensions
  })

  return await scanFiles(options)
}
```

### Scan Only Changed Files

```typescript
async function scanChangedFiles(root: string) {
  const options = resolveOptions({
    root,
    gitDiff: 'HEAD' // Only uncommitted changes
  })

  const result = await scanFiles(options)
  console.log(`${result.files.length} files changed`)

  return result
}
```

### Custom File Filter

```typescript
async function scanLargeTypeScriptFiles(root: string) {
  const options = resolveOptions({
    root,
    extensions: ['ts', 'tsx'],
    maxFileSizeBytes: Infinity // No size limit
  })

  const result = await scanFiles(options)

  // Filter for files larger than 100KB
  const largeFiles = result.files.filter(f => f.sizeBytes > 100 * 1024)

  return {
    ...result,
    files: largeFiles
  }
}
```

### Analyze File Distribution

```typescript
async function analyzeRepository(root: string) {
  const options = resolveOptions({ root, include: ['**/*'] })
  const result = await scanFiles(options)

  // Group files by extension
  const byExtension = new Map<string, FileInfo[]>()
  for (const file of result.files) {
    if (!byExtension.has(file.extension)) {
      byExtension.set(file.extension, [])
    }
    byExtension.get(file.extension)!.push(file)
  }

  // Print distribution
  for (const [ext, files] of byExtension) {
    const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0)
    console.log(`${ext}: ${files.length} files, ${totalSize} bytes`)
  }
}
```

## Related APIs

- [Configuration API](/api/configuration) - Configure scanning options
- [Rendering API](/api/rendering) - Render scanned files to output
- [Validation API](/api/validation) - Validate scan options
- [Types API](/api/types) - TypeScript type definitions

## See Also

- [File Selection Guide](/guide/file-scanning)
- [Git Integration](/guide/git-integration)
- [Configuration Guide](/guide/configuration)
