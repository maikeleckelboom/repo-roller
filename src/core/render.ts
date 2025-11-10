import { readFile } from 'node:fs/promises';
import { dirname, basename, sep } from 'node:path';
import type { ScanResult, RenderOptions } from './types.js';

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Map file extension to code fence language
 */
function getLanguage(extension: string): string {
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
      if (!part) continue;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          children: new Map(),
          isFile: i === parts.length - 1,
        });
      }

      current = current.children.get(part)!;
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
 * Render markdown document from scan results
 */
export async function renderMarkdown(
  scan: ScanResult,
  opts: RenderOptions
): Promise<string> {
  const { files, totalBytes, rootPath } = scan;
  const { withTree, withStats, stripComments: shouldStripComments } = opts;

  let output = `# 📦 Source Code Archive

**Root**: \`${rootPath}\`
**Files**: ${files.length}
**Total size**: ${formatBytes(totalBytes)}

---

`;

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

      output += `### ${file.relativePath}

\`\`\`${language}
${content}
\`\`\`

`;
    } catch (error) {
      output += `### ${file.relativePath}

\`\`\`
[Error reading file: ${error instanceof Error ? error.message : String(error)}]
\`\`\`

`;
    }
  }

  return output;
}
