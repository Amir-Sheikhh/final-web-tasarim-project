import js from "@eslint/js";
import globals from "globals";

const sharedRules = {
  ...js.configs.recommended.rules,
  "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }]
};

export default [
  {
    ignores: [
      "node_modules/**",
      "neo4j-runtime/**",
      "public/uploads/**",
      "docs/report-assets/**",
      "docs/rendered-report/**",
      "docs/manual-pdf/**",
      "docs/image-render-tests/**",
      "docs/docx-media/**"
    ]
  },
  {
    files: ["src/**/*.js", "scripts/**/*.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: sharedRules
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        cytoscape: "readonly"
      }
    },
    rules: sharedRules
  }
];
