/**
 * @module components/SettingsUI
 *
 * Interactive settings management UI component
 */

import React, { useReducer, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { DisplaySettings, UserSettings } from '../core/types.js';
import {
  loadUserSettings,
  saveUserSettings,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_INTERACTIVE_SETTINGS,
  getTreeViewFilters,
  setTreeViewFilters,
} from '../core/userSettings.js';
import { DEFAULT_FILTER_PRESETS, type FilterPresetId } from '../core/filterPresets.js';

interface SettingsUIProps {
  onComplete: () => void;
}

interface Setting {
  key: string;
  label: string;
  category: 'display' | 'interactive' | 'filter';
  value: boolean;
}

interface SettingsUIState {
  settings: Setting[];
  cursor: number;
  loading: boolean;
  saved: boolean;
}

type SettingsAction =
  | { type: 'SET_SETTINGS'; payload: Setting[] }
  | { type: 'TOGGLE_SETTING'; payload: number }
  | { type: 'MOVE_CURSOR_UP' }
  | { type: 'MOVE_CURSOR_DOWN'; payload: { maxIndex: number } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVED'; payload: boolean };

function settingsReducer(state: SettingsUIState, action: SettingsAction): SettingsUIState {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload, loading: false };

    case 'TOGGLE_SETTING': {
      const newSettings = [...state.settings];
      newSettings[action.payload].value = !newSettings[action.payload].value;
      return { ...state, settings: newSettings };
    }

    case 'MOVE_CURSOR_UP':
      return { ...state, cursor: Math.max(0, state.cursor - 1) };

    case 'MOVE_CURSOR_DOWN':
      return { ...state, cursor: Math.min(action.payload.maxIndex, state.cursor + 1) };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_SAVED':
      return { ...state, saved: action.payload };

    default:
      return state;
  }
}

const DISPLAY_SETTINGS_LABELS: Record<keyof DisplaySettings, string> = {
  showGenerationSummary: 'Show Generation Summary',
  showCodeComposition: 'Show Code Composition',
  showContextFit: 'Show Context Fit',
  showHealthHints: 'Show Health Hints',
  showTokenWarnings: 'Show Token Warnings',
  showCostEstimates: 'Show Cost Estimates',
  showRecommendations: 'Show Recommendations',
};

const INTERACTIVE_SETTINGS_LABELS: Record<string, string> = {
  stripComments: 'Strip Comments (Interactive Mode)',
  withTree: 'Include Tree (Interactive Mode)',
  withStats: 'Include Stats (Interactive Mode)',
  showExcludedFiles: 'Show Excluded Files in Tree',
};

