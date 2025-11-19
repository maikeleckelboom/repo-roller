# Schema Introspection API

The schema API provides machine-readable definitions of the CLI interface, enabling tool integrations, shell completions, documentation generation, and AI agent integration.

## Quick Start

```typescript
import { generateCliSchema, generateLlmToolDefinition, generateShellCompletions } from 'repo-roller'

// Generate full CLI schema
const schema = generateCliSchema()
console.log(`Commands: ${schema.commands.length}`)
console.log(`Presets: ${schema.presets.join(', ')}`)

// Generate LLM tool definition
const toolDef = generateLlmToolDefinition()
console.log(`Tool: ${toolDef.name}`)
console.log(`Description: ${toolDef.description}`)

// Generate shell completions
const bashCompletions = generateShellCompletions('bash')
```

## Core Functions

### generateCliSchema()

Generate complete CLI schema with all commands, options, and metadata.

**Signature:**

```typescript
function generateCliSchema(): CliSchema
```

**Returns:**

Complete CLI schema object.

**Example:**

```typescript
import { generateCliSchema } from 'repo-roller'

const schema = generateCliSchema()

console.log('CLI Schema:')
console.log(`  Name: ${schema.name}`)
console.log(`  Version: ${schema.version}`)
console.log(`  Description: ${schema.description}`)
console.log(`  Commands: ${schema.commands.length}`)
console.log(`  Presets: ${schema.presets.length}`)
console.log(`  Models: ${schema.models.length}`)
console.log(`  Output formats: ${schema.outputFormats.join(', ')}`)

// Explore commands
for (const command of schema.commands) {
  console.log(`\nCommand: ${command.name}`)
  console.log(`  Description: ${command.description}`)
  console.log(`  Options: ${command.options.length}`)
}
```

**Schema structure:**

```typescript
interface CliSchema {
  readonly $schema: string              // JSON Schema URI
  readonly name: string                 // 'repo-roller'
  readonly version: string              // Tool version
  readonly description: string          // Tool description
  readonly commands: readonly CliCommand[]     // All commands
  readonly globalOptions: readonly CliOption[] // Global options
  readonly presets: readonly string[]          // Built-in presets
  readonly models: readonly ModelInfo[]        // Model presets
  readonly outputFormats: readonly string[]    // Supported formats
  readonly sortModes: readonly string[]        // Sort modes
}
```

### generateLlmToolDefinition()

Generate LLM tool definition for AI agent integration.

**Signature:**

```typescript
function generateLlmToolDefinition(): LlmToolDefinition
```

**Returns:**

LLM-compatible tool definition following Claude/OpenAI tool schema.

**Example:**

```typescript
import { generateLlmToolDefinition } from 'repo-roller'

const toolDef = generateLlmToolDefinition()

console.log('LLM Tool Definition:')
console.log(`  Name: ${toolDef.name}`)
console.log(`  Description: ${toolDef.description}`)
console.log(`  Input schema type: ${toolDef.input_schema.type}`)
console.log(`  Properties: ${Object.keys(toolDef.input_schema.properties).length}`)

// Output for LLM provider
console.log(JSON.stringify(toolDef, null, 2))
```

**Use cases:**

- Claude Desktop MCP integration
- OpenAI function calling
- Custom AI agents
- Workflow automation tools

**Output format:**

```json
{
  "name": "repo_roller_bundle",
  "description": "Bundle repository source code into a single context-optimized output for LLM consumption...",
  "input_schema": {
    "type": "object",
    "properties": {
      "root": {
        "type": "string",
        "description": "Root directory to scan (default: current directory)",
        "default": "."
      },
      "preset": {
        "type": "string",
        "description": "Use a predefined configuration preset",
        "enum": ["llm", "ts", "minimal", "docs", ...]
      },
      "format": {
        "type": "string",
        "enum": ["md", "json", "yaml", "txt"],
        "default": "md"
      }
      // ... more properties
    }
  }
}
```

### generateShellCompletions()

Generate shell completion scripts.

**Signature:**

