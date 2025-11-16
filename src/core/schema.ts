import { listModelPresets } from './modelPresets.js';
import { BUILT_IN_PRESETS } from './builtInPresets.js';
import { loadConfig, loadRepoRollerYml } from './config.js';

/**
 * JSON Schema type definition for CLI options
 */
export interface SchemaProperty {
  readonly type: string | readonly string[];
  readonly description: string;
  readonly enum?: readonly string[];
  readonly default?: unknown;
  readonly examples?: readonly unknown[];
  readonly pattern?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly items?: SchemaProperty;
  readonly format?: string;
}

/**
 * CLI argument definition
 */
export interface CliArgument {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
  readonly default?: unknown;
}

/**
 * CLI option definition
 */
export interface CliOption {
  readonly flags: string;
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly default?: unknown;
  readonly choices?: readonly string[];
  readonly examples?: readonly string[];
  readonly category: string;
}

/**
 * CLI command definition
 */
export interface CliCommand {
  readonly name: string;
  readonly description: string;
  readonly arguments?: readonly CliArgument[];
  readonly options: readonly CliOption[];
  readonly examples: readonly string[];
}

/**
 * Full CLI schema
 */
export interface CliSchema {
  readonly $schema: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly commands: readonly CliCommand[];
  readonly globalOptions: readonly CliOption[];
  readonly presets: readonly string[];
  readonly models: readonly {
    readonly name: string;
    readonly family: string;
    readonly contextLimit: number;
    readonly description: string;
  }[];
  readonly outputFormats: readonly string[];
  readonly sortModes: readonly string[];
}

/**
 * LLM tool definition (for AI agent integration)
 */
export interface LlmToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly input_schema: {
    readonly type: 'object';
    readonly properties: Record<string, SchemaProperty>;
    readonly required?: readonly string[];
  };
}

/**
 * Generate the full CLI schema
 */
