# Developer Experience Refactor Plan

**Author**: DX Architect
**Date**: 2025-11-16
**Status**: Phase 1 Complete - Planning

This document captures the diagnosis of the current codebase and proposes a concrete plan to make repo-roller extremely developer-friendly.

---

## Codebase Inventory

### Current Structure

```
src/
├── cli.ts              # 399 lines - Main CLI entry, Commander setup, subcommand handlers
├── index.ts            # 120 lines - Library exports
├── tui.ts              # 302 lines - Interactive mode orchestration
├── core/               # 25+ modules (business logic)
│   ├── types.ts        # Core type definitions
│   ├── config.ts       # Configuration loading/resolution
│   ├── scan.ts         # File system scanning
│   ├── render.ts       # Output rendering (md/json/yaml/txt)
│   ├── tokens.ts       # Token estimation
│   ├── budget.ts       # Token budget management
│   ├── validation.ts   # Input validation
│   ├── helpers.ts      # Utility functions
│   ├── ui.ts           # Terminal styling primitives
│   ├── treeRenderer.ts # Tree rendering logic
│   ├── treeTheme.ts    # Tree visual theme
│   ├── fileIcons.ts    # File type icons
│   ├── dashboard.ts    # Generation summary display
│   ├── promptHelper.ts # LLM prompt suggestions
│   ├── history.ts      # Scan history tracking
│   ├── schema.ts       # CLI introspection
│   ├── daemon.ts       # Background daemon
│   ├── init.ts         # Project initialization
│   ├── git.ts          # Git integration
│   ├── userSettings.ts # User preferences
│   ├── builtInPresets.ts # Default presets
│   ├── modelPresets.ts # LLM model definitions
│   └── ...             # + test files
├── cli/                # 10+ modules (CLI command implementations)
│   ├── index.ts        # CLI exports
│   ├── commands.ts     # Main command orchestration
│   ├── modes.ts        # Execution modes (preview, non-interactive)
│   ├── display.ts      # CLI output formatting
│   ├── presets.ts      # Preset info commands
│   ├── validation.ts   # CLI-specific validation
│   ├── parsers.ts      # Argument parsing helpers
│   ├── history.ts      # History CLI commands
│   ├── daemon.ts       # Daemon CLI commands
│   ├── budget.ts       # Budget CLI commands
│   ├── schema.ts       # Schema CLI commands
│   └── settings.ts     # Settings CLI commands
└── components/         # 3 React/Ink components
    ├── CustomTreeSelect.tsx  # Interactive file tree
    ├── Confirm.tsx           # Yes/No prompt
    └── FileTreeSelect.tsx    # Deprecated tree select
```

### What's Already Human-Friendly

1. **TypeScript Discipline** - Strict mode enabled, `readonly` everywhere, comprehensive type definitions. Types are well-documented with JSDoc comments.

2. **Layered Architecture** - Clear separation between core logic (business rules), CLI wiring (Commander), and TUI rendering (Ink/React). No circular dependencies.

3. **Comprehensive Testing** - 35+ test files with Vitest. Good coverage of core modules. Tests are readable.

4. **Rich Documentation** - Excellent `ARCHITECTURE.md` with data flow diagrams, code examples, and design decisions. Multiple context docs (WHY_WE_BUILT_THIS, TARGET_AUDIENCE).

5. **Modern Tooling** - tsup for bundling, vitest for testing, ESLint with TypeScript rules, proper ESM setup.

6. **Thoughtful State Management** - TUI uses `useReducer` with typed actions, not ad-hoc `useState` everywhere. Clean reducer pattern.

7. **Pure Functions** - Core logic (tokens.ts, helpers.ts, validation.ts) is largely pure and testable.

---

## Pain Points (Diagnosis)

### 1. Flat Module Structure in `src/core/`

**Problem**: 25+ files at the same level makes navigation difficult. Developer must read each file to understand grouping.