```typescript
function generateShellCompletions(shell: 'bash' | 'zsh' | 'fish'): string
```

**Parameters:**

- `shell` - Target shell

**Returns:**

Completion script as string.

**Example:**

```typescript
import { generateShellCompletions } from 'repo-roller'
import { writeFile } from 'fs/promises'

// Generate bash completions
const bashScript = generateShellCompletions('bash')
await writeFile('/etc/bash_completion.d/repo-roller', bashScript)

// Generate zsh completions
const zshScript = generateShellCompletions('zsh')
await writeFile('/usr/share/zsh/site-functions/_repo-roller', zshScript)

// Generate fish completions
const fishScript = generateShellCompletions('fish')
await writeFile('~/.config/fish/completions/repo-roller.fish', fishScript)
```

**Completion features:**

- Option name completion
- Value completion for enum options (format, sort, preset, etc.)
- Directory completion for file paths
- Context-aware suggestions

### generateOpenApiDocs()

Generate OpenAPI documentation for API usage.

**Signature:**

```typescript
function generateOpenApiDocs(root?: string): Promise<Record<string, unknown>>
```

**Parameters:**

- `root` - Root directory to load config from (default: '.')

**Returns:**

Promise resolving to OpenAPI 3.0 specification.

**Example:**

```typescript
import { generateOpenApiDocs } from 'repo-roller'
import { writeFile } from 'fs/promises'

const openapi = await generateOpenApiDocs('.')

await writeFile(
  'openapi.json',
  JSON.stringify(openapi, null, 2)
)

console.log('OpenAPI spec generated')
```

**Use cases:**

- API documentation websites
- REST API wrappers
- SDK generation
- API testing tools

## Type Definitions

### CliSchema

Complete CLI schema.

```typescript
interface CliSchema {
  readonly $schema: string
  readonly name: string
  readonly version: string
  readonly description: string
  readonly commands: readonly CliCommand[]
  readonly globalOptions: readonly CliOption[]
  readonly presets: readonly string[]
  readonly models: readonly {
    readonly name: string
    readonly family: string
    readonly contextLimit: number
    readonly description: string
  }[]
  readonly outputFormats: readonly string[]
  readonly sortModes: readonly string[]
}
```

### CliCommand

Command definition.

```typescript
interface CliCommand {
  readonly name: string
  readonly description: string
  readonly arguments?: readonly CliArgument[]
  readonly options: readonly CliOption[]
  readonly examples: readonly string[]
}
```

### CliOption

Option definition.

```typescript
interface CliOption {
  readonly flags: string              // '-o, --out <file>'
  readonly name: string               // 'out'
  readonly type: string               // 'string', 'boolean', 'number'
  readonly description: string        // Human-readable description
  readonly default?: unknown          // Default value
  readonly choices?: readonly string[] // Valid values (for enums)
  readonly examples?: readonly string[] // Example values
  readonly category: string           // Option category
}
```

### LlmToolDefinition

LLM tool definition.

```typescript
interface LlmToolDefinition {
  readonly name: string
  readonly description: string
  readonly input_schema: {
    readonly type: 'object'
    readonly properties: Record<string, SchemaProperty>
    readonly required?: readonly string[]
  }
}
```

### SchemaProperty

JSON Schema property.

```typescript
interface SchemaProperty {
  readonly type: string | readonly string[]
  readonly description: string
  readonly enum?: readonly string[]
  readonly default?: unknown
  readonly examples?: readonly unknown[]
  readonly pattern?: string
  readonly minimum?: number
  readonly maximum?: number
  readonly items?: SchemaProperty
  readonly format?: string
}
```

## Available Commands

The schema includes these commands:

### Main Command

```typescript
{
  name: 'repo-roller',
  description: 'Main command: bundle repository code for LLM consumption',
  arguments: [
    {
      name: 'root',
      type: 'string',
      required: false,
      description: 'Root directory to scan',
      default: '.'
    }
  ],
  options: [/* ... many options ... */],
  examples: [
    'repo-roller',
    'repo-roller --preset llm',
    'repo-roller --format json --compact',
    // ... more examples
  ]
}
```

