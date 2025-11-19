# repo-roller Architecture

This document provides a detailed technical overview of the repo-roller codebase architecture, design decisions, and implementation patterns.

## Table of Contents

- [Design Principles](#design-principles)
- [Layered Architecture](#layered-architecture)
- [Module Organization](#module-organization)
- [Data Flow](#data-flow)
- [Key Abstractions](#key-abstractions)
- [Testing Strategy](#testing-strategy)
- [Build & Deployment](#build--deployment)

## Design Principles

repo-roller is built on several core principles:

1. **Separation of Concerns**: Clear boundaries between business logic, CLI, and UI layers
2. **Immutability**: Data structures are readonly by default, pure functions are preferred
3. **Type Safety**: TypeScript strict mode with no compromises
4. **Testability**: Pure functions and dependency injection enable comprehensive testing
5. **Performance**: Lazy evaluation and streaming where possible
6. **User Experience**: Clear error messages, helpful defaults, and interactive modes

## Layered Architecture

The codebase follows a strict layered architecture with unidirectional dependencies:

```
┌─────────────────────────────────────┐
│   Components Layer (React/Ink)      │
│   - FileTreeSelect.tsx              │
│   - CustomTreeSelect.tsx            │
│   - Interactive UI components       │
└─────────────────┬───────────────────┘
                  │ imports from
                  ↓
┌─────────────────────────────────────┐
│   CLI Layer (Command Handlers)      │
│   - commands.ts                     │
│   - display.ts                      │
│   - User interaction & formatting   │
└─────────────────┬───────────────────┘
                  │ imports from
                  ↓
┌─────────────────────────────────────┐
│   Core Layer (Business Logic)       │
│   - scan.ts, render.ts              │
│   - tokens.ts, validation.ts        │
│   - Pure functions, no UI deps      │
└─────────────────────────────────────┘
```

### Layer Responsibilities

#### Core Layer (`src/core/`)

**Owns:**
- File scanning and filtering
- Token estimation algorithms
- Cost calculation
- Output rendering (Markdown, JSON, YAML, TXT)
- Configuration loading and validation
- History tracking
- Schema generation

**Does NOT own:**
- User input/output
- CLI argument parsing
- UI rendering
- Terminal formatting

**Key Files:**
- `scan.ts` - File system scanning with .gitignore support
- `render.ts` - Output format generation
- `tokens.ts` - Token estimation and cost calculation
- `config.ts` - Configuration file loading (.reporoller.yml, repo-roller.config.mjs)
- `validation.ts` - Schema validation
- `history.ts` - Command history tracking
- `budget.ts` - File selection within token budgets
- `logger.ts` - Structured logging

#### CLI Layer (`src/cli/`)

**Owns:**
- Command-line argument parsing (Commander.js)
- Terminal output formatting
- Error message display
- User prompts (Inquirer)
- CLI command orchestration

**Does NOT own:**
- Business logic
- File scanning algorithms
- Token calculation

**Key Files:**
- `commands.ts` - Command definitions
- `display.ts` - Terminal output formatting
- `validation.ts` - CLI-specific validation error formatting
- `history.ts` - History command implementation

#### Component Layer (`src/components/`)

**Owns:**
- Interactive terminal UI (React/Ink)
- File tree visualization
- Settings management UI
- TUI state management

**Does NOT own:**
- Business logic
- Data persistence
- File operations

**Key Files:**
- `FileTreeSelect.tsx` - Main file selection tree
- `CustomTreeSelect.tsx` - Reusable tree component
- `Confirm.tsx` - Confirmation dialogs
- `TextInput.tsx` - Text input with validation

## Module Organization

### Module Documentation Pattern

Every core module follows a consistent documentation pattern:

```typescript
/**
 * @file module-name.ts
 * Brief description of the module
 *
 * OWNS:
 * - Specific responsibility 1
 * - Specific responsibility 2
 *
 * DOES NOT OWN:
 * - Anti-responsibility 1 (see other-module.ts)
 * - Anti-responsibility 2 (see another-module.ts)
 */
```

This makes it immediately clear what each module is responsible for and helps prevent scope creep.

### File Naming Conventions

- **Source files**: `kebab-case.ts` or `PascalCase.tsx` (React components)
- **Test files**: `kebab-case.test.ts` (in `tests/` directory)
- **Type definitions**: Inline in module files, exported via `index.ts`
- **Configuration**: `*.config.ts` or `*.config.js`

### Import/Export Patterns

- **Core modules**: Export only public APIs via `src/index.ts`
- **Internal imports**: Use `.js` extension (ESM requirement)
- **Type imports**: Use `type` keyword for type-only imports
- **Barrel exports**: Main entry point re-exports from modules

```typescript
// Good - explicit type import
import type { FileInfo } from './types.js';

// Good - value import with .js extension
import { scanFiles } from './scan.js';

// Bad - missing .js extension
import { scanFiles } from './scan';
```

## Data Flow

### Standard CLI Flow

```
User Input (CLI args)
    ↓
CLI Layer parses arguments
    ↓
CLI Layer loads config (via Core)
    ↓
Core Layer scans files
    ↓
Core Layer filters files
    ↓
Core Layer estimates tokens
    ↓
Core Layer renders output
    ↓
CLI Layer displays result
```

### Interactive Mode Flow

```
User runs `rr . -I`
    ↓
TUI Layer displays file tree
    ↓
User selects files (Component Layer)
    ↓
TUI Layer shows output options
    ↓
User confirms (Component Layer)
    ↓
CLI Layer invokes Core Layer
    ↓
Core Layer generates output
    ↓
CLI Layer displays summary
```

## Key Abstractions

### FileInfo

The primary data structure representing a file:

```typescript
interface FileInfo {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly sizeBytes: number;
  readonly extension: string;
  readonly isBinary: boolean;
  readonly isDefaultIncluded: boolean;
}
```

Immutable by design, created once during scanning.

### ResolvedOptions

The normalized configuration after merging CLI args, config files, and defaults:

```typescript
interface ResolvedOptions {
  readonly targetDir: string;
  readonly outputFormat: OutputFormat;
  readonly extensions?: readonly string[];
  readonly includeTests: boolean;
  readonly stripComments: boolean;
  // ... more options
}
```

### ScanResult

Output from the file scanning process:

```typescript
interface ScanResult {
  readonly files: readonly FileInfo[];
  readonly totalSize: number;
  readonly totalTokens: number;
  readonly excludedCount: number;
}
```

### RenderOptions

Configuration for output rendering:

```typescript
interface RenderOptions {
  readonly format: OutputFormat;
  readonly includeTree: boolean;
  readonly includeStats: boolean;
  readonly stripComments: boolean;
  readonly sortMode: SortMode;
}
```

## Testing Strategy

### Test Organization

All tests are in the `tests/` directory, mirroring the `src/` structure:

```
tests/
├── core/              # Core module tests
│   ├── scan.test.ts
│   ├── render.test.ts
│   └── tokens.test.ts
├── cli/               # CLI tests
│   └── history.test.ts
└── components/        # Component tests
    └── FileTreeSelect.test.tsx
```

### Test Coverage Goals

- **Core Layer**: 80%+ coverage (pure functions are easy to test)
- **CLI Layer**: 60%+ coverage (harder to test I/O)
- **Component Layer**: 50%+ coverage (UI testing is complex)

Current coverage: **51% of source files**

### Testing Patterns

**Core Layer Tests:**
```typescript
// Pure function testing
it('should estimate tokens correctly', () => {
  const result = estimateTokens('Hello world');
  expect(result).toBe(3);
});
```

**CLI Layer Tests:**
```typescript
// Integration testing with mocked I/O
it('should display help message', () => {
  const output = captureOutput(() => displayHelp());
  expect(output).toContain('Usage:');
});
```

**Component Layer Tests:**
```typescript
// React/Ink component testing
it('should render file tree', () => {
  const { lastFrame } = render(<FileTreeSelect files={mockFiles} />);
  expect(lastFrame()).toContain('src/');
});
```

## Build & Deployment

### Build Process

1. **TypeScript Compilation**: `tsc` compiles `.ts` files to `.js` in `dist/`
2. **Type Definitions**: `.d.ts` files generated for library consumers
3. **Source Maps**: `.js.map` files for debugging
4. **Entry Points**:
   - CLI: `dist/cli.js` (executable with shebang)
   - Library: `dist/index.js` (for npm imports)

Build command: `npm run build` (uses `tsup`)

### Package Structure

```json
{
  "bin": {
    "repo-roller": "./dist/cli.js",
    "rr": "./dist/cli.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./cli": "./dist/cli.js"
  }
}
```

### Release Process

1. **Changesets**: Create changeset with `npx changeset`
2. **Version Bump**: Changesets handles semantic versioning
3. **CI Pipeline**: Tests run on Node 18, 20, 22
4. **NPM Publish**: Automated via GitHub Actions

## Design Decisions

### Why Layered Architecture?

**Problem**: Mixing business logic with UI makes testing hard and limits reusability.

**Solution**: Strict layer separation means:
- Core logic can be tested without UI
- CLI can be replaced with web UI if needed
- Business logic is portable

### Why Readonly Types?

**Problem**: Mutable data leads to bugs and makes reasoning about code harder.

**Solution**: Immutable data structures mean:
- Functions can't accidentally modify inputs
- Data flow is easier to trace
- Safer for concurrent operations

### Why Separate Tests Directory?

**Problem**: Tests mixed with source code clutters file explorers and can accidentally end up in production builds.

**Solution**: Dedicated `tests/` directory means:
- Clearer project structure
- Easier to exclude from builds
- Standard practice in Node.js ecosystem

### Why Structured Logging?

**Problem**: Direct `console.log` calls don't support log levels, filtering, or structured output.

**Solution**: Dedicated `logger` module provides:
- Log levels (debug, info, warn, error)
- Consistent formatting
- Easy to mock in tests
- Can be extended with file logging, etc.

## Performance Considerations

### File Scanning

- **Lazy evaluation**: Files are read only when needed
- **.gitignore caching**: Parse once, reuse for all files
- **Binary detection**: Sample first 8KB instead of reading entire file
- **Parallel processing**: Could be added for large repositories

### Token Estimation

- **Heuristic-based**: ~4 chars per token is fast and ~95% accurate
- **No external tokenizers**: Avoids dependency on large ML models
- **Caching**: Token counts cached during single run

### Memory Usage

- **Streaming**: Large files can be processed in chunks
- **File filtering**: Exclude files early to reduce memory footprint
- **Lazy tree rendering**: Only render visible tree nodes in TUI

## Extension Points

### Adding New Output Formats

1. Add format to `OutputFormat` type in `types.ts`
2. Implement renderer in `render.ts`
3. Add tests in `tests/core/render.test.ts`
4. Update CLI options in `cli/commands.ts`

### Adding New LLM Providers

1. Add provider to `LLM_PROVIDERS` in `tokens.ts`
2. Update `calculateCost()` function
3. Add tests in `tests/core/tokens.test.ts`

### Adding New Presets

1. Add preset to `BUILT_IN_PRESETS` in `builtInPresets.ts`
2. Add documentation to README.md
3. Add tests in `tests/core/builtInPresets.test.ts`

## Common Patterns

### Error Handling

```typescript
// Core Layer - throw errors with actionable messages
if (!fileExists) {
  throw new Error(`Configuration file not found: ${path}\n\nRun 'repo-roller init' to create one.`);
}

// CLI Layer - catch and format errors
try {
  await runCommand(options);
} catch (error) {
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(1);
}
```

### Configuration Loading

```typescript
// Cascade: CLI args > .reporoller.yml > defaults
const config = {
  ...defaultOptions,
  ...loadRepoRollerYml(dir),
  ...cliOptions,
};
```

### Async Operations

```typescript
// Use async/await consistently
async function scanFiles(dir: string): Promise<ScanResult> {
  const files = await readdir(dir);
  const filtered = await filterFiles(files);
  return { files: filtered };
}
```

## Future Improvements

### Potential Enhancements

- [ ] Incremental updates (watch mode)
- [ ] Actual tokenizer integration (GPT, Claude)
- [ ] Web UI for remote file selection
- [ ] Plugin system for custom processors
- [ ] Performance profiling for large repos
- [ ] E2E test suite

### Technical Debt

- Some modules exceed 500 lines (schema.ts, render.ts)
- Console statements in CLI layer (could use logger)
- Peer dependency warnings (need resolution)
- Test coverage could be higher in CLI layer

## Questions?

For questions about the architecture:
1. Check module JSDoc comments ("OWNS" / "DOES NOT OWN")
2. Review test files for usage examples
3. See [DEVELOPING.md](DEVELOPING.md) for workflows
4. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
