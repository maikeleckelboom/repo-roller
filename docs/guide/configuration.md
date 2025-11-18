# Configuration

repo-roller supports multiple configuration methods to suit different workflows.

## Configuration Priority

Configuration is resolved in this order (highest to lowest priority):

1. **Command-line arguments** - Explicit CLI flags
2. **Profile** - From `.reporoller.yml` (if `--profile` specified)
3. **Preset** - From config or built-in (if `--preset` specified)
4. **Config file** - `repo-roller.config.mjs`
5. **User settings** - `~/.config/repo-roller/settings.json`
6. **Defaults** - Built-in defaults

## Configuration Files

### repo-roller.config.mjs

Create custom presets and default options.

**Location:** Project root

**Example:**

```javascript
// repo-roller.config.mjs
export default {
  // Default options for all generations
  defaults: {
    format: 'markdown',
    includeTree: true,
    includeStats: true,
    stripComments: false
  },

  // Custom presets
  presets: {
    'my-preset': {
      description: 'My custom TypeScript preset',
      extensions: ['ts', 'tsx'],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/dist/**'
      ],
      stripComments: true,
      maxSize: 100 // KB
    },

    'api-docs': {
      description: 'API documentation bundle',
      include: [
        'src/api/**/*.ts',
        'src/types/**/*.ts',
        'README.md'
      ],
      exclude: ['**/*.test.ts'],
      format: 'json',
      stripComments: false
    },

    'minimal': {
      description: 'Minimal output for cost optimization',
      stripComments: true,
      includeTree: false,
      includeStats: false,
      compact: true,
      maxTokens: 50000
    }
  },

  // Token estimation defaults
  tokenEstimation: {
    defaultProvider: 'claude-3.5-sonnet',
    warnThreshold: 150000
  },

  // Output defaults
  output: {
    template: '{repo}-{date}.md',
    directory: './bundles'
  }
}
```

**Generate config file:**
```bash
repo-roller init
```

### .reporoller.yml

Define profiles with file ordering and custom presets.

**Location:** Project root

**Example:**

```yaml
# Project description (optional)
architectural_overview: |
  This is a TypeScript project for code aggregation.
  Core modules are in src/core/, CLI in src/cli/.

# Profiles define file ordering
profiles:
  # Profile for code review - core files first
  core-first:
    description: "Core architecture first"
    layout:
      - package.json
      - tsconfig.json
      - src/index.ts
      - src/core/**/*.ts
      - src/cli/**/*.ts
      - src/**/*.ts

  # Profile for documentation
  docs-first:
    description: "Documentation and types first"
    layout:
      - README.md
      - docs/**/*.md
      - src/types.ts
      - src/**/*.ts

  # Profile for API review
  api-focus:
    description: "API and types only"
    layout:
      - src/api/**/*.ts
      - src/types/**/*.ts
      - src/core/types.ts

# Custom presets (can also be in config.mjs)
presets:
  bug-report:
    description: "Bundle for bug reports"
    include:
      - "src/**/*.ts"
      - "tests/**/*.test.ts"
    stripComments: false
    includeTree: true
    header: |
      ## Bug Report Context

      The following code is related to the reported issue.

    footer: |
      ## Instructions

      Please analyze the code and identify the bug.

  code-review:
    description: "Code review bundle"
    include:
      - "src/**/*.ts"
    exclude:
      - "**/*.test.ts"
    stripComments: false
    maxTokens: 150000
    header: |
      ## Code Review Request

      Please review the following code for:
      - Best practices
      - Performance issues
      - Security vulnerabilities
      - Code organization
```

**Use a profile:**
```bash
repo-roller --profile core-first
```

**Use a preset from .reporoller.yml:**
```bash
repo-roller --preset bug-report
```

### User Settings

Global user preferences stored in home directory.

**Location:** `~/.config/repo-roller/settings.json`

**Example:**

```json
{
  "display": {
    "showGenerationSummary": true,
    "showCodeComposition": true,
    "showContextFit": true,
    "showHealthHints": true
  },
  "interactive": {
    "defaultStripComments": false,
    "defaultIncludeTree": true,
    "defaultIncludeStats": true
  },
  "treeView": {
    "showExcludedFiles": false,
    "expandDepth": 2
  },
  "tokenEstimation": {
    "defaultTarget": "claude-3.5-sonnet"
  }
}
```

**Manage settings:**
```bash
# Open settings TUI
repo-roller settings

# View settings
repo-roller settings show

# Reset to defaults
repo-roller settings reset
```

## Built-in Presets

repo-roller includes presets for common scenarios:

### Language Presets

#### TypeScript (`ts`)
```bash
repo-roller --preset ts
```
- Extensions: `.ts`, `.tsx`
- Excludes: tests, deps, generated files

#### JavaScript (`js`)
```bash
repo-roller --preset js
```
- Extensions: `.js`, `.jsx`, `.mjs`, `.cjs`
- Excludes: tests, deps, generated files

#### Python (`python`)
```bash
repo-roller --preset python
```
- Extensions: `.py`, `.pyi`
- Excludes: `__pycache__`, `.pyc`, tests

