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
    if (!preset) continue;
    const extensions = preset.extensions?.join(', ') || 'all';
    console.log(`  • ${name.padEnd(12)} - ${extensions}`);
  }

  // Config presets
  if (config?.presets && Object.keys(config.presets).length > 0) {
    console.log('\nFrom repo-roller.config:');
    for (const [name, preset] of Object.entries(config.presets)) {
      const extensions = preset.extensions?.join(', ') || 'custom';
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
  const preset = builtInPreset || configPreset;

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
  console.log('📚 Common Examples:\n');

  console.log('Get started (interactive):');
  console.log('  repo-roller .\n');

  console.log('TypeScript project for LLM:');
  console.log('  repo-roller . --preset llm --lang typescript\n');

  console.log('Custom output filename:');
  console.log('  repo-roller . --out my-custom-name.md\n');

  console.log('Preview without generating:');
  console.log('  repo-roller . --dry-run\n');

  console.log('Documentation only:');
  console.log('  repo-roller . --preset docs -o docs.md\n');

  console.log('Custom selection:');
  console.log('  repo-roller . --ext ts,tsx --no-tests --max-size 500\n');

  console.log('Python project:');
  console.log('  repo-roller . --preset python --no-deps\n');

  console.log('JSON output for API:');
  console.log('  repo-roller . --format json --preset minimal\n');

  console.log('All TypeScript files:');
  console.log('  repo-roller . --lang typescript --no-tests\n');

  console.log('Statistics only:');
  console.log('  repo-roller . --stats-only\n');
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
