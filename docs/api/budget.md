# Budget Management API

The budget management API provides intelligent file selection within token or cost constraints using an extensible middleware architecture.

## Quick Start

```typescript
import { selectFilesWithinBudget, parseBudgetString } from 'repo-roller'

// Select files within a token budget
const result = await selectFilesWithinBudget(
  allFiles,
  { type: 'tokens', limit: 50000 },
  undefined, // Use default middleware
  '/path/to/repo'
)

console.log(`Selected ${result.selectedFiles.length} files`)
console.log(`Total tokens: ${result.totalTokens}`)
console.log(`Budget utilization: ${result.utilizationPercent.toFixed(1)}%`)

// Parse budget from string
const budget = parseBudgetString('50k')
// Returns: { type: 'tokens', limit: 50000 }
```

## Core Functions

### selectFilesWithinBudget()

Select files that fit within a specified budget using greedy selection.

**Signature:**

```typescript
function selectFilesWithinBudget(
  files: readonly FileInfo[],
  config: BudgetConfig,
  middleware?: FileSelectionMiddleware,
  rootPath?: string
): Promise<BudgetSelectionResult>
```

**Parameters:**

- `files` - Array of files to select from
- `config` - Budget configuration
- `middleware` - Optional selection middleware (default: size-based)
- `rootPath` - Root path for context (default: '.')

**Returns:**

Promise resolving to `BudgetSelectionResult` with selected files and usage stats.

**Example:**

```typescript
import { scanFiles, selectFilesWithinBudget } from 'repo-roller'

// Scan all files
const scanResult = await scanFiles(options)

// Select within 50k token budget
const result = await selectFilesWithinBudget(
  scanResult.files,
  { type: 'tokens', limit: 50000 }
)

console.log('Selected files:', result.selectedFiles.length)
console.log('Excluded files:', result.excludedFiles.length)
console.log('Total tokens:', result.totalTokens)
console.log('Budget remaining:', result.budgetRemaining)
```

### parseBudgetString()

Parse a budget string into a budget configuration.

**Signature:**

```typescript
function parseBudgetString(input: string): BudgetConfig | null
```

**Parameters:**

- `input` - Budget string to parse

**Returns:**

`BudgetConfig` object or `null` if invalid.

**Supported formats:**

```typescript
// Token budgets
parseBudgetString('50000')   // { type: 'tokens', limit: 50000 }
parseBudgetString('50k')     // { type: 'tokens', limit: 50000 }
parseBudgetString('1m')      // { type: 'tokens', limit: 1000000 }

// USD budgets
parseBudgetString('$0.50')   // { type: 'usd', limit: 0.5 }
parseBudgetString('1.0 USD') // { type: 'usd', limit: 1.0 }

// EUR budgets
parseBudgetString('€0.45')   // { type: 'eur', limit: 0.45 }
parseBudgetString('0.9 EUR') // { type: 'eur', limit: 0.9 }
```

**Example:**

```typescript
import { parseBudgetString } from 'repo-roller'

const budget = parseBudgetString('50k')
if (budget) {
  console.log(`Type: ${budget.type}`)       // 'tokens'
  console.log(`Limit: ${budget.limit}`)     // 50000
} else {
  console.error('Invalid budget string')
}
```

## Type Definitions

### BudgetConfig

Budget configuration object.

```typescript
interface BudgetConfig {
  readonly type: BudgetType      // 'tokens', 'usd', or 'eur'
  readonly limit: number         // Budget limit
  readonly provider?: string     // LLM provider (required for cost budgets)
}

type BudgetType = 'tokens' | 'usd' | 'eur'
```

### BudgetSelectionResult

Result of budget-based file selection.

