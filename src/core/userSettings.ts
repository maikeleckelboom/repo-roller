import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

export interface DisplaySettings {
  showGenerationSummary?: boolean;
  showCodeComposition?: boolean;
  showContextFit?: boolean;
  showHealthHints?: boolean;
  showTokenWarnings?: boolean;
  showCostEstimates?: boolean;
  showRecommendations?: boolean;
}

export interface TreeViewState {
  expanded?: string[];  // Array of expanded directory paths
  selected?: string[];  // Array of selected file paths
  lastRoot?: string;    // Last root directory path for context
}

export interface LastSelectedFiles {
  files?: string[];     // Array of selected file paths
  root?: string;        // Root directory for the selection
  timestamp?: number;   // When the selection was made
}

export interface UserSettings {
  showExcludedFiles?: boolean;
  // DX improvements: Remember user preferences for interactive mode
  stripComments?: boolean;
  withTree?: boolean;
  withStats?: boolean;
  // Display preferences for CLI output
  displaySettings?: DisplaySettings;
  // Tree view state persistence
  treeViewState?: TreeViewState;
  // Last selected files for quick re-runs
  lastSelectedFiles?: LastSelectedFiles;
}

const CONFIG_DIR = join(homedir(), '.config', 'repo-roller');
const SETTINGS_FILE = join(CONFIG_DIR, 'settings.json');

async function ensureConfigDir(): Promise<void> {
  try {
    await mkdir(CONFIG_DIR, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

export async function loadUserSettings(): Promise<UserSettings> {
  try {
    const content = await readFile(SETTINGS_FILE, 'utf-8');
    try {
      return JSON.parse(content) as UserSettings;
    } catch (parseError) {
      // JSON is corrupted - warn user and return defaults
      console.warn(
        `WARNING: Settings file corrupted at ${SETTINGS_FILE}. Using defaults.`
      );
      console.warn(
        `Error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`
      );
      console.warn('');
      return {};
    }
  } catch {
    // File doesn't exist - return empty settings (normal case)
    return {};
  }
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  await ensureConfigDir();
  const current = await loadUserSettings();
  const merged = { ...current, ...settings };
  await writeFile(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
}

export async function getUserSetting<K extends keyof UserSettings>(
  key: K
): Promise<UserSettings[K]> {
  const settings = await loadUserSettings();
  return settings[key];
}

export async function setUserSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): Promise<void> {
  await saveUserSettings({ [key]: value });
}

export const DEFAULT_DISPLAY_SETTINGS: Required<DisplaySettings> = {
  showGenerationSummary: true,
  showCodeComposition: true,
  showContextFit: true,
  showHealthHints: true,
  showTokenWarnings: true,
  showCostEstimates: true,
  showRecommendations: true,
};

export async function getDisplaySettings(): Promise<Required<DisplaySettings>> {
  const settings = await loadUserSettings();
  return {
    ...DEFAULT_DISPLAY_SETTINGS,
    ...(settings.displaySettings || {}),
  };
}

export async function setDisplaySetting<K extends keyof DisplaySettings>(
  key: K,
  value: boolean
): Promise<void> {
  const current = await loadUserSettings();
  const updatedDisplaySettings = {
    ...(current.displaySettings || {}),
    [key]: value,
  };
  await saveUserSettings({ displaySettings: updatedDisplaySettings });
}

export async function resetDisplaySettings(): Promise<void> {
  const current = await loadUserSettings();
  // Remove displaySettings entirely to use defaults
  const { displaySettings: _, ...rest } = current;
  await ensureConfigDir();
  await writeFile(SETTINGS_FILE, JSON.stringify(rest, null, 2), 'utf-8');
}

export const DEFAULT_INTERACTIVE_SETTINGS = {
  stripComments: false,
  withTree: true,
  withStats: true,
};

export async function resetAllSettings(): Promise<void> {
  await ensureConfigDir();
  // Clear all settings by writing an empty object
  await writeFile(SETTINGS_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

export async function resetInteractiveSettings(): Promise<void> {
  const current = await loadUserSettings();
  // Remove interactive mode settings to use defaults
  const { stripComments: _, withTree: __, withStats: ___, ...rest } = current;
  await ensureConfigDir();
  await writeFile(SETTINGS_FILE, JSON.stringify(rest, null, 2), 'utf-8');
}

/**
 * Get tree view state for a specific root directory
 */
export async function getTreeViewState(root: string): Promise<TreeViewState> {
  const settings = await loadUserSettings();
  const state = settings.treeViewState || {};

  // Only return state if it matches the current root
  if (state.lastRoot === root) {
    return state;
  }

  return {};
}

/**
 * Save tree view state for a specific root directory
 */
export async function setTreeViewState(root: string, expanded: string[], selected?: string[]): Promise<void> {
  await saveUserSettings({
    treeViewState: {
      expanded,
      selected,
      lastRoot: root,
    },
  });
}

/**
 * Get the last selected files for a specific root directory
 */
export async function getLastSelectedFiles(root: string): Promise<string[]> {
  const settings = await loadUserSettings();
  const lastSelected = settings.lastSelectedFiles;

  // Only return files if they match the current root
  if (lastSelected?.root === root && lastSelected.files) {
    return lastSelected.files;
  }

  return [];
}

/**
 * Save the last selected files for a specific root directory
 */
export async function setLastSelectedFiles(root: string, files: string[]): Promise<void> {
  await saveUserSettings({
    lastSelectedFiles: {
      files,
      root,
      timestamp: Date.now(),
    },
  });
}
