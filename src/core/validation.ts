/**
 * @module core/validation
 *
 * Configuration validation with actionable error messages.
 *
 * OWNS:
 * - Validating RollerConfig from config files
 * - Validating RepoRollerYml structure
 * - Validating CLI options
 * - Providing actionable suggestions for fixing errors
 * - Distinguishing between errors and warnings
 *
 * DOES NOT OWN:
 * - Loading configuration (that's config.ts)
 * - Type definitions (that's types.ts)
 * - CLI argument parsing (that's Commander)
 *
 * TYPICAL USAGE:
 * ```typescript
 * import { validateRollerConfig, formatValidationErrors } from './validation.js';
 *
 * const result = validateRollerConfig(config);
 * if (!result.valid) {
 *   console.error(formatValidationErrors(result.errors));
 *   process.exit(1);
 * }
 * ```
 *
 * ERROR PHILOSOPHY:
 * Each error includes:
 * - field: what's wrong
 * - message: why it's wrong
 * - suggestion: how to fix it
 */

import type {
  RollerConfig,
  RepoRollerYmlConfig,
  RollerPreset,
  ProfileConfig,
} from './types.js';
import { LLM_PROVIDERS } from './tokens.js';

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly suggestion: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationError[];
}

/**
 * Validate a preset configuration
 */
function validatePreset(
  name: string,
  preset: RollerPreset
): readonly ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for invalid extension format
  if (preset.extensions) {
    for (const ext of preset.extensions) {
      if (ext.startsWith('.')) {
        errors.push({
          field: `presets.${name}.extensions`,
          message: `Extension "${ext}" should not start with a dot`,
          suggestion: `Change "${ext}" to "${ext.slice(1)}"`,
        });
      }
      if (ext.includes('/') || ext.includes('*')) {
        errors.push({
          field: `presets.${name}.extensions`,
          message: `Extension "${ext}" contains invalid characters`,
          suggestion: `Use simple extensions like "ts", "tsx", "js" without glob patterns`,
        });
      }
    }
  }

  // Check for invalid max file size
  if (preset.maxFileSizeBytes !== undefined) {
    if (preset.maxFileSizeBytes <= 0) {
      errors.push({
        field: `presets.${name}.maxFileSizeBytes`,
        message: 'Max file size must be positive',
        suggestion: 'Set a positive value like 1048576 (1MB)',
      });
    }
    if (preset.maxFileSizeBytes > 100 * 1024 * 1024) {
      errors.push({
        field: `presets.${name}.maxFileSizeBytes`,
        message: 'Max file size is unusually large (>100MB)',
        suggestion:
          'Consider a smaller limit to avoid memory issues',
      });
    }
  }

  // Check for conflicting include/exclude patterns
  if (preset.include && preset.exclude) {
    for (const includePattern of preset.include) {
      for (const excludePattern of preset.exclude) {
        if (includePattern === excludePattern) {
          errors.push({
            field: `presets.${name}`,
            message: `Pattern "${includePattern}" appears in both include and exclude`,
            suggestion: 'Remove the pattern from one of the lists',
          });
        }
      }
    }
  }

  // Check for valid sort mode
  if (preset.sort) {
    const validSorts = ['path', 'size', 'extension'];
    if (!validSorts.includes(preset.sort)) {
      errors.push({
        field: `presets.${name}.sort`,
        message: `Invalid sort mode "${preset.sort}"`,
        suggestion: `Use one of: ${validSorts.join(', ')}`,
      });
    }
  }

  return errors;
}

/**
 * Validate a profile configuration
 */
function validateProfile(
  name: string,
  profile: ProfileConfig
): readonly ValidationError[] {
  const errors: ValidationError[] = [];

  if (!profile.layout || profile.layout.length === 0) {
    errors.push({
      field: `profiles.${name}.layout`,
      message: 'Profile has empty layout array',
      suggestion: `Add file patterns like ["README.md", "src/**/*.ts"]`,
    });
  }

  if (profile.layout) {
    for (const pattern of profile.layout) {
      if (typeof pattern !== 'string') {
        errors.push({
          field: `profiles.${name}.layout`,
          message: 'Layout must contain only string patterns',
          suggestion: 'Ensure all layout entries are strings',
        });
      }
    }
  }

  return errors;
}

/**
 * Validate repo-roller.config file
 */
