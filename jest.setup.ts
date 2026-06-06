import { TextEncoder, TextDecoder } from 'util';
import { webcrypto } from 'node:crypto';
import 'whatwg-fetch'; // polyfill fetch/Headers/Request/Response for JSDOM
// Make TextEncoder/Decoder available (JSDOM 22+ removed them from Node global)
(globalThis as any).TextEncoder = TextEncoder;
(globalThis as any).TextDecoder = TextDecoder;
// Polyfill Web Crypto API (SubtleCrypto) for JSDOM environment
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
/* Provide a minimal window.matchMedia mock so tests that branch on it don't explode */
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      // deprecated addListener/removeListener – keep for legacy libs
      addListener: () => void 0,
      removeListener: () => void 0,
      // modern event listeners
      addEventListener: () => void 0,
      removeEventListener: () => void 0,
      onchange: null,
      dispatchEvent: () => false,
    }),
  });
}
/* Optional: stub window.alert so it doesn't explode in Node */
if (!(global as any).alert) {
  (global as any).alert = jest.fn();
}
/* Silence the JSDOM "navigation not implemented" console.error spam */
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'object' &&
    (args[0] as Error & { type?: string }).type === 'not implemented'
  ) {
    return; // swallow expected JSDOM navigation error
  }
  originalError(...args);
};