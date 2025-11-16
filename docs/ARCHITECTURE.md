# Architecture Overview

This document provides a comprehensive overview of repo-roller's internal architecture, design patterns, and technical decisions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Interface                         │
│                         (cli.ts)                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Configuration Layer                       │
│              (config.ts, validation.ts)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Core Processing                          │
│              ┌──────────┬──────────┬──────────┐            │
│              │   Scan   │  Budget  │  Render  │            │
│              │ (scan.ts)│(budget.ts)│(render.ts)│            │
│              └──────────┴──────────┴──────────┘            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Token Analysis                            │
│                      (tokens.ts)                            │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

### Entry Points

```
src/
├── cli.ts              # Main CLI entry point
├── index.ts            # Library exports
└── tui.ts              # Terminal UI (interactive mode)
```

### CLI Modules

```
src/cli/
├── index.ts            # CLI module exports
├── commands.ts         # Command handlers and orchestration
├── presets.ts          # Preset display and info commands
├── display.ts          # Terminal output formatting
├── modes.ts            # Execution modes (preview, non-interactive)
├── budget.ts           # CLI budget constraint application
├── validation.ts       # CLI validation helpers
├── parsers.ts          # Argument parsing utilities
├── history.ts          # History CLI commands
└── daemon.ts           # Daemon mode CLI commands
```

### Core Modules

```
src/core/
├── types.ts            # TypeScript type definitions
├── config.ts           # Configuration loading and resolution
├── scan.ts             # File system scanning
├── render.ts           # Output generation
├── tokens.ts           # Token estimation and cost calculation
├── budget.ts           # Budget constraint management
├── validation.ts       # Configuration validation
├── helpers.ts          # Pure utility functions (no I/O)
├── ui.ts               # Terminal UI primitives (colors, symbols)
├── init.ts             # Configuration initialization
├── builtInPresets.ts   # Default preset definitions
├── modelPresets.ts     # LLM model preset definitions
├── dashboard.ts        # Generation summary rendering
├── promptHelper.ts     # Prompt construction helpers
├── history.ts          # History data management
├── schema.ts           # CLI schema introspection
└── daemon.ts           # Daemon server implementation
```

## Detailed Component Analysis

### 1. CLI Interface (`cli.ts`)

The CLI is built with Commander.js and serves as the orchestration layer.

**Responsibilities:**
- Parse command-line arguments
- Route to appropriate execution mode
- Handle errors and exit codes
- Display formatted output

**Key Function: `main()`**

```typescript
async function main(): Promise<void> {
  const program = new Command();

  // 1. Define commands and options
  program
    .name('repo-roller')
    .option('-o, --out <file>', 'Output file')
    .option('--max-tokens <number>', 'Token budget')
    // ... more options

  // 2. Parse arguments
  await program.parseAsync(process.argv);

  // 3. Route to execution mode
  if (options.dryRun) {
    await runPreview(resolved);
  } else if (options.interactive) {
    await runInteractive(resolved);
  } else {
    await runNonInteractive(resolved);
  }
}
```

**Design Decisions:**
- **Subcommands**: `init` as separate command for config creation
- **Option normalization**: Commander handles type coercion
- **Early validation**: CLI options validated before processing
- **Clear error reporting**: User-friendly error messages with suggestions

### 2. Configuration Layer (`config.ts`)

Configuration management follows a layered resolution pattern.

**Resolution Priority (highest to lowest):**
1. CLI arguments
2. User presets (`repo-roller.config.mjs`)
3. Profile layouts (`.reporoller.yml`)
4. Built-in presets
5. Hardcoded defaults

**Key Interface: `ResolvedOptions`**

```typescript
interface ResolvedOptions {
  readonly root: string;
  readonly outFile: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly extensions: readonly string[];
  readonly maxFileSizeBytes: number;
  readonly stripComments: boolean;
  readonly withTree: boolean;
  readonly withStats: boolean;
  readonly sort: SortMode;
  readonly interactive: boolean;
  readonly format: OutputFormat;
  readonly tokenCount: boolean;
  readonly maxTokens?: number;
  readonly maxCost?: number;
  // ... more options
}
```

