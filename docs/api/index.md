# API Reference

repo-roller provides a comprehensive programmatic API for integrating into your tools and workflows.

## Installation

```bash
npm install repo-roller
```

## Quick Start

```typescript
import { scanFiles, render, estimateTokens } from 'repo-roller'

// Scan files
const files = await scanFiles('/path/to/repo', {
  include: ['**/*.ts'],
  exclude: ['**/*.test.ts']
})

// Estimate tokens
const tokens = estimateTokens(files, 'claude-3.5-sonnet')

// Generate output
const output = await render(files, {
  format: 'markdown',
  includeTree: true,
  includeStats: true
})

console.log(`Generated ${files.length} files (${tokens} tokens)`)
```

## Core Modules

### [File Scanning](/api/scanning)

Discover and filter files in a repository.

```typescript
import { scanFiles, type ScanOptions } from 'repo-roller'

const files = await scanFiles(directory, options)
```

### [Rendering](/api/rendering)

Generate output in multiple formats.

```typescript
import { render, renderMarkdown, renderJson } from 'repo-roller'

const markdown = await renderMarkdown(files, options)
const json = await renderJson(files, options)
```

### [Token Estimation](/api/tokens)

Estimate tokens and calculate costs.

```typescript
import { estimateTokens, calculateCost, getAllCostEstimates } from 'repo-roller'

const tokens = estimateTokens(content, 'claude-3.5-sonnet')
const cost = calculateCost(tokens, 'claude-3.5-sonnet')
const comparison = getAllCostEstimates(tokens)
```

### [Budget Management](/api/budget)

Select files within budget constraints.

```typescript
import { selectFilesWithinBudget, parseBudgetString } from 'repo-roller'

const selected = selectFilesWithinBudget(files, {
  maxTokens: 100000,
  target: 'claude-3.5-sonnet'
})
```

### [Configuration](/api/configuration)

Load and resolve configuration.

```typescript
import { loadConfig, resolveOptions, getBuiltInPreset } from 'repo-roller'

const config = await loadConfig('/path/to/repo')
const preset = getBuiltInPreset('typescript')
const options = resolveOptions(cliArgs, config, preset)
```

### [Validation](/api/validation)

Validate configurations and options.

```typescript
import { validateRollerConfig, validateCliOptions } from 'repo-roller'

const errors = validateRollerConfig(config)
if (errors.length > 0) {
  console.error('Invalid configuration:', errors)
}
```

### [History](/api/history)

Track and manage generation history.

```typescript
import { recordHistoryEntry, queryHistory, loadHistory } from 'repo-roller'

await recordHistoryEntry(entry)
const history = await loadHistory()
const results = queryHistory(history, { tag: 'review' })
```

## TypeScript Support

repo-roller is written in TypeScript with full type definitions.

```typescript
import type {
  ScanOptions,
  RenderOptions,
  FileInfo,
  TokenEstimate,
  BudgetOptions,
  HistoryEntry,
  RollerConfig
} from 'repo-roller'
```

## Usage Patterns

### Pattern 1: Simple File Aggregation

```typescript
import { scanFiles, renderMarkdown } from 'repo-roller'

async function bundleCode(directory: string) {
  const files = await scanFiles(directory, {
    include: ['src/**/*.ts'],
    exclude: ['**/*.test.ts']
  })

  return await renderMarkdown(files, {
    includeTree: true,
    includeStats: true
  })
}
```

### Pattern 2: Token-Aware Generation

```typescript
import { scanFiles, estimateTokens, renderMarkdown } from 'repo-roller'

async function generateWithinBudget(directory: string, maxTokens: number) {
  const files = await scanFiles(directory)
  const tokens = estimateTokens(files, 'claude-3.5-sonnet')

  if (tokens > maxTokens) {
    throw new Error(`Exceeds budget: ${tokens} > ${maxTokens}`)
  }

  return await renderMarkdown(files)
}
```

### Pattern 3: Cost-Optimized Selection

