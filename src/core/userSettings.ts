import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { FilterPresetId } from './filterPresets.js';
import type {
  DatePosition,
  DateFormat,
  FilenameStrategy,
  TruncationPattern,
  PathSeparatorStyle,
} from './env.js';

export interface DisplaySettings {
  showGenerationSummary?: boolean;
  showCodeComposition?: boolean;
  showContextFit?: boolean;
  showHealthHints?: boolean;
  showTokenWarnings?: boolean;
  showCostEstimates?: boolean;
  showRecommendations?: boolean;
}

export interface FilenameGenerationSettings {
  strategy?: FilenameStrategy;
  includeDate?: boolean;
  datePosition?: DatePosition;
  dateFormat?: DateFormat;
  includeTime?: boolean;
  timeFormat?: '24h' | '12h' | 'timestamp';
  maxNestedFolders?: number;
  maxFolderPaths?: number;
  folderSeparator?: string;
  pathSeparator?: PathSeparatorStyle;
  truncationPattern?: TruncationPattern;
  showTruncationEllipsis?: boolean;
  includeProjectName?: boolean;
  includeProfile?: boolean;
  customTemplate?: string;
  // Advanced features
  includeGitContext?: boolean;
  includeTokenCount?: boolean;
  customLabel?: string;
  // Safety features
  enableWindowsSafeMode?: boolean;
  maxFilenameLength?: number;
  preventCollisions?: boolean;
}

export interface TreeViewState {
  expanded?: string[];  // Array of expanded directory paths
  selected?: string[];  // Array of selected file paths
  lastRoot?: string;    // Last root directory path for context (normalized)
}

export interface UserSettings {
  showExcludedFiles?: boolean;
  // DX improvements: Remember user preferences for interactive mode
  stripComments?: boolean;
  withTree?: boolean;
  withStats?: boolean;
  // Display preferences for CLI output
  displaySettings?: DisplaySettings;
  // Filename generation preferences
  filenameSettings?: FilenameGenerationSettings;
  // Tree view state persistence (consolidated - replaces lastSelectedFiles)
  treeViewState?: TreeViewState;
  // Tree view filter presets (which file types to hide)
  treeViewFilters?: FilterPresetId[];
}

const CONFIG_DIR = join(homedir(), '.config', 'repo-roller');
const SETTINGS_FILE = join(CONFIG_DIR, 'settings.json');

