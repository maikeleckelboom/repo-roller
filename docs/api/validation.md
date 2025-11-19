# Validation API

The validation API provides comprehensive configuration validation with actionable error messages and suggestions for fixing issues.

## Quick Start

```typescript
import { validateRollerConfig, validateRepoRollerYml, validateCliOptions } from 'repo-roller'

// Validate config file
const configResult = validateRollerConfig(config)
if (!configResult.valid) {
  for (const error of configResult.errors) {
    console.error(`${error.field}: ${error.message}`)
    console.error(`Fix: ${error.suggestion}`)
  }
}

// Validate YAML file
const yamlResult = validateRepoRollerYml(repoRollerConfig)

// Validate CLI options
const cliResult = validateCliOptions({
  ext: 'ts,tsx',
  format: 'json',
  maxSize: 500
})
```

## Core Functions

### validateRollerConfig()

Validate `repo-roller.config.mjs` configuration.

**Signature:**

```typescript
function validateRollerConfig(config: RollerConfig): ValidationResult
```

**Parameters:**

- `config` - Configuration object to validate

**Returns:**

`ValidationResult` with validation status, errors, and warnings.

**Example:**

```typescript
import { loadConfig, validateRollerConfig, formatValidationErrors } from 'repo-roller'

const config = await loadConfig('/path/to/repo')

if (config) {
  const result = validateRollerConfig(config)

  if (!result.valid) {
    console.error(formatValidationErrors(result, 'repo-roller.config.mjs'))
    process.exit(1)
  }

  console.log('✅ Configuration is valid')
}
```

**Validation checks:**

- Root path is a string
- Presets object structure is valid
- Each preset has valid options
- Extension format (no leading dots)
- File size limits are positive
- Sort modes are valid
- No conflicting include/exclude patterns
- Default preset references an existing preset

### validateRepoRollerYml()

Validate `.reporoller.yml` configuration.

**Signature:**

```typescript
function validateRepoRollerYml(config: RepoRollerYmlConfig): ValidationResult
```

**Parameters:**

- `config` - YAML configuration object to validate

**Returns:**

`ValidationResult` with validation status, errors, and warnings.

**Example:**

```typescript
import { loadRepoRollerYml, validateRepoRollerYml } from 'repo-roller'

const config = await loadRepoRollerYml('/path/to/repo')

if (config) {
  const result = validateRepoRollerYml(config)

  if (result.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:')
    for (const warning of result.warnings) {
      console.warn(`  ${warning.field}: ${warning.message}`)
    }
  }

  if (!result.valid) {
    console.error('❌ Configuration has errors')
    process.exit(1)
  }
}
```

**Validation checks:**

- Architectural overview is a string
- Profiles object structure is valid
- Each profile has a layout array
- Layout patterns are strings
- Presets (if present) are valid

### validateCliOptions()

Validate CLI options for common mistakes.

**Signature:**

```typescript
function validateCliOptions(options: {
  ext?: string
  lang?: string
  maxSize?: number
  format?: string
  target?: string
}): ValidationResult
```

**Parameters:**

- `options` - CLI options to validate

**Returns:**

`ValidationResult` with validation status, errors, and warnings.

**Example:**

```typescript
import { validateCliOptions } from 'repo-roller'

const result = validateCliOptions({
  ext: '.ts,.tsx',     // Warning: dots not needed
  format: 'xml',       // Error: invalid format
  maxSize: -1          // Error: must be positive
})

if (!result.valid) {
  for (const error of result.errors) {
    console.error(`${error.field}: ${error.message}`)
    console.error(`Fix: ${error.suggestion}`)
  }
}

if (result.warnings.length > 0) {
  for (const warning of result.warnings) {
    console.warn(`${warning.field}: ${warning.message}`)
  }
}
```

**Validation checks:**

- Extensions don't contain glob patterns or dots
- Max size is positive and reasonable
- Format is valid (md, json, yaml, txt)
- Target provider is recognized

