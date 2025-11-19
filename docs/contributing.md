# Contributing to repo-roller

Thanks for your interest in contributing to repo-roller! This document will help you get started.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm (comes with Node.js)

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/repo-roller.git
   cd repo-roller
   ```

3. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Run tests to ensure everything works:
   ```bash
   npm test
   ```

## Development Workflow

### Running the CLI locally

```bash
# Run directly with tsx (no build needed)
npm run dev

# Or after building
node dist/cli.js .
```

### Available Scripts

```bash
npm run dev          # Run CLI with tsx (development)
npm run build        # Build the project
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Check for linting issues
npm run lint:fix     # Auto-fix linting issues
npm run typecheck    # Run TypeScript type checking
```

### Project Structure

```
src/
├── cli.ts              # Main CLI entry point
├── cli/                # CLI layer (commands, display, validation)
├── core/               # Core business logic (scanning, rendering, tokens)
├── components/         # React/Ink TUI components
└── index.ts            # Library exports

tests/
├── *.test.ts           # Unit tests
└── *.test.tsx          # Component tests
```

## Making Changes

### Code Style

We use TypeScript strict mode with no compromises. Here are the key rules:

**No `any` types:**
```typescript
// BAD
function process(data: any) { ... }

// GOOD
function process(data: FileInfo) { ... }
```

**Readonly by default:**
```typescript
// BAD
interface Config {
  files: string[];
}

// GOOD
interface Config {
  readonly files: readonly string[];
}
```

**Pure functions when possible:**
```typescript
// BAD: Function with side effects
function formatFiles(files: FileInfo[]): void {
  files.sort((a, b) => a.sizeBytes - b.sizeBytes);
  console.log(files);
}

// GOOD: Pure function
function sortFilesBySize(files: readonly FileInfo[]): FileInfo[] {
  return [...files].sort((a, b) => a.sizeBytes - b.sizeBytes);
}
```

**Descriptive naming:**
```typescript
// BAD
function proc(f: FileInfo[]): string[] { ... }

// GOOD
function extractFilePaths(files: readonly FileInfo[]): string[] { ... }
```

Run `npm run lint:fix` before committing.

### Module Organization

Each core module has a JSDoc header explaining its responsibilities. Check the header to understand:
- What the module **OWNS** (its responsibilities)
- What it **DOES NOT OWN** (defer to other modules)
- **TYPICAL USAGE** examples

When adding code, respect these boundaries. If you're unsure where something belongs, check the related module headers first.

### Adding a Feature

1. **Identify the domain** - Which module is responsible?
2. **Add types first** in `src/core/types.ts`
3. **Implement logic** in the appropriate core module
4. **Add tests** alongside your implementation
5. **Wire into CLI** if it's a user-facing feature

### Testing

All changes should include appropriate tests:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/core/tokens.test.ts

# Run tests with coverage
npm test -- --coverage

# Watch mode for development
npm run test:watch
```

**Test structure:**
```typescript
describe('Token Estimation', () => {
  it('estimates ~1 token per 4 characters for typical code', () => {
    const code = 'function add(a, b) { return a + b; }';
    const tokens = estimateTokens(code);
    expect(tokens).toBeCloseTo(code.length / 4, 1);
  });
});
```

**What to test:**
- Happy path (typical usage)
- Edge cases (empty input, large input)
- Error conditions
- Boundary values

### Type Checking

Ensure your code passes type checking:

```bash
npm run typecheck
```

## Submitting Changes

### Pull Request Process

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "Add your feature description"
   ```

3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Open a Pull Request on GitHub

### PR Checklist

Before submitting, ensure:

- [ ] **Build passes**: `npm run build`
- [ ] **Lint passes**: `npm run lint`
- [ ] **Tests pass**: `npm test`
- [ ] **No `any` types**: TypeScript strict mode
- [ ] **Tests added**: New features have tests
- [ ] **Types are readonly**: Immutable by default
- [ ] **JSDoc added**: Public functions have documentation

### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, Refactor)
- Keep the first line under 72 characters

Examples:
- `Add clipboard support with --copy flag`
- `Fix token estimation for large files`
- `Update README with output examples`

### Changesets

We use [changesets](https://github.com/changesets/changesets) for version management. If your PR includes user-facing changes:

```bash
npm run changeset
```

This will prompt you to:
1. Select the type of change (patch, minor, major)
2. Write a description of the change

## Areas for Contribution

### Good First Issues

- Improve documentation
- Add more test coverage
- Fix typos or clarify existing docs

### Feature Ideas

- Add more language presets
- Improve token estimation accuracy
- Add new output formats
- Enhance interactive mode

### Bug Fixes

- Check the [Issues](https://github.com/maikeleckelboom/repo-roller/issues) page for reported bugs

## Architecture

For detailed architecture information, see the [ARCHITECTURE.md](https://github.com/maikeleckelboom/repo-roller/blob/main/ARCHITECTURE.md) file in the repository root.

Key concepts:
- **CLI Layer**: User interaction, argument parsing, display
- **Core Layer**: Business logic, file scanning, token estimation
- **TUI Components**: React-based interactive terminal UI

## Questions?

If you have questions about contributing, feel free to:
- Open an issue on GitHub
- Check existing documentation in the `docs/` folder

## License

By contributing to repo-roller, you agree that your contributions will be licensed under the MIT License.

---

**Related Documentation:**
- [Development Guide](https://github.com/maikeleckelboom/repo-roller/blob/main/DEVELOPING.md)
- [Architecture Overview](https://github.com/maikeleckelboom/repo-roller/blob/main/ARCHITECTURE.md)
- [API Reference](/api/)
