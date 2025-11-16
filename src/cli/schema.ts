import * as ui from '../core/ui.js';
import {
  generateCliSchema,
  generateLlmToolDefinition,
  generateShellCompletions,
  generateOpenApiDocs,
} from '../core/schema.js';

/**
 * Display JSON Schema for the CLI
 */
export function displayJsonSchema(): void {
  const schema = generateCliSchema();
  console.log(JSON.stringify(schema, null, 2));
}

/**
 * Display LLM tool definition
 */
export function displayLlmToolDefinition(): void {
  const toolDef = generateLlmToolDefinition();
  console.log(JSON.stringify(toolDef, null, 2));
}

/**
 * Display shell completions for specified shell
 */
export function displayShellCompletions(shell: 'bash' | 'zsh' | 'fish'): void {
  const completions = generateShellCompletions(shell);
  console.log(completions);
}

/**
 * Display OpenAPI-style documentation
 */
export async function displayOpenApiDocs(root: string = '.'): Promise<void> {
  const docs = await generateOpenApiDocs(root);
  console.log(JSON.stringify(docs, null, 2));
}

/**
 * Display human-readable schema summary
 */
export function displaySchemaSummary(): void {
  const schema = generateCliSchema();

  console.log(ui.header());
  console.log(ui.section('CLI Schema Introspection'));

  console.log(ui.colors.primary.bold('  Metadata'));
  console.log(ui.keyValue('Name', schema.name, 20));
  console.log(ui.keyValue('Version', schema.version, 20));
  console.log(ui.keyValue('Description', schema.description.slice(0, 50) + '...', 20));
  console.log('');

  console.log(ui.colors.primary.bold('  Commands'));
  for (const cmd of schema.commands) {
    console.log(`    ${ui.colors.accent(cmd.name)}`);
    console.log(`      ${ui.colors.dim(cmd.description)}`);
    console.log(`      ${ui.colors.muted(`${cmd.options.length} options, ${cmd.examples.length} examples`)}`);
    console.log('');
  }

  console.log(ui.colors.primary.bold('  Built-in Presets'));
  console.log(`    ${schema.presets.join(', ')}`);
  console.log('');

  console.log(ui.colors.primary.bold('  Supported Models'));
  const families = new Map<string, string[]>();
  for (const model of schema.models) {
    if (!families.has(model.family)) {
      families.set(model.family, []);
    }
    families.get(model.family)!.push(model.name);
  }
  for (const [family, models] of families) {
    console.log(`    ${ui.colors.secondary(family)}: ${models.join(', ')}`);
  }
  console.log('');

  console.log(ui.colors.primary.bold('  Output Formats'));
  console.log(`    ${schema.outputFormats.join(', ')}`);
  console.log('');

  console.log(ui.colors.primary.bold('  Sort Modes'));
  console.log(`    ${schema.sortModes.join(', ')}`);
  console.log('');

  console.log(ui.colors.dim('  Use --json for full JSON Schema output'));
  console.log(ui.colors.dim('  Use --for-llm for AI agent tool definition'));
  console.log(ui.colors.dim('  Use --completions <shell> for shell completions'));
  console.log('');
}

/**
 * Display options grouped by category
 */
export function displayOptionsByCategory(): void {
  const schema = generateCliSchema();
  const mainCommand = schema.commands.find((c) => c.name === 'repo-roller');
  if (!mainCommand) {return;}

  console.log(ui.header());
  console.log(ui.section('Options by Category'));

  const categories = new Map<string, typeof mainCommand.options>();

  for (const opt of mainCommand.options) {
    if (!categories.has(opt.category)) {
      categories.set(opt.category, []);
    }
    categories.get(opt.category)!.push(opt);
  }

  const categoryOrder = ['output', 'filter', 'processing', 'mode', 'config', 'budget', 'format', 'ux', 'info'];

  for (const category of categoryOrder) {
    const opts = categories.get(category);
    if (!opts || opts.length === 0) {continue;}

    console.log(ui.colors.primary.bold(`  ${category.toUpperCase()}`));
    console.log(ui.colors.muted('  ' + ui.symbols.line.repeat(50)));

    for (const opt of opts) {
      console.log(`    ${ui.colors.accent(opt.flags.padEnd(30))}`);
      console.log(`      ${ui.colors.dim(opt.description)}`);
      if (opt.default !== undefined) {
        console.log(`      ${ui.colors.muted(`Default: ${JSON.stringify(opt.default)}`)}`);
      }
      if (opt.choices) {
        console.log(`      ${ui.colors.muted(`Choices: ${opt.choices.join(', ')}`)}`);
      }
    }
    console.log('');
  }
}
