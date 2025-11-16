/**
 * LLM Prompt Helper
 *
 * Generates suggested system and user messages tailored to the bundle composition.
 * Makes it easy for users to copy-paste optimized prompts.
 */

import { calculateLanguageBreakdown, calculateRoleBreakdown } from './helpers.js';
import type { ScanResult } from './types.js';
import * as ui from './ui.js';

export interface PromptSuggestion {
  systemMessage: string;
  userMessageTemplate: string;
  bundleType: 'code-heavy' | 'docs-heavy' | 'test-heavy' | 'mixed' | 'config-heavy';
}

/**
 * Analyze bundle composition and generate appropriate prompt suggestions
 */
export function generatePromptSuggestion(scan: ScanResult): PromptSuggestion {
  const roles = calculateRoleBreakdown(scan.files);
  const languages = calculateLanguageBreakdown(scan.files);

  // Determine bundle type
  let bundleType: PromptSuggestion['bundleType'] = 'mixed';

  if (roles.source >= 60) {
    bundleType = 'code-heavy';
  } else if (roles.docs >= 40) {
    bundleType = 'docs-heavy';
  } else if (roles.test >= 40) {
    bundleType = 'test-heavy';
  } else if (roles.config >= 30) {
    bundleType = 'config-heavy';
  }

  // Get primary language
  const primaryLang = languages.length > 0 ? languages[0]?.name ?? 'mixed' : 'mixed';

  // Generate system message based on bundle type
  const systemMessage = generateSystemMessage(bundleType, primaryLang);
  const userMessageTemplate = generateUserMessageTemplate(bundleType, primaryLang);

  return {
    systemMessage,
    userMessageTemplate,
    bundleType,
  };
}

/**
 * Generate system message based on bundle type
 */
function generateSystemMessage(
  bundleType: PromptSuggestion['bundleType'],
  primaryLang: string
): string {
  const langContext = primaryLang !== 'mixed'
    ? `The codebase is primarily ${primaryLang}. `
    : '';

  switch (bundleType) {
    case 'code-heavy':
      return (
        `You are a senior software engineer reviewing a ${primaryLang} codebase. ` +
        `${langContext}Focus on code quality, architecture patterns, and potential improvements. ` +
        'Provide specific, actionable feedback with code examples when relevant.'
      );

    case 'docs-heavy':
      return (
        'You are a technical writer and documentation specialist. ' +
        `${langContext}The bundle contains substantial documentation. ` +
        'Focus on clarity, completeness, and consistency of the documentation.'
      );

    case 'test-heavy':
      return (
        `You are a QA engineer and testing specialist familiar with ${primaryLang}. ` +
        `${langContext}The bundle emphasizes test coverage. ` +
        'Focus on test quality, coverage gaps, and testing best practices.'
      );

    case 'config-heavy':
      return (
        'You are a DevOps engineer and configuration specialist. ' +
        `${langContext}The bundle contains significant configuration files. ` +
        'Focus on configuration best practices, security, and maintainability.'
      );

    case 'mixed':
    default:
      return (
        `You are a full-stack software engineer. ${langContext}` +
        'You have access to a comprehensive codebase snapshot including source code, tests, and documentation. ' +
        'Provide balanced analysis considering all aspects of the project.'
      );
  }
}

/**
 * Generate user message template based on bundle type
 */
function generateUserMessageTemplate(
  bundleType: PromptSuggestion['bundleType'],
  primaryLang: string
): string {
  switch (bundleType) {
    case 'code-heavy':
      return (
        'Please analyze this codebase and:\n' +
        '1. Identify the main architectural patterns\n' +
        '2. Highlight any code quality concerns\n' +
        '3. Suggest specific improvements\n' +
        '\n[Your specific question here]'
      );

    case 'docs-heavy':
      return (
        'Please review the documentation and:\n' +
        '1. Check for completeness and accuracy\n' +
        '2. Identify any gaps or unclear sections\n' +
        '3. Suggest improvements for developer experience\n' +
        '\n[Your specific question here]'
      );

    case 'test-heavy':
      return (
        'Please analyze the test suite and:\n' +
        '1. Evaluate test coverage and quality\n' +
        '2. Identify missing test scenarios\n' +
        '3. Suggest testing improvements\n' +
        '\n[Your specific question here]'
      );

    case 'config-heavy':
      return (
        'Please review the configuration and:\n' +
        '1. Check for security best practices\n' +
        '2. Identify potential issues or misconfigurations\n' +
        '3. Suggest improvements for maintainability\n' +
        '\n[Your specific question here]'
      );

    case 'mixed':
    default:
      return (
        'I\'ve provided a snapshot of my codebase. Please:\n' +
        '1. Understand the project structure\n' +
        '2. Answer my specific question below\n' +
        '\n[Your specific question here]'
      );
  }
}

/**
 * Render the LLM prompt helper section for display
 */
export function renderPromptHelper(scan: ScanResult): string[] {
  const lines: string[] = [];
  const suggestion = generatePromptSuggestion(scan);

  lines.push(ui.colors.primary.bold('LLM Prompt Helper'));
  lines.push(ui.colors.muted(ui.symbols.line.repeat(60)));
  lines.push('');

  // Bundle type indicator
  const bundleTypeLabel = suggestion.bundleType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  lines.push(ui.colors.dim(`Bundle Type: ${ui.colors.accent(bundleTypeLabel)}`));
  lines.push('');

  // System message
  lines.push(ui.colors.info.bold('Suggested System Message:'));
  lines.push(ui.colors.muted('─'.repeat(40)));
  const systemLines = wrapText(suggestion.systemMessage, 70);
  for (const line of systemLines) {
    lines.push(ui.colors.dim(line));
  }
  lines.push('');

  // User message template
  lines.push(ui.colors.info.bold('Suggested User Message:'));
  lines.push(ui.colors.muted('─'.repeat(40)));
  const userLines = suggestion.userMessageTemplate.split('\n');
  for (const line of userLines) {
    lines.push(ui.colors.dim(line));
  }
  lines.push('');

  // Copy hint
  lines.push(ui.colors.muted('Tip: Copy these prompts and paste into your LLM interface'));
  lines.push('');

  return lines;
}

/**
 * Wrap text to specified width
 */
function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Get a one-line summary of the prompt suggestion
 */
export function getPromptSummary(scan: ScanResult): string {
  const suggestion = generatePromptSuggestion(scan);
  const bundleTypeLabel = suggestion.bundleType.replace('-', ' ');
  return `${bundleTypeLabel} bundle - tailored prompts available with --prompt-helper`;
}
