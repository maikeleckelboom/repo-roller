/**
 * @module core/clipboard
 *
 * Cross-platform clipboard operations.
 *
 * OWNS:
 * - Copying text to system clipboard
 * - Platform-specific command detection
 * - Error handling for missing clipboard tools
 */

import { spawn } from 'node:child_process';

/**
 * Copy text to system clipboard (cross-platform)
 *
 * Supports:
 * - macOS: pbcopy
 * - Windows: clip
 * - Linux: xclip or xsel (with fallback)
 *
 * @param text - The text content to copy to clipboard
 * @throws Error if clipboard tools are unavailable or command fails
 */
export async function copyToClipboard(text: string): Promise<void> {
  const platform = process.platform;

  let cmd: string;
  let args: string[];

  if (platform === 'darwin') {
    cmd = 'pbcopy';
    args = [];
  } else if (platform === 'win32') {
    cmd = 'clip';
    args = [];
  } else {
    // Linux - try xclip first, then xsel
    cmd = 'xclip';
    args = ['-selection', 'clipboard'];
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'pipe'] });

    let stderr = '';
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        // If xclip fails on Linux, try xsel
        if (platform === 'linux' && cmd === 'xclip') {
          const xselProc = spawn('xsel', ['--clipboard', '--input'], {
            stdio: ['pipe', 'ignore', 'pipe'],
          });
          xselProc.on('close', (xselCode) => {
            if (xselCode === 0) {
              resolve();
            } else {
              reject(
                new Error(
                  'Clipboard not available. Install xclip or xsel on Linux.'
                )
              );
            }
          });
          xselProc.on('error', () => {
            reject(
              new Error(
                'Clipboard not available. Install xclip or xsel on Linux.'
              )
            );
          });
          xselProc.stdin?.write(text);
          xselProc.stdin?.end();
        } else {
          reject(
            new Error(
              `Clipboard command failed: ${stderr || 'unknown error'}`
            )
          );
        }
      }
    });

    proc.on('error', (err) => {
      if (platform === 'linux') {
        reject(
          new Error('Clipboard not available. Install xclip or xsel on Linux.')
        );
      } else {
        reject(err);
      }
    });

    proc.stdin?.write(text);
    proc.stdin?.end();
  });
}
