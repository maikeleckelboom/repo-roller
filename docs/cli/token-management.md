# Token Management

Control token estimation, budget constraints, and cost calculation.

## Token Estimation

repo-roller estimates tokens for 25+ LLM providers to help you understand context usage and costs before generation.

## Target Provider

### `--target <provider>`

Specify the target LLM provider for token estimation.

```bash
# Claude 3.5 Sonnet
repo-roller --target claude-3.5-sonnet

# GPT-4 Turbo
repo-roller --target gpt-4-turbo

# Gemini 1.5 Pro
repo-roller --target gemini-1.5-pro
```

**Available providers:**

#### Anthropic (Claude)
- `claude-3.5-sonnet` - Claude 3.5 Sonnet (200k context)
- `claude-3-opus` - Claude 3 Opus (200k context)
- `claude-3-sonnet` - Claude 3 Sonnet (200k context)
- `claude-3-haiku` - Claude 3 Haiku (200k context)

#### OpenAI (GPT)
- `gpt-4-turbo` - GPT-4 Turbo (128k context)
- `gpt-4` - GPT-4 (8k context)
- `gpt-3.5-turbo` - GPT-3.5 Turbo (16k context)

#### Google (Gemini)
- `gemini-1.5-pro` - Gemini 1.5 Pro (1M context)
- `gemini-1.5-flash` - Gemini 1.5 Flash (1M context)
- `gemini-pro` - Gemini Pro (32k context)

#### Others
- `mistral-large` - Mistral Large
- `mixtral-8x7b` - Mixtral 8x7B
- `llama-3-70b` - Llama 3 70B
- `command-r-plus` - Cohere Command R+
- And 10+ more...

**List all providers:**
```bash
repo-roller --list-providers
```

## Token Budget

### `--max-tokens <number>`

Set maximum token budget (hard limit).

```bash
# Limit to 100,000 tokens
repo-roller --max-tokens 100000

# Fit in Claude's context
repo-roller --max-tokens 150000 --target claude-3.5-sonnet

# Small budget
repo-roller --max-tokens 50000
```

**How it works:**
1. Scans and estimates all files
2. Prioritizes files (by order, recency, or size)
3. Selects files that fit within budget
4. Excludes files that exceed budget

**Priority order:**
1. Files in profile layout (if using `--profile`)
2. Recently modified files (if using `--most-recent`)
3. Smaller files first (default)
4. Alphabetical order

**Example output:**
```
Budget Analysis:
Max tokens: 100,000
Selected files: 38 / 42 (4 excluded to fit budget)
Total tokens: 98,234 (98.2% of budget)

Excluded files:
- src/generated/schema.ts (15,234 tokens)
- src/tests/fixtures.ts (8,456 tokens)
- src/legacy/old-api.ts (6,789 tokens)
- docs/api.md (3,210 tokens)
```

## Cost Budget

### `--max-cost <dollars>`

Set maximum cost budget in USD.

```bash
# Stay under $1
repo-roller --max-cost 1.00 --target claude-3.5-sonnet

# $5 budget
repo-roller --max-cost 5.00

# Penny budget
repo-roller --max-cost 0.10
```

### `--max-cost-eur <euros>`

Set maximum cost budget in EUR.

```bash
# European pricing
repo-roller --max-cost-eur 5.00
```

**Cost calculation:**
- Based on provider's input token pricing
- Includes all files in output
- Does NOT include output tokens (LLM response)
- Updated with current pricing

**Example output:**
```
Cost Analysis:
Provider: Claude 3.5 Sonnet
Max cost: $1.00 USD

Selected files: 35 / 42
Total cost: $0.92 (92% of budget)
Estimated input tokens: 61,234
Estimated output tokens: 61,234 (1:1 ratio)
Total estimated cost: $3.98 (with output)

Excluded files:
- src/large-file.ts ($0.23)
- docs/guide.md ($0.15)
```

## Warning Thresholds

### `--warn-tokens <number>`

Set token warning threshold.

```bash
# Warn if over 80,000 tokens
repo-roller --warn-tokens 80000
```

**Output:**
```
⚠️  Warning: Token count (85,234) exceeds threshold (80,000)
Consider using --max-tokens or excluding files
```

## Token Display

### Token Estimation Output

By default, repo-roller shows detailed token estimates:

```
Code Composition by Language:
┌────────────┬───────┬──────────┬────────────┐
│ Language   │ Files │ Size     │ Tokens     │
├────────────┼───────┼──────────┼────────────┤
│ TypeScript │ 38    │ 142.3 KB │ 41,234     │
│ JSON       │ 3     │ 12.1 KB  │ 3,456      │
│ Markdown   │ 1     │ 2.3 KB   │ 544        │
├────────────┼───────┼──────────┼────────────┤
│ Total      │ 42    │ 156.7 KB │ 45,234     │
└────────────┴───────┴──────────┴────────────┘

Context Fit Analysis (Claude 3.5 Sonnet - 200k context):
Your code uses 45,234 tokens (22.6% of context window)
✓ Fits comfortably with room for conversation

Estimated Cost (Claude 3.5 Sonnet):
Input:  $0.68 (45,234 tokens @ $15 / 1M)
Output: $3.39 (estimated at 1:1 ratio)
Total:  $4.07
```

