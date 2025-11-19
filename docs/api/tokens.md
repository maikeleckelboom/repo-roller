# Token Estimation API

The token estimation API provides fast, accurate token counting and cost estimation for multiple LLM providers using heuristic algorithms optimized for code.

## Quick Start

```typescript
import { estimateTokens, calculateCost, getAllCostEstimates } from 'repo-roller'

// Estimate tokens
const content = 'function add(a, b) { return a + b; }'
const tokens = estimateTokens(content)
console.log(`~${tokens} tokens`)

// Calculate cost for a provider
const cost = calculateCost(tokens, 'claude-sonnet')
console.log(`Cost: $${cost.inputCost.toFixed(4)}`)

// Get all provider estimates
const estimates = getAllCostEstimates(tokens)
for (const estimate of estimates) {
  console.log(`${estimate.displayName}: $${estimate.inputCost.toFixed(4)}`)
}
```

## Core Functions

### estimateTokens()

Estimate token count from text using an optimized heuristic algorithm.

**Signature:**

```typescript
function estimateTokens(text: string): number
```

**Parameters:**

- `text` - Text content to analyze

**Returns:**

Estimated token count (integer).

**Algorithm:**

The estimation uses a refined heuristic based on BPE tokenizer behavior:

- Base ratio: ~4 characters per token (industry standard)
- Whitespace correction: Reduces estimate for whitespace-heavy content
- Symbol density adjustment: Increases estimate for symbol-heavy code
- ~95% accuracy compared to actual tokenizers (tiktoken, etc.)
- For large files (>100KB), accuracy is typically within ±2%

**Example:**

```typescript
import { estimateTokens } from 'repo-roller'

const code = `
function fibonacci(n: number): number {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}
`

const tokens = estimateTokens(code)
console.log(`Estimated tokens: ${tokens}`) // ~45 tokens
```

**Performance:**

- ~10-100x faster than actual tokenizers
- No external dependencies required
- Scales linearly with content size
- Optimized for both small samples and large files

### estimateTokensDetailed()

Get detailed token estimation with method information.

**Signature:**

```typescript
function estimateTokensDetailed(text: string): {
  tokens: number
  method: string
}
```

**Returns:**

Object containing:
- `tokens` - Estimated token count
- `method` - Estimation method used (e.g., 'word-boundary')

**Example:**

```typescript
import { estimateTokensDetailed } from 'repo-roller'

const result = estimateTokensDetailed(code)
console.log(`${result.tokens} tokens (method: ${result.method})`)
// Output: 45 tokens (method: word-boundary)
```

### calculateCost()

Calculate cost for using content with an LLM provider.

**Signature:**

```typescript
function calculateCost(
  tokens: number,
  providerName: string
): CostEstimate | undefined
```

**Parameters:**

- `tokens` - Token count to estimate cost for
- `providerName` - Provider identifier (see LLM_PROVIDERS)

**Returns:**

`CostEstimate` object or `undefined` if provider not found.

**Example:**

```typescript
import { estimateTokens, calculateCost } from 'repo-roller'

const tokens = estimateTokens(content)
const cost = calculateCost(tokens, 'claude-sonnet')

if (cost) {
  console.log(`Provider: ${cost.displayName}`)
  console.log(`Tokens: ${cost.tokens.toLocaleString()}`)
  console.log(`Input cost: $${cost.inputCost.toFixed(4)}`)
  console.log(`Within context: ${cost.withinContextWindow}`)
  console.log(`Utilization: ${cost.utilizationPercent.toFixed(1)}%`)
}
```

### getAllCostEstimates()

Get cost estimates for all supported LLM providers.

**Signature:**

```typescript
function getAllCostEstimates(tokens: number): readonly CostEstimate[]
```

**Parameters:**

- `tokens` - Token count to estimate costs for

**Returns:**

Array of cost estimates for all providers.

**Example:**

