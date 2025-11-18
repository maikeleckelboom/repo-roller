# File Selection

Control which files are included in the generated output.

## Include Patterns

### `-i, --include <patterns...>`

Include files matching glob patterns (can be specified multiple times).

```bash
# Include TypeScript files
repo-roller --include "**/*.ts"

# Multiple patterns
repo-roller --include "src/**/*.ts" --include "lib/**/*.js"

# Short form
repo-roller -i "**/*.ts" -i "**/*.tsx"
```

**Pattern syntax:**
- `*` - Matches any characters except `/`
- `**` - Matches any characters including `/`
- `?` - Matches single character
- `[abc]` - Matches any character in set
- `{a,b}` - Matches either pattern

**Examples:**
```bash
# All TypeScript files
--include "**/*.ts"

# Specific directory
--include "src/core/**/*.ts"

# Multiple extensions
--include "**/*.{ts,tsx,js,jsx}"

# Exclude subdirectory
--include "src/**/*.ts" --exclude "src/tests/**"
```

## Exclude Patterns

### `-x, --exclude <patterns...>`

Exclude files matching glob patterns.

```bash
# Exclude test files
repo-roller --exclude "**/*.test.ts"

# Multiple patterns
repo-roller --exclude "**/*.test.ts" --exclude "**/*.spec.ts"

# Short form
repo-roller -x "**/*.test.*" -x "**/dist/**"
```

**Common exclusions:**
```bash
# Tests
--exclude "**/*.test.*" --exclude "**/*.spec.*"

# Build outputs
--exclude "**/dist/**" --exclude "**/build/**"

# Dependencies
--exclude "**/node_modules/**"

# IDE files
--exclude "**/.idea/**" --exclude "**/.vscode/**"
```

## Quick Filters

Convenient shortcuts for common exclusions.

### `--no-tests`

Exclude test files.

```bash
repo-roller --no-tests
```

**Equivalent to:**
```bash
--exclude "**/*.test.*" \
--exclude "**/*.spec.*" \
--exclude "**/tests/**" \
--exclude "**/__tests__/**"
```

### `--no-deps`

Exclude dependency directories.

```bash
repo-roller --no-deps
```

**Equivalent to:**
```bash
--exclude "**/node_modules/**" \
--exclude "**/vendor/**" \
--exclude "**/bower_components/**"
```

### `--no-generated`

Exclude generated directories.

```bash
repo-roller --no-generated
```

**Equivalent to:**
```bash
--exclude "**/dist/**" \
--exclude "**/build/**" \
--exclude "**/out/**" \
--exclude "**/.next/**" \
--exclude "**/.nuxt/**"
```

### Combining Quick Filters

```bash
repo-roller --no-tests --no-deps --no-generated
```

## Extension Filter

### `--ext <extensions>`

Filter by file extensions (comma-separated).

```bash
# TypeScript files only
repo-roller --ext ts,tsx

# JavaScript files
repo-roller --ext js,jsx,mjs,cjs

# Multiple types
repo-roller --ext ts,js,json
```

**Common combinations:**
```bash
# TypeScript project
--ext ts,tsx

# JavaScript project
--ext js,jsx,mjs

# Python project
--ext py,pyi

# Go project
--ext go

# Rust project
--ext rs

# Web assets
--ext html,css,scss,js
```

## Language Filter

### `--lang <languages>`

Filter by programming language.

```bash
# TypeScript files
repo-roller --lang typescript

# Multiple languages
repo-roller --lang typescript,javascript

# Python only
repo-roller --lang python
```

**Supported languages:**
- `typescript` - .ts, .tsx
- `javascript` - .js, .jsx, .mjs, .cjs
- `python` - .py, .pyi
- `go` - .go
- `rust` - .rs
- `java` - .java
- `csharp` - .cs
- `cpp` - .cpp, .cc, .cxx, .h, .hpp
- `ruby` - .rb
- `php` - .php
- `swift` - .swift
- `kotlin` - .kt, .kts
- `markdown` - .md, .mdx
- `json` - .json
- `yaml` - .yaml, .yml

## Size Limit

### `--max-size <kb>`

Exclude files larger than specified size in KB.

