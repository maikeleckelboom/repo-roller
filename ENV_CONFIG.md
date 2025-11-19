# Environment Configuration Guide

Repo Roller now supports comprehensive environment-based configuration via `.env` files. This allows developers to customize default settings, UI behavior, token estimation, LLM pricing, and more without modifying code.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` to customize your settings:
   ```bash
   # Example: Change interactive UI max height
   INTERACTIVE_MAX_HEIGHT_PERCENTAGE=0.75

   # Example: Customize tree colors
   TREE_COLOR_FOLDER=magentaBright
   TREE_COLOR_TYPESCRIPT=cyanBright
   ```

3. Run the application - settings are automatically loaded:
   ```bash
   npm run dev
   ```

## Configuration Categories

### Interactive UI Settings

Control the behavior and appearance of the interactive terminal UI:

```bash
# Maximum height of interactive view as percentage (0.0 to 1.0)
INTERACTIVE_MAX_HEIGHT_PERCENTAGE=0.90

# Cursor blink interval in milliseconds
CURSOR_BLINK_INTERVAL=500

# Reserved lines for headers/footers
INTERACTIVE_RESERVED_LINES=6

# Buffer for terminal overlays (e.g., Warp sticky header)
INTERACTIVE_TERMINAL_OVERLAY_BUFFER=10

# Minimum visible rows in tree view
INTERACTIVE_MIN_VISIBLE_ROWS=5
```

### Tree View Styling

Customize the appearance of the file tree:

#### Colors
```bash
# All colors use ANSI color names
# Available: black, red, green, yellow, blue, magenta, cyan, white
# Add 'Bright' suffix for bright variants (e.g., greenBright)
# Use 'gray' for dim text

TREE_COLOR_FOLDER=blueBright
TREE_COLOR_TYPESCRIPT=blue
TREE_COLOR_JAVASCRIPT=yellow
TREE_COLOR_TEST=magentaBright
TREE_COLOR_DOC=cyanBright
TREE_COLOR_CONFIG=gray
TREE_COLOR_SELECTED=greenBright
TREE_COLOR_CURSOR=cyanBright
```

#### Markers (Unicode Symbols)
```bash
TREE_MARKER_SELECTED=◉
TREE_MARKER_UNSELECTED=○
TREE_MARKER_PARTIAL=◐
TREE_MARKER_EXPANDED=⌄
TREE_MARKER_COLLAPSED=›
```

#### Branch Characters
```bash
TREE_BRANCH_VERTICAL=│
TREE_BRANCH_TEE=├
TREE_BRANCH_CORNER=└
TREE_BRANCH_HORIZONTAL=─
```

#### Column Widths
```bash
TREE_COLUMN_SELECTION=3
TREE_COLUMN_EXPAND=2
TREE_COLUMN_ICON=3
TREE_COLUMN_HINT=8
```

### Token Estimation

Fine-tune the token counting algorithm:

```bash
# Base characters per token ratio
TOKEN_CHARS_PER_TOKEN=4.0

# Large content threshold for simplified estimation
TOKEN_LARGE_CONTENT_THRESHOLD=100000

# Whitespace density thresholds (0.0 to 1.0)
TOKEN_WHITESPACE_HIGH=0.30
TOKEN_WHITESPACE_MEDIUM=0.25
TOKEN_WHITESPACE_LOW=0.20

# Symbol density thresholds
TOKEN_SYMBOL_VERY_HIGH=0.35
TOKEN_SYMBOL_HIGH=0.25
TOKEN_SYMBOL_MEDIUM=0.20

# Correction factors (multipliers)
TOKEN_WHITESPACE_CORRECTION_HIGH=0.85
TOKEN_SYMBOL_CORRECTION_VERY_HIGH=1.25
```

### LLM Provider Pricing

Update pricing for LLM providers (costs per million tokens):

```bash
# Claude 3.5 Sonnet
LLM_CLAUDE_SONNET_CONTEXT_WINDOW=200000
LLM_CLAUDE_SONNET_INPUT_COST_PER_MILLION=3.0
LLM_CLAUDE_SONNET_OUTPUT_COST_PER_MILLION=15.0

# GPT-4o
LLM_GPT4O_CONTEXT_WINDOW=128000
LLM_GPT4O_INPUT_COST_PER_MILLION=2.50
LLM_GPT4O_OUTPUT_COST_PER_MILLION=10.0

# See .env.example for all providers
```

### Model Presets

Configure model presets with safety margins:

```bash
# Claude 3.5 Sonnet
MODEL_CLAUDE35_SONNET_CONTEXT_LIMIT=200000
MODEL_CLAUDE35_SONNET_SAFETY_MARGIN=0.75
MODEL_CLAUDE35_SONNET_INPUT_COST_PER_MILLION=3.0
MODEL_CLAUDE35_SONNET_OUTPUT_COST_PER_MILLION=15.0
```

### Default Configuration

Set default behavior for the CLI:

```bash
# File size limit (1MB default)
DEFAULT_MAX_FILE_SIZE_BYTES=1048576

