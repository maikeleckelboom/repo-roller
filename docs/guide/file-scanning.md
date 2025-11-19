# File Scanning

repo-roller's file scanning system discovers and filters files efficiently while respecting your project's structure and `.gitignore` rules.

## How It Works

The scanning process follows these steps:

1. **Discovery** - Fast-glob walks the directory tree
2. **Filtering** - Apply `.gitignore`, patterns, and size limits
3. **Detection** - Identify binary files and categorize by role
4. **Sorting** - Order files by path, size, extension, or profile layout

## Basic Scanning

### Default Behavior

```bash
# Scan current directory
repo-roller

# Scan specific directory
repo-roller ./my-project
```

By default, repo-roller:
- Respects `.gitignore` rules
- Excludes `node_modules`, `.git`, `dist`, `build`
- Includes all text files
- Detects and skips binary files

### Include Patterns

Use glob patterns to specify which files to include:

```bash
# Include TypeScript files only
repo-roller --include "**/*.ts"

# Include multiple patterns
repo-roller --include "**/*.ts" --include "**/*.tsx"

# Include specific directories
repo-roller --include "src/**" --include "lib/**"
```

**Pattern Syntax:**
- `**` - Match all directories recursively
- `*` - Match any characters except `/`
- `?` - Match a single character
- `{a,b}` - Match a or b

### Exclude Patterns

Exclude specific files or directories:

```bash
# Exclude test files
repo-roller --exclude "**/*.test.ts" --exclude "**/*.spec.ts"

# Exclude directories
repo-roller --exclude "**/node_modules/**" --exclude "**/dist/**"

# Combine with includes
repo-roller --include "src/**/*.ts" --exclude "**/*.test.ts"
```

## File Filtering

### By Extension

Filter files by extension:

```bash
# Single extension
repo-roller --ext ts

# Multiple extensions
repo-roller --ext ts,tsx,js,jsx

# Common combinations
repo-roller --ext ts,tsx,js,jsx,json,yaml
```

### By Language

Use language shortcuts:

```bash
# TypeScript files (.ts, .tsx)
repo-roller --lang typescript

# JavaScript files (.js, .jsx, .mjs, .cjs)
repo-roller --lang javascript

# Python files (.py, .pyi)
repo-roller --lang python
```

### By Size

Exclude files larger than a certain size:

```bash
# Exclude files larger than 100 KB
repo-roller --max-size 100

# Exclude files larger than 1 MB
repo-roller --max-size 1000

# Exclude files larger than 2 MB (default for some presets)
repo-roller --max-size 2000
```

## Quick Filters

### Exclude Tests

Automatically exclude test files:

```bash
repo-roller --no-tests
```

This excludes files matching:
- `**/*.test.*`
- `**/*.spec.*`
- `**/__tests__/**`
- `**/test/**`
- `**/tests/**`

### Exclude Dependencies

Exclude dependency directories:

```bash
repo-roller --no-deps
```

This excludes:
- `**/node_modules/**`
- `**/vendor/**`
- `**/.pnpm/**`
- `**/.yarn/**`

### Exclude Generated Files

Skip build outputs and generated code:

```bash
repo-roller --no-generated
```

This excludes:
- `**/dist/**`
- `**/build/**`
- `**/out/**`
- `**/.next/**`
- `**/.nuxt/**`

### Combine Quick Filters

```bash
repo-roller --no-tests --no-deps --no-generated
```

## Binary File Detection

repo-roller automatically detects and skips binary files:

- Samples first 8KB of each file
- Checks for null bytes and non-text characters
- Skips images, executables, archives, etc.

**Binary files are excluded:**
- `.png`, `.jpg`, `.gif`, `.pdf`
- `.zip`, `.tar`, `.gz`
- `.exe`, `.dll`, `.so`
- `.woff`, `.ttf`, `.eot`

## File Categorization

Files are categorized by role:

| Role | Description | Examples |
|------|-------------|----------|
| **code** | Source code files | `.ts`, `.js`, `.py`, `.go` |
| **test** | Test files | `.test.ts`, `.spec.js` |
| **config** | Configuration files | `tsconfig.json`, `.eslintrc` |
| **docs** | Documentation | `.md`, `.txt`, `.rst` |
| **build** | Build/tooling files | `package.json`, `Makefile` |
| **other** | Miscellaneous | Everything else |

