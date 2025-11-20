# User Settings

repo-roller provides persistent user settings to customize your experience across all projects. Settings are stored globally in your home directory and apply as defaults unless overridden by command-line arguments or project configuration.

## Settings File Location

User settings are stored in:

```
~/.config/repo-roller/settings.json
```

This file is created automatically when you first modify a setting. It's a simple JSON file that you can view or edit directly.

## Settings Categories

### Display Settings

Control which information is shown in CLI output.

```json
{
  "displaySettings": {
    "showGenerationSummary": true,
    "showCodeComposition": true,
    "showContextFit": true,
    "showHealthHints": true,
    "showTokenWarnings": true,
    "showCostEstimates": true,
    "showRecommendations": true
  }
}
```

**Available display settings:**

| Setting | Default | Description |
|---------|---------|-------------|
| `showGenerationSummary` | `true` | Show summary after bundle generation |
| `showCodeComposition` | `true` | Show code composition by language |
| `showContextFit` | `true` | Show context window fit analysis |
| `showHealthHints` | `true` | Show health hints and suggestions |
| `showTokenWarnings` | `true` | Show token limit warnings |
| `showCostEstimates` | `true` | Show estimated costs |
| `showRecommendations` | `true` | Show optimization recommendations |

### Interactive Mode Settings

Default values for interactive TUI mode options.

```json
{
  "stripComments": false,
  "withTree": true,
  "withStats": true
}
```

**Interactive settings:**

| Setting | Default | Description |
|---------|---------|-------------|
| `stripComments` | `false` | Strip code comments by default |
| `withTree` | `true` | Include directory tree by default |
| `withStats` | `true` | Include statistics by default |

These settings are used as defaults in interactive mode, but can be changed per-generation through the TUI prompts.

### Filename Generation Settings

Customize how output filenames are automatically generated.

```json
{
  "filenameSettings": {
    "includeDate": true,
    "includeTime": false,
    "includeProjectName": true,
    "includeProfile": true,
    "includeGitContext": true,
    "includeTokenCount": false
  }
}
```

**Filename generation settings:**

| Setting | Default | Description |
|---------|---------|-------------|
| `includeDate` | `true` | Include date in filename (YYYY-MM-DD) |
| `includeTime` | `false` | Include time in filename |
| `includeProjectName` | `true` | Include project/repo name |
| `includeProfile` | `true` | Include profile name if used |
| `includeGitContext` | `true` | Include git branch/context |
| `includeTokenCount` | `false` | Include token count in filename |

These settings control the auto-generated filename format in both interactive and CLI modes. You can configure them through the interactive settings UI (`repo-roller settings`) or by editing the settings file directly.

**Advanced filename settings:**

For more control over filename generation, you can configure additional settings in the JSON file:

```json
{
  "filenameSettings": {
    "strategy": "smart",
    "datePosition": "suffix",
    "dateFormat": "YYYY-MM-DD",
    "timeFormat": "24h",
    "maxNestedFolders": 4,
    "maxFolderPaths": 3,
    "folderSeparator": "-",
    "pathSeparator": "dash",
    "customTemplate": "",
    "maxFilenameLength": 250,
    "preventCollisions": true
  }
}
```

