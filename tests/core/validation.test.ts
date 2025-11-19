import { describe, it, expect } from 'vitest';
import {
  validateRollerConfig,
  validateRepoRollerYml,
  validateCliOptions,
  formatValidationErrors,
} from '../../src/core/validation.js';
import type { RollerConfig, RepoRollerYmlConfig } from '../../src/core/types.js';

describe('Configuration Validation', () => {
  describe('validateRollerConfig', () => {
    it('should pass valid config', () => {
      const config: RollerConfig = {
        root: '.',
        presets: {
          typescript: {
            extensions: ['ts', 'tsx'],
            stripComments: false,
            withTree: true,
            withStats: true,
          },
        },
        defaultPreset: 'typescript',
      };

      const result = validateRollerConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid extension format with dot', () => {
      const config: RollerConfig = {
        root: '.',
        presets: {
          bad: {
            extensions: ['.ts', '.tsx'],
          },
        },
      };

      const result = validateRollerConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]!.message).toContain('should not start with a dot');
    });

    it('should detect glob patterns in extensions', () => {
      const config: RollerConfig = {
        root: '.',
        presets: {
          bad: {
            extensions: ['*.ts'],
          },
        },
      };

      const result = validateRollerConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('invalid characters');
    });

    it('should detect invalid sort mode', () => {
      const config: RollerConfig = {
        root: '.',
        presets: {
          bad: {
            sort: 'invalid' as never,
          },
        },
      };

      const result = validateRollerConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('Invalid sort mode');
    });

    it('should detect missing default preset', () => {
      const config: RollerConfig = {
        root: '.',
        presets: {
          typescript: {
            extensions: ['ts'],
          },
        },
        defaultPreset: 'nonexistent',
      };

      const result = validateRollerConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('is not defined in presets');
    });

    it('should detect conflicting include/exclude patterns', () => {
      const config: RollerConfig = {
        root: '.',
        presets: {
          bad: {
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.ts'],
          },
        },
      };

      const result = validateRollerConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('both include and exclude');
    });

    it('should warn about unusually large max file size', () => {
      const config: RollerConfig = {
        root: '.',
        presets: {
          large: {
            maxFileSizeBytes: 200 * 1024 * 1024, // 200MB
          },
        },
      };

      const result = validateRollerConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('unusually large');
    });
  });

  describe('validateRepoRollerYml', () => {
    it('should pass valid config', () => {
      const config: RepoRollerYmlConfig = {
        architectural_overview: 'This is my project',
        profiles: {
          'llm-context': {
            layout: ['README.md', 'src/**/*.ts'],
          },
        },
      };

      const result = validateRepoRollerYml(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty profile layout', () => {
      const config: RepoRollerYmlConfig = {
        profiles: {
          empty: {
            layout: [],
          },
        },
      };

      const result = validateRepoRollerYml(config);
      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('empty layout array');
    });

    it('should warn when no profiles defined', () => {
      const config: RepoRollerYmlConfig = {
        architectural_overview: 'Project',
      };

      const result = validateRepoRollerYml(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]!.message).toContain('No profiles defined');
    });
  });

  describe('validateCliOptions', () => {
    it('should pass valid options', () => {
      const result = validateCliOptions({
        ext: 'ts,tsx',
        maxSize: 500,
        format: 'md',
        target: 'claude-sonnet',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect glob in extensions', () => {
      const result = validateCliOptions({
        ext: '*.ts',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('glob patterns');
    });

    it('should warn about dots in extensions', () => {
      const result = validateCliOptions({
        ext: '.ts,.tsx',
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]!.message).toContain('should not include dots');
    });

    it('should detect invalid format', () => {
      const result = validateCliOptions({
        format: 'xml',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('Invalid format');
    });

    it('should warn about unknown provider', () => {
      const result = validateCliOptions({
        target: 'unknown-model',
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]!.message).toContain('Unknown provider');
    });

    it('should detect negative max size', () => {
      const result = validateCliOptions({
        maxSize: -10,
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]!.message).toContain('must be positive');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format valid config', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [],
      };

      const formatted = formatValidationErrors(result, 'test.yml');
      expect(formatted).toContain('✅');
      expect(formatted).toContain('is valid');
    });

    it('should format errors', () => {
      const result = {
        valid: false,
        errors: [
          {
            field: 'test.field',
            message: 'Test error',
            suggestion: 'Fix it',
          },
        ],
        warnings: [],
      };

      const formatted = formatValidationErrors(result, 'test.yml');
      expect(formatted).toContain('❌');
      expect(formatted).toContain('Test error');
      expect(formatted).toContain('Fix it');
    });

    it('should format warnings', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [
          {
            field: 'test.field',
            message: 'Test warning',
            suggestion: 'Consider fixing',
          },
        ],
      };

      const formatted = formatValidationErrors(result, 'test.yml');
      expect(formatted).toContain('⚠️');
      expect(formatted).toContain('Test warning');
    });
  });
});
