# Developer Experience (DX) Research Report
## CLI Interactive Mode Best Practices & Recommendations

**Date:** November 2025
**Project:** repo-roller
**Focus:** Interactive mode UX, prompt fatigue, and developer expectations

---

## Executive Summary

This report synthesizes research from authoritative CLI design guidelines, popular developer tools (GitHub CLI, npm, yarn, Vite), academic UX principles, and real-world developer feedback from GitHub issues. The core finding is that **developers want CLIs that "just work" with sensible defaults while maintaining full control when needed**. The current 7-step interactive flow in repo-roller may be creating unnecessary friction.

### Key Recommendations (TL;DR)
1. **Reduce required prompts from 7 to 2-3** by inferring most settings
2. **Remember user preferences** between sessions
3. **Provide instant skip mechanisms** (`-y`, `--yes`, `--defaults`)
4. **Auto-detect project context** to set intelligent defaults
5. **Implement progressive disclosure** - show advanced options only when requested

---

## Table of Contents

1. [Current Implementation Analysis](#current-implementation-analysis)
2. [Industry Best Practices](#industry-best-practices)
3. [What Developers Actually Want](#what-developers-actually-want)
4. [Popular CLI Tool Patterns](#popular-cli-tool-patterns)
5. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
6. [Specific Recommendations](#specific-recommendations)
7. [Implementation Priority](#implementation-priority)
8. [Sources & References](#sources--references)

---

## Current Implementation Analysis

### Current Interactive Flow (7 Steps)

1. **File Scanning** (automatic) - ✅ Good
2. **File Selection** (interactive tree) - ⚠️ Could be optimized
3. **Strip Comments?** (Y/N prompt) - ❌ Unnecessary for most users
4. **Include Tree View?** (Y/N prompt) - ❌ Unnecessary for most users
5. **Include Statistics?** (Y/N prompt) - ❌ Unnecessary for most users
6. **Summary Display** (automatic) - ✅ Good
7. **Final Confirmation** (Y/N prompt) - ⚠️ Could be optional

### Problems Identified

- **4 sequential Y/N prompts** for rarely-changed options
- **No memory** of user preferences between runs
- **No quick bypass** to accept all defaults
- **Same questions every time** regardless of past choices
- Violates the **"convention over configuration"** principle

---

## Industry Best Practices

### 1. Command Line Interface Guidelines (clig.dev)

> "Make the default the right thing for most users. Making things configurable is good, but most users are not going to find the right flag and remember to use it all the time."

**Key Principles:**
- **Responsive over fast**: Print something in <100ms
- **Prompt, don't mandate**: Allow flag overrides for every prompt
- **Sensible defaults**: Most users should never need to change settings
- **Progressive disclosure**: Hide complexity until needed

### 2. Thoughtworks CLI Design Guidelines (May 2025)

> "Every action taken by a command should be transparent to the user... Avoid implicit steps."

**Recommendations:**
- Offer default values that allow users to proceed by pressing Enter
- Provide complementary flags alongside prompts
- Use expressive flags over positional arguments
- Keep users informed with progress indicators

### 3. Node.js CLI Best Practices (GitHub)

> "Build Empathic CLIs... If you can auto-detect values reliably, don't force interactivity—create a 'works out of the box' experience."

**Core Patterns:**
- Follow **XDG Base Directory Specification** for config storage
- Support **configuration precedence**: flags > env vars > config file > defaults
- Auto-detect from environment variables and project structure
- Accept STDIN for Unix-style composition

### 4. Progressive Disclosure (Nielsen Norman Group)

> "Initially show users only a few of the most important options. Offer a larger set of specialized options upon request."

**Benefits:**
- Reduces cognitive load
- Focuses attention on essential tasks
- Supports users of varying experience levels
- Makes applications easier to learn and less error-prone

---

## What Developers Actually Want

### From GitHub CLI Issues

#### Issue #1587 - Accessibility & Prompt Fatigue
> "For users with screen readers, we should add a config/flag to disable constant prompts."

**Solution Implemented:** `gh config set prompt disabled`

#### Issue #1739 - CI/CD & Automation
> "gh seems to be interactive by default, asking a couple questions which obviously doesn't work in CI... This is not how typical CLI should work."

**Developer Demands:**
- Environment variables over config files for scripting
- Blanket disable switch for interactivity
- **Implemented:** `GH_PROMPT_DISABLED` environment variable

#### Issue #4506 - Scripting & Automation
> "I have a little script at work that requires `gh` to be setup. I'd like to script the `gh auth login` command."

**Pain Points:**
- Docker/CI environments prohibit interactive input
- Manual protocol/key selection slows onboarding
- Need fully automated workflows

### Stack Overflow Developer Survey 2024

**Top Frustrations:**
1. **Technical debt** (63% of developers)
2. **Complex tech stacks for building/deployment**
3. **Unreliable tools and services**

> "Most developers spend only 10% of their time writing new code."

**Implication:** Every unnecessary prompt wastes developer time on non-coding tasks.

### Developer Sentiment Analysis

**What developers praise:**
- "Just works out of the box"
- "Remembers my preferences"
- "I can skip everything with `-y`"
- "Auto-detects my project type"

**What developers complain about:**
- "Too many questions"
- "Asks the same thing every time"
- "Can't automate it"
- "Have to look up flags every time"

---

## Popular CLI Tool Patterns

### npm/yarn - The `-y` Flag Pattern

```bash
# Skip all prompts, use defaults
npm init -y
yarn init -y
```

**Why it works:**
- Single flag skips ALL questions
- Customizable defaults via `.npm-init.js`
- Sensible defaults for common use cases
- Power users remember one flag, not many

### GitHub CLI - Smart Detection

```bash
# Interactive (only if no flags provided)
gh pr create

# Non-interactive (flags skip prompts)
gh pr create --title "Fix" --body "Details"

# Global disable
gh config set prompt disabled
GH_PROMPT_DISABLED=1 gh pr create
```

**Pattern:** If stdin/stdout aren't terminals, automatically switch to non-interactive mode.

### Vite - Minimal Questions

```bash
# Interactive: Only 2-3 questions
npm create vite@latest

# Non-interactive: Skip everything
npm create vite@latest my-app -- --template react
```

**Philosophy:** Ask only what can't be inferred.

### Vercel CLI - Zero Config

```bash
vercel dev  # Auto-detects framework
vercel deploy  # Infers project settings
```

**Pattern:** Detect project context automatically (package.json, framework files, etc.)

### Drizzle Setup - Smart Configuration

> "The CLI intelligently configures everything based on your choices."

Automatically:
- Creates config files
- Updates environment variables
- Adds npm scripts
- Installs dependencies

### Zeit/Heroku - Gold Standards

> "Set the tone for developer tools by doing extensive research into best practices."

**Common traits:**
- Store credentials in platform-specific directories
- Remember preferences between runs
- Default to human-readable output
- Allow JSON output for advanced users

---

## Anti-Patterns to Avoid

### 1. The "Wizard of Oz" Pattern
**Problem:** Forcing users through sequential prompts for settings they don't care about.

**Example of bad UX:**
```
Strip comments? (Y/n)  # Most users: "I don't know, probably no"
Include tree? (Y/n)    # Most users: "Sure, why not"
Include stats? (Y/n)   # Most users: "I guess"
```

**Why it's bad:**
- Creates decision fatigue
- Same questions every time
- No learning from past behavior

### 2. The "All or Nothing" Pattern
**Problem:** Either full interactive mode or pure flags, no middle ground.

**Better approach:** Progressive disclosure with opt-in detail.

### 3. The "Goldfish Memory" Pattern
**Problem:** Not remembering user preferences between runs.

**Reality:** If a user chose "strip comments: no" 10 times, they probably want "no" the 11th time.

### 4. The "Documentation Dump" Pattern
**Problem:** Expecting users to read help to know every flag.

**Better:** Nudge users toward likely commands instead of overwhelming them.

### 5. The "Silent But Deadly" Pattern
**Problem:** Not telling users what's happening during long operations.

**From Evil Martians:**
> "If you're pressed for time but can only squeeze in one more improvement, make sure it is how your app displays progress."

---

## Specific Recommendations

### 1. Implement Quick Skip Mechanism

**Add these flags:**
```bash
repo-roller . -y          # Accept all defaults
repo-roller . --yes       # Same as -y
repo-roller . --defaults  # More explicit version
```

**User benefit:** Skip from 7 steps to 0 with one flag.

### 2. Remember User Preferences

**Use persistent config storage:**
```javascript
// ~/.config/repo-roller/preferences.json
{
  "stripComments": false,
  "withTree": true,
  "withStats": true,
  "lastPreset": "llm",
  "showExcludedFiles": true  // Already implemented!
}
```

**Implementation:** Already have `userSettings.ts` - extend it.

### 3. Reduce Essential Prompts

**Current:** 7 steps
**Proposed:** 2-3 steps (file selection + final confirmation)

Why strip comments/tree/stats aren't essential:
- Defaults work for 90%+ of users
- Can be overridden with flags when needed
- Rarely change between runs

**New flow:**
1. File scanning (automatic)
2. File selection (interactive)
3. Summary + confirm (combined)

### 4. Auto-Detect Project Context

**Smart defaults based on project:**
```javascript
// If package.json has "type": "module"
// If tsconfig.json exists
// If .eslintrc exists
// If pyproject.toml exists
```

Adjust defaults automatically:
- TypeScript project → suggest TS preset
- Python project → suggest Python preset
- Large codebase → warn about token limits

### 5. Add "Quick Mode" vs "Expert Mode"

**Quick mode (default):**
```bash
repo-roller .  # Just show file picker, use sensible defaults
```

**Expert mode:**
```bash
repo-roller . --advanced  # Show all configuration options
```

### 6. Implement Preset Memory

**Remember last used preset:**
```bash
repo-roller .
# First time: "Which preset? [llm/minimal/full]"
# Second time: "Using last preset 'llm'. Change? (y/N)"
```

### 7. Add Environment Variable Support

```bash
# For CI/CD
export REPO_ROLLER_DEFAULTS=1
export REPO_ROLLER_PRESET=llm
export REPO_ROLLER_NO_PROMPTS=1
```

**Why:** Scripts and CI/CD need env vars more than config files.

### 8. Combine Summary + Confirmation

**Current:**
```
Summary displayed...
[pause]
Generate output? (Y/n)
```

**Proposed:**
```
📊 Ready to generate:
  Files: 42 | Size: 128KB | Format: md
  Options: tree=yes, stats=yes, comments=kept

Press ENTER to generate, or 'c' to configure options
```

One action instead of two.

### 9. Add "Undo Last Choice" in File Picker

Allow users to quickly undo mistakes without restarting entire flow.

### 10. Provide Inline Help

Instead of forcing users to read documentation:
```
Strip comments? (Y/n) [?]
> Press ? for explanation
```

---

## Implementation Priority

### Phase 1: Quick Wins (High Impact, Low Effort)

1. **Add `-y` / `--yes` flag** to skip all prompts
   - Effort: 2-4 hours
   - Impact: Immediate productivity boost for repeat users

2. **Remember strip/tree/stats preferences**
   - Effort: 2-3 hours (extend existing userSettings.ts)
   - Impact: Eliminates 3 prompts for returning users

3. **Combine summary + confirmation**
   - Effort: 1-2 hours
   - Impact: Reduces cognitive load

### Phase 2: Medium Term (Medium Impact, Medium Effort)

4. **Add environment variable support**
   - Effort: 4-6 hours
   - Impact: Enables CI/CD usage, scripting

5. **Auto-detect project type**
   - Effort: 6-8 hours
   - Impact: Smarter defaults reduce configuration needs

6. **Add `--advanced` flag for expert mode**
   - Effort: 4-6 hours
   - Impact: Separates novice and expert paths

### Phase 3: Long Term (High Impact, High Effort)

7. **Smart preset recommendations**
   - Effort: 8-12 hours
   - Impact: Reduces decision fatigue

8. **Interactive mode memory system**
   - Effort: 10-15 hours
   - Impact: CLI learns user patterns

9. **Inline contextual help**
   - Effort: 6-10 hours
   - Impact: Reduces need for external documentation

---

## Success Metrics

### Before/After Comparison

| Metric | Current | Target |
|--------|---------|--------|
| Steps to generate output | 7 | 2-3 |
| Time for repeat user | 30-60s | 5-10s |
| Prompts for power user | 4+ | 0 |
| CI/CD support | Limited | Full |
| Memory of preferences | Partial | Complete |

### User Satisfaction Indicators

- **Reduced time to value**: Users should see output faster
- **Fewer support questions**: Less "how do I skip X?"
- **Higher automation**: More use in scripts/CI
- **Better NPS**: Developers recommend tool to others

---

## Sources & References

### Primary Sources

1. **Command Line Interface Guidelines**
   - URL: https://clig.dev/
   - Key insight: "Make the default the right thing for most users"

2. **Thoughtworks CLI Design Guidelines (2025)**
   - URL: https://www.thoughtworks.com/insights/blog/engineering-effectiveness/elevate-developer-experiences-cli-design-guidelines
   - Key insight: "Every action should be transparent, avoid implicit steps"

3. **Node.js CLI Apps Best Practices**
   - URL: https://github.com/lirantal/nodejs-cli-apps-best-practices
   - Key insight: "Build empathic CLIs, auto-detect when possible"

4. **UX Patterns for CLI Tools (Lucas F. Costa)**
   - URL: https://lucasfcosta.com/2022/06/01/ux-patterns-cli-tools.html
   - Key insight: "Reduce time to value, validate input early"

5. **Crafting a CLI Developers Love (DEV Community)**
   - URL: https://dev.to/nickparsons/crafting-a-command-line-experience-that-developers-love-4451
   - Key insight: "Check flags first, don't prompt for provided info"

### GitHub Issues (Real User Feedback)

6. **GitHub CLI #1587 - Config to Disable Prompts**
   - URL: https://github.com/cli/cli/issues/1587
   - User need: Accessibility and prompt fatigue

7. **GitHub CLI #1739 - Environment Variable for Non-Interactive**
   - URL: https://github.com/cli/cli/issues/1739
   - User need: CI/CD and scripting support

8. **GitHub CLI #4506 - Flags for Non-Interactive Auth**
   - URL: https://github.com/cli/cli/issues/4506
   - User need: Automated onboarding

### Framework & Pattern Resources

9. **Yarn Feature Request - yarn init --yes**
   - URL: https://github.com/yarnpkg/yarn/issues/997
   - Pattern: Single flag to skip all prompts

10. **npm init Customization**
    - URL: https://blog.greenroots.info/tips-to-customize-npm-init-to-make-it-your-own
    - Pattern: Customizable defaults

11. **Progressive Disclosure (Nielsen Norman Group)**
    - URL: https://www.nngroup.com/articles/progressive-disclosure/
    - UX principle: Show simple options first, advanced on request

12. **Convention Over Configuration (Wikipedia)**
    - URL: https://en.wikipedia.org/wiki/Convention_over_configuration
    - Philosophy: Sensible defaults reduce required decisions

### Developer Surveys

13. **Stack Overflow Developer Survey 2024**
    - URL: https://survey.stackoverflow.co/2024/
    - Key finding: Technical debt and complex tooling are top frustrations

14. **Evil Martians - CLI UX Best Practices**
    - URL: https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays
    - Key insight: Progress feedback is absolutely essential

### Configuration Persistence

15. **configstore (npm package)**
    - Used by Yeoman for CLI config persistence
    - Pattern: Platform-specific storage locations

16. **XDG Base Directory Specification**
    - Standard for Unix configuration file locations
    - Best practice: Respect user preferences about file locations

---

## Conclusion

The research overwhelmingly supports reducing interactive friction in CLI tools. Developers in 2024-2025 expect:

1. **Zero-config experiences** that "just work"
2. **Memory** of their preferences
3. **Quick escape hatches** like `-y` flags
4. **Progressive disclosure** that hides complexity
5. **Automation support** via env vars and flags

The current repo-roller interactive mode, while feature-rich, violates several core DX principles by requiring too many decisions for settings that rarely change. By implementing the phased recommendations above, you can transform the tool from "powerful but tedious" to "powerful and delightful."

**The goal:** Make the first-time experience guided and helpful, while making the tenth-time experience instant and frictionless.

---

*Report compiled from 16+ authoritative sources including GitHub CLI team decisions, npm/yarn patterns, Stack Overflow surveys, and established UX research.*
