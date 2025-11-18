# Budget Management

Learn how to use budget constraints to ensure your code fits within token and cost limits.

## Why Budget Management?

When working with LLMs, you often need to:

1. **Fit within context windows** - Ensure code doesn't exceed token limits
2. **Control costs** - Stay within budget for API calls
3. **Optimize value** - Include maximum value within constraints
4. **Prioritize files** - Select most important files first

repo-roller's budget management automatically handles these challenges.

## Token Budgets

### Setting a Token Budget

```bash
# Limit to 100,000 tokens
repo-roller --max-tokens 100000
```

**What happens:**
1. Scans all matching files
2. Estimates tokens for each file
3. Prioritizes files by importance
4. Selects files that fit within 100k budget
5. Excludes files that would exceed budget

### Budget Analysis Output

```
Budget Constraint Analysis
════════════════════════════

Max token budget: 100,000 tokens
Target: Claude 3.5 Sonnet

File Selection:
✓ Selected: 38 files (98,234 tokens - 98.2% of budget)
⚠ Excluded: 4 files (22,679 tokens)

Budget Usage:
██████████████████████░░ 98.2%

Excluded files (by size):
1. src/generated/schema.ts (15,234 tokens)
2. src/tests/fixtures.ts (8,456 tokens)
3. src/legacy/old-api.ts (6,789 tokens)
4. docs/api-reference.md (3,210 tokens)

✓ Output will fit in Claude 3.5 Sonnet (49.1% of 200k context)
```

### Priority Order

Files are selected in this priority order:

1. **Profile layout order** (if using `--profile`)
2. **Recently modified** (if using `--most-recent`)
3. **Smaller files first** (default)
4. **Alphabetical order** (fallback)

**Example:**
```bash
# Priority by profile
repo-roller --profile core-first --max-tokens 100000

# Priority by recency
repo-roller --most-recent 20 --max-tokens 100000

# Default priority (size)
repo-roller --max-tokens 100000
```

## Cost Budgets

### Setting a Cost Budget

```bash
# Stay under $1 USD
repo-roller --max-cost 1.00 --target claude-3.5-sonnet

# Stay under €5 EUR
repo-roller --max-cost-eur 5.00 --target gpt-4-turbo
```

**Cost calculation:**
- Based on provider's input token pricing
- Includes all selected files
- Does NOT include output tokens (LLM response)
- Updated with current pricing

### Cost Analysis Output

```
Cost Budget Analysis
════════════════════

Max cost budget: $1.00 USD
Provider: Claude 3.5 Sonnet
Rate: $15.00 / 1M input tokens

File Selection:
✓ Selected: 35 files ($0.92 - 92% of budget)
⚠ Excluded: 7 files ($0.43)

Selected files breakdown:
├─ src/core/**/*.ts: $0.45 (30 files)
├─ src/api/**/*.ts: $0.28 (3 files)
└─ src/types.ts: $0.19 (2 files)

Estimated total cost (with output):
Input:  $0.92
Output: $4.60 (assuming 1:1 ratio)
Total:  $5.52

⚠ Note: Budget covers input only. Budget for output tokens separately.
```

## Combined Budgets

You can set both token and cost limits:

```bash
repo-roller \
  --max-tokens 150000 \
  --max-cost 2.00 \
  --target claude-3.5-sonnet
```

**Behavior:** Uses the more restrictive constraint.

## Budget Strategies

### Strategy 1: Fill Context Window

Use 50-80% of context window:

```bash
# Claude 3.5 Sonnet (200k context)
# Use 80% = 160k tokens
repo-roller --max-tokens 160000 --target claude-3.5-sonnet

# GPT-4 Turbo (128k context)
# Use 80% = 102k tokens
repo-roller --max-tokens 102400 --target gpt-4-turbo
```

**Leaves room for:**
- System prompts
- Your instructions
- LLM's response

### Strategy 2: Cost-Optimized

Minimize costs while maximizing value:

```bash
repo-roller \
  --max-cost 0.50 \
  --strip-comments \
  --no-tree \
  --no-stats \
  --target claude-3.5-sonnet
```

**Optimization techniques:**
- Strip comments (save 5-15% tokens)
- Remove tree (save 200-500 tokens)
- Remove stats (save 100-300 tokens)
- Use compact format (save 10-20% for JSON)

### Strategy 3: Staged Analysis

Break analysis into multiple stages:

```bash
# Stage 1: Core (50k budget)
repo-roller \
  --include "src/core/**" \
  --max-tokens 50000 \
  -o stage-1-core.md

# Stage 2: Features (100k budget)
repo-roller \
  --include "src/features/**" \
  --max-tokens 100000 \
  -o stage-2-features.md

# Stage 3: Integration (50k budget)
repo-roller \
  --include "src/api/**" \
  --include "src/services/**" \
  --max-tokens 50000 \
  -o stage-3-integration.md
```

**Benefits:**
- Focused analysis
- Better LLM responses
- Lower cost per stage

### Strategy 4: Profile-Based Priority

Use profiles to ensure important files are included:

```yaml
# .reporoller.yml
profiles:
  budget-optimized:
    layout:
      # High priority - always included
      - README.md
      - src/index.ts
      - src/core/**/*.ts

      # Medium priority
      - src/features/**/*.ts

      # Lower priority
      - src/utils/**/*.ts
```

```bash
repo-roller \
  --profile budget-optimized \
  --max-tokens 100000
```

**Result:** Core files included first, utilities excluded if needed.