```typescript
import { estimateTokens, getAllCostEstimates } from 'repo-roller'

const tokens = estimateTokens(largeCodebase)
const estimates = getAllCostEstimates(tokens)

// Sort by cost (cheapest first)
const sorted = [...estimates].sort((a, b) => a.inputCost - b.inputCost)

console.log('Cost comparison:')
for (const est of sorted) {
  const status = est.withinContextWindow ? '✓' : '✗'
  console.log(
    `${status} ${est.displayName}: $${est.inputCost.toFixed(4)} ` +
    `(${est.utilizationPercent.toFixed(1)}% of ${est.contextWindow.toLocaleString()} tokens)`
  )
}
```

## Type Definitions

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

## Supported Providers

### LLM_PROVIDERS

Constant containing all supported providers:

```typescript
import { LLM_PROVIDERS } from 'repo-roller'

// Available providers
const providers = {
  'claude-sonnet': {
    displayName: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 15.0
  },
  'claude-opus': {
    displayName: 'Claude 3 Opus',
    contextWindow: 200000,
    inputCostPerMillion: 15.0,
    outputCostPerMillion: 75.0
  },
  'claude-haiku': {
    displayName: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    inputCostPerMillion: 0.80,
    outputCostPerMillion: 4.0
  },
  'gpt-4o': {
    displayName: 'GPT-4o',
    contextWindow: 128000,
    inputCostPerMillion: 2.50,
    outputCostPerMillion: 10.0
  },
  'gpt-4-turbo': {
    displayName: 'GPT-4 Turbo',
    contextWindow: 128000,
    inputCostPerMillion: 10.0,
    outputCostPerMillion: 30.0
  },
  'o1': {
    displayName: 'OpenAI o1',
    contextWindow: 200000,
    inputCostPerMillion: 15.0,
    outputCostPerMillion: 60.0
  },
  'gemini': {
    displayName: 'Gemini 1.5 Pro',
    contextWindow: 2000000,
    inputCostPerMillion: 1.25,
    outputCostPerMillion: 5.0
  }
}
```

## Token Estimation Algorithm

### Estimation Strategy

The algorithm uses a multi-factor approach:

**1. Base estimation:**

```typescript
// ~4 characters per token (BPE tokenizer average)
const CHARS_PER_TOKEN = 4.0
const baseEstimate = charCount / CHARS_PER_TOKEN
```

**2. Whitespace correction:**

High whitespace density → efficient tokenization → fewer tokens

```typescript
const whitespaceDensity = whitespaceCount / charCount

// Adjust based on whitespace
if (whitespaceDensity > 0.30) {
  correctionFactor = 0.85 // 15% reduction
} else if (whitespaceDensity > 0.25) {
  correctionFactor = 0.90 // 10% reduction
} else if (whitespaceDensity > 0.20) {
  correctionFactor = 0.95 // 5% reduction
}
```

**3. Symbol density adjustment:**

High symbol density → more tokens per character

```typescript
const symbolDensity = specialChars / contentChars

// Adjust based on symbols
if (symbolDensity > 0.35) {
  correctionFactor *= 1.25 // 25% increase
} else if (symbolDensity > 0.25) {
  correctionFactor *= 1.15 // 15% increase
} else if (symbolDensity > 0.20) {
  correctionFactor *= 1.05 // 5% increase
}
```

**4. Final estimate:**

```typescript
return Math.ceil(baseEstimate * correctionFactor)
```

### Accuracy Analysis

**Large files (>100KB):**

- Typically ±2% of actual token count
- Variations average out over large content
- Best for production use

**Small files (<10KB):**

- Typically ±5-10% of actual token count
- Still accurate enough for decision-making
- Individual file variations matter less in aggregates

**Content types:**

- Plain text: ~95% accuracy
- TypeScript/JavaScript: ~93% accuracy
- JSON: ~90% accuracy (high symbol density)
- Minified code: ~85% accuracy (edge case)

## Cost Calculation

### Input Costs

Calculate cost for sending content to an LLM:

```typescript
import { estimateTokens, calculateCost } from 'repo-roller'

const fileContent = await readFile('large-file.ts', 'utf-8')
const tokens = estimateTokens(fileContent)
const cost = calculateCost(tokens, 'claude-sonnet')

console.log(`Input cost: $${cost.inputCost.toFixed(4)}`)
// Example: Input cost: $0.0150 (for 5000 tokens)
```

