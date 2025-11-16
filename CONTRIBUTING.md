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

- We use ESLint with TypeScript rules
- Run `npm run lint:fix` before committing
- Use TypeScript strict mode
- Follow existing patterns in the codebase

### Testing

All changes should include appropriate tests:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/core/tokens.test.ts

# Run tests with coverage
npm test -- --coverage
```

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

For detailed architecture information, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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