#### Go (`go`)
```bash
repo-roller --preset go
```
- Extensions: `.go`
- Excludes: `vendor/`, tests

#### Rust (`rust`)
```bash
repo-roller --preset rust
```
- Extensions: `.rs`
- Excludes: `target/`, tests

### Use Case Presets

#### Documentation (`docs`)
```bash
repo-roller --preset docs
```
- Extensions: `.md`, `.mdx`, `.txt`
- Includes: README, documentation files

#### LLM (`llm`)
```bash
repo-roller --preset llm
```
- Common code file extensions
- 2 MB file size limit
- Excludes: tests, deps, generated

#### Minimal (`minimal`)
```bash
repo-roller --preset minimal
```
- Strips comments
- No tree or stats
- Compact output
- Smaller file limit

#### Full (`full`)
```bash
repo-roller --preset full
```
- All files (respects .gitignore)
- Includes everything
- Maximum context

**List all presets:**
```bash
repo-roller --list-presets
```

**Show preset details:**
```bash
repo-roller --show-preset typescript
```

## Model Presets

Optimized configurations for specific LLM models:

```bash
# Claude 3.5 Sonnet
repo-roller --model claude-sonnet

# GPT-4 Turbo
repo-roller --model gpt-4

# Gemini 1.5 Pro
repo-roller --model gemini
```

Model presets include:
- Optimal token limit (80% of context)
- Target provider setting
- Recommended format
- Strip comments if beneficial

## Validation

Validate configuration before running:

```bash
# Validate config files
repo-roller --validate

# Show validation errors
repo-roller --validate --verbose
```

**Example validation output:**
```
Validating configuration...

✓ repo-roller.config.mjs is valid
✓ .reporoller.yml is valid

Warnings:
⚠ Preset 'my-preset' has no description
⚠ Profile 'core-first' layout includes non-existent files

Configuration is valid with 2 warnings.
```

## Environment Variables

Override settings with environment variables:

```bash
# Default target provider
export REPO_ROLLER_TARGET=claude-3.5-sonnet

# Default output directory
export REPO_ROLLER_OUTPUT_DIR=./bundles

# Config file location
export REPO_ROLLER_CONFIG=/path/to/config.mjs

# Disable color output
export NO_COLOR=1

# Debug mode
export DEBUG=repo-roller:*
```

## Examples

### Example 1: Project-Specific Config

```javascript
// repo-roller.config.mjs
export default {
  defaults: {
    format: 'markdown',
    stripComments: true,
    maxTokens: 150000
  },

  presets: {
    'frontend': {
      include: ['src/components/**', 'src/pages/**'],
      extensions: ['tsx', 'css']
    },

    'backend': {
      include: ['src/api/**', 'src/services/**'],
      extensions: ['ts']
    }
  }
}
```

Usage:
```bash
repo-roller --preset frontend
repo-roller --preset backend
```

### Example 2: Multi-Profile Workflow

```yaml
# .reporoller.yml
profiles:
  onboarding:
    description: "New developer onboarding"
    layout:
      - README.md
      - CONTRIBUTING.md
      - docs/ARCHITECTURE.md
      - src/index.ts
      - src/core/**/*.ts

  security-audit:
    description: "Security-sensitive code"
    layout:
      - src/auth/**/*.ts
      - src/security/**/*.ts
      - src/middleware/auth.ts

  performance-review:
    description: "Performance-critical code"
    layout:
      - src/core/engine.ts
      - src/utils/performance.ts
      - src/optimization/**/*.ts
```

Usage:
```bash
repo-roller --profile onboarding
repo-roller --profile security-audit
repo-roller --profile performance-review
```

### Example 3: Team Settings

```json
// ~/.config/repo-roller/settings.json
{
  "display": {
    "showCodeComposition": true,
    "showContextFit": true,
    "showCost": true
  },
  "tokenEstimation": {
    "defaultTarget": "claude-3.5-sonnet",
    "warnThreshold": 150000
  }
}
```

## Best Practices

### 1. Use Profiles for File Ordering

When order matters (e.g., onboarding docs), use profiles:
```yaml
profiles:
  learning:
    layout:
      - README.md
      - docs/getting-started.md
      - src/core/index.ts
      - src/**/*.ts
```

### 2. Create Presets for Common Tasks

Define reusable presets in config:
```javascript
presets: {
  'pr-review': {
    include: ['src/**/*.ts'],
    exclude: ['**/*.test.ts'],
    maxTokens: 100000
  }
}
```

### 3. Set Sensible Defaults

Configure defaults for your team:
```javascript
defaults: {
  format: 'markdown',
  stripComments: true,
  includeTree: true
}
```

### 4. Validate Configuration in CI

```bash
# In CI pipeline
repo-roller --validate || exit 1
```

### 5. Document Custom Presets

```javascript
presets: {
  'custom': {
    description: 'Detailed description of what this preset does',
    // ... options
  }
}
```

## Next Steps

- **[Presets Guide](/guide/presets)** - Learn more about presets
- **[Profiles Guide](/guide/profiles)** - Advanced profile usage
- **[CLI Reference](/cli/)** - All configuration options
- **[Examples](/guide/examples)** - Real-world configurations
