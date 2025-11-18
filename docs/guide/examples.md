# Examples

Real-world examples showing how to use repo-roller for common tasks.

## Basic Examples

### Example 1: Quick Start

Generate a bundle with defaults:

```bash
repo-roller
```

**What it does:**
- Scans current directory
- Respects .gitignore
- Excludes common directories (node_modules, dist, etc.)
- Generates Markdown output
- Shows token estimates

---

### Example 2: TypeScript Project

Bundle all TypeScript files:

```bash
repo-roller --preset ts
```

**Output:**
- All `.ts` and `.tsx` files
- Excludes tests
- Includes directory tree and stats
- Estimated tokens and cost

---

### Example 3: Interactive Mode

Use the TUI for visual selection:

```bash
repo-roller -I
```

**Features:**
- Visual file tree
- Multi-select files
- Real-time token estimates
- Format selection
- Preview before generation

---

## Code Review Examples

### Example 4: PR Review

Review files changed in a pull request:

```bash
# Files changed vs main branch
repo-roller --diff main --preset ts -o pr-review.md
```

**Use case:** Prepare context for AI-assisted code review.

---

### Example 5: Recent Changes

Review recent work:

```bash
# Last 10 changed files
repo-roller --most-recent 10 -o recent-changes.md
```

**Use case:** Daily standup, progress review.

---

### Example 6: Feature Branch Review

Review specific feature:

```bash
repo-roller \
  --diff main \
  --include "src/features/authentication/**" \
  -o auth-feature.md
```

**Use case:** Feature-specific review.

---

## Budget-Constrained Examples

### Example 7: Token Budget

Stay within token limit:

```bash
# Fit in 100k tokens
repo-roller \
  --preset ts \
  --max-tokens 100000 \
  --target claude-3.5-sonnet \
  -o bundle.md
```

**Result:**
- Selects files to fit budget
- Prioritizes by importance
- Shows excluded files

---

### Example 8: Cost Budget

Stay within cost limit:

```bash
# Stay under $1
repo-roller \
  --max-cost 1.00 \
  --target claude-3.5-sonnet \
  --strip-comments \
  -o cost-optimized.md
```

**Result:**
- Optimizes for cost
- Strips comments to save tokens
- Fits maximum value in budget

---

### Example 9: Multiple Constraints

Combine token and cost limits:

```bash
repo-roller \
  --max-tokens 150000 \
  --max-cost 2.00 \
  --target claude-3.5-sonnet \
  --preset ts
```

---

## Output Format Examples

### Example 10: JSON Export

Export as JSON for programmatic use:

```bash
repo-roller --format json --compact -o bundle.json
```

**Use case:** CI/CD pipelines, data processing.

---

### Example 11: YAML Export

Export as YAML:

```bash
repo-roller --format yaml --indent 4 -o bundle.yml
```

**Use case:** Configuration files, documentation.

---

### Example 12: Plain Text

Simple concatenation:

```bash
repo-roller --format txt -o bundle.txt
```

**Use case:** Simple viewing, minimal formatting.

---

## Advanced Filtering Examples

### Example 13: Specific Modules

Extract specific modules:

```bash
repo-roller \
  --include "src/auth/**" \
  --include "src/security/**" \
  --ext ts \
  -o security-code.md
```

**Use case:** Security audit, module analysis.

---

### Example 14: Exclude Tests

Exclude all test files:

```bash
repo-roller \
  --preset ts \
  --exclude "**/*.test.ts" \
  --exclude "**/*.spec.ts" \
  --exclude "**/tests/**"
```

Or use the shorthand:
```bash
repo-roller --preset ts --no-tests
```

---

### Example 15: Size Limits

Exclude large files:

```bash
repo-roller \
  --ext ts \
  --max-size 100 \
  --no-tests
```

**Use case:** Focus on manageable files.

---

## Documentation Examples

### Example 16: Documentation Bundle

Extract all documentation:

```bash
repo-roller --preset docs -o documentation.md
```

**Includes:**
- All `.md` files
- README files
- Documentation directories

---

### Example 17: API Documentation

Extract API code:

```bash
repo-roller \
  --include "src/api/**/*.ts" \
  --include "src/types/**/*.ts" \
  --no-tests \
  --toc \
  -o api-docs.md
```

---

## Multi-Language Examples

### Example 18: Full-Stack Project

Bundle frontend and backend:

```bash
# Frontend
repo-roller \
  --include "frontend/**/*.{ts,tsx,css}" \
  --no-tests \
  -o frontend.md

# Backend
repo-roller \
  --include "backend/**/*.ts" \
  --no-tests \
  -o backend.md
```

---

### Example 19: Polyglot Project

Mixed language codebase:

```bash
repo-roller \
  --ext ts,py,go \
  --no-tests \
  --no-deps \
  -o polyglot-bundle.md
```

---

## CI/CD Examples

### Example 20: GitHub Actions

