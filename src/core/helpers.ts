import { BUILT_IN_PRESETS, listBuiltInPresets } from './builtInPresets.js';
import type { RepoRollerYmlConfig, RollerConfig } from './types.js';

/**
 * Display all available presets (built-in + config + YAML)
 */
export function displayPresets(config?: RollerConfig, repoRollerConfig?: RepoRollerYmlConfig): void {
  console.log('📋 Available Presets:\n');

  // Built-in presets
  console.log('Built-in:');
  const builtInNames = listBuiltInPresets();
  for (const name of builtInNames) {
    const preset = BUILT_IN_PRESETS[name];
    if (!preset) {continue;}
    const extensions = preset.extensions?.join(', ') ?? 'all';
    const desc = preset.description ?? extensions;
    console.log(`  • ${name.padEnd(12)} - ${desc}`);
  }

  // Config presets (from repo-roller.config.mjs)
  if (config?.presets && Object.keys(config.presets).length > 0) {
    console.log('\nFrom repo-roller.config:');
    for (const [name, preset] of Object.entries(config.presets)) {
      const extensions = preset.extensions?.join(', ') ?? 'custom';
      const desc = preset.description ?? extensions;
      console.log(`  • ${name.padEnd(12)} - ${desc}`);
    }
  }

  // YAML presets (from .reporoller.yml) - these support headers/footers
  if (repoRollerConfig?.presets && Object.keys(repoRollerConfig.presets).length > 0) {
    console.log('\nFrom .reporoller.yml (with intent/header/footer support):');
    for (const [name, preset] of Object.entries(repoRollerConfig.presets)) {
      const desc = preset.description ?? 'custom preset';
      const hasIntent = preset.header || preset.footer ? ' [has intent]' : '';
      console.log(`  • ${name.padEnd(12)} - ${desc}${hasIntent}`);
    }
  }

  console.log('\nUsage: repo-roller . --preset <name>');
}

/**
 * Display details of a specific preset
 */
export function displayPresetDetails(name: string, config?: RollerConfig, repoRollerConfig?: RepoRollerYmlConfig): void {
  const builtInPreset = BUILT_IN_PRESETS[name];
  const configPreset = config?.presets?.[name];
  const yamlPreset = repoRollerConfig?.presets?.[name];
  const preset = builtInPreset ?? configPreset ?? yamlPreset;

  if (!preset) {
    console.error(`❌ Preset "${name}" not found.`);
    console.error('\nRun "repo-roller --list-presets" to see available presets.');
    return;
  }

  console.log(`📄 Preset: ${name}\n`);

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

  // Show header/footer information for enhanced presets
  if (preset.header) {
    console.log(`\n📝 Header (task/intent):`);
    console.log(`  ${preset.header.trim().split('\n').slice(0, 3).join('\n  ')}...`);
  }

  if (preset.footer) {
    console.log(`\n📋 Footer (instructions):`);
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

/**
 * Map file extension to language name
 */
export function extensionToLanguage(ext: string): string {
  const langMap: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript',
    js: 'JavaScript',
    jsx: 'JavaScript',
    mjs: 'JavaScript',
    cjs: 'JavaScript',
    py: 'Python',
    rb: 'Ruby',
    go: 'Go',
    rs: 'Rust',
    java: 'Java',
    kt: 'Kotlin',
    swift: 'Swift',
    c: 'C',
    cpp: 'C++',
    cc: 'C++',
    cxx: 'C++',
    h: 'C/C++',
    hpp: 'C++',
    cs: 'C#',
    php: 'PHP',
    scala: 'Scala',
    md: 'Markdown',
    mdx: 'Markdown',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    toml: 'TOML',
    xml: 'XML',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'Sass',
    less: 'Less',
    sql: 'SQL',
    sh: 'Shell',
    bash: 'Shell',
    zsh: 'Shell',
    fish: 'Shell',
    ps1: 'PowerShell',
    dockerfile: 'Docker',
    vue: 'Vue',
    svelte: 'Svelte',
  };

  return langMap[ext.toLowerCase()] ?? ext.toUpperCase();
}

/**
 * Categorize file by role (source, test, docs, config)
 */
export function categorizeFileRole(relativePath: string, ext: string): 'source' | 'test' | 'docs' | 'config' {
  const pathLower = relativePath.toLowerCase();
  const extLower = ext.toLowerCase();

  // Test files
  if (
    pathLower.includes('test') ||
    pathLower.includes('spec') ||
    pathLower.includes('__tests__') ||
    pathLower.endsWith('.test.ts') ||
    pathLower.endsWith('.test.js') ||
    pathLower.endsWith('.spec.ts') ||
    pathLower.endsWith('.spec.js') ||
    pathLower.endsWith('_test.go') ||
    pathLower.endsWith('_test.py')
  ) {
    return 'test';
  }

  // Documentation
  if (
    extLower === 'md' ||
    extLower === 'mdx' ||
    extLower === 'txt' ||
    extLower === 'rst' ||
    pathLower.includes('doc') ||
    pathLower.includes('readme') ||
    pathLower.includes('changelog') ||
    pathLower.includes('license')
  ) {
    return 'docs';
  }

  // Configuration files
  if (
    extLower === 'json' ||
    extLower === 'yaml' ||
    extLower === 'yml' ||
    extLower === 'toml' ||
    extLower === 'ini' ||
    extLower === 'cfg' ||
    pathLower.includes('config') ||
    pathLower.startsWith('.') ||
    pathLower.includes('package.json') ||
    pathLower.includes('tsconfig') ||
    pathLower.includes('eslint') ||
    pathLower.includes('prettier')
  ) {
    return 'config';
  }

  // Default to source code
  return 'source';
}

/**
 * Calculate language breakdown from scan result
 */
export interface LanguageBreakdown {
  name: string;
  percent: number;
  bytes: number;
}

export function calculateLanguageBreakdown(
  files: readonly { extension: string; sizeBytes: number }[]
): LanguageBreakdown[] {
  const langBytes: Record<string, number> = {};
  let totalBytes = 0;

  for (const file of files) {
    const lang = extensionToLanguage(file.extension);
    langBytes[lang] = (langBytes[lang] ?? 0) + file.sizeBytes;
    totalBytes += file.sizeBytes;
  }

  if (totalBytes === 0) {
    return [];
  }

  const breakdown = Object.entries(langBytes)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percent: (bytes / totalBytes) * 100,
    }))
    .sort((a, b) => b.percent - a.percent);

  // Group small percentages into "Other"
  const threshold = 3;
  const mainLanguages: LanguageBreakdown[] = [];
  let otherBytes = 0;

  for (const lang of breakdown) {
    if (lang.percent >= threshold) {
      mainLanguages.push(lang);
    } else {
      otherBytes += lang.bytes;
    }
  }

  if (otherBytes > 0) {
    mainLanguages.push({
      name: 'Other',
      bytes: otherBytes,
      percent: (otherBytes / totalBytes) * 100,
    });
  }

  return mainLanguages;
}