export function generateCliSchema(): CliSchema {
  const modelPresets = listModelPresets();
  const builtInPresets = BUILT_IN_PRESETS;

  const mainCommandOptions: CliOption[] = [
    // Output options
    {
      flags: '-o, --out <file>',
      name: 'out',
      type: 'string',
      description: 'Output file path (default: auto-generated {project}-{date}.{ext})',
      examples: ['bundle.md', './output/code.json'],
      category: 'output',
    },
    {
      flags: '--out-template <template>',
      name: 'outTemplate',
      type: 'string',
      description: 'Output filename template',
      default: '{project}-{date}.{ext}',
      examples: ['{project}-{profile}-{date}.{ext}', 'bundle-{date}.md'],
      category: 'output',
    },
    {
      flags: '-f, --format <type>',
      name: 'format',
      type: 'string',
      description: 'Output format',
      default: 'md',
      choices: ['md', 'json', 'yaml', 'txt'],
      category: 'output',
    },

    // Filter options
    {
      flags: '-i, --include <patterns...>',
      name: 'include',
      type: 'string[]',
      description: 'Include glob patterns',
      examples: ['src/**/*.ts', '*.md'],
      category: 'filter',
    },
    {
      flags: '-x, --exclude <patterns...>',
      name: 'exclude',
      type: 'string[]',
      description: 'Exclude glob patterns',
      examples: ['**/*.test.ts', 'node_modules/**'],
      category: 'filter',
    },
    {
      flags: '--ext <extensions>',
      name: 'ext',
      type: 'string',
      description: 'Comma-separated list of file extensions',
      examples: ['ts,tsx,md', 'py,json'],
      category: 'filter',
    },
    {
      flags: '--lang <languages>',
      name: 'lang',
      type: 'string',
      description: 'Language filter',
      examples: ['typescript', 'python', 'go'],
      category: 'filter',
    },
    {
      flags: '--max-size <kb>',
      name: 'maxSize',
      type: 'number',
      description: 'Maximum file size in KB',
      default: 100,
      category: 'filter',
    },

    // Quick filters
    {
      flags: '--no-tests',
      name: 'noTests',
      type: 'boolean',
      description: 'Exclude test files',
      category: 'filter',
    },
    {
      flags: '--no-deps',
      name: 'noDeps',
      type: 'boolean',
      description: 'Exclude dependency directories',
      category: 'filter',
    },
    {
      flags: '--no-generated',
      name: 'noGenerated',
      type: 'boolean',
      description: 'Exclude generated/build directories',
      category: 'filter',
    },

    // Processing options
    {
      flags: '--strip-comments',
      name: 'stripComments',
      type: 'boolean',
      description: 'Strip comments from source files',
      default: false,
      category: 'processing',
    },
    {
      flags: '--no-tree',
      name: 'noTree',
      type: 'boolean',
      description: 'Disable directory tree view',
      category: 'processing',
    },
    {
      flags: '--no-stats',
      name: 'noStats',
      type: 'boolean',
      description: 'Disable statistics section',
      category: 'processing',
    },
    {
      flags: '--sort <mode>',
      name: 'sort',
      type: 'string',
      description: 'Sort mode',
      default: 'path',
      choices: ['path', 'size', 'extension'],
      category: 'processing',
    },

    // Mode options
    {
      flags: '-I, --interactive',
      name: 'interactive',
      type: 'boolean',
      description: 'Force interactive TUI mode',
      category: 'mode',
    },
    {
      flags: '--dry-run',
      name: 'dryRun',
      type: 'boolean',
      description: 'Preview what would be included without generating output',
      category: 'mode',
    },
    {
      flags: '--stats-only',
      name: 'statsOnly',
      type: 'boolean',
      description: 'Show statistics only without generating output',
      category: 'mode',
    },

    // Preset/Profile options
    {
      flags: '--preset <name>',
      name: 'preset',
      type: 'string',
      description: 'Use a preset (built-in or from config)',
      examples: ['llm', 'ts', 'minimal'],
      category: 'config',
    },
    {
      flags: '--profile <name>',
      name: 'profile',
      type: 'string',
      description: 'Use a profile from .reporoller.yml',
      default: 'llm-context',
      category: 'config',
    },
    {
      flags: '--model <name>',
      name: 'model',
      type: 'string',
      description: 'Use a model preset',
      examples: ['claude-3.5-sonnet', 'gpt-4o', 'gemini'],
      category: 'config',
    },

    // Token/Cost options
    {
      flags: '--target <provider>',
      name: 'target',
      type: 'string',
      description: 'Target LLM provider for cost estimation',
      examples: ['claude-sonnet', 'gpt-4o', 'gemini-pro'],
      category: 'budget',
    },
    {
      flags: '--max-tokens <number>',
      name: 'maxTokens',
      type: 'string',
      description: 'Maximum token budget (supports 50k, 1m format)',
      examples: ['50000', '50k', '1m'],
      category: 'budget',
    },
    {
      flags: '--max-cost <dollars>',
      name: 'maxCost',
      type: 'number',
      description: 'Maximum cost budget in USD',
      examples: [0.5, 1.0, 5.0],
      category: 'budget',
    },
    {
      flags: '--max-cost-eur <euros>',
      name: 'maxCostEur',
      type: 'number',
      description: 'Maximum cost budget in EUR',
      examples: [0.45, 0.9, 4.5],
      category: 'budget',
    },

    // Format-specific options
    {
      flags: '--compact',
      name: 'compact',
      type: 'boolean',
      description: 'Minify JSON output (JSON format only)',
      category: 'format',
    },
    {
      flags: '--indent <number>',
      name: 'indent',
      type: 'number',
      description: 'Indentation for JSON/YAML',
      default: 2,
      category: 'format',
    },
    {
      flags: '--toc',
      name: 'toc',
      type: 'boolean',
      description: 'Add table of contents (Markdown format only)',
      category: 'format',
    },
    {
      flags: '--front-matter',
      name: 'frontMatter',
      type: 'boolean',
      description: 'Add YAML front matter (Markdown format only)',
      category: 'format',
    },

    // UX options
    {
      flags: '-y, --yes',
      name: 'yes',
      type: 'boolean',
      description: 'Skip all prompts and use defaults',
      category: 'ux',
    },
    {
      flags: '-v, --verbose',
      name: 'verbose',
      type: 'boolean',
      description: 'Verbose output',
      category: 'ux',
    },
    {
      flags: '--llm',
      name: 'llm',
      type: 'boolean',
      description: 'Show detailed LLM provider/cost breakdown',
      category: 'ux',
    },
    {
      flags: '--prompt-helper',
      name: 'promptHelper',
      type: 'boolean',
      description: 'Show suggested LLM prompts tailored to the bundle',
      category: 'ux',
    },
  ];

  const infoOptions: CliOption[] = [
    {
      flags: '--list-presets',
      name: 'listPresets',
      type: 'boolean',
      description: 'List all available presets',
      category: 'info',
    },
    {
      flags: '--list-profiles',
      name: 'listProfiles',
      type: 'boolean',
      description: 'List all available profiles',
      category: 'info',
    },
    {
      flags: '--list-models',
      name: 'listModels',
      type: 'boolean',
      description: 'List all available model presets',
      category: 'info',
    },
    {
      flags: '--list-providers',
      name: 'listProviders',
      type: 'boolean',
      description: 'List all supported LLM providers',
      category: 'info',
    },
    {
      flags: '--show-preset <name>',
      name: 'showPreset',
      type: 'string',
      description: 'Show details of a specific preset',
      category: 'info',
    },
    {
      flags: '--show-profile <name>',
      name: 'showProfile',
      type: 'string',
      description: 'Show details of a specific profile',
      category: 'info',
    },
    {
      flags: '--examples',
      name: 'examples',
      type: 'boolean',
      description: 'Show usage examples',
      category: 'info',
    },
    {
      flags: '--validate',
      name: 'validate',
      type: 'boolean',
      description: 'Validate configuration files',
      category: 'info',
    },
  ];

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    name: 'repo-roller',
    version: '1.0.0',
    description: 'Aggregate source code into LLM-friendly bundles with intelligent context management',
    commands: [
      {
        name: 'repo-roller',
        description: 'Main command: bundle repository code for LLM consumption',
        arguments: [
          {
            name: 'root',
            type: 'string',
            required: false,
            description: 'Root directory to scan',
            default: '.',
          },
        ],
        options: [...mainCommandOptions, ...infoOptions],
        examples: [
          'repo-roller',
          'repo-roller --preset llm',
          'repo-roller --format json --compact',
          'repo-roller --include "src/**/*.ts" --exclude "**/*.test.ts"',
          'repo-roller --max-tokens 50k --model claude-3.5-sonnet',
          'repo-roller --interactive',
          'repo-roller --dry-run --verbose',
        ],
      },
      {
        name: 'repo-roller init',
        description: 'Initialize repo-roller configuration files',
        arguments: [
          {
            name: 'root',
            type: 'string',
            required: false,
            description: 'Root directory',
            default: '.',
          },
        ],
        options: [],
        examples: ['repo-roller init', 'repo-roller init ./my-project'],
      },
      {
        name: 'repo-roller history',
        description: 'View and manage bundle generation history',
        arguments: [],
        options: [
          {
            flags: '--list',
            name: 'list',
            type: 'boolean',
            description: 'List recent history entries',
            category: 'history',
          },
          {
            flags: '--show <id>',
            name: 'show',
            type: 'string',
            description: 'Show details of a specific history entry',
            category: 'history',
          },
          {
            flags: '--diff <range>',
            name: 'diff',
            type: 'string',
            description: 'Compare two history entries (e.g., 1..2 or id1..id2)',
            examples: ['-1..-2', 'abc123..def456'],
            category: 'history',
          },
          {
            flags: '--replay <id>',
            name: 'replay',
            type: 'string',
            description: 'Replay a previous bundle generation',
            category: 'history',
          },
          {
            flags: '--export <format>',
            name: 'export',
            type: 'string',
            description: 'Export history',
            choices: ['json', 'yaml', 'csv'],
            category: 'history',
          },
          {
            flags: '--stats',
            name: 'stats',
            type: 'boolean',
            description: 'Show history statistics',
            category: 'history',
          },
          {
            flags: '--clear',
            name: 'clear',
            type: 'boolean',
            description: 'Clear all history',
            category: 'history',
          },
        ],
        examples: [
          'repo-roller history',
          'repo-roller history --show -1',
          'repo-roller history --diff -1..-2',
          'repo-roller history --replay abc123',
          'repo-roller history --export json',
          'repo-roller history --stats',
        ],
      },
      {
        name: 'repo-roller __schema',
        description: 'Output machine-readable CLI schema for introspection',
        arguments: [],
        options: [
          {
            flags: '--json',
            name: 'json',
            type: 'boolean',
            description: 'Output as JSON Schema',
            category: 'schema',
          },
          {
            flags: '--for-llm',
            name: 'forLlm',
            type: 'boolean',
            description: 'Output as LLM tool definition',
            category: 'schema',
          },
          {
            flags: '--completions <shell>',
            name: 'completions',
            type: 'string',
            description: 'Generate shell completions',
            choices: ['bash', 'zsh', 'fish'],
            category: 'schema',
          },
        ],
        examples: [
          'repo-roller __schema --json',
          'repo-roller __schema --for-llm',
          'repo-roller __schema --completions bash',
        ],
      },
    ],
    globalOptions: [
      {
        flags: '--version',
        name: 'version',
        type: 'boolean',
        description: 'Show version number',
        category: 'global',
      },
      {
        flags: '--help',
        name: 'help',
        type: 'boolean',
        description: 'Show help',
        category: 'global',
      },
    ],
    presets: Object.keys(builtInPresets),
    models: modelPresets.map((m) => ({
      name: m.name,
      family: m.family,
      contextLimit: m.contextLimit,
      description: m.description,
    })),
    outputFormats: ['md', 'json', 'yaml', 'txt'],
    sortModes: ['path', 'size', 'extension'],
  };
}