**Examples**:
- `treeRenderer.ts`, `treeTheme.ts`, `fileIcons.ts` are clearly related but not grouped
- `tokens.ts`, `budget.ts`, `modelPresets.ts` are LLM-specific but scattered
- `ui.ts` and `dashboard.ts` are vague names

**Impact**: New developers spend time figuring out where to add code. Risk of duplication.

### 2. Entry Points Scattered at Root

**Problem**: `cli.ts`, `tui.ts`, `index.ts` all at `src/` root level. Unclear which is the "main" entry.

**Impact**: Confusion about where CLI starts vs where library starts vs where TUI starts.

### 3. CLI Handler Bloat in `cli.ts`

**Problem**: `cli.ts` is 399 lines mixing Commander setup with inline subcommand handlers (`handleHistoryCommand`, `handleDaemonCommand`, etc.).

**Impact**: Hard to test individual commands. Monolithic entry point.

### 4. Missing Module-Level Documentation

**Problem**: No JSDoc headers explaining what each module owns and doesn't own. Developers must infer from code.

**Example**: `helpers.ts` - Is this for file helpers? String helpers? General utils? What shouldn't go here?

### 5. Ambiguous File Names

**Problem**: Some names don't reveal intent:
- `helpers.ts` - Too generic
- `ui.ts` - UI rendering? UI state? UI primitives?
- `dashboard.ts` - What kind of dashboard?
- `modes.ts` - Execution modes? Display modes?

**Impact**: Cognitive overhead when navigating codebase.

### 6. Missing Developer Onboarding Docs

**Problem**: No `CONTRIBUTING.md`, no `DEVELOPING.md`. New developers don't know:
- How to run tests
- How to add a feature
- Code style expectations
- Where to put new code

**Impact**: Slow onboarding, inconsistent contributions.

### 7. CLI Help Output Lacks Organization

**Problem**: `--help` dumps all 50+ options in one flat list. No sections, no examples inline.

**Impact**: Users overwhelmed by options. Hard to discover features.

### 8. Error Messages Lack Actionability

**Problem**: Some errors just state what's wrong without suggesting fixes.

**Example**: "Invalid format" vs "Invalid format. Use: md, json, yaml, or txt"

### 9. TUI Code Documentation

**Problem**: `CustomTreeSelect.tsx` (560 lines) is well-structured but lacks comments explaining "why" for non-obvious logic (e.g., why bound cursor in useEffect?).

---

## Concrete Refactor Plan

### Phase 2: Structure & Naming for Humans

**Goal**: Make module structure self-explanatory without reading code.

#### 2.1 Reorganize `src/core/` into Subdomains

```
src/core/
├── scanning/           # File discovery
│   ├── scanner.ts      # Main scan function
│   ├── filters.ts      # Filtering logic (size, binary, patterns)
│   └── types.ts        # FileInfo, ScanResult
├── rendering/          # Output generation
│   ├── bundle-renderer.ts  # Main render orchestration
│   ├── markdown.ts     # Markdown-specific
│   ├── json-yaml.ts    # Structured formats
│   ├── plaintext.ts    # Text format
│   └── types.ts        # RenderOptions, OutputFormat
├── tokens/             # LLM token management
│   ├── estimator.ts    # Token counting heuristics
│   ├── budget.ts       # Budget constraints
│   ├── providers.ts    # LLM provider definitions
│   └── cost-calculator.ts # Cost computation
├── config/             # Configuration system
│   ├── loader.ts       # Load from files
│   ├── resolver.ts     # Merge defaults + config + CLI
│   ├── validator.ts    # Validate configs
│   ├── presets.ts      # Built-in presets
│   └── types.ts        # RollerConfig, ResolvedOptions
├── display/            # Terminal output primitives
│   ├── colors.ts       # Chalk wrappers
│   ├── symbols.ts      # Unicode symbols
│   ├── summary.ts      # Generation summary renderer
│   └── prompt-helper.ts
├── tree/               # Tree visualization
│   ├── builder.ts      # Build tree structure
│   ├── renderer.ts     # Render tree to string
│   ├── theme.ts        # Visual theme
│   └── icons.ts        # File/folder icons
├── persistence/        # Data storage
│   ├── history.ts      # Scan history
│   ├── user-settings.ts # User preferences
│   └── types.ts
├── git/                # Git integration
│   ├── diff.ts         # Changed files
│   └── recent.ts       # Recent commits
├── daemon/             # Background service
│   ├── server.ts
│   └── client.ts
└── schema/             # CLI introspection
    └── generator.ts
```

