# Why repo-roller?

This document explains the motivation behind repo-roller and the problems it solves.

## The Challenge: Working with LLMs and Codebases

When working with AI coding assistants like Claude, GPT-4, or Gemini, developers commonly need to share their entire codebase or significant portions of it. This presents several challenges:

### 1. Token Limits Are Invisible

LLMs have context windows measured in tokens, but developers work in files and lines of code. Questions arise:

- Will my code fit in Claude's 200k token context?
- How much will it cost to analyze my entire codebase?
- Which files should I include to stay within budget?

**Without repo-roller:**
```bash
# Manual process
cat src/**/*.ts > bundle.txt
# Copy to Claude... does it fit? 🤷
# Error: Context too long
```

**With repo-roller:**
```bash
repo-roller --preset ts --max-tokens 150000 --target claude-3.5-sonnet
# ✓ 142,234 tokens (within budget)
# ✓ Estimated cost: $2.13
# ✓ Generated: my-project-2024-01-15.md
```

### 2. Manual File Selection is Tedious

Gathering files manually is error-prone and time-consuming:

- Copy-pasting files one by one
- Forgetting important dependencies
- Including unnecessary files (tests, configs, node_modules)
- Manually formatting with code fences
- Losing track of what was included

**Without repo-roller:**
```bash
# 30 minutes of manual work:
# 1. Find all TypeScript files
# 2. Copy each file
# 3. Add markdown code fences
# 4. Add file paths as headers
# 5. Hope you didn't miss anything
```

**With repo-roller:**
```bash
repo-roller --preset ts
# Done in 2 seconds ✓
```

### 3. Cost Uncertainty

LLM API costs can add up, especially for large codebases. Developers need to know:

- How much will this request cost?
- Can I afford to analyze this codebase?
- Which provider offers the best value?

**repo-roller provides upfront cost estimates:**

```
Estimated Cost Analysis:
┌─────────────────────┬──────────┬────────────┐
│ Provider            │ Input    │ Output*    │
├─────────────────────┼──────────┼────────────┤
│ Claude 3.5 Sonnet   │ $0.68    │ $3.39      │
│ GPT-4 Turbo         │ $1.42    │ $4.26      │
│ Gemini 1.5 Pro      │ $0.51    │ $2.04      │
└─────────────────────┴──────────┴────────────┘
*Assuming 1:1 input/output ratio
```

### 4. Lack of Reproducibility

When you share code with an LLM:

- How do you recreate the same bundle later?
- What files were included in that successful analysis?
- How has your codebase changed since then?

**repo-roller tracks history:**

```bash
# All generations are tracked
repo-roller history list

# Replay previous generation
repo-roller history show abc123 --replay

# Compare with current state
repo-roller history diff abc123
```

### 5. Context Optimization

With limited tokens, you need to be strategic:

- Include core files first
- Exclude tests and dependencies
- Prioritize recently changed files
- Fit maximum value in minimum tokens

**repo-roller offers smart prioritization:**

```bash
# Most recently changed files
repo-roller --most-recent 10

# Changed since last release
repo-roller --diff v1.0.0

# Custom file ordering
repo-roller --profile core-first  # From .reporoller.yml
```

## How repo-roller Solves These Problems

### Smart Scanning

- Respects .gitignore automatically
- Fast glob-based file discovery
- Intelligent default exclusions
- Language-aware filtering

### Accurate Token Estimation

- Support for 25+ LLM providers
- Real token counting (not approximation)
- Cost calculation in multiple currencies
- Provider comparison tool

### Budget Management

- Set token or cost limits
- Automatic file prioritization
- Fits maximum value in budget
- Visual budget usage indicators

### Multiple Workflows

- **CLI**: Fast, scriptable, CI/CD-friendly
- **Interactive TUI**: Visual file selection
- **Daemon Mode**: Background processing
- **Programmatic API**: Integration into tools

### Comprehensive Tracking

- Generation history with metadata
- Searchable and taggable entries
- Diff between generations
- Export and import capabilities

## Real-World Use Cases

### Use Case 1: Code Review with Claude

**Problem:** Need to review a pull request with full context.

**Solution:**
```bash
# Get all changed files in PR
repo-roller --diff main --max-tokens 100000 -o pr-review.md
```

**Result:** Complete PR context in one file, ready for Claude analysis.

---

### Use Case 2: Documentation Generation

**Problem:** Generate API documentation from source code.

