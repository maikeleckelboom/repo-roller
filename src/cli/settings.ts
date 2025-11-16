import {
  getDisplaySettings,
  setDisplaySetting,
  resetDisplaySettings,
  loadUserSettings,
  saveUserSettings,
  resetAllSettings,
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_INTERACTIVE_SETTINGS,
  type DisplaySettings,
} from '../core/userSettings.js';
import * as ui from '../core/ui.js';

/**
 * Display current settings
 */
export async function displaySettings(): Promise<void> {
  console.log(ui.header());
  console.log(ui.section('Display Settings'));

  const displaySettings = await getDisplaySettings();

  console.log(ui.colors.dim('  Current settings (stored in ~/.config/repo-roller/settings.json)'));
  console.log(ui.colors.muted('  ' + ui.symbols.line.repeat(60)));
  console.log('');

  const settingLabels: Record<keyof DisplaySettings, string> = {
    showGenerationSummary: 'Generation Summary',
    showCodeComposition: 'Code Composition',
    showContextFit: 'Context Fit',
    showHealthHints: 'Health Hints',
    showTokenWarnings: 'Token Warnings',
    showCostEstimates: 'Cost Estimates',
    showRecommendations: 'Recommendations',
  };

  for (const [key, label] of Object.entries(settingLabels)) {
    const value = displaySettings[key as keyof DisplaySettings];
    const icon = value ? ui.colors.success(ui.symbols.check) : ui.colors.error(ui.symbols.cross);
    const status = value ? ui.colors.success('shown') : ui.colors.warning('hidden');
    console.log(`  ${icon} ${label.padEnd(22)} ${status}`);
  }

  console.log('');
  console.log(ui.colors.dim('  CLI Override Flags'));
  console.log(ui.colors.muted('  ' + ui.symbols.line.repeat(60)));
  console.log(ui.bullet(ui.colors.muted('--quiet              Hide all UI summaries')));
  console.log(ui.bullet(ui.colors.muted('--hide-composition   Hide code composition')));
  console.log(ui.bullet(ui.colors.muted('--hide-context-fit   Hide context fit')));
  console.log(ui.bullet(ui.colors.muted('--hide-health-hints  Hide health hints')));
  console.log(ui.bullet(ui.colors.muted('--hide-warnings      Hide token warnings')));
  console.log(ui.bullet(ui.colors.muted('--hide-cost          Hide cost estimates')));
  console.log(ui.bullet(ui.colors.muted('--hide-recommendations Hide recommendations')));
  console.log('');
}

/**
 * Set a specific display setting
 */
export async function setDisplaySettingCommand(key: string, value: string): Promise<void> {
  const validKeys: Array<keyof DisplaySettings> = [
    'showGenerationSummary',
    'showCodeComposition',
    'showContextFit',
    'showHealthHints',
    'showTokenWarnings',
    'showCostEstimates',
    'showRecommendations',
  ];

  // Allow friendly aliases
  const keyMap: Record<string, keyof DisplaySettings> = {
    summary: 'showGenerationSummary',
    composition: 'showCodeComposition',
    contextfit: 'showContextFit',
    'context-fit': 'showContextFit',
    hints: 'showHealthHints',
    'health-hints': 'showHealthHints',
    warnings: 'showTokenWarnings',
    cost: 'showCostEstimates',
    recommendations: 'showRecommendations',
  };

  const normalizedKey = keyMap[key.toLowerCase()] || key;

  if (!validKeys.includes(normalizedKey as keyof DisplaySettings)) {
    console.error(ui.error(`Invalid setting key: ${key}`));
    console.error('');
    console.error(ui.colors.dim('  Valid keys:'));
    for (const k of validKeys) {
      console.error(ui.bullet(ui.colors.muted(k)));
    }
    console.error('');
    console.error(ui.colors.dim('  Aliases:'));
    for (const [alias, target] of Object.entries(keyMap)) {
      console.error(ui.bullet(ui.colors.muted(`${alias} -> ${target}`)));
    }
    process.exit(1);
  }

  const boolValue = value === 'true' || value === '1' || value === 'on' || value === 'yes';
  if (!['true', 'false', '1', '0', 'on', 'off', 'yes', 'no'].includes(value.toLowerCase())) {
    console.error(ui.error(`Invalid value: ${value}. Use: true/false, on/off, yes/no, 1/0`));
    process.exit(1);
  }

  await setDisplaySetting(normalizedKey as keyof DisplaySettings, boolValue);
  console.log(ui.success(`Set ${normalizedKey} to ${boolValue}`));
}