```bash
# Exclude files over 100 KB
repo-roller --max-size 100

# Exclude large files
repo-roller --max-size 500
```

**Use cases:**
```bash
# Avoid huge generated files
--max-size 200

# Keep bundle manageable
--max-size 100

# Focus on source files
--max-size 50
```

## Git Integration

### `--diff <ref>`

Include only files changed since git reference.

```bash
# Changes since last commit
repo-roller --diff HEAD~1

# Changes in current branch
repo-roller --diff main

# Changes since tag
repo-roller --diff v1.0.0

# Changes since specific commit
repo-roller --diff abc1234
```

### `--most-recent <n>`

Include N most recently committed files.

```bash
# Last 5 changed files
repo-roller --most-recent 5

# Last 10 files
repo-roller --most-recent 10
```

**Useful for:**
- Recent work review
- PR context
- Bug investigation
- Change analysis

## Default Exclusions

repo-roller automatically excludes:

### Version Control
- `.git/`
- `.svn/`
- `.hg/`

### Dependencies
- `node_modules/`
- `vendor/`
- `bower_components/`

### Build Outputs
- `dist/`
- `build/`
- `out/`
- `.next/`
- `.nuxt/`
- `target/` (Rust)

### IDE Files
- `.idea/`
- `.vscode/`
- `*.swp`
- `*.swo`

### OS Files
- `.DS_Store`
- `Thumbs.db`
- `desktop.ini`

### Binary Files
- `*.exe`
- `*.dll`
- `*.so`
- `*.dylib`
- `*.class`
- `*.jar`
- `*.zip`
- `*.tar.gz`

### .gitignore

Files and patterns in `.gitignore` are automatically excluded.

**Disable .gitignore:**
```bash
repo-roller --no-gitignore
```

## Examples

### Example 1: TypeScript Source Only

```bash
repo-roller \
  --ext ts,tsx \
  --no-tests \
  --no-deps \
  --exclude "**/dist/**"
```

### Example 2: Recent Changes

```bash
repo-roller \
  --most-recent 10 \
  --include "src/**/*.ts"
```

### Example 3: Specific Modules

```bash
repo-roller \
  --include "src/auth/**" \
  --include "src/security/**" \
  --ext ts
```

### Example 4: Documentation Only

```bash
repo-roller \
  --include "**/*.md" \
  --include "**/docs/**" \
  --ext md,mdx
```

### Example 5: Small Files Only

```bash
repo-roller \
  --max-size 50 \
  --ext ts,js \
  --no-tests
```

## Advanced Filtering

### Combining Filters

All filters are applied using AND logic:

```bash
repo-roller \
  --include "src/**/*.ts" \    # Must be in src/ and .ts
  --exclude "**/*.test.ts" \   # But not test files
  --max-size 100               # And under 100 KB
```

### Pattern Priority

1. `.gitignore` (if enabled)
2. Default exclusions
3. `--exclude` patterns
4. `--include` patterns
5. Extension/language filters
6. Size limits

### Negative Patterns

Exclude specific files from include patterns:

```bash
repo-roller \
  --include "src/**/*.ts" \
  --exclude "src/legacy/**"
```

## Best Practices

### For Code Review

```bash
repo-roller --diff main --no-tests --max-size 200
```

### For Documentation

```bash
repo-roller --lang markdown --include "**/*.md"
```

### For API Analysis

```bash
repo-roller \
  --include "src/api/**" \
  --include "src/types/**" \
  --no-tests
```

### For Bug Investigation

```bash
repo-roller \
  --most-recent 5 \
  --include "src/auth/**"
```

## Troubleshooting

### No files found

Check your filters with verbose mode:
```bash
repo-roller --verbose
```

### Too many files

Add exclusions:
```bash
repo-roller --no-tests --no-deps --no-generated
```

### Missing expected files

Check .gitignore:
```bash
repo-roller --no-gitignore --verbose
```

## Related Options

- [CLI Reference](/cli/) - All CLI options
- [Content Options](/cli/content-options) - Control output content
- [Token Management](/cli/token-management) - Budget constraints
- [Git Commands](/cli/git-commands) - Advanced git integration
