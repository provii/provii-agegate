// e2e/stub-server.ts - v1 API stub server for testing
//
// Mirrors the v1 provii-verifier wire shape (POST /v1/hosted/challenge,
// GET /v1/hosted/status/:sid, POST /v1/hosted/redeem/:sid, GET
// /v1/hosted/session/check) so the SDK's HostedBackendClient can drive
// the demo end-to-end without any wire-level adapters. Admin endpoints
// (/admin/expire, /admin/revoke, /admin/set-state) let session-state
// e2e specs force transitions out-of-band.
import express from "express";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");

const app = express();

// Inline CORS middleware (no external dependency)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Public-Key, Idempotency-Key, Origin",
  );
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});
app.use(express.json());

// Serve dist's agegate.browser.js when the demo HTML asks for it. This
// route MUST be registered before the static middleware below, otherwise
// any stale `demo/agegate.browser.js` (the build:demo script writes one)
// shadows the freshly-built bundle in dist/ and the SDK under test
// doesn't include the latest source. e2e was silently running an old
// bundle for weeks because of this.
app.get("/examples/demo/agegate.browser.js", (_req, res) => {
  res.sendFile(resolve(REPO_ROOT, "dist", "agegate.browser.js"));
});
// The demo's <script type="module"> imports the ESM bundle. Same routing
// trick as the IIFE bundle above so the test always exercises whatever
// dist/agegate.esm.js esbuild just produced.
app.get("/examples/demo/agegate.esm.js", (_req, res) => {
  res.set("Content-Type", "application/javascript");
  res.sendFile(resolve(REPO_ROOT, "dist", "agegate.esm.js"));
});
// Serve other demo static assets (HTML, CSS) from disk.
app.use("/examples/demo", express.static(resolve(REPO_ROOT, "demo")));
app.use("/dist", express.static(resolve(REPO_ROOT, "dist")));

// "/content" lands here when the SDK redirects after a successful
// verification. The redirect target is configurable via AgeGateConfig
// .contentUrl; the demo points at /content. The demo itself is at
// /examples/demo/index.html, but the contentUrl is bare /content so the
// final URL the spec asserts on is just `${origin}/content`.
app.get("/content", (_req, res) => {
  res
    .status(200)
    .type("html")
    .send("<!doctype html><title>Verified content</title><h1>Verified.</h1>");
});

interface ChallengeRecord {
  challenge_id: string;
  rp_challenge: string;
  cutoff_days: number;
  verifying_key_id: number;
  submit_secret: string;
  short_code: string;
  expires_at_unix: number;
  status_url: string;
  verify_url: string;
  qr_code_url: string;
  code_challenge: string;
  poll_count: number;
  status:
    | "pending"
    | "proof_ok_waiting_for_redeem"
    | "verified"
    | "expired"
    | "failed"
    | "revoked";
}

// Store active challenges
const challenges = new Map<string, ChallengeRecord>();

const FIXED_CHALLENGE_ID = "00000000-0000-4000-8000-000000000000";

function originBase(req: Request): string {
  const port = req.socket.localPort ?? 3001;
  return `http://localhost:${port}`;
}

