import { describe, it, expect } from 'vitest';
import { resolveOptions } from './config.js';
import type { CliOptions, OutputFormat } from './types.js';

describe('config', () => {
  describe('resolveOptions', () => {
    describe('output file naming based on format', () => {
      it('should generate smart filename with project name and date', () => {
        const cliOptions: CliOptions = {
          root: '.',
        };
        const resolved = resolveOptions(cliOptions, undefined);
        // Smart naming: {project}-{date}.{ext}
        // Since we're in "." directory, it uses the directory name
        expect(resolved.outFile).toMatch(/^[\w-]+-\d{4}-\d{2}-\d{2}\.md$/);
        expect(resolved.format).toBe('md');
      });

      it('should use correct extension for json format', () => {
        const cliOptions: CliOptions = {
          root: '.',
          format: 'json' as OutputFormat,
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.outFile).toMatch(/\.json$/);
        expect(resolved.format).toBe('json');
      });

      it('should use correct extension for yaml format', () => {
        const cliOptions: CliOptions = {
          root: '.',
          format: 'yaml' as OutputFormat,
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.outFile).toMatch(/\.yaml$/);
        expect(resolved.format).toBe('yaml');
      });

      it('should use correct extension for txt format', () => {
        const cliOptions: CliOptions = {
          root: '.',
          format: 'txt' as OutputFormat,
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.outFile).toMatch(/\.txt$/);
        expect(resolved.format).toBe('txt');
      });

      it('should respect explicit out parameter regardless of format', () => {
        const cliOptions: CliOptions = {
          root: '.',
          format: 'yaml' as OutputFormat,
          out: 'custom-output.md',
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.outFile).toBe('custom-output.md');
        expect(resolved.format).toBe('yaml');
      });

      it('should allow custom output file with matching extension', () => {
        const cliOptions: CliOptions = {
          root: '.',
          format: 'json' as OutputFormat,
          out: 'my-custom-file.json',
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.outFile).toBe('my-custom-file.json');
        expect(resolved.format).toBe('json');
      });

      it('should default to md format when no format is specified', () => {
        const cliOptions: CliOptions = {
          root: '.',
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.format).toBe('md');
        expect(resolved.outFile).toMatch(/\.md$/);
      });

      it('should support custom output template', () => {
        const cliOptions: CliOptions = {
          root: '.',
          outTemplate: '{project}-context-{date}.{ext}',
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.outFile).toMatch(/-context-\d{4}-\d{2}-\d{2}\.md$/);
      });

      it('should include profile in filename for non-default profiles', () => {
        const cliOptions: CliOptions = {
          root: '.',
          profile: 'minimal',
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.outFile).toContain('-minimal-');
      });
    });

    describe('format option resolution', () => {
      it('should prioritize CLI format over config', () => {
        const cliOptions: CliOptions = {
          root: '.',
          format: 'yaml' as OutputFormat,
        };
        const config = {
          root: '.',
          presets: {
            default: {
              // Presets don't include format, but this tests the flow
            },
          },
        };
        const resolved = resolveOptions(cliOptions, config);
        expect(resolved.format).toBe('yaml');
        expect(resolved.outFile).toMatch(/\.yaml$/);
      });
    });

    describe('token counting options', () => {
      it('should enable token counting by default', () => {
        const cliOptions: CliOptions = {
          root: '.',
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.tokenCount).toBe(true);
      });

      it('should respect CLI token count disable', () => {
        const cliOptions: CliOptions = {
          root: '.',
          tokenCount: false,
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.tokenCount).toBe(false);
      });

      it('should set target provider from CLI', () => {
        const cliOptions: CliOptions = {
          root: '.',
          target: 'claude-sonnet',
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.targetProvider).toBe('claude-sonnet');
      });

      it('should set warn tokens threshold', () => {
        const cliOptions: CliOptions = {
          root: '.',
          warnTokens: 100000,
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.warnTokens).toBe(100000);
      });
    });

    describe('DX improvements - yes flag', () => {
      it('should default yes to false', () => {
        const cliOptions: CliOptions = {
          root: '.',
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.yes).toBe(false);
      });

      it('should respect CLI yes flag', () => {
        const cliOptions: CliOptions = {
          root: '.',
          yes: true,
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.yes).toBe(true);
      });

      it('should not affect other options when yes is set', () => {
        const cliOptions: CliOptions = {
          root: '.',
          yes: true,
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.yes).toBe(true);
        // Other defaults should remain unchanged
        expect(resolved.stripComments).toBe(false);
        expect(resolved.withTree).toBe(true);
        expect(resolved.withStats).toBe(true);
      });
    });
  });
});
