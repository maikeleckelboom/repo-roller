import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

interface UserSettings {
  showExcludedFiles?: boolean;
  // DX improvements: Remember user preferences for interactive mode
  stripComments?: boolean;
  withTree?: boolean;
  withStats?: boolean;
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
    return JSON.parse(content) as UserSettings;
  } catch {
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
