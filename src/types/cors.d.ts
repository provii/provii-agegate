/**
 * Stub type declaration for the `cors` npm package.
 *
 * The e2e stub server uses `cors` as Express middleware. This declaration
 * provides enough type information to satisfy the compiler without
 * installing `@types/cors` as a dev dependency.
 */
declare module "cors" {
  import type { RequestHandler } from "express";
  function cors(options?: Record<string, unknown>): RequestHandler;
  export default cors;
}