```typescript
interface BudgetSelectionResult {
  readonly selectedFiles: readonly FileInfo[]  // Files within budget
  readonly excludedFiles: readonly FileInfo[]  // Files exceeding budget
  readonly totalTokens: number                 // Total estimated tokens
  readonly totalCost: number                   // Total estimated cost (USD)
  readonly budgetType: BudgetType              // Budget type used
  readonly budgetLimit: number                 // Budget limit
  readonly budgetUsed: number                  // Amount of budget used
  readonly budgetRemaining: number             // Remaining budget
  readonly utilizationPercent: number          // Percentage used
}
```

## Budget Types

### Token Budget

Limit by estimated token count:

```typescript
const result = await selectFilesWithinBudget(
  files,
  {
    type: 'tokens',
    limit: 100000
  }
)

console.log(`Using ${result.totalTokens} of ${result.budgetLimit} tokens`)
```

### USD Budget

Limit by cost in US dollars:

```typescript
const result = await selectFilesWithinBudget(
  files,
  {
    type: 'usd',
    limit: 0.50,
    provider: 'claude-sonnet'
  }
)

console.log(`Cost: $${result.totalCost.toFixed(4)}`)
```

### EUR Budget

Limit by cost in euros:

```typescript
const result = await selectFilesWithinBudget(
  files,
  {
    type: 'eur',
    limit: 0.45,
    provider: 'gpt-4o'
  }
)

console.log(`Cost: €${result.budgetUsed.toFixed(4)}`)
```

## Selection Middleware

### Default Middleware

The default middleware selects files by size (largest first):

```typescript
import { defaultSizeBasedMiddleware } from 'repo-roller'

const result = await selectFilesWithinBudget(
  files,
  budget,
  defaultSizeBasedMiddleware
)
// Larger files are prioritized
```

### Path-Based Middleware

Preserves original file order:

```typescript
import { pathBasedMiddleware } from 'repo-roller'

const result = await selectFilesWithinBudget(
  files,
  budget,
  pathBasedMiddleware
)
// Files selected in order they appear
```

### Extension Priority Middleware

Prioritize specific file types:

```typescript
import { createExtensionPriorityMiddleware } from 'repo-roller'

const middleware = createExtensionPriorityMiddleware(['ts', 'tsx', 'md'])

const result = await selectFilesWithinBudget(
  files,
  budget,
  middleware
)
// TypeScript and Markdown files selected first
```

### Custom Middleware

Create your own selection logic:

```typescript
import type { FileSelectionMiddleware } from 'repo-roller'

// Prioritize recently modified files
const recentFilesMiddleware: FileSelectionMiddleware = async (
  files,
  config,
  context
) => {
  const filesWithMtime = await Promise.all(
    files.map(async (file) => {
      const stats = await stat(file.absolutePath)
      return { file, mtime: stats.mtime.getTime() }
    })
  )

  // Sort by modification time (newest first)
  filesWithMtime.sort((a, b) => b.mtime - a.mtime)

  return filesWithMtime.map(({ file }) => file)
}

const result = await selectFilesWithinBudget(
  files,
  budget,
  recentFilesMiddleware
)
```

## Middleware Architecture

### Middleware Context

Middleware receives context about the current selection:

```typescript
interface MiddlewareContext {
  readonly rootPath: string      // Repository root
  readonly currentTokens: number // Tokens selected so far
  readonly currentCost: number   // Cost accumulated so far
  readonly provider?: string     // Target LLM provider
}
```

### Middleware Function Type

```typescript
type FileSelectionMiddleware = (
  files: readonly FileInfo[],
  config: BudgetConfig,
  context: MiddlewareContext
) => Promise<readonly FileInfo[]> | readonly FileInfo[]
```

Middleware can:
- Reorder files to prioritize certain selections
- Filter out files based on custom criteria
- Access budget and context information
- Be sync or async

### Example: Dependency-Aware Middleware

```typescript
const dependencyAwareMiddleware: FileSelectionMiddleware = (
  files,
  config,
  context
) => {
  // Prioritize dependency graphs
  const entryPoints = files.filter(f => f.relativePath.includes('index'))
  const components = files.filter(f => f.relativePath.includes('components'))
  const utils = files.filter(f => f.relativePath.includes('utils'))
  const rest = files.filter(f =>
    !entryPoints.includes(f) &&
    !components.includes(f) &&
    !utils.includes(f)
  )

  return [...entryPoints, ...components, ...utils, ...rest]
}
```

