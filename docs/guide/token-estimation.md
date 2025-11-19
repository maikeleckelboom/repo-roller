# Token Estimation

Understanding token estimation and how repo-roller calculates tokens and costs.

## What Are Tokens?

Tokens are the fundamental units that Large Language Models (LLMs) use to process text. They're roughly equivalent to:

- **1 token ≈ 4 characters** (for English text)
- **1 token ≈ 0.75 words** (approximately)

**Examples:**
- `"Hello, world!"` ≈ 4 tokens
- `"The quick brown fox"` ≈ 5 tokens
- A typical code file (1000 lines) ≈ 20,000-40,000 tokens

## Why Token Estimation Matters

### 1. Context Window Limits

Every LLM has a maximum context window:

| Provider | Model | Context Window |
|----------|-------|----------------|
| Anthropic | Claude 3.5 Sonnet | 200,000 tokens |
| OpenAI | GPT-4 Turbo | 128,000 tokens |
| Google | Gemini 1.5 Pro | 1,000,000 tokens |
| OpenAI | GPT-3.5 Turbo | 16,000 tokens |

If your code exceeds this limit, the request will fail.

### 2. API Costs

LLM providers charge based on token count:

| Provider | Model | Input Cost | Output Cost |
|----------|-------|------------|-------------|
| Anthropic | Claude 3.5 Sonnet | $3 / 1M tokens | $15 / 1M tokens |
| OpenAI | GPT-4 Turbo | $10 / 1M tokens | $30 / 1M tokens |
| Google | Gemini 1.5 Pro | $3.50 / 1M tokens | $10.50 / 1M tokens |

**Example cost calculation:**
- 50,000 token input to Claude 3.5 Sonnet
- Input cost: $0.15 (50,000 tokens × $3 / 1M)
- Output cost (assuming 1:1 ratio): $0.75 (50,000 tokens × $15 / 1M)
- **Total: $0.90**

### 3. Response Quality

More input tokens = less room for response:

```
Context Window: 200,000 tokens

Option A: 180,000 token input → 20,000 token response
Option B: 50,000 token input → 150,000 token response
```

repo-roller helps you optimize this trade-off.

## How repo-roller Estimates Tokens

### Estimation Method

repo-roller uses a **fast, heuristic-based estimation** method optimized for performance:

1. **Character-to-token ratio**: Base estimation of ~4 characters per token
2. **Content type adjustments**:
   - Whitespace density correction for heavily indented code
   - Symbol density adjustment for code with many operators
   - Markdown content uses lower token density (~4.5 chars/token)
3. **Performance optimization**: Very large files (>100KB) use simplified estimation

**Accuracy:** Estimates are typically within ~5% of actual token counts for most code.

**Why heuristics?** Actual tokenizers would require large dependencies and slow down processing. The heuristic approach provides good-enough estimates instantly, which is perfect for quick checks and CLI workflows.

### What's Counted

Token estimation includes:

- **Source code content**
- **Comments** (unless `--strip-comments` is used)
- **File metadata** (paths, language tags)
- **Tree structure** (if `--no-tree` not specified)
- **Statistics** (if `--no-stats` not specified)
- **Headers/footers** (if specified in config)

### What's Not Counted

