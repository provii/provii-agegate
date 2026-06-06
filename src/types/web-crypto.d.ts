/**
 * Type augmentation for SubtleCrypto.timingSafeEqual
 *
 * Available in Cloudflare Workers, Deno, and Node.js 20+.
 * Not yet in the default TypeScript DOM lib types.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/timingSafeEqual
 * @see https://developers.cloudflare.com/workers/runtime-apis/web-crypto/#subtlecryptotimingsafeequal
 */
interface SubtleCrypto {
  timingSafeEqual(
    a: ArrayBufferView | ArrayBuffer,
    b: ArrayBufferView | ArrayBuffer,
  ): boolean;
}
