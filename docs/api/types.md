# Types Reference

Complete TypeScript type definitions for repo-roller. All interfaces use `readonly` to ensure immutability and provide type-safe contracts between modules.

## Installation

```typescript
import type {
  ScanOptions,
  RenderOptions,
  FileInfo,
  ResolvedOptions,
  RollerConfig
} from 'repo-roller'
```

## Core Types

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

**Example:**

```typescript
const file: FileInfo = {
  absolutePath: '/home/user/project/src/index.ts',
  relativePath: 'src/index.ts',
  sizeBytes: 2048,
  extension: 'ts',
  isBinary: false,
  isDefaultIncluded: true
}
```

### ScanResult

Result of file scanning operation.

```typescript
interface ScanResult {
  readonly files: readonly FileInfo[]              // Discovered files
  readonly totalBytes: number                      // Total size of all files
  readonly rootPath: string                        // Root directory scanned
  readonly extensionCounts: Readonly<Record<string, number>> // Files per extension
}
```

**Example:**

```typescript
const result: ScanResult = {
  files: [/* FileInfo objects */],
  totalBytes: 145000,
  rootPath: '/home/user/project',
  extensionCounts: {
    'ts': 45,
    'tsx': 12,
    'md': 5
  }
}
```

### RenderOptions

Options for rendering output.

```typescript
interface RenderOptions {
  readonly withTree: boolean      // Include directory tree
  readonly withStats: boolean     // Include statistics section
  readonly stripComments: boolean // Strip comments from code
}
```

### OutputFormat

Supported output formats.

```typescript
type OutputFormat = 'md' | 'json' | 'yaml' | 'txt'
```

### SortMode

File sorting modes.

```typescript
type SortMode = 'path' | 'size' | 'extension'
```

## Configuration Types

### RollerConfig

Configuration from `repo-roller.config.mjs`.

```typescript
interface RollerConfig {
  readonly root: string
  readonly presets?: Readonly<Record<string, RollerPreset>>
  readonly defaultPreset?: string
}
```

**Example:**

```typescript
const config: RollerConfig = {
  root: '.',
  defaultPreset: 'typescript',
  presets: {
    typescript: {
      extensions: ['ts', 'tsx'],
      exclude: ['**/*.test.ts'],
      stripComments: false
    }
  }
}
```

### RepoRollerYmlConfig

Configuration from `.reporoller.yml`.

```typescript
interface RepoRollerYmlConfig {
  readonly architectural_overview?: string
  readonly profiles?: Readonly<Record<string, ProfileConfig>>
  readonly presets?: Readonly<Record<string, RollerPreset>>
}
```

**Example:**

```typescript
const config: RepoRollerYmlConfig = {
  architectural_overview: 'This is a TypeScript monorepo...',
  profiles: {
    'api-focused': {
      layout: ['api/**/*.ts', 'lib/**/*.ts']
    }
  }
}
```

### RollerPreset

Preset configuration.

```typescript
interface RollerPreset {
  readonly include?: readonly string[]
  readonly exclude?: readonly string[]
  readonly extensions?: readonly string[]
  readonly maxFileSizeBytes?: number
  readonly stripComments?: boolean
  readonly withTree?: boolean
  readonly withStats?: boolean
  readonly sort?: SortMode
  // Enhanced fields for intent-based bundling
  readonly description?: string
  readonly header?: string
  readonly footer?: string
  readonly addOutlines?: boolean
}
```

**Example:**

```typescript
const preset: RollerPreset = {
  description: 'TypeScript source files for code review',
  include: ['src/**/*.ts', 'lib/**/*.ts'],
  exclude: ['**/*.test.ts', '**/*.spec.ts'],
  extensions: ['ts', 'tsx'],
  maxFileSizeBytes: 500 * 1024,
  stripComments: false,
  withTree: true,
  withStats: true,
  sort: 'path',
  header: '## Code Review Task\nReview this TypeScript code.',
  footer: '## Review Guidelines\n- Focus on type safety'
}
```

### ProfileConfig

Profile configuration for file ordering.

```typescript
interface ProfileConfig {
  readonly layout: readonly string[] // Ordered glob patterns
}

type ProfileLayout = ProfileConfig // Alias
```

**Example:**

```typescript
const profile: ProfileConfig = {
  layout: [
    'README.md',
    'CONTRIBUTING.md',
    'docs/**/*.md',
    'src/**/*.ts',
    '**/*'
  ]
}
```

