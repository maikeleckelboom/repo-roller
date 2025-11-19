# LLM Workflows

repo-roller is designed specifically for working with Large Language Models. This guide covers best practices, common workflows, token optimization strategies, and tips for getting the most value from LLMs when analyzing your code.

## Understanding LLM Context Windows

### Context Window Sizes

Different LLMs have different context windows (as of 2024):

| Model | Context Window | Sweet Spot | repo-roller Flag |
|-------|----------------|------------|------------------|
| Claude 3.5 Sonnet | 200k tokens | 100-150k | `--target claude-3.5-sonnet` |
| Claude 3 Opus | 200k tokens | 100-150k | `--target claude-opus` |
| GPT-4 Turbo | 128k tokens | 60-100k | `--target gpt-4-turbo` |
| GPT-4o | 128k tokens | 60-100k | `--target gpt-4o` |
| Gemini 1.5 Pro | 1M tokens | 200-500k | `--target gemini-1.5-pro` |

### Token Budgeting

Leave room for:
- **Input (your code)** - The bundle you generate
- **Output (LLM response)** - Analysis, suggestions, code
- **Conversation** - Back-and-forth discussion

**Rule of thumb:** Use 50-75% of context for input, reserve 25-50% for output and conversation.

**Example for Claude 3.5 Sonnet (200k total):**
```bash
# Target 100k tokens for your code (50%)
repo-roller --max-tokens 100000 --target claude-3.5-sonnet
```

This leaves 100k for the LLM's response and follow-up questions.

## Workflow 1: Code Review

### Goal
Get LLM feedback on code quality, bugs, and best practices.

### Setup

```bash
# Full review of core modules
repo-roller --preset typescript \
  --include "src/core/**" \
  --no-tests \
  --strip-comments \
  --max-tokens 80000 \
  --target claude-3.5-sonnet \
  -o review.md
```

### Prompt Template

```markdown
# Code Review Request

Please review the following code for:

1. **Bugs and Logic Errors** - Identify potential issues
2. **Security Vulnerabilities** - Check for common security problems
3. **Performance Issues** - Suggest optimizations
4. **Code Quality** - Recommend improvements
5. **Best Practices** - Highlight violations

Focus on high-impact issues first. For each issue:
- Explain what's wrong
- Why it matters
- How to fix it
- Example of the fix

[Paste bundle here]
```

### Tips

- **Strip comments** - Let LLM focus on code
- **Exclude tests** - Unless reviewing test quality
- **Use profiles** - Order files logically (core first)
- **Limit scope** - Review one module at a time

## Workflow 2: Refactoring Assistance

### Goal
Get LLM help planning and executing refactoring.

### Setup

```bash
# Current state
repo-roller --include "src/legacy/**" \
  --preset typescript \
  --max-tokens 50000 \
  -o current-state.md
```

### Prompt Template

```markdown
# Refactoring Planning

I need to refactor this legacy code to:
- [Your goals: e.g., improve testability, reduce complexity, modernize patterns]

Current state:
[Paste bundle here]

Please provide:
1. **Analysis** - Current issues and technical debt
2. **Strategy** - High-level refactoring approach
3. **Steps** - Ordered list of refactoring steps
4. **Risks** - What could go wrong
5. **Tests** - What tests to add/update

For each step, explain:
- What to change
- Why this order
- How to verify correctness
```

### Iterative Approach

After LLM suggests changes:

```bash
# Generate updated bundle
repo-roller --include "src/legacy/**" \
  --preset typescript \
  -o updated-state.md

# Show what changed
repo-roller --diff refactor-start \
  --include "src/legacy/**" \
  -o refactoring-diff.md
```

Ask LLM: "Review my refactoring progress. Did I follow your suggestions correctly?"

## Workflow 3: Architecture Documentation

### Goal
Generate architectural documentation from code.

### Setup

```bash
# Comprehensive codebase view
repo-roller --profile core-first \
  --preset typescript \
  --no-tests \
  --with-tree \
  --with-stats \
  --max-tokens 120000 \
  -o architecture-context.md
```

### Prompt Template

```markdown
# Architecture Documentation Request

Please analyze this codebase and generate comprehensive documentation:

[Paste bundle here]

Generate:

## 1. Overview
- High-level purpose
- Key capabilities
- Technology stack

## 2. Architecture
- Component breakdown
- Module responsibilities
- Data flow
- Key abstractions

## 3. File Organization
- Directory structure explanation
- Module dependencies
- Entry points

## 4. Design Patterns
- Patterns used
- Why chosen
- Implementation examples

## 5. Extension Points
- How to add features
- Plugin system (if any)
- Configuration options

Make it suitable for new developers joining the project.
```