/**
 * Generate an LLM tool definition for AI agents
 */
export function generateLlmToolDefinition(): LlmToolDefinition {
  return {
    name: 'repo_roller_bundle',
    description:
      'Bundle repository source code into a single context-optimized output for LLM consumption. Automatically discovers files, estimates token usage, and formats output appropriately.',
    input_schema: {
      type: 'object',
      properties: {
        root: {
          type: 'string',
          description: 'Root directory to scan (default: current directory)',
          default: '.',
        },
        preset: {
          type: 'string',
          description: 'Use a predefined configuration preset',
          enum: Object.keys(BUILT_IN_PRESETS),
          examples: ['llm', 'ts', 'minimal', 'docs'],
        },
        include: {
          type: 'array',
          description: 'Glob patterns for files to include',
          items: { type: 'string', description: 'Glob pattern' },
          examples: [['src/**/*.ts', '*.md'], ['**/*.py']],
        },
        exclude: {
          type: 'array',
          description: 'Glob patterns for files to exclude',
          items: { type: 'string', description: 'Glob pattern' },
          examples: [['**/*.test.ts', 'node_modules/**']],
        },
        format: {
          type: 'string',
          description: 'Output format',
          enum: ['md', 'json', 'yaml', 'txt'],
          default: 'md',
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum token budget for output',
          minimum: 1000,
          maximum: 10000000,
          examples: [50000, 100000],
        },
        model: {
          type: 'string',
          description: 'Target LLM model for context sizing',
          enum: listModelPresets().map((m) => m.name),
          examples: ['claude-3.5-sonnet', 'gpt-4o'],
        },
        strip_comments: {
          type: 'boolean',
          description: 'Remove comments from source code to save tokens',
          default: false,
        },
        with_tree: {
          type: 'boolean',
          description: 'Include directory tree visualization',
          default: true,
        },
        with_stats: {
          type: 'boolean',
          description: 'Include token and size statistics',
          default: true,
        },
      },
      required: [],
    },
  };
}

