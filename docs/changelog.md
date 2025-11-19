# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-16

### Added
- JSON output format support (`--format json`)
- YAML output format support (`--format yaml`)
- Interactive file selection mode (`--interactive`)
- Budget constraints with `--max-tokens` and `--max-cost` flags
- Daemon mode for background processing
- History tracking for bundle generations
- CLI schema introspection (`__schema` command)
- Custom presets via `repo-roller.config.mjs`
- Profile-based file ordering via `.reporoller.yml`
- Token estimation with ~95% accuracy for large codebases
- Cost estimation for 8+ LLM providers (Claude, GPT-4, GPT-o1, Gemini)
- Comprehensive documentation in `docs/` folder
- Shell completion support (bash, zsh, fish)
- Clipboard copy functionality (`--copy`)
- Prompt suggestion system
- User settings persistence

### Changed
- Improved architectural layering (CLI vs Core separation)
- Enhanced type safety across the codebase
- Optimized file scanning performance
- Better error messages and validation
- Enhanced TUI with tree state persistence
- Improved token estimation accuracy

### Fixed
- Type errors in schema generation
- Config loading edge cases
- File role categorization accuracy
- Binary file detection edge cases
- Nested directory filename generation

## [0.1.0] - Initial Release

### Added
- Core file aggregation functionality
- Markdown, plain text output formats
- `.gitignore` respect by default
- Language-specific presets (TypeScript, JavaScript, Python, Go, Rust)
- File filtering by extension, size, and patterns
- Comment stripping (basic regex)
- Directory tree generation
- Token estimation (heuristic-based)
- CLI with Commander.js
- Interactive TUI with React/Ink

---

View the full changelog on [GitHub](https://github.com/maikeleckelboom/repo-roller/releases).
