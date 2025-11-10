import { writeFile } from 'node:fs/promises';
import { checkbox, confirm, input, select } from '@inquirer/prompts';
import type { ResolvedOptions, FileInfo } from './core/types.js';
import { scanFiles } from './core/scan.js';
import { renderMarkdown } from './core/render.js';

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
 * Group files by directory for better display
 */
function groupFilesByDirectory(files: readonly FileInfo[]): Map<string, FileInfo[]> {
  const groups = new Map<string, FileInfo[]>();

  for (const file of files) {
    const parts = file.relativePath.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';

    if (!groups.has(dir)) {
      groups.set(dir, []);
    }

    groups.get(dir)!.push(file);
  }

  return groups;
}

/**
 * Run interactive TUI mode
 */
export async function runInteractive(options: ResolvedOptions): Promise<void> {
  console.log('🎨 Interactive Mode\n');

  // Initial scan
  console.log(`🔍 Scanning files in ${options.root}...`);
  let scan = await scanFiles(options);
  console.log(`✅ Found ${scan.files.length} files (${formatBytes(scan.totalBytes)})\n`);

  if (scan.files.length === 0) {
    console.log('No files found matching the criteria.');
    return;
  }

  // File selection
  const grouped = groupFilesByDirectory(scan.files);
  const choices: Array<{ name: string; value: string; checked?: boolean }> = [];

  for (const [dir, files] of Array.from(grouped.entries()).sort()) {
    // Add directory separator
    choices.push({
      name: `\n📁 ${dir}`,
      value: `__dir__${dir}`,
      checked: false,
    });

    // Add files in this directory
    for (const file of files) {
      const fileName = file.relativePath.split('/').pop() ?? file.relativePath;
      const size = formatBytes(file.sizeBytes);
      choices.push({
        name: `   ${fileName} (${size})`,
        value: file.relativePath,
        checked: true,
      });
    }
  }

  const selectedPaths = await checkbox({
    message: 'Select files to include:',
    choices: choices.filter((c) => !c.value.startsWith('__dir__')),
    pageSize: 15,
  });

  if (selectedPaths.length === 0) {
    console.log('No files selected. Exiting.');
    return;
  }

  // Filter scan results to only selected files
  const selectedFiles = scan.files.filter((f) => selectedPaths.includes(f.relativePath));
  const selectedTotalBytes = selectedFiles.reduce((sum, f) => sum + f.sizeBytes, 0);

  // Extension counts for selected files
  const selectedExtCounts: Record<string, number> = {};
  for (const file of selectedFiles) {
    selectedExtCounts[file.extension] = (selectedExtCounts[file.extension] ?? 0) + 1;
  }

  scan = {
    files: selectedFiles,
    totalBytes: selectedTotalBytes,
    rootPath: scan.rootPath,
    extensionCounts: selectedExtCounts,
  };

  // Additional options
  console.log('');
  const stripComments = await confirm({
    message: 'Strip comments from source files?',
    default: options.stripComments,
  });

  const withTree = await confirm({
    message: 'Include directory tree view?',
    default: options.withTree,
  });

  const withStats = await confirm({
    message: 'Include statistics section?',
    default: options.withStats,
  });

  // Summary and confirmation
  console.log('\n📊 Summary:');
  console.log(`  Files: ${scan.files.length}`);
  console.log(`  Total size: ${formatBytes(scan.totalBytes)}`);
  console.log(`  Output: ${options.outFile}`);
  console.log(`  Strip comments: ${stripComments ? 'Yes' : 'No'}`);
  console.log(`  Include tree: ${withTree ? 'Yes' : 'No'}`);
  console.log(`  Include stats: ${withStats ? 'Yes' : 'No'}`);

  const shouldGenerate = await confirm({
    message: '\nGenerate markdown file?',
    default: true,
  });

  if (!shouldGenerate) {
    console.log('Cancelled.');
    return;
  }

  // Generate markdown
  console.log('\n📝 Rendering markdown...');
  const markdown = await renderMarkdown(scan, {
    withTree,
    withStats,
    stripComments,
  });

  // Write output
  await writeFile(options.outFile, markdown, 'utf-8');

  console.log(`✨ Output written to ${options.outFile}`);
  console.log(`   ${scan.files.length} files, ${formatBytes(scan.totalBytes)}`);
}
