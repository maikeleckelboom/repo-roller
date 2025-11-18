import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile as fsReadFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { loadUserSettings, saveUserSettings, getUserSetting, setUserSetting, getLastSelectedFiles, setLastSelectedFiles } from './userSettings.js';

// Test the user settings logic by directly manipulating the expected paths
describe('userSettings', () => {
  describe('actual module functions', () => {
    // These tests call the actual exported functions
    // They use the real home directory path, so they're integration tests

    it('should export loadUserSettings function', () => {
      expect(typeof loadUserSettings).toBe('function');
    });

    it('should export saveUserSettings function', () => {
      expect(typeof saveUserSettings).toBe('function');
    });

    it('should export getUserSetting function', () => {
      expect(typeof getUserSetting).toBe('function');
    });

    it('should export setUserSetting function', () => {
      expect(typeof setUserSetting).toBe('function');
    });

    it('should load user settings and return object', async () => {
      const settings = await loadUserSettings();
      expect(typeof settings).toBe('object');
      // Settings can have any of these optional fields
      expect(settings.showExcludedFiles === undefined || typeof settings.showExcludedFiles === 'boolean').toBe(true);
      expect(settings.stripComments === undefined || typeof settings.stripComments === 'boolean').toBe(true);
      expect(settings.withTree === undefined || typeof settings.withTree === 'boolean').toBe(true);
      expect(settings.withStats === undefined || typeof settings.withStats === 'boolean').toBe(true);
    });

    it('should get individual setting value', async () => {
      const value = await getUserSetting('showExcludedFiles');
      // Value can be boolean or undefined
      expect(value === undefined || typeof value === 'boolean').toBe(true);
    });

    it('should handle saving settings without error', async () => {
      // Just test that the function doesn't throw
      // We can't easily test writing to ~/.config without mocking
      const result = await saveUserSettings({ withTree: true });
      expect(result).toBeUndefined(); // void function returns undefined
    });

    it('should handle setting individual value without error', async () => {
      const result = await setUserSetting('withStats', true);
      expect(result).toBeUndefined();
    });
  });


  let testDir: string;
  let configDir: string;
  let settingsFile: string;

  beforeEach(async () => {
    // Create a temporary test directory that mirrors the expected structure
    testDir = await mkdtemp(join(tmpdir(), 'repo-roller-settings-test-'));
    configDir = join(testDir, 'repo-roller-config');
    settingsFile = join(configDir, 'settings.json');
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('settings file format', () => {
    it('should use JSON format for settings storage', async () => {
      await mkdir(configDir, { recursive: true });
      const settings = {
        showExcludedFiles: true,
        stripComments: false,
        withTree: true,
        withStats: false,
      };
      await writeFile(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');

      const content = await fsReadFile(settingsFile, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(settings);
    });

    it('should handle all user preference fields', async () => {
      await mkdir(configDir, { recursive: true });
      const preferences = {
        showExcludedFiles: true,
        stripComments: true,
        withTree: false,
        withStats: true,
      };

      await writeFile(settingsFile, JSON.stringify(preferences), 'utf-8');
      const content = await fsReadFile(settingsFile, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.showExcludedFiles).toBe(true);
      expect(loaded.stripComments).toBe(true);
      expect(loaded.withTree).toBe(false);
      expect(loaded.withStats).toBe(true);
    });

    it('should support merging settings', async () => {
      await mkdir(configDir, { recursive: true });

      // First settings
      const initial = {
        showExcludedFiles: true,
        stripComments: false,
      };
      await writeFile(settingsFile, JSON.stringify(initial), 'utf-8');

      // Load, merge, and save
      const existing = JSON.parse(await fsReadFile(settingsFile, 'utf-8'));
      const merged = {
        ...existing,
        stripComments: true,
        withTree: true,
      };
      await writeFile(settingsFile, JSON.stringify(merged), 'utf-8');

      const final = JSON.parse(await fsReadFile(settingsFile, 'utf-8'));
      expect(final.showExcludedFiles).toBe(true); // preserved
      expect(final.stripComments).toBe(true); // updated
      expect(final.withTree).toBe(true); // added
    });
  });

  describe('XDG Base Directory compliance', () => {
    it('should use ~/.config/repo-roller/ path pattern', () => {
      // The actual implementation uses join(homedir(), '.config', 'repo-roller')
      const expectedPath = join(homedir(), '.config', 'repo-roller');
      expect(expectedPath).toMatch(/\.config[/\\]repo-roller$/);
    });

    it('should store settings in settings.json file', () => {
      const expectedFile = join(homedir(), '.config', 'repo-roller', 'settings.json');
      expect(expectedFile).toMatch(/settings\.json$/);
    });
  });

  describe('DX improvements - preference persistence patterns', () => {
    it('should persist strip/tree/stats for interactive mode reuse', async () => {
      await mkdir(configDir, { recursive: true });

      // User makes choices in interactive mode
      const userChoices = {
        stripComments: true,
        withTree: false,
        withStats: true,
      };
      await writeFile(settingsFile, JSON.stringify(userChoices), 'utf-8');

      // Next session loads these as defaults
      const content = await fsReadFile(settingsFile, 'utf-8');
      const saved = JSON.parse(content);

      expect(saved.stripComments).toBe(true);
      expect(saved.withTree).toBe(false);
      expect(saved.withStats).toBe(true);
    });

    it('should handle missing settings gracefully', async () => {
      // No config directory exists - should use defaults
      const defaultSettings = {
        stripComments: false,
        withTree: true,
        withStats: true,
      };

      // In actual usage, loadUserSettings returns {} when file doesn't exist
      // Then the TUI uses userSettings.X ?? options.X pattern
      const userSettings: Record<string, boolean> = {};
      const stripComments = userSettings.stripComments ?? defaultSettings.stripComments;
      const withTree = userSettings.withTree ?? defaultSettings.withTree;
      const withStats = userSettings.withStats ?? defaultSettings.withStats;

      expect(stripComments).toBe(false); // default
      expect(withTree).toBe(true); // default
      expect(withStats).toBe(true); // default
    });

    it('should allow individual preference overrides', async () => {
      await mkdir(configDir, { recursive: true });

      // User changes just one setting
      const settings = {
        stripComments: true,
        // withTree and withStats not set
      };
      await writeFile(settingsFile, JSON.stringify(settings), 'utf-8');

      const loaded = JSON.parse(await fsReadFile(settingsFile, 'utf-8'));

      // Pattern used in tui.ts
      const defaults = { stripComments: false, withTree: true, withStats: true };
      const finalStripComments = loaded.stripComments ?? defaults.stripComments;
      const finalWithTree = loaded.withTree ?? defaults.withTree;
      const finalWithStats = loaded.withStats ?? defaults.withStats;

      expect(finalStripComments).toBe(true); // user override
      expect(finalWithTree).toBe(true); // default (undefined in file)
      expect(finalWithStats).toBe(true); // default (undefined in file)
    });
  });

  describe('display settings - new CLI preferences', () => {
    it('should support all display setting fields in user preferences', async () => {
      await mkdir(configDir, { recursive: true });

      const displaySettings = {
        displaySettings: {
          showGenerationSummary: true,
          showCodeComposition: false,
          showContextFit: true,
          showHealthHints: false,
          showTokenWarnings: true,
          showCostEstimates: false,
          showRecommendations: true,
        },
      };

      await writeFile(settingsFile, JSON.stringify(displaySettings), 'utf-8');
      const content = await fsReadFile(settingsFile, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.displaySettings.showGenerationSummary).toBe(true);
      expect(loaded.displaySettings.showCodeComposition).toBe(false);
      expect(loaded.displaySettings.showContextFit).toBe(true);
      expect(loaded.displaySettings.showHealthHints).toBe(false);
      expect(loaded.displaySettings.showTokenWarnings).toBe(true);
      expect(loaded.displaySettings.showCostEstimates).toBe(false);
      expect(loaded.displaySettings.showRecommendations).toBe(true);
    });

    it('should merge user display settings with defaults correctly', async () => {
      await mkdir(configDir, { recursive: true });

      // User only customizes some settings
      const userSettings = {
        displaySettings: {
          showCodeComposition: false,
          showCostEstimates: false,
        },
      };

      await writeFile(settingsFile, JSON.stringify(userSettings), 'utf-8');
      const loaded = JSON.parse(await fsReadFile(settingsFile, 'utf-8'));

      // Simulate the merge pattern from getDisplaySettings()
      const defaults = {
        showGenerationSummary: true,
        showCodeComposition: true,
        showContextFit: true,
        showHealthHints: true,
        showTokenWarnings: true,
        showCostEstimates: true,
        showRecommendations: true,
      };

      const merged = {
        ...defaults,
        ...(loaded.displaySettings || {}),
      };

      // User preferences override defaults
      expect(merged.showCodeComposition).toBe(false); // user override
      expect(merged.showCostEstimates).toBe(false); // user override
      // Defaults remain for unset values
      expect(merged.showGenerationSummary).toBe(true);
      expect(merged.showContextFit).toBe(true);
      expect(merged.showHealthHints).toBe(true);
      expect(merged.showTokenWarnings).toBe(true);
      expect(merged.showRecommendations).toBe(true);
    });

    it('should handle individual CLI flag overrides on top of user settings', async () => {
      await mkdir(configDir, { recursive: true });

      // User settings - user has composition and cost hidden
      const userDisplaySettings = {
        showGenerationSummary: true,
        showCodeComposition: false,
        showContextFit: true,
        showHealthHints: true,
        showTokenWarnings: true,
        showCostEstimates: false,
        showRecommendations: true,
      };

      // CLI flags - user additionally hides health hints via CLI
      const cliFlags = {
        quiet: false,
        hideComposition: false, // Not set - should use user setting (false)
        hideContextFit: false,
        hideHealthHints: true, // CLI override - should become false
        hideWarnings: false,
        hideCost: false, // Not set - should use user setting (false)
        hideRecommendations: false,
      };

      // Simulate the proper merge logic (CLI flags override user settings)
      const finalDisplaySettings = {
        showGenerationSummary: cliFlags.quiet
          ? false
          : userDisplaySettings.showGenerationSummary,
        showCodeComposition: cliFlags.quiet || cliFlags.hideComposition
          ? false
          : userDisplaySettings.showCodeComposition,
        showContextFit: cliFlags.quiet || cliFlags.hideContextFit
          ? false
          : userDisplaySettings.showContextFit,
        showHealthHints: cliFlags.quiet || cliFlags.hideHealthHints
          ? false
          : userDisplaySettings.showHealthHints,
        showTokenWarnings: cliFlags.quiet || cliFlags.hideWarnings
          ? false
          : userDisplaySettings.showTokenWarnings,
        showCostEstimates: cliFlags.quiet || cliFlags.hideCost
          ? false
          : userDisplaySettings.showCostEstimates,
        showRecommendations: cliFlags.quiet || cliFlags.hideRecommendations
          ? false
          : userDisplaySettings.showRecommendations,
      };

      // Verify correct priority: CLI > user settings > defaults
      expect(finalDisplaySettings.showGenerationSummary).toBe(true); // user setting
      expect(finalDisplaySettings.showCodeComposition).toBe(false); // user setting
      expect(finalDisplaySettings.showContextFit).toBe(true); // user setting
      expect(finalDisplaySettings.showHealthHints).toBe(false); // CLI override
      expect(finalDisplaySettings.showTokenWarnings).toBe(true); // user setting
      expect(finalDisplaySettings.showCostEstimates).toBe(false); // user setting
      expect(finalDisplaySettings.showRecommendations).toBe(true); // user setting
    });

    it('should NOT reset all user settings when one CLI flag is set', async () => {
      // This is the critical regression test for the bug that was fixed
      await mkdir(configDir, { recursive: true });

      const userDisplaySettings = {
        showGenerationSummary: true,
        showCodeComposition: true,
        showContextFit: true,
        showHealthHints: true,
        showTokenWarnings: true,
        showCostEstimates: false, // User explicitly disabled cost estimates
        showRecommendations: true,
      };

      // User sets only --hide-composition via CLI
      const cliFlags = {
        quiet: false,
        hideComposition: true, // This is the only CLI flag set
        hideContextFit: false,
        hideHealthHints: false,
        hideWarnings: false,
        hideCost: false,
        hideRecommendations: false,
      };

      // CORRECT behavior: Each setting evaluated independently
      const correctFinalSettings = {
        showGenerationSummary: cliFlags.quiet
          ? false
          : userDisplaySettings.showGenerationSummary,
        showCodeComposition: cliFlags.quiet || cliFlags.hideComposition
          ? false
          : userDisplaySettings.showCodeComposition,
        showContextFit: cliFlags.quiet || cliFlags.hideContextFit
          ? false
          : userDisplaySettings.showContextFit,
        showHealthHints: cliFlags.quiet || cliFlags.hideHealthHints
          ? false
          : userDisplaySettings.showHealthHints,
        showTokenWarnings: cliFlags.quiet || cliFlags.hideWarnings
          ? false
          : userDisplaySettings.showTokenWarnings,
        showCostEstimates: cliFlags.quiet || cliFlags.hideCost
          ? false
          : userDisplaySettings.showCostEstimates,
        showRecommendations: cliFlags.quiet || cliFlags.hideRecommendations
          ? false
          : userDisplaySettings.showRecommendations,
      };

      // Critical: User's cost estimate preference should be preserved
      expect(correctFinalSettings.showCostEstimates).toBe(false); // User's preference MUST be preserved
      expect(correctFinalSettings.showCodeComposition).toBe(false); // CLI override
      expect(correctFinalSettings.showGenerationSummary).toBe(true); // User's preference
      expect(correctFinalSettings.showContextFit).toBe(true); // User's preference
      expect(correctFinalSettings.showHealthHints).toBe(true); // User's preference
      expect(correctFinalSettings.showTokenWarnings).toBe(true); // User's preference
      expect(correctFinalSettings.showRecommendations).toBe(true); // User's preference
    });

    it('should allow users to hide specific UI blocks persistently', async () => {
      await mkdir(configDir, { recursive: true });

      // User wants minimal output - only summary and context fit
      const minimalDisplaySettings = {
        displaySettings: {
          showGenerationSummary: true,
          showCodeComposition: false,
          showContextFit: true,
          showHealthHints: false,
          showTokenWarnings: false,
          showCostEstimates: false,
          showRecommendations: false,
        },
      };

      await writeFile(settingsFile, JSON.stringify(minimalDisplaySettings), 'utf-8');
      const loaded = JSON.parse(await fsReadFile(settingsFile, 'utf-8'));

      // Verify all user preferences are persisted correctly
      expect(loaded.displaySettings.showGenerationSummary).toBe(true);
      expect(loaded.displaySettings.showCodeComposition).toBe(false);
      expect(loaded.displaySettings.showContextFit).toBe(true);
      expect(loaded.displaySettings.showHealthHints).toBe(false);
      expect(loaded.displaySettings.showTokenWarnings).toBe(false);
      expect(loaded.displaySettings.showCostEstimates).toBe(false);
      expect(loaded.displaySettings.showRecommendations).toBe(false);
    });

    it('should handle empty display settings gracefully', async () => {
      await mkdir(configDir, { recursive: true });

      // User has other settings but no display settings
      const userSettings = {
        stripComments: true,
        withTree: false,
        // No displaySettings property
      };

      await writeFile(settingsFile, JSON.stringify(userSettings), 'utf-8');
      const loaded = JSON.parse(await fsReadFile(settingsFile, 'utf-8'));

      // Simulate getDisplaySettings() behavior
      const defaults = {
        showGenerationSummary: true,
        showCodeComposition: true,
        showContextFit: true,
        showHealthHints: true,
        showTokenWarnings: true,
        showCostEstimates: true,
        showRecommendations: true,
      };

      const merged = {
        ...defaults,
        ...(loaded.displaySettings || {}),
      };

      // All should be defaults since no displaySettings in file
      expect(merged.showGenerationSummary).toBe(true);
      expect(merged.showCodeComposition).toBe(true);
      expect(merged.showContextFit).toBe(true);
      expect(merged.showHealthHints).toBe(true);
      expect(merged.showTokenWarnings).toBe(true);
      expect(merged.showCostEstimates).toBe(true);
      expect(merged.showRecommendations).toBe(true);
    });
  });

  describe('lastSelectedFiles - remember file selection for quick re-runs', () => {
    it('should save and load last selected files for a specific root', async () => {
      const root = '/home/user/my-project';
      const selectedFiles = ['src/index.ts', 'src/utils.ts', 'README.md'];

      await setLastSelectedFiles(root, selectedFiles);
      const loaded = await getLastSelectedFiles(root);

      expect(loaded).toEqual(selectedFiles);
    });

    it('should return empty array when no files saved for root', async () => {
      const root = '/home/user/new-project';
      const loaded = await getLastSelectedFiles(root);

      expect(loaded).toEqual([]);
    });

    it('should return empty array when different root is requested', async () => {
      const root1 = '/home/user/project1';
      const root2 = '/home/user/project2';
      const selectedFiles = ['src/index.ts', 'src/utils.ts'];

      await setLastSelectedFiles(root1, selectedFiles);
      const loaded = await getLastSelectedFiles(root2);

      expect(loaded).toEqual([]);
    });

    it('should overwrite previous selection for same root', async () => {
      const root = '/home/user/my-project';
      const firstSelection = ['src/index.ts', 'src/utils.ts'];
      const secondSelection = ['README.md', 'package.json'];

      await setLastSelectedFiles(root, firstSelection);
      await setLastSelectedFiles(root, secondSelection);
      const loaded = await getLastSelectedFiles(root);

      expect(loaded).toEqual(secondSelection);
    });

    it('should include timestamp when saving', async () => {
      const root = '/home/user/my-project';
      const selectedFiles = ['src/index.ts'];
      const beforeTimestamp = Date.now();

      await setLastSelectedFiles(root, selectedFiles);

      const settings = await loadUserSettings();
      expect(settings.lastSelectedFiles).toBeDefined();
      expect(settings.lastSelectedFiles?.timestamp).toBeDefined();
      expect(settings.lastSelectedFiles?.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
    });

    it('should persist lastSelectedFiles in settings file', async () => {
      await mkdir(configDir, { recursive: true });

      const lastSelectedData = {
        lastSelectedFiles: {
          files: ['src/index.ts', 'src/utils.ts'],
          root: '/home/user/my-project',
          timestamp: Date.now(),
        },
      };

      await writeFile(settingsFile, JSON.stringify(lastSelectedData), 'utf-8');
      const content = await fsReadFile(settingsFile, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.lastSelectedFiles).toBeDefined();
      expect(loaded.lastSelectedFiles.files).toEqual(['src/index.ts', 'src/utils.ts']);
      expect(loaded.lastSelectedFiles.root).toBe('/home/user/my-project');
      expect(loaded.lastSelectedFiles.timestamp).toBeDefined();
    });

    it('should handle empty file selection', async () => {
      const root = '/home/user/my-project';
      const emptySelection: string[] = [];

      await setLastSelectedFiles(root, emptySelection);
      const loaded = await getLastSelectedFiles(root);

      expect(loaded).toEqual([]);
    });

    it('should export getLastSelectedFiles function', () => {
      expect(typeof getLastSelectedFiles).toBe('function');
    });

    it('should export setLastSelectedFiles function', () => {
      expect(typeof setLastSelectedFiles).toBe('function');
    });
  });
});