### `--no-token-count`

Disable token counting (faster, no estimation).

```bash
repo-roller --no-token-count
```

**Use when:**
- Speed is critical
- Don't need token estimates
- Using for non-LLM purposes

### `--hide-cost`

Hide cost estimates in output.

```bash
repo-roller --hide-cost
```

### `--hide-warnings`

Hide token warning messages.

```bash
repo-roller --hide-warnings
```

## LLM Analysis

### `--llm` / `--llm-report`

Show detailed LLM token breakdown and recommendations.

```bash
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

Recommendations:
✓ Excellent fit - plenty of room for conversation
✓ Consider stripping comments to save 2,456 tokens
⚠ If generating output, budget ~45k tokens for response

Provider Comparison:
┌─────────────────────┬──────────┬────────────┬──────────┐
│ Provider            │ Fits?    │ Input Cost │ Output   │
├─────────────────────┼──────────┼────────────┼──────────┤
│ Claude 3.5 Sonnet   │ ✓ 22.6%  │ $0.68      │ $3.39    │
│ GPT-4 Turbo         │ ✓ 35.3%  │ $1.42      │ $4.26    │
│ Gemini 1.5 Pro      │ ✓ 4.5%   │ $0.51      │ $2.04    │
│ GPT-3.5 Turbo       │ ⚠ 282%   │ Too large  │ -        │
└─────────────────────┴──────────┴────────────┴──────────┘
```

## Model Presets

### `--model <name>`

Use model-specific preset with optimal settings.

```bash
# Claude 3.5 Sonnet preset
repo-roller --model claude-sonnet

# GPT-4 Turbo preset
repo-roller --model gpt-4

# Gemini Pro preset
repo-roller --model gemini
```

**Model presets include:**
- Target provider
- Recommended token limit (80% of context)
- Optimal format settings
- Strip comments (if beneficial)

**List all models:**
```bash
repo-roller --list-models
```

## Provider Comparison

### `--list-providers`

Show all available LLM providers with pricing.

```bash
repo-roller --list-providers
```

**Output:**
```
Available LLM Providers:
┌─────────────────────┬─────────────┬────────────┬────────────┐
│ Provider            │ Context     │ Input $/1M │ Output $/M │
├─────────────────────┼─────────────┼────────────┼────────────┤
│ claude-3.5-sonnet   │ 200k tokens │ $15.00     │ $75.00     │
│ claude-3-opus       │ 200k tokens │ $15.00     │ $75.00     │
│ gpt-4-turbo         │ 128k tokens │ $10.00     │ $30.00     │
│ gpt-3.5-turbo       │ 16k tokens  │ $0.50      │ $1.50      │
│ gemini-1.5-pro      │ 1M tokens   │ $3.50      │ $10.50     │
│ gemini-1.5-flash    │ 1M tokens   │ $0.35      │ $1.05      │
└─────────────────────┴─────────────┴────────────┴────────────┘
```

## Examples

### Example 1: Budget-Constrained Generation

```bash
# Stay within 100k token budget for Claude
repo-roller \
  --target claude-3.5-sonnet \
  --max-tokens 100000 \
  --preset ts
```

### Example 2: Cost-Optimized

```bash
# Stay under $1 budget
repo-roller \
  --max-cost 1.00 \
  --target claude-3.5-sonnet \
  --strip-comments
```

### Example 3: Multi-Provider Analysis

```bash
# Compare costs across providers
repo-roller --llm --stats-only
```

### Example 4: Large Context Window

```bash
# Use Gemini's 1M token window
repo-roller \
  --target gemini-1.5-pro \
  --max-tokens 800000 \
  --format md
```

### Example 5: Fast Generation (No Token Counting)

```bash
# Skip token estimation for speed
repo-roller --no-token-count --format json
```

## Best Practices

### For Code Review

```bash
# Fit in Claude's context with headroom
repo-roller \
  --target claude-3.5-sonnet \
  --max-tokens 150000
```

### For Cost Optimization

```bash
# Minimize costs
repo-roller \
  --strip-comments \
  --no-tree \
  --no-stats \
  --max-cost 0.50
```

### For Large Codebases

```bash
# Use Gemini's large context
repo-roller \
  --target gemini-1.5-pro \
  --max-tokens 500000
```

### For Budget Planning

```bash
# Analyze before generating
repo-roller \
  --stats-only \
  --llm \
  --target claude-3.5-sonnet
```

## Advanced Usage

### Custom Token Limits

```bash
# Leave room for response (50% of context)
repo-roller \
  --target claude-3.5-sonnet \
  --max-tokens 100000  # 50% of 200k
```

### Multiple Budget Constraints

```bash
# Both token AND cost limits
repo-roller \
  --max-tokens 100000 \
  --max-cost 2.00 \
  --target claude-3.5-sonnet
```

### Priority Selection with Budget

```bash
# Recent files first, within budget
repo-roller \
  --most-recent 20 \
  --max-tokens 80000
```

## Related Options

- [Display Control](/cli/display-control) - Control output visibility
- [Content Options](/cli/content-options) - Optimize content
- [File Selection](/cli/file-selection) - Filter files
- [Budget Management Guide](/guide/budget-management) - In-depth guide