## Token Estimation

### estimateFileTokens()

Estimate tokens for a single file.

**Signature:**

```typescript
function estimateFileTokens(file: FileInfo): number
```

**Parameters:**

- `file` - File to estimate tokens for

**Returns:**

Estimated token count.

**Example:**

```typescript
import { estimateFileTokens } from 'repo-roller'

for (const file of files) {
  const tokens = estimateFileTokens(file)
  console.log(`${file.relativePath}: ~${tokens} tokens`)
}
```

**Algorithm:**

```typescript
// Base estimate: ~4 chars per token
const baseEstimate = file.sizeBytes / 4

// Adjust for file type
let multiplier = 1.0
if (extension === 'min.js' || extension === 'min.css') {
  multiplier = 1.3  // Minified files are denser
} else if (extension === 'json' || extension === 'yaml') {
  multiplier = 1.2  // Structured data has more tokens
} else if (extension === 'md' || extension === 'txt') {
  multiplier = 0.9  // Plain text has fewer tokens
}

return Math.ceil(baseEstimate * multiplier)
```

### estimateFileCost()

Estimate cost for a file.

**Signature:**

```typescript
function estimateFileCost(tokens: number, provider: string): number
```

**Example:**

```typescript
import { estimateFileTokens, estimateFileCost } from 'repo-roller'

const tokens = estimateFileTokens(file)
const cost = estimateFileCost(tokens, 'claude-sonnet')
console.log(`File cost: $${cost.toFixed(6)}`)
```

## Currency Conversion

### eurToUsd()

Convert euros to US dollars.

**Signature:**

```typescript
function eurToUsd(eur: number): number
```

**Example:**

```typescript
import { eurToUsd } from 'repo-roller'

const usd = eurToUsd(0.45)  // ~$0.49 (at 1.08 rate)
```

### usdToEur()

Convert US dollars to euros.

**Signature:**

```typescript
function usdToEur(usd: number): number
```

**Example:**

```typescript
import { usdToEur } from 'repo-roller'

const eur = usdToEur(0.50)  // ~€0.46
```

## Formatting Functions

### formatBudget()

Format budget for display.

**Signature:**

```typescript
function formatBudget(config: BudgetConfig): string
```

**Example:**

```typescript
import { formatBudget } from 'repo-roller'

console.log(formatBudget({ type: 'tokens', limit: 50000 }))
// Output: "50.0K tokens"

console.log(formatBudget({ type: 'usd', limit: 0.5 }))
// Output: "$0.5000"

console.log(formatBudget({ type: 'eur', limit: 0.45 }))
// Output: "€0.4500"
```

### formatBudgetUsage()

Format budget usage for display.

**Signature:**

```typescript
function formatBudgetUsage(result: BudgetSelectionResult): string
```

**Example:**

```typescript
import { formatBudgetUsage } from 'repo-roller'

const formatted = formatBudgetUsage(result)
console.log(formatted)
// Output: "45.2K / 50.0K (90.4%)"
```

## Integration Examples

### CLI Budget Mode

```typescript
import { scanFiles, selectFilesWithinBudget, parseBudgetString } from 'repo-roller'

async function budgetMode(root: string, budgetStr: string) {
  // Parse budget
  const budget = parseBudgetString(budgetStr)
  if (!budget) {
    throw new Error(`Invalid budget: ${budgetStr}`)
  }

  // Add provider for cost budgets
  if (budget.type !== 'tokens') {
    budget.provider = 'claude-sonnet'
  }

  // Scan files
  const scanResult = await scanFiles({ root })

  // Select within budget
  const result = await selectFilesWithinBudget(
    scanResult.files,
    budget
  )

  console.log(`\nBudget Selection Results:`)
  console.log(`  Selected: ${result.selectedFiles.length} files`)
  console.log(`  Excluded: ${result.excludedFiles.length} files`)
  console.log(`  Tokens: ${result.totalTokens.toLocaleString()}`)
  console.log(`  Cost: $${result.totalCost.toFixed(4)}`)
  console.log(`  Utilization: ${result.utilizationPercent.toFixed(1)}%`)

  return result
}

await budgetMode('.', '50k')
```

