// Jest config for Stryker mutation testing.
// Identical to jest.config.cjs but uses Stryker's wrapped jsdom environment
// so per-test coverage collection works correctly.
const baseConfig = require('./jest.config.cjs');

module.exports = {
  ...baseConfig,
  testEnvironment: '@stryker-mutator/jest-runner/dist/src/jest-plugins/jest-environment-jsdom.cjs',
};
