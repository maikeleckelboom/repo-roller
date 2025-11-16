import { BUILT_IN_PRESETS, listBuiltInPresets } from '../core/builtInPresets.js';
import type { RepoRollerYmlConfig, RollerConfig } from '../core/types.js';

export function displayPresets(config?: RollerConfig | null, repoRollerConfig?: RepoRollerYmlConfig | null): void {
  console.log('Available Presets:\n');

  console.log('Built-in:');
  const builtInNames = listBuiltInPresets();
  for (const name of builtInNames) {
    const preset = BUILT_IN_PRESETS[name];
    if (!preset) {
      continue;
    }
    const extensions = preset.extensions?.join(', ') ?? 'all';
    const desc = preset.description ?? extensions;
    console.log(`  * ${name.padEnd(12)} - ${desc}`);
  }

  if (config?.presets && Object.keys(config.presets).length > 0) {
    console.log('\nFrom repo-roller.config:');
    for (const [name, preset] of Object.entries(config.presets)) {
      const extensions = preset.extensions?.join(', ') ?? 'custom';
      const desc = preset.description ?? extensions;
      console.log(`  * ${name.padEnd(12)} - ${desc}`);
    }
  }

  if (repoRollerConfig?.presets && Object.keys(repoRollerConfig.presets).length > 0) {
    console.log('\nFrom .reporoller.yml (with intent/header/footer support):');
    for (const [name, preset] of Object.entries(repoRollerConfig.presets)) {
      const desc = preset.description ?? 'custom preset';
      const hasIntent = preset.header || preset.footer ? ' [has intent]' : '';
      console.log(`  * ${name.padEnd(12)} - ${desc}${hasIntent}`);
    }
  }

  console.log('\nUsage: repo-roller . --preset <name>');
}

export function displayPresetDetails(name: string, config?: RollerConfig | null, repoRollerConfig?: RepoRollerYmlConfig | null): void {
  const builtInPreset = BUILT_IN_PRESETS[name];
  const configPreset = config?.presets?.[name];
  const yamlPreset = repoRollerConfig?.presets?.[name];
  const preset = builtInPreset ?? configPreset ?? yamlPreset;

  if (!preset) {
    console.error(`Preset "${name}" not found.`);
    console.error('\nRun "repo-roller --list-presets" to see available presets.');
    return;
  }

  console.log(`Preset: ${name}\n`);

  if (preset.description) {
    console.log(`Description: ${preset.description}\n`);
  }

  if (preset.extensions && preset.extensions.length > 0) {
    console.log(`Extensions: ${preset.extensions.join(', ')}`);
  }

  if (preset.include && preset.include.length > 0) {
    console.log(`Include: ${preset.include.join(', ')}`);
  }

  if (preset.exclude && preset.exclude.length > 0) {
    console.log(`Exclude: ${preset.exclude.join(', ')}`);
  }

  if (preset.maxFileSizeBytes !== undefined) {
    const sizeMB = (preset.maxFileSizeBytes / (1024 * 1024)).toFixed(2);
    console.log(`Max file size: ${sizeMB} MB`);
  }

  console.log(`Strip comments: ${preset.stripComments ? 'yes' : 'no'}`);
  console.log(`With tree: ${preset.withTree ? 'yes' : 'no'}`);
  console.log(`With stats: ${preset.withStats ? 'yes' : 'no'}`);
  console.log(`Add outlines: ${preset.addOutlines ? 'yes' : 'no'}`);

  if (preset.sort) {
    console.log(`Sort: ${preset.sort}`);
  }

  if (preset.header) {
    console.log(`\nHeader (task/intent):`);
    console.log(`  ${preset.header.trim().split('\n').slice(0, 3).join('\n  ')}...`);
  }

  if (preset.footer) {
    console.log(`\nFooter (instructions):`);
    console.log(`  ${preset.footer.trim().split('\n').slice(0, 3).join('\n  ')}...`);
  }

  let source = 'built-in';
  if (yamlPreset) {
    source = '.reporoller.yml';
  } else if (configPreset) {
    source = 'repo-roller.config';
  }
  console.log(`\nSource: ${source}`);
}

