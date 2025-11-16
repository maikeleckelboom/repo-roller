import { BUILT_IN_PRESETS, listBuiltInPresets } from './builtInPresets.js';
import type { RepoRollerYmlConfig, RollerConfig } from './types.js';

/**
 * Display all available presets (built-in + config)
 */
export function displayPresets(config?: RollerConfig): void {
  console.log('📋 Available Presets:\n');

  // Built-in presets
  console.log('Built-in:');
  const builtInNames = listBuiltInPresets();
  for (const name of builtInNames) {
    const preset = BUILT_IN_PRESETS[name];
    if (!preset) {continue;}
    const extensions = preset.extensions?.join(', ') ?? 'all';
    console.log(`  • ${name.padEnd(12)} - ${extensions}`);
  }

  // Config presets
  if (config?.presets && Object.keys(config.presets).length > 0) {
    console.log('\nFrom repo-roller.config:');
    for (const [name, preset] of Object.entries(config.presets)) {
      const extensions = preset.extensions?.join(', ') ?? 'custom';
      console.log(`  • ${name.padEnd(12)} - ${extensions}`);
    }
  }

  console.log('\nUsage: repo-roller . --preset <name>');
}

/**
 * Display details of a specific preset
 */
export function displayPresetDetails(name: string, config?: RollerConfig): void {
  const builtInPreset = BUILT_IN_PRESETS[name];
  const configPreset = config?.presets?.[name];
  const preset = builtInPreset ?? configPreset;

  if (!preset) {
    console.error(`❌ Preset "${name}" not found.`);
    console.error('\nRun "repo-roller --list-presets" to see available presets.');
    return;
  }

  console.log(`📄 Preset: ${name}\n`);

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

  if (preset.sort) {
    console.log(`Sort: ${preset.sort}`);
  }

  console.log(`\nSource: ${builtInPreset ? 'built-in' : 'repo-roller.config'}`);
}

/**
 * Display all available profiles
 */
export function displayProfiles(repoRollerConfig?: RepoRollerYmlConfig): void {
  console.log('📋 Available Profiles:\n');

  console.log('Built-in:');
  console.log('  • llm-context (default) - Optimized for LLM comprehension');

  if (repoRollerConfig?.profiles && Object.keys(repoRollerConfig.profiles).length > 0) {
    console.log('\nFrom .reporoller.yml:');
    for (const name of Object.keys(repoRollerConfig.profiles)) {
      console.log(`  • ${name}`);
    }
  } else {
    console.log('\n💡 Create custom profiles in .reporoller.yml');
  }

  console.log('\nUsage: repo-roller . --profile <name>');
}

/**
 * Display details of a specific profile
 */
export function displayProfileDetails(
  name: string,
  repoRollerConfig?: RepoRollerYmlConfig
): void {
  const profile = repoRollerConfig?.profiles?.[name];

  if (!profile && name !== 'llm-context') {
    console.error(`❌ Profile "${name}" not found.`);
    console.error('\nRun "repo-roller --list-profiles" to see available profiles.');
    return;
  }

  console.log(`📄 Profile: ${name}\n`);

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

/**
 * Display usage examples
 */
export function displayExamples(): void {
  console.log('📚 Common Workflows:\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('LLM CONTEXT GENERATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1. Create context for Claude Projects:');
  console.log('   $ repo-roller . --target claude-sonnet');
  console.log('   → Optimized for 200K context window');
  console.log('   → Shows cost estimate and utilization %\n');

  console.log('2. Context for GPT-4 with token warning:');
  console.log('   $ repo-roller . --target gpt-4o --warn-tokens 100000');
  console.log('   → Warns if output exceeds threshold\n');

  console.log('3. Preview token usage before generating:');
  console.log('   $ repo-roller . --dry-run');
  console.log('   → Shows estimated tokens and provider fit\n');

  console.log('4. Minimal context (budget-friendly):');
  console.log('   $ repo-roller . --preset minimal --target claude-haiku');
  console.log('   → Stripped comments, smaller files\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('QUICK FILTERS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('5. TypeScript source only (no tests):');
  console.log('   $ repo-roller . --lang typescript --no-tests\n');

  console.log('6. Python project (exclude venv):');
  console.log('   $ repo-roller . --preset python --no-deps\n');

  console.log('7. Focus on specific extensions:');
  console.log('   $ repo-roller . --ext ts,tsx --max-size 500\n');

  console.log('8. Documentation files only:');
  console.log('   $ repo-roller . --preset docs\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('OUTPUT CUSTOMIZATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('9. Custom output filename:');
  console.log('   $ repo-roller . --out context-$(date +%Y%m%d).md\n');

  console.log('10. JSON format for programmatic use:');
  console.log('    $ repo-roller . --format json --compact\n');

  console.log('11. With table of contents:');
  console.log('    $ repo-roller . --toc --front-matter\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('INTERACTIVE MODE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('12. Launch file selection UI:');
  console.log('    $ repo-roller . --interactive');
  console.log('    → Visual tree to select specific files\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('INFO COMMANDS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('List LLM providers and pricing:');
  console.log('  $ repo-roller --list-providers\n');

  console.log('List available presets:');
  console.log('  $ repo-roller --list-presets\n');

  console.log('Show project statistics:');
  console.log('  $ repo-roller . --stats-only\n');
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) {return '0 B';}
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Normalize extension by removing leading dot
 */
export function normalizeExtension(ext: string): string {
  return ext.startsWith('.') ? ext.slice(1) : ext;
}