## Budget Warnings

### Warning Thresholds

Set warning levels:

```bash
# Warn if over 150,000 tokens
repo-roller --warn-tokens 150000
```

**Output:**
```
⚠️  Warning: Token count (165,234) exceeds threshold (150,000)

Recommendations:
- Use --max-tokens to enforce hard limit
- Consider excluding test files with --no-tests
- Strip comments with --strip-comments
- Use --max-size to exclude large files
```

### Budget Exceeded

If files don't fit in budget:

```
❌ Error: Cannot fit any files within budget

Budget: 10,000 tokens
Smallest file: src/index.ts (12,345 tokens)

Suggestions:
1. Increase budget: --max-tokens 50000
2. Exclude large files: --max-size 50
3. Strip comments: --strip-comments
4. Use minimal preset: --preset minimal
```

## Budget Visibility

### Dry Run with Budget

Preview budget impact:

```bash
repo-roller --dry-run --max-tokens 100000
```

**Shows:**
- Which files would be included
- Which files would be excluded
- Token distribution
- Budget usage percentage

### Statistics Only

```bash
repo-roller --stats-only --max-tokens 100000
```

**Shows budget analysis without generating output.**

## Real-World Examples

### Example 1: Code Review Within Budget

```bash
# Review PR changes within Claude's optimal range
repo-roller \
  --diff main \
  --max-tokens 150000 \
  --target claude-3.5-sonnet \
  --no-tests \
  -o pr-review.md
```

**Result:** PR context fits comfortably in Claude's 200k window.

### Example 2: Cost-Conscious Analysis

```bash
# Analyze codebase for under $0.50
repo-roller \
  --max-cost 0.50 \
  --target gemini-1.5-flash \
  --strip-comments \
  --preset minimal
```

**Result:** Maximum code within budget, using cheapest provider.

### Example 3: Multi-Part Analysis

```bash
# Part 1: Architecture (free preview)
repo-roller \
  --include "README.md" \
  --include "docs/**" \
  --include "src/types/**" \
  --max-tokens 30000 \
  -o part-1-architecture.md

# Part 2: Implementation (within budget)
repo-roller \
  --include "src/core/**" \
  --include "src/features/**" \
  --max-tokens 120000 \
  --no-tests \
  -o part-2-implementation.md
```

### Example 4: Iterative Refinement

```bash
# Iteration 1: Check what fits
repo-roller --stats-only --max-tokens 100000

# Iteration 2: Adjust and generate
repo-roller \
  --max-tokens 100000 \
  --exclude "**/generated/**" \
  --strip-comments \
  -o bundle.md
```

## Programmatic Budget Management

### Using the API

```typescript
import { selectFilesWithinBudget } from 'repo-roller'

const allFiles = await scanFiles('/path/to/repo')

const result = selectFilesWithinBudget(allFiles, {
  maxTokens: 100000,
  target: 'claude-3.5-sonnet'
})

console.log(`Selected: ${result.files.length} files`)
console.log(`Total tokens: ${result.totalTokens}`)
console.log(`Excluded: ${result.excluded.length} files`)

// Use selected files
const output = await renderMarkdown(result.files)
```

### Custom Priority

```typescript
import { selectFilesWithinBudget } from 'repo-roller'

// Custom priority function
function customPriority(files) {
  return files.sort((a, b) => {
    // Prioritize by custom logic
    if (a.path.includes('core')) return -1
    if (b.path.includes('core')) return 1
    return a.size - b.size
  })
}

const result = selectFilesWithinBudget(allFiles, {
  maxTokens: 100000,
  target: 'claude-3.5-sonnet',
  priorityFn: customPriority
})
```

## Budget Monitoring

### Track Budget Usage

```bash
# Save statistics
repo-roller --stats-only --max-tokens 100000 > budget-report.txt

# Compare over time
repo-roller --stats-only --max-tokens 100000 | tee -a budget-history.log
```

### CI/CD Budget Checks

```yaml
# .github/workflows/budget-check.yml
name: Budget Check

on: [pull_request]

jobs:
  check-budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install repo-roller
        run: npm install -g repo-roller

      - name: Check if PR fits in budget
        run: |
          repo-roller \
            --diff main \
            --max-tokens 150000 \
            --stats-only || exit 1
```

## Best Practices

### 1. Know Your Context Window

```bash
# Use 80% of available context
# Claude 3.5 Sonnet: 200k → 160k
# GPT-4 Turbo: 128k → 102k
# Gemini 1.5 Pro: 1M → 800k
```

### 2. Budget for Responses

```bash
# Input + Output should fit in context
# Use 50% for input, 50% for output
repo-roller --max-tokens 100000 --target claude-3.5-sonnet
```

### 3. Profile Critical Files

Ensure important files are always included:

```yaml
profiles:
  critical-first:
    layout:
      - src/core/**
      - src/api/**
      - src/**
```

### 4. Monitor Trends

```bash
# Track token usage over time
repo-roller --stats-only >> token-usage.log
```

### 5. Optimize Before Constraining

```bash
# Try optimization first
repo-roller --strip-comments --no-tests

# Then apply budget if needed
repo-roller --strip-comments --no-tests --max-tokens 100000
```

## Next Steps

- **[Token Estimation](/guide/token-estimation)** - Understanding tokens
- **[Token Management CLI](/cli/token-management)** - All budget options
- **[Budget API](/api/budget)** - Programmatic usage
- **[Examples](/guide/examples)** - Real-world budget scenarios