/**
 * Generate shell completions
 */
export function generateShellCompletions(shell: 'bash' | 'zsh' | 'fish'): string {
  const schema = generateCliSchema();
  const mainCommand = schema.commands[0];
  if (!mainCommand) {
    return '';
  }

  switch (shell) {
    case 'bash':
      return generateBashCompletions(mainCommand);
    case 'zsh':
      return generateZshCompletions(mainCommand);
    case 'fish':
      return generateFishCompletions(mainCommand);
  }
}

function generateBashCompletions(command: CliCommand): string {
  const options = command.options.map((opt) => opt.flags.split(/[,\s]+/)[0]?.trim() ?? '');

  return `# repo-roller bash completion
_repo_roller_completions() {
    local cur prev opts
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    opts="${options.join(' ')}"

    case "\${prev}" in
        --format|-f)
            COMPREPLY=( $(compgen -W "md json yaml txt" -- "\${cur}") )
            return 0
            ;;
        --sort)
            COMPREPLY=( $(compgen -W "path size extension" -- "\${cur}") )
            return 0
            ;;
        --preset)
            COMPREPLY=( $(compgen -W "llm ts js python go rust docs minimal full" -- "\${cur}") )
            return 0
            ;;
        --model)
            COMPREPLY=( $(compgen -W "claude-3.5-sonnet gpt-4o gemini-1.5-pro" -- "\${cur}") )
            return 0
            ;;
    esac

    if [[ "\${cur}" == -* ]]; then
        COMPREPLY=( $(compgen -W "\${opts}" -- "\${cur}") )
        return 0
    fi

    COMPREPLY=( $(compgen -d -- "\${cur}") )
}

complete -F _repo_roller_completions repo-roller
`;
}

