# Presets

Presets are pre-configured option sets for common use cases. They make it easy to generate bundles without specifying every option.

## Using Presets

```bash
# Use a built-in preset
repo-roller --preset typescript

# List available presets
repo-roller --list-presets

# Show preset details
repo-roller --show-preset typescript
```

## Built-in Presets

### Language-Specific Presets

#### TypeScript (`ts` / `typescript`)

Optimized for TypeScript projects.

```bash
repo-roller --preset ts
```

**Configuration:**
```javascript
{
  extensions: ['ts', 'tsx'],
  exclude: [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ],
  stripComments: false,
  includeTree: true,
  includeStats: true
}
```

**Use cases:**
- TypeScript project analysis
- Code review
- Documentation generation

---

#### JavaScript (`js` / `javascript`)

Optimized for JavaScript projects.

```bash
repo-roller --preset js
```

**Configuration:**
```javascript
{
  extensions: ['js', 'jsx', 'mjs', 'cjs'],
  exclude: [
    '**/*.test.js',
    '**/*.spec.js',
    '**/node_modules/**',
    '**/dist/**'
  ]
}
```

---

#### Python (`python` / `py`)

Optimized for Python projects.

```bash
repo-roller --preset python
```

**Configuration:**
```javascript
{
  extensions: ['py', 'pyi'],
  exclude: [
    '**/__pycache__/**',
    '**/*.pyc',
    '**/test_*.py',
    '**/*_test.py',
    '**/venv/**',
    '**/.venv/**'
  ]
}
```

---

#### Go (`go`)

Optimized for Go projects.

```bash
repo-roller --preset go
```

**Configuration:**
```javascript
{
  extensions: ['go'],
  exclude: [
    '**/vendor/**',
    '**/*_test.go'
  ]
}
```

---

#### Rust (`rust` / `rs`)

Optimized for Rust projects.

```bash
repo-roller --preset rust
```

**Configuration:**
```javascript
{
  extensions: ['rs'],
  exclude: [
    '**/target/**',
    '**/*_test.rs'
  ]
}
```

---

### Use Case Presets

#### Documentation (`docs`)

Extract documentation files.

```bash
repo-roller --preset docs
```

**Configuration:**
```javascript
{
  extensions: ['md', 'mdx', 'txt'],
  include: [
    '**/*.md',
    '**/docs/**',
    'README*',
    'CONTRIBUTING*'
  ],
  stripComments: false,
  format: 'markdown'
}
```

**Use cases:**
- Documentation extraction
- README aggregation
- Guide compilation

---

#### LLM (`llm`)

Optimized for LLM input (common code files).

```bash
repo-roller --preset llm
```

**Configuration:**
```javascript
{
  extensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c', 'h'],
  exclude: [
    '**/*.test.*',
    '**/*.spec.*',
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ],
  maxSize: 2000, // 2 MB limit
  stripComments: false,
  includeTree: true
}
```

**Use cases:**
- General LLM input
- Multi-language projects
- Comprehensive code analysis

---

#### Minimal (`minimal`)

Minimal output for cost optimization.

```bash
repo-roller --preset minimal
```

**Configuration:**
```javascript
{
  stripComments: true,
  includeTree: false,
  includeStats: false,
  compact: true,
  maxSize: 100, // 100 KB limit
  exclude: [
    '**/*.test.*',
    '**/*.spec.*'
  ]
}
```

**Use cases:**
- Cost-sensitive operations
- Quick scans
- Token-limited scenarios

---

#### Full (`full`)

Include everything (respects .gitignore).

```bash
repo-roller --preset full
```

**Configuration:**
```javascript
{
  include: ['**/*'],
  stripComments: false,
  includeTree: true,
  includeStats: true
}
```

**Use cases:**
- Complete codebase snapshot
- Comprehensive analysis
- Maximum context

---

## Custom Presets

Create custom presets in `repo-roller.config.mjs`:

```javascript
// repo-roller.config.mjs
export default {
  presets: {
    // Custom preset name
    'my-frontend': {
      description: 'Frontend code only',
      extensions: ['tsx', 'ts', 'css', 'scss'],
      include: [
        'src/components/**',
        'src/pages/**',
        'src/styles/**'
      ],
      exclude: [
        '**/*.test.tsx',
        '**/*.stories.tsx'
      ],
      stripComments: true,
      maxTokens: 100000
    },

    'api-review': {
      description: 'Backend API code',
      include: [
        'src/api/**/*.ts',
        'src/services/**/*.ts',
        'src/types/**/*.ts'
      ],
      exclude: ['**/*.test.ts'],
      format: 'json',
      stripComments: false
    },

    'security-audit': {
      description: 'Security-sensitive code',
      include: [
        'src/auth/**',
        'src/security/**',
        'src/middleware/auth.ts'
      ],
      stripComments: false,
      includeTree: false,
      header: '## Security Audit\n\nPlease review for vulnerabilities.',
      footer: '## Focus Areas\n\n- Authentication\n- Authorization\n- Input validation'
    }
  }
}
```

**Use custom preset:**
```bash
repo-roller --preset my-frontend
```

## Preset Composition

Combine presets with other options:

```bash
# TypeScript preset + custom output
repo-roller --preset ts -o bundle.md

# Minimal preset + specific includes
repo-roller --preset minimal --include "src/core/**"

# LLM preset + token budget
repo-roller --preset llm --max-tokens 150000

# Python preset + git diff
repo-roller --preset python --diff main
```

## Preset Options

Presets can configure any CLI option:

```javascript
{
  // File selection
  extensions: ['ts', 'tsx'],
  include: ['src/**'],
  exclude: ['**/*.test.*'],
  maxSize: 100,

  // Content
  stripComments: true,
  includeTree: true,
  includeStats: true,
  sort: 'path',

  // Output
  format: 'markdown',
  compact: false,
  indent: 2,
  toc: true,
  frontMatter: true,

  // Token management
  maxTokens: 100000,
  maxCost: 5.00,
  target: 'claude-3.5-sonnet',

  // Custom content
  header: '# Custom Header',
  footer: '# Custom Footer',

  // Metadata
  description: 'Preset description'
}
```

## Advanced Preset Examples

### Example 1: Multi-Stage Analysis

```javascript
// repo-roller.config.mjs
export default {
  presets: {
    'stage-1-core': {
      description: 'Stage 1: Core architecture',
      include: ['src/core/**/*.ts'],
      maxTokens: 50000
    },

    'stage-2-features': {
      description: 'Stage 2: Feature implementations',
      include: ['src/features/**/*.ts'],
      exclude: ['**/*.test.ts'],
      maxTokens: 100000
    },

    'stage-3-integration': {
      description: 'Stage 3: Integration layer',
      include: ['src/integration/**/*.ts', 'src/api/**/*.ts'],
      maxTokens: 50000
    }
  }
}
```

Usage:
```bash
repo-roller --preset stage-1-core -o stage-1.md
repo-roller --preset stage-2-features -o stage-2.md
repo-roller --preset stage-3-integration -o stage-3.md
```

### Example 2: Stakeholder-Specific

```javascript
presets: {
  'for-developers': {
    description: 'Technical implementation details',
    include: ['src/**/*.ts'],
    stripComments: false,
    includeTree: true,
    format: 'markdown',
    toc: true
  },

  'for-management': {
    description: 'High-level overview',
    include: ['README.md', 'docs/**/*.md'],
    format: 'markdown',
    header: '# Project Overview for Management'
  },

  'for-security': {
    description: 'Security review bundle',
    include: [
      'src/auth/**',
      'src/security/**',
      'src/**/middleware/auth*.ts'
    ],
    stripComments: false,
    header: '# Security Review Bundle\n\nFocus: Authentication & Authorization'
  }
}
```

### Example 3: Environment-Specific

```javascript
presets: {
  'development': {
    description: 'Development bundle',
    include: ['src/**/*.ts', 'tests/**/*.test.ts'],
    stripComments: false,
    includeStats: true
  },

  'production': {
    description: 'Production code only',
    include: ['src/**/*.ts'],
    exclude: [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/mocks/**',
      '**/fixtures/**'
    ],
    stripComments: true
  },

  'ci': {
    description: 'CI/CD pipeline bundle',
    include: [
      'src/**/*.ts',
      '.github/workflows/**'
    ],
    format: 'json',
    compact: true
  }
}
```

## Preset Best Practices

### 1. Add Descriptions

Always include descriptions:
```javascript
presets: {
  'custom': {
    description: 'Clear description of purpose and use case',
    // ...
  }
}
```

### 2. Focus on Use Cases

Create presets for specific workflows:
```javascript
presets: {
  'pr-review': { /* ... */ },
  'bug-investigation': { /* ... */ },
  'documentation': { /* ... */ }
}
```

### 3. Set Sensible Defaults

Include common options:
```javascript
presets: {
  'custom': {
    stripComments: true,
    includeTree: true,
    maxTokens: 150000,
    // ...
  }
}
```

### 4. Use Naming Conventions

- Language: `typescript`, `python`, `go`
- Use case: `docs`, `api-review`, `security-audit`
- Environment: `dev`, `prod`, `ci`

### 5. Document in Team Docs

```markdown
## Available Presets

- `--preset frontend` - Frontend code (React components, styles)
- `--preset backend` - Backend code (API, services, database)
- `--preset full-stack` - Complete application
```

## Sharing Presets

### Team Presets

Commit `repo-roller.config.mjs` to share with team:

```javascript
// repo-roller.config.mjs (committed to repo)
export default {
  presets: {
    'team-standard': {
      description: 'Team standard for code review',
      // ...
    }
  }
}
```

### Global Presets

Create global presets in user config:

```javascript
// ~/.config/repo-roller/config.mjs
export default {
  presets: {
    'personal-default': {
      description: 'My personal default settings',
      // ...
    }
  }
}
```

## Preset Discovery

```bash
# List all presets (built-in + custom)
repo-roller --list-presets

# Show preset configuration
repo-roller --show-preset typescript

# Validate presets
repo-roller --validate
```

## Next Steps

- **[Profiles Guide](/guide/profiles)** - Learn about profiles for file ordering
- **[Configuration Guide](/guide/configuration)** - Comprehensive config reference
- **[Examples](/guide/examples)** - Real-world preset usage
- **[CLI Reference](/cli/)** - All available options for presets