## Type Definitions

### ValidationResult

Result of a validation operation.

```typescript
interface ValidationResult {
  readonly valid: boolean                    // Overall validity
  readonly errors: readonly ValidationError[] // Errors (prevent operation)
  readonly warnings: readonly ValidationError[] // Warnings (allow operation)
}
```

### ValidationError

Individual validation error or warning.

```typescript
interface ValidationError {
  readonly field: string      // Field with issue
  readonly message: string    // What's wrong
  readonly suggestion: string // How to fix it
}
```

## Validation Rules

### Preset Validation

**Extension format:**

```typescript
// ❌ Invalid
extensions: ['.ts', '.tsx']  // No leading dots
extensions: ['*.ts']         // No glob patterns
extensions: ['src/*.ts']     // No paths

// ✅ Valid
extensions: ['ts', 'tsx']
extensions: ['js', 'jsx', 'mjs', 'cjs']
```

**File size limits:**

```typescript
// ❌ Invalid
maxFileSizeBytes: 0           // Must be positive
maxFileSizeBytes: -1          // Must be positive
maxFileSizeBytes: 500_000_000 // Warning: unusually large (>100MB)

// ✅ Valid
maxFileSizeBytes: 1024 * 1024      // 1MB
maxFileSizeBytes: 500 * 1024       // 500KB
```

**Sort mode:**

```typescript
// ❌ Invalid
sort: 'name'      // Unknown mode
sort: 'type'      // Unknown mode

// ✅ Valid
sort: 'path'      // Alphabetically by path
sort: 'size'      // By file size (largest first)
sort: 'extension' // By file extension
```

**Conflicting patterns:**

```typescript
// ❌ Invalid
include: ['src/**/*.ts'],
exclude: ['src/**/*.ts']  // Same pattern in both

// ✅ Valid
include: ['src/**/*.ts'],
exclude: ['src/**/*.test.ts']  // Different patterns
```

### Profile Validation

**Layout array:**

```typescript
// ❌ Invalid
layout: []  // Empty array

layout: [
  'README.md',
  123  // Not a string
]

// ✅ Valid
layout: [
  'README.md',
  'docs/**/*.md',
  'src/**/*.ts'
]
```

### CLI Options Validation

**Extension format:**

```typescript
// ⚠️  Warning
ext: '.ts,.tsx'  // Dots not needed
ext: 'ts, tsx'   // Spaces are trimmed (OK but could be cleaner)

// ❌ Error
ext: '*.ts,*.tsx'  // No glob patterns

// ✅ Valid
ext: 'ts,tsx'
ext: 'js,jsx,mjs'
```

**Format:**

```typescript
// ❌ Invalid
format: 'xml'   // Not supported
format: 'pdf'   // Not supported

// ✅ Valid
format: 'md'
format: 'json'
format: 'yaml'
format: 'txt'
```

**Max size:**

```typescript
// ❌ Error
maxSize: 0      // Must be positive
maxSize: -100   // Must be positive

// ⚠️  Warning
maxSize: 10240  // Very large (>10MB)

// ✅ Valid
maxSize: 500    // 500KB
maxSize: 1024   // 1MB
```

## Error Messages

All validation errors include three components:

1. **Field** - What's being validated
2. **Message** - What's wrong
3. **Suggestion** - How to fix it

**Example:**

```typescript
{
  field: 'presets.typescript.extensions',
  message: 'Extension ".ts" should not start with a dot',
  suggestion: 'Change ".ts" to "ts"'
}
```

### Common Errors

**Extension with dot:**

```
Field: presets.typescript.extensions
Error: Extension ".ts" should not start with a dot
Fix: Change ".ts" to "ts"
```

**Invalid sort mode:**

```
Field: presets.custom.sort
Error: Invalid sort mode "name"
Fix: Use one of: path, size, extension
```

**Missing preset reference:**

```
Field: defaultPreset
Error: Default preset "custom" is not defined in presets
Fix: Either define "custom" in presets or change defaultPreset
```