## Option Types

### CliOptions

CLI options (normalized for internal use).

```typescript
interface CliOptions {
  readonly root?: string
  readonly out?: string
  readonly include?: readonly string[]
  readonly exclude?: readonly string[]
  readonly ext?: string
  readonly maxSize?: number
  readonly stripComments?: boolean
  readonly tree?: boolean
  readonly stats?: boolean
  readonly sort?: SortMode
  readonly interactive?: boolean
  readonly preset?: string
  readonly verbose?: boolean
  readonly profile?: string
  readonly format?: OutputFormat
  readonly dryRun?: boolean
  readonly statsOnly?: boolean
  readonly lang?: string
  readonly noTests?: boolean
  readonly noDeps?: boolean
  readonly noGenerated?: boolean
  readonly compact?: boolean
  readonly indent?: number
  readonly toc?: boolean
  readonly frontMatter?: boolean
  readonly tokenCount?: boolean
  readonly target?: string
  readonly warnTokens?: number
  readonly maxTokens?: number
  readonly maxCost?: number
  readonly maxCostEur?: number
  readonly yes?: boolean
  readonly showLLMReport?: boolean
  readonly model?: string
  readonly showPromptHelper?: boolean
  readonly copy?: boolean
  readonly diff?: string
  readonly mostRecent?: number
  readonly quiet?: boolean
  readonly hideComposition?: boolean
  readonly hideContextFit?: boolean
  readonly hideHealthHints?: boolean
  readonly hideWarnings?: boolean
  readonly hideCost?: boolean
  readonly hideRecommendations?: boolean
  readonly maxNestedFolders?: number
}
```

### ResolvedOptions

Fully resolved options after merging all sources.

```typescript
interface ResolvedOptions {
  readonly root: string
  readonly outFile: string
  readonly include: readonly string[]
  readonly exclude: readonly string[]
  readonly extensions: readonly string[]
  readonly maxFileSizeBytes: number
  readonly stripComments: boolean
  readonly withTree: boolean
  readonly withStats: boolean
  readonly sort: SortMode
  readonly interactive: boolean
  readonly verbose: boolean
  readonly presetName?: string
  readonly profile: string
  readonly format: OutputFormat
  readonly repoRollerConfig?: RepoRollerYmlConfig
  readonly dryRun: boolean
  readonly statsOnly: boolean
  readonly compact: boolean
  readonly indent: number
  readonly toc: boolean
  readonly frontMatter: boolean
  readonly tokenCount: boolean
  readonly targetProvider?: string
  readonly warnTokens?: number
  readonly maxTokens?: number
  readonly maxCost?: number
  readonly maxCostEur?: number
  readonly yes: boolean
  readonly profileExplicitlySet?: boolean
  readonly maxSizeExplicitlySet?: boolean
  readonly showLLMReport: boolean
  readonly presetHeader?: string
  readonly presetFooter?: string
  readonly presetDescription?: string
  readonly addOutlines: boolean
  readonly modelPreset?: string
  readonly showPromptHelper: boolean
  readonly copyToClipboard: boolean
  readonly gitDiff?: string
  readonly gitMostRecent?: number
  readonly displaySettings: {
    readonly showGenerationSummary: boolean
    readonly showCodeComposition: boolean
    readonly showContextFit: boolean
    readonly showHealthHints: boolean
    readonly showTokenWarnings: boolean
    readonly showCostEstimates: boolean
    readonly showRecommendations: boolean
  }
  readonly maxNestedFolders: number
}
```

## Output Types

### StructuredOutput

Structure for JSON/YAML output.

```typescript
interface StructuredOutput {
  readonly metadata: OutputMetadata
  readonly architecturalOverview?: string
  readonly files: readonly {
    readonly path: string
    readonly language: string
    readonly content: string
  }[]
}
```

### OutputMetadata

Metadata for structured output.

```typescript
interface OutputMetadata {
  readonly sourceRepository?: string
  readonly profile: string
  readonly timestamp: string
  readonly fileCount: number
}
```

**Example:**

```typescript
const output: StructuredOutput = {
  metadata: {
    sourceRepository: 'https://github.com/user/repo',
    profile: 'llm-context',
    timestamp: '2025-11-19T10:30:00.000Z',
    fileCount: 25
  },
  architecturalOverview: 'This is a TypeScript monorepo...',
  files: [
    {
      path: 'src/index.ts',
      language: 'typescript',
      content: 'export * from "./app"'
    }
  ]
}
```

