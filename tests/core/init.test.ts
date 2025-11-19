import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { select } from '@inquirer/prompts';
import { runInit } from '../../src/core/init.js';

// Mock dependencies
vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

describe('runInit', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(writeFile).mockClear();
    vi.mocked(writeFile).mockResolvedValue(undefined);
    vi.mocked(select).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TypeScript project', () => {
    beforeEach(() => {
      vi.mocked(select)
        .mockResolvedValueOnce('typescript') // project type
        .mockResolvedValueOnce('md'); // format
    });

    it('should create config for TypeScript project', async () => {
      await runInit('/test/dir');

      expect(writeFile).toHaveBeenCalledTimes(2);

      // Check config file
      const configCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('repo-roller.config.mjs')
      );
      expect(configCall).toBeDefined();
      expect(configCall![0]).toBe('/test/dir/repo-roller.config.mjs');

      const configContent = configCall![1] as string;
      expect(configContent).toContain('export default');
      expect(configContent).toContain('"llm"');
      expect(configContent).toContain('"code-only"');
      expect(configContent).toContain('ts');
      expect(configContent).toContain('tsx');
    });

    it('should create .reporoller.yml file', async () => {
      await runInit('/test/dir');

      const ymlCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('.reporoller.yml')
      );
      expect(ymlCall).toBeDefined();
      expect(ymlCall![0]).toBe('/test/dir/.reporoller.yml');

      const ymlContent = ymlCall![1] as string;
      expect(ymlContent).toContain('architectural_overview');
      expect(ymlContent).toContain('profiles:');
      expect(ymlContent).toContain('llm-context:');
    });

    it('should display success messages', async () => {
      await runInit('/test/dir');

      expect(consoleLogSpy).toHaveBeenCalledWith('🚀 Initializing repo-roller configuration...\n');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Created'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('repo-roller.config.mjs'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('.reporoller.yml'));
      expect(consoleLogSpy).toHaveBeenCalledWith('\n✨ Configuration created successfully!\n');
    });
  });

  describe('Python project', () => {
    beforeEach(() => {
      vi.mocked(select)
        .mockResolvedValueOnce('python')
        .mockResolvedValueOnce('md');
    });

    it('should create config for Python project', async () => {
      await runInit('/test/dir');

      const configCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('repo-roller.config.mjs')
      );
      const configContent = configCall![1] as string;

      expect(configContent).toContain('py');
      expect(configContent).toContain('pyi');
      expect(configContent).toContain('__pycache__');
      expect(configContent).toContain('.venv');
    });

    it('should include Python-specific exclusions', async () => {
      await runInit('/test/dir');

      const configCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('repo-roller.config.mjs')
      );
      const configContent = configCall![1] as string;

      expect(configContent).toContain('**/*.pyc');
      expect(configContent).toContain('**/__pycache__/**');
      expect(configContent).toContain('**/.venv/**');
      expect(configContent).toContain('**/venv/**');
    });
  });

  describe('Go project', () => {
    beforeEach(() => {
      vi.mocked(select)
        .mockResolvedValueOnce('go')
        .mockResolvedValueOnce('json');
    });

    it('should create config for Go project', async () => {
      await runInit('/test/dir');

      const configCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('repo-roller.config.mjs')
      );
      const configContent = configCall![1] as string;

      expect(configContent).toContain('"go"');
      expect(configContent).toContain('"mod"');
      expect(configContent).toContain('"sum"');
      expect(configContent).toContain('**/*_test.go');
      expect(configContent).toContain('**/vendor/**');
    });
  });

  describe('Documentation project', () => {
    beforeEach(() => {
      vi.mocked(select)
        .mockResolvedValueOnce('docs')
        .mockResolvedValueOnce('yaml');
    });

    it('should create config for documentation project', async () => {
      await runInit('/test/dir');

      const configCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('repo-roller.config.mjs')
      );
      const configContent = configCall![1] as string;

      expect(configContent).toContain('"md"');
      expect(configContent).toContain('"mdx"');
      expect(configContent).toContain('"txt"');
      expect(configContent).toContain('"all-docs"');
    });

    it('should disable stats for documentation', async () => {
      await runInit('/test/dir');

      const configCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('repo-roller.config.mjs')
      );
      const configContent = configCall![1] as string;

      expect(configContent).toContain('"withStats": false');
    });
  });

  describe('Multi-language project', () => {
    beforeEach(() => {
      vi.mocked(select)
        .mockResolvedValueOnce('multi')
        .mockResolvedValueOnce('txt');
    });

    it('should create config for multi-language project', async () => {
      await runInit('/test/dir');

      const configCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('repo-roller.config.mjs')
      );
      const configContent = configCall![1] as string;

      expect(configContent).toContain('"ts"');
      expect(configContent).toContain('"tsx"');
      expect(configContent).toContain('"js"');
      expect(configContent).toContain('"jsx"');
      expect(configContent).toContain('"py"');
      expect(configContent).toContain('"go"');
      expect(configContent).toContain('"rs"');
    });

    it('should include exclusions for all languages', async () => {
      await runInit('/test/dir');

      const configCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('repo-roller.config.mjs')
      );
      const configContent = configCall![1] as string;

      expect(configContent).toContain('**/node_modules/**');
      expect(configContent).toContain('**/dist/**');
      expect(configContent).toContain('**/.venv/**');
      expect(configContent).toContain('**/vendor/**');
      expect(configContent).toContain('**/target/**');
    });
  });

  describe('preset configuration', () => {
    beforeEach(() => {
      vi.mocked(select)
        .mockResolvedValueOnce('typescript')
        .mockResolvedValueOnce('md');
    });

    it('should include llm preset with proper settings', async () => {
      await runInit('/test/dir');

      const configCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('repo-roller.config.mjs')
      );
      const configContent = configCall![1] as string;

      expect(configContent).toContain('"llm"');
      expect(configContent).toContain('"maxFileSizeBytes": 2097152'); // 2MB
      expect(configContent).toContain('"stripComments": false');
      expect(configContent).toContain('"withTree": true');
      expect(configContent).toContain('"withStats": true');
      expect(configContent).toContain('"sort": "path"');
    });

    it('should include code-only preset with proper settings', async () => {
      await runInit('/test/dir');

      const configCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('repo-roller.config.mjs')
      );
      const configContent = configCall![1] as string;

      expect(configContent).toContain('"code-only"');
      expect(configContent).toContain('"stripComments": true');
      expect(configContent).toContain('"withTree": false');
      expect(configContent).toContain('"withStats": false');
    });

    it('should set default preset to llm', async () => {
      await runInit('/test/dir');

      const configCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('repo-roller.config.mjs')
      );
      const configContent = configCall![1] as string;

      expect(configContent).toContain('"defaultPreset": "llm"');
    });
  });

  describe('.reporoller.yml content', () => {
    beforeEach(() => {
      vi.mocked(select)
        .mockResolvedValueOnce('typescript')
        .mockResolvedValueOnce('md');
    });

    it('should include architectural_overview placeholder', async () => {
      await runInit('/test/dir');

      const ymlCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('.reporoller.yml')
      );
      const ymlContent = ymlCall![1] as string;

      expect(ymlContent).toContain('architectural_overview: |');
      expect(ymlContent).toContain("Add your project's architectural overview here");
    });

    it('should include llm-context profile', async () => {
      await runInit('/test/dir');

      const ymlCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('.reporoller.yml')
      );
      const ymlContent = ymlCall![1] as string;

      expect(ymlContent).toContain('profiles:');
      expect(ymlContent).toContain('llm-context:');
      expect(ymlContent).toContain('layout:');
      expect(ymlContent).toContain('README.md');
      expect(ymlContent).toContain('package.json');
    });

    it('should include example layout patterns', async () => {
      await runInit('/test/dir');

      const ymlCall = vi.mocked(writeFile).mock.calls.find(call =>
        call[0].includes('.reporoller.yml')
      );
      const ymlContent = ymlCall![1] as string;

      expect(ymlContent).toContain('"src/core/types.ts"');
      expect(ymlContent).toContain('"src/**/*.ts"');
    });
  });

  describe('file writing', () => {
    beforeEach(() => {
      vi.mocked(select)
        .mockResolvedValueOnce('typescript')
        .mockResolvedValueOnce('md');
    });

    it('should write files with UTF-8 encoding', async () => {
      await runInit('/test/dir');

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('repo-roller.config.mjs'),
        expect.any(String),
        'utf-8'
      );

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.reporoller.yml'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should handle file write errors gracefully', async () => {
      vi.mocked(writeFile).mockRejectedValueOnce(new Error('Write failed'));

      await expect(runInit('/test/dir')).rejects.toThrow('Write failed');
    });
  });

  describe('user interaction', () => {
    it('should prompt for project type first', async () => {
      vi.mocked(select)
        .mockResolvedValueOnce('typescript')
        .mockResolvedValueOnce('md');

      await runInit('/test/dir');

      expect(select).toHaveBeenNthCalledWith(1, {
        message: "What's your project type?",
        choices: expect.arrayContaining([
          { name: 'Node.js/TypeScript', value: 'typescript' },
          { name: 'Python', value: 'python' },
          { name: 'Go', value: 'go' },
          { name: 'Documentation', value: 'docs' },
          { name: 'Multi-language', value: 'multi' },
        ]),
      });
    });

    it('should prompt for output format second', async () => {
      vi.mocked(select)
        .mockResolvedValueOnce('typescript')
        .mockResolvedValueOnce('md');

      await runInit('/test/dir');

      expect(select).toHaveBeenNthCalledWith(2, {
        message: 'Default output format?',
        choices: expect.arrayContaining([
          { name: 'Markdown (best for LLMs)', value: 'md' },
          { name: 'JSON', value: 'json' },
          { name: 'YAML', value: 'yaml' },
          { name: 'Plain Text', value: 'txt' },
        ]),
      });
    });
  });

  describe('next steps display', () => {
    beforeEach(() => {
      vi.mocked(select)
        .mockResolvedValueOnce('typescript')
        .mockResolvedValueOnce('md');
    });

    it('should display next steps instructions', async () => {
      await runInit('/test/dir');

      expect(consoleLogSpy).toHaveBeenCalledWith('Next steps:');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Edit .reporoller.yml'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('repo-roller . --preset llm'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('repo-roller .'));
    });
  });

  describe('path handling', () => {
    beforeEach(() => {
      vi.mocked(select)
        .mockResolvedValueOnce('typescript')
        .mockResolvedValueOnce('md');
    });

    it('should handle relative paths', async () => {
      await runInit('./relative/path');

      const calls = vi.mocked(writeFile).mock.calls;
      const configCall = calls.find(call => String(call[0]).includes('repo-roller.config.mjs'));
      expect(configCall).toBeDefined();
      expect(String(configCall![0])).toContain('relative/path/repo-roller.config.mjs');
    });

    it('should handle absolute paths', async () => {
      await runInit('/absolute/path');

      expect(writeFile).toHaveBeenCalledWith(
        '/absolute/path/repo-roller.config.mjs',
        expect.any(String),
        'utf-8'
      );
    });

    it('should handle current directory', async () => {
      await runInit('.');

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('repo-roller.config.mjs'),
        expect.any(String),
        'utf-8'
      );
    });
  });
});
