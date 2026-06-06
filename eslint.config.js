// eslint.config.js
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";
import jestPlugin from "eslint-plugin-jest";
import globals from "globals";

export default defineConfig([
  // 0. Ignore build and compiled test artefacts
  {
    ignores: ["dist/**", "dist-cjs/**", "demo/**", "node_modules/**", "tests/**/*.js", "tests/**/*.d.ts"],
  },

  // 1. Core JavaScript rules
  js.configs.recommended,

  // 2. TypeScript + project rules
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      security,
      sonarjs,
      jest: jestPlugin,
    },
    languageOptions: {
      // Use TS parser for .ts/.tsx to correctly parse TS syntax
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        es2022: "readonly",
      },
    },
    rules: {
      // Pull in TS plugin's "no-type-checking" recommended rules
      ...tsPlugin.configs.recommended.rules,

      // Project-specific adjustments
      "security/detect-object-injection": "off",
      "sonarjs/no-duplicate-string": "warn",
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",
      "jest/consistent-test-it": ["warn", { fn: "test", withinDescribe: "it" }],

      // 2.a Disable no-undef for TS: TS compiler handles globals & types
      "no-undef": "off",

      // 2.b Suppress irregular-whitespace in TS (clean manually as needed)
      "no-irregular-whitespace": "off",

      // 2.c Relax rules for existing codebase - can be tightened later
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_|^err$|^e$"
      }],
      "@typescript-eslint/ban-ts-comment": "warn",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  // 3. Override for config files (CommonJS / Node)
  {
    files: ["**/*.cjs", "*.config.{js,cjs,mjs}"],
    languageOptions: {
      globals: { module: "readonly", require: "readonly" },
      parserOptions: { sourceType: "script" },
    },
    rules: {
      "no-undef": "off",
    },
  },

  // 4. Relax rules in E2E and test setup
  {
    files: ["**/e2e/**/*.ts", "**/*.test.ts", "**/*.spec.ts", "**/jest.setup.ts"],
    rules: {
      // Allow explicit anys for stubbing
      "@typescript-eslint/no-explicit-any": "off",
      // Allow non-null assertions in tests for readability
      "@typescript-eslint/no-non-null-assertion": "off",
      // Ignore unused vars like `config` in setup/teardown
      "@typescript-eslint/no-unused-vars": "off",
      // Allow constant expressions in tests (intentional test cases)
      "no-constant-binary-expression": "off",
      // Allow this-aliasing in mocks (e.g. capturing instance in constructor)
      "@typescript-eslint/no-this-alias": "off",
    },
  },
]);