## Token Types

### LLMProvider

LLM provider configuration.

```typescript
interface LLMProvider {
  readonly name: string                  // Identifier
  readonly displayName: string           // Display name
  readonly contextWindow: number         // Max tokens
  readonly inputCostPerMillion: number   // Input cost per 1M tokens
  readonly outputCostPerMillion: number  // Output cost per 1M tokens
}
```

**Example:**

```typescript
const provider: LLMProvider = {
  name: 'claude-sonnet',
  displayName: 'Claude 3.5 Sonnet',
  contextWindow: 200000,
  inputCostPerMillion: 3.0,
  outputCostPerMillion: 15.0
}
```

### CostEstimate

Cost estimate for an LLM provider.

```typescript
interface CostEstimate {
  readonly provider: string           // Provider identifier
  readonly displayName: string        // Human-readable name
  readonly tokens: number             // Token count
  readonly inputCost: number          // Cost in USD
  readonly withinContextWindow: boolean // Fits in context window
  readonly contextWindow: number      // Max context size
  readonly utilizationPercent: number // Percentage of context used
}
```

### TokenAnalysis

Comprehensive token usage analysis.

```typescript
interface TokenAnalysis {
  readonly text: string
  readonly estimatedTokens: number
  readonly estimates: readonly CostEstimate[]
  readonly warnings: readonly string[]
  readonly recommendations: readonly string[]
}
```

## Budget Types

### BudgetType

Budget limit types.

```typescript
type BudgetType = 'tokens' | 'usd' | 'eur'
```

### BudgetConfig

Budget configuration.

```typescript
interface BudgetConfig {
  readonly type: BudgetType
  readonly limit: number
  readonly provider?: string // Required for cost-based budgets
}
```

### BudgetSelectionResult

Result of budget-based file selection.

```typescript
interface BudgetSelectionResult {
  readonly selectedFiles: readonly FileInfo[]
  readonly excludedFiles: readonly FileInfo[]
  readonly totalTokens: number
  readonly totalCost: number
  readonly budgetType: BudgetType
  readonly budgetLimit: number
  readonly budgetUsed: number
  readonly budgetRemaining: number
  readonly utilizationPercent: number
}
```

### MiddlewareContext

Context for selection middleware.

```typescript
interface MiddlewareContext {
  readonly rootPath: string
  readonly currentTokens: number
  readonly currentCost: number
  readonly provider?: string
}
```

### FileSelectionMiddleware

Middleware function type.

```typescript
type FileSelectionMiddleware = (
  files: readonly FileInfo[],
  config: BudgetConfig,
  context: MiddlewareContext
) => Promise<readonly FileInfo[]> | readonly FileInfo[]
```

## Validation Types

### ValidationError

Validation error or warning.

```typescript
interface ValidationError {
  readonly field: string      // Field with issue
  readonly message: string    // What's wrong
  readonly suggestion: string // How to fix it
}
```

### ValidationResult

Result of validation operation.

```typescript
interface ValidationResult {
  readonly valid: boolean
  readonly errors: readonly ValidationError[]
  readonly warnings: readonly ValidationError[]
}
```

## History Types

### HistoryEntry

A single history entry.

```typescript
interface HistoryEntry {
  readonly id: string
  readonly timestamp: string
  readonly project: {
    readonly name: string
    readonly path: string
    readonly gitBranch?: string
    readonly gitCommit?: string
  }
  readonly command: {
    readonly args: readonly string[]
    readonly preset?: string
    readonly profile: string
    readonly model?: string
  }
  readonly result: {
    readonly fileCount: number
    readonly totalBytes: number
    readonly estimatedTokens: number
    readonly estimatedCost?: number
    readonly outputFile: string
    readonly format: string
    readonly duration: number
  }
  readonly files: {
    readonly included: readonly string[]
    readonly excluded: readonly string[]
  }
  readonly tags?: readonly string[]
  readonly notes?: string
}
```

### HistoryQueryOptions

Query options for history.

```typescript
interface HistoryQueryOptions {
  readonly project?: string
  readonly branch?: string
  readonly preset?: string
  readonly tag?: string
  readonly since?: Date
  readonly limit?: number
  readonly offset?: number
}
```

