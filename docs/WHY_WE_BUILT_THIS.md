# Why We Built repo-roller

## The Problem Statement

Modern software development increasingly involves collaboration with Large Language Models (LLMs). Whether you're debugging a tricky issue, refactoring legacy code, or building new features, LLMs like Claude, GPT-4, and Gemini have become invaluable development partners. But there's a fundamental friction in this workflow:

**How do you efficiently share your codebase context with an LLM?**

This seemingly simple question has no good answer in today's tooling landscape. And that's exactly why repo-roller exists.

## The Pain We Experienced

### The Copy-Paste Dance

Every developer who works with LLMs knows this dance:

1. "Let me share this file with Claude..."
2. *Opens file, copies content*
3. "Oh wait, this imports from another module..."
4. *Opens that file, copies more*
5. "This references a type definition..."
6. *Opens type file*
7. "And the config file is probably relevant..."
8. *20 minutes later, still copying*

Sound familiar? This manual process is:
- **Time-consuming**: You spend more time preparing context than actually getting help
- **Error-prone**: You inevitably forget a crucial file
- **Inefficient**: You include too much or too little
- **Repetitive**: Same dance, every single session

### The Token Black Box

Even when you successfully prepare your context, you're flying blind:
- "How many tokens is this?"
- "Will this fit in Claude's context window?"
- "How much will this cost me?"
- "Am I wasting tokens on irrelevant files?"

These questions go unanswered because existing tools don't provide this visibility. You find out you've exceeded the context window only when the LLM starts forgetting things or refusing to process your request.

### The All-or-Nothing Dilemma

Existing solutions force you into extremes:

**Manual selection**: Precise but painfully slow
```bash
cat src/main.ts src/utils.ts src/types.ts > context.txt
# Miss a file? Start over.
```

**Bulk dumping**: Fast but wasteful
```bash
find . -name "*.ts" -exec cat {} \; > context.txt
# Hope you enjoy 2MB of node_modules TypeScript definitions!
```

Neither approach serves real development workflows.

## The Solution Philosophy

repo-roller was built on these core principles:

### 1. Respect Developer Intent

Your `.gitignore` exists for a reason. It represents decisions you've already made about what matters in your project. repo-roller respects these decisions by default:

```bash
repo-roller .
# Automatically excludes node_modules, build artifacts, secrets
```

No configuration needed. The tool understands your project boundaries.

### 2. Make Token Economics Visible

You can't optimize what you can't measure. repo-roller makes token usage crystal clear:

```
Token Analysis
  Estimated tokens  45,892

  Provider             Cost         Context Utilization
  ──────────────────────────────────────────────────────
  Claude 3.5 Haiku    $0.0367      ███░░░░░░░ 22.9%
  Claude 3.5 Sonnet   $0.1377      ███░░░░░░░ 22.9%
  GPT-4o              $0.1147      ████░░░░░░ 35.9%
```

Now you know exactly what you're working with.

### 3. Progressive Complexity

Start simple, grow sophisticated:

```bash
# Day 1: Just works
repo-roller .

# Day 7: Add some filters
repo-roller . --lang typescript --no-tests

# Day 30: Fine-grained control
repo-roller . --max-tokens 50k --preset minimal --format json
```

The tool grows with your needs.

### 4. Budget-First Development

In a world of pay-per-token APIs, budget awareness isn't optional:

```bash
# Set a token limit
repo-roller . --max-tokens 100k

# Or set a cost limit
repo-roller . --max-cost 0.25

# Files are automatically prioritized to fit
```

Stay within budget without manual calculation.

## Real Problems This Solves

### Problem: "I need to share my entire codebase for a refactoring task"

**Before repo-roller**:
- Manually copy hundreds of files
- Guess at what's relevant
- Hope you didn't miss anything
- No idea if it fits in context

**With repo-roller**:
```bash
repo-roller . --lang typescript
# Done. Full TypeScript codebase, properly formatted, with token count.
```

### Problem: "I want to debug this issue but only need relevant files"

**Before repo-roller**:
- Manually trace dependencies
- Copy files one by one
- Lose track of what you've included

**With repo-roller**:
```bash
repo-roller . --interactive
# Visual tree selector. Pick exactly what you need.
```

### Problem: "I'm on a budget and need to control LLM costs"

**Before repo-roller**:
- No visibility into costs
- Surprised by bills
- No way to optimize

**With repo-roller**:
```bash
repo-roller . --max-cost 0.10 --target claude-haiku
# Files automatically selected to stay under $0.10
```

### Problem: "I need to integrate this into my CI/CD pipeline"

**Before repo-roller**:
- Write custom scripts
- Handle edge cases
- Maintain your own solution

**With repo-roller**:
```bash
repo-roller . --preset minimal --format json -y
# Automated, reproducible, no interaction needed
```

## Why Not Just Use X?

### "Why not just use `find` and `cat`?"

```bash
find . -name "*.ts" -exec cat {} \;
```

This approach:
- Doesn't respect gitignore
- Includes test files you don't want
- No token counting
- No cost estimation
- No structure or metadata
- Includes node_modules TypeScript
- Potentially dangerous (secrets, env files)

### "Why not use an existing code-to-markdown tool?"

Most existing tools:
- Focus on documentation generation, not LLM context
- Don't understand token economics
- Lack budget constraints
- Missing interactive selection
- No awareness of LLM-specific needs

### "Why not let the LLM figure it out?"

Modern LLMs have large context windows, but:
- Context window doesn't mean unlimited
- More context = higher costs
- Irrelevant context = worse results
- You're paying for every token
- Context overflow causes unpredictable behavior

## The Business Case

Let's talk numbers:

### Time Savings

- Manual context preparation: 15-30 minutes per session
- With repo-roller: < 1 minute
- Developer hourly rate: $75-150
- Sessions per week: 10-20

**Weekly time saved**: 2.5 - 10 hours
**Weekly cost saved**: $187 - $1,500

### Cost Optimization

Without token visibility:
- Overestimate: Waste money on expensive models
- Underestimate: Hit context limits, retry operations
- No budget control: Surprise bills

With repo-roller:
- Choose optimal provider per task
- Set cost limits proactively
- Maximize context window utilization

### Quality Improvements

Better context leads to:
- More accurate LLM responses
- Fewer clarification rounds
- Less hallucination
- More efficient debugging
- Faster feature development

## The Bigger Vision

repo-roller isn't just about concatenating files. It's about **bridging the gap between human code organization and LLM understanding**.

We believe:
- LLM-assisted development is the future
- Current tooling is woefully inadequate
- Developer experience matters enormously
- Cost transparency enables better decisions
- Automation should empower, not restrict

repo-roller is our answer to "How should developers share code with LLMs?" It's opinionated where it matters, flexible where it counts, and transparent throughout.

## Join the Movement

We built repo-roller because we needed it ourselves. Every feature comes from real pain points. Every default comes from experience. Every option comes from diverse use cases.

If you've ever:
- Spent 20 minutes copying files into an LLM chat
- Wondered how many tokens your code uses
- Been surprised by LLM API costs
- Wished for better tooling around AI-assisted development

Then repo-roller was built for you.

The future of development is collaborative—human creativity amplified by AI capability. Let's make that collaboration frictionless.

---

*"The best tool is the one that disappears into your workflow."*

repo-roller aims to be that tool.
