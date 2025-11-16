/**
 * Secret Scanning Module
 *
 * Detects potential secrets, API keys, tokens, and sensitive information
 * in source code to prevent accidental exposure in bundles.
 */

import { readFile } from 'node:fs/promises';
import type { FileInfo } from './types.js';

/**
 * Types of secrets that can be detected
 */
export type SecretType =
  | 'api_key'
  | 'private_key'
  | 'password'
  | 'token'
  | 'aws_credentials'
  | 'database_url'
  | 'jwt'
  | 'oauth'
  | 'ssh_key'
  | 'certificate'
  | 'generic_secret';

/**
 * A detected secret in a file
 */
export interface DetectedSecret {
  readonly file: string;
  readonly line: number;
  readonly type: SecretType;
  readonly description: string;
  readonly snippet: string; // Redacted snippet showing context
  readonly confidence: 'high' | 'medium' | 'low';
}

/**
 * Result of scanning for secrets
 */
export interface SecretScanResult {
  readonly secrets: DetectedSecret[];
  readonly filesScanned: number;
  readonly hasHighConfidenceSecrets: boolean;
}

/**
 * Pattern definitions for secret detection
 */
interface SecretPattern {
  readonly type: SecretType;
  readonly description: string;
  readonly pattern: RegExp;
  readonly confidence: 'high' | 'medium' | 'low';
}

/**
 * Patterns for detecting various types of secrets
 */
