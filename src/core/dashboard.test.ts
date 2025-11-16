import { describe, it, expect } from 'vitest';
import { renderGenerationSummary, createRunDataRecord } from './dashboard.js';
import type { ScanResult, ResolvedOptions } from './types.js';
import { getModelPreset } from './modelPresets.js';

describe('Dashboard', () => {
  const createMockScan = (): ScanResult => ({
    files: [
      {
        absolutePath: '/project/src/index.ts',
        relativePath: 'src/index.ts',
        sizeBytes: 5000,
        extension: 'ts',
        isBinary: false,
        isDefaultIncluded: true,
      },
      {
        absolutePath: '/project/src/utils.ts',
        relativePath: 'src/utils.ts',
        sizeBytes: 3000,
        extension: 'ts',
        isBinary: false,
        isDefaultIncluded: true,
      },
      {
        absolutePath: '/project/README.md',
        relativePath: 'README.md',
        sizeBytes: 1000,
        extension: 'md',
        isBinary: false,
        isDefaultIncluded: true,
      },
    ],
    totalBytes: 9000,
    rootPath: '/project',
    extensionCounts: { ts: 2, md: 1 },
  });

  const createMockOptions = (): ResolvedOptions => ({
    root: '/project',
    outFile: 'output.md',
    include: [],
    exclude: [],
    extensions: [],
    maxFileSizeBytes: 1024 * 1024,
    stripComments: false,
    withTree: true,
    withStats: true,
    sort: 'path',
    interactive: false,
    verbose: false,
    profile: 'llm-context',
    format: 'md',
    dryRun: false,
    statsOnly: false,
    compact: false,
    indent: 2,
    toc: false,
    frontMatter: false,
    tokenCount: true,
    yes: false,
    showLLMReport: false,
    addOutlines: false,
    showPromptHelper: false,
  });

  describe('renderGenerationSummary', () => {
    it('should render compact mode summary', () => {
      const scan = createMockScan();
      const options = createMockOptions();
      const lines = renderGenerationSummary(
        { scan, options, estimatedTokens: 10000 },
        { mode: 'compact' }
      );

      expect(lines.length).toBeGreaterThan(0);

      // Check for core metrics
      const content = lines.join('\n');
      expect(content).toContain('Generation Summary');
      expect(content).toContain('Files selected');
      expect(content).toContain('Total size');
      expect(content).toContain('Lines of code');
      expect(content).toContain('Estimated tokens');
      expect(content).toContain('Output file');
    });

    it('should render detailed mode summary with options', () => {
      const scan = createMockScan();
      const options = createMockOptions();
      const lines = renderGenerationSummary(
        { scan, options, estimatedTokens: 10000 },
        { mode: 'detailed' }
      );

      const content = lines.join('\n');
      expect(content).toContain('Options');
      expect(content).toContain('Strip comments');
      expect(content).toContain('Directory tree view');
      expect(content).toContain('Statistics section');
    });

    it('should show model preset context fit', () => {
      const scan = createMockScan();
      const options = createMockOptions();
      const modelPreset = getModelPreset('claude-3.5-sonnet');

      const lines = renderGenerationSummary(
        { scan, options, estimatedTokens: 10000, modelPreset },
        { mode: 'compact' }
      );

      const content = lines.join('\n');
      expect(content).toContain('Context Fit');
      expect(content).toContain('Claude 3.5 Sonnet');
    });

    it('should show generic context fit without model preset', () => {
      const scan = createMockScan();
      const options = createMockOptions();

      const lines = renderGenerationSummary(
        { scan, options, estimatedTokens: 10000 },
        { mode: 'compact' }
      );

      const content = lines.join('\n');
      expect(content).toContain('Context Fit');
      expect(content).toContain('Tip: Use --model');
    });

    it('should show deltas when previous run data provided', () => {
      const scan = createMockScan();
      const options = createMockOptions();

      const previousRun = {
        fileCount: 2,
        totalBytes: 7000,
        estimatedTokens: 8000,
        timestamp: '2025-11-15T10:00:00Z',
      };

      const lines = renderGenerationSummary(
        { scan, options, estimatedTokens: 10000 },
        { mode: 'compact', previousRun }
      );

      const content = lines.join('\n');
      // Should show positive delta for files (3 - 2 = +1)
      expect(content).toContain('+');
    });

    it('should include code composition section', () => {
      const scan = createMockScan();
      const options = createMockOptions();

      const lines = renderGenerationSummary(
        { scan, options, estimatedTokens: 10000 },
        { mode: 'compact' }
      );

      const content = lines.join('\n');
      expect(content).toContain('Code Composition');
    });

    it('should generate health hints for large file counts', () => {
      const largeFiles = Array.from({ length: 150 }, (_, i) => ({
        absolutePath: `/project/src/file${i}.ts`,
        relativePath: `src/file${i}.ts`,
        sizeBytes: 1000,
        extension: 'ts',
        isBinary: false,
        isDefaultIncluded: true,
      }));

      const scan: ScanResult = {
        files: largeFiles,
        totalBytes: 150000,
        rootPath: '/project',
        extensionCounts: { ts: 150 },
      };

      const options = createMockOptions();
      const lines = renderGenerationSummary(
        { scan, options, estimatedTokens: 50000 },
        { mode: 'compact' }
      );

      const content = lines.join('\n');
      expect(content).toContain('Health Hints');
      expect(content).toContain('Large file count');
    });

    it('should warn on high token density', () => {
      const scan = createMockScan();
      // Modify to have high avg tokens per file
      const highDensityScan: ScanResult = {
        ...scan,
        files: [scan.files[0]!], // Just one file
        totalBytes: 50000,
      };

      const options = createMockOptions();
      const lines = renderGenerationSummary(
        { scan: highDensityScan, options, estimatedTokens: 25000 },
        { mode: 'compact' }
      );

      const content = lines.join('\n');
      expect(content).toContain('High avg tokens/file');
    });

    describe('display settings - conditional rendering', () => {
      it('should hide entire summary when showGenerationSummary is false', () => {
        const scan = createMockScan();
        const options = createMockOptions();
        const lines = renderGenerationSummary(
          { scan, options, estimatedTokens: 10000 },
          {
            mode: 'compact',
            displaySettings: {
              showGenerationSummary: false,
              showCodeComposition: true,
              showContextFit: true,
              showHealthHints: true,
              showTokenWarnings: true,
              showCostEstimates: true,
              showRecommendations: true,
            },
          }
        );

        // Should return empty or minimal output
        expect(lines.length).toBe(0);
      });

      it('should hide code composition when showCodeComposition is false', () => {
        const scan = createMockScan();
        const options = createMockOptions();
        const lines = renderGenerationSummary(
          { scan, options, estimatedTokens: 10000 },
          {
            mode: 'compact',
            displaySettings: {
              showGenerationSummary: true,
              showCodeComposition: false,
              showContextFit: true,
              showHealthHints: true,
              showTokenWarnings: true,
              showCostEstimates: true,
              showRecommendations: true,
            },
          }
        );

        const content = lines.join('\n');
        expect(content).not.toContain('Code Composition');
        // Should still have other sections
        expect(content).toContain('Generation Summary');
        expect(content).toContain('Context Fit');
      });

      it('should hide context fit when showContextFit is false', () => {
        const scan = createMockScan();
        const options = createMockOptions();
        const lines = renderGenerationSummary(
          { scan, options, estimatedTokens: 10000 },
          {
            mode: 'compact',
            displaySettings: {
              showGenerationSummary: true,
              showCodeComposition: true,
              showContextFit: false,
              showHealthHints: true,
              showTokenWarnings: true,
              showCostEstimates: true,
              showRecommendations: true,
            },
          }
        );

        const content = lines.join('\n');
        expect(content).not.toContain('Context Fit');
        // Should still have other sections
        expect(content).toContain('Generation Summary');
        expect(content).toContain('Code Composition');
      });

      it('should hide health hints when showHealthHints is false', () => {
        const largeFiles = Array.from({ length: 150 }, (_, i) => ({
          absolutePath: `/project/src/file${i}.ts`,
          relativePath: `src/file${i}.ts`,
          sizeBytes: 1000,
          extension: 'ts',
          isBinary: false,
          isDefaultIncluded: true,
        }));

        const scan: ScanResult = {
          files: largeFiles,
          totalBytes: 150000,
          rootPath: '/project',
          extensionCounts: { ts: 150 },
        };

        const options = createMockOptions();
        const lines = renderGenerationSummary(
          { scan, options, estimatedTokens: 50000 },
          {
            mode: 'compact',
            displaySettings: {
              showGenerationSummary: true,
              showCodeComposition: true,
              showContextFit: true,
              showHealthHints: false,
              showTokenWarnings: true,
              showCostEstimates: true,
              showRecommendations: true,
            },
          }
        );

        const content = lines.join('\n');
        // Should NOT show health hints even though they would normally appear
        expect(content).not.toContain('Health Hints');
      });

      it('should hide cost estimates when showCostEstimates is false', () => {
        const scan = createMockScan();
        const options = createMockOptions();
        const modelPreset = getModelPreset('claude-3.5-sonnet');

        const lines = renderGenerationSummary(
          { scan, options, estimatedTokens: 10000, modelPreset },
          {
            mode: 'compact',
            displaySettings: {
              showGenerationSummary: true,
              showCodeComposition: true,
              showContextFit: true,
              showHealthHints: true,
              showTokenWarnings: true,
              showCostEstimates: false,
              showRecommendations: true,
            },
          }
        );

        const content = lines.join('\n');
        // Should show context fit but not cost
        expect(content).toContain('Context Fit');
        expect(content).not.toContain('Cost:');
      });

      it('should show all sections with default display settings', () => {
        const scan = createMockScan();
        const options = createMockOptions();
        const lines = renderGenerationSummary(
          { scan, options, estimatedTokens: 10000 },
          {
            mode: 'compact',
            displaySettings: {
              showGenerationSummary: true,
              showCodeComposition: true,
              showContextFit: true,
              showHealthHints: true,
              showTokenWarnings: true,
              showCostEstimates: true,
              showRecommendations: true,
            },
          }
        );

        const content = lines.join('\n');
        expect(content).toContain('Generation Summary');
        expect(content).toContain('Code Composition');
        expect(content).toContain('Context Fit');
      });

      it('should allow hiding multiple sections independently', () => {
        const scan = createMockScan();
        const options = createMockOptions();
        const lines = renderGenerationSummary(
          { scan, options, estimatedTokens: 10000 },
          {
            mode: 'compact',
            displaySettings: {
              showGenerationSummary: true,
              showCodeComposition: false, // Hide composition
              showContextFit: false, // Hide context fit
              showHealthHints: true,
              showTokenWarnings: true,
              showCostEstimates: true,
              showRecommendations: true,
            },
          }
        );

        const content = lines.join('\n');
        // Should have summary but not composition or context fit
        expect(content).toContain('Generation Summary');
        expect(content).not.toContain('Code Composition');
        expect(content).not.toContain('Context Fit');
      });

      it('should use defaults when displaySettings not provided', () => {
        const scan = createMockScan();
        const options = createMockOptions();
        const lines = renderGenerationSummary(
          { scan, options, estimatedTokens: 10000 },
          { mode: 'compact' } // No displaySettings provided
        );

        const content = lines.join('\n');
        // Should show all sections by default
        expect(content).toContain('Generation Summary');
        expect(content).toContain('Code Composition');
        expect(content).toContain('Context Fit');
      });

      it('should render two-column layout in compact mode', () => {
        const scan = createMockScan();
        const options = createMockOptions();
        const lines = renderGenerationSummary(
          { scan, options, estimatedTokens: 10000 },
          { mode: 'compact' }
        );

        const content = lines.join('\n');
        // Compact mode should have the Code Composition section
        // which uses the two-column grid layout
        expect(content).toContain('Code Composition');
        // The grid layout includes multiple items per line (checking indentation pattern)
        const codeCompLines = lines.filter(l => l.includes('█') || l.includes('░'));
        // If we have items, they should be in grid format
        if (codeCompLines.length > 0) {
          // Grid items should have substantial indentation
          expect(codeCompLines.some(l => l.includes('    '))).toBe(true);
        }
      });
    });
  });

  describe('createRunDataRecord', () => {
    it('should create valid run data record', () => {
      const scan = createMockScan();
      const record = createRunDataRecord(scan, 10000, 'output.md');

      expect(record.fileCount).toBe(3);
      expect(record.totalBytes).toBe(9000);
      expect(record.estimatedTokens).toBe(10000);
      expect(record.outFile).toBe('output.md');
      expect(record.timestamp).toBeDefined();
    });

    it('should include ISO timestamp', () => {
      const scan = createMockScan();
      const record = createRunDataRecord(scan, 10000, 'output.md');

      // Should be valid ISO string
      const timestamp = new Date(record.timestamp);
      expect(timestamp.toISOString()).toBe(record.timestamp);
    });
  });
});