**Why This Helps**:
- Each subdirectory has a clear responsibility
- Related modules are co-located
- Directory names are nouns describing the domain
- Easy to find where to add new code

#### 2.2 Reorganize Entry Points

```
src/
├── lib/                # Library exports (for npm consumers)
│   └── index.ts
├── cli/
│   ├── main.ts         # CLI entry point (shebang)
│   ├── program.ts      # Commander setup
│   ├── commands/       # One file per subcommand
│   │   ├── bundle.ts   # Main bundle command
│   │   ├── init.ts     # Init command
│   │   ├── history.ts  # History subcommand
│   │   ├── daemon.ts   # Daemon subcommand
│   │   ├── settings.ts # Settings subcommand
│   │   └── schema.ts   # Schema subcommand
│   └── handlers/       # Shared command logic
│       ├── info-display.ts
│       └── error-reporter.ts
├── tui/
│   ├── interactive-session.ts  # TUI orchestration
│   ├── components/             # React/Ink components
│   │   ├── FileTreeSelect.tsx
│   │   └── Confirm.tsx
│   └── state/                  # TUI state management
│       └── tree-select-reducer.ts
└── core/               # Business logic (as above)
```

**Why This Helps**:
- Clear separation: `lib/` for library, `cli/` for CLI, `tui/` for interactive
- Each CLI subcommand is its own file
- TUI state management separated from rendering

#### 2.3 Rename Ambiguous Files

| Current | Proposed | Reason |
|---------|----------|--------|
| `helpers.ts` | Split into domain-specific utils | Remove catchall |
| `ui.ts` | `display/colors.ts` + `display/symbols.ts` | Specific purpose |
| `dashboard.ts` | `display/summary.ts` | Clearer intent |
| `modes.ts` | `cli/handlers/execution-modes.ts` | Context-specific |
| `treeRenderer.ts` | `tree/renderer.ts` | Domain grouping |

### Phase 3: Friendly APIs & Types

**Goal**: Make internal APIs self-documenting with clear input/output contracts.

#### 3.1 Add JSDoc Headers to Core Modules

**Template**:

```typescript
/**
 * @module scanning/scanner
 *
 * Discovers and filters files in a repository.
 *
 * OWNS:
 * - Walking the file tree using fast-glob
 * - Applying .gitignore rules
 * - Filtering by size, extension, patterns
 * - Binary file detection
 *
 * DOES NOT OWN:
 * - Reading file contents (lazy loading)
 * - Token counting (that's tokens/estimator)
 * - Output rendering (that's rendering/)
 *
 * TYPICAL USAGE:
 * ```typescript
 * const result = await scanFiles({
 *   root: '/path/to/repo',
 *   include: ['src/**'],
 *   exclude: ['**/*.test.ts'],
 *   maxFileSizeBytes: 1024 * 1024,
 * });
 * // result.files contains FileInfo[]
 * ```
 */
```

#### 3.2 Define Clear Input/Output Types

Add explicit types for main workflows:

```typescript
// scanning/types.ts
export interface ScanRequest {
  readonly root: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly extensions: readonly string[];
  readonly maxFileSizeBytes: number;
  readonly respectGitignore: boolean;
}

export interface ScanResult {
  readonly files: readonly FileInfo[];
  readonly totalBytes: number;
  readonly rootPath: string;
  readonly extensionCounts: Readonly<Record<string, number>>;
}

// rendering/types.ts
export interface BundleRequest {
  readonly scan: ScanResult;
  readonly format: OutputFormat;
  readonly options: RenderOptions;
}

export interface BundleResult {
  readonly content: string;
  readonly estimatedTokens: number;
  readonly warnings: readonly string[];
}
```

#### 3.3 Add JSDoc to Public Functions

```typescript
/**
 * Scans a repository directory and returns matching files.
 *
 * @param request - Scan configuration
 * @returns Files matching the criteria with metadata
 *
 * @throws {Error} If root directory doesn't exist
 * @throws {Error} If glob patterns are invalid
 *
 * @example
 * ```typescript
 * const result = await scanFiles({
 *   root: '.',
 *   include: ['src/**/*.ts'],
 *   exclude: ['**/*.test.ts'],
 *   extensions: ['ts', 'tsx'],
 *   maxFileSizeBytes: 1024 * 1024,
 *   respectGitignore: true,
 * });
 * console.log(`Found ${result.files.length} files`);
 * ```
 */
export async function scanFiles(request: ScanRequest): Promise<ScanResult> {
  // ...
}
```

### Phase 4: TUI Code Readability

**Goal**: Make the interactive file selection code easy to understand and extend.

#### 4.1 Extract State Model

Move reducer and actions to separate file:

```typescript
// tui/state/tree-select-state.ts
export interface TreeSelectState {
  readonly expanded: Set<string>;
  readonly selected: Set<string>;
  readonly cursor: number;
  readonly showExcluded: boolean;
  readonly mode: 'tree' | 'summary';
}

export type TreeSelectAction =
  | { type: 'TOGGLE_SELECTION'; path: string }
  | { type: 'EXPAND_DIRECTORY'; path: string }
  | { type: 'COLLAPSE_DIRECTORY'; path: string }
  | { type: 'MOVE_CURSOR'; direction: 'up' | 'down' }
  // ...

export function treeSelectReducer(
  state: TreeSelectState,
  action: TreeSelectAction
): TreeSelectState {
  // ...
}
```

#### 4.2 Extract Intent-Revealing Helpers

```typescript
// tui/state/tree-operations.ts

/**
 * Get all file paths under a directory node (recursive).
 * Used for bulk select/deselect operations.
 */
export function getFilesUnderDirectory(node: TreeNode): string[] {
  // ...
}

/**
 * Check if all files under a directory are selected.
 * Used for rendering the directory checkbox state.
 */
export function isDirectoryFullySelected(
  node: TreeNode,
  selected: Set<string>
): boolean {
  // ...
}

/**
 * Check if some (but not all) files under a directory are selected.
 * Used for rendering the "partial" checkbox state.
 */
export function isDirectoryPartiallySelected(
  node: TreeNode,
  selected: Set<string>
): boolean {
  // ...
}
```

#### 4.3 Add Explanatory Comments

```typescript
// CustomTreeSelect.tsx

// Ensure cursor stays in bounds when tree changes (e.g., after filtering)
// This is a side effect because cursor is part of component state,
// but the valid range depends on derived data (flatNodes).
useEffect(() => {
  if (boundedCursor !== cursor) {
    dispatch({ type: 'SET_CURSOR', payload: boundedCursor });
  }
}, [boundedCursor]); // eslint-disable-line - intentionally not depending on cursor
```

### Phase 5: Docs & Developer Onboarding

**Goal**: New developer productive in 15-30 minutes.

#### 5.1 Create `CONTRIBUTING.md`

