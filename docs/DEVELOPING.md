# Developing repo-roller

This document helps you quickly become productive in the repo-roller codebase.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in dev mode (auto-transpiles TypeScript)
pnpm dev

# Run tests in watch mode
pnpm test:watch

# Build for production
pnpm build
```

## Project Structure

```
src/
├── cli.ts                  # CLI entry point (Commander setup)
├── tui.ts                  # Interactive mode orchestration
├── index.ts                # Library exports (for npm consumers)
├── core/                   # Business logic (25+ modules)
│   ├── types.ts            # Central type definitions
│   ├── config.ts           # Configuration loading/merging
│   ├── scan.ts             # File system scanning
│   ├── render.ts           # Output rendering (md/json/yaml/txt)
│   ├── tokens.ts           # Token estimation & cost calculation
│   ├── budget.ts           # Budget constraints
│   ├── validation.ts       # Input validation with suggestions
│   ├── helpers.ts          # Pure utility functions
│   ├── ui.ts               # Terminal colors & symbols
│   ├── treeRenderer.ts     # Tree visualization logic
│   ├── dashboard.ts        # Generation summary display
│   └── ...                 # More specialized modules
├── cli/                    # CLI command implementations
│   ├── commands.ts         # Main command orchestration
│   ├── modes.ts            # Execution modes (preview, stats-only)
│   ├── display.ts          # CLI output formatting
│   └── ...                 # Subcommand handlers
└── components/             # React/Ink TUI components
    ├── CustomTreeSelect.tsx # Interactive file tree
    └── Confirm.tsx          # Yes/No prompt
```

## Data Flow

Understanding the core data flow helps you navigate the codebase:

```
1. CLI Arguments
   ↓
2. Load Configuration (config.ts)
   - .reporoller.yml (profiles)
   - repo-roller.config.mjs (presets)
   ↓
3. Resolve Options (config.ts)
   - Merge: defaults + config + CLI args
   ↓
4. Scan Files (scan.ts)
   - Discover files with fast-glob
   - Apply .gitignore rules
   - Filter by size/extension/patterns
   - Build FileInfo[] metadata
   ↓
5. [Optional] Interactive Selection (tui.ts)
   - User selects files via TUI
   - Uses React/Ink components
   ↓
6. [Optional] Apply Budget (budget.ts)
   - Constrain to token/cost limit
   ↓
7. Render Output (render.ts)
   - Generate md/json/yaml/txt
   - Add tree view, stats, TOC
   ↓
8. Write to File / Clipboard
```

## Common Development Tasks

### Add a New CLI Option

1. **Add to Commander** in `src/cli.ts`:
   ```typescript
   .option('--my-option <value>', 'Description of option')
   ```

2. **Add to CommanderOptions** in `src/core/types.ts`:
   ```typescript
   readonly myOption?: string;
   ```

3. **Add to ResolvedOptions** in `src/core/types.ts`:
   ```typescript
   readonly myOption: string;
   ```

4. **Handle in resolveOptions()** in `src/core/config.ts`:
   ```typescript
   myOption: cliOptions.myOption ?? defaults.myOption
   ```

5. **Use in your code**:
   ```typescript
   if (options.myOption) {
     // Do something
   }
   ```

### Add a New Output Format

1. **Add to OutputFormat** in `src/core/types.ts`:
   ```typescript
   export type OutputFormat = 'md' | 'json' | 'yaml' | 'txt' | 'newformat';
   ```

2. **Create render function** in `src/core/render.ts`:
   ```typescript
   export async function renderNewFormat(
     scan: ScanResult,
     options: ResolvedOptions
   ): Promise<string> {
     // Generate output
   }
   ```

3. **Add to render()** dispatcher:
   ```typescript
   case 'newformat':
     return renderNewFormat(scan, options);
   ```

### Modify the Interactive TUI

The TUI uses React/Ink with a reducer pattern for state management.

1. **State is in** `CustomTreeSelect.tsx`:
   ```typescript
   interface TreeSelectState {
     expanded: Set<string>;
     selected: Set<string>;
     cursor: number;
     // ...
   }
   ```

2. **Actions are typed**:
   ```typescript
   type TreeSelectAction =
     | { type: 'TOGGLE_FILE'; payload: string }
     | { type: 'MOVE_CURSOR_UP' }
     // ...
   ```

3. **Reducer handles state changes**:
   ```typescript
   function treeSelectReducer(state, action) {
     switch (action.type) {
       case 'TOGGLE_FILE':
         // Return new state
     }
   }
   ```

4. **Input is handled via useInput**:
   ```typescript
   useInput((input, key) => {
     if (input === ' ') {
       dispatch({ type: 'TOGGLE_FILE', payload: currentPath });
     }
   });
   ```

### Add a New Preset

1. **In `src/core/builtInPresets.ts`**:
   ```typescript
   mypreset: {
     description: 'My custom preset',
     include: ['src/**'],
     exclude: ['**/*.test.ts'],
     extensions: ['ts', 'tsx'],
     stripComments: true,
   }
   ```

2. **Use it**:
   ```bash
   repo-roller . --preset mypreset
   ```

## Running Tests

```bash
# Run all tests
pnpm test

# Watch mode (rerun on changes)
pnpm test:watch

# Interactive UI
pnpm test:ui

# Run specific test file
pnpm test src/core/tokens.test.ts
```

## Debugging

### Verbose Mode

```bash
repo-roller . --verbose
```

### Dry Run (Preview)

```bash
repo-roller . --dry-run
```

### Stats Only

```bash
repo-roller . --stats-only
```

### Validate Configuration

```bash
repo-roller . --validate
```

## Module Responsibilities

Each core module has a JSDoc header explaining what it owns. Here's a quick reference:

| Module | Owns | Does NOT Own |
|--------|------|--------------|
| `scan.ts` | File discovery, filtering | File content reading |
| `render.ts` | Output generation | File scanning, token counting |
| `tokens.ts` | Token estimation, cost calc | Budget selection |
| `config.ts` | Config loading, option merging | Validation, preset definitions |
| `validation.ts` | Input validation | Config loading |
| `budget.ts` | Budget constraints | Token counting |
| `helpers.ts` | Pure utilities | I/O operations |
| `ui.ts` | Terminal primitives | Business logic |

## Common Patterns

### Error Handling

```typescript
// Provide actionable errors
if (!isValid) {
  throw new Error(
    `Invalid format "${format}". Use: md, json, yaml, or txt`
  );
}
```

### Readonly by Default

```typescript
// All interfaces use readonly
interface Config {
  readonly files: readonly FileInfo[];
  readonly options: Readonly<Record<string, string>>;
}
```

### Pure Functions

```typescript
// Prefer pure functions with no side effects
function calculateTotal(files: readonly FileInfo[]): number {
  return files.reduce((sum, f) => sum + f.sizeBytes, 0);
}
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm dev` | Run CLI with tsx (dev mode) |
| `pnpm build` | Build for production |
| `pnpm test` | Run tests once |
| `pnpm test:watch` | Tests in watch mode |
| `pnpm lint` | Check code style |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm clean` | Remove build artifacts |

## Getting Help

1. **Module headers**: Read the JSDoc at the top of each file
2. **Architecture docs**: See `docs/ARCHITECTURE.md`
3. **Examples**: Run `repo-roller --examples`
4. **Type definitions**: Check `src/core/types.ts`

Welcome to the codebase!