/**
 * Calculate role breakdown from scan result
 */
export interface RoleBreakdown {
  source: number;
  test: number;
  docs: number;
  config: number;
}

export function calculateRoleBreakdown(
  files: readonly { relativePath: string; extension: string; sizeBytes: number }[]
): RoleBreakdown {
  const roleBytes: RoleBreakdown = { source: 0, test: 0, docs: 0, config: 0 };
  let totalBytes = 0;

  for (const file of files) {
    const role = categorizeFileRole(file.relativePath, file.extension);
    roleBytes[role] += file.sizeBytes;
    totalBytes += file.sizeBytes;
  }

  if (totalBytes === 0) {
    return { source: 0, test: 0, docs: 0, config: 0 };
  }

  return {
    source: (roleBytes.source / totalBytes) * 100,
    test: (roleBytes.test / totalBytes) * 100,
    docs: (roleBytes.docs / totalBytes) * 100,
    config: (roleBytes.config / totalBytes) * 100,
  };
}

/**
 * Calculate top directories by size
 */
export interface DirectorySize {
  path: string;
  percent: number;
}

export function calculateTopDirectories(
  files: readonly { relativePath: string; sizeBytes: number }[],
  maxDirs = 4
): DirectorySize[] {
  const dirBytes: Record<string, number> = {};
  let totalBytes = 0;

  for (const file of files) {
    // Get top-level directory
    const parts = file.relativePath.split('/');
    let dirPath = '.';

    if (parts.length > 1) {
      // Use first directory, or first two if it's src/something
      if (parts[0] === 'src' && parts.length > 2) {
        dirPath = `${parts[0]}/${parts[1]}/`;
      } else {
        dirPath = `${parts[0]}/`;
      }
    }

    dirBytes[dirPath] = (dirBytes[dirPath] ?? 0) + file.sizeBytes;
    totalBytes += file.sizeBytes;
  }

  if (totalBytes === 0) {
    return [];
  }

  return Object.entries(dirBytes)
    .map(([path, bytes]) => ({
      path,
      percent: (bytes / totalBytes) * 100,
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, maxDirs);
}

/**
 * Count lines of code (rough estimate based on file size)
 * Average line is ~40-50 characters for code
 */
export function estimateLinesOfCode(totalBytes: number): number {
  const avgBytesPerLine = 45;
  return Math.round(totalBytes / avgBytesPerLine);
}
