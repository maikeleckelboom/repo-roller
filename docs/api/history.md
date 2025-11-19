# History API

The history API tracks and manages bundle generation history with support for querying, tagging, diffing, and replaying past executions.

## Quick Start

```typescript
import { recordHistoryEntry, loadHistory, queryHistory } from 'repo-roller'

// Record a new entry
await recordHistoryEntry({
  resolvedOptions,
  cliArgs: process.argv.slice(2),
  selectedFiles,
  estimatedTokens,
  estimatedCost,
  duration: 1500 // ms
})

// Load all history
const history = await loadHistory()
console.log(`Total runs: ${history.entries.length}`)

// Query recent entries
const recent = await queryHistory({ limit: 10 })
for (const entry of recent) {
  console.log(`${entry.timestamp}: ${entry.result.fileCount} files`)
}
```

## Core Functions

### recordHistoryEntry()

Record a new history entry after successful bundle generation.

**Signature:**

```typescript
function recordHistoryEntry(params: {
  resolvedOptions: ResolvedOptions
  cliArgs: readonly string[]
  selectedFiles: readonly FileInfo[]
  estimatedTokens: number
  estimatedCost?: number
  duration: number
}): Promise<HistoryEntry>
```

**Parameters:**

- `resolvedOptions` - Final resolved options used
- `cliArgs` - Original CLI arguments
- `selectedFiles` - Files that were included
- `estimatedTokens` - Estimated token count
- `estimatedCost` - Estimated cost (optional)
- `duration` - Execution time in milliseconds

**Returns:**

Promise resolving to the created `HistoryEntry`.

**Example:**

```typescript
import { recordHistoryEntry } from 'repo-roller'

const startTime = Date.now()

// ... perform bundle generation ...

const entry = await recordHistoryEntry({
  resolvedOptions,
  cliArgs: process.argv.slice(2),
  selectedFiles: result.files,
  estimatedTokens: 50000,
  estimatedCost: 0.15,
  duration: Date.now() - startTime
})

console.log(`Recorded entry: ${entry.id}`)
```

### loadHistory()

Load all history entries from disk.

**Signature:**

```typescript
function loadHistory(): Promise<HistoryStore>
```

**Returns:**

Promise resolving to history store containing all entries.

**Example:**

```typescript
import { loadHistory } from 'repo-roller'

const history = await loadHistory()

console.log(`Version: ${history.version}`)
console.log(`Total entries: ${history.entries.length}`)

// Access entries
for (const entry of history.entries) {
  console.log(`${entry.id}: ${entry.project.name}`)
}
```

### queryHistory()

Query history entries with filters and pagination.

**Signature:**

```typescript
function queryHistory(options?: HistoryQueryOptions): Promise<readonly HistoryEntry[]>
```

**Parameters:**

- `options` - Optional query filters and pagination

**Query options:**

```typescript
interface HistoryQueryOptions {
  readonly project?: string      // Filter by project name (partial match)
  readonly branch?: string       // Filter by git branch
  readonly preset?: string       // Filter by preset used
  readonly tag?: string          // Filter by tag
  readonly since?: Date          // Filter entries after this date
  readonly limit?: number        // Max entries to return (default: 20)
  readonly offset?: number       // Skip first N entries (default: 0)
}
```

**Returns:**

Promise resolving to matching history entries (sorted by timestamp, newest first).

**Example:**

```typescript
import { queryHistory } from 'repo-roller'

// Get recent 10 entries
const recent = await queryHistory({ limit: 10 })

// Get entries for specific project
const projectEntries = await queryHistory({
  project: 'my-app',
  limit: 20
})

// Get entries from specific branch
const branchEntries = await queryHistory({
  branch: 'feature/new-api'
})

// Get entries with specific tag
const tagged = await queryHistory({
  tag: 'review'
})

// Get entries since date
const sinceLast Week = await queryHistory({
  since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
})

// Paginate through entries
const page1 = await queryHistory({ limit: 10, offset: 0 })
const page2 = await queryHistory({ limit: 10, offset: 10 })
```

### getHistoryEntry()

Get a specific history entry by ID or index.

**Signature:**