/**
 * Reset display settings to defaults
 */
export async function resetDisplaySettingsCommand(): Promise<void> {
  await resetDisplaySettings();
  console.log(ui.success('Display settings reset to defaults'));
  console.log('');
  console.log(ui.colors.dim('  Defaults:'));

  for (const [key, value] of Object.entries(DEFAULT_DISPLAY_SETTINGS)) {
    const icon = value ? ui.colors.success(ui.symbols.check) : ui.colors.error(ui.symbols.cross);
    console.log(`  ${icon} ${key}: ${value}`);
  }
  console.log('');
}

/**
 * Reset ALL user settings to defaults (display + interactive preferences)
 */
export async function resetAllSettingsCommand(): Promise<void> {
  await resetAllSettings();
  console.log(ui.success('All settings reset to defaults'));
  console.log('');
  console.log(ui.colors.dim('  Interactive Mode Preferences (defaults):'));
  console.log(`  ${ui.colors.muted(ui.symbols.bullet)} Strip comments: ${DEFAULT_INTERACTIVE_SETTINGS.stripComments ? 'Yes' : 'No'}`);
  console.log(`  ${ui.colors.muted(ui.symbols.bullet)} Include tree: ${DEFAULT_INTERACTIVE_SETTINGS.withTree ? 'Yes' : 'No'}`);
  console.log(`  ${ui.colors.muted(ui.symbols.bullet)} Include stats: ${DEFAULT_INTERACTIVE_SETTINGS.withStats ? 'Yes' : 'No'}`);
  console.log('');
  console.log(ui.colors.dim('  Display Settings (defaults):'));
  for (const [key, value] of Object.entries(DEFAULT_DISPLAY_SETTINGS)) {
    const icon = value ? ui.colors.success(ui.symbols.check) : ui.colors.error(ui.symbols.cross);
    console.log(`  ${icon} ${key}: ${value}`);
  }
  console.log('');
}

/**
 * Show all user settings (not just display)
 */
export async function displayAllSettings(): Promise<void> {
  console.log(ui.header());
  console.log(ui.section('All User Settings'));

  const settings = await loadUserSettings();

  if (Object.keys(settings).length === 0) {
    console.log(ui.colors.dim('  No custom settings configured'));
  } else {
    console.log(JSON.stringify(settings, null, 2));
  }
  console.log('');
}

/**
 * Export settings as JSON
 */
export async function exportSettings(): Promise<void> {
  const settings = await loadUserSettings();
  console.log(JSON.stringify(settings, null, 2));
}

/**
 * Import settings from JSON
 */
export async function importSettings(jsonStr: string): Promise<void> {
  try {
    const settings = JSON.parse(jsonStr);
    await saveUserSettings(settings);
    console.log(ui.success('Settings imported successfully'));
  } catch (err) {
    console.error(ui.error(`Failed to parse JSON: ${err instanceof Error ? err.message : 'unknown error'}`));
    process.exit(1);
  }
}

/**
 * Display settings location
 */
export function displaySettingsPath(): void {
  const configDir = `${process.env.HOME || '~'}/.config/repo-roller`;
  console.log(ui.info('Settings location:'));
  console.log(`  ${ui.colors.primary(configDir + '/settings.json')}`);
  console.log('');
}
