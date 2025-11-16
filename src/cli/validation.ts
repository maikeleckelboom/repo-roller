/**
 * CLI Validation Functions
 *
 * Functions for validating configuration files and CLI options.
 */

import type { RollerConfig, RepoRollerYmlConfig } from '../core/types.js';
import { validateRollerConfig, validateRepoRollerYml, formatValidationErrors } from '../core/validation.js';
import * as ui from '../core/ui.js';

/**
 * Validate configuration files
 *
 * @param root - Root directory path
 * @param config - Loaded roller config (or undefined)
 * @param repoRollerConfig - Loaded repo roller yml config (or undefined)
 */
export function validateConfigs(
  _root: string,
  config: RollerConfig | undefined,
  repoRollerConfig: RepoRollerYmlConfig | undefined
): void {
  console.log(ui.header());
  console.log(ui.status('scan', 'Validating configuration files'));
  console.log('');

  let hasErrors = false;
  let foundConfigs = false;

  // Validate repo-roller.config
  if (config) {
    foundConfigs = true;
    const result = validateRollerConfig(config);
    console.log(formatValidationErrors(result, 'repo-roller.config'));
    if (!result.valid) {
      hasErrors = true;
    }
  }

  // Validate .reporoller.yml
  if (repoRollerConfig) {
    foundConfigs = true;
    const result = validateRepoRollerYml(repoRollerConfig);
    console.log(formatValidationErrors(result, '.reporoller.yml'));
    if (!result.valid) {
      hasErrors = true;
    }
  }

  if (!foundConfigs) {
    console.log(ui.info('No configuration files found.'));
    console.log(ui.bullet(ui.colors.dim('Run "repo-roller init" to create configuration files.')));
    return;
  }

  if (hasErrors) {
    process.exit(1);
  }
}
