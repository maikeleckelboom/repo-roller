import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatBytes,
  displayPresets,
  displayPresetDetails,
  displayProfiles,
  displayProfileDetails,
  displayExamples,
} from './helpers.js';
import type { RollerConfig, RepoRollerYmlConfig } from './types.js';

describe('helpers', () => {
  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes (< 1KB)', () => {
      // formatBytes keeps small values in bytes unit
      expect(formatBytes(512)).toBe('512.00 B');
      expect(formatBytes(100)).toBe('100.00 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(2048)).toBe('2.00 KB');
      expect(formatBytes(1536)).toBe('1.50 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.50 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should handle large numbers', () => {
      expect(formatBytes(10 * 1024 * 1024 * 1024)).toBe('10.00 GB');
    });
  });

  describe('displayPresets', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should display built-in presets', () => {
      displayPresets(undefined);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Available Presets');
      expect(output).toContain('Built-in');
      expect(output).toContain('Usage: repo-roller');
    });

    it('should display config presets when provided', () => {
      const config: RollerConfig = {
        root: '.',
        presets: {
          'custom-preset': {
            extensions: ['ts', 'tsx'],
          },
        },
      };

      displayPresets(config);

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('repo-roller.config');
      expect(output).toContain('custom-preset');
    });

    it('should list known built-in preset names', () => {
      displayPresets(undefined);

      const output = consoleSpy.mock.calls.flat().join('\n');
      // Should include some known built-in presets
      expect(output).toContain('ts');
      expect(output).toContain('python');
      expect(output).toContain('minimal');
    });
  });

  describe('displayPresetDetails', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should display details for built-in preset', () => {
      displayPresetDetails('ts', undefined);

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Preset: ts');
      expect(output).toContain('Extensions');
      expect(output).toContain('built-in');
    });

    it('should show error for non-existent preset', () => {
      displayPresetDetails('nonexistent', undefined);

      const errorOutput = consoleErrorSpy.mock.calls.flat().join('\n');
      expect(errorOutput).toContain('not found');
      expect(errorOutput).toContain('--list-presets');
    });

    it('should display details for config preset', () => {
      const config: RollerConfig = {
        root: '.',
        presets: {
          'my-preset': {
            extensions: ['custom'],
            stripComments: true,
            withTree: false,
            withStats: true,
            maxFileSizeBytes: 500 * 1024,
          },
        },
      };

      displayPresetDetails('my-preset', config);

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Preset: my-preset');
      expect(output).toContain('custom');
      expect(output).toContain('Strip comments: yes');
      expect(output).toContain('With tree: no');
      expect(output).toContain('With stats: yes');
    });

    it('should show max file size in MB', () => {
      const config: RollerConfig = {
        root: '.',
        presets: {
          'size-test': {
            maxFileSizeBytes: 2 * 1024 * 1024,
            stripComments: false,
            withTree: true,
            withStats: true,
          },
        },
      };

      displayPresetDetails('size-test', config);

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('2.00 MB');
    });
  });

  describe('displayProfiles', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should display built-in llm-context profile', () => {
      displayProfiles(undefined);

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Available Profiles');
      expect(output).toContain('llm-context');
      expect(output).toContain('default');
    });

    it('should display custom profiles from .reporoller.yml', () => {
      const config: RepoRollerYmlConfig = {
        profiles: {
          'api-docs': {
            layout: ['src/api/**/*.ts'],
          },
          'frontend': {
            layout: ['src/components/**/*.tsx'],
          },
        },
      };

      displayProfiles(config);

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('.reporoller.yml');
      expect(output).toContain('api-docs');
      expect(output).toContain('frontend');
    });

    it('should show hint when no custom profiles exist', () => {
      displayProfiles({});

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Create custom profiles');
      expect(output).toContain('.reporoller.yml');
    });

    it('should show usage instructions', () => {
      displayProfiles(undefined);

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Usage: repo-roller');
      expect(output).toContain('--profile');
    });
  });

  describe('displayProfileDetails', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should display details for default llm-context profile', () => {
      displayProfileDetails('llm-context', undefined);

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Profile: llm-context');
      expect(output).toContain('built-in');
    });

    it('should show error for non-existent profile', () => {
      displayProfileDetails('nonexistent', undefined);

      const errorOutput = consoleErrorSpy.mock.calls.flat().join('\n');
      expect(errorOutput).toContain('not found');
      expect(errorOutput).toContain('--list-profiles');
    });

    it('should display layout for custom profile', () => {
      const config: RepoRollerYmlConfig = {
        profiles: {
          'custom': {
            layout: ['src/index.ts', 'src/**/*.tsx', 'package.json'],
          },
        },
      };

      displayProfileDetails('custom', config);

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Profile: custom');
      expect(output).toContain('Layout order');
      expect(output).toContain('src/index.ts');
      expect(output).toContain('src/**/*.tsx');
      expect(output).toContain('package.json');
    });

    it('should number layout items', () => {
      const config: RepoRollerYmlConfig = {
        profiles: {
          'numbered': {
            layout: ['first.ts', 'second.ts', 'third.ts'],
          },
        },
      };

      displayProfileDetails('numbered', config);

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('1. first.ts');
      expect(output).toContain('2. second.ts');
      expect(output).toContain('3. third.ts');
    });
  });

  describe('displayExamples', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should display common workflows', () => {
      displayExamples();

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Common Workflows');
    });

    it('should include LLM context generation examples', () => {
      displayExamples();

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('LLM CONTEXT GENERATION');
      expect(output).toContain('--target claude-sonnet');
      expect(output).toContain('--dry-run');
    });

    it('should include quick filter examples', () => {
      displayExamples();

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('QUICK FILTERS');
      expect(output).toContain('--lang typescript');
      expect(output).toContain('--preset python');
      expect(output).toContain('--ext ts,tsx');
    });

    it('should include output customization examples', () => {
      displayExamples();

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('OUTPUT CUSTOMIZATION');
      expect(output).toContain('--format json');
      expect(output).toContain('--toc');
    });

    it('should include interactive mode examples', () => {
      displayExamples();

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('INTERACTIVE MODE');
      expect(output).toContain('--interactive');
    });

    it('should include info command examples', () => {
      displayExamples();

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('INFO COMMANDS');
      expect(output).toContain('--list-providers');
      expect(output).toContain('--list-presets');
      expect(output).toContain('--stats-only');
    });

    it('should use visual separators for sections', () => {
      displayExamples();

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('━━━━━');
    });
  });
});