const SECRET_PATTERNS: SecretPattern[] = [
  // AWS
  {
    type: 'aws_credentials',
    description: 'AWS Access Key ID',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    confidence: 'high',
  },
  {
    type: 'aws_credentials',
    description: 'AWS Secret Access Key',
    pattern: /\b[A-Za-z0-9/+=]{40}\b/g,
    confidence: 'medium',
  },

  // Private Keys
  {
    type: 'private_key',
    description: 'RSA Private Key',
    pattern: /-----BEGIN RSA PRIVATE KEY-----/g,
    confidence: 'high',
  },
  {
    type: 'private_key',
    description: 'OpenSSH Private Key',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g,
    confidence: 'high',
  },
  {
    type: 'private_key',
    description: 'PGP Private Key',
    pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
    confidence: 'high',
  },

  // SSH Keys
  {
    type: 'ssh_key',
    description: 'SSH Private Key',
    pattern: /-----BEGIN (DSA|EC|OPENSSH) PRIVATE KEY-----/g,
    confidence: 'high',
  },

  // Certificates
  {
    type: 'certificate',
    description: 'Certificate',
    pattern: /-----BEGIN CERTIFICATE-----/g,
    confidence: 'medium',
  },

  // API Keys - Various providers
  {
    type: 'api_key',
    description: 'Google API Key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    confidence: 'high',
  },
  {
    type: 'api_key',
    description: 'GitHub Personal Access Token',
    pattern: /\bghp_[a-zA-Z0-9]{36}\b/g,
    confidence: 'high',
  },
  {
    type: 'api_key',
    description: 'GitHub OAuth Access Token',
    pattern: /\bgho_[a-zA-Z0-9]{36}\b/g,
    confidence: 'high',
  },
  {
    type: 'api_key',
    description: 'Slack Token',
    pattern: /\bxox[baprs]-[0-9]{10,12}-[0-9]{10,12}[a-zA-Z0-9-]*\b/g,
    confidence: 'high',
  },
  {
    type: 'api_key',
    description: 'Stripe API Key',
    pattern: /\b(sk|pk)_(test|live)_[0-9a-zA-Z]{24,}\b/g,
    confidence: 'high',
  },
  {
    type: 'api_key',
    description: 'Twilio API Key',
    pattern: /\bSK[0-9a-fA-F]{32}\b/g,
    confidence: 'high',
  },
  {
    type: 'api_key',
    description: 'SendGrid API Key',
    pattern: /\bSG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}\b/g,
    confidence: 'high',
  },

  // JWT Tokens
  {
    type: 'jwt',
    description: 'JSON Web Token',
    pattern: /\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\b/g,
    confidence: 'high',
  },

  // Database URLs
  {
    type: 'database_url',
    description: 'Database Connection String',
    pattern: /\b(mongodb|postgres|mysql|redis):\/\/[^\s'"]+@[^\s'"]+\b/gi,
    confidence: 'high',
  },

  // Generic Secrets (lower confidence, based on context)
  {
    type: 'password',
    description: 'Hardcoded Password',
    pattern: /\b(password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    confidence: 'medium',
  },
  {
    type: 'token',
    description: 'Bearer Token',
    pattern: /\bBearer\s+[a-zA-Z0-9_-]{20,}\b/g,
    confidence: 'medium',
  },
  {
    type: 'api_key',
    description: 'Generic API Key Pattern',
    pattern: /\b(api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"][a-zA-Z0-9_-]{16,}['"]/gi,
    confidence: 'medium',
  },
  {
    type: 'generic_secret',
    description: 'Generic Secret Assignment',
    pattern: /\b(secret|token|auth[_-]?token)\s*[:=]\s*['"][a-zA-Z0-9_/+=]{20,}['"]/gi,
    confidence: 'low',
  },
];

/**
 * Files that commonly contain secrets and should always be flagged
 */
const SENSITIVE_FILE_PATTERNS = [
  /\.env$/i,
  /\.env\.[a-z]+$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /id_rsa$/i,
  /id_dsa$/i,
  /id_ecdsa$/i,
  /id_ed25519$/i,
  /\.keystore$/i,
  /credentials\.json$/i,
  /service[_-]?account.*\.json$/i,
];

/**
 * Check if a file path matches sensitive file patterns
 */
export function isSensitiveFile(filePath: string): boolean {
  return SENSITIVE_FILE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Redact sensitive information in a snippet for display
 */
function redactSnippet(line: string, match: string): string {
  // Show first and last 3 characters with asterisks in between
  if (match.length <= 10) {
    return line.replace(match, '*'.repeat(match.length));
  }

  const redacted = match.slice(0, 3) + '*'.repeat(match.length - 6) + match.slice(-3);
  return line.replace(match, redacted);
}

/**
 * Scan a single file for secrets
 */
async function scanFileForSecrets(file: FileInfo): Promise<DetectedSecret[]> {
  const secrets: DetectedSecret[] = [];

  // Check if the file itself is sensitive
  if (isSensitiveFile(file.relativePath)) {
    secrets.push({
      file: file.relativePath,
      line: 0,
      type: 'generic_secret',
      description: 'Sensitive file type',
      snippet: '(entire file flagged)',
      confidence: 'high',
    });
  }

  // Skip binary files
  if (file.isBinary) {
    return secrets;
  }

  // Read file content
  let content: string;
  try {
    content = await readFile(file.absolutePath, 'utf-8');
  } catch {
    return secrets;
  }

  const lines = content.split('\n');

  // Scan each line
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    if (!line) continue;

    // Skip lines that are likely comments explaining secrets (not actual secrets)
    if (/^\s*(\/\/|#|\/\*|\*)\s*(example|placeholder|fake|demo|test|mock|sample)/i.test(line)) {
      continue;
    }

    // Check each pattern
    for (const pattern of SECRET_PATTERNS) {
      // Reset regex state
      pattern.pattern.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = pattern.pattern.exec(line)) !== null) {
        // Additional validation to reduce false positives
        const matchedText = match[0];

        // Skip common false positives
        if (isLikelyFalsePositive(matchedText, line)) {
          continue;
        }

        secrets.push({
          file: file.relativePath,
          line: lineNum + 1,
          type: pattern.type,
          description: pattern.description,
          snippet: redactSnippet(line.trim().slice(0, 100), matchedText),
          confidence: pattern.confidence,
        });
      }
    }
  }

  return secrets;
}

/**
 * Check if a match is likely a false positive
 */
function isLikelyFalsePositive(match: string, line: string): boolean {
  // Skip if it's in a URL that's not a connection string
  if (/https?:\/\/[^\s]*/.test(line) && !/(password|token|key|secret)=/i.test(line)) {
    return true;
  }

  // Skip placeholder values
  if (/^(xxx+|000+|aaa+|test|example|placeholder|your[_-])/i.test(match)) {
    return true;
  }

  // Skip very short generic matches
  if (match.length < 16 && !/^(AKIA|AIza|ghp_|gho_|sk_|pk_|SG\.)/.test(match)) {
    return true;
  }

  return false;
}

/**
 * Scan multiple files for secrets
 */
export async function scanForSecrets(files: readonly FileInfo[]): Promise<SecretScanResult> {
  const allSecrets: DetectedSecret[] = [];

  for (const file of files) {
    const fileSecrets = await scanFileForSecrets(file);
    allSecrets.push(...fileSecrets);
  }

  return {
    secrets: allSecrets,
    filesScanned: files.length,
    hasHighConfidenceSecrets: allSecrets.some(s => s.confidence === 'high'),
  };
}

/**
 * Get a summary of detected secrets by type
 */
export function summarizeSecrets(result: SecretScanResult): Map<SecretType, number> {
  const summary = new Map<SecretType, number>();

  for (const secret of result.secrets) {
    const count = summary.get(secret.type) ?? 0;
    summary.set(secret.type, count + 1);
  }

  return summary;
}

/**
 * Format secret type for display
 */
export function formatSecretType(type: SecretType): string {
  const labels: Record<SecretType, string> = {
    api_key: 'API Key',
    private_key: 'Private Key',
    password: 'Password',
    token: 'Token',
    aws_credentials: 'AWS Credentials',
    database_url: 'Database URL',
    jwt: 'JWT Token',
    oauth: 'OAuth Token',
    ssh_key: 'SSH Key',
    certificate: 'Certificate',
    generic_secret: 'Secret',
  };

  return labels[type] ?? type;
}
