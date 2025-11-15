import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { select } from '@inquirer/prompts';

/**
 * Project type templates
 */
const PROJECT_TEMPLATES = {
  'typescript': {
    name: 'Node.js/TypeScript',
    config: {
      presets: {
        'llm': {
          extensions: ['ts', 'tsx', 'json', 'md'],
          exclude: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**', '**/dist/**'],
          maxFileSizeBytes: 2097152,
          stripComments: false,
          withTree: true,
          withStats: true,
          sort: 'path',
        },
        'code-only': {
          extensions: ['ts', 'tsx'],
          exclude: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**', '**/dist/**'],
          stripComments: true,
          withTree: false,
          withStats: false,
        },
      },
      defaultPreset: 'llm',
    },
  },
  'python': {
    name: 'Python',
    config: {
      presets: {
        'llm': {
          extensions: ['py', 'pyi', 'md', 'txt', 'yaml', 'yml'],
          exclude: ['**/*.pyc', '**/__pycache__/**', '**/.venv/**', '**/venv/**'],
          maxFileSizeBytes: 2097152,
          stripComments: false,
          withTree: true,
          withStats: true,
          sort: 'path',
        },
        'code-only': {
          extensions: ['py', 'pyi'],
          exclude: ['**/*.pyc', '**/__pycache__/**', '**/.venv/**', '**/venv/**', '**/*.test.py'],
          stripComments: true,
          withTree: false,
          withStats: false,
        },
      },
      defaultPreset: 'llm',
    },
  },
  'go': {
    name: 'Go',
    config: {
      presets: {
        'llm': {
          extensions: ['go', 'mod', 'sum', 'md'],
          exclude: ['**/*_test.go', '**/vendor/**'],
          maxFileSizeBytes: 2097152,
          stripComments: false,
          withTree: true,
          withStats: true,
          sort: 'path',
        },
        'code-only': {
          extensions: ['go'],
          exclude: ['**/*_test.go', '**/vendor/**'],
          stripComments: true,
          withTree: false,
          withStats: false,
        },
      },
      defaultPreset: 'llm',
    },
  },
  'docs': {
    name: 'Documentation',
    config: {
      presets: {
        'all-docs': {
          extensions: ['md', 'mdx', 'txt'],
          withTree: true,
          withStats: false,
          sort: 'path',
        },
      },
      defaultPreset: 'all-docs',
    },
  },
  'multi': {
    name: 'Multi-language',
    config: {
      presets: {
        'llm': {
          extensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'md', 'json', 'yaml', 'yml'],
          exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.venv/**', '**/venv/**', '**/vendor/**', '**/target/**'],
          maxFileSizeBytes: 2097152,
          stripComments: false,
          withTree: true,
          withStats: true,
          sort: 'path',
        },
      },
      defaultPreset: 'llm',
    },
  },
} as const;

/**
 * Generate .reporoller.yml content
 */
function generateRepoRollerYml(): string {
  return `# Repository metadata
architectural_overview: |
  Add your project's architectural overview here.
  This will be included in the output to provide context.

# Define custom profiles for different file organization strategies
profiles:
  llm-context:
    layout:
      - README.md
      - package.json
      - "src/core/types.ts"
      - "src/**/*.ts"
`;
}

/**
 * Run interactive initialization
 */
export async function runInit(rootDir: string): Promise<void> {
  console.log('🚀 Initializing repo-roller configuration...\n');

  // Ask for project type
  const projectType = await select({
    message: "What's your project type?",
    choices: [
      { name: 'Node.js/TypeScript', value: 'typescript' },
      { name: 'Python', value: 'python' },
      { name: 'Go', value: 'go' },
      { name: 'Documentation', value: 'docs' },
      { name: 'Multi-language', value: 'multi' },
    ],
  });

  // Ask for output format
  const _format = await select({
    message: 'Default output format?',
    choices: [
      { name: 'Markdown (best for LLMs)', value: 'md' },
      { name: 'JSON', value: 'json' },
      { name: 'YAML', value: 'yaml' },
      { name: 'Plain Text', value: 'txt' },
    ],
  });

  // Get template
  const template = PROJECT_TEMPLATES[projectType as keyof typeof PROJECT_TEMPLATES];

  // Generate repo-roller.config.mjs
  const configContent = `// repo-roller configuration
export default ${JSON.stringify(template.config, null, 2)};
`;

  const configPath = join(rootDir, 'repo-roller.config.mjs');
  await writeFile(configPath, configContent, 'utf-8');

  console.log(`\n✅ Created ${configPath}`);

  // Generate .reporoller.yml
  const ymlContent = generateRepoRollerYml();
  const ymlPath = join(rootDir, '.reporoller.yml');
  await writeFile(ymlPath, ymlContent, 'utf-8');

  console.log(`✅ Created ${ymlPath}`);

  console.log('\n✨ Configuration created successfully!\n');
  console.log('Next steps:');
  console.log('  1. Edit .reporoller.yml to add your project description');
  console.log('  2. Run: repo-roller . --preset llm');
  console.log('  3. Or run interactively: repo-roller .\n');
}
