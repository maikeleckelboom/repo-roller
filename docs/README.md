# repo-roller Documentation

This directory contains the VitePress documentation for repo-roller.

## Development

Start the development server:

```bash
npm run docs:dev
```

The docs will be available at `http://localhost:5173/repo-roller/`

## Building

Build the documentation for production:

```bash
npm run docs:build
```

## Preview

Preview the production build:

```bash
npm run docs:preview
```

## Structure

```
docs/
├── .vitepress/
│   └── config.mts          # VitePress configuration
├── public/
│   └── logo.svg            # Site logo
├── index.md                # Home page
├── guide/                  # User guides
│   ├── getting-started.md
│   ├── what-is-repo-roller.md
│   ├── why-repo-roller.md
│   ├── configuration.md
│   ├── presets.md
│   ├── token-estimation.md
│   ├── budget-management.md
│   └── examples.md
├── cli/                    # CLI reference
│   ├── index.md
│   ├── output-options.md
│   ├── file-selection.md
│   └── token-management.md
└── api/                    # API reference
    └── index.md
```

## Contributing

When adding new documentation:

1. Create the markdown file in the appropriate directory
2. Update `.vitepress/config.mts` to add navigation entries
3. Follow the existing structure and style
4. Test locally with `npm run docs:dev`

## Deployment

The documentation can be deployed to:

- **GitHub Pages** - Automatic via GitHub Actions
- **Netlify** - Deploy the `docs/.vitepress/dist` directory
- **Vercel** - Connect your repository and set build command

See [VitePress deployment guide](https://vitepress.dev/guide/deploy) for details.
