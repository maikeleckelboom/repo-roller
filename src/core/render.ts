import { readFile } from 'node:fs/promises';
import { sep } from 'node:path';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';
import type {
  ScanResult,
  RenderOptions,
  ResolvedOptions,
  StructuredOutput
} from './types.js';
import { formatBytes } from './helpers.js';

/**
 * Map file extension to code fence language
 */
export function getLanguage(extension: string): string {
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    mjs: 'javascript',
    cjs: 'javascript',
    json: 'json',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    sh: 'bash',
    bash: 'bash',
    zsh: 'zsh',
    fish: 'fish',
    sql: 'sql',
    graphql: 'graphql',
    proto: 'protobuf',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    env: 'bash',
  };

  return langMap[extension.toLowerCase()] ?? extension;
}

/**
 * Get git repository URL if available
 */
function getGitRepositoryUrl(rootPath: string): string | undefined {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', {
      cwd: rootPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    // Convert SSH URLs to HTTPS
    if (remoteUrl.startsWith('git@')) {
      return remoteUrl
        .replace('git@', 'https://')
        .replace('.com:', '.com/')
        .replace('.git', '');
    }

    return remoteUrl.replace('.git', '');
  } catch {
    return undefined;
  }
}

/**
 * Simple comment stripping (handles //, /*, #)
 */
function stripComments(content: string, extension: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inBlockComment = false;

  const usesSlashComments = ['ts', 'tsx', 'js', 'jsx', 'java', 'c', 'cpp', 'cs', 'go', 'rs'].includes(extension);
  const usesHashComments = ['py', 'sh', 'bash', 'yaml', 'yml', 'toml', 'rb'].includes(extension);

  for (let line of lines) {
    // Handle block comments (/* */)
    if (usesSlashComments) {
      if (inBlockComment) {
        const endIndex = line.indexOf('*/');
        if (endIndex !== -1) {
          line = line.slice(endIndex + 2);
          inBlockComment = false;
        } else {
          continue;
        }
      }

      const blockStart = line.indexOf('/*');
      if (blockStart !== -1) {
        const blockEnd = line.indexOf('*/', blockStart);
        if (blockEnd !== -1) {
          line = line.slice(0, blockStart) + line.slice(blockEnd + 2);
        } else {
          line = line.slice(0, blockStart);
          inBlockComment = true;
        }
      }

      // Handle line comments (//)
      const commentIndex = line.indexOf('//');
      if (commentIndex !== -1) {
        line = line.slice(0, commentIndex);
      }
    }

    // Handle hash comments (#)
    if (usesHashComments) {
      const commentIndex = line.indexOf('#');
      if (commentIndex !== -1) {
        line = line.slice(0, commentIndex);
      }
    }

    // Keep line if it has content after stripping
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Build a directory tree structure
 */
interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
}

function buildTree(files: readonly { relativePath: string }[]): TreeNode {
  const root: TreeNode = { name: '', children: new Map(), isFile: false };

  for (const file of files) {
    const parts = file.relativePath.split(sep);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) {continue;}

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          children: new Map(),
          isFile: i === parts.length - 1,
        });
      }

      const nextNode = current.children.get(part);
      if (nextNode) {
        current = nextNode;
      }
    }
  }

  return root;
}

/**
 * Render tree node recursively
 */
function renderTreeNode(node: TreeNode, prefix: string, isLast: boolean): string[] {
  const lines: string[] = [];

  if (node.name) {
    const connector = isLast ? '└── ' : '├── ';
    const icon = node.isFile ? '📄 ' : '📁 ';
    lines.push(`${prefix}${connector}${icon}${node.name}`);
  }

  const children = Array.from(node.children.values());
  const childPrefix = node.name ? prefix + (isLast ? '    ' : '│   ') : prefix;

  children.forEach((child, index) => {
    const childLines = renderTreeNode(child, childPrefix, index === children.length - 1);
    lines.push(...childLines);
  });

  return lines;
}

/**
 * Render tree view of file structure
 */
function renderTree(scan: ScanResult): string {
  const tree = buildTree(scan.files);
  const lines = renderTreeNode(tree, '', true);

  return `## 📂 Directory Structure

\`\`\`
${lines.join('\n')}
\`\`\`

`;
}

/**
 * Render statistics section
 */
function renderStats(scan: ScanResult): string {
  const { files, totalBytes, extensionCounts } = scan;

  const extList = Object.entries(extensionCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([ext, count]) => `  - ${ext || '(no extension)'}: ${count} file${count === 1 ? '' : 's'}`)
    .join('\n');

  return `## 📊 Statistics

- **Total files**: ${files.length}
- **Total size**: ${formatBytes(totalBytes)}
- **Files by extension**:
${extList}

`;
}

/**
 * Generate table of contents for markdown
 */
function generateTOC(files: readonly { relativePath: string }[]): string {
  let toc = `## 📑 Table of Contents

`;

  for (const file of files) {
    const anchor = file.relativePath.replace(/[^\w-]/g, '-').toLowerCase();
    toc += `- [\`${file.relativePath}\`](#${anchor})\n`;
  }

  toc += '\n---\n\n';
  return toc;
}

/**
 * Generate YAML front matter for markdown
 */
function generateFrontMatter(scan: ScanResult, profile: string): string {
  const { files, totalBytes, rootPath } = scan;

  return `---
title: Source Code Archive
root: ${rootPath}
files: ${files.length}
total_size: ${formatBytes(totalBytes)}
profile: ${profile}
generated: ${new Date().toISOString()}
---

`;
}

/**
 * Render markdown document from scan results
 */
