/**
 * Safety Layer
 *
 * Provides safety checks for bundles including:
 * - neverSend filtering
 * - Secret scanning
 * - Sensitive content warnings
 */

import { minimatch } from 'minimatch';
import type { FileInfo, RepoRollerYmlConfig } from './types.js';
import { scanForSecrets, type SecretScanResult, type DetectedSecret } from './secrets.js';

/**
 * Result of safety checks on files
 */
export interface SafetyCheckResult {
  /** Files that passed safety checks */
  readonly safeFiles: FileInfo[];
  /** Files blocked by neverSend rules */
  readonly blockedFiles: FileInfo[];
  /** Secret scan results */
  readonly secretScan: SecretScanResult;
  /** Whether there are any safety concerns */
  readonly hasConcerns: boolean;
  /** Whether user should be warned before proceeding */
  readonly requiresWarning: boolean;
}

/**
 * Apply neverSend rules to filter out sensitive files
 */
function applyNeverSendRules(
  files: readonly FileInfo[],
  neverSendPatterns: readonly string[]
): { safe: FileInfo[]; blocked: FileInfo[] } {
  const safe: FileInfo[] = [];
  const blocked: FileInfo[] = [];

  for (const file of files) {
    const isBlocked = neverSendPatterns.some(pattern => {
      // Handle patterns with and without glob wildcards
      if (pattern.includes('*') || pattern.includes('?')) {
        return minimatch(file.relativePath, pattern, { dot: true });
      }
      // Exact match or basename match for simple patterns
      const basename = file.relativePath.split('/').pop() ?? '';
      return file.relativePath === pattern || basename === pattern;
    });

    if (isBlocked) {
      blocked.push(file);
    } else {
      safe.push(file);
    }
  }

  return { safe, blocked };
}

/**
 * Get default neverSend patterns (used when no config is provided)
 */
function getDefaultNeverSendPatterns(): readonly string[] {
  return [
    '.env',
    '.env.*',
    '*.pem',
    '*.key',
    '*.p12',
    '*.pfx',
    'id_rsa',
    'id_dsa',
    'id_ecdsa',
    'id_ed25519',
    '**/credentials.json',
    '**/service-account*.json',
    '**/.htpasswd',
  ];
}

/**
 * Perform comprehensive safety checks on a set of files
 */
export async function performSafetyChecks(
  files: readonly FileInfo[],
  config?: RepoRollerYmlConfig
): Promise<SafetyCheckResult> {
  const safetyRules = config?.safety;

  // Apply neverSend filtering
  const neverSendPatterns = safetyRules?.neverSend ?? getDefaultNeverSendPatterns();
  const { safe: safeFiles, blocked: blockedFiles } = applyNeverSendRules(files, neverSendPatterns);

  // Scan for secrets unless disabled
  const disableScanning = safetyRules?.disableSecretScanning ?? false;
  const secretScan: SecretScanResult = disableScanning
    ? { secrets: [], filesScanned: 0, hasHighConfidenceSecrets: false }
    : await scanForSecrets(safeFiles);

  // Determine if there are concerns
  const hasConcerns = blockedFiles.length > 0 || secretScan.secrets.length > 0;

  // Determine if warning is required
  const skipWarnings = safetyRules?.skipSensitiveWarnings ?? false;
  const requiresWarning = !skipWarnings && (secretScan.hasHighConfidenceSecrets || blockedFiles.length > 0);

  return {
    safeFiles,
    blockedFiles,
    secretScan,
    hasConcerns,
    requiresWarning,
  };
}

/**
 * Format a safety warning message for display
 */
export function formatSafetyWarning(result: SafetyCheckResult): string {
  const lines: string[] = [];

  if (result.blockedFiles.length > 0) {
    lines.push('⚠️  BLOCKED FILES (neverSend rules):');
    lines.push('');
    for (const file of result.blockedFiles.slice(0, 10)) {
      lines.push(`   ✗ ${file.relativePath}`);
    }
    if (result.blockedFiles.length > 10) {
      lines.push(`   ... and ${result.blockedFiles.length - 10} more`);
    }
    lines.push('');
  }

  if (result.secretScan.secrets.length > 0) {
    lines.push('🔐 POTENTIAL SECRETS DETECTED:');
    lines.push('');

    // Group by confidence
    const highConfidence = result.secretScan.secrets.filter(s => s.confidence === 'high');
    const mediumConfidence = result.secretScan.secrets.filter(s => s.confidence === 'medium');

    if (highConfidence.length > 0) {
      lines.push('   HIGH CONFIDENCE:');
      for (const secret of highConfidence.slice(0, 5)) {
        lines.push(`   • ${secret.file}:${secret.line} - ${secret.description}`);
        lines.push(`     ${secret.snippet}`);
      }
      if (highConfidence.length > 5) {
        lines.push(`   ... and ${highConfidence.length - 5} more high-confidence findings`);
      }
      lines.push('');
    }

    if (mediumConfidence.length > 0) {
      lines.push('   MEDIUM CONFIDENCE:');
      for (const secret of mediumConfidence.slice(0, 3)) {
        lines.push(`   • ${secret.file}:${secret.line} - ${secret.description}`);
      }
      if (mediumConfidence.length > 3) {
        lines.push(`   ... and ${mediumConfidence.length - 3} more medium-confidence findings`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Get a brief summary of safety concerns
 */
export function getSafetySummary(result: SafetyCheckResult): string {
  const parts: string[] = [];

  if (result.blockedFiles.length > 0) {
    parts.push(`${result.blockedFiles.length} blocked file${result.blockedFiles.length !== 1 ? 's' : ''}`);
  }

  const highCount = result.secretScan.secrets.filter(s => s.confidence === 'high').length;
  const mediumCount = result.secretScan.secrets.filter(s => s.confidence === 'medium').length;

  if (highCount > 0) {
    parts.push(`${highCount} high-risk secret${highCount !== 1 ? 's' : ''}`);
  }
  if (mediumCount > 0) {
    parts.push(`${mediumCount} medium-risk secret${mediumCount !== 1 ? 's' : ''}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No concerns';
}
