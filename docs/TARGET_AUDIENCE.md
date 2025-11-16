# Target Audience

This document identifies who repo-roller is built for, their specific needs, and how the tool addresses their pain points.

## Primary Audiences

### 1. Individual Developers Using LLMs for Daily Work

**Profile:**
- Software developers who regularly use Claude, GPT-4, or other LLMs
- Work on codebases ranging from side projects to production applications
- Need to share code context for debugging, refactoring, or feature development
- Cost-conscious but value productivity

**Pain Points:**
- Manual file selection is tedious and error-prone
- No visibility into token usage or costs
- Context window limits are mysterious
- Repeating the same context preparation daily

**How repo-roller helps:**
```bash
# Quick daily workflow
repo-roller . --lang typescript
# Get all TypeScript files with token count and cost estimate
```

**Key Features Used:**
- Zero-config defaults
- Language filtering (`--lang`)
- Token counting and cost estimation
- Multiple output formats

---

### 2. Freelancers and Consultants

**Profile:**
- Independent developers working on multiple client projects
- Budget-sensitive (paying for API usage themselves)
- Need to explain codebases to LLMs frequently
- Value time efficiency highly

**Pain Points:**
- API costs can spiral unexpectedly
- Different projects have different structures
- Need to maximize value from each LLM interaction
- Time is literally money

**How repo-roller helps:**
```bash
# Stay within budget
repo-roller . --max-cost 0.25 --target claude-haiku

# Quick project onboarding
repo-roller . --dry-run
# See what would be included before committing
```

**Key Features Used:**
- Budget constraints (`--max-cost`, `--max-cost-eur`)
- Dry-run mode for previewing
- Cost estimation per provider
- Portable output formats

---

### 3. Tech Leads and Senior Engineers

**Profile:**
- Responsible for team productivity and code quality
- Need to share architectural context with LLMs
- Make decisions about team tooling
- Balance cost with efficiency

**Pain Points:**
- Team members waste time on manual context preparation
- No standardized way to share code with LLMs
- Need to understand codebase holistically
- Concerned about security and sensitive file exposure

**How repo-roller helps:**
```bash
# Create a profile for team use
repo-roller init
# Generates .reporoller.yml with team-specific layouts

# Share architectural overview
repo-roller . --profile core-first
# Files ordered by importance for understanding architecture
```

**Key Features Used:**
- Configuration files for standardization
- Profile system for different contexts
- Architectural overview support
- Gitignore respect (security)

---

### 4. Open Source Maintainers

**Profile:**
- Manage open source projects
- Need to help contributors understand codebase
- Answer issues and review PRs with LLM assistance
- Want to document how to use LLMs with their project

**Pain Points:**
- Contributors struggle to understand large codebases
- Repeating same explanations
- Need efficient way to provide project context
- Want to recommend tools that help community

**How repo-roller helps:**
```bash
# Include in project README
npx repo-roller . --preset minimal
# Contributors can instantly generate LLM context

# Document project structure
repo-roller . --tree --stats-only
# Quick overview for newcomers
```

**Key Features Used:**
- NPX support (no global install needed)
- Built-in presets
- Tree view generation
- Statistics mode

---

### 5. Students and Learners

**Profile:**
- Learning to code with AI assistance
- Working on coursework and personal projects
- Limited budget (using free tiers or tight budgets)
- Need to understand how LLMs process code

**Pain Points:**
- Don't know how to structure prompts effectively
- Unsure what context to provide
- Need to maximize free tier usage
- Learning both coding and LLM interaction

**How repo-roller helps:**
```bash
# Learn what your project looks like to an LLM
repo-roller . --dry-run
# See exactly what files would be included

# Maximize free tier
repo-roller . --max-tokens 10k
# Stay within free API limits
```

**Key Features Used:**
- Preview mode (educational)
- Token limit enforcement
- Clear statistics
- Helpful error messages with suggestions

---

### 6. DevOps and Platform Engineers

**Profile:**
- Building CI/CD pipelines
- Automating development workflows
- Need programmatic access to code context
- Value reproducibility and scriptability

**Pain Points:**
- Need non-interactive, scriptable tools
- Require structured output for automation
- Must integrate with existing pipelines
- Need consistent, reproducible results

**How repo-roller helps:**
```bash
# CI/CD integration
repo-roller . --preset minimal --format json -y --out context.json
# Automated, reproducible, structured output

# Programmatic processing
cat context.json | jq '.files | length'
# Process output in pipelines
```

**Key Features Used:**
- JSON/YAML output formats
- `--yes` flag for non-interactive mode
- Presets for consistency
- Exit codes for pipeline integration

---

## Secondary Audiences

### 7. Technical Writers

**Need:** Generate documentation context for LLM-assisted writing
```bash
repo-roller . --preset docs --format markdown
```

### 8. Security Researchers

**Need:** Quickly dump codebase for security analysis with LLMs
```bash
repo-roller . --strip-comments --no-tests
```