export async function renderMarkdown(
  scan: ScanResult,
  opts: RenderOptions,
  options: ResolvedOptions,
  architecturalOverview?: string
): Promise<string> {
  const { files, totalBytes, rootPath } = scan;
  const { withTree, withStats, stripComments: shouldStripComments } = opts;

  let output = '';

  // Add front matter if requested
  if (options.frontMatter) {
    output += generateFrontMatter(scan, options.profile);
  }

  output += `# 📦 Source Code Archive

**Root**: \`${rootPath}\`
**Files**: ${files.length}
**Total size**: ${formatBytes(totalBytes)}

---

`;

  // Add architectural overview if provided
  if (architecturalOverview) {
    output += `## 🏗️ Architectural Overview

${architecturalOverview}

---

`;
  }

  // Add TOC if requested
  if (options.toc) {
    output += generateTOC(files);
  }

  // Add tree view if requested
  if (withTree) {
    output += renderTree(scan);
  }

  // Add stats if requested
  if (withStats) {
    output += renderStats(scan);
  }

  // Add file contents
  output += `## 📄 Files

`;

  for (const file of files) {
    try {
      let content = await readFile(file.absolutePath, 'utf-8');

      // Strip comments if requested
      if (shouldStripComments) {
        content = stripComments(content, file.extension);
      }

      const language = getLanguage(file.extension);

      // Inject file path as a comment at the top of the content
      const filePathComment = `// File: ${file.relativePath}`;
      const contentWithComment = `${filePathComment}\n\n${content}`;

      // Add anchor-friendly heading
      const anchorId = file.relativePath.replace(/[^\w-]/g, '-').toLowerCase();

      output += `### \`${file.relativePath}\` {#${anchorId}}

\`\`\`${language}
${contentWithComment}
\`\`\`

`;
    } catch (error) {
      output += `### \`${file.relativePath}\`

\`\`\`
[Error reading file: ${error instanceof Error ? error.message : String(error)}]
\`\`\`

`;
    }
  }

  return output;
}

/**
 * Render JSON output from scan results
 */
export async function renderJson(
  scan: ScanResult,
  options: ResolvedOptions
): Promise<string> {
  const { files, rootPath } = scan;

  const structuredData: StructuredOutput = {
    metadata: {
      sourceRepository: getGitRepositoryUrl(rootPath),
      profile: options.profile,
      timestamp: new Date().toISOString(),
      fileCount: files.length,
    },
    architecturalOverview: options.repoRollerConfig?.architectural_overview,
    files: await Promise.all(
      files.map(async (file) => {
        try {
          let content = await readFile(file.absolutePath, 'utf-8');

          // Strip comments if requested
          if (options.stripComments) {
            content = stripComments(content, file.extension);
          }

          return {
            path: file.relativePath,
            language: getLanguage(file.extension),
            content,
          };
        } catch (error) {
          return {
            path: file.relativePath,
            language: getLanguage(file.extension),
            content: `[Error reading file: ${error instanceof Error ? error.message : String(error)}]`,
          };
        }
      })
    ),
  };

  // Support compact JSON and custom indentation
  if (options.compact) {
    return JSON.stringify(structuredData);
  }

  return JSON.stringify(structuredData, null, options.indent);
}

/**
 * Render YAML output from scan results
 */
export async function renderYaml(
  scan: ScanResult,
  options: ResolvedOptions
): Promise<string> {
  const { files, rootPath } = scan;

  const structuredData: StructuredOutput = {
    metadata: {
      sourceRepository: getGitRepositoryUrl(rootPath),
      profile: options.profile,
      timestamp: new Date().toISOString(),
      fileCount: files.length,
    },
    architecturalOverview: options.repoRollerConfig?.architectural_overview,
    files: await Promise.all(
      files.map(async (file) => {
        try {
          let content = await readFile(file.absolutePath, 'utf-8');

          // Strip comments if requested
          if (options.stripComments) {
            content = stripComments(content, file.extension);
          }

          return {
            path: file.relativePath,
            language: getLanguage(file.extension),
            content,
          };
        } catch (error) {
          return {
            path: file.relativePath,
            language: getLanguage(file.extension),
            content: `[Error reading file: ${error instanceof Error ? error.message : String(error)}]`,
          };
        }
      })
    ),
  };

  return yaml.dump(structuredData, {
    lineWidth: -1,
    noRefs: true,
    indent: options.indent,
  });
}

/**
 * Render plain text output from scan results
 */
export async function renderTxt(
  scan: ScanResult,
  options: ResolvedOptions
): Promise<string> {
  const { files } = scan;
  let output = '';

  for (const file of files) {
    try {
      let content = await readFile(file.absolutePath, 'utf-8');

      // Strip comments if requested
      if (options.stripComments) {
        content = stripComments(content, file.extension);
      }

      output += `${'='.repeat(50)}
File: ${file.relativePath}
${'='.repeat(50)}

${content}

`;
    } catch (error) {
      output += `${'='.repeat(50)}
File: ${file.relativePath}
${'='.repeat(50)}

[Error reading file: ${error instanceof Error ? error.message : String(error)}]

`;
    }
  }

  return output;
}

/**
 * Main render function that dispatches to the appropriate renderer
 */
export async function render(
  scan: ScanResult,
  options: ResolvedOptions
): Promise<string> {
  const { format } = options;

  switch (format) {
    case 'json':
      return renderJson(scan, options);
    case 'yaml':
      return renderYaml(scan, options);
    case 'txt':
      return renderTxt(scan, options);
    case 'md':
    default: {
      const architecturalOverview = options.repoRollerConfig?.architectural_overview;
      return renderMarkdown(
        scan,
        {
          withTree: options.withTree,
          withStats: options.withStats,
          stripComments: options.stripComments,
        },
        options,
        architecturalOverview
      );
    }
  }
}
