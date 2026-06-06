/**
 * Custom JSDOM environment that exposes reconfigureJSDOM() for tests
 * that need to change window.location (which JSDOM makes non-configurable).
 *
 * Usage in test files:
 *   declare const reconfigureJSDOM: (options: { url: string }) => void;
 *   reconfigureJSDOM({ url: 'https://example.net/' });
 *   // window.location.href is now 'https://example.net/'
 */
const JSDOMEnvironment = require('jest-environment-jsdom').TestEnvironment;

class ConfigurableJSDOMEnvironment extends JSDOMEnvironment {
  async setup() {
    await super.setup();
    // Expose JSDOM's reconfigure method so tests can change the URL
    this.global.reconfigureJSDOM = (options) => {
      this.dom.reconfigure(options);
    };
  }
}

module.exports = ConfigurableJSDOMEnvironment;
