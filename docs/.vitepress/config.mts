import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "repo-roller",
  description: "Aggregate source code files from a repository into a single, optimized output file for LLMs",
  base: '/repo-roller/',

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'CLI', link: '/cli/' },
      {
        text: 'v1.0.0',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'Contributing', link: '/contributing' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is repo-roller?', link: '/guide/what-is-repo-roller' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Why repo-roller?', link: '/guide/why-repo-roller' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'File Scanning', link: '/guide/file-scanning' },
            { text: 'Output Formats', link: '/guide/output-formats' },
            { text: 'Token Estimation', link: '/guide/token-estimation' },
            { text: 'Budget Management', link: '/guide/budget-management' }
          ]
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Configuration Files', link: '/guide/configuration' },
            { text: 'Presets', link: '/guide/presets' },
            { text: 'Profiles', link: '/guide/profiles' },
            { text: 'User Settings', link: '/guide/user-settings' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Interactive Mode', link: '/guide/interactive-mode' },
            { text: 'History & Tracking', link: '/guide/history' },
            { text: 'Daemon Mode', link: '/guide/daemon-mode' },
            { text: 'Git Integration', link: '/guide/git-integration' }
          ]
        },
        {
          text: 'Examples',
          items: [
            { text: 'Common Use Cases', link: '/guide/examples' },
            { text: 'LLM Workflows', link: '/guide/llm-workflows' },
            { text: 'CI/CD Integration', link: '/guide/ci-cd' }
          ]
        }
      ],
      '/cli/': [
        {
          text: 'CLI Reference',
          items: [
            { text: 'Overview', link: '/cli/' },
            { text: 'Output Options', link: '/cli/output-options' },
            { text: 'File Selection', link: '/cli/file-selection' },
            { text: 'Content Options', link: '/cli/content-options' },
            { text: 'Token Management', link: '/cli/token-management' },
            { text: 'Display Control', link: '/cli/display-control' },
            { text: 'Modes', link: '/cli/modes' },
            { text: 'Git Commands', link: '/cli/git-commands' },
            { text: 'Utility Commands', link: '/cli/utility-commands' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'File Scanning', link: '/api/scanning' },
            { text: 'Rendering', link: '/api/rendering' },
            { text: 'Token Estimation', link: '/api/tokens' },
            { text: 'Budget Management', link: '/api/budget' },
            { text: 'Configuration', link: '/api/configuration' },
            { text: 'Validation', link: '/api/validation' },
            { text: 'History', link: '/api/history' },
            { text: 'Schema & Introspection', link: '/api/schema' },
            { text: 'Types', link: '/api/types' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/maikeleckelboom/repo-roller' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Maikel Eckelboom'
    },

    editLink: {
      pattern: 'https://github.com/maikeleckelboom/repo-roller/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true
  }
})