### Context Window Analysis

Check if content fits within provider limits:

```typescript
import { getAllCostEstimates } from 'repo-roller'

const tokens = estimateTokens(repositoryBundle)
const estimates = getAllCostEstimates(tokens)

// Find providers that can handle this content
const fittingProviders = estimates.filter(e => e.withinContextWindow)
const overflowProviders = estimates.filter(e => !e.withinContextWindow)

if (overflowProviders.length > 0) {
  console.warn('Too large for:', overflowProviders.map(e => e.displayName))
}

// Show utilization
for (const est of fittingProviders) {
  console.log(`${est.displayName}: ${est.utilizationPercent.toFixed(1)}% utilized`)
}
```

### Cost Comparison

Compare costs across providers:

```typescript
import { estimateTokens, getAllCostEstimates } from 'repo-roller'

function compareCosts(content: string) {
  const tokens = estimateTokens(content)
  const estimates = getAllCostEstimates(tokens)

  // Sort by cost
  const sorted = [...estimates]
    .filter(e => e.withinContextWindow)
    .sort((a, b) => a.inputCost - b.inputCost)

  console.log(`\nCost comparison for ${tokens.toLocaleString()} tokens:\n`)

  for (const est of sorted) {
    const utilization = est.utilizationPercent.toFixed(1)
    console.log(
      `${est.displayName.padEnd(20)} $${est.inputCost.toFixed(4)}  ` +
      `(${utilization}% of context)`
    )
  }

  // Show cheapest option
  if (sorted.length > 0) {
    const cheapest = sorted[0]!
    console.log(`\n💡 Cheapest: ${cheapest.displayName} at $${cheapest.inputCost.toFixed(4)}`)
  }
}
```

## Utility Functions

### formatCostEstimate()

Format a cost estimate for display.

**Signature:**

```typescript
function formatCostEstimate(estimate: CostEstimate): string
```

**Example:**

```typescript
import { calculateCost, formatCostEstimate } from 'repo-roller'

const cost = calculateCost(50000, 'claude-sonnet')
const formatted = formatCostEstimate(cost)
console.log(formatted)
// Output: ✓ Claude 3.5 Sonnet: $0.1500 (25.0% of 200,000 context)
```

### formatNumber()

Format numbers with thousand separators.

**Signature:**

```typescript
function formatNumber(num: number): string
```

**Example:**

```typescript
import { formatNumber } from 'repo-roller'

console.log(formatNumber(1234567)) // "1,234,567"
console.log(formatNumber(50000))   // "50,000"
```

## Token Analysis

### analyzeTokenUsage()

Comprehensive token usage analysis with warnings and recommendations.

**Signature:**

```typescript
function analyzeTokenUsage(
  text: string,
  context?: TokenAnalysisContext
): TokenAnalysis
```

**Parameters:**

- `text` - Content to analyze
- `context` - Optional context (profile usage, size limits)

**Returns:**

```typescript
interface TokenAnalysis {
  readonly text: string
  readonly estimatedTokens: number
  readonly estimates: readonly CostEstimate[]
  readonly warnings: readonly string[]
  readonly recommendations: readonly string[]
}
```

**Example:**

```typescript
import { analyzeTokenUsage } from 'repo-roller'

const analysis = analyzeTokenUsage(bundleContent, {
  profileUsed: false,
  maxSizeUsed: false
})

console.log(`Estimated tokens: ${analysis.estimatedTokens.toLocaleString()}`)

if (analysis.warnings.length > 0) {
  console.log('\n⚠️  Warnings:')
  for (const warning of analysis.warnings) {
    console.log(`  - ${warning}`)
  }
}

if (analysis.recommendations.length > 0) {
  console.log('\n💡 Recommendations:')
  for (const rec of analysis.recommendations) {
    console.log(`  - ${rec}`)
  }
}
```

### generateTokenReport()

Generate a formatted token analysis report.

**Signature:**

```typescript
function generateTokenReport(analysis: TokenAnalysis): string
```

**Example:**