```typescript
function getHistoryEntry(idOrIndex: string | number): Promise<HistoryEntry | undefined>
```

**Parameters:**

- `idOrIndex` - Entry ID (full or partial) or numeric index (supports negative indexing)

**Returns:**

Promise resolving to entry or `undefined` if not found.

**Example:**

```typescript
import { getHistoryEntry } from 'repo-roller'

// Get by full ID
const entry1 = await getHistoryEntry('abc123-def456-...')

// Get by partial ID (first match)
const entry2 = await getHistoryEntry('abc123')

// Get by index
const entry3 = await getHistoryEntry(0)  // First entry

// Get by negative index (Python-style)
const latest = await getHistoryEntry(-1) // Last entry
const secondLast = await getHistoryEntry(-2)

if (latest) {
  console.log(`Latest: ${latest.timestamp}`)
}
```

### tagHistoryEntry()

Add tags to a history entry.

**Signature:**

```typescript
function tagHistoryEntry(
  idOrIndex: string | number,
  tags: readonly string[]
): Promise<void>
```

**Parameters:**

- `idOrIndex` - Entry ID or index
- `tags` - Tags to add

**Example:**

```typescript
import { tagHistoryEntry } from 'repo-roller'

// Tag latest entry
await tagHistoryEntry(-1, ['review', 'important'])

// Tag by ID
await tagHistoryEntry('abc123', ['production', 'release-1.0'])
```

### annotateHistoryEntry()

Add notes to a history entry.

**Signature:**

```typescript
function annotateHistoryEntry(
  idOrIndex: string | number,
  notes: string
): Promise<void>
```

**Example:**

```typescript
import { annotateHistoryEntry } from 'repo-roller'

await annotateHistoryEntry(-1, 'Generated for code review with senior team')
```

### diffHistory()

Compare two history entries.

**Signature:**

```typescript
function diffHistory(
  id1: string | number,
  id2: string | number
): Promise<HistoryDiff>
```

**Returns:**

Promise resolving to diff result.

**Example:**

```typescript
import { diffHistory } from 'repo-roller'

// Compare last two entries
const diff = await diffHistory(-2, -1)

console.log('Files added:', diff.filesDiff.added.length)
console.log('Files removed:', diff.filesDiff.removed.length)
console.log('Files unchanged:', diff.filesDiff.unchanged.length)

console.log('Token diff:', diff.metricsDiff.estimatedTokens)
console.log('Cost diff:', diff.metricsDiff.estimatedCost)
console.log('Duration diff:', diff.metricsDiff.duration, 'ms')
```

### clearHistory()

Delete history entries.

**Signature:**

```typescript
function clearHistory(options: {
  all?: boolean
  beforeDate?: Date
  id?: string
}): Promise<number>
```

**Parameters:**

- `all` - Clear all history
- `beforeDate` - Clear entries before date
- `id` - Clear specific entry by ID

**Returns:**

Promise resolving to number of entries deleted.

**Example:**

```typescript
import { clearHistory } from 'repo-roller'

// Clear all history
const deleted1 = await clearHistory({ all: true })
console.log(`Deleted ${deleted1} entries`)

// Clear old entries
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
const deleted2 = await clearHistory({ beforeDate: thirtyDaysAgo })
console.log(`Deleted ${deleted2} old entries`)

// Clear specific entry
const deleted3 = await clearHistory({ id: 'abc123' })
```

### getHistoryStats()

Get summary statistics from history.

**Signature:**

```typescript
function getHistoryStats(): Promise<HistoryStats>
```

**Returns:**

Promise resolving to statistics object.

**Example:**

```typescript
import { getHistoryStats } from 'repo-roller'

const stats = await getHistoryStats()

console.log(`Total runs: ${stats.totalRuns}`)
console.log(`Unique projects: ${stats.uniqueProjects}`)
console.log(`Total tokens: ${stats.totalTokensGenerated.toLocaleString()}`)
console.log(`Total cost: $${stats.totalCostIncurred.toFixed(2)}`)
console.log(`Avg files/run: ${stats.averageFilesPerRun}`)
console.log(`Most used preset: ${stats.mostUsedPreset}`)
console.log(`Most active project: ${stats.mostActiveProject}`)

console.log(`Activity:`)
console.log(`  Last 24h: ${stats.recentActivity.last24h} runs`)
console.log(`  Last 7d: ${stats.recentActivity.last7d} runs`)
console.log(`  Last 30d: ${stats.recentActivity.last30d} runs`)
```