### Tips

- **Include tree** - Helps LLM understand structure
- **Use profiles** - Present code in logical order
- **Keep stats** - Shows project scope
- **Split if needed** - Document modules separately

## Workflow 4: Bug Investigation

### Goal
Find and fix bugs with LLM assistance.

### Setup

```bash
# Recent changes (bug likely here)
repo-roller --most-recent 20 \
  --include "src/**" \
  --ext ts \
  -o recent-changes.md

# Or specific module
repo-roller --include "src/buggy-module/**" \
  --preset typescript \
  -o bug-context.md
```

### Prompt Template

```markdown
# Bug Investigation

**Bug Description:**
[Describe the bug, steps to reproduce, expected vs actual behavior]

**Error Messages:**
```
[Paste error logs]
```

**Relevant Code:**
[Paste bundle here]

Please help me:
1. **Identify** - Where is the bug?
2. **Explain** - Why does it happen?
3. **Fix** - How to fix it?
4. **Prevent** - How to prevent similar bugs?
5. **Test** - What tests should I add?

Provide the specific code changes needed.
```

### Advanced: Include Tests

```bash
# Include both code and tests
repo-roller --include "src/module/**" \
  --include "tests/module/**" \
  --ext ts \
  -o bug-with-tests.md
```

Prompt: "The tests pass but there's still a bug. What am I missing?"

## Workflow 5: Feature Implementation

### Goal
Get LLM help implementing new features.

### Setup

```bash
# Related existing code
repo-roller --include "src/similar-feature/**" \
  --include "src/types/**" \
  --preset typescript \
  --max-tokens 60000 \
  -o similar-features.md
```

### Prompt Template

```markdown
# Feature Implementation Request

**New Feature:**
[Describe the feature]

**Requirements:**
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

**Existing Similar Code:**
[Paste bundle here]

Please provide:
1. **Design** - How to structure the new feature
2. **Implementation** - Step-by-step code
3. **Integration** - How to integrate with existing code
4. **Testing** - Test cases to add
5. **Edge Cases** - What to watch out for

Follow the patterns and conventions from the existing code.
```

### Iterative Development

```bash
# After implementing
repo-roller --diff feature-start \
  --include "src/new-feature/**" \
  -o implementation.md
```

Ask LLM: "Review my implementation. Does it match requirements?"

## Workflow 6: Test Generation

### Goal
Generate comprehensive tests for code.

### Setup

```bash
# Code to test
repo-roller --include "src/module/**" \
  --exclude "**/*.test.ts" \
  --preset typescript \
  --max-tokens 40000 \
  -o code-to-test.md
```

### Prompt Template

```markdown
# Test Generation Request

Please generate comprehensive tests for this code:

[Paste bundle here]

Requirements:
- Use [testing framework: Jest, Vitest, etc.]
- Cover happy paths
- Cover edge cases
- Cover error cases
- Include integration tests if needed
- Follow AAA pattern (Arrange, Act, Assert)

For each function/class:
1. List test cases
2. Write the tests
3. Explain what each test verifies

Aim for 80%+ coverage.
```

### Example Output Request

```markdown
Generate tests that match the style of these existing tests:

[Include example test file from your project]
```

## Workflow 7: API Documentation

### Goal
Generate API documentation from code.

### Setup

```bash
# Public API
repo-roller --include "src/api/**" \
  --include "src/types/**" \
  --preset typescript \
  --strip-comments \
  --max-tokens 70000 \
  -o api-code.md
```

### Prompt Template

```markdown
# API Documentation Generation

Generate comprehensive API documentation for:

[Paste bundle here]

Format:

## Endpoints / Functions

For each:
- **Signature** - Function/endpoint definition
- **Description** - What it does
- **Parameters** - Type, description, required/optional
- **Returns** - Return type and description
- **Examples** - Usage examples
- **Errors** - Possible errors and handling

Use JSDoc/TSDoc format for inline documentation.
Also generate a high-level overview of the API structure.
```

## Workflow 8: Security Audit

### Goal
Identify security vulnerabilities.

### Setup

```bash
# Security-critical code
repo-roller --include "src/auth/**" \
  --include "src/security/**" \
  --include "src/api/middleware/**" \
  --preset typescript \
  --max-tokens 80000 \
  -o security-review.md
```

### Prompt Template