**Solution:**
```bash
# Export all source files as JSON
repo-roller --include "src/**/*.ts" --no-tests --format json -o api-source.json
```

**Result:** Structured data ready for documentation tools.

---

### Use Case 3: Cost-Effective Analysis

**Problem:** Want to analyze codebase but worried about API costs.

**Solution:**
```bash
# Stay within $5 budget
repo-roller --max-cost 5.00 --target claude-3.5-sonnet
```

**Result:** Maximum code within budget, with cost guarantee.

---

### Use Case 4: Onboarding New Developers

**Problem:** New team member needs to understand codebase structure.

**Solution:**
```bash
# Generate comprehensive overview with architecture first
repo-roller --profile architecture-first --include "**/*.md"
```

**Result:** Well-organized code bundle for learning.

---

### Use Case 5: Bug Investigation

**Problem:** LLM needs context to help debug an issue.

**Solution:**
```bash
# Get files related to authentication
repo-roller --include "**/auth/**" --include "**/security/**" --most-recent 5
```

**Result:** Focused context for effective debugging.

## Comparison with Alternatives

### Manual Copy-Paste

| Aspect | Manual | repo-roller |
|--------|--------|-------------|
| Time | 15-30 min | 2 seconds |
| Accuracy | Error-prone | Automated |
| Token estimation | None | Built-in |
| Cost estimation | None | Built-in |
| Reproducibility | Manual notes | Automatic tracking |
| Format | Inconsistent | Standardized |

### Custom Scripts

| Aspect | Custom Script | repo-roller |
|--------|---------------|-------------|
| Development time | Hours/days | 0 (ready to use) |
| Token counting | Must implement | Built-in (25+ providers) |
| Cost calculation | Must implement | Built-in |
| TUI | Must implement | Built-in |
| Maintenance | Your responsibility | Maintained |
| Features | Limited | Comprehensive |

### Generic File Concatenation Tools

| Aspect | Generic Tool | repo-roller |
|--------|--------------|-------------|
| LLM-aware | No | Yes |
| Token estimation | No | Yes |
| Cost calculation | No | Yes |
| Budget constraints | No | Yes |
| History tracking | No | Yes |
| Format options | Limited | 4 formats |
| Configuration | Basic | Advanced |

## Design Philosophy

repo-roller is built with several guiding principles:

### 1. Developer Experience First

- Intuitive CLI with sensible defaults
- Beautiful interactive TUI when needed
- Clear error messages and validation
- Comprehensive documentation

### 2. Token Awareness

- LLMs think in tokens, not files
- Developers should too when sharing code
- Upfront estimation prevents surprises
- Budget constraints ensure success

### 3. Flexibility

- Multiple output formats
- Extensive configuration options
- Preset system for quick starts
- Profile system for repeatability

### 4. Performance

- Fast file scanning with fast-glob
- Efficient token estimation
- Minimal dependencies
- Optional daemon mode for speed

### 5. Reliability

- Comprehensive TypeScript types
- Extensive test coverage
- Validation at every step
- Immutable data structures

## Who Should Use repo-roller?

repo-roller is perfect for:

- **AI-Assisted Developers**: Regularly sharing code with Claude, GPT, or Gemini
- **Documentation Writers**: Extracting code for documentation
- **Code Reviewers**: Providing context for reviews
- **DevOps Engineers**: CI/CD integration and automation
- **Tech Leads**: Code analysis and architecture reviews
- **Educators**: Sharing code examples with students
- **Open Source Maintainers**: Analyzing contributions and PRs

## Next Steps

- **[Get Started](/guide/getting-started)** - Install and generate your first bundle
- **[Explore Features](/guide/file-scanning)** - Learn about core capabilities
- **[Read Examples](/guide/examples)** - See common use cases
- **[Contribute](https://github.com/maikeleckelboom/repo-roller/blob/main/CONTRIBUTING.md)** - Help improve repo-roller

## Community Feedback

> "repo-roller saved me hours of manual work when preparing code for Claude. The token estimation alone is worth it."
> — Developer using Claude for code reviews

> "The interactive mode is beautiful. I can see exactly what I'm including and the cost before generating."
> — Tech lead using GPT-4 for architecture analysis

> "Budget management is a game-changer. I can confidently analyze codebases without worrying about API costs."
> — Startup founder optimizing for cost

---

**Have questions or feedback?**

- [GitHub Issues](https://github.com/maikeleckelboom/repo-roller/issues)
- [Discussions](https://github.com/maikeleckelboom/repo-roller/discussions)