### exportHistory()

Export history in various formats.

**Signature:**

```typescript
function exportHistory(format: 'json' | 'yaml' | 'csv'): Promise<string>
```

**Example:**

```typescript
import { exportHistory } from 'repo-roller'
import { writeFile } from 'fs/promises'

// Export as JSON
const json = await exportHistory('json')
await writeFile('history.json', json)

// Export as CSV
const csv = await exportHistory('csv')
await writeFile('history.csv', csv)

// Export as YAML
const yaml = await exportHistory('yaml')
await writeFile('history.yaml', yaml)
```

### entryToCliArgs()

Convert history entry to CLI arguments for replay.

**Signature:**

```typescript
function entryToCliArgs(entry: HistoryEntry): readonly string[]
```

**Example:**

```typescript
import { getHistoryEntry, entryToCliArgs } from 'repo-roller'
import { spawn } from 'child_process'

const entry = await getHistoryEntry(-1)
if (entry) {
  const args = entryToCliArgs(entry)
  console.log('Replay command:', 'repo-roller', args.join(' '))

  // Actually replay
  spawn('repo-roller', args, { stdio: 'inherit' })
}
```

## Type Definitions

### HistoryEntry

A single history entry.

```typescript
interface HistoryEntry {
  readonly id: string                    // UUID
  readonly timestamp: string             // ISO 8601
  readonly project: {
    readonly name: string                // Project name
    readonly path: string                // Full path
    readonly gitBranch?: string          // Git branch
    readonly gitCommit?: string          // Git commit hash
  }
  readonly command: {
    readonly args: readonly string[]     // CLI arguments
    readonly preset?: string             // Preset used
    readonly profile: string             // Profile used
    readonly model?: string              // Model preset
  }
  readonly result: {
    readonly fileCount: number           // Number of files
    readonly totalBytes: number          // Total size
    readonly estimatedTokens: number     // Estimated tokens
    readonly estimatedCost?: number      // Estimated cost (USD)
    readonly outputFile: string          // Output filename
    readonly format: string              // Output format
    readonly duration: number            // Execution time (ms)
  }
  readonly files: {
    readonly included: readonly string[] // Included file paths
    readonly excluded: readonly string[] // Top exclusion patterns
  }
  readonly tags?: readonly string[]      // User tags
  readonly notes?: string                // User notes
}
```

### HistoryStore

History storage format.

```typescript
interface HistoryStore {
  version: number          // Format version
  entries: HistoryEntry[]  // All entries
}
```

### HistoryDiff

Diff between two history entries.

```typescript
interface HistoryDiff {
  readonly entry1: HistoryEntry
  readonly entry2: HistoryEntry
  readonly filesDiff: {
    readonly added: readonly string[]     // Files in entry2 only
    readonly removed: readonly string[]   // Files in entry1 only
    readonly unchanged: readonly string[] // Files in both
  }
  readonly metricsDiff: {
    readonly fileCount: number            // entry2 - entry1
    readonly totalBytes: number
    readonly estimatedTokens: number
    readonly estimatedCost?: number
    readonly duration: number
  }
}
```

### HistoryStats

Summary statistics.

```typescript
interface HistoryStats {
  readonly totalRuns: number
  readonly uniqueProjects: number
  readonly totalTokensGenerated: number
  readonly totalCostIncurred: number
  readonly averageFilesPerRun: number
  readonly mostUsedPreset?: string
  readonly mostActiveProject?: string
  readonly recentActivity: {
    readonly last24h: number
    readonly last7d: number
    readonly last30d: number
  }
}
```

## Storage Location

History is stored in:

```
~/.config/repo-roller/history.json
```

**Format:**