**Empty profile layout:**

```
Field: profiles.api-focused.layout
Error: Profile has empty layout array
Fix: Add file patterns like ["README.md", "src/**/*.ts"]
```

## Formatting Functions

### formatValidationErrors()

Format validation errors for display.

**Signature:**

```typescript
function formatValidationErrors(
  result: ValidationResult,
  configFile: string
): string
```

**Parameters:**

- `result` - Validation result
- `configFile` - Name of file being validated (for display)

**Returns:**

Formatted error message string.

**Example:**

```typescript
import { validateRollerConfig, formatValidationErrors } from 'repo-roller'

const result = validateRollerConfig(config)
const formatted = formatValidationErrors(result, 'repo-roller.config.mjs')

console.log(formatted)
```

**Output:**

```
❌ Configuration errors in repo-roller.config.mjs:

  presets.typescript.extensions
    Error: Extension ".ts" should not start with a dot
    Fix: Change ".ts" to "ts"

  presets.custom.sort
    Error: Invalid sort mode "name"
    Fix: Use one of: path, size, extension

⚠️  Warnings in repo-roller.config.mjs:

  presets.large.maxFileSizeBytes
    Warning: Max file size is unusually large (>100MB)
    Suggestion: Consider a smaller limit to avoid memory issues
```

## Integration Examples

### Validate Before Use

```typescript
import { loadConfig, validateRollerConfig, resolveOptions } from 'repo-roller'

async function safeLoadConfig(root: string) {
  const config = await loadConfig(root)

  if (config) {
    const result = validateRollerConfig(config)

    if (!result.valid) {
      console.error('Configuration validation failed:')
      for (const error of result.errors) {
        console.error(`  ${error.field}: ${error.message}`)
      }
      throw new Error('Invalid configuration')
    }

    // Show warnings but continue
    for (const warning of result.warnings) {
      console.warn(`  ${warning.field}: ${warning.message}`)
    }
  }

  return config
}
```

### Validate User Input

```typescript
function validateUserOptions(options: Record<string, unknown>) {
  const result = validateCliOptions({
    ext: options.ext as string,
    format: options.format as string,
    maxSize: options.maxSize as number,
    target: options.target as string
  })

  if (!result.valid) {
    const messages = result.errors.map(
      e => `${e.field}: ${e.message}. ${e.suggestion}`
    )
    throw new Error(`Invalid options:\n${messages.join('\n')}`)
  }

  return result
}
```

### Interactive Validation

```typescript
import { validateCliOptions } from 'repo-roller'
import prompts from 'prompts'

async function interactiveConfig() {
  let valid = false
  let options = {}

  while (!valid) {
    options = await prompts([
      {
        type: 'text',
        name: 'ext',
        message: 'File extensions (comma-separated):'
      },
      {
        type: 'select',
        name: 'format',
        message: 'Output format:',
        choices: [
          { title: 'Markdown', value: 'md' },
          { title: 'JSON', value: 'json' },
          { title: 'YAML', value: 'yaml' },
          { title: 'Text', value: 'txt' }
        ]
      },
      {
        type: 'number',
        name: 'maxSize',
        message: 'Max file size (KB):',
        initial: 500
      }
    ])

    const result = validateCliOptions(options)

    if (result.valid) {
      valid = true
    } else {
      console.error('\nValidation errors:')
      for (const error of result.errors) {
        console.error(`  ${error.message}`)
        console.error(`  ${error.suggestion}`)
      }
      console.log('\nPlease try again.\n')
    }
  }

  return options
}
```

### Pre-Flight Validation

