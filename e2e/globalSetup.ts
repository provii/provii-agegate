// e2e/globalSetup.ts
import { createServer } from "./stub-server.js";
export default async function globalSetup() {
  const { server, port } = await createServer();
  process.env["E2E_PORT"] = String(port);
  (global as any).__E2E_SERVER__ = server;
}