function generateZshCompletions(command: CliCommand): string {
  const lines = ['#compdef repo-roller', '', '_repo_roller() {', '  local -a options', '  options=('];

  for (const opt of command.options) {
    const flagPart = opt.flags.split(',')[0]?.trim() ?? '';
    lines.push(`    '${flagPart}[${opt.description}]'`);
  }

  lines.push('  )', '  _arguments -s $options', '}', '', '_repo_roller');

  return lines.join('\n');
}

function generateFishCompletions(command: CliCommand): string {
  const lines = ['# repo-roller fish completions'];

  for (const opt of command.options) {
    const flagMatch = opt.flags.match(/--([a-z-]+)/);
    if (flagMatch?.[1]) {
      const shortMatch = opt.flags.match(/-([a-zA-Z]),/);
      let line = `complete -c repo-roller -l ${flagMatch[1]}`;
      if (shortMatch?.[1]) {
        line += ` -s ${shortMatch[1]}`;
      }
      line += ` -d '${opt.description}'`;
      if (opt.choices) {
        line += ` -a '${opt.choices.join(' ')}'`;
      }
      lines.push(line);
    }
  }

  return lines.join('\n');
}

/**
 * Generate OpenAPI-style documentation
 */
export async function generateOpenApiDocs(root: string = '.'): Promise<Record<string, unknown>> {
  const schema = generateCliSchema();
  const config = await loadConfig(root);
  const repoRollerConfig = await loadRepoRollerYml(root);

  return {
    openapi: '3.0.3',
    info: {
      title: schema.name,
      version: schema.version,
      description: schema.description,
    },
    paths: {
      '/bundle': {
        post: {
          summary: 'Generate code bundle',
          description: 'Bundle repository code into LLM-friendly format',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: generateLlmToolDefinition().input_schema.properties,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Bundle generated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      outputFile: { type: 'string' },
                      fileCount: { type: 'number' },
                      estimatedTokens: { type: 'number' },
                      cost: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Preset: {
          type: 'object',
          properties: {
            include: { type: 'array', items: { type: 'string' } },
            exclude: { type: 'array', items: { type: 'string' } },
            stripComments: { type: 'boolean' },
            withTree: { type: 'boolean' },
            withStats: { type: 'boolean' },
          },
        },
      },
    },
    'x-config': {
      builtInPresets: schema.presets,
      userPresets: config?.presets ? Object.keys(config.presets) : [],
      yamlPresets: repoRollerConfig?.presets ? Object.keys(repoRollerConfig.presets) : [],
      profiles: repoRollerConfig?.profiles ? Object.keys(repoRollerConfig.profiles) : [],
      models: schema.models,
    },
  };
}
