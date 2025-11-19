# Configuration API

The configuration API loads and resolves settings from multiple sources with intelligent merging and priority handling.

## Quick Start

```typescript
import { loadConfig, loadRepoRollerYml, resolveOptions, getBuiltInPreset } from 'repo-roller'

// Load configuration files
const config = await loadConfig('/path/to/repo')
const repoRollerYml = await loadRepoRollerYml('/path/to/repo')

// Resolve final options
const options = resolveOptions(
  { root: '.', preset: 'typescript' },
  config,
  repoRollerYml
)

// Get a built-in preset
const preset = getBuiltInPreset('typescript')
console.log(preset.extensions) // ['ts', 'tsx']
```

## Core Functions

### resolveOptions()

Merge configuration from all sources into final resolved options.

**Signature:**

```typescript
function resolveOptions(
  cli: CliOptions,
  config?: RollerConfig,
  repoRollerConfig?: RepoRollerYmlConfig
): ResolvedOptions
```

**Parameters:**

- `cli` - CLI options from command line
- `config` - Optional config from `repo-roller.config.mjs`
- `repoRollerConfig` - Optional config from `.reporoller.yml`

**Returns:**

Fully resolved `ResolvedOptions` object.

**Resolution Priority (highest wins):**

1. CLI arguments (explicit user intent)
2. User presets from `repo-roller.config.mjs`
3. Profile layouts from `.reporoller.yml`
4. Built-in presets
5. Hardcoded defaults

**Example:**

```typescript
import { resolveOptions } from 'repo-roller'

const options = resolveOptions(
  {
    root: './my-project',
    preset: 'typescript',
    format: 'json',
    stripComments: true
  },
  await loadConfig('./my-project'),
  await loadRepoRollerYml('./my-project')
)

console.log(options.extensions) // ['ts', 'tsx'] from preset
console.log(options.format)     // 'json' from CLI
```

### loadConfig()

Load `repo-roller.config.mjs` from a directory.

**Signature:**

```typescript
function loadConfig(rootDir: string): Promise<RollerConfig | undefined>
```

**Parameters:**

- `rootDir` - Directory to search for config file

**Returns:**

Promise resolving to `RollerConfig` or `undefined` if not found.

**Supported file names (in order):**

- `repo-roller.config.mts`
- `repo-roller.config.mjs`
- `repo-roller.config.cjs`
- `repo-roller.config.ts`
- `repo-roller.config.js`

**Example:**

```typescript
import { loadConfig } from 'repo-roller'

const config = await loadConfig('/path/to/repo')

if (config) {
  console.log('Presets:', Object.keys(config.presets ?? {}))
  console.log('Default preset:', config.defaultPreset)
}
```

**Config file format:**

```javascript
// repo-roller.config.mjs
export default {
  root: '.',
  defaultPreset: 'my-preset',
  presets: {
    'my-preset': {
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      extensions: ['ts', 'tsx'],
      stripComments: true,
      withTree: true,
      withStats: true,
      description: 'TypeScript source files only',
      header: '## Review the TypeScript codebase',
      footer: '## End of TypeScript review'
    }
  }
}
```

### loadRepoRollerYml()

Load `.reporoller.yml` configuration file.

**Signature:**

```typescript
function loadRepoRollerYml(rootDir: string): Promise<RepoRollerYmlConfig | undefined>
```

**Parameters:**

- `rootDir` - Directory to search for `.reporoller.yml`

**Returns:**

Promise resolving to `RepoRollerYmlConfig` or `undefined` if not found.

**Example:**

```typescript
import { loadRepoRollerYml } from 'repo-roller'

const config = await loadRepoRollerYml('/path/to/repo')

if (config) {
  console.log('Profiles:', Object.keys(config.profiles ?? {}))
  console.log('Has overview:', !!config.architectural_overview)
}
```

**YAML file format:**