### Progressive File Selection

```typescript
async function progressiveSelection(
  files: readonly FileInfo[],
  maxBudget: number
) {
  // Try increasing budgets until we fit everything
  const budgets = [10000, 25000, 50000, 100000, 200000]

  for (const limit of budgets) {
    const result = await selectFilesWithinBudget(
      files,
      { type: 'tokens', limit }
    )

    if (result.selectedFiles.length === files.length) {
      console.log(`All files fit in ${limit.toLocaleString()} tokens`)
      return result
    }

    console.log(`${limit.toLocaleString()} tokens: ${result.selectedFiles.length}/${files.length} files`)
  }
}
```

### Multi-Provider Comparison

```typescript
async function compareProviderBudgets(
  files: readonly FileInfo[],
  costBudget: number
) {
  const providers = ['claude-sonnet', 'claude-haiku', 'gpt-4o', 'gemini']

  for (const provider of providers) {
    const result = await selectFilesWithinBudget(
      files,
      {
        type: 'usd',
        limit: costBudget,
        provider
      }
    )

    console.log(`\n${provider}:`)
    console.log(`  Files: ${result.selectedFiles.length}`)
    console.log(`  Tokens: ${result.totalTokens.toLocaleString()}`)
    console.log(`  Cost: $${result.totalCost.toFixed(4)}`)
  }
}

await compareProviderBudgets(files, 1.0) // $1 budget
```

### Smart Budget Allocation

```typescript
async function smartBudgetAllocation(
  files: readonly FileInfo[],
  budget: BudgetConfig
) {
  // First pass: Include essential files
  const essentials = files.filter(f =>
    f.relativePath.match(/^(README|CONTRIBUTING|LICENSE)/)
  )

  // Calculate remaining budget
  const essentialResult = await selectFilesWithinBudget(
    essentials,
    budget
  )

  const remainingBudget = budget.limit - essentialResult.budgetUsed
  const remainingFiles = files.filter(f => !essentials.includes(f))

  // Second pass: Fill remaining budget
  const finalResult = await selectFilesWithinBudget(
    remainingFiles,
    { ...budget, limit: remainingBudget }
  )

  return {
    selectedFiles: [
      ...essentialResult.selectedFiles,
      ...finalResult.selectedFiles
    ],
    totalTokens: essentialResult.totalTokens + finalResult.totalTokens
  }
}
```

## Error Handling

```typescript
import { selectFilesWithinBudget } from 'repo-roller'

try {
  // Cost budget requires provider
  const result = await selectFilesWithinBudget(
    files,
    { type: 'usd', limit: 0.5 } // Missing provider!
  )
} catch (error) {
  console.error(error.message)
  // "Provider must be specified for cost-based budgets"
}

// Correct usage
const result = await selectFilesWithinBudget(
  files,
  { type: 'usd', limit: 0.5, provider: 'claude-sonnet' }
)
```

## Performance Notes

- Greedy algorithm is O(n) where n = number of files
- File ordering by middleware can be O(n log n)
- Token estimation is fast (~0.1ms per file)
- Suitable for repositories with 1000+ files

## Related APIs

- [Token API](/api/tokens) - Token estimation and cost calculation
- [Scanning API](/api/scanning) - Discover files to select from
- [Types API](/api/types) - TypeScript type definitions

## See Also

- [Budget Management Guide](/guide/budget-management)
- [Token Estimation](/guide/token-estimation)
- [LLM Workflows](/guide/llm-workflows)