# Max nested folders for smart naming
DEFAULT_MAX_NESTED_FOLDERS=4

# Default output settings
DEFAULT_OUTPUT_FILE=source_code.md
DEFAULT_OUTPUT_FORMAT=md
DEFAULT_PROFILE=llm-context

# Default features
DEFAULT_STRIP_COMMENTS=false
DEFAULT_WITH_TREE=true
DEFAULT_WITH_STATS=true
DEFAULT_TOKEN_COUNT=true

# Display settings
DEFAULT_SHOW_GENERATION_SUMMARY=true
DEFAULT_SHOW_CODE_COMPOSITION=true
DEFAULT_SHOW_CONTEXT_FIT=true
DEFAULT_SHOW_COST_ESTIMATES=true
```

## How It Works

### Architecture

1. **Environment Loading**: The `src/core/env.ts` module uses `dotenv` to load `.env` files from the project root
2. **Type-Safe Configuration**: All settings are parsed with proper type safety (string, number, boolean)
3. **Fallback Defaults**: If a setting is not in `.env`, sensible defaults are used
4. **Single Source of Truth**: All configurable values are centralized in `env.ts`

### Usage in Code

Import and use environment configuration in your code:

```typescript
import { env } from './core/env.js';

// Interactive UI settings
const maxHeight = env.interactive.maxHeightPercentage;
const blinkInterval = env.interactive.cursorBlinkInterval;

// Tree theme colors
const folderColor = env.treeTheme.colors.folder;
const selectedColor = env.treeTheme.colors.selected;

// Token estimation
const charsPerToken = env.tokenEstimation.charsPerToken;

// LLM providers
const claudePricing = env.llmProviders.claudeSonnet;
const gpt4Pricing = env.llmProviders.gpt4o;

// Defaults
const maxFileSize = env.defaults.maxFileSizeBytes;
```

### Helper Functions

The `env.ts` module provides helper functions for parsing:

- `getEnv(key, default)` - Get string value
- `getEnvNumber(key, default)` - Get numeric value
- `getEnvBoolean(key, default)` - Get boolean value (accepts 'true', '1', etc.)

## Best Practices

1. **Never commit `.env` files**: The `.env` file is gitignored and should contain local overrides
2. **Keep `.env.example` updated**: Document all available settings in `.env.example`
3. **Use sensible defaults**: The application should work without a `.env` file
4. **Validate values**: The env module handles type conversion and provides defaults
5. **Document changes**: Update this file when adding new configuration options

## Common Use Cases

### Adjust Interactive UI Height

If the interactive mode takes up too much screen space:

```bash
# Reduce from 90% to 70%
INTERACTIVE_MAX_HEIGHT_PERCENTAGE=0.70
```

### Customize Tree Appearance

Create a custom color scheme:

```bash
TREE_COLOR_FOLDER=magenta
TREE_COLOR_TYPESCRIPT=cyan
TREE_COLOR_JAVASCRIPT=yellow
TREE_COLOR_SELECTED=greenBright
TREE_COLOR_CURSOR=white
```

### Update LLM Pricing

When providers change their pricing:

```bash
# Update Claude Sonnet pricing
LLM_CLAUDE_SONNET_INPUT_COST_PER_MILLION=2.50
LLM_CLAUDE_SONNET_OUTPUT_COST_PER_MILLION=12.50
```

### Change Default Behavior

Set different defaults for your workflow:

```bash
DEFAULT_STRIP_COMMENTS=true
DEFAULT_WITH_TREE=false
DEFAULT_OUTPUT_FORMAT=json
DEFAULT_MAX_FILE_SIZE_BYTES=524288  # 512KB instead of 1MB
```

## Troubleshooting

### Settings not being applied

1. Check that your `.env` file is in the project root (same directory as `package.json`)
2. Restart the application after changing `.env`
3. Verify the setting name matches exactly (case-sensitive)
4. Check for syntax errors in `.env` (no spaces around `=`)

### Type errors

All environment variables are strings by default. The `env.ts` module handles conversion:

- Numbers: `getEnvNumber()` parses floats and returns the default if invalid
- Booleans: `getEnvBoolean()` accepts `'true'`, `'1'`, `'false'`, `'0'`
- Strings: `getEnv()` returns the value as-is

### Debugging

To see what values are being loaded:

```typescript
import { env } from './core/env.js';
console.log('Interactive max height:', env.interactive.maxHeightPercentage);
console.log('Tree folder color:', env.treeTheme.colors.folder);
```

## Contributing

When adding new configuration options:

1. Add the environment variable to `.env.example` with documentation
2. Add parsing logic to `src/core/env.ts` with proper type and default
3. Update this documentation with the new option
4. Use the configuration in your code via `env.*`

## See Also

- [dotenv documentation](https://github.com/motdotla/dotenv)
- Main README for general usage
- `.env.example` for all available settings