export function validateRollerConfig(
  config: RollerConfig
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate root path
  if (config.root && typeof config.root !== 'string') {
    errors.push({
      field: 'root',
      message: 'Root must be a string',
      suggestion: 'Set root to "." or an absolute path',
    });
  }

  // Validate presets
  if (config.presets) {
    if (typeof config.presets !== 'object' || Array.isArray(config.presets)) {
      errors.push({
        field: 'presets',
        message: 'Presets must be an object',
        suggestion:
          'Define presets as: presets: { myPreset: { extensions: ["ts"] } }',
      });
    } else {
      for (const [name, preset] of Object.entries(config.presets)) {
        errors.push(...validatePreset(name, preset));
      }
    }
  }

  // Validate default preset reference
  if (config.defaultPreset && config.presets) {
    if (!config.presets[config.defaultPreset]) {
      errors.push({
        field: 'defaultPreset',
        message: `Default preset "${config.defaultPreset}" is not defined in presets`,
        suggestion: `Either define "${config.defaultPreset}" in presets or change defaultPreset`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate .reporoller.yml file
 */
export function validateRepoRollerYml(
  config: RepoRollerYmlConfig
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate architectural overview
  if (
    config.architectural_overview &&
    typeof config.architectural_overview !== 'string'
  ) {
    errors.push({
      field: 'architectural_overview',
      message: 'Architectural overview must be a string',
      suggestion: 'Use a multi-line string with YAML | syntax',
    });
  }

  // Validate profiles
  if (config.profiles) {
    if (typeof config.profiles !== 'object' || Array.isArray(config.profiles)) {
      errors.push({
        field: 'profiles',
        message: 'Profiles must be an object',
        suggestion:
          'Define profiles as: profiles: { myProfile: { layout: [...] } }',
      });
    } else {
      for (const [name, profile] of Object.entries(config.profiles)) {
        errors.push(...validateProfile(name, profile));
      }
    }
  }

  // Warn if no profiles defined
  if (!config.profiles || Object.keys(config.profiles).length === 0) {
    warnings.push({
      field: 'profiles',
      message: 'No profiles defined',
      suggestion:
        'Add profiles to customize file ordering for different use cases',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(
  result: ValidationResult,
  configFile: string
): string {
  if (result.valid && result.warnings.length === 0) {
    return `✅ ${configFile} is valid`;
  }

  const lines: string[] = [];

  if (!result.valid) {
    lines.push(`❌ Configuration errors in ${configFile}:\n`);
    for (const error of result.errors) {
      lines.push(`  ${error.field}`);
      lines.push(`    Error: ${error.message}`);
      lines.push(`    Fix: ${error.suggestion}`);
      lines.push('');
    }
  }

  if (result.warnings.length > 0) {
    lines.push(`⚠️  Warnings in ${configFile}:\n`);
    for (const warning of result.warnings) {
      lines.push(`  ${warning.field}`);
      lines.push(`    Warning: ${warning.message}`);
      lines.push(`    Suggestion: ${warning.suggestion}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Validate CLI options for common mistakes
 */
export function validateCliOptions(options: {
  ext?: string;
  lang?: string;
  maxSize?: number;
  format?: string;
  target?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check for extension mistakes
  if (options.ext) {
    if (options.ext.includes('*')) {
      errors.push({
        field: '--ext',
        message: 'Extensions should not contain glob patterns',
        suggestion:
          'Use simple extensions like "ts,tsx" without asterisks',
      });
    }
    if (options.ext.includes('.')) {
      warnings.push({
        field: '--ext',
        message: 'Extensions should not include dots',
        suggestion:
          'Use "ts" instead of ".ts"',
      });
    }
  }

  // Check max size
  if (options.maxSize !== undefined) {
    if (options.maxSize <= 0) {
      errors.push({
        field: '--max-size',
        message: 'Max size must be positive',
        suggestion: 'Use a positive number like 500 (for 500KB)',
      });
    }
    if (options.maxSize > 10240) {
      warnings.push({
        field: '--max-size',
        message: 'Max size is very large (>10MB)',
        suggestion:
          'Consider a smaller limit for better LLM context efficiency',
      });
    }
  }

  // Check format
  if (options.format) {
    const validFormats = ['md', 'json', 'yaml', 'txt'];
    if (!validFormats.includes(options.format)) {
      errors.push({
        field: '--format',
        message: `Invalid format "${options.format}"`,
        suggestion: `Use one of: ${validFormats.join(', ')}`,
      });
    }
  }

  // Check target provider
  if (options.target) {
    const validProviders = Object.keys(LLM_PROVIDERS);
    if (!validProviders.includes(options.target)) {
      warnings.push({
        field: '--target',
        message: `Unknown provider "${options.target}"`,
        suggestion: `Available providers: ${validProviders.join(', ')}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