export function displayProfiles(repoRollerConfig?: RepoRollerYmlConfig | null): void {
  console.log('Available Profiles:\n');

  console.log('Built-in:');
  console.log('  * llm-context (default) - Optimized for LLM comprehension');

  if (repoRollerConfig?.profiles && Object.keys(repoRollerConfig.profiles).length > 0) {
    console.log('\nFrom .reporoller.yml:');
    for (const name of Object.keys(repoRollerConfig.profiles)) {
      console.log(`  * ${name}`);
    }
  } else {
    console.log('\nCreate custom profiles in .reporoller.yml');
  }

  console.log('\nUsage: repo-roller . --profile <name>');
}

export function displayProfileDetails(name: string, repoRollerConfig?: RepoRollerYmlConfig | null): void {
  const profile = repoRollerConfig?.profiles?.[name];

  if (!profile && name !== 'llm-context') {
    console.error(`Profile "${name}" not found.`);
    console.error('\nRun "repo-roller --list-profiles" to see available profiles.');
    return;
  }

  console.log(`Profile: ${name}\n`);

  if (name === 'llm-context' && !profile) {
    console.log('Default built-in profile for LLM comprehension.');
    console.log('\nLayout order: Uses standard file discovery with path sorting');
    return;
  }

  if (profile?.layout) {
    console.log('Layout order:');
    profile.layout.forEach((pattern, index) => {
      console.log(`  ${index + 1}. ${pattern}`);
    });
  }
}

export function displayExamples(): void {
  console.log('Common Workflows:\n');

  console.log('LLM CONTEXT GENERATION');
  console.log('='.repeat(50) + '\n');

  console.log('1. Create context for Claude Projects:');
  console.log('   $ repo-roller . --target claude-sonnet');
  console.log('   > Optimized for 200K context window');
  console.log('   > Shows cost estimate and utilization %\n');

  console.log('2. Context for GPT-4 with token warning:');
  console.log('   $ repo-roller . --target gpt-4o --warn-tokens 100000');
  console.log('   > Warns if output exceeds threshold\n');

  console.log('3. Preview token usage before generating:');
  console.log('   $ repo-roller . --dry-run');
  console.log('   > Shows estimated tokens and provider fit\n');

  console.log('4. Minimal context (budget-friendly):');
  console.log('   $ repo-roller . --preset minimal --target claude-haiku');
  console.log('   > Stripped comments, smaller files\n');

  console.log('QUICK FILTERS');
  console.log('='.repeat(50) + '\n');

  console.log('5. TypeScript source only (no tests):');
  console.log('   $ repo-roller . --lang typescript --no-tests\n');

  console.log('6. Python project (exclude venv):');
  console.log('   $ repo-roller . --preset python --no-deps\n');

  console.log('7. Focus on specific extensions:');
  console.log('   $ repo-roller . --ext ts,tsx --max-size 500\n');

  console.log('8. Documentation files only:');
  console.log('   $ repo-roller . --preset docs\n');

  console.log('OUTPUT CUSTOMIZATION');
  console.log('='.repeat(50) + '\n');

  console.log('9. Custom output filename:');
  console.log('   $ repo-roller . --out context-$(date +%Y%m%d).md\n');

  console.log('10. JSON format for programmatic use:');
  console.log('    $ repo-roller . --format json --compact\n');

  console.log('11. With table of contents:');
  console.log('    $ repo-roller . --toc --front-matter\n');

  console.log('INTERACTIVE MODE');
  console.log('='.repeat(50) + '\n');

  console.log('12. Launch file selection UI:');
  console.log('    $ repo-roller . --interactive');
  console.log('    > Visual tree to select specific files\n');

  console.log('INFO COMMANDS');
  console.log('='.repeat(50) + '\n');

  console.log('List LLM providers and pricing:');
  console.log('  $ repo-roller --list-providers\n');

  console.log('List available presets:');
  console.log('  $ repo-roller --list-presets\n');

  console.log('Show project statistics:');
  console.log('  $ repo-roller . --stats-only\n');
}
