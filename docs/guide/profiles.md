# Profiles

Profiles allow you to define custom file ordering layouts in your project, ensuring files appear in the most logical order for your use case.

## What Are Profiles?

Profiles are named configurations that specify:
- **Layout ordering** - Which files appear first
- **Architectural context** - Project structure overview
- **Custom presets** - Project-specific configurations

Profiles are defined in `.reporoller.yml` in your project root.

## Basic Profile

### Create .reporoller.yml

```yaml
profiles:
  default:
    layout:
      - README.md
      - package.json
      - src/index.ts
      - src/**/*.ts
      - "**/*.ts"
```

### Use the Profile

```bash
repo-roller --profile default
```

## Layout Ordering

Layouts use glob patterns to define file order. Files match the first pattern they satisfy.

### Simple Layout

```yaml
profiles:
  simple:
    layout:
      - "*.md"           # All markdown files first
      - "src/**/*.ts"    # Then TypeScript in src/
      - "**/*"           # Then everything else
```

### Priority-Based Layout

```yaml
profiles:
  priority:
    layout:
      # 1. Documentation
      - README.md
      - CONTRIBUTING.md

      # 2. Configuration
      - package.json
      - tsconfig.json

      # 3. Entry points
      - src/index.ts
      - src/cli.ts

      # 4. Core modules
      - src/core/**/*.ts

      # 5. CLI modules
      - src/cli/**/*.ts

      # 6. Components
      - src/components/**/*.tsx

      # 7. Everything else
      - "**/*"
```

## Common Layout Patterns

### Core-First Layout

Show core business logic before supporting code:

```yaml
profiles:
  core-first:
    layout:
      - src/core/**/*.ts
      - src/lib/**/*.ts
      - src/utils/**/*.ts
      - src/cli/**/*.ts
      - src/components/**/*
      - "**/*"
```

### API-First Layout

Highlight API definitions:

```yaml
profiles:
  api-first:
    layout:
      - src/api/**/*.ts
      - src/types/**/*.ts
      - src/models/**/*.ts
      - src/services/**/*.ts
      - "**/*"
```

### Feature-Based Layout

Organize by feature:

```yaml
profiles:
  features:
    layout:
      - src/features/auth/**/*
      - src/features/users/**/*
      - src/features/posts/**/*
      - src/shared/**/*
      - "**/*"
```

### Config-First Layout

Show configuration before code:

```yaml
profiles:
  config-first:
    layout:
      - "*.json"
      - "*.yaml"
      - "*.yml"
      - "*.config.*"
      - ".env.example"
      - src/**/*
```

## Architectural Overview

Add context about your project structure:

```yaml
architectural_overview: |
  # Project Architecture

  This project follows a clean architecture pattern:

  - **core/** - Business logic, no external dependencies
  - **cli/** - Command-line interface layer
  - **components/** - React/Ink UI components
  - **api/** - REST API endpoints

  Entry points:
  - `src/cli.ts` - CLI entry
  - `src/index.ts` - Library entry

profiles:
  default:
    layout:
      - src/core/**/*.ts
      - src/cli/**/*.ts
      - src/components/**/*
```

The architectural overview appears at the top of generated output.

## Advanced Profiles

### Multiple Profiles

Define multiple profiles for different scenarios:

```yaml
profiles:
  # For code review
  review:
    layout:
      - src/core/**/*.ts
      - src/cli/**/*.ts
      - tests/**/*.test.ts

  # For documentation
  docs:
    layout:
      - README.md
      - "**/*.md"
      - src/**/*.ts

  # For LLM context
  llm:
    layout:
      - package.json
      - src/index.ts
      - src/core/**/*.ts
      - src/**/*.ts
```

### Profile with Presets

Combine layout with preset configuration:

```yaml
profiles:
  production:
    layout:
      - src/core/**/*.ts
      - src/**/*.ts

presets:
  prod-review:
    description: "Production code review bundle"
    extensions: ['ts', 'tsx']
    stripComments: true
    withTree: true
    withStats: true
    header: |
      # Production Code Review
      Core modules and business logic only.
```

Use together:

```bash
repo-roller --profile production --preset prod-review
```

## Using Profiles

### Command Line

```bash
# Use named profile
repo-roller --profile core-first

# List available profiles
repo-roller --list-profiles

# Show profile details
repo-roller --show-profile core-first

# Combine with other options
repo-roller --profile api-first --format json
```