```markdown
# Contributing to repo-roller

## Code Style

- TypeScript strict mode with no `any`
- Prefer `readonly` for all interface properties
- Pure functions where possible
- No side effects in core logic

## Adding a Feature

1. Identify the domain (scanning, rendering, tokens, etc.)
2. Add types to the domain's `types.ts`
3. Implement in domain-specific module
4. Add tests (see Testing section)
5. Wire into CLI if needed

## Testing

```bash
pnpm test           # Run once
pnpm test:watch     # Watch mode
pnpm test:ui        # Interactive UI
```

## Extending the TUI

1. TUI state: `src/tui/state/`
2. TUI components: `src/tui/components/`
3. Use the reducer pattern for state changes
4. Keep rendering separate from logic

## PR Checklist

- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] Types are strict (no `any`)
- [ ] New features have tests
```

#### 5.2 Create `DEVELOPING.md`

```markdown
# Developing repo-roller

## Quick Start

```bash
pnpm install
pnpm dev            # Run CLI in dev mode
pnpm test:watch     # Tests in watch mode
```

## Project Structure

```
src/
├── lib/        # Library exports (npm package)
├── cli/        # CLI commands and wiring
├── tui/        # Interactive terminal UI
└── core/       # Business logic domains
    ├── scanning/   # File discovery
    ├── rendering/  # Output generation
    ├── tokens/     # LLM token management
    ├── config/     # Configuration system
    └── ...
```

## Data Flow

1. **CLI** parses arguments and loads config
2. **Config** resolver merges defaults + config + CLI args
3. **Scanner** discovers and filters files
4. **Budget** (optional) constrains to token limit
5. **Renderer** generates output in requested format
6. **Writer** saves to file or clipboard

## Adding a CLI Option

1. Add to Commander in `cli/program.ts`
2. Add to `CommanderOptions` in `core/config/types.ts`
3. Add to `ResolvedOptions` in `core/config/types.ts`
4. Handle in `resolveOptions()` in `core/config/resolver.ts`
5. Use in appropriate module

## Running Examples

```bash
pnpm run quick          # Quick run
pnpm run interactive    # Interactive mode
pnpm run preview        # Dry run
pnpm run stats          # Stats only
```
```

#### 5.3 Simplify `README.md`

Focus on user-facing documentation. Move implementation details to `docs/`.

#### 5.4 Consolidate Architecture Docs

Keep `ARCHITECTURE.md` as the single source of truth for technical architecture. Remove duplicate explanations from other docs.

### Phase 6: Tests as Living Documentation

**Goal**: Tests teach behavior through readable examples.

#### 6.1 High-Level Integration Tests

```typescript
// tests/integration/bundle-generation.test.ts

describe('Bundle Generation', () => {
  it('generates markdown bundle with tree and stats by default', async () => {
    // Given a mock repository structure
    const mockRepo = createMockRepo({
      'src/index.ts': 'export const main = () => {};',
      'src/utils.ts': 'export const add = (a, b) => a + b;',
      'package.json': '{"name": "test"}',
    });

    // When we generate a bundle with default options
    const result = await generateBundle({
      root: mockRepo.path,
      format: 'md',
    });

    // Then the output includes expected sections
    expect(result.content).toContain('## Directory Structure');
    expect(result.content).toContain('## Files');
    expect(result.content).toContain('```typescript');
    expect(result.files).toHaveLength(3);
  });

  it('respects token budget by excluding lower-priority files', async () => {
    // Given a repo with more content than budget allows
    // When we generate with a tight token budget
    // Then only high-priority files are included
    // And excluded files are reported
  });
});
```

#### 6.2 Focused Unit Tests

```typescript
// core/tokens/estimator.test.ts

