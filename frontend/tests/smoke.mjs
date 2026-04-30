#!/usr/bin/env node
/**
 * Frontend smoke test.
 *
 *   npm run test:smoke
 *
 * 1. Starts the already-built `next` standalone server on a throwaway port.
 * 2. Probes a handful of critical routes for non-5xx responses.
 * 3. Checks that the HTML contains enough of the marketing + app shell to
 *    be confident SSR is actually rendering (not just returning `200`).
 * 4. Shuts the server down.
 *
 * The test intentionally does NOT run `next build` — the CI job runs build
 * beforehand. Running this locally:
 *
 *   npm run build
 *   npm run test:smoke
 */
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");

const ROUTES = [
  { path: "/", mustContain: ["CuraVision"] },
  { path: "/login", mustContain: ["Email", "Password"] },
  { path: "/register", mustContain: ["Password"] },
];

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // fall through
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`);
}

async function main() {
  const standalone = path.join(ROOT, ".next", "standalone", "server.js");
  if (!existsSync(standalone)) {
    console.error(
      "✗ .next/standalone/server.js is missing. Run `npm run build` first."
    );
    process.exit(1);
  }

  const port = await findFreePort();
  const server = spawn("node", [standalone], {
    cwd: path.join(ROOT, ".next", "standalone"),
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));

  const base = `http://127.0.0.1:${port}`;
  const cleanup = () => {
    try {
      server.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  };
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  try {
    await waitForServer(base);

    let passed = 0;
    for (const route of ROUTES) {
      const url = `${base}${route.path}`;
      const res = await fetch(url);
      if (res.status >= 500) {
        throw new Error(`GET ${route.path} → ${res.status}`);
      }
      const body = await res.text();
      for (const needle of route.mustContain) {
        if (!body.includes(needle)) {
          throw new Error(
            `GET ${route.path} → missing expected text "${needle}"`
          );
        }
      }
      console.log(`✓ ${route.path.padEnd(12)} ${res.status}`);
      passed += 1;
    }

    console.log(`\n✓ Frontend smoke: ${passed}/${ROUTES.length} routes OK`);
  } catch (err) {
    console.error("✗ Frontend smoke failed:", err.message);
    cleanup();
    process.exit(1);
  } finally {
    cleanup();
  }
}

main();