export const SettingsUI: React.FC<SettingsUIProps> = ({ onComplete }) => {
  const [state, dispatch] = useReducer(settingsReducer, {
    settings: [],
    cursor: 0,
    loading: true,
    saved: false,
  });

  const { exit } = useApp();

  // Load settings on mount
  useEffect(() => {
    Promise.all([loadUserSettings(), getTreeViewFilters()]).then(([userSettings, activeFilterPresets]) => {
      const settings: Setting[] = [];

      // Display settings
      const displaySettings = { ...DEFAULT_DISPLAY_SETTINGS, ...(userSettings.displaySettings || {}) };
      for (const [key, label] of Object.entries(DISPLAY_SETTINGS_LABELS)) {
        settings.push({
          key,
          label,
          category: 'display',
          value: displaySettings[key as keyof DisplaySettings] ?? true,
        });
      }

      // Interactive settings
      settings.push({
        key: 'stripComments',
        label: INTERACTIVE_SETTINGS_LABELS.stripComments,
        category: 'interactive',
        value: userSettings.stripComments ?? DEFAULT_INTERACTIVE_SETTINGS.stripComments,
      });

      settings.push({
        key: 'withTree',
        label: INTERACTIVE_SETTINGS_LABELS.withTree,
        category: 'interactive',
        value: userSettings.withTree ?? DEFAULT_INTERACTIVE_SETTINGS.withTree,
      });

      settings.push({
        key: 'withStats',
        label: INTERACTIVE_SETTINGS_LABELS.withStats,
        category: 'interactive',
        value: userSettings.withStats ?? DEFAULT_INTERACTIVE_SETTINGS.withStats,
      });

      settings.push({
        key: 'showExcludedFiles',
        label: INTERACTIVE_SETTINGS_LABELS.showExcludedFiles,
        category: 'interactive',
        value: userSettings.showExcludedFiles ?? true,
      });

      // Filter preset settings
      const activePresetSet = new Set(activeFilterPresets);
      for (const [id, preset] of Object.entries(DEFAULT_FILTER_PRESETS)) {
        settings.push({
          key: id,
          label: `Hide ${preset.name}`,
          category: 'filter',
          value: activePresetSet.has(id as FilterPresetId),
        });
      }

      dispatch({ type: 'SET_SETTINGS', payload: settings });
    });
  }, []);

  // Save settings when they change
  const saveSettings = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    const displaySettings: Partial<DisplaySettings> = {};
    const interactiveSettings: Partial<UserSettings> = {};
    const activeFilterPresets: FilterPresetId[] = [];

    for (const setting of state.settings) {
      if (setting.category === 'display') {
        displaySettings[setting.key as keyof DisplaySettings] = setting.value;
      } else if (setting.category === 'interactive') {
        interactiveSettings[setting.key as keyof UserSettings] = setting.value as any;
      } else if (setting.category === 'filter' && setting.value) {
        activeFilterPresets.push(setting.key as FilterPresetId);
      }
    }

    await Promise.all([
      saveUserSettings({
        ...interactiveSettings,
        displaySettings,
      }),
      setTreeViewFilters(activeFilterPresets),
    ]);

    dispatch({ type: 'SET_LOADING', payload: false });
    dispatch({ type: 'SET_SAVED', payload: true });

    // Show saved message briefly then exit
    setTimeout(() => {
      onComplete();
      exit();
    }, 800);
  };

  useInput((input, key) => {
    if (state.saved) {
      return; // Ignore input while showing saved message
    }

    if (input === 'q' || input === 'Q') {
      onComplete();
      exit();
      return;
    }

    if (key.upArrow) {
      dispatch({ type: 'MOVE_CURSOR_UP' });
      return;
    }

    if (key.downArrow) {
      dispatch({ type: 'MOVE_CURSOR_DOWN', payload: { maxIndex: state.settings.length - 1 } });
      return;
    }

    if (input === ' ' || key.return) {
      dispatch({ type: 'TOGGLE_SETTING', payload: state.cursor });
      return;
    }

    if (input === 's' || input === 'S') {
      saveSettings();
      return;
    }
  });

  if (state.loading && state.settings.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="gray">Loading settings...</Text>
      </Box>
    );
  }

  if (state.saved) {
    return (
      <Box flexDirection="column">
        <Text color="greenBright" bold>✓ Settings saved successfully!</Text>
      </Box>
    );
  }

  // Group settings by category
  const displaySettings = state.settings.filter(s => s.category === 'display');
  const interactiveSettings = state.settings.filter(s => s.category === 'interactive');
  const filterPresetSettings = state.settings.filter(s => s.category === 'filter');

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyanBright">⚙ Settings</Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text color="gray">
          <Text color="blueBright">↑↓</Text> navigate  <Text color="blueBright">Space</Text> toggle  <Text color="blueBright">S</Text> save & exit  <Text color="blueBright">Q</Text> quit without saving
        </Text>
        <Text color="dim">These settings persist across all runs and apply to both interactive and non-interactive modes.</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellowBright">Display Settings</Text>
        {displaySettings.map((setting, index) => {
          const globalIndex = state.settings.indexOf(setting);
          const isCursor = globalIndex === state.cursor;
          const checkbox = setting.value ? '◉' : '○';
          const cursorMark = isCursor ? '→' : ' ';

          return (
            <Box key={setting.key} flexDirection="row">
              <Text color={isCursor ? 'cyanBright' : 'gray'}>{cursorMark} </Text>
              <Text color={setting.value ? 'greenBright' : 'gray'}>{checkbox}</Text>
              <Text> </Text>
              <Text color={isCursor ? 'white' : 'gray'} bold={isCursor}>
                {setting.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellowBright">Interactive Mode Settings</Text>
        {interactiveSettings.map((setting, index) => {
          const globalIndex = state.settings.indexOf(setting);
          const isCursor = globalIndex === state.cursor;
          const checkbox = setting.value ? '◉' : '○';
          const cursorMark = isCursor ? '→' : ' ';

          return (
            <Box key={setting.key} flexDirection="row">
              <Text color={isCursor ? 'cyanBright' : 'gray'}>{cursorMark} </Text>
              <Text color={setting.value ? 'greenBright' : 'gray'}>{checkbox}</Text>
              <Text> </Text>
              <Text color={isCursor ? 'white' : 'gray'} bold={isCursor}>
                {setting.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellowBright">Tree View Filter Presets</Text>
        <Text color="dim" marginBottom={1}>Hide specific file types in the interactive tree view (Press F in tree view for quick access)</Text>
        {filterPresetSettings.map((setting, index) => {
          const globalIndex = state.settings.indexOf(setting);
          const isCursor = globalIndex === state.cursor;
          const checkbox = setting.value ? '◉' : '○';
          const cursorMark = isCursor ? '→' : ' ';

          return (
            <Box key={setting.key} flexDirection="row">
              <Text color={isCursor ? 'cyanBright' : 'gray'}>{cursorMark} </Text>
              <Text color={setting.value ? 'greenBright' : 'gray'}>{checkbox}</Text>
              <Text> </Text>
              <Text color={isCursor ? 'white' : 'gray'} bold={isCursor}>
                {setting.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1}>
        <Text color="gray">
          Settings are stored in <Text color="cyanBright">~/.config/repo-roller/settings.json</Text>
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellowBright">Quick Reference</Text>
        <Text color="gray">  • Use <Text color="cyanBright">--list-presets</Text> to view available presets</Text>
        <Text color="gray">  • Use <Text color="cyanBright">--list-profiles</Text> to view available profiles</Text>
        <Text color="gray">  • Use <Text color="cyanBright">--preset &lt;name&gt;</Text> to apply a preset</Text>
        <Text color="gray">  • Use <Text color="cyanBright">--profile &lt;name&gt;</Text> to apply a profile</Text>
        <Text color="gray">  • Use <Text color="cyanBright">-I</Text> or <Text color="cyanBright">--interactive</Text> for visual file selection</Text>
      </Box>
    </Box>
  );
};