describe('Token Estimation', () => {
  it('estimates ~1 token per 4 characters for typical code', () => {
    const code = 'function add(a, b) { return a + b; }';
    const tokens = estimateTokens(code);
    expect(tokens).toBeCloseTo(code.length / 4, 1);
  });

  it('adjusts for high whitespace density (more efficient)', () => {
    const code = `
      function add(
        a,
        b
      ) {
        return a + b;
      }
    `;
    const tokens = estimateTokens(code);
    // High whitespace = more efficient tokenization
    expect(tokens).toBeLessThan(code.length / 4);
  });

  it('adjusts for high symbol density (less efficient)', () => {
    const code = '{{{{}}}}[[[[]]]](((())))=====';
    const tokens = estimateTokens(code);
    // High symbols = less efficient tokenization
    expect(tokens).toBeGreaterThan(code.length / 4);
  });
});
```

### Phase 7: CLI Help & Error Messages

**Goal**: CLI text is friendly and self-explanatory.

#### 7.1 Grouped Help Output

```bash
$ repo-roller --help

repo-roller - Aggregate source code into LLM-friendly bundles

USAGE
  repo-roller [root] [options]
  repo-roller <command> [options]

COMMANDS
  init          Initialize configuration files
  history       View and manage bundle history
  daemon        Run as background service
  settings      Manage CLI preferences

BASIC OPTIONS
  -o, --out <file>        Output file path
  -f, --format <type>     Output format: md, json, yaml, txt
  --preset <name>         Use a preset (ts, python, docs, minimal)

FILTERING
  -i, --include <glob>    Include patterns (e.g., "src/**")
  -x, --exclude <glob>    Exclude patterns (e.g., "**/*.test.ts")
  --ext <list>            File extensions (e.g., "ts,tsx")
  --max-size <kb>         Max file size in KB
  --no-tests              Exclude test files
  --no-deps               Exclude dependencies

TOKEN MANAGEMENT
  --target <provider>     LLM provider for cost estimates
  --max-tokens <n>        Maximum token budget
  --max-cost <usd>        Maximum cost in USD

MODES
  -I, --interactive       Interactive file selection
  --dry-run               Preview without generating
  --stats-only            Show statistics only

EXAMPLES
  repo-roller .                         # Basic bundle
  repo-roller . --preset minimal        # Use preset
  repo-roller . -I                      # Interactive selection
  repo-roller . --target claude-sonnet  # With token analysis

For more examples: repo-roller --examples
Full documentation: https://github.com/maikeleckelboom/repo-roller
```

#### 7.2 Actionable Error Messages

```typescript
// Before
throw new Error('Invalid format');

// After
throw new UserFacingError(
  'Invalid output format',
  `Format "${format}" is not supported.`,
  'Use one of: md, json, yaml, txt'
);

// Rendering
console.error(ui.error('Invalid output format'));
console.error(ui.dim(`  Format "${format}" is not supported.`));
console.error(ui.dim('  Use one of: md, json, yaml, txt'));
```

---

## Implementation Order

1. **Phase 2** (Structure) - Foundation for everything else
2. **Phase 3** (APIs) - Make reorganized code self-documenting
3. **Phase 4** (TUI) - Clean up the most complex part
4. **Phase 5** (Docs) - Capture the new structure
5. **Phase 6** (Tests) - Document behavior
6. **Phase 7** (CLI) - Polish user-facing text

Each phase builds on the previous. After each phase:
- Run `pnpm build`
- Run `pnpm lint`
- Run `pnpm test`

---

## Success Criteria

> "Will a random strong TypeScript dev, opening this repo 6 months from now, quickly understand what's going on and how to extend it without fear?"

- [ ] Can find where to add a new preset in < 30 seconds
- [ ] Can understand the data flow in < 5 minutes
- [ ] Can add a new CLI option in < 10 minutes
- [ ] Can modify the TUI tree rendering in < 15 minutes
- [ ] Can run and understand tests in < 5 minutes

---

## Notes for Future Contributors

This refactor focuses on human factors, not performance or features. The goal is **discoverability** and **maintainability**.

Key principle: **Module structure should teach you the codebase**. Directory names are nouns (domains), file names are specific (not generic), and related code lives together.

When in doubt, ask: "Would a new developer understand this without reading the implementation?"