**Configuration Files:**

1. **`.reporoller.yml`** - Profile definitions
```yaml
architectural_overview: |
  Description of project architecture.

profiles:
  core-first:
    layout:
      - package.json
      - src/index.ts
      - src/core/**/*.ts
```

2. **`repo-roller.config.mjs`** - Custom presets
```javascript
export default {
  presets: {
    mypreset: {
      extensions: ['ts', 'tsx'],
      exclude: ['**/*.test.ts'],
      stripComments: true,
    },
  },
};
```

**Design Decisions:**
- **Immutable options**: All resolved options are `readonly`
- **Explicit over implicit**: Track what was explicitly set
- **File-based config**: Standard YAML/JS formats
- **Portable**: No global state

### 3. File Scanner (`scan.ts`)

The scanner is responsible for discovering and filtering files.

**Scanning Pipeline:**

```
Directory
    │
    ▼
Fast-Glob (pattern matching)
    │
    ▼
Gitignore Filter (ignore package)
    │
    ▼
Extension Filter
    │
    ▼
Size Filter
    │
    ▼
Binary Detection
    │
    ▼
Exclusion Patterns
    │
    ▼
FileInfo[] result
```

**Key Interface: `FileInfo`**

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

**Binary Detection Strategy:**
- Sample first 8KB of file
- Check for null bytes (common in binary files)
- Configurable threshold

**Design Decisions:**
- **Fast-glob for performance**: Handles large directory trees efficiently
- **Gitignore first**: Respect project boundaries immediately
- **Lazy evaluation**: Don't read file content during scan
- **Metadata only**: Collect info without loading files into memory

### 4. Token Estimation (`tokens.ts`)

Token counting uses a heuristic approach optimized for accuracy and speed.

**Algorithm:**

```typescript
function estimateTokens(text: string): number {
  const charCount = text.length;

  // Large files: Simple ratio works well
  if (charCount > 100000) {
    return Math.ceil(charCount / 4.0);
  }

  // Smaller files: Account for content characteristics
  const whitespaceDensity = countWhitespace(text) / charCount;
  const symbolDensity = countSymbols(text) / charCount;

  let correctionFactor = 1.0;

  // High whitespace = efficient tokenization
  if (whitespaceDensity > 0.30) correctionFactor *= 0.85;

  // High symbol density = more tokens
  if (symbolDensity > 0.35) correctionFactor *= 1.25;

  return Math.ceil((charCount / 4.0) * correctionFactor);
}
```

**LLM Provider Data:**

```typescript
const LLM_PROVIDERS = {
  'claude-sonnet': {
    contextWindow: 200000,
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 15.0,
  },
  'gpt-4o': {
    contextWindow: 128000,
    inputCostPerMillion: 2.50,
    outputCostPerMillion: 10.0,
  },
  // ... more providers
};
```

**Design Decisions:**
- **Heuristic over exact**: Speed and simplicity over perfect accuracy
- **~95% accuracy goal**: Good enough for decision-making
- **Multiple provider support**: Compare costs across LLMs
- **Input cost focus**: Most relevant for context preparation

### 5. Budget Management (`budget.ts`)

Budget constraints ensure output fits within specified limits.

**Budget Types:**

```typescript
type BudgetConfig =
  | { type: 'tokens'; limit: number; provider: string; }
  | { type: 'usd'; limit: number; provider: string; }
  | { type: 'eur'; limit: number; provider: string; };
```

**Selection Algorithm:**

```typescript
async function selectFilesWithinBudget(
  files: readonly FileInfo[],
  budget: BudgetConfig,
  middleware?: (files: FileInfo[]) => FileInfo[],
  rootPath?: string
): Promise<BudgetSelectionResult> {
  // 1. Apply middleware (custom prioritization)
  const prioritized = middleware ? middleware([...files]) : files;

  // 2. Greedily select files within budget
  let currentUsage = 0;
  const selected: FileInfo[] = [];
  const excluded: FileInfo[] = [];

  for (const file of prioritized) {
    const fileTokens = estimateFileTokens(file);
    const newUsage = currentUsage + fileTokens;

    if (withinBudget(newUsage, budget)) {
      selected.push(file);
      currentUsage = newUsage;
    } else {
      excluded.push(file);
    }
  }

  return { selected, excluded, usage: currentUsage };
}
```