### HistoryDiff

Diff between two history entries.

```typescript
interface HistoryDiff {
  readonly entry1: HistoryEntry
  readonly entry2: HistoryEntry
  readonly filesDiff: {
    readonly added: readonly string[]
    readonly removed: readonly string[]
    readonly unchanged: readonly string[]
  }
  readonly metricsDiff: {
    readonly fileCount: number
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

## Schema Types

### CliSchema

Complete CLI schema.

```typescript
interface CliSchema {
  readonly $schema: string
  readonly name: string
  readonly version: string
  readonly description: string
  readonly commands: readonly CliCommand[]
  readonly globalOptions: readonly CliOption[]
  readonly presets: readonly string[]
  readonly models: readonly {
    readonly name: string
    readonly family: string
    readonly contextLimit: number
    readonly description: string
  }[]
  readonly outputFormats: readonly string[]
  readonly sortModes: readonly string[]
}
```

### CliCommand

CLI command definition.

```typescript
interface CliCommand {
  readonly name: string
  readonly description: string
  readonly arguments?: readonly CliArgument[]
  readonly options: readonly CliOption[]
  readonly examples: readonly string[]
}
```

### CliArgument

CLI argument definition.

```typescript
interface CliArgument {
  readonly name: string
  readonly type: string
  readonly required: boolean
  readonly description: string
  readonly default?: unknown
}
```

### CliOption

CLI option definition.

```typescript
interface CliOption {
  readonly flags: string
  readonly name: string
  readonly type: string
  readonly description: string
  readonly default?: unknown
  readonly choices?: readonly string[]
  readonly examples?: readonly string[]
  readonly category: string
}
```

### LlmToolDefinition

LLM tool definition.

```typescript
interface LlmToolDefinition {
  readonly name: string
  readonly description: string
  readonly input_schema: {
    readonly type: 'object'
    readonly properties: Record<string, SchemaProperty>
    readonly required?: readonly string[]
  }
}
```

### SchemaProperty

JSON Schema property.

```typescript
interface SchemaProperty {
  readonly type: string | readonly string[]
  readonly description: string
  readonly enum?: readonly string[]
  readonly default?: unknown
  readonly examples?: readonly unknown[]
  readonly pattern?: string
  readonly minimum?: number
  readonly maximum?: number
  readonly items?: SchemaProperty
  readonly format?: string
}
```

## Usage Examples

### Type-Safe File Scanning

```typescript
import { scanFiles } from 'repo-roller'
import type { ResolvedOptions, ScanResult, FileInfo } from 'repo-roller'

async function typedScan(options: ResolvedOptions): Promise<ScanResult> {
  const result = await scanFiles(options)

  // TypeScript knows the shape of result
  const files: readonly FileInfo[] = result.files
  const totalBytes: number = result.totalBytes

  return result
}
```

### Type-Safe Configuration

```typescript
import type { RollerConfig, RollerPreset } from 'repo-roller'

const config: RollerConfig = {
  root: '.',
  defaultPreset: 'typescript',
  presets: {
    typescript: {
      extensions: ['ts', 'tsx'],
      exclude: ['**/*.test.ts']
    } satisfies RollerPreset
  }
}
```

### Type-Safe Budget Management

```typescript
import type { BudgetConfig, BudgetSelectionResult } from 'repo-roller'

const budget: BudgetConfig = {
  type: 'tokens',
  limit: 50000
}

const result: BudgetSelectionResult = await selectFilesWithinBudget(
  files,
  budget
)
```

## Type Guards

Custom type guards for runtime checks:

```typescript
function isFileInfo(obj: unknown): obj is FileInfo {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'absolutePath' in obj &&
    'relativePath' in obj &&
    'sizeBytes' in obj &&
    'extension' in obj &&
    'isBinary' in obj &&
    'isDefaultIncluded' in obj
  )
}

function isScanResult(obj: unknown): obj is ScanResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'files' in obj &&
    'totalBytes' in obj &&
    'rootPath' in obj &&
    'extensionCounts' in obj
  )
}
```

## Related APIs

- [Scanning API](/api/scanning) - Use these types
- [Rendering API](/api/rendering) - Use these types
- [Configuration API](/api/configuration) - Use these types
- [Validation API](/api/validation) - Use these types

## See Also

- [TypeScript Guide](https://www.typescriptlang.org/)
- [API Documentation](/api/)
