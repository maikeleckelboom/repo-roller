import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateCliSchema,
  generateLlmToolDefinition,
  generateShellCompletions,
  generateOpenApiDocs,
} from '../../src/core/schema.js';

describe('schema introspection', () => {
  describe('generateCliSchema', () => {
    it('returns a valid schema with required fields', () => {
      const schema = generateCliSchema();

      expect(schema.$schema).toContain('json-schema.org');
      expect(schema.name).toBe('repo-roller');
      expect(schema.version).toBe('1.0.0');
      expect(schema.description).toContain('LLM');
    });

    it('includes all main commands', () => {
      const schema = generateCliSchema();
      const commandNames = schema.commands.map((c) => c.name);

      expect(commandNames).toContain('repo-roller');
      expect(commandNames).toContain('repo-roller init');
      expect(commandNames).toContain('repo-roller history');
      expect(commandNames).toContain('repo-roller __schema');
      expect(commandNames).toContain('repo-roller daemon');
    });

    it('includes comprehensive option categories', () => {
      const schema = generateCliSchema();
      const mainCommand = schema.commands.find((c) => c.name === 'repo-roller');
      expect(mainCommand).toBeDefined();

      const categories = new Set(mainCommand!.options.map((o) => o.category));

      expect(categories.has('output')).toBe(true);
      expect(categories.has('filter')).toBe(true);
      expect(categories.has('processing')).toBe(true);
      expect(categories.has('mode')).toBe(true);
      expect(categories.has('config')).toBe(true);
      expect(categories.has('budget')).toBe(true);
      expect(categories.has('info')).toBe(true);
    });

    it('includes output format options', () => {
      const schema = generateCliSchema();

      expect(schema.outputFormats).toEqual(['md', 'json', 'yaml', 'txt']);
    });

    it('includes sort mode options', () => {
      const schema = generateCliSchema();

      expect(schema.sortModes).toEqual(['path', 'size', 'extension']);
    });

    it('includes built-in presets', () => {
      const schema = generateCliSchema();

      expect(schema.presets.length).toBeGreaterThan(0);
      expect(schema.presets).toContain('llm');
      expect(schema.presets).toContain('ts');
      expect(schema.presets).toContain('minimal');
    });

    it('includes model presets with required fields', () => {
      const schema = generateCliSchema();

      expect(schema.models.length).toBeGreaterThan(0);
      const firstModel = schema.models[0];

      expect(firstModel).toHaveProperty('name');
      expect(firstModel).toHaveProperty('family');
      expect(firstModel).toHaveProperty('contextLimit');
      expect(firstModel).toHaveProperty('description');
      expect(typeof firstModel!.contextLimit).toBe('number');
    });

    it('provides examples for main command', () => {
      const schema = generateCliSchema();
      const mainCommand = schema.commands.find((c) => c.name === 'repo-roller');

      expect(mainCommand!.examples.length).toBeGreaterThan(0);
      expect(mainCommand!.examples.some((e) => e.includes('--preset'))).toBe(true);
      expect(mainCommand!.examples.some((e) => e.includes('--interactive'))).toBe(true);
    });

    it('includes global options', () => {
      const schema = generateCliSchema();

      expect(schema.globalOptions.length).toBeGreaterThan(0);
      expect(schema.globalOptions.some((o) => o.name === 'version')).toBe(true);
      expect(schema.globalOptions.some((o) => o.name === 'help')).toBe(true);
    });

    it('defines option types correctly', () => {
      const schema = generateCliSchema();
      const mainCommand = schema.commands.find((c) => c.name === 'repo-roller');

      const formatOption = mainCommand!.options.find((o) => o.name === 'format');
      expect(formatOption!.type).toBe('string');
      expect(formatOption!.choices).toEqual(['md', 'json', 'yaml', 'txt']);

      const includeOption = mainCommand!.options.find((o) => o.name === 'include');
      expect(includeOption!.type).toBe('string[]');

      const maxSizeOption = mainCommand!.options.find((o) => o.name === 'maxSize');
      expect(maxSizeOption!.type).toBe('number');

      const stripCommentsOption = mainCommand!.options.find((o) => o.name === 'stripComments');
      expect(stripCommentsOption!.type).toBe('boolean');
    });

    it('includes history command options', () => {
      const schema = generateCliSchema();
      const historyCommand = schema.commands.find((c) => c.name === 'repo-roller history');

      expect(historyCommand).toBeDefined();
      const optionNames = historyCommand!.options.map((o) => o.name);

      expect(optionNames).toContain('list');
      expect(optionNames).toContain('show');
      expect(optionNames).toContain('diff');
      expect(optionNames).toContain('replay');
      expect(optionNames).toContain('export');
      expect(optionNames).toContain('stats');
      expect(optionNames).toContain('clear');
    });

    it('includes daemon command options', () => {
      const schema = generateCliSchema();
      const daemonCommand = schema.commands.find((c) => c.name === 'repo-roller daemon');

      expect(daemonCommand).toBeDefined();
      const optionNames = daemonCommand!.options.map((o) => o.name);

      expect(optionNames).toContain('start');
      expect(optionNames).toContain('stop');
      expect(optionNames).toContain('status');
      expect(optionNames).toContain('scan');
      expect(optionNames).toContain('bundle');
    });
  });

  describe('generateLlmToolDefinition', () => {
    it('returns a valid tool definition', () => {
      const tool = generateLlmToolDefinition();

      expect(tool.name).toBe('repo_roller_bundle');
      expect(tool.description).toContain('Bundle');
      expect(tool.input_schema.type).toBe('object');
    });

    it('includes all core properties', () => {
      const tool = generateLlmToolDefinition();
      const props = Object.keys(tool.input_schema.properties);

      expect(props).toContain('root');
      expect(props).toContain('preset');
      expect(props).toContain('include');
      expect(props).toContain('exclude');
      expect(props).toContain('format');
      expect(props).toContain('max_tokens');
      expect(props).toContain('model');
      expect(props).toContain('strip_comments');
      expect(props).toContain('with_tree');
      expect(props).toContain('with_stats');
    });

    it('defines property types correctly', () => {
      const tool = generateLlmToolDefinition();
      const props = tool.input_schema.properties;

      expect(props.root.type).toBe('string');
      expect(props.preset.type).toBe('string');
      expect(props.include.type).toBe('array');
      expect(props.include.items!.type).toBe('string');
      expect(props.format.type).toBe('string');
      expect(props.max_tokens.type).toBe('number');
      expect(props.strip_comments.type).toBe('boolean');
    });

    it('includes enum constraints', () => {
      const tool = generateLlmToolDefinition();
      const props = tool.input_schema.properties;

      expect(props.preset.enum).toBeDefined();
      expect(props.preset.enum!.length).toBeGreaterThan(0);

      expect(props.format.enum).toEqual(['md', 'json', 'yaml', 'txt']);

      expect(props.model.enum).toBeDefined();
      expect(props.model.enum!.length).toBeGreaterThan(0);
    });

    it('includes numeric constraints', () => {
      const tool = generateLlmToolDefinition();
      const props = tool.input_schema.properties;

      expect(props.max_tokens.minimum).toBe(1000);
      expect(props.max_tokens.maximum).toBe(10000000);
    });

    it('provides helpful examples', () => {
      const tool = generateLlmToolDefinition();
      const props = tool.input_schema.properties;

      expect(props.preset.examples).toBeDefined();
      expect(props.include.examples).toBeDefined();
      expect(props.exclude.examples).toBeDefined();
      expect(props.max_tokens.examples).toContain(50000);
    });

    it('has no required fields by default', () => {
      const tool = generateLlmToolDefinition();

      expect(tool.input_schema.required).toEqual([]);
    });

    it('includes default values', () => {
      const tool = generateLlmToolDefinition();
      const props = tool.input_schema.properties;

      expect(props.root.default).toBe('.');
      expect(props.format.default).toBe('md');
      expect(props.strip_comments.default).toBe(false);
      expect(props.with_tree.default).toBe(true);
      expect(props.with_stats.default).toBe(true);
    });
  });

  describe('generateShellCompletions', () => {
    describe('bash', () => {
      it('generates valid bash completion script', () => {
        const script = generateShellCompletions('bash');

        expect(script).toContain('# repo-roller bash completion');
        expect(script).toContain('_repo_roller_completions()');
        expect(script).toContain('complete -F _repo_roller_completions repo-roller');
      });

      it('includes option flags', () => {
        const script = generateShellCompletions('bash');

        // Uses first flag from each option definition
        expect(script).toContain('-f'); // --format
        expect(script).toContain('--preset');
        expect(script).toContain('-i'); // --include
      });

      it('provides format completions', () => {
        const script = generateShellCompletions('bash');

        expect(script).toContain('--format|-f');
        expect(script).toContain('compgen -W "md json yaml txt"');
      });

      it('provides sort mode completions', () => {
        const script = generateShellCompletions('bash');

        expect(script).toContain('--sort');
        expect(script).toContain('compgen -W "path size extension"');
      });

      it('provides preset completions', () => {
        const script = generateShellCompletions('bash');

        expect(script).toContain('--preset');
        expect(script).toContain('llm');
        expect(script).toContain('ts');
      });

      it('provides model completions', () => {
        const script = generateShellCompletions('bash');

        expect(script).toContain('--model');
      });

      it('falls back to directory completion', () => {
        const script = generateShellCompletions('bash');

        expect(script).toContain('compgen -d');
      });
    });

    describe('zsh', () => {
      it('generates valid zsh completion script', () => {
        const script = generateShellCompletions('zsh');

        expect(script).toContain('#compdef repo-roller');
        expect(script).toContain('_repo_roller()');
        expect(script).toContain('_arguments -s $options');
      });

      it('includes option descriptions', () => {
        const script = generateShellCompletions('zsh');

        expect(script).toContain('[');
        expect(script).toContain(']');
        expect(script).toMatch(/--\w+\[.+\]/);
      });
    });

    describe('fish', () => {
      it('generates valid fish completion script', () => {
        const script = generateShellCompletions('fish');

        expect(script).toContain('# repo-roller fish completions');
        expect(script).toContain('complete -c repo-roller');
      });

      it('includes long options', () => {
        const script = generateShellCompletions('fish');

        expect(script).toContain('-l format');
        expect(script).toContain('-l preset');
        expect(script).toContain('-l include');
      });

      it('includes short options where available', () => {
        const script = generateShellCompletions('fish');

        expect(script).toContain('-s o');
        expect(script).toContain('-s f');
        expect(script).toContain('-s i');
      });

      it('includes descriptions', () => {
        const script = generateShellCompletions('fish');

        expect(script).toMatch(/-d '.+'/);
      });

      it('includes choices for options', () => {
        const script = generateShellCompletions('fish');

        expect(script).toContain("-a 'md json yaml txt'");
      });
    });
  });

  describe('generateOpenApiDocs', () => {
    beforeEach(() => {
      vi.mock('../../src/core/config.js', () => ({
        loadConfig: vi.fn().mockResolvedValue(null),
        loadRepoRollerYml: vi.fn().mockResolvedValue(null),
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns valid OpenAPI 3.0 structure', async () => {
      const docs = await generateOpenApiDocs();

      expect(docs.openapi).toBe('3.0.3');
      expect(docs.info).toBeDefined();
      expect(docs.paths).toBeDefined();
    });

    it('includes project info', async () => {
      const docs = await generateOpenApiDocs();
      const info = docs.info as Record<string, unknown>;

      expect(info.title).toBe('repo-roller');
      expect(info.version).toBe('1.0.0');
      expect(info.description).toContain('LLM');
    });

    it('defines bundle endpoint', async () => {
      const docs = await generateOpenApiDocs();
      const paths = docs.paths as Record<string, Record<string, unknown>>;

      expect(paths['/bundle']).toBeDefined();
      expect(paths['/bundle'].post).toBeDefined();
    });

    it('includes request schema from LLM tool definition', async () => {
      const docs = await generateOpenApiDocs();
      const paths = docs.paths as Record<string, Record<string, unknown>>;
      const bundlePost = paths['/bundle'].post as Record<string, unknown>;
      const requestBody = bundlePost.requestBody as Record<string, unknown>;
      const content = requestBody.content as Record<string, unknown>;
      const json = content['application/json'] as Record<string, unknown>;
      const schema = json.schema as Record<string, Record<string, unknown>>;

      expect(schema.properties).toBeDefined();
      expect(schema.properties.root).toBeDefined();
      expect(schema.properties.preset).toBeDefined();
    });

    it('includes response schema', async () => {
      const docs = await generateOpenApiDocs();
      const paths = docs.paths as Record<string, Record<string, unknown>>;
      const bundlePost = paths['/bundle'].post as Record<string, unknown>;
      const responses = bundlePost.responses as Record<string, Record<string, unknown>>;
      const ok = responses['200'] as Record<string, unknown>;
      const content = ok.content as Record<string, unknown>;
      const json = content['application/json'] as Record<string, unknown>;
      const schema = json.schema as Record<string, Record<string, unknown>>;

      expect(schema.properties.outputFile).toBeDefined();
      expect(schema.properties.fileCount).toBeDefined();
      expect(schema.properties.estimatedTokens).toBeDefined();
      expect(schema.properties.cost).toBeDefined();
    });

    it('includes extension data with presets', async () => {
      const docs = await generateOpenApiDocs();
      const xConfig = docs['x-config'] as Record<string, unknown>;

      expect(xConfig.builtInPresets).toBeDefined();
      expect(Array.isArray(xConfig.builtInPresets)).toBe(true);
    });

    it('includes extension data with models', async () => {
      const docs = await generateOpenApiDocs();
      const xConfig = docs['x-config'] as Record<string, unknown>;

      expect(xConfig.models).toBeDefined();
      expect(Array.isArray(xConfig.models)).toBe(true);
    });

    it('includes component schemas', async () => {
      const docs = await generateOpenApiDocs();
      const components = docs.components as Record<string, Record<string, unknown>>;

      expect(components.schemas).toBeDefined();
      expect(components.schemas.Preset).toBeDefined();
    });
  });
});