```typescript
async function validateAllConfig(root: string) {
  const [config, yaml] = await Promise.all([
    loadConfig(root),
    loadRepoRollerYml(root)
  ])

  const results = []

  // Validate config file
  if (config) {
    const result = validateRollerConfig(config)
    results.push({
      file: 'repo-roller.config.mjs',
      result
    })
  }

  // Validate YAML file
  if (yaml) {
    const result = validateRepoRollerYml(yaml)
    results.push({
      file: '.reporoller.yml',
      result
    })
  }

  // Report all issues
  let hasErrors = false

  for (const { file, result } of results) {
    if (!result.valid || result.warnings.length > 0) {
      console.log(`\n${file}:`)
      console.log(formatValidationErrors(result, file))
      if (!result.valid) hasErrors = true
    }
  }

  if (!hasErrors && results.length > 0) {
    console.log('\n✅ All configuration files are valid')
  }

  return !hasErrors
}
```

### Custom Validation Rules

```typescript
import type { ValidationError, ValidationResult } from 'repo-roller'

function customValidation(config: RollerConfig): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Custom rule: Check for security patterns
  if (config.presets) {
    for (const [name, preset] of Object.entries(config.presets)) {
      if (preset.include?.some(p => p.includes('.env'))) {
        warnings.push({
          field: `presets.${name}.include`,
          message: 'Including .env files may expose secrets',
          suggestion: 'Consider excluding .env files explicitly'
        })
      }
    }
  }

  // Custom rule: Enforce company standards
  if (config.presets) {
    for (const [name, preset] of Object.entries(config.presets)) {
      if (!preset.stripComments) {
        warnings.push({
          field: `presets.${name}.stripComments`,
          message: 'Company standard requires comment stripping',
          suggestion: 'Set stripComments: true'
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
```

## Validation in CI/CD

### GitHub Actions

```yaml
name: Validate Configuration

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install repo-roller
      - run: npx repo-roller --validate
```

### Pre-Commit Hook

```javascript
// .husky/pre-commit
import { loadConfig, validateRollerConfig } from 'repo-roller'

const config = await loadConfig('.')

if (config) {
  const result = validateRollerConfig(config)

  if (!result.valid) {
    console.error('❌ Invalid repo-roller configuration')
    process.exit(1)
  }
}
```

### npm Script

```json
{
  "scripts": {
    "validate-config": "node scripts/validate-config.js"
  }
}
```

```javascript
// scripts/validate-config.js
import { loadConfig, validateRollerConfig, formatValidationErrors } from 'repo-roller'

const config = await loadConfig('.')

if (config) {
  const result = validateRollerConfig(config)

  console.log(formatValidationErrors(result, 'repo-roller.config.mjs'))

  if (!result.valid) {
    process.exit(1)
  }
}
```

## Error Handling

```typescript
import { validateRollerConfig } from 'repo-roller'

try {
  const result = validateRollerConfig(config)

  // Validation never throws, but returns errors
  if (!result.valid) {
    // Handle errors
    for (const error of result.errors) {
      logError(error)
    }
  }
} catch (error) {
  // Unexpected errors (shouldn't happen)
  console.error('Validation failed unexpectedly:', error)
}
```

## Best Practices

1. **Always validate after loading**
   ```typescript
   const config = await loadConfig(root)
   if (config) {
     const result = validateRollerConfig(config)
     // ... handle result
   }
   ```

2. **Show all errors, not just the first**
   ```typescript
   if (!result.valid) {
     for (const error of result.errors) {
       console.error(formatError(error))
     }
   }
   ```

3. **Don't ignore warnings**
   ```typescript
   if (result.warnings.length > 0) {
     console.warn('Configuration warnings:')
     for (const warning of result.warnings) {
       console.warn(formatWarning(warning))
     }
   }
   ```

4. **Validate in development and CI**
   - Add validation to your development workflow
   - Run validation in CI/CD pipelines
   - Add pre-commit hooks for configuration files

## Related APIs

- [Configuration API](/api/configuration) - Load and resolve configuration
- [Types API](/api/types) - TypeScript type definitions

## See Also

- [Configuration Guide](/guide/configuration)
- [Validation Errors](/cli/validation)
- [CI/CD Integration](/guide/ci-cd)