### 9. Code Reviewers

**Need:** Share PR context efficiently
```bash
repo-roller . --interactive
# Select only changed/relevant files
```

### 10. Educators and Instructors

**Need:** Prepare code examples for teaching materials
```bash
repo-roller . --ext js,jsx --max-size 50
# Only JavaScript, small files
```

---

## User Personas

### Persona 1: Sarah - Full-Stack Developer

**Background:**
- 5 years experience
- Works at a startup
- Uses Claude 3.5 Sonnet daily
- TypeScript/React stack

**Typical Day:**
- Morning: Debug production issue with LLM help
- Afternoon: Refactor authentication module
- Evening: Review PRs, use LLM for edge case analysis

**repo-roller Usage:**
```bash
# Morning debugging
repo-roller src/auth --lang typescript

# Afternoon refactoring
repo-roller . --max-tokens 100k --no-tests

# Evening review
repo-roller . --interactive
```

**Value Proposition:** Saves 1-2 hours daily on context preparation.

---

### Persona 2: Marcus - Freelance Developer

**Background:**
- Solo freelancer
- Multiple client projects
- Budget-conscious
- Uses GPT-4o for cost efficiency

**Typical Week:**
- Monday: Client A's Django project
- Wednesday: Client B's Node.js API
- Friday: Own SaaS project

**repo-roller Usage:**
```bash
# Different project, same workflow
cd client-a && repo-roller . --lang python --max-cost 0.50
cd client-b && repo-roller . --lang javascript --max-cost 0.50
cd my-saas && repo-roller . --preset full
```

**Value Proposition:** Predictable costs, portable workflow across projects.

---

### Persona 3: Alex - Open Source Maintainer

**Background:**
- Maintains popular npm package
- 500+ issues to triage
- Community contributors need onboarding
- Values documentation

**Typical Interaction:**
- Issue: "How do I extend the parser?"
- Need: Quickly share relevant code with Claude
- Goal: Generate accurate response fast

**repo-roller Usage:**
```bash
# In contributing guide
npx repo-roller . --preset core-first
# Recommended for understanding codebase

# When answering issues
repo-roller src/parser --format markdown
```

**Value Proposition:** Standardizes how community shares context, reduces support burden.

---

### Persona 4: Jordan - Junior Developer

**Background:**
- 1 year experience
- Learning with AI assistance
- Using free tier APIs
- Studying best practices

**Learning Goals:**
- Understand how to structure LLM prompts
- Learn what context is relevant
- Stay within API limits
- Improve code quality

**repo-roller Usage:**
```bash
# Learning mode
repo-roller . --dry-run
# "Oh, I shouldn't include test files for this question"

repo-roller . --stats-only
# "My project is 50k tokens - fits in Claude's context!"

repo-roller . --max-tokens 5k
# Stay in free tier limits
```

**Value Proposition:** Educational tool that teaches LLM interaction patterns.

---

## Anti-Personas (Who This Is NOT For)

### Not For: Enterprise AI Platform Teams
- Need: Custom embeddings, vector databases, RAG systems
- Why not repo-roller: Tool is for direct context sharing, not semantic search

### Not For: Non-Technical Users
- Need: GUI-based code sharing
- Why not repo-roller: CLI-first tool assumes command line familiarity

### Not For: Binary/Asset Heavy Projects
- Need: Share images, videos, compiled assets
- Why not repo-roller: Optimized for text-based source code

### Not For: Monorepo Giants (10M+ LOC)
- Need: Sophisticated codebase navigation
- Why not repo-roller: Better suited for focused, project-level context

---

## Adoption Journey

### Stage 1: Discovery
**Trigger:** Frustration with manual copy-paste
**Action:** `npx repo-roller .`
**Reaction:** "This just works!"

### Stage 2: Regular Use
**Trigger:** Daily LLM interactions
**Action:** `npm install -g repo-roller`
**Behavior:** Use basic commands regularly

### Stage 3: Optimization
**Trigger:** Cost awareness or specific needs
**Action:** Explore flags like `--max-cost`, `--target`
**Behavior:** Tailor to workflow

### Stage 4: Configuration
**Trigger:** Repeated patterns
**Action:** `repo-roller init`
**Behavior:** Create project-specific profiles

### Stage 5: Advocacy
**Trigger:** Team efficiency gains
**Action:** Share with colleagues, add to documentation
**Behavior:** Standardize team usage

---

## Summary

repo-roller serves anyone who:
- Uses LLMs for development tasks
- Values time and cost efficiency
- Appreciates thoughtful developer tooling
- Works with text-based source code
- Operates in command-line environments

The tool scales from "I just want to share my code" to "I need fine-grained control over token budgets and output formats." By understanding our diverse audience, we've built features that serve different skill levels and use cases while maintaining a simple core experience.

**Core Promise:** Whether you're a junior developer learning LLM interaction or a senior engineer optimizing team productivity, repo-roller removes friction from the code-to-LLM workflow.
