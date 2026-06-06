/** @type {import('@stryker-mutator/api/core').StrictConfig} */
export default {
  mutate: [
    'src/**/*.ts',
    '!src/api/**/*'
  ],

  // keep E2E, docs, examples, reports out of the sandbox
  ignorePatterns: ['e2e/**', 'docs/**', 'examples/**', 'scripts/**', 'reports/**'],

  /* ---------- Jest runner --------------------------------------------- */
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.cjs',
  },

  /* ---------- TypeScript checker -------------------------------------- */
  // Temporarily disabled to speed up mutation testing
  // checkers: ['typescript'],
  // tsconfigFile: 'tsconfig.build.json',

  /* ---------- Misc ---------------------------------------------------- */
  reporters: ['progress', 'clear-text', 'html'],
  concurrency: 1,
  // 'off' avoids the jest-env/jsdom wrapper compatibility issue with
  // Stryker v9 + jest-environment-jsdom. Runs all tests for every mutant
  // (slower but reliable).
  coverageAnalysis: 'off',
  /**
   * Incremental mode caches the previous run's mutant outcomes against
   * a file digest, then on the next run only re-mutates files whose
   * digest changed plus their dependents. First run on a clean cache
   * mutates everything; subsequent runs (PRs, repeat CI on main)
   * finish in single-digit minutes for typical change sets.
   *
   * The cache file lives under reports/ so the CI cache action can
   * persist it between runs without competing with .stryker-tmp,
   * which Stryker rebuilds on every run.
   */
  incrementalFile: 'reports/stryker-incremental.json',
  thresholds: { high: 80, low: 70, break: 70 }
};
