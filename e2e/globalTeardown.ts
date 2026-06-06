// e2e/globalTeardown.ts
export default async function globalTeardown() {
  await new Promise<void>((resolve) =>
    (global as any).__E2E_SERVER__?.close(() => resolve()),
  );
}
