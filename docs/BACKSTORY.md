# The Backstory of repo-roller

## The Moment of Frustration

It started with a moment many developers know too well.

Picture this: It's 11 PM. You're debugging a particularly nasty race condition in your TypeScript codebase. You've been staring at the code for hours, and you decide to ask Claude for help. "Let me just share the relevant code..."

You open the first file. Copy. Paste into the chat.

"Oh wait, this imports from `utils.ts`..." Open that file. Copy. Paste.

"And the types are in `types.ts`..." Open. Copy. Paste.

"The config object comes from `config.ts`..." Open. Copy. Paste.

Twenty minutes later, you've shared 15 files. Your chat window is a wall of code. You're not even sure if you included everything relevant. And you're exhausted before even asking your question.

**There had to be a better way.**

## The First Prototype

The next morning, fueled by caffeine and frustration, the first version was born:

```bash
find . -name "*.ts" -not -path "./node_modules/*" -exec cat {} \; > context.txt
```

Simple. Brutal. And immediately problematic.

The resulting file was **2.3 MB**. It included:
- Every TypeScript file (including tests)
- All the `.d.ts` declaration files from `node_modules` that `find` somehow found
- Build artifacts from `dist/`
- Configuration files that weren't relevant

Worse, I had no idea how many tokens this was or what it would cost. I pasted it into Claude anyway. The response came back: *"I notice this is a lot of code. Could you help me understand which parts are most relevant to your question?"*

Claude was politely telling me I'd overwhelmed it with context.

## The Evolution Begins

### Version 0.1: Gitignore Respect

The first real improvement was simple: respect `.gitignore`.

```javascript
const ig = ignore().add(readFileSync('.gitignore'));
files = files.filter(f => !ig.ignores(f));
```

Suddenly, `node_modules` disappeared. Build artifacts vanished. The output shrunk from 2.3MB to 156KB. Progress!

But it still felt crude. I was including test files I didn't need. Configuration was mixed with source code. There was no structure.

### Version 0.2: Extension Filtering

Next came the ability to filter by extension:

```bash
repo-roller . --ext ts,tsx
```

Now I could focus on just TypeScript files. Or just JavaScript. Or just Python. The tool was becoming more precise.

But a new problem emerged: I was sharing code without any context. Just raw files concatenated together. No file paths. No structure. The LLM had to guess where things were.

### Version 0.3: Markdown Output with Structure

The breakthrough came when I switched to Markdown output:

```markdown
# Codebase Context

## File: src/core/utils.ts

\`\`\`typescript
export function parseConfig(...) {
  ...
}
\`\`\`

## File: src/types/index.ts

\`\`\`typescript
interface Config {
  ...
}
\`\`\`
```

Suddenly, the LLM could see:
- File paths and structure
- Syntax highlighting hints
- Clear separation between files

The quality of responses improved dramatically. The LLM understood not just the code, but the codebase organization.

### Version 0.4: The Token Awakening

Then came the revelation that changed everything: **tokens**.

I'd been blindly sharing code without understanding the economics. After a particularly expensive Claude conversation (yes, I was paying per token without realizing how much), I decided to investigate.

The result was shocking:
- My typical context was 150,000+ tokens
- Claude Sonnet at $3/million tokens = $0.45 per context load
- Multiple interactions per day = $10+ weekly just on context
- And I wasn't even sure if I was using the context window efficiently

Version 0.4 introduced token estimation:

```
Token Analysis
  Estimated tokens: 157,234

  Claude Sonnet: $0.47 (78.6% of context window)
  GPT-4o: $0.39 (context window exceeded!)
```

For the first time, I could see what I was doing. The numbers were eye-opening.

### Version 0.5: Budget Constraints

With token visibility came budget awareness. If I knew how many tokens I was using, shouldn't I be able to set limits?

```bash
repo-roller . --max-tokens 50000
```

The tool would automatically select the most important files to fit within budget. But what counted as "important"? This led to prioritization logic:
- Entry points first (`index.ts`, `main.ts`)
- Core modules over utilities
- Source over tests
- Smaller files for breadth vs. large files for depth

### Version 0.6: Interactive Mode

Sometimes you need surgical precision. The interactive mode was born:

```bash
repo-roller . --interactive
```

A visual tree appeared. Check the files you want. Deselect what you don't. See the token count update in real-time. Perfect for focused debugging sessions.

### Version 0.7: Configuration and Profiles

As I used the tool across different projects, patterns emerged. I was always excluding tests. Always prioritizing certain directories. Always using the same options.