```yaml
# .reporoller.yml

# Architectural overview (prepended to output)
architectural_overview: |
  This is a TypeScript monorepo using pnpm workspaces.
  Core packages are in /packages, with shared utilities in /packages/shared.

# Profile definitions for file ordering
profiles:
  documentation-first:
    layout:
      - "README.md"
      - "CONTRIBUTING.md"
      - "docs/**/*.md"
      - "src/**/*.ts"

  api-focused:
    layout:
      - "src/api/**/*.ts"
      - "src/types/**/*.ts"
      - "src/lib/**/*.ts"

# Enhanced presets with headers/footers
presets:
  code-review:
    include:
      - "src/**/*.ts"
    exclude:
      - "**/*.test.ts"
    header: |
      ## Code Review Task
      Please review this code for quality and potential issues.
    footer: |
      ## Review Guidelines
      - Focus on logic errors and edge cases
      - Check for security vulnerabilities
```

### getBuiltInPreset()

Get a built-in preset by name.

**Signature:**

```typescript
function getBuiltInPreset(name: string): RollerPreset | undefined
```

**Parameters:**

- `name` - Preset name

**Returns:**

`RollerPreset` object or `undefined` if not found.

**Example:**

```typescript
import { getBuiltInPreset } from 'repo-roller'

const tsPreset = getBuiltInPreset('typescript')
console.log(tsPreset.extensions)  // ['ts', 'tsx']
console.log(tsPreset.exclude)     // ['**/*.test.ts', 'dist/**', ...]

const pyPreset = getBuiltInPreset('python')
console.log(pyPreset.extensions)  // ['py', 'pyi']
```

**Available built-in presets:**

- `llm` - Optimized for LLM consumption
- `minimal` - Minimal output with no extras
- `full` - Include everything with all metadata
- `typescript` / `ts` - TypeScript projects
- `javascript` / `js` - JavaScript projects
- `python` / `py` - Python projects
- `go` - Go projects
- `rust` - Rust projects
- `docs` - Documentation files only

## Type Definitions

### RollerConfig

Configuration from `repo-roller.config.mjs`.

```typescript
interface RollerConfig {
  readonly root: string
  readonly presets?: Record<string, RollerPreset>
  readonly defaultPreset?: string
}
```

### RepoRollerYmlConfig

Configuration from `.reporoller.yml`.

```typescript
interface RepoRollerYmlConfig {
  readonly architectural_overview?: string
  readonly profiles?: Record<string, ProfileConfig>
  readonly presets?: Record<string, RollerPreset>
}
```

### ProfileConfig

Profile configuration for file ordering.

```typescript
interface ProfileConfig {
  readonly layout: readonly string[]  // Ordered glob patterns
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
  readonly sort?: 'path' | 'size' | 'extension'
  // Enhanced fields
  readonly description?: string
  readonly header?: string
  readonly footer?: string
  readonly addOutlines?: boolean
}
```

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
  readonly sort?: 'path' | 'size' | 'extension'
  readonly interactive?: boolean
  readonly preset?: string
  readonly profile?: string
  readonly format?: 'md' | 'json' | 'yaml' | 'txt'
  // ... and more (see types.ts for full definition)
}
```

### ResolvedOptions

Fully resolved configuration.

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
  readonly sort: 'path' | 'size' | 'extension'
  readonly interactive: boolean
  readonly verbose: boolean
  readonly presetName?: string
  readonly profile: string
  readonly format: 'md' | 'json' | 'yaml' | 'txt'
  readonly repoRollerConfig?: RepoRollerYmlConfig
  // ... and more (see types.ts for full definition)
}
```

## Configuration Sources

### 1. Hardcoded Defaults

Base defaults used when nothing else is specified:

```typescript
const DEFAULT_OPTIONS = {
  outFile: 'source_code.md',
  include: [],
  exclude: [],
  extensions: [],
  maxFileSizeBytes: 1024 * 1024, // 1MB
  stripComments: false,
  withTree: true,
  withStats: true,
  sort: 'path',
  interactive: false,
  verbose: false,
  profile: 'llm-context',
  format: 'md',
  tokenCount: true,
  // ... more defaults
}
```

### 2. Built-in Presets

Predefined configurations for common use cases:

```typescript
// TypeScript preset
{
  extensions: ['ts', 'tsx'],
  exclude: [
    '**/*.test.ts',
    '**/*.spec.ts',
    'dist/**',
    'build/**',
    'node_modules/**'
  ],
  stripComments: false,
  withTree: true,
  withStats: true
}
```

### 3. Config File Presets

User-defined presets in `repo-roller.config.mjs`:

```javascript
export default {
  presets: {
    'backend-only': {
      include: ['server/**/*.ts', 'api/**/*.ts'],
      exclude: ['**/*.test.ts'],
      extensions: ['ts'],
      description: 'Backend TypeScript code only'
    }
  }
}
```

### 4. YAML Profiles

File ordering patterns in `.reporoller.yml`:

```yaml
profiles:
  api-first:
    layout:
      - "README.md"
      - "api/**/*.ts"
      - "lib/**/*.ts"
      - "**/*"
```

### 5. CLI Arguments

Highest priority - explicit user intent:

```bash
repo-roller --preset typescript --format json --strip-comments
```

## Resolution Examples

### Basic Resolution

```typescript
// Only defaults
const opts1 = resolveOptions({})
// Result: All defaults applied

// With preset
const opts2 = resolveOptions({ preset: 'typescript' })
// Result: TypeScript preset + defaults

// With CLI overrides
const opts3 = resolveOptions({
  preset: 'typescript',
  stripComments: true,  // Overrides preset
  format: 'json'        // Overrides default
})
// Result: TypeScript preset + CLI overrides + defaults
```

### Complex Resolution

```typescript
// Config file
const config = {
  defaultPreset: 'my-preset',
  presets: {
    'my-preset': {
      extensions: ['ts'],
      exclude: ['dist/**']
    }
  }
}

// YAML file
const yaml = {
  profiles: {
    'api-focused': {
      layout: ['api/**/*.ts', 'lib/**/*.ts']
    }
  }
}

// CLI args
const cli = {
  preset: 'my-preset',
  profile: 'api-focused',
  format: 'json'
}

const options = resolveOptions(cli, config, yaml)
// Result combines all sources:
// - extensions: ['ts'] from preset
// - exclude: ['dist/**'] from preset
// - layout: api-first ordering from profile
// - format: 'json' from CLI
```

### Preset Fallback Chain

```typescript
// CLI specifies preset name
const cli = { preset: 'custom-preset' }

// Resolution checks in order:
// 1. Built-in presets (getBuiltInPreset('custom-preset'))
// 2. Config file presets (config.presets['custom-preset'])
// 3. YAML presets (yaml.presets['custom-preset'])
// 4. If not found, warn user and use defaults

const options = resolveOptions(cli, config, yaml)
```

## Language Shortcuts

Map language names to file extensions:

```typescript
const options = resolveOptions({
  lang: 'typescript'  // Expands to extensions: ['ts', 'tsx']
})

const options2 = resolveOptions({
  lang: 'python'  // Expands to extensions: ['py', 'pyi']
})
```

**Supported languages:**

- `typescript` / `ts` → `['ts', 'tsx']`
- `javascript` / `js` → `['js', 'jsx', 'mjs', 'cjs']`
- `python` / `py` → `['py', 'pyi']`
- `go` → `['go']`
- `rust` / `rs` → `['rs']`
- `java` → `['java']`
- `cpp` → `['cpp', 'cc', 'cxx', 'hpp', 'h']`
- `c` → `['c', 'h']`
- `ruby` / `rb` → `['rb']`
- `php` → `['php']`
- `swift` → `['swift']`
- `kotlin` → `['kt', 'kts']`
- `scala` → `['scala']`
- `markdown` / `md` → `['md', 'mdx']`

## Quick Exclude Flags

Convenient flags for common exclusions:

### --no-tests

```typescript
const options = resolveOptions({ noTests: true })
// Adds: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**']
```

### --no-deps

```typescript
const options = resolveOptions({ noDeps: true })
// Adds: ['**/node_modules/**', '**/vendor/**', '**/.venv/**', '**/venv/**']
```

### --no-generated

```typescript
const options = resolveOptions({ noGenerated: true })
// Adds: ['**/dist/**', '**/build/**', '**/out/**', '**/.next/**', '**/target/**']
```

## Smart Output Naming

Auto-generate contextual output filenames:

