import { defineConfig } from "tsup";

export default defineConfig([
  // CLI entry point (shebang is in source file)
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    target: "node18",
    platform: "node",
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
    minify: false,
    external: [
      "react",
      "ink",
      "ink-tree-select",
      "@inquirer/prompts",
      "commander",
      "chalk",
      "fast-glob",
      "ignore",
      "minimatch",
      "js-yaml",
    ],
    esbuildOptions(options) {
      options.jsx = "transform";
      options.jsxFactory = "React.createElement";
      options.jsxFragment = "React.Fragment";
    },
  },
  // Library entry point (no shebang)
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    target: "node18",
    platform: "node",
    dts: true,
    sourcemap: true,
    clean: false, // Don't clean again, preserve cli.js
    splitting: false,
    treeshake: true,
    minify: false,
    external: [
      "react",
      "ink",
      "ink-tree-select",
      "@inquirer/prompts",
      "commander",
      "chalk",
      "fast-glob",
      "ignore",
      "minimatch",
      "js-yaml",
    ],
    esbuildOptions(options) {
      options.jsx = "transform";
      options.jsxFactory = "React.createElement";
      options.jsxFragment = "React.Fragment";
    },
  },
]);
