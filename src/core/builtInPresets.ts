import type { RollerPreset } from './types.js';

/**
 * Built-in presets that users can reference via --preset flag
 * without needing a config file
 */
export const BUILT_IN_PRESETS: Readonly<Record<string, RollerPreset>> = {
  /**
   * TypeScript files only
   */
  ts: {
    extensions: ['ts', 'tsx'],
    exclude: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx'],
    withTree: true,
    withStats: true,
  },

  /**
   * JavaScript files only
   */
  js: {
    extensions: ['js', 'jsx', 'mjs', 'cjs'],
    exclude: ['**/*.test.js', '**/*.spec.js', '**/*.test.jsx', '**/*.spec.jsx'],
    withTree: true,
    withStats: true,
  },

  /**
   * Documentation files only
   */
  docs: {
    extensions: ['md', 'mdx', 'txt'],
    withTree: true,
    withStats: false,
  },

  /**
   * All files (comprehensive)
   */
  full: {
    include: ['**/*'],
    withTree: true,
    withStats: true,
  },

  /**
   * Optimized for LLM consumption (Claude, GPT, etc.)
   */
  llm: {
    extensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'md', 'yaml', 'yml', 'json'],
    maxFileSizeBytes: 2 * 1024 * 1024, // 2MB
    stripComments: false, // LLMs benefit from comments
    withTree: true,
    withStats: true,
    sort: 'path',
  },

  /**
   * Minimal output (code only, no extras)
   */
  minimal: {
    extensions: ['ts', 'tsx', 'js', 'jsx'],
    stripComments: true,
    withTree: false,
    withStats: false,
    maxFileSizeBytes: 512 * 1024, // 512KB
  },

  /**
   * Python projects
   */
  python: {
    extensions: ['py', 'pyi'],
    exclude: ['**/*.pyc', '**/__pycache__/**', '**/*.test.py'],
    withTree: true,
    withStats: true,
  },

  /**
   * Go projects
   */
  go: {
    extensions: ['go'],
    exclude: ['**/*_test.go'],
    withTree: true,
    withStats: true,
  },

  /**
   * Rust projects
   */
  rust: {
    extensions: ['rs', 'toml'],
    exclude: ['**/target/**'],
    withTree: true,
    withStats: true,
  },
} as const;

/**
 * Get a built-in preset by name
 */
export function getBuiltInPreset(name: string): RollerPreset | undefined {
  return BUILT_IN_PRESETS[name];
}

/**
 * List all available built-in preset names
 */
export function listBuiltInPresets(): string[] {
  return Object.keys(BUILT_IN_PRESETS);
}

/**
 * Check if a preset name is a built-in preset
 */
export function isBuiltInPreset(name: string): boolean {
  return name in BUILT_IN_PRESETS;
}