```typescript
// Default: {project}-{date}.{ext}
const options = resolveOptions({
  root: '/home/user/my-project'
})
console.log(options.outFile)
// Output: "my-project-2025-11-19.md"

// With profile suffix
const options2 = resolveOptions({
  root: '/home/user/my-project',
  profile: 'api-focused'
})
console.log(options2.outFile)
// Output: "my-project-api-focused-2025-11-19.md"

// Nested directories (up to 4 levels)
const options3 = resolveOptions({
  root: '/home/user/monorepo/packages/api/src'
})
console.log(options3.outFile)
// Output: "monorepo-packages-api-src-2025-11-19.md"

// Custom template
const options4 = resolveOptions({
  outTemplate: '{project}-{profile}-{date}.{ext}'
})
```

## Integration Examples

### Load All Configuration

```typescript
import { loadConfig, loadRepoRollerYml, resolveOptions } from 'repo-roller'

async function loadFullConfig(root: string, cliArgs: CliOptions) {
  // Load all config sources
  const [config, yaml] = await Promise.all([
    loadConfig(root),
    loadRepoRollerYml(root)
  ])

  // Resolve final options
  const options = resolveOptions(cliArgs, config, yaml)

  // Log resolution
  if (config) {
    console.log('✓ Loaded repo-roller.config.mjs')
  }
  if (yaml) {
    console.log('✓ Loaded .reporoller.yml')
  }
  if (options.presetName) {
    console.log(`✓ Using preset: ${options.presetName}`)
  }
  if (options.profile !== 'llm-context') {
    console.log(`✓ Using profile: ${options.profile}`)
  }

  return options
}
```

### Validate Configuration

```typescript
import { loadConfig, validateRollerConfig } from 'repo-roller'

async function validateConfig(root: string) {
  const config = await loadConfig(root)

  if (config) {
    const result = validateRollerConfig(config)

    if (!result.valid) {
      console.error('Configuration errors:')
      for (const error of result.errors) {
        console.error(`  ${error.field}: ${error.message}`)
        console.error(`  Fix: ${error.suggestion}`)
      }
      return false
    }

    console.log('✓ Configuration is valid')
    return true
  }

  return true // No config file is valid
}
```

### List Available Presets

```typescript
import { loadConfig, loadRepoRollerYml, listBuiltInPresets } from 'repo-roller'

async function listAllPresets(root: string) {
  const [config, yaml] = await Promise.all([
    loadConfig(root),
    loadRepoRollerYml(root)
  ])

  const builtIn = listBuiltInPresets()
  const userPresets = config?.presets ? Object.keys(config.presets) : []
  const yamlPresets = yaml?.presets ? Object.keys(yaml.presets) : []

  console.log('Built-in presets:', builtIn.join(', '))
  if (userPresets.length > 0) {
    console.log('User presets:', userPresets.join(', '))
  }
  if (yamlPresets.length > 0) {
    console.log('YAML presets:', yamlPresets.join(', '))
  }
}
```

### Merge Custom Defaults

```typescript
function resolveWithDefaults(
  cli: CliOptions,
  customDefaults: Partial<CliOptions>
) {
  // Merge custom defaults with CLI args
  const merged = { ...customDefaults, ...cli }

  return resolveOptions(merged)
}

// Usage
const options = resolveWithDefaults(
  { root: '.' },
  {
    stripComments: true,  // Custom default
    format: 'json',       // Custom default
    withTree: false       // Custom default
  }
)
```

## Error Handling

### Missing Configuration

```typescript
const config = await loadConfig('./nonexistent')
// Returns: undefined (not an error)

if (!config) {
  console.log('No config file found, using defaults')
}
```

### Invalid Preset

```typescript
const options = resolveOptions({ preset: 'nonexistent-preset' })
// Warns: "WARNING: Preset 'nonexistent-preset' not found. Using defaults instead."
// Warns: "Available presets: llm, typescript, python, ..."
// Returns: Options with defaults applied
```

### Malformed Config

```typescript
try {
  const config = await loadConfig(root)
} catch (error) {
  console.error('Failed to load config:', error.message)
  // Use defaults or exit
}
```

## Related APIs

- [Validation API](/api/validation) - Validate configuration
- [Types API](/api/types) - TypeScript type definitions
- [Scanning API](/api/scanning) - Use resolved options

## See Also

- [Configuration Guide](/guide/configuration)
- [Presets Guide](/guide/presets)
- [Profiles Guide](/guide/profiles)