```typescript
import { scanFiles, selectFilesWithinBudget, renderMarkdown } from 'repo-roller'

async function generateWithCostLimit(directory: string, maxCost: number) {
  const allFiles = await scanFiles(directory)

  const selected = selectFilesWithinBudget(allFiles, {
    maxCost,
    target: 'claude-3.5-sonnet'
  })

  return await renderMarkdown(selected.files)
}
```

### Pattern 4: Multi-Format Export

```typescript
import { scanFiles, render } from 'repo-roller'

async function exportAllFormats(directory: string) {
  const files = await scanFiles(directory)

  return {
    markdown: await render(files, { format: 'markdown' }),
    json: await render(files, { format: 'json' }),
    yaml: await render(files, { format: 'yaml' })
  }
}
```

### Pattern 5: History Tracking

```typescript
import { scanFiles, renderMarkdown, recordHistoryEntry } from 'repo-roller'

async function generateWithHistory(directory: string) {
  const files = await scanFiles(directory)
  const output = await renderMarkdown(files)

  await recordHistoryEntry({
    timestamp: new Date(),
    directory,
    fileCount: files.length,
    outputSize: output.length,
    options: { format: 'markdown' }
  })

  return output
}
```

## Error Handling

All async functions can throw errors. Always use try-catch:

```typescript
import { scanFiles } from 'repo-roller'

try {
  const files = await scanFiles('/path/to/repo')
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Directory not found')
  } else if (error.code === 'EACCES') {
    console.error('Permission denied')
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## Integration Examples

### Express.js API

```typescript
import express from 'express'
import { scanFiles, renderJson } from 'repo-roller'

const app = express()

app.post('/api/bundle', async (req, res) => {
  try {
    const { directory, options } = req.body
    const files = await scanFiles(directory, options)
    const output = await renderJson(files)
    res.json(output)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

### GitHub Action

```typescript
import { scanFiles, renderMarkdown } from 'repo-roller'
import * as core from '@actions/core'
import * as fs from 'fs/promises'

async function run() {
  try {
    const directory = core.getInput('directory')
    const maxTokens = parseInt(core.getInput('max-tokens'))

    const files = await scanFiles(directory)
    const output = await renderMarkdown(files)

    await fs.writeFile('bundle.md', output)
    core.setOutput('file', 'bundle.md')
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
```

### CLI Tool

```typescript
#!/usr/bin/env node
import { scanFiles, render } from 'repo-roller'
import { program } from 'commander'

program
  .argument('<directory>')
  .option('-f, --format <type>', 'Output format', 'markdown')
  .option('-o, --out <file>', 'Output file')
  .action(async (directory, options) => {
    const files = await scanFiles(directory)
    const output = await render(files, { format: options.format })

    if (options.out) {
      await fs.writeFile(options.out, output)
    } else {
      console.log(output)
    }
  })

program.parse()
```

## Module Exports

### Default Export

```typescript
import repoRoller from 'repo-roller'

repoRoller.scanFiles(...)
repoRoller.render(...)
```

### Named Exports

```typescript
import {
  // Scanning
  scanFiles,

  // Rendering
  render,
  renderMarkdown,
  renderJson,
  renderYaml,
  renderTxt,

  // Tokens
  estimateTokens,
  calculateCost,
  getAllCostEstimates,

  // Budget
  selectFilesWithinBudget,
  parseBudgetString,

  // Configuration
  loadConfig,
  resolveOptions,
  getBuiltInPreset,

  // Validation
  validateRollerConfig,
  validateCliOptions,

  // History
  loadHistory,
  recordHistoryEntry,
  queryHistory,

  // Types
  type ScanOptions,
  type RenderOptions,
  type FileInfo
} from 'repo-roller'
```

## Next Steps

- **[Scanning API](/api/scanning)** - File discovery and filtering
- **[Rendering API](/api/rendering)** - Output generation
- **[Token API](/api/tokens)** - Estimation and cost calculation
- **[Budget API](/api/budget)** - Budget management
- **[Types Reference](/api/types)** - TypeScript type definitions

## Support

- [GitHub Issues](https://github.com/maikeleckelboom/repo-roller/issues)
- [API Documentation](/api/)
- [Examples](/guide/examples)
