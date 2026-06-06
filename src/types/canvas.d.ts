/**
 * Stub type declaration for the `canvas` npm package.
 *
 * The `qr-code-styling` library references `canvas` in its type definitions
 * for server-side (Node.js) rendering. In this browser-only SDK the native
 * `canvas` package is never installed or used; this stub satisfies the
 * TypeScript compiler when `skipLibCheck` is false.
 */
declare module "canvas" {
  export class Canvas {}
  export class Image {}
}