```json
{
  "version": 1,
  "entries": [
    {
      "id": "abc123-def456-...",
      "timestamp": "2025-11-19T10:30:00.000Z",
      "project": {
        "name": "my-app",
        "path": "/home/user/my-app",
        "gitBranch": "main",
        "gitCommit": "abc1234"
      },
      "command": {
        "args": [".", "--preset", "typescript"],
        "preset": "typescript",
        "profile": "llm-context"
      },
      "result": {
        "fileCount": 25,
        "totalBytes": 145000,
        "estimatedTokens": 50000,
        "estimatedCost": 0.15,
        "outputFile": "my-app-2025-11-19.md",
        "format": "md",
        "duration": 1500
      },
      "files": {
        "included": ["src/index.ts", "src/app.ts", ...],
        "excluded": ["**/*.test.ts", "dist/**"]
      },
      "tags": ["review"],
      "notes": "Generated for code review"
    }
  ]
}
```

**Limits:**

- Maximum 1000 entries (auto-pruned)
- Oldest entries deleted first when limit exceeded

## Integration Examples

### Auto-Record After Generation

```typescript
import { scanFiles, render, estimateTokens, recordHistoryEntry } from 'repo-roller'

async function generateWithHistory(options: ResolvedOptions) {
  const startTime = Date.now()

  const scanResult = await scanFiles(options)
  const output = await render(scanResult, options)
  const tokens = estimateTokens(output)
  const cost = calculateCost(tokens, 'claude-sonnet')

  await recordHistoryEntry({
    resolvedOptions: options,
    cliArgs: process.argv.slice(2),
    selectedFiles: scanResult.files,
    estimatedTokens: tokens,
    estimatedCost: cost?.inputCost,
    duration: Date.now() - startTime
  })

  return output
}
```

### Show Recent History

```typescript
async function showRecentHistory(limit: number = 10) {
  const entries = await queryHistory({ limit })

  console.log('\nRecent bundles:\n')

  for (const entry of entries) {
    const date = new Date(entry.timestamp).toLocaleString()
    const tokens = entry.result.estimatedTokens.toLocaleString()
    const files = entry.result.fileCount

    console.log(`${entry.id.slice(0, 8)} - ${date}`)
    console.log(`  Project: ${entry.project.name}`)
    console.log(`  Files: ${files}, Tokens: ${tokens}`)
    if (entry.project.gitBranch) {
      console.log(`  Branch: ${entry.project.gitBranch}`)
    }
    if (entry.tags) {
      console.log(`  Tags: ${entry.tags.join(', ')}`)
    }
    console.log()
  }
}
```

### Compare Runs

```typescript
async function compareRuns(id1: string | number, id2: string | number) {
  const diff = await diffHistory(id1, id2)

  console.log('Comparison:\n')

  console.log(`Entry 1: ${diff.entry1.timestamp}`)
  console.log(`Entry 2: ${diff.entry2.timestamp}`)
  console.log()

  console.log('File changes:')
  console.log(`  Added: ${diff.filesDiff.added.length}`)
  console.log(`  Removed: ${diff.filesDiff.removed.length}`)
  console.log(`  Unchanged: ${diff.filesDiff.unchanged.length}`)
  console.log()

  console.log('Metric changes:')
  console.log(`  Files: ${diff.metricsDiff.fileCount > 0 ? '+' : ''}${diff.metricsDiff.fileCount}`)
  console.log(`  Tokens: ${diff.metricsDiff.estimatedTokens > 0 ? '+' : ''}${diff.metricsDiff.estimatedTokens}`)
  console.log(`  Duration: ${diff.metricsDiff.duration > 0 ? '+' : ''}${diff.metricsDiff.duration}ms`)

  if (diff.metricsDiff.estimatedCost) {
    const sign = diff.metricsDiff.estimatedCost > 0 ? '+' : ''
    console.log(`  Cost: ${sign}$${diff.metricsDiff.estimatedCost.toFixed(4)}`)
  }
}
```

### Replay Previous Generation

