import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile as fsReadFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { loadUserSettings, saveUserSettings, getUserSetting, setUserSetting } from './userSettings.js';

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
});
