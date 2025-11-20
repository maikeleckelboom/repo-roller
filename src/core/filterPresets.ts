/**
 * Filter presets for controlling file visibility in tree view
 */

import { minimatch } from 'minimatch';

export type FilterPresetId =
  | 'config'
  | 'tests'
  | 'build'
  | 'locks'
  | 'docs'
  | 'types'
  | 'assets'
  | 'git';

export interface FilterPreset {
  id: FilterPresetId;
  name: string;
  description: string;
  patterns: string[];
  enabled: boolean;
}

/**
 * Default filter presets
 * Each preset defines glob patterns for files to hide when enabled
 */
export const DEFAULT_FILTER_PRESETS: Record<FilterPresetId, Omit<FilterPreset, 'enabled'>> = {
  config: {
    id: 'config',
    name: 'Config Files',
    description: 'Hide configuration files (.env, tsconfig.json, etc.)',
    patterns: [
      '.env*',
      '.editorconfig',
      '.prettierrc*',
      '.eslintrc*',
      '.stylelintrc*',
      'tsconfig*.json',
      'jsconfig*.json',
      'babel.config.*',
      '.babelrc*',
      'webpack.config.*',
      'vite.config.*',
      'rollup.config.*',
      'jest.config.*',
      'vitest.config.*',
      'playwright.config.*',
      'cypress.config.*',
      '.npmrc',
      '.yarnrc*',
      '.nvmrc',
      '.node-version',
      'nodemon.json',
      'turbo.json',
    ],
  },
  tests: {
    id: 'tests',
    name: 'Test Files',
    description: 'Hide test files and directories',
    patterns: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**',
      '**/__mocks__/**',
      '**/test/**',
      '**/tests/**',
      'cypress/**',
      'e2e/**',
    ],
  },
  build: {
    id: 'build',
    name: 'Build Artifacts',
    description: 'Hide build output and temporary files',
    patterns: [
      'dist/**',
      'build/**',
      'out/**',
      '.next/**',
      '.nuxt/**',
      '.output/**',
      '.vercel/**',
      '.netlify/**',
      'coverage/**',
      '.nyc_output/**',
      '*.log',
      'tmp/**',
      'temp/**',
      '.cache/**',
      '.parcel-cache/**',
      '.turbo/**',
    ],
  },
  locks: {
    id: 'locks',
    name: 'Lock Files',
    description: 'Hide package manager lock files',
    patterns: [
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'bun.lockb',
      'Gemfile.lock',
      'Cargo.lock',
      'poetry.lock',
      'composer.lock',
    ],
  },
  docs: {
    id: 'docs',
    name: 'Documentation',
    description: 'Hide documentation files',
    patterns: [
      '**/*.md',
      'docs/**',
      'documentation/**',
      'LICENSE*',
      'CHANGELOG*',
      'CONTRIBUTING*',
      'CODE_OF_CONDUCT*',
    ],
  },
  types: {
    id: 'types',
    name: 'Type Definitions',
    description: 'Hide TypeScript definition files',
    patterns: [
      '**/*.d.ts',
      '@types/**',
    ],
  },
  assets: {
    id: 'assets',
    name: 'Asset Files',
    description: 'Hide images, fonts, and media files',
    patterns: [
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
      '**/*.svg',
      '**/*.ico',
      '**/*.webp',
      '**/*.avif',
      '**/*.woff',
      '**/*.woff2',
      '**/*.ttf',
      '**/*.eot',
      '**/*.otf',
      '**/*.mp4',
      '**/*.webm',
      '**/*.mp3',
      '**/*.wav',
      '**/*.ogg',
    ],
  },
  git: {
    id: 'git',
    name: 'Git Files',
    description: 'Hide git-related files',
    patterns: [
      '.gitignore',
      '.gitattributes',
      '.gitmodules',
      '.github/**',
      '.gitlab/**',
    ],
  },
};

/**
 * Get all presets with their enabled state
 */
export function getPresets(enabledIds: FilterPresetId[] = []): FilterPreset[] {
  return Object.values(DEFAULT_FILTER_PRESETS).map(preset => ({
    ...preset,
    enabled: enabledIds.includes(preset.id),
  }));
}

/**
 * Get all patterns from enabled presets
 */
export function getActivePatterns(enabledIds: FilterPresetId[]): string[] {
  const patterns: string[] = [];

  for (const id of enabledIds) {
    const preset = DEFAULT_FILTER_PRESETS[id];
    if (preset) {
      patterns.push(...preset.patterns);
    }
  }

  return patterns;
}

/**
 * Check if a file path matches any of the preset patterns
 */
export function matchesPresetPatterns(
  filePath: string,
  enabledIds: FilterPresetId[]
): boolean {
  const patterns = getActivePatterns(enabledIds);

  if (patterns.length === 0) {
    return false;
  }

  return patterns.some(pattern => {
    return minimatch(filePath, pattern, {
      dot: true,
      matchBase: true,
    });
  });
}

/**
 * Default preset configuration (all disabled by default)
 */
export const DEFAULT_PRESET_CONFIG: FilterPresetId[] = [];