```markdown
# Security Audit Request

Please perform a security audit on this code:

[Paste bundle here]

Check for:

1. **Authentication Issues**
   - Weak authentication
   - Missing authentication
   - Token handling

2. **Authorization Issues**
   - Missing access checks
   - Privilege escalation
   - IDOR vulnerabilities

3. **Input Validation**
   - SQL injection
   - XSS vulnerabilities
   - Command injection
   - Path traversal

4. **Data Exposure**
   - Sensitive data in logs
   - Unencrypted secrets
   - Information leakage

5. **Dependencies**
   - Known vulnerable packages
   - Outdated libraries

For each issue:
- Severity (Critical/High/Medium/Low)
- Description
- Exploitation scenario
- Fix recommendation
- Example of secure code
```

## Workflow 9: Performance Optimization

### Goal
Identify and fix performance bottlenecks.

### Setup

```bash
# Performance-critical code
repo-roller --include "src/core/engine.ts" \
  --include "src/utils/performance.ts" \
  --preset typescript \
  --max-tokens 50000 \
  -o performance-critical.md
```

### Prompt Template

```markdown
# Performance Optimization Request

Analyze this code for performance issues:

[Paste bundle here]

**Context:**
- Runtime: [Node.js/Browser/etc.]
- Scale: [Request volume, data size, etc.]
- Current issues: [Slow operations, high memory, etc.]

Please identify:

1. **Algorithmic Issues**
   - Time complexity problems
   - Better algorithms
   - Data structure improvements

2. **Memory Issues**
   - Memory leaks
   - Unnecessary allocations
   - Caching opportunities

3. **I/O Issues**
   - Unnecessary reads/writes
   - Parallelization opportunities
   - Batching possibilities

4. **General Optimizations**
   - Premature optimizations
   - Hot paths to optimize
   - Profiling suggestions

Prioritize by impact.
```

## Token Optimization Strategies

### 1. Strip Comments

Comments consume tokens but LLMs can understand code without them:

```bash
repo-roller --strip-comments
```

**Savings:** 10-30% depending on comment density

**When to keep comments:**
- Documenting complex algorithms
- Business logic explanations
- API documentation

### 2. Exclude Tests

Tests often double your token count:

```bash
repo-roller --no-tests
```

**Savings:** 30-50% in well-tested codebases

**When to include:**
- Reviewing test quality
- Generating more tests
- Understanding behavior through tests

### 3. Exclude Generated Files

Generated files waste tokens:

```bash
repo-roller --no-generated
```

**Savings:** 10-40% depending on generators

### 4. Use Compact Format

Reduce formatting overhead:

```bash
repo-roller --compact
```

**Savings:** 5-10%

### 5. Focus on Specific Files

Only include what's needed:

```bash
# Instead of entire codebase
repo-roller --include "src/feature/**"

# Instead of all TypeScript
repo-roller --include "src/core/*.ts"
```

**Savings:** 50-90% depending on scope

### 6. Remove Tree and Stats

If not needed:

```bash
repo-roller --no-tree --no-stats
```

**Savings:** ~1-5%

### 7. Split Large Codebases

For codebases exceeding context limits:

```bash
# Split by module
repo-roller --include "src/module-a/**" -o module-a.md
repo-roller --include "src/module-b/**" -o module-b.md

# Analyze separately or iteratively
```

### 8. Use Presets

Presets apply multiple optimizations:

```bash
# Minimal preset (strip comments, no tree, no stats, compact)
repo-roller --preset minimal
```

## Cost Management

### Understand Costs

Costs vary by provider (as of 2024):

| Model | Input Cost | Output Cost | 100k tokens |
|-------|------------|-------------|-------------|
| Claude 3.5 Sonnet | $3/M | $15/M | $0.30 in |
| Claude 3 Opus | $15/M | $75/M | $1.50 in |
| GPT-4 Turbo | $10/M | $30/M | $1.00 in |
| GPT-4o | $5/M | $15/M | $0.50 in |
| Gemini 1.5 Pro | $3.50/M | $10.50/M | $0.35 in |

### Set Cost Limits

```bash
# Maximum $1 input cost
repo-roller --max-cost 1.00 --target claude-3.5-sonnet

# Maximum 100k tokens
repo-roller --max-tokens 100000
```

### Monitor Costs

```bash
# Check estimated cost before generating
repo-roller --stats-only --target claude-3.5-sonnet

# View history costs
repo-roller history stats
```

### Cost Optimization Tips

1. **Start small** - Test with subset before full codebase
2. **Use cheaper models** - Claude Haiku or GPT-3.5 for simple tasks
3. **Strip comments** - Reduces tokens
4. **Exclude tests** - Unless needed
5. **Focus scope** - Only include relevant files
6. **Reuse bundles** - Don't regenerate for same conversation