```yaml
# .github/workflows/bundle.yml
name: Generate Code Bundle

on: [push]

jobs:
  bundle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install repo-roller
        run: npm install -g repo-roller

      - name: Generate bundle
        run: |
          repo-roller \
            --preset ts \
            --max-tokens 100000 \
            --format json \
            --out-template "bundle-{datetime}.json" \
            -o artifacts/bundle.json

      - name: Upload artifact
        uses: actions/upload-artifact@v2
        with:
          name: code-bundle
          path: artifacts/bundle.json
```

---

### Example 21: Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Generate bundle of changed files
repo-roller \
  --diff HEAD \
  --format json \
  -o .git/bundle.json

# Validate bundle size
TOKENS=$(jq '.statistics.estimatedTokens' .git/bundle.json)

if [ $TOKENS -gt 200000 ]; then
  echo "Error: Changes exceed 200k token limit ($TOKENS tokens)"
  exit 1
fi
```

---

## History Examples

### Example 22: Track Generations

Record and replay generations:

```bash
# Generate with history
repo-roller --preset ts -o bundle.md

# View history
repo-roller history list

# Search history
repo-roller history search --tag "review"

# Replay previous generation
repo-roller history show abc123 --replay
```

---

### Example 23: Tag and Annotate

Organize history:

```bash
# Tag a generation
repo-roller history tag abc123 "v1.0-release"

# Add notes
repo-roller history annotate abc123 "Pre-launch code review"

# Compare with current
repo-roller history diff abc123
```

---

## Programmatic Examples

### Example 24: Node.js Script

```javascript
// generate-bundle.js
import { scanFiles, renderMarkdown, estimateTokens } from 'repo-roller'

async function generateBundle() {
  const files = await scanFiles(process.cwd(), {
    include: ['src/**/*.ts'],
    exclude: ['**/*.test.ts']
  })

  const tokens = estimateTokens(files, 'claude-3.5-sonnet')
  console.log(`Estimated tokens: ${tokens}`)

  if (tokens > 150000) {
    throw new Error('Exceeds budget')
  }

  const markdown = await renderMarkdown(files, {
    includeTree: true,
    includeStats: true
  })

  await fs.writeFile('bundle.md', markdown)
  console.log('Bundle generated successfully')
}

generateBundle().catch(console.error)
```

---

### Example 25: Express API

```javascript
// server.js
import express from 'express'
import { scanFiles, renderJson } from 'repo-roller'

const app = express()

app.post('/api/bundle', async (req, res) => {
  try {
    const { directory, options } = req.body

    const files = await scanFiles(directory, {
      include: options.include,
      exclude: options.exclude
    })

    const output = await renderJson(files, {
      compact: true
    })

    res.json(JSON.parse(output))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => {
  console.log('Bundle API running on port 3000')
})
```

---

## Advanced Examples

### Example 26: Multi-Stage Pipeline

```bash
#!/bin/bash

# Stage 1: Core architecture
repo-roller \
  --include "src/core/**/*.ts" \
  --max-tokens 50000 \
  -o stage-1-core.md

# Stage 2: Features
repo-roller \
  --include "src/features/**/*.ts" \
  --max-tokens 100000 \
  -o stage-2-features.md

# Stage 3: Integration
repo-roller \
  --include "src/api/**/*.ts" \
  --include "src/services/**/*.ts" \
  --max-tokens 50000 \
  -o stage-3-integration.md

echo "All stages generated successfully"
```

---

### Example 27: Smart Profiles

Using `.reporoller.yml`:

```yaml
profiles:
  onboarding:
    layout:
      - README.md
      - docs/getting-started.md
      - src/index.ts
      - src/core/**/*.ts

  bug-investigation:
    layout:
      - src/auth/**/*.ts
      - src/api/**/*.ts
      - tests/auth.test.ts
```

Usage:
```bash
# New developer onboarding
repo-roller --profile onboarding -o onboarding.md

# Bug investigation
repo-roller --profile bug-investigation -o bug-context.md
```

---

### Example 28: Custom Output Template

```bash
# Date-based naming
repo-roller \
  --out-template "bundles/{repo}-{date}.md" \
  --preset ts

# Version-based naming
repo-roller \
  --out-template "releases/{repo}-v{version}-{commit}.md" \
  --preset full

# Branch-based naming
repo-roller \
  --out-template "reviews/{branch}-{datetime}.md" \
  --diff main
```

---

## Optimization Examples

### Example 29: Minimize Tokens

```bash
repo-roller \
  --strip-comments \
  --no-tree \
  --no-stats \
  --compact \
  --max-size 50
```

---

### Example 30: Maximum Context

```bash
repo-roller \
  --target gemini-1.5-pro \
  --max-tokens 800000 \
  --preset full
```

---

## Next Steps

- **[CLI Reference](/cli/)** - All available options
- **[Configuration](/guide/configuration)** - Config file examples
- **[Presets](/guide/presets)** - Custom preset creation
- **[API Reference](/api/)** - Programmatic usage
