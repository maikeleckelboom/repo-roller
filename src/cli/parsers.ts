/**
 * CLI Input Parsing Utilities
 *
 * Functions for parsing and validating CLI input values.
 */

/**
 * Parse token budget string (e.g., "50000", "50k", "1m")
 *
 * @param value - String value to parse
 * @returns Parsed number of tokens
 * @throws Error if value is invalid
 *
 * @example
 * parseTokenBudget("50k")   // Returns 50000
 * parseTokenBudget("1m")    // Returns 1000000
 * parseTokenBudget("100000") // Returns 100000
 */
export function parseTokenBudget(value: string): number {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.endsWith('k')) {
    const num = parseFloat(trimmed.slice(0, -1));
    if (!isNaN(num)) {
      return num * 1000;
    }
  }

  if (trimmed.endsWith('m')) {
    const num = parseFloat(trimmed.slice(0, -1));
    if (!isNaN(num)) {
      return num * 1_000_000;
    }
  }

  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return num;
  }

  throw new Error(`Invalid token budget: ${value}. Use numbers like 50000, 50k, or 1m`);
}