Configuration files allowed these patterns to be captured:

```yaml
# .reporoller.yml
architectural_overview: |
  This is an e-commerce platform with a React frontend and Node.js backend.

profiles:
  backend-focus:
    layout:
      - server/src/**/*.ts
      - server/package.json
      - !**/*.test.ts
```

Now I could have project-specific and context-specific configurations.

### Version 0.8: Multiple Output Formats

Different LLMs prefer different formats. Some workflows need structured data:

```bash
# Markdown for human-readable context
repo-roller . --format md

# JSON for programmatic use
repo-roller . --format json

# YAML for configuration-heavy contexts
repo-roller . --format yaml

# Plain text for minimal overhead
repo-roller . --format txt
```

### Version 0.9: DX Polish

The final evolution was all about developer experience:
- **Dry-run mode**: Preview before committing
- **Stats-only mode**: Quick project analysis
- **Helpful errors**: When things go wrong, explain why and how to fix
- **Progress indicators**: Know what's happening
- **Provider comparisons**: Choose the right LLM for the job

## Lessons Learned Along the Way

### Lesson 1: Defaults Matter More Than Features

The most impactful decision wasn't adding token counting or budget constraints. It was ensuring that `repo-roller .` works out of the box. Zero config. Sensible defaults. Immediate value.

Users don't read documentation. They try `repo-roller .` and it either works or they move on.

### Lesson 2: Visibility Creates Behavior Change

When developers see their token usage and costs, they naturally optimize. They think: "Do I really need that 500KB file? Could I use a smaller context window? Is Haiku sufficient instead of Sonnet?"

Transparency drives efficiency.

### Lesson 3: Respect Existing Conventions

Developers have already made decisions about their project structure through `.gitignore`. Respecting these decisions means less configuration, fewer surprises, and better security (no accidentally sharing `.env` files).

### Lesson 4: CLI Tools Should Be Composable

The tool fits into existing workflows:
```bash
repo-roller . --format json | jq '.files | length'
repo-roller . > context.md && pbcopy < context.md
```

Unix philosophy: Do one thing well. Play nice with others.

### Lesson 5: Progressive Complexity is Key

New users need simplicity. Power users need control. The best tools serve both:
```bash
# Beginner
repo-roller .

# Intermediate
repo-roller . --lang typescript --no-tests

# Advanced
repo-roller . --max-tokens 75k --preset minimal --profile backend --format json
```

## The Current State

Today, repo-roller is a mature tool that:
- Respects project boundaries (gitignore)
- Provides token and cost visibility
- Offers budget constraints
- Supports multiple output formats
- Features interactive selection
- Allows configuration and profiles
- Works across different project types

It's the tool I wish existed when I started using LLMs for development.

## What the Future Holds

### Near-term Vision
- **Incremental updates**: Only re-process changed files
- **Smarter prioritization**: Use import graphs to order files
- **Chunking strategies**: Automatically split large codebases

### Long-term Aspirations
- **IDE integration**: VS Code extension
- **Team analytics**: Track usage patterns
- **Semantic awareness**: Understand code relationships
- **Multi-modal support**: Code screenshots, diagrams

## The Bigger Picture

repo-roller started as a frustrated developer's hack and evolved into a thoughtful tool for LLM-assisted development. But it represents something larger:

**We're in the early days of human-AI collaboration in software development.**

The tools we build now will shape how developers interact with AI for years to come. repo-roller is our contribution to making that interaction more efficient, more transparent, and more accessible.

Every feature reflects a lesson learned. Every default represents a design decision. Every option addresses a real use case.

The story isn't over. As LLMs evolve, as development practices change, as new patterns emerge, repo-roller will evolve too. But the core mission remains:

**Make sharing code with LLMs effortless, efficient, and economical.**

---

## Timeline Summary

| Version | Key Addition | Problem Solved |
|---------|-------------|----------------|
| 0.1 | Gitignore respect | Stop including junk |
| 0.2 | Extension filtering | Focus on relevant files |
| 0.3 | Markdown structure | Provide context to LLM |
| 0.4 | Token estimation | Understand costs |
| 0.5 | Budget constraints | Control spending |
| 0.6 | Interactive mode | Precise selection |
| 0.7 | Configuration | Repeatable workflows |
| 0.8 | Multiple formats | Flexibility |
| 0.9 | DX polish | Professional tooling |

---

*From frustration to feature. From hack to product. From personal tool to community resource.*

That's the story of repo-roller.