See the [Filename Generation](#filename-generation) section for more details.

### Tree View State

Stores the expanded/collapsed state of directories in the file tree selector.

```json
{
  "treeViewState": {
    "expanded": ["src", "src/core", "src/cli"],
    "selected": ["src/core/index.ts"],
    "lastRoot": "/path/to/project"
  }
}
```

The tree state is automatically saved and restored when you return to the same project.

### Tree View Filter Presets

Control which file types are hidden in the interactive tree view.

```json
{
  "treeViewFilters": ["docs", "config", "build-output"]
}
```

**Available filter presets:**

| Preset ID | Description | Files Hidden |
|-----------|-------------|--------------|
| `tests` | Hide test files | `*.test.*`, `*.spec.*`, `__tests__/` |
| `docs` | Hide documentation | `*.md`, `docs/` |
| `config` | Hide config files | Config files, dotfiles |
| `build-output` | Hide build artifacts | `dist/`, `build/`, `.next/` |
| `assets` | Hide static assets | Images, fonts, media files |
| `dependencies` | Hide dependency files | `node_modules/`, `vendor/` |

**Quick access in tree view:**

Press `F` while in the interactive tree view to open the filter presets menu, where you can quickly toggle presets on/off.

**Keyboard shortcuts in filter menu:**
- `↑/↓` - Navigate presets
- `Space/Enter` - Toggle preset on/off
- `F/Esc` - Close filter menu

Filter presets help you focus on relevant files by temporarily hiding common file types you don't need to include in your bundle.

### Last Selected Files

Stores your most recent file selection for quick re-runs.

```json
{
  "lastSelectedFiles": {
    "files": ["src/index.ts", "src/core/types.ts"],
    "root": "/path/to/project",
    "timestamp": 1704067200000
  }
}
```

## Managing Settings

### Interactive Settings UI

Launch the interactive settings manager:

```bash
repo-roller settings
```

This opens a TUI where you can:
- Toggle display settings on/off
- View current settings values
- See real-time updates
- Save changes

**Keyboard shortcuts:**
- `↑/↓` - Navigate settings
- `Space` - Toggle setting on/off
- `Enter` - Save and exit
- `Esc` - Exit without saving

### View Current Settings

Display all current settings:

```bash
# View display settings
repo-roller settings show

# View all settings as JSON
repo-roller settings export
```

**Example output:**

```
Display Settings
────────────────────────────────────────────────────────────

  Current settings (stored in ~/.config/repo-roller/settings.json)
  ────────────────────────────────────────────────────────────

  ✓ Generation Summary     shown
  ✓ Code Composition       shown
  ✓ Context Fit            shown
  ✓ Health Hints           shown
  ✓ Token Warnings         shown
  ✓ Cost Estimates         shown
  ✓ Recommendations        shown
```

### Set Individual Settings

Modify specific display settings:

```bash
# Set a display setting
repo-roller settings set showCodeComposition true
repo-roller settings set showCostEstimates false

# Friendly aliases are supported
repo-roller settings set composition on
repo-roller settings set cost off
repo-roller settings set hints no
```

**Accepted values:**
- `true`, `false`
- `on`, `off`
- `yes`, `no`
- `1`, `0`

**Available aliases:**

| Alias | Maps to |
|-------|---------|
| `summary` | `showGenerationSummary` |
| `composition` | `showCodeComposition` |
| `context-fit` | `showContextFit` |
| `hints` | `showHealthHints` |
| `warnings` | `showTokenWarnings` |
| `cost` | `showCostEstimates` |
| `recommendations` | `showRecommendations` |

### Reset Settings

Reset settings to defaults:

```bash
# Reset only display settings
repo-roller settings reset

# Reset ALL settings (display + interactive + state)
repo-roller settings reset --all
```

**Default display settings:**

All display settings default to `true` (shown).

**Default interactive settings:**
- Strip comments: `false`
- Include tree: `true`
- Include stats: `true`

### Export and Import Settings

Export your settings to share with team or backup:

```bash
# Export to file
repo-roller settings export > my-settings.json

# Import from file
cat my-settings.json | repo-roller settings import
```

## CLI Override Flags

Command-line flags always override user settings:

```bash
# Hide specific displays (overrides settings)
repo-roller --hide-composition
repo-roller --hide-context-fit
repo-roller --hide-health-hints
repo-roller --hide-warnings
repo-roller --hide-cost
repo-roller --hide-recommendations

# Hide all UI summaries
repo-roller --quiet
```

## Configuration Priority

Settings are resolved in this order (highest to lowest priority):

1. **Command-line flags** - Explicit CLI arguments
2. **Profile settings** - From `.reporoller.yml` (if `--profile` specified)
3. **Preset settings** - From config or built-in (if `--preset` specified)
4. **User settings** - `~/.config/repo-roller/settings.json`
5. **Defaults** - Built-in defaults

## Use Cases

### Minimal Output by Default

Disable all display options for minimal, script-friendly output:

```bash
repo-roller settings set showCodeComposition false
repo-roller settings set showContextFit false
repo-roller settings set showHealthHints false
repo-roller settings set showTokenWarnings false
repo-roller settings set showCostEstimates false
repo-roller settings set showRecommendations false
```

Or use the `--quiet` flag when needed without changing settings.

### Always Strip Comments

Set interactive mode to strip comments by default:

```json
{
  "stripComments": true,
  "withTree": true,
  "withStats": true
}
```

Edit settings file manually or set via interactive mode.

### Team Settings Sync

Share settings across your team:

```bash
# On your machine
repo-roller settings export > team-settings.json

# Commit to repo
git add team-settings.json
git commit -m "Add team repo-roller settings"

# On teammate's machine
curl https://your-repo/team-settings.json | repo-roller settings import
```

### CI/CD Settings

For CI/CD environments, create minimal settings:

```json
{
  "displaySettings": {
    "showGenerationSummary": false,
    "showCodeComposition": false,
    "showContextFit": false,
    "showHealthHints": false,
    "showTokenWarnings": true,
    "showCostEstimates": false,
    "showRecommendations": false
  }
}
```

Only warnings are shown, keeping logs clean.

## Troubleshooting

### Settings Not Persisting

**Problem:** Changes to settings don't persist

**Solution:** Check file permissions:

```bash
ls -la ~/.config/repo-roller/settings.json
chmod 644 ~/.config/repo-roller/settings.json
```

### Corrupted Settings File

**Problem:** Error reading settings file

**Solution:** Reset settings:

```bash
rm ~/.config/repo-roller/settings.json
repo-roller settings reset --all
```

repo-roller will warn you if the settings file is corrupted and use defaults.

### Settings Not Applied

**Problem:** Settings don't seem to apply

**Solution:** Check configuration priority. CLI flags and presets override user settings. Use `--verbose` to see effective configuration:

```bash
repo-roller --verbose
```

### Find Settings File

**Problem:** Can't find settings file location

**Solution:** Display the path:

```bash
repo-roller settings path
```

Or:

```bash
echo ~/.config/repo-roller/settings.json
```

## Advanced Configuration

### Manual Editing

You can edit the settings file directly with your favorite editor:

```bash
# Open in default editor
${EDITOR:-nano} ~/.config/repo-roller/settings.json

# Validate after editing
repo-roller settings show
```

**Example settings file:**

```json
{
  "displaySettings": {
    "showGenerationSummary": true,
    "showCodeComposition": true,
    "showContextFit": false,
    "showHealthHints": true,
    "showTokenWarnings": true,
    "showCostEstimates": true,
    "showRecommendations": false
  },
  "stripComments": true,
  "withTree": true,
  "withStats": false,
  "treeViewState": {
    "expanded": ["src", "src/core"],
    "lastRoot": "/home/user/my-project"
  },
  "lastSelectedFiles": {
    "files": ["src/index.ts", "src/core/types.ts"],
    "root": "/home/user/my-project",
    "timestamp": 1704067200000
  }
}
```

### Environment Variables

While user settings are stored in `settings.json`, you can use environment variables for temporary overrides:

```bash
# These affect configuration, not display settings
export REPO_ROLLER_TARGET=claude-3.5-sonnet
export NO_COLOR=1  # Disable color output
```

## Best Practices

### 1. Set Display Preferences Early

Configure your display preferences when you first install repo-roller:

```bash
repo-roller settings
```

### 2. Use Settings for Preferences, Flags for Overrides

Use settings for your normal workflow, and CLI flags for one-off changes:

```bash
# Your setting: showCodeComposition = true
# One-time override:
repo-roller --hide-composition
```

### 3. Export Settings Before Major Changes

Backup before experimenting:

```bash
repo-roller settings export > backup.json
# Experiment...
# If needed:
repo-roller settings import < backup.json
```

### 4. Keep Settings Minimal

Only configure settings that differ from defaults. This makes it easier to adopt new defaults in future versions.

### 5. Document Team Settings

If sharing settings with your team, document why certain options are set:

```json
{
  "displaySettings": {
    "showCodeComposition": true,
    "showCostEstimates": true
  }
  // ^ We track composition and cost for budgeting
}
```

## Related Documentation

- **[Configuration](/guide/configuration)** - Project-level configuration
- **[Interactive Mode](/guide/interactive-mode)** - Interactive TUI features
- **[CLI Reference](/cli/)** - All command-line options
- **[Presets](/guide/presets)** - Pre-configured option sets

## Next Steps

Now that you understand user settings:

- **Try the interactive settings UI** - `repo-roller settings`
- **Configure your display preferences** - Hide information you don't need
- **Set interactive mode defaults** - Customize TUI behavior
- **Explore project configuration** - Learn about `.reporoller.yml`