// Lock to prevent concurrent writes that could corrupt the settings file
let saveInProgress: Promise<void> | null = null;

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
      // JSON is corrupted - warn user ONCE and backup the file
      const backupFile = `${SETTINGS_FILE}.backup-${Date.now()}`;
      try {
        await writeFile(backupFile, content, 'utf-8');
        console.warn(
          `WARNING: Settings file corrupted at ${SETTINGS_FILE}`
        );
        console.warn(
          `Corrupted file backed up to: ${backupFile}`
        );
        console.warn(
          `Error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`
        );
        console.warn('Resetting to defaults...\n');

        // Delete the corrupted file so it doesn't keep causing errors
        const { unlink } = await import('node:fs/promises');
        await unlink(SETTINGS_FILE);
      } catch {
        // Ignore backup/delete errors
      }
      return {};
    }
  } catch {
    // File doesn't exist - return empty settings (normal case)
    return {};
  }
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  // Wait for any in-progress save to complete to prevent concurrent writes
  if (saveInProgress) {
    await saveInProgress;
  }

  // Create a new save operation and store it
  const saveOperation = (async () => {
    await ensureConfigDir();
    const current = await loadUserSettings();

    // Deep merge for nested objects (displaySettings, filenameSettings, etc.)
    const merged: UserSettings = { ...current };

    for (const [key, value] of Object.entries(settings)) {
      if (value === undefined) {
        continue;
      }

      // Handle nested objects specially to preserve existing properties
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        key in merged &&
        typeof merged[key as keyof UserSettings] === 'object'
      ) {
        merged[key as keyof UserSettings] = {
          ...(merged[key as keyof UserSettings] as any),
          ...value,
        } as any;
      } else {
        merged[key as keyof UserSettings] = value as any;
      }
    }

    // Validate that merged settings can be serialized to valid JSON
    try {
      const json = JSON.stringify(merged, null, 2);
      // Additional validation: ensure the JSON can be parsed back
      JSON.parse(json);
      await writeFile(SETTINGS_FILE, json, 'utf-8');
    } catch (error) {
      console.error('ERROR: Failed to serialize settings to JSON:', error);
      console.error('Settings to save:', settings);
      console.error('Current settings:', current);
      console.error('Merged result:', merged);
      throw new Error(
        `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  })();

  saveInProgress = saveOperation;

  try {
    await saveOperation;
  } finally {
    // Clear the lock once this operation completes
    if (saveInProgress === saveOperation) {
      saveInProgress = null;
    }
  }
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

export const DEFAULT_FILENAME_SETTINGS: Required<FilenameGenerationSettings> = {
  strategy: 'smart',
  includeDate: true,
  datePosition: 'suffix',
  dateFormat: 'YYYY-MM-DD',
  includeTime: false,
  timeFormat: '24h',
  maxNestedFolders: 4,
  maxFolderPaths: 3,
  folderSeparator: '-',
  pathSeparator: 'dash',
  truncationPattern: '...',
  showTruncationEllipsis: true,
  includeProjectName: true,
  includeProfile: true,
  customTemplate: '',
  // Advanced features
  includeGitContext: true,
  includeTokenCount: false,
  customLabel: '',
  // Safety features
  enableWindowsSafeMode: true,
  maxFilenameLength: 250,
  preventCollisions: true,
};

export async function getFilenameSettings(): Promise<Required<FilenameGenerationSettings>> {
  const settings = await loadUserSettings();
  return {
    ...DEFAULT_FILENAME_SETTINGS,
    ...(settings.filenameSettings || {}),
  };
}

export async function setFilenameSetting<K extends keyof FilenameGenerationSettings>(
  key: K,
  value: FilenameGenerationSettings[K]
): Promise<void> {
  const current = await loadUserSettings();
  const updatedFilenameSettings = {
    ...(current.filenameSettings || {}),
    [key]: value,
  };
  await saveUserSettings({ filenameSettings: updatedFilenameSettings });
}

export async function resetFilenameSettings(): Promise<void> {
  const current = await loadUserSettings();
  // Remove filenameSettings entirely to use defaults
  const { filenameSettings: _, ...rest } = current;
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
 * Normalize a root path for consistent comparison across runs
 * - Resolves to absolute path
 * - Removes trailing slashes
 * - Resolves symlinks to their real paths
 */
function normalizeRootPath(root: string): string {
  try {
    // Resolve to absolute path and normalize (removes trailing slash, resolves ..)
    return resolve(root);
  } catch {
    // Fallback to basic normalization if resolve fails
    return root.replace(/\/+$/, '');
  }
}

/**
 * Get tree view state for a specific root directory
 * Returns empty state if root doesn't match or state is invalid
 */
export async function getTreeViewState(root: string): Promise<TreeViewState> {
  const settings = await loadUserSettings();
  const state = settings.treeViewState || {};

  // Normalize both paths for consistent comparison
  const normalizedRoot = normalizeRootPath(root);
  const normalizedLastRoot = state.lastRoot ? normalizeRootPath(state.lastRoot) : undefined;

  // Only return state if it matches the current root
  if (normalizedLastRoot === normalizedRoot) {
    return state;
  }

  return {};
}

/**
 * Save tree view state for a specific root directory
 * - Normalizes root path for consistent future lookups
 * - Stores expansion and selection state
 */
export async function setTreeViewState(root: string, expanded: string[], selected?: string[]): Promise<void> {
  const normalizedRoot = normalizeRootPath(root);
  await saveUserSettings({
    treeViewState: {
      expanded,
      selected,
      lastRoot: normalizedRoot,
    },
  });
}

/**
 * Get the last selected files for a specific root directory
 * This is a convenience wrapper around getTreeViewState for CLI use
 *
 * @deprecated Use getTreeViewState() instead for full state access
 */
export async function getLastSelectedFiles(root: string): Promise<string[]> {
  const state = await getTreeViewState(root);
  return state.selected || [];
}

/**
 * Save the last selected files for a specific root directory
 * This is a convenience wrapper around setTreeViewState for backward compatibility
 *
 * @deprecated Use setTreeViewState() instead for full control over tree state
 */
export async function setLastSelectedFiles(root: string, files: string[]): Promise<void> {
  // Get current tree state to preserve expansion state
  const currentState = await getTreeViewState(root);
  const expanded = currentState.expanded || ['.'];

  // Save with preserved expansion state
  await setTreeViewState(root, expanded, files);
}

/**
 * Get active tree view filter presets
 * Returns empty array if no filters are configured
 */
export async function getTreeViewFilters(): Promise<FilterPresetId[]> {
  const settings = await loadUserSettings();
  return settings.treeViewFilters || [];
}

/**
 * Set active tree view filter presets
 */
export async function setTreeViewFilters(presets: FilterPresetId[]): Promise<void> {
  await saveUserSettings({ treeViewFilters: presets });
}

/**
 * Toggle a specific filter preset on or off
 * Returns the updated list of active presets
 */
export async function toggleTreeViewFilter(presetId: FilterPresetId): Promise<FilterPresetId[]> {
  const current = await getTreeViewFilters();
  const updated = current.includes(presetId)
    ? current.filter(id => id !== presetId)
    : [...current, presetId];

  await setTreeViewFilters(updated);
  return updated;
}