### Init Command

```typescript
{
  name: 'repo-roller init',
  description: 'Initialize repo-roller configuration files',
  // ...
}
```

### History Command

```typescript
{
  name: 'repo-roller history',
  description: 'View and manage bundle generation history',
  options: [
    { name: 'list', /* ... */ },
    { name: 'show', /* ... */ },
    { name: 'diff', /* ... */ },
    // ...
  ]
}
```

### Schema Command

```typescript
{
  name: 'repo-roller __schema',
  description: 'Output machine-readable CLI schema for introspection',
  options: [
    { name: 'json', /* ... */ },
    { name: 'forLlm', /* ... */ },
    { name: 'completions', /* ... */ }
  ]
}
```

### Daemon Command

```typescript
{
  name: 'repo-roller daemon',
  description: 'Run repo-roller as a background daemon with warm cache and RPC interface',
  // ...
}
```

## Option Categories

Options are organized into logical categories:

- **output** - Output file and format options
- **filter** - File filtering options
- **processing** - Content processing options
- **mode** - Operating modes (interactive, dry-run, etc.)
- **config** - Preset and profile options
- **budget** - Token and cost budget options
- **format** - Format-specific options
- **ux** - User experience options
- **info** - Information display options
- **history** - History management options
- **schema** - Schema introspection options
- **daemon** - Daemon mode options
- **global** - Global options (version, help)

## Integration Examples

### Generate Documentation

```typescript
import { generateCliSchema } from 'repo-roller'
import { writeFile } from 'fs/promises'

async function generateDocs() {
  const schema = generateCliSchema()

  let markdown = `# CLI Reference\n\n`

  for (const command of schema.commands) {
    markdown += `## ${command.name}\n\n`
    markdown += `${command.description}\n\n`

    if (command.arguments && command.arguments.length > 0) {
      markdown += `### Arguments\n\n`
      for (const arg of command.arguments) {
        markdown += `- **${arg.name}** (${arg.type})`
        if (!arg.required) markdown += ` - optional`
        markdown += `\n  ${arg.description}\n`
      }
      markdown += `\n`
    }

    // Group options by category
    const byCategory = new Map<string, CliOption[]>()
    for (const option of command.options) {
      if (!byCategory.has(option.category)) {
        byCategory.set(option.category, [])
      }
      byCategory.get(option.category)!.push(option)
    }

    for (const [category, options] of byCategory) {
      markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Options\n\n`

      for (const option of options) {
        markdown += `#### ${option.flags}\n\n`
        markdown += `${option.description}\n\n`

        if (option.choices) {
          markdown += `**Choices:** ${option.choices.join(', ')}\n\n`
        }

        if (option.default !== undefined) {
          markdown += `**Default:** \`${option.default}\`\n\n`
        }

        if (option.examples && option.examples.length > 0) {
          markdown += `**Examples:** ${option.examples.map(e => `\`${e}\``).join(', ')}\n\n`
        }
      }
    }

    if (command.examples.length > 0) {
      markdown += `### Examples\n\n`
      for (const example of command.examples) {
        markdown += `\`\`\`bash\n${example}\n\`\`\`\n\n`
      }
    }
  }

  await writeFile('CLI.md', markdown)
  console.log('Documentation generated: CLI.md')
}
```

### Claude Desktop MCP Integration

```typescript
// mcp-server.ts
import { generateLlmToolDefinition } from 'repo-roller'

const tool = generateLlmToolDefinition()

// MCP server implementation
export const mcpServer = {
  name: 'repo-roller',
  version: '1.0.0',
  tools: [tool],

  async callTool(name: string, args: Record<string, unknown>) {
    if (name === 'repo_roller_bundle') {
      const { root, preset, format, ...options } = args
      // ... execute repo-roller with options
    }
  }
}
```

### OpenAI Function Calling

```typescript
import { generateLlmToolDefinition } from 'repo-roller'

const tool = generateLlmToolDefinition()

