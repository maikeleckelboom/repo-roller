import { describe, it, expect } from 'vitest';
import { getFileIconInfo, getFolderIconInfo } from '../../src/core/fileIcons.js';

describe('fileIcons', () => {
  describe('getFileIconInfo', () => {
    describe('TypeScript files', () => {
      it('should return typescript icon for .ts files', () => {
        const info = getFileIconInfo('index.ts');
        expect(info.iconId).toBe('file-icons:typescript');
        expect(info.category).toBe('source');
      });

      it('should return jsx-alt icon for .tsx files', () => {
        const info = getFileIconInfo('App.tsx');
        expect(info.iconId).toBe('file-icons:jsx-alt');
        expect(info.category).toBe('source');
      });

      it('should return test-typescript icon for .test.ts files', () => {
        const info = getFileIconInfo('utils.test.ts');
        expect(info.iconId).toBe('file-icons:test-typescript');
        expect(info.category).toBe('test');
        expect(info.hint).toBe('test');
      });

      it('should return test-typescript icon for .spec.tsx files', () => {
        const info = getFileIconInfo('Component.spec.tsx');
        expect(info.iconId).toBe('file-icons:test-typescript');
        expect(info.category).toBe('test');
        expect(info.hint).toBe('test');
      });
    });

    describe('JavaScript files', () => {
      it('should return javascript icon for .js files', () => {
        const info = getFileIconInfo('index.js');
        expect(info.iconId).toBe('file-icons:javascript');
        expect(info.category).toBe('source');
      });

      it('should return jsx icon for .jsx files', () => {
        const info = getFileIconInfo('App.jsx');
        expect(info.iconId).toBe('file-icons:jsx');
        expect(info.category).toBe('source');
      });

      it('should return test-js icon for .test.js files', () => {
        const info = getFileIconInfo('utils.test.js');
        expect(info.iconId).toBe('file-icons:test-js');
        expect(info.category).toBe('test');
        expect(info.hint).toBe('test');
      });

      it('should return javascript icon for .mjs files', () => {
        const info = getFileIconInfo('module.mjs');
        expect(info.iconId).toBe('file-icons:javascript');
        expect(info.category).toBe('source');
      });

      it('should return javascript icon for .cjs files', () => {
        const info = getFileIconInfo('config.cjs');
        expect(info.iconId).toBe('file-icons:javascript');
        expect(info.category).toBe('source');
      });
    });

    describe('JSON files', () => {
      it('should return json icon for .json files', () => {
        const info = getFileIconInfo('data.json');
        expect(info.iconId).toBe('file-icons:json');
        expect(info.category).toBe('config');
      });

      it('should return npm icon for package.json', () => {
        const info = getFileIconInfo('package.json');
        expect(info.iconId).toBe('file-icons:npm');
        expect(info.category).toBe('config');
        expect(info.hint).toBe('pkg');
      });

      it('should return typescript icon for tsconfig.json', () => {
        const info = getFileIconInfo('tsconfig.json');
        expect(info.iconId).toBe('file-icons:typescript');
        expect(info.category).toBe('config');
        expect(info.hint).toBe('config');
      });
    });

    describe('Markdown files', () => {
      it('should return markdown icon for .md files', () => {
        const info = getFileIconInfo('README.md');
        expect(info.iconId).toBe('file-icons:readme');
        expect(info.category).toBe('doc');
        expect(info.hint).toBe('doc');
      });

      it('should return markdown icon for .mdx files', () => {
        const info = getFileIconInfo('docs.mdx');
        expect(info.iconId).toBe('file-icons:markdown');
        expect(info.category).toBe('doc');
      });
    });

    describe('YAML files', () => {
      it('should return yaml icon for .yaml files', () => {
        const info = getFileIconInfo('config.yaml');
        expect(info.iconId).toBe('file-icons:yaml');
        expect(info.category).toBe('config');
      });

      it('should return yaml icon for .yml files', () => {
        const info = getFileIconInfo('config.yml');
        expect(info.iconId).toBe('file-icons:yaml');
        expect(info.category).toBe('config');
      });
    });

    describe('Lockfiles', () => {
      it('should return lock icon for package-lock.json', () => {
        const info = getFileIconInfo('package-lock.json');
        expect(info.iconId).toBe('file-icons:lock');
        expect(info.category).toBe('lockfile');
        expect(info.hint).toBe('lock');
      });

      it('should return lock icon for pnpm-lock.yaml', () => {
        const info = getFileIconInfo('pnpm-lock.yaml');
        expect(info.iconId).toBe('file-icons:lock');
        expect(info.category).toBe('lockfile');
        expect(info.hint).toBe('lock');
      });

      it('should return lock icon for yarn.lock', () => {
        const info = getFileIconInfo('yarn.lock');
        expect(info.iconId).toBe('file-icons:lock');
        expect(info.category).toBe('lockfile');
        expect(info.hint).toBe('lock');
      });

      it('should return lock icon for bun.lockb', () => {
        const info = getFileIconInfo('bun.lockb');
        expect(info.iconId).toBe('file-icons:lock');
        expect(info.category).toBe('lockfile');
        expect(info.hint).toBe('lock');
      });
    });

    describe('Config files', () => {
      it('should return eslint icon for .eslintrc.json', () => {
        const info = getFileIconInfo('.eslintrc.json');
        expect(info.iconId).toBe('file-icons:eslint');
        expect(info.category).toBe('config');
        expect(info.hint).toBe('config');
      });

      it('should return prettier icon for .prettierrc', () => {
        const info = getFileIconInfo('.prettierrc');
        expect(info.iconId).toBe('file-icons:prettier');
        expect(info.category).toBe('config');
        expect(info.hint).toBe('config');
      });

      it('should return git icon for .gitignore', () => {
        const info = getFileIconInfo('.gitignore');
        expect(info.iconId).toBe('file-icons:git');
        expect(info.category).toBe('config');
        expect(info.hint).toBe('git');
      });

      it('should return env icon for .env files', () => {
        const info = getFileIconInfo('.env');
        expect(info.iconId).toBe('file-icons:env');
        expect(info.category).toBe('config');
        expect(info.hint).toBe('env');
      });

      it('should return env icon for .env.local files', () => {
        const info = getFileIconInfo('.env.local');
        expect(info.iconId).toBe('file-icons:env');
        expect(info.category).toBe('config');
        expect(info.hint).toBe('env');
      });

      it('should return env icon for .env.development files', () => {
        const info = getFileIconInfo('.env.development');
        expect(info.iconId).toBe('file-icons:env');
        expect(info.category).toBe('config');
        expect(info.hint).toBe('env');
      });

      it('should return docker icon for Dockerfile', () => {
        const info = getFileIconInfo('Dockerfile');
        expect(info.iconId).toBe('file-icons:docker');
        expect(info.category).toBe('config');
        expect(info.hint).toBe('docker');
      });

      it('should return editorconfig icon for .editorconfig', () => {
        const info = getFileIconInfo('.editorconfig');
        expect(info.iconId).toBe('file-icons:editorconfig');
        expect(info.category).toBe('config');
        expect(info.hint).toBe('config');
      });
    });

    describe('Other languages', () => {
      it('should return python icon for .py files', () => {
        const info = getFileIconInfo('script.py');
        expect(info.iconId).toBe('file-icons:python');
        expect(info.category).toBe('source');
      });

      it('should return go icon for .go files', () => {
        const info = getFileIconInfo('main.go');
        expect(info.iconId).toBe('file-icons:go');
        expect(info.category).toBe('source');
      });

      it('should return rust icon for .rs files', () => {
        const info = getFileIconInfo('lib.rs');
        expect(info.iconId).toBe('file-icons:rust');
        expect(info.category).toBe('source');
      });

      it('should return java icon for .java files', () => {
        const info = getFileIconInfo('Main.java');
        expect(info.iconId).toBe('file-icons:java');
        expect(info.category).toBe('source');
      });

      it('should return shell icon for .sh files', () => {
        const info = getFileIconInfo('setup.sh');
        expect(info.iconId).toBe('file-icons:shell');
        expect(info.category).toBe('source');
      });

      it('should return sql icon for .sql files', () => {
        const info = getFileIconInfo('schema.sql');
        expect(info.iconId).toBe('file-icons:sql');
        expect(info.category).toBe('source');
      });
    });

    describe('Style files', () => {
      it('should return css icon for .css files', () => {
        const info = getFileIconInfo('styles.css');
        expect(info.iconId).toBe('file-icons:css');
        expect(info.category).toBe('asset');
      });

      it('should return scss icon for .scss files', () => {
        const info = getFileIconInfo('styles.scss');
        expect(info.iconId).toBe('file-icons:scss');
        expect(info.category).toBe('asset');
      });
    });

    describe('Web files', () => {
      it('should return html icon for .html files', () => {
        const info = getFileIconInfo('index.html');
        expect(info.iconId).toBe('file-icons:html');
        expect(info.category).toBe('source');
      });
    });

    describe('Default fallback', () => {
      it('should return generic file icon for unknown extensions', () => {
        const info = getFileIconInfo('unknown.xyz');
        expect(info.iconId).toBe('file-icons:file');
        expect(info.category).toBe('source');
      });

      it('should return generic file icon for files without extension', () => {
        const info = getFileIconInfo('Makefile');
        expect(info.iconId).toBe('file-icons:file');
        expect(info.category).toBe('source');
      });
    });
  });

  describe('getFolderIconInfo', () => {
    it('should return folder-open icon when expanded', () => {
      const info = getFolderIconInfo(true);
      expect(info.iconId).toBe('file-icons:folder-open');
      expect(info.category).toBe('folder');
    });

    it('should return folder icon when collapsed', () => {
      const info = getFolderIconInfo(false);
      expect(info.iconId).toBe('file-icons:folder');
      expect(info.category).toBe('folder');
    });
  });
});