## Best Practices

### 1. Start with Context Fit

Check if your bundle fits before sending:

```bash
repo-roller --preset typescript \
  --max-tokens 150000 \
  --target claude-3.5-sonnet
```

Look for: `✓ Fits comfortably with room for conversation`

### 2. Order Files Logically

Use profiles to present code in understandable order:

```bash
repo-roller --profile core-first
```

LLMs understand better when entry points and core logic come first.

### 3. Include Directory Tree

Help LLM understand structure:

```bash
repo-roller --with-tree
```

### 4. Be Specific in Prompts

Generic prompt:
> "Review this code"

Better prompt:
> "Review this authentication code for security vulnerabilities, focusing on JWT validation and session management"

### 5. Iterative Analysis

For large codebases:

```bash
# Phase 1: Core modules
repo-roller --include "src/core/**" -o phase1.md

# Phase 2: Features
repo-roller --include "src/features/**" -o phase2.md

# Phase 3: Integration
repo-roller --include "src/integration/**" -o phase3.md
```

Analyze each phase separately.

### 6. Use Git Integration

Focus on changes:

```bash
# Review only what changed
repo-roller --diff main --preset typescript
```

More efficient than reviewing entire codebase.

### 7. Track Successful Workflows

Tag successful generations:

```bash
repo-roller --preset typescript -o review.md
repo-roller history tag -1 "good-review-workflow"

# Later replicate
repo-roller history show good-review-workflow
```

### 8. Leverage Model Strengths

**Claude (Sonnet/Opus):**
- Code analysis and review
- Complex reasoning
- Nuanced explanations
- Creative problem-solving

**GPT-4 (Turbo/o):**
- Code generation
- Broad knowledge
- Consistent formatting
- Fast responses

**Gemini 1.5 Pro:**
- Very large context (1M tokens)
- Entire codebases
- Long conversations
- Multi-file reasoning

Choose the right model for the task.

## Example Workflows

### Example 1: Onboarding New Developer

```bash
# Generate comprehensive overview
repo-roller --profile core-first \
  --preset typescript \
  --with-tree \
  --max-tokens 120000 \
  --target claude-3.5-sonnet \
  -o onboarding.md
```

Prompt:
> "Generate a comprehensive onboarding guide for a new developer. Explain the architecture, key components, coding conventions, and where to start making changes."

### Example 2: Pre-Deployment Security Check

```bash
# Security-critical code
repo-roller --include "src/auth/**" \
  --include "src/api/**" \
  --include "src/db/**" \
  --preset typescript \
  --max-tokens 100000 \
  -o security-check.md
```

Prompt:
> "Perform a pre-deployment security audit. Check for authentication bypasses, SQL injection, XSS, CSRF, and other OWASP Top 10 vulnerabilities."

### Example 3: Migration Planning

```bash
# Current implementation
repo-roller --include "src/old-system/**" \
  --preset typescript \
  -o current-system.md
```

Prompt:
> "I need to migrate from this old system to [new technology]. Analyze the current implementation and provide a detailed migration plan with steps, risks, and code examples."

## Troubleshooting

### Bundle Too Large

**Problem:** Generated bundle exceeds LLM context

**Solution:**
```bash
# Add token limit
repo-roller --max-tokens 100000

# Or split by module
repo-roller --include "src/module-a/**"
```

### LLM Confused by File Order

**Problem:** LLM doesn't understand code structure

**Solution:**
```bash
# Use logical ordering
repo-roller --profile core-first

# Or order manually in .reporoller.yml
```

### Poor Analysis Quality

**Problem:** LLM provides generic or incorrect feedback

**Solution:**
- **Improve prompt** - Be more specific
- **Reduce scope** - Analyze one module at a time
- **Add context** - Include related files
- **Try different model** - Some excel at different tasks

### High Costs

**Problem:** Token costs adding up

**Solution:**
```bash
# Set budget
repo-roller --max-cost 5.00

# Use cheaper model
repo-roller --target claude-haiku

# Optimize tokens
repo-roller --preset minimal
```

## Related Documentation

- **[Token Estimation](/guide/token-estimation)** - Understanding token counts
- **[Budget Management](/guide/budget-management)** - Cost control
- **[Presets](/guide/presets)** - Pre-configured settings
- **[Git Integration](/guide/git-integration)** - Focus on changes

## Next Steps

- **Try a workflow** - Pick one from this guide
- **Optimize tokens** - Strip comments, exclude tests
- **Set budgets** - Use `--max-tokens` or `--max-cost`
- **Track what works** - Tag successful workflows in history