### In Config Files

Reference profiles in `repo-roller.config.mjs`:

```javascript
export default {
  defaultProfile: 'core-first',

  presets: {
    mypreset: {
      profile: 'api-first',
      include: ['src/**/*.ts']
    }
  }
};
```

## Pattern Matching

### Glob Pattern Syntax

| Pattern | Matches | Example |
|---------|---------|---------|
| `*` | Any characters (except `/`) | `*.ts` matches `index.ts` |
| `**` | Any directories | `src/**/*.ts` matches `src/a/b.ts` |
| `?` | Single character | `file?.ts` matches `file1.ts` |
| `{a,b}` | Alternatives | `*.{js,ts}` matches both |
| `[abc]` | Character set | `file[123].ts` |
| `!(pattern)` | Negation | `!(*.test).ts` |

### Pattern Priority

Files are matched in order:

```yaml
profiles:
  example:
    layout:
      - src/index.ts      # Matches first
      - src/**/*.ts       # Matches second
      - "**/*.ts"         # Matches third
```

A file matching `src/index.ts` will appear first, even though it also matches the other patterns.

## Examples

### Example 1: Monorepo Layout

```yaml
profiles:
  monorepo:
    layout:
      - package.json
      - lerna.json
      - packages/core/**/*.ts
      - packages/cli/**/*.ts
      - packages/ui/**/*.tsx
      - packages/**/*
```

### Example 2: Microservices Layout

```yaml
profiles:
  microservices:
    layout:
      - services/auth/**/*.ts
      - services/users/**/*.ts
      - services/billing/**/*.ts
      - shared/**/*.ts
      - "**/*"
```

### Example 3: Documentation-First

```yaml
profiles:
  docs-first:
    layout:
      - README.md
      - docs/**/*.md
      - "**/*.md"
      - src/**/*.ts
```

### Example 4: Tests Alongside Code

```yaml
profiles:
  with-tests:
    layout:
      - src/core/index.ts
      - src/core/index.test.ts
      - src/core/**/*.ts
      - src/core/**/*.test.ts
      - src/**/*.ts
      - src/**/*.test.ts
```

## Best Practices

### 1. Start Specific, End General

```yaml
# Good
layout:
  - src/index.ts          # Specific
  - src/core/**/*.ts      # More specific
  - src/**/*.ts           # General
  - "**/*"                # Catch-all

# Bad (general patterns first)
layout:
  - "**/*"                # Matches everything
  - src/core/**/*.ts      # Never matches
```

### 2. Include Catch-All

Always end with `"**/*"` to include unmatched files:

```yaml
layout:
  - src/core/**/*.ts
  - src/**/*.ts
  - "**/*"               # Include everything else
```

### 3. Use Descriptive Names

```yaml
# Good
profiles:
  api-review:
    layout: [...]

  production-deploy:
    layout: [...]

# Bad
profiles:
  profile1:
    layout: [...]
```

### 4. Document Your Layouts

```yaml
architectural_overview: |
  Layout explanation:
  - Core modules first (business logic)
  - CLI layer second (user interface)
  - Tests last (verification)

profiles:
  default:
    layout:
      - src/core/**/*.ts
      - src/cli/**/*.ts
      - tests/**/*.test.ts
```

## Troubleshooting

### Files not in expected order

**Problem:** Files appear in wrong order

**Solution:** Check pattern specificity. More specific patterns should come first:

```yaml
# Correct order
layout:
  - src/index.ts          # Most specific
  - src/core/**/*.ts
  - src/**/*.ts           # Least specific
```

### Files missing from output

**Problem:** Some files don't appear

**Solution:** Add catch-all pattern:

```yaml
layout:
  - src/**/*.ts
  - "**/*"                # Catch unmatched files
```

### Pattern not matching

**Problem:** Pattern doesn't match expected files

**Solution:** Test your patterns:

```bash
# Preview what files match
repo-roller --profile myprofile --dry-run --verbose
```

## Next Steps

- **[Configuration Files](/guide/configuration)** - Configure repo-roller
- **[Presets](/guide/presets)** - Pre-configured settings
- **[File Scanning](/guide/file-scanning)** - Understand file selection
- **[Examples](/guide/examples)** - Real-world use cases

## Related

- [User Settings](/guide/user-settings)
- [CLI Reference](/cli/)