```typescript
import { analyzeTokenUsage, generateTokenReport } from 'repo-roller'

const analysis = analyzeTokenUsage(content)
const report = generateTokenReport(analysis)

console.log(report)
```

**Output:**

```markdown
## Token Analysis

**Estimated Tokens:** 50,000

### Cost Estimates by Provider

- ✓ Claude 3.5 Sonnet: $0.1500 (25.0% of 200,000 context)
- ✓ GPT-4o: $0.1250 (39.1% of 128,000 context)
- ✓ Gemini 1.5 Pro: $0.0625 (2.5% of 2,000,000 context)

### 💡 Recommendations

- Most cost-effective: Gemini 1.5 Pro at $0.0625
- Output is large but within most context windows
```

## Integration Examples

### Estimate Before Rendering

```typescript
import { scanFiles, estimateTokens, render } from 'repo-roller'

async function renderWithEstimate(root: string) {
  const scanResult = await scanFiles({ root })

  // Quick estimate based on file sizes
  const totalChars = scanResult.files.reduce(
    (sum, f) => sum + f.sizeBytes,
    0
  )
  const estimatedTokens = Math.ceil(totalChars / 4)

  console.log(`Estimated tokens: ${estimatedTokens.toLocaleString()}`)

  if (estimatedTokens > 100000) {
    console.warn('⚠️  Large bundle - consider filtering')
    return
  }

  const output = await render(scanResult, options)
  const actualTokens = estimateTokens(output)

  console.log(`Actual tokens: ${actualTokens.toLocaleString()}`)
  console.log(`Accuracy: ${((actualTokens / estimatedTokens) * 100).toFixed(1)}%`)
}
```

### Budget-Based Selection

```typescript
import { scanFiles, selectFilesWithinBudget } from 'repo-roller'

async function selectWithinBudget(root: string, maxTokens: number) {
  const allFiles = await scanFiles({ root })

  const result = await selectFilesWithinBudget(
    allFiles.files,
    { type: 'tokens', limit: maxTokens }
  )

  console.log(`Selected: ${result.selectedFiles.length} files`)
  console.log(`Total tokens: ${result.totalTokens.toLocaleString()}`)
  console.log(`Budget used: ${result.utilizationPercent.toFixed(1)}%`)

  return result.selectedFiles
}
```

### Cost Monitoring

```typescript
import { estimateTokens, getAllCostEstimates } from 'repo-roller'

function monitorCosts(content: string, targetProvider: string) {
  const tokens = estimateTokens(content)
  const estimate = calculateCost(tokens, targetProvider)

  if (!estimate) {
    throw new Error(`Unknown provider: ${targetProvider}`)
  }

  // Alert if cost exceeds threshold
  const MAX_COST = 1.0 // $1.00
  if (estimate.inputCost > MAX_COST) {
    throw new Error(
      `Cost exceeds budget: $${estimate.inputCost.toFixed(4)} > $${MAX_COST}`
    )
  }

  // Alert if context window is nearly full
  if (estimate.utilizationPercent > 90) {
    console.warn(
      `⚠️  High context utilization: ${estimate.utilizationPercent.toFixed(1)}%`
    )
  }

  return estimate
}
```

## Error Handling

```typescript
import { calculateCost } from 'repo-roller'

const cost = calculateCost(50000, 'unknown-provider')
if (!cost) {
  console.error('Unknown provider')
  // Handle gracefully
}

// Or with error throwing
function requireCost(tokens: number, provider: string): CostEstimate {
  const cost = calculateCost(tokens, provider)
  if (!cost) {
    throw new Error(`Provider not found: ${provider}`)
  }
  return cost
}
```

## Related APIs

- [Budget API](/api/budget) - Select files within token/cost budgets
- [Scanning API](/api/scanning) - Discover files to estimate
- [Rendering API](/api/rendering) - Generate output to estimate
- [Types API](/api/types) - TypeScript type definitions

## See Also

- [Token Estimation Guide](/guide/token-estimation)
- [Budget Management](/guide/budget-management)
- [LLM Workflows](/guide/llm-workflows)