function isoExpiry(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

// Optional pre-flight session check the SDK fires in parallel with
// challenge creation. The provii-verifier returns either { verified:
// false } or { verified: true, session: {...} }; the stub always
// reports unverified so the verification flow is the one under test.
app.get("/v1/hosted/session/check", (_req, res) => {
  res.json({ verified: false });
});

// POST /v1/hosted/challenge - Create new challenge
app.post("/v1/hosted/challenge", (req, res) => {
  const { code_challenge, method } = req.body ?? {};
  if (!code_challenge || (method && method !== "S256")) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const challenge_id = FIXED_CHALLENGE_ID;
  const expires_at_unix = Math.floor(Date.now() / 1000) + 300;
  const base = originBase(req);

  const record: ChallengeRecord = {
    challenge_id,
    rp_challenge: "A".repeat(43),
    cutoff_days: 6570,
    verifying_key_id: 2,
    submit_secret: "B".repeat(43),
    short_code: "123456789012",
    expires_at_unix,
    status_url: `${base}/v1/hosted/status/${challenge_id}`,
    verify_url: `${base}/v1/hosted/verify/${challenge_id}`,
    qr_code_url: `${base}/v1/hosted/qr/${challenge_id}.png`,
    code_challenge,
    poll_count: 0,
    status: "pending",
  };
  challenges.set(challenge_id, record);

  res.json({
    challenge_id: record.challenge_id,
    session_id: record.challenge_id,
    short_code: record.short_code,
    rp_challenge: record.rp_challenge,
    cutoff_days: record.cutoff_days,
    verifying_key_id: record.verifying_key_id,
    submit_secret: record.submit_secret,
    expires_at: record.expires_at_unix,
    status_url: record.status_url,
    verify_url: record.verify_url,
    qr_code_url: record.qr_code_url,
    proof_direction: "over_age",
  });
});

// GET /v1/hosted/status/:session_id - Poll status
app.get("/v1/hosted/status/:sid", (req, res) => {
  const record = challenges.get(req.params["sid"]);
  if (!record) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  // Server-driven expiry (separate from /admin/expire).
  if (record.expires_at_unix < Math.floor(Date.now() / 1000)) {
    record.status = "expired";
  }

  if (record.status === "revoked") {
    res.json({
      status: "failed",
      expires_at: isoExpiry(record.expires_at_unix),
      reason: "BANNED",
    });
    return;
  }

  // Auto-progress the happy path: pending → proof_ok_waiting_for_redeem
  // after the third poll, then the SDK redeems and we transition to
  // verified.
  if (record.status === "pending") {
    record.poll_count += 1;
    if (record.poll_count >= 3) {
      record.status = "proof_ok_waiting_for_redeem";
    }
  }

  res.json({
    status: record.status,
    expires_at: isoExpiry(record.expires_at_unix),
    ...(record.status === "expired" ? { reason: "EXPIRED" } : {}),
  });
});

// POST /v1/hosted/redeem/:session_id - Exchange PKCE verifier for session
app.post("/v1/hosted/redeem/:sid", (req, res) => {
  const record = challenges.get(req.params["sid"]);
  if (!record) {
    return res.status(404).json({ error: "Challenge not found" });
  }
  const { code_verifier } = req.body ?? {};
  if (!code_verifier) {
    return res.status(400).json({ error: "Missing code_verifier" });
  }
  // The stub doesn't verify PKCE , any non-empty verifier is accepted ,
  // because the SDK's PKCE pair lives in sessionStorage and a real
  // SHA-256 round-trip would require the same code_verifier the SDK
  // generated, which we don't have access to from the server side.
  record.status = "verified";
  // Emit an HttpOnly session cookie so the SDK's checkExistingSession
  // path on the next page load reports verified=true. Same shape as
  // production: __Host-session, HttpOnly, Path=/.
  res.setHeader("Set-Cookie", "__Host-session=stub-session-token; HttpOnly; Path=/; SameSite=Lax");
  res.json({ status: "verified" });
});

// POST /v1/hosted/verify/:challenge_id - Wallet submission (server-side
// surface that simulates the wallet POSTing its proof). Not normally hit
// by the browser flow, but kept here so manual harness scripts can
// drive a verification end-to-end.
app.post("/v1/hosted/verify/:cid", (req, res) => {
  const record = challenges.get(req.params["cid"]);
  if (!record) {
    return res.status(404).json({ error: "Challenge not found" });
  }
  const { submit_secret } = req.body ?? {};
  if (submit_secret !== record.submit_secret) {
    return res.status(403).json({ error: "Invalid submit_secret" });
  }
  record.status = "proof_ok_waiting_for_redeem";
  res.json({ success: true });
});

// Admin endpoints for E2E test control. These are NOT part of the v1
// provii-verifier wire spec , they exist so spec files can force a
// session into expired/revoked states without waiting for a clock or
// orchestrating a wallet round-trip.
app.post("/admin/set-state/:sid", (req, res) => {
  const record = challenges.get(req.params["sid"]);
  if (!record) {
    return res.status(404).json({ error: "Challenge not found" });
  }
  const { state } = req.body ?? {};
  if (!state) {
    return res.status(400).json({ error: "Missing state" });
  }
  record.status = state;
  res.json({ ok: true, state });
});

app.post("/admin/expire/:sid", (req, res) => {
  const record = challenges.get(req.params["sid"]);
  if (!record) {
    return res.status(404).json({ error: "Challenge not found" });
  }
  record.status = "expired";
  record.expires_at_unix = Math.floor(Date.now() / 1000) - 60;
  res.json({ ok: true });
});

app.post("/admin/revoke/:sid", (req, res) => {
  const record = challenges.get(req.params["sid"]);
  if (!record) {
    return res.status(404).json({ error: "Challenge not found" });
  }
  record.status = "revoked";
  res.json({ ok: true });
});

// Reset all challenges so each E2E spec starts with a clean slate.
// Without this, shared mutable state from a previous test (e.g. a
// challenge left in "verified" or "revoked" status) leaks into the
// next test and causes flaky failures.
app.delete("/admin/challenges", (_req, res) => {
  challenges.clear();
  res.json({ ok: true, cleared: true });
});

/**
 * Start the stub server on a given port (defaults to 3001).
 * Returns the server instance and the resolved port number.
 */
export function createServer(
  listenPort?: number,
): Promise<{ server: Server; port: number }> {
  const resolvedPort = listenPort ?? (Number(process.env["PORT"]) || 3001);
  return new Promise((resolve) => {
    const server = app.listen(resolvedPort, () => {
      console.log(`v1 API stub server listening on port ${resolvedPort}`);
      resolve({ server, port: resolvedPort });
    });
  });
}
