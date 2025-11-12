import { describe, it, expect } from 'vitest';
import { resolveOptions } from './config.js';
import type { CliOptions, OutputFormat } from './types.js';

describe('config', () => {
  describe('resolveOptions', () => {
    describe('output file naming based on format', () => {
      it('should use source_code.md when no format is specified', () => {
        const cliOptions: CliOptions = {
          root: '.',
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.outFile).toBe('source_code.md');
        expect(resolved.format).toBe('md');
      });

      it('should use source_code.json when format is json', () => {
        const cliOptions: CliOptions = {
          root: '.',
          format: 'json' as OutputFormat,
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.outFile).toBe('source_code.json');
        expect(resolved.format).toBe('json');
      });

      it('should use source_code.yaml when format is yaml', () => {
        const cliOptions: CliOptions = {
          root: '.',
          format: 'yaml' as OutputFormat,
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.outFile).toBe('source_code.yaml');
        expect(resolved.format).toBe('yaml');
      });

      it('should use source_code.txt when format is txt', () => {
        const cliOptions: CliOptions = {
          root: '.',
          format: 'txt' as OutputFormat,
        };
        const resolved = resolveOptions(cliOptions, undefined);
        expect(resolved.outFile).toBe('source_code.txt');
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
        expect(resolved.outFile).toBe('source_code.md');
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
        expect(resolved.outFile).toBe('source_code.yaml');
      });
    });
  });
});
