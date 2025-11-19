import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_PRESETS,
  getBuiltInPreset,
  listBuiltInPresets,
  isBuiltInPreset,
} from '../../src/core/builtInPresets.js';

describe('builtInPresets', () => {
  describe('BUILT_IN_PRESETS constant', () => {
    it('should contain all expected presets', () => {
      const presetNames = Object.keys(BUILT_IN_PRESETS);
      expect(presetNames).toContain('ts');
      expect(presetNames).toContain('js');
      expect(presetNames).toContain('docs');
      expect(presetNames).toContain('full');
      expect(presetNames).toContain('llm');
      expect(presetNames).toContain('minimal');
      expect(presetNames).toContain('python');
      expect(presetNames).toContain('go');
      expect(presetNames).toContain('rust');
    });

    it('should have exactly 9 presets', () => {
      expect(Object.keys(BUILT_IN_PRESETS)).toHaveLength(9);
    });
  });

  describe('TypeScript preset', () => {
    it('should have correct extensions', () => {
      expect(BUILT_IN_PRESETS.ts.extensions).toEqual(['ts', 'tsx']);
    });

    it('should exclude test files', () => {
      expect(BUILT_IN_PRESETS.ts.exclude).toContain('**/*.test.ts');
      expect(BUILT_IN_PRESETS.ts.exclude).toContain('**/*.spec.ts');
      expect(BUILT_IN_PRESETS.ts.exclude).toContain('**/*.test.tsx');
      expect(BUILT_IN_PRESETS.ts.exclude).toContain('**/*.spec.tsx');
    });

    it('should have tree and stats enabled', () => {
      expect(BUILT_IN_PRESETS.ts.withTree).toBe(true);
      expect(BUILT_IN_PRESETS.ts.withStats).toBe(true);
    });
  });

  describe('JavaScript preset', () => {
    it('should have correct extensions', () => {
      expect(BUILT_IN_PRESETS.js.extensions).toEqual(['js', 'jsx', 'mjs', 'cjs']);
    });

    it('should exclude test files', () => {
      expect(BUILT_IN_PRESETS.js.exclude).toContain('**/*.test.js');
      expect(BUILT_IN_PRESETS.js.exclude).toContain('**/*.spec.js');
      expect(BUILT_IN_PRESETS.js.exclude).toContain('**/*.test.jsx');
      expect(BUILT_IN_PRESETS.js.exclude).toContain('**/*.spec.jsx');
    });

    it('should have tree and stats enabled', () => {
      expect(BUILT_IN_PRESETS.js.withTree).toBe(true);
      expect(BUILT_IN_PRESETS.js.withStats).toBe(true);
    });
  });

  describe('docs preset', () => {
    it('should have correct extensions', () => {
      expect(BUILT_IN_PRESETS.docs.extensions).toEqual(['md', 'mdx', 'txt']);
    });

    it('should have tree enabled but stats disabled', () => {
      expect(BUILT_IN_PRESETS.docs.withTree).toBe(true);
      expect(BUILT_IN_PRESETS.docs.withStats).toBe(false);
    });
  });

  describe('full preset', () => {
    it('should include all files', () => {
      expect(BUILT_IN_PRESETS.full.include).toEqual(['**/*']);
    });

    it('should have tree and stats enabled', () => {
      expect(BUILT_IN_PRESETS.full.withTree).toBe(true);
      expect(BUILT_IN_PRESETS.full.withStats).toBe(true);
    });
  });

  describe('llm preset', () => {
    it('should have common code and doc extensions', () => {
      expect(BUILT_IN_PRESETS.llm.extensions).toContain('ts');
      expect(BUILT_IN_PRESETS.llm.extensions).toContain('tsx');
      expect(BUILT_IN_PRESETS.llm.extensions).toContain('js');
      expect(BUILT_IN_PRESETS.llm.extensions).toContain('jsx');
      expect(BUILT_IN_PRESETS.llm.extensions).toContain('py');
      expect(BUILT_IN_PRESETS.llm.extensions).toContain('md');
      expect(BUILT_IN_PRESETS.llm.extensions).toContain('yaml');
      expect(BUILT_IN_PRESETS.llm.extensions).toContain('yml');
      expect(BUILT_IN_PRESETS.llm.extensions).toContain('json');
    });

    it('should have 2MB max file size', () => {
      expect(BUILT_IN_PRESETS.llm.maxFileSizeBytes).toBe(2 * 1024 * 1024);
    });

    it('should preserve comments for LLMs', () => {
      expect(BUILT_IN_PRESETS.llm.stripComments).toBe(false);
    });

    it('should have tree and stats enabled', () => {
      expect(BUILT_IN_PRESETS.llm.withTree).toBe(true);
      expect(BUILT_IN_PRESETS.llm.withStats).toBe(true);
    });

    it('should sort by path', () => {
      expect(BUILT_IN_PRESETS.llm.sort).toBe('path');
    });
  });

  describe('minimal preset', () => {
    it('should have basic JS/TS extensions', () => {
      expect(BUILT_IN_PRESETS.minimal.extensions).toEqual(['ts', 'tsx', 'js', 'jsx']);
    });

    it('should strip comments', () => {
      expect(BUILT_IN_PRESETS.minimal.stripComments).toBe(true);
    });

    it('should disable tree and stats', () => {
      expect(BUILT_IN_PRESETS.minimal.withTree).toBe(false);
      expect(BUILT_IN_PRESETS.minimal.withStats).toBe(false);
    });

    it('should have 512KB max file size', () => {
      expect(BUILT_IN_PRESETS.minimal.maxFileSizeBytes).toBe(512 * 1024);
    });
  });

  describe('python preset', () => {
    it('should have Python extensions', () => {
      expect(BUILT_IN_PRESETS.python.extensions).toEqual(['py', 'pyi']);
    });

    it('should exclude Python artifacts', () => {
      expect(BUILT_IN_PRESETS.python.exclude).toContain('**/*.pyc');
      expect(BUILT_IN_PRESETS.python.exclude).toContain('**/__pycache__/**');
      expect(BUILT_IN_PRESETS.python.exclude).toContain('**/*.test.py');
    });

    it('should have tree and stats enabled', () => {
      expect(BUILT_IN_PRESETS.python.withTree).toBe(true);
      expect(BUILT_IN_PRESETS.python.withStats).toBe(true);
    });
  });

  describe('go preset', () => {
    it('should have Go extension', () => {
      expect(BUILT_IN_PRESETS.go.extensions).toEqual(['go']);
    });

    it('should exclude test files', () => {
      expect(BUILT_IN_PRESETS.go.exclude).toContain('**/*_test.go');
    });

    it('should have tree and stats enabled', () => {
      expect(BUILT_IN_PRESETS.go.withTree).toBe(true);
      expect(BUILT_IN_PRESETS.go.withStats).toBe(true);
    });
  });

  describe('rust preset', () => {
    it('should have Rust extensions', () => {
      expect(BUILT_IN_PRESETS.rust.extensions).toEqual(['rs', 'toml']);
    });

    it('should exclude target directory', () => {
      expect(BUILT_IN_PRESETS.rust.exclude).toContain('**/target/**');
    });

    it('should have tree and stats enabled', () => {
      expect(BUILT_IN_PRESETS.rust.withTree).toBe(true);
      expect(BUILT_IN_PRESETS.rust.withStats).toBe(true);
    });
  });

  describe('getBuiltInPreset()', () => {
    it('should return TypeScript preset', () => {
      const preset = getBuiltInPreset('ts');
      expect(preset).toBeDefined();
      expect(preset?.extensions).toEqual(['ts', 'tsx']);
    });

    it('should return JavaScript preset', () => {
      const preset = getBuiltInPreset('js');
      expect(preset).toBeDefined();
      expect(preset?.extensions).toEqual(['js', 'jsx', 'mjs', 'cjs']);
    });

    it('should return docs preset', () => {
      const preset = getBuiltInPreset('docs');
      expect(preset).toBeDefined();
      expect(preset?.extensions).toEqual(['md', 'mdx', 'txt']);
    });

    it('should return full preset', () => {
      const preset = getBuiltInPreset('full');
      expect(preset).toBeDefined();
      expect(preset?.include).toEqual(['**/*']);
    });

    it('should return llm preset', () => {
      const preset = getBuiltInPreset('llm');
      expect(preset).toBeDefined();
      expect(preset?.extensions).toContain('ts');
      expect(preset?.extensions).toContain('py');
    });

    it('should return minimal preset', () => {
      const preset = getBuiltInPreset('minimal');
      expect(preset).toBeDefined();
      expect(preset?.stripComments).toBe(true);
    });

    it('should return python preset', () => {
      const preset = getBuiltInPreset('python');
      expect(preset).toBeDefined();
      expect(preset?.extensions).toEqual(['py', 'pyi']);
    });

    it('should return go preset', () => {
      const preset = getBuiltInPreset('go');
      expect(preset).toBeDefined();
      expect(preset?.extensions).toEqual(['go']);
    });

    it('should return rust preset', () => {
      const preset = getBuiltInPreset('rust');
      expect(preset).toBeDefined();
      expect(preset?.extensions).toEqual(['rs', 'toml']);
    });

    it('should return undefined for unknown preset', () => {
      const preset = getBuiltInPreset('nonexistent');
      expect(preset).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const preset = getBuiltInPreset('');
      expect(preset).toBeUndefined();
    });
  });

  describe('listBuiltInPresets()', () => {
    it('should return all preset names', () => {
      const names = listBuiltInPresets();
      expect(names).toHaveLength(9);
      expect(names).toContain('ts');
      expect(names).toContain('js');
      expect(names).toContain('docs');
      expect(names).toContain('full');
      expect(names).toContain('llm');
      expect(names).toContain('minimal');
      expect(names).toContain('python');
      expect(names).toContain('go');
      expect(names).toContain('rust');
    });

    it('should return array', () => {
      const names = listBuiltInPresets();
      expect(Array.isArray(names)).toBe(true);
    });
  });

  describe('isBuiltInPreset()', () => {
    it('should return true for TypeScript preset', () => {
      expect(isBuiltInPreset('ts')).toBe(true);
    });

    it('should return true for JavaScript preset', () => {
      expect(isBuiltInPreset('js')).toBe(true);
    });

    it('should return true for docs preset', () => {
      expect(isBuiltInPreset('docs')).toBe(true);
    });

    it('should return true for full preset', () => {
      expect(isBuiltInPreset('full')).toBe(true);
    });

    it('should return true for llm preset', () => {
      expect(isBuiltInPreset('llm')).toBe(true);
    });

    it('should return true for minimal preset', () => {
      expect(isBuiltInPreset('minimal')).toBe(true);
    });

    it('should return true for python preset', () => {
      expect(isBuiltInPreset('python')).toBe(true);
    });

    it('should return true for go preset', () => {
      expect(isBuiltInPreset('go')).toBe(true);
    });

    it('should return true for rust preset', () => {
      expect(isBuiltInPreset('rust')).toBe(true);
    });

    it('should return false for unknown preset', () => {
      expect(isBuiltInPreset('nonexistent')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isBuiltInPreset('')).toBe(false);
    });

    it('should return false for case-sensitive mismatch', () => {
      expect(isBuiltInPreset('TS')).toBe(false);
      expect(isBuiltInPreset('TypeScript')).toBe(false);
    });
  });

  describe('preset structure validation', () => {
    it('should have all presets with valid structure', () => {
      for (const [name, preset] of Object.entries(BUILT_IN_PRESETS)) {
        expect(preset).toBeDefined();
        expect(typeof preset).toBe('object');

        // At least one of extensions or include should be defined
        const hasExtensions = preset.extensions !== undefined;
        const hasInclude = preset.include !== undefined;
        expect(hasExtensions || hasInclude).toBe(true);

        // If extensions is defined, it should be an array
        if (preset.extensions) {
          expect(Array.isArray(preset.extensions)).toBe(true);
          expect(preset.extensions.length).toBeGreaterThan(0);
        }

        // If exclude is defined, it should be an array
        if (preset.exclude) {
          expect(Array.isArray(preset.exclude)).toBe(true);
        }

        // If include is defined, it should be an array
        if (preset.include) {
          expect(Array.isArray(preset.include)).toBe(true);
        }
      }
    });
  });
});