// Use with OpenAI API
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Bundle my TypeScript project for review' }
  ],
  tools: [
    {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema
      }
    }
  ]
})
```

### Custom CLI Wrapper

```typescript
import { generateCliSchema } from 'repo-roller'
import { Command } from 'commander'

function createDynamicCli() {
  const schema = generateCliSchema()
  const program = new Command()

  program
    .name(schema.name)
    .description(schema.description)
    .version(schema.version)

  // Add commands dynamically
  for (const cmd of schema.commands) {
    const command = program
      .command(cmd.name)
      .description(cmd.description)

    // Add options
    for (const opt of cmd.options) {
      command.option(opt.flags, opt.description, opt.default)
    }

    command.action(async (options) => {
      // Execute command
      console.log('Executing:', cmd.name, options)
    })
  }

  return program
}
```

### IDE Integration

```typescript
import { generateCliSchema } from 'repo-roller'

async function generateVSCodeSnippets() {
  const schema = generateCliSchema()
  const snippets: Record<string, unknown> = {}

  for (const command of schema.commands) {
    for (const example of command.examples) {
      const key = example.replace(/[^a-zA-Z0-9]/g, '_')
      snippets[key] = {
        prefix: `rr-${key}`,
        body: [example],
        description: command.description
      }
    }
  }

  await writeFile(
    '.vscode/repo-roller.code-snippets',
    JSON.stringify(snippets, null, 2)
  )
}
```

### Test Suite Generation

```typescript
import { generateCliSchema } from 'repo-roller'

function generateTests() {
  const schema = generateCliSchema()

  const tests: string[] = []

  for (const command of schema.commands) {
    tests.push(`
describe('${command.name}', () => {
  it('should execute successfully', async () => {
    const result = await exec('${command.name}')
    expect(result.code).toBe(0)
  })

  ${command.options.map(opt => `
  it('should accept ${opt.flags}', async () => {
    const result = await exec('${command.name} ${opt.flags}')
    expect(result.code).toBe(0)
  })
  `).join('\n')}
})
`)
  }

  return tests.join('\n\n')
}
```

### API Client Generation

```typescript
import { generateOpenApiDocs } from 'repo-roller'

async function generateApiClient() {
  const openapi = await generateOpenApiDocs()

  // Use with openapi-generator
  await writeFile('openapi.json', JSON.stringify(openapi, null, 2))

  // Generate TypeScript client
  // npx openapi-generator-cli generate -i openapi.json -g typescript-axios -o ./client
}
```

## Shell Completion Setup

### Bash

```bash
# Generate completions
repo-roller __schema --completions bash > /etc/bash_completion.d/repo-roller

# Or for user only
repo-roller __schema --completions bash > ~/.local/share/bash-completion/completions/repo-roller

# Reload completions
source ~/.bashrc
```

### Zsh

```bash
# Generate completions
repo-roller __schema --completions zsh > /usr/share/zsh/site-functions/_repo-roller

# Or for user only
mkdir -p ~/.zsh/completions
repo-roller __schema --completions zsh > ~/.zsh/completions/_repo-roller

# Add to ~/.zshrc
fpath=(~/.zsh/completions $fpath)
autoload -Uz compinit && compinit
```

### Fish

```bash
# Generate completions
repo-roller __schema --completions fish > ~/.config/fish/completions/repo-roller.fish

# Completions are loaded automatically
```

## Error Handling

The schema generation functions never throw errors:

```typescript
import { generateCliSchema, generateLlmToolDefinition } from 'repo-roller'

// Always succeeds
const schema = generateCliSchema()
const toolDef = generateLlmToolDefinition()

// OpenAPI may fail if config is invalid
try {
  const openapi = await generateOpenApiDocs()
} catch (error) {
  console.error('Failed to generate OpenAPI docs:', error.message)
}
```

## Related APIs

- [Types API](/api/types) - TypeScript type definitions
- [Configuration API](/api/configuration) - Configuration system

## See Also

- [CLI Reference](/cli/)
- [Integration Guide](/guide/integrations)
- [MCP Integration](/guide/mcp-integration)