- Output tokens (LLM's response)
- System prompts (added by your application)
- Additional context you provide

## Using Token Estimation

### Basic Estimation

```bash
# Show token estimate
repo-roller --preset ts

# Output includes:
# Estimated Tokens: 45,234
# Estimated Cost: $0.68 (Claude 3.5 Sonnet)
```

### Target-Specific Estimation

```bash
# Estimate for Claude
repo-roller --target claude-3.5-sonnet

# Estimate for GPT-4
repo-roller --target gpt-4-turbo

# Estimate for Gemini
repo-roller --target gemini-1.5-pro
```

### Statistics Only Mode

```bash
# Just show statistics, don't generate
repo-roller --stats-only
```

**Output:**
```
Code Composition by Language:
┌────────────┬───────┬──────────┬────────────┐
│ Language   │ Files │ Size     │ Tokens     │
├────────────┼───────┼──────────┼────────────┤
│ TypeScript │ 38    │ 142.3 KB │ 41,234     │
│ JSON       │ 3     │ 12.1 KB  │ 3,456      │
│ Markdown   │ 1     │ 2.3 KB   │ 544        │
└────────────┴───────┴──────────┴────────────┘

Total: 45,234 tokens
```

### Detailed LLM Report

```bash
# Show comprehensive token analysis
repo-roller --llm
```

**Output:**
```
LLM Analysis Report
═══════════════════

Target: Claude 3.5 Sonnet
Context Window: 200,000 tokens

Token Breakdown:
├─ Source Code: 41,234 tokens (91.2%)
├─ Comments: 2,456 tokens (5.4%)
├─ Metadata: 1,234 tokens (2.7%)
└─ Tree/Stats: 310 tokens (0.7%)

Total: 45,234 tokens
Context Usage: 22.6% of 200k window

✓ Fits comfortably with room for conversation
```

### Provider Comparison

```bash
# Compare costs across providers
repo-roller --list-providers
```

**Output:**
```
Provider Comparison (45,234 tokens):
┌─────────────────────┬──────────┬────────────┬────────────┐
│ Provider            │ Fits?    │ Input Cost │ Output     │
├─────────────────────┼──────────┼────────────┼────────────┤
│ Claude 3.5 Sonnet   │ ✓ 22.6%  │ $0.68      │ $3.39      │
│ GPT-4 Turbo         │ ✓ 35.3%  │ $0.45      │ $1.36      │
│ Gemini 1.5 Pro      │ ✓ 4.5%   │ $0.16      │ $0.48      │
│ GPT-3.5 Turbo       │ ⚠ 282%   │ Too large  │ -          │
└─────────────────────┴──────────┴────────────┴────────────┘
```

## Optimization Strategies

### 1. Strip Comments

Comments consume tokens but may not always be necessary:

```bash
# Remove comments to save tokens
repo-roller --strip-comments

# Typical savings: 5-15% of total tokens
```

**Before:** 45,234 tokens
**After:** 38,456 tokens (15% reduction)

### 2. Exclude Tree and Stats

Metadata adds overhead:

```bash
# Minimal output
repo-roller --no-tree --no-stats
```

**Typical savings:** 200-500 tokens

### 3. Filter by File Size

Large files often have high token counts:

```bash
# Exclude files over 100 KB
repo-roller --max-size 100
```

### 4. Use Compact Format

JSON can be compacted:

```bash
repo-roller --format json --compact
```

**Savings:** 10-20% for JSON format

### 5. Prioritize Important Files

Use profiles or patterns:

```bash
# Core files only
repo-roller --include "src/core/**"

# Use profile for ordering
repo-roller --profile core-first --max-tokens 100000
```

## Context Fit Analysis

repo-roller shows how your code fits in the context window:

```bash
repo-roller --target claude-3.5-sonnet
```

**Output:**
```
Context Fit Analysis (Claude 3.5 Sonnet):

Your code: 45,234 tokens
Context window: 200,000 tokens
Usage: 22.6%

✓ Fits comfortably with room for conversation
  Remaining: 154,766 tokens available for prompts and responses

Recommendations:
✓ Excellent fit - plenty of room for conversation
✓ Consider stripping comments to save 2,456 tokens
⚠ If generating output, budget ~45k tokens for response
```

**Status indicators:**
- ✓ **Under 50%** - Excellent fit
- ⚠ **50-80%** - Good fit, but limited response space
- ⚠ **80-100%** - Tight fit, minimal response space
- ❌ **Over 100%** - Does not fit

## Token Budget Management

### Set Token Limit

```bash
# Hard limit at 100,000 tokens
repo-roller --max-tokens 100000
```

**How it works:**
1. Scans all files
2. Estimates tokens for each file
3. Selects files to fit within budget
4. Shows excluded files

**Example output:**
```
Budget Analysis:
Max tokens: 100,000
Selected files: 38 / 42
Total tokens: 98,234 (98.2% of budget)

Excluded files (to fit budget):
- src/generated/schema.ts (15,234 tokens)
- src/tests/fixtures.ts (8,456 tokens)
- src/legacy/old-api.ts (6,789 tokens)
```

### Set Cost Limit

```bash
# Stay under $1 USD
repo-roller --max-cost 1.00 --target claude-3.5-sonnet
```

### Warning Thresholds

```bash
# Warn if over 150,000 tokens
repo-roller --warn-tokens 150000
```

## Programmatic Token Estimation

### Using the API

```typescript
import { estimateTokens, estimateTokensDetailed } from 'repo-roller'

// Basic estimation
const tokens = estimateTokens(content, 'claude-3.5-sonnet')
console.log(`Estimated tokens: ${tokens}`)

// Detailed estimation
const detailed = estimateTokensDetailed(content, {
  target: 'claude-3.5-sonnet',
  includeBreakdown: true
})

console.log(`Code: ${detailed.codeTokens}`)
console.log(`Comments: ${detailed.commentTokens}`)
console.log(`Metadata: ${detailed.metadataTokens}`)
console.log(`Total: ${detailed.totalTokens}`)
```

### Calculate Costs

```typescript
import { calculateCost, getAllCostEstimates } from 'repo-roller'

// Calculate for specific provider
const cost = calculateCost(tokens, 'claude-3.5-sonnet')
console.log(`Cost: $${cost.input} (input)`)

// Compare across providers
const comparison = getAllCostEstimates(tokens)
comparison.forEach(({ provider, inputCost, outputCost }) => {
  console.log(`${provider}: $${inputCost} + $${outputCost}`)
})
```

## Best Practices

### 1. Always Estimate Before Generating

```bash
# Check fit first
repo-roller --stats-only --target claude-3.5-sonnet

# Then generate
repo-roller --target claude-3.5-sonnet -o bundle.md
```

### 2. Use Appropriate Target

```bash
# Match your actual LLM
repo-roller --target claude-3.5-sonnet  # If using Claude
repo-roller --target gpt-4-turbo        # If using GPT-4
repo-roller --target gemini-1.5-pro     # If using Gemini
```

### 3. Budget for Responses

Leave room for LLM responses:

```bash
# Use 50% of context window
repo-roller --max-tokens 100000 --target claude-3.5-sonnet
# Leaves 100k tokens for response
```

### 4. Monitor Costs

```bash
# Always check cost before generation
repo-roller --llm --stats-only
```

### 5. Optimize When Necessary

```bash
# If over budget, optimize
repo-roller \
  --strip-comments \
  --max-size 100 \
  --no-tree \
  --max-tokens 100000
```

## Troubleshooting

### Estimate Seems High

```bash
# Check breakdown
repo-roller --llm

# Find large files
repo-roller --stats-only --sort size
```

### Doesn't Fit in Context

```bash
# Use budget constraints
repo-roller --max-tokens 100000

# Or use Gemini's large context
repo-roller --target gemini-1.5-pro --max-tokens 500000
```

### Cost Too High

```bash
# Optimize and use cheaper provider
repo-roller \
  --strip-comments \
  --max-cost 1.00 \
  --target gemini-1.5-flash
```

## Next Steps

- **[Budget Management](/guide/budget-management)** - Advanced budget features
- **[CLI Token Options](/cli/token-management)** - All token-related flags
- **[Token API](/api/tokens)** - Programmatic usage
- **[Examples](/guide/examples)** - Real-world token optimization