**Design Decisions:**
- **Greedy selection**: Simple, predictable behavior
- **Priority ordering**: Important files included first
- **Clear reporting**: Show what was excluded and why
- **Multiple budget types**: Support different constraints

### 6. Output Renderer (`render.ts`)

The renderer transforms file data into the specified output format.

**Supported Formats:**

1. **Markdown** (`md`)
```markdown
# Codebase Context

## Statistics
- Files: 45
- Total size: 156 KB

## File Tree
```
src/
├── index.ts
└── core/
    └── utils.ts
```

## src/index.ts

\`\`\`typescript
export * from './core/utils';
\`\`\`
```

2. **JSON** (`json`)
```json
{
  "metadata": {
    "timestamp": "2025-11-16T...",
    "fileCount": 45
  },
  "files": [
    {
      "path": "src/index.ts",
      "language": "typescript",
      "content": "export * from..."
    }
  ]
}
```

3. **YAML** (`yaml`)
```yaml
metadata:
  timestamp: "2025-11-16T..."
  fileCount: 45
files:
  - path: src/index.ts
    language: typescript
    content: |
      export * from...
```

4. **Plain Text** (`txt`)
```
=== src/index.ts ===
export * from './core/utils';

=== src/core/utils.ts ===
...
```

**Comment Stripping:**
Uses regex-based removal (not full parsing):
- Line comments: `// ...`
- Block comments: `/* ... */`
- Hash comments: `# ...` (for Python, Shell)

**Design Decisions:**
- **Format-specific optimizations**: Each format has tailored output
- **Optional components**: Tree view, stats, TOC are configurable
- **Syntax highlighting hints**: Language tags in markdown
- **Streaming-ready**: Process files without loading all into memory

### 7. Interactive UI (`tui.ts`)

Interactive mode uses Ink (React for CLI) for terminal rendering.

**Component Architecture:**

```typescript
function App({ options }: { options: ResolvedOptions }) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stage, setStage] = useState<'loading' | 'selecting' | 'processing'>();

  return (
    <Box flexDirection="column">
      <Header />
      {stage === 'loading' && <LoadingIndicator />}
      {stage === 'selecting' && (
        <FileTree
          files={files}
          selected={selected}
          onSelect={setSelected}
        />
      )}
      {stage === 'processing' && <ProgressIndicator />}
      <TokenCounter selected={selected} />
    </Box>
  );
}
```

**Features:**
- Tree view with checkboxes
- Real-time token count updates
- Keyboard navigation
- Visual feedback

**Design Decisions:**
- **React paradigm**: Familiar for web developers
- **Component reuse**: UI pieces are composable
- **State management**: React hooks for simplicity
- **Graceful degradation**: Falls back to non-interactive if needed

### 8. Validation Layer (`validation.ts`)

Comprehensive validation ensures configuration correctness.

**Validation Types:**

```typescript
interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly suggestion: string;
}
```

**Validation Rules:**
- Glob patterns are syntactically valid
- Extensions don't include dots
- File sizes are positive numbers
- Provider names match known providers
- Output formats are supported

**Design Decisions:**
- **Early validation**: Catch errors before processing
- **Actionable errors**: Include fix suggestions
- **Warnings vs errors**: Distinguish severity
- **Composable rules**: Easy to add new validations

## Data Flow

### Non-Interactive Mode

```
CLI Arguments
    │
    ▼
Load Configuration Files
    │
    ▼
Resolve Options (merge defaults + config + CLI)
    │
    ▼
Validate Options
    │
    ▼
Scan File System
    │
    ▼
Apply Budget Constraints (if specified)
    │
    ▼
Render Output
    │
    ▼
Write to File
    │
    ▼
Display Token Analysis
```

### Interactive Mode