## Sorting

### Sort Modes

```bash
# Sort by path (default)
repo-roller --sort path

# Sort by file size (largest first)
repo-roller --sort size

# Sort by extension
repo-roller --sort extension
```

### Profile-Based Sorting

Define custom file ordering in `.reporoller.yml`:

```yaml
profiles:
  core-first:
    layout:
      - package.json
      - README.md
      - src/index.ts
      - src/core/**/*.ts
      - src/cli/**/*.ts
      - src/**/*.ts
      - "**/*.ts"
```

Use the profile:

```bash
repo-roller --profile core-first
```

Files match the first pattern in the layout. Unmatched files appear at the end.

## .gitignore Support

repo-roller automatically respects `.gitignore` files:

- Reads `.gitignore` in the project root
- Applies standard ignore patterns
- Works recursively with nested `.gitignore` files

**Manual override:**

```bash
# Include files normally ignored by .gitignore
repo-roller --include "dist/**/*.js"
```

## Scan Statistics

View detailed scanning statistics:

```bash
repo-roller --stats-only
```

**Output includes:**
- Total files found
- Files included vs excluded
- Breakdown by language
- Breakdown by role
- Top directories by size
- Estimated lines of code

## Advanced Examples

### Example 1: TypeScript Project, No Tests

```bash
repo-roller \
  --include "src/**/*.ts" \
  --include "src/**/*.tsx" \
  --exclude "**/*.test.ts" \
  --exclude "**/*.spec.ts"
```

### Example 2: Documentation Only

```bash
repo-roller \
  --include "**/*.md" \
  --include "**/*.mdx" \
  --include "docs/**/*"
```

### Example 3: Recently Modified Source Code

```bash
repo-roller \
  --ext ts,tsx,js,jsx \
  --no-tests \
  --sort size
```

### Example 4: Small Files Only

```bash
repo-roller \
  --max-size 50 \
  --include "src/**/*"
```

### Example 5: Custom Extension List

```bash
repo-roller \
  --ext ts,tsx,js,jsx,json,yaml,yml,md \
  --no-deps \
  --no-generated
```

## Performance Tips

1. **Use specific patterns** - `src/**/*.ts` is faster than `**/*.ts`
2. **Exclude large directories** - Use `--exclude` for `node_modules`, `dist`
3. **Set size limits** - Use `--max-size` to skip large files early
4. **Use presets** - Built-in presets are optimized for performance

## Troubleshooting

### No files found

**Problem:** Scan returns 0 files

**Solutions:**
1. Check your include/exclude patterns:
   ```bash
   repo-roller --verbose
   ```
2. Verify .gitignore isn't excluding everything
3. Try with minimal filters:
   ```bash
   repo-roller --ext ts
   ```

### Too many files

**Problem:** Scan includes unwanted files

**Solutions:**
1. Add exclude patterns:
   ```bash
   repo-roller --exclude "**/dist/**" --exclude "**/node_modules/**"
   ```
2. Use quick filters:
   ```bash
   repo-roller --no-tests --no-deps --no-generated
   ```
3. Be more specific with includes:
   ```bash
   repo-roller --include "src/**/*.ts"
   ```

### Binary files included

**Problem:** Binary files appear in output

**Solution:** Binary detection samples first 8KB. Very large text files or files with unusual encoding may be misdetected. Use explicit exclusion:

```bash
repo-roller --exclude "**/*.bin" --exclude "**/*.dat"
```

## Next Steps

- **[Output Formats](/guide/output-formats)** - Control output structure
- **[Token Estimation](/guide/token-estimation)** - Understand token counting
- **[Budget Management](/guide/budget-management)** - Stay within LLM limits
- **[Presets](/guide/presets)** - Use pre-configured scanning options

## Related

- [File Selection CLI Options](/cli/file-selection)
- [Configuration Files](/guide/configuration)
- [Git Integration](/guide/git-integration)