```typescript
async function replay(entryId: string | number) {
  const entry = await getHistoryEntry(entryId)

  if (!entry) {
    throw new Error(`Entry not found: ${entryId}`)
  }

  console.log(`Replaying: ${entry.project.name} (${entry.timestamp})`)

  const args = entryToCliArgs(entry)
  console.log('Command:', 'repo-roller', args.join(' '))

  // Execute replay
  const { spawn } = await import('child_process')
  spawn('repo-roller', args, { stdio: 'inherit' })
}
```

### Tag Management

```typescript
async function tagByPattern(pattern: string, tags: string[]) {
  const allEntries = await queryHistory({ limit: 1000 })

  let tagged = 0

  for (const entry of allEntries) {
    if (entry.project.name.includes(pattern)) {
      await tagHistoryEntry(entry.id, tags)
      tagged++
    }
  }

  console.log(`Tagged ${tagged} entries with: ${tags.join(', ')}`)
}

// Usage
await tagByPattern('my-app', ['production', 'important'])
```

### Analyze Trends

```typescript
async function analyzeTrends() {
  const entries = await queryHistory({ limit: 100 })

  // Group by project
  const byProject = new Map<string, HistoryEntry[]>()
  for (const entry of entries) {
    const name = entry.project.name
    if (!byProject.has(name)) {
      byProject.set(name, [])
    }
    byProject.get(name)!.push(entry)
  }

  // Analyze each project
  for (const [name, projectEntries] of byProject) {
    const avgTokens = projectEntries.reduce(
      (sum, e) => sum + e.result.estimatedTokens,
      0
    ) / projectEntries.length

    const avgDuration = projectEntries.reduce(
      (sum, e) => sum + e.result.duration,
      0
    ) / projectEntries.length

    console.log(`${name}:`)
    console.log(`  Runs: ${projectEntries.length}`)
    console.log(`  Avg tokens: ${Math.round(avgTokens).toLocaleString()}`)
    console.log(`  Avg duration: ${Math.round(avgDuration)}ms`)
    console.log()
  }
}
```

### Export Report

```typescript
async function exportReport(outputFile: string) {
  const stats = await getHistoryStats()
  const recent = await queryHistory({ limit: 20 })

  const report = `# Repo-Roller Usage Report

## Summary

- **Total runs**: ${stats.totalRuns}
- **Unique projects**: ${stats.uniqueProjects}
- **Total tokens generated**: ${stats.totalTokensGenerated.toLocaleString()}
- **Total cost incurred**: $${stats.totalCostIncurred.toFixed(2)}
- **Average files per run**: ${stats.averageFilesPerRun}
- **Most used preset**: ${stats.mostUsedPreset ?? 'N/A'}
- **Most active project**: ${stats.mostActiveProject ?? 'N/A'}

## Recent Activity

- **Last 24 hours**: ${stats.recentActivity.last24h} runs
- **Last 7 days**: ${stats.recentActivity.last7d} runs
- **Last 30 days**: ${stats.recentActivity.last30d} runs

## Recent Runs

${recent.map(entry => `
### ${entry.project.name}

- **Date**: ${new Date(entry.timestamp).toLocaleString()}
- **Files**: ${entry.result.fileCount}
- **Tokens**: ${entry.result.estimatedTokens.toLocaleString()}
- **Duration**: ${entry.result.duration}ms
${entry.project.gitBranch ? `- **Branch**: ${entry.project.gitBranch}` : ''}
${entry.tags ? `- **Tags**: ${entry.tags.join(', ')}` : ''}
`).join('\n')}
`

  await writeFile(outputFile, report)
  console.log(`Report saved to ${outputFile}`)
}
```

## Error Handling

```typescript
import { getHistoryEntry, tagHistoryEntry } from 'repo-roller'

// Entry not found
const entry = await getHistoryEntry('invalid-id')
if (!entry) {
  console.error('Entry not found')
}

// Tag non-existent entry
try {
  await tagHistoryEntry('invalid-id', ['tag'])
} catch (error) {
  console.error(error.message)
  // "History entry not found: invalid-id"
}
```

## Related APIs

- [Types API](/api/types) - TypeScript type definitions
- [Configuration API](/api/configuration) - Configuration options

## See Also

- [History Guide](/guide/history)
- [CLI History Commands](/cli/utility-commands)