```
CLI Arguments
    │
    ▼
Load Configuration
    │
    ▼
Resolve Options
    │
    ▼
Scan File System
    │
    ▼
Launch TUI
    │
    ▼
User Selection Loop
    │  ┌─────────────────┐
    └─▶│  Display Tree    │
       │  Handle Input    │
       │  Update Selection│
       │  Show Token Count│
       └────────┬────────┘
                │
                ▼ (User confirms)
Apply Budget Constraints
    │
    ▼
Render Output
    │
    ▼
Write to File
```

## Performance Considerations

### Memory Management
- **Streaming file reads**: Don't load entire files into memory
- **Lazy content loading**: Only read content when rendering
- **Immutable data structures**: Prevent accidental mutations

### Speed Optimizations
- **Fast-glob**: Optimized glob pattern matching
- **Early filtering**: Exclude files before reading content
- **Parallel processing**: Where applicable
- **Caching**: Reuse computed values

### Scalability
- Handles repositories with 10,000+ files
- Processes multi-MB codebases efficiently
- Token estimation works for large content (100KB+)

## Error Handling Strategy

### Error Categories

1. **User Errors**: Invalid configuration, bad arguments
   - Clear message explaining what's wrong
   - Suggestion for how to fix
   - Exit code 1

2. **File System Errors**: Missing files, permission issues
   - Specific error message
   - Graceful degradation where possible
   - Exit code 1

3. **Unexpected Errors**: Programming bugs
   - Stack trace (in verbose mode)
   - Report to stderr
   - Exit code 1

### Example Error Handling

```typescript
if (scan.files.length === 0) {
  displayNoFilesError(options);
  // Shows:
  // - Possible reasons (exclusions, size limits)
  // - Suggested fixes (--dry-run, --verbose, --preset full)
  // - Contextual hints based on current options
  process.exit(1);
}
```

## Security Considerations

### Gitignore Respect
By default, respects `.gitignore`:
- Prevents including `node_modules`
- Excludes `.env` files
- Skips build artifacts

### No Remote Execution
- Pure local file operations
- No network requests (except optional features)
- No code execution

### Input Validation
- Paths are sanitized
- Glob patterns are validated
- No shell injection risks

## Testing Strategy

### Unit Tests
Each core module has corresponding tests:
```
src/core/
├── config.test.ts       # Configuration resolution
├── scan.test.ts         # File scanning
├── render.test.ts       # Output generation
├── tokens.test.ts       # Token estimation
├── validation.test.ts   # Validation logic
├── helpers.test.ts      # Utility functions
└── userSettings.test.ts # Preferences
```

### Test Categories
- **Unit**: Individual function behavior
- **Integration**: Module interactions
- **Snapshot**: Output format consistency
- **Edge cases**: Boundary conditions

### Testing Tools
- **Vitest**: Fast, modern test runner
- **Coverage**: Track test coverage
- **Mocking**: File system and dependencies

## Build and Distribution

### Build Configuration (tsup)

```typescript
// tsup.config.ts
export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node18',
});
```

### Package Structure

```
dist/
├── cli.js          # CLI entry point
├── cli.d.ts        # TypeScript definitions
├── index.js        # Library exports
└── index.d.ts      # Library types
```

### NPM Package

```json
{
  "bin": {
    "repo-roller": "./dist/cli.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "README.md", "LICENSE"]
}
```

## Future Architecture Considerations

### Planned Improvements

1. **Plugin System**: Allow custom processors
2. **Incremental Builds**: Cache and update only changes
3. **AST Analysis**: Deeper code understanding
4. **Import Graph**: Order files by dependencies

### Extension Points

- Custom presets via config
- Profile layouts for ordering
- Middleware for budget selection
- Format-specific renderers

---

## Summary

repo-roller's architecture prioritizes:

1. **Modularity**: Clear separation of concerns
2. **Extensibility**: Configuration and customization options
3. **Performance**: Efficient file processing
4. **Reliability**: Comprehensive validation and error handling
5. **Developer Experience**: Thoughtful defaults and clear feedback

The codebase is designed to be maintainable, testable, and adaptable to future requirements while remaining simple enough for contributors to understand.
