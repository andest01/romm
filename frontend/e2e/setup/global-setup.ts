import { connect } from "node:tls";
import { type Account, accountFor, type Role, ROLES } from "../support/auth";
import { readE2EEnv } from "../support/e2e-environment";

// Preflight, before any test or browser: the backend answers, each account
// signs in and can read ROMs, and the library has a game. One error lists every
// problem in about a second, instead of each test timing out on it later. It
// also notes whether the site speaks HTTP/2. The only place the suite calls the
// API directly: it isn't a test.

const TIMEOUT_MS = 5_000;

class PreflightError extends Error {
  constructor(problems: Record<string, string>) {
    const messages = Object.values(problems);
    super(
      [
        `The backend isn't ready for the e2e suite (${messages.length} problem(s)):`,
        ...messages.map((message) => `  - ${message}`),
      ].join("\n"),
    );
    this.name = "PreflightError";
    // The stack points into this file, which helps nobody fix their backend.
    this.stack = `${this.name}: ${this.message}`;
  }
}

/** Never throws: a network failure or timeout comes back as the Error. */
async function get(url: string, account?: Account): Promise<Response | Error> {
  const headers: HeadersInit = account
    ? {
        Authorization: `Basic ${Buffer.from(`${account.username}:${account.password}`).toString("base64")}`,
      }
    : {};
  try {
    return await fetch(url, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

async function checkBackend(target: string): Promise<Record<string, string>> {
  const response = await get(`${target}/api/heartbeat`);
  if (response instanceof Error) {
    return {
      backend: `Nothing answered at ${target} (${response.message}). Start the site, or fix E2E_BASE_URL in e2e/.env.`,
    };
  }
  if (!response.ok) {
    return {
      backend: `GET /api/heartbeat returned ${response.status} at ${target}. Is E2E_BASE_URL a RomM site with its backend up?`,
    };
  }
  // The specs follow this checkout's UI, so a released backend can lack routes it calls.
  const body: unknown = await response.json().catch(() => undefined);
  const system = (
    body as { SYSTEM?: { VERSION?: unknown; GIT_BRANCH?: unknown } }
  )?.SYSTEM;
  const version = String(system?.VERSION ?? "unknown version");
  const branch = system?.GIT_BRANCH
    ? `, branch ${String(system.GIT_BRANCH)}`
    : "";
  console.log(`e2e: testing ${target} (RomM ${version}${branch})`);
  return {};
}

/** The protocol a TLS handshake settles on ("h2", "http/1.1"), or null when
 *  the probe fails. Sends no request, so a self-signed certificate is fine. */
function negotiatedProtocol(url: URL): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = connect({
      host: url.hostname,
      port: Number(url.port || 443),
      servername: url.hostname,
      ALPNProtocols: ["h2", "http/1.1"],
      rejectUnauthorized: false,
      timeout: 2_000,
    });
    const done = (protocol: string | null) => {
      socket.destroy();
      resolve(protocol);
    };
    socket.once("secureConnect", () => done(socket.alpnProtocol || null));
    socket.once("error", () => done(null));
    socket.once("timeout", () => done(null));
  });
}

/** Notes the HTTP version, which shapes every network timing. Never fails. */
async function reportProtocol(target: string): Promise<void> {
  const url = new URL(target);
  if (url.protocol === "http:") {
    console.log(
      `e2e: ${url.origin} is plain HTTP, so browsers use HTTP/1.1 (6 connections per host). Network timings will read slower than a site behind an HTTPS proxy with HTTP/2.`,
    );
    return;
  }
  const protocol = await negotiatedProtocol(url);
  if (protocol === "h2") console.log(`e2e: ${url.origin} serves HTTP/2.`);
  else if (protocol) {
    console.log(
      `e2e: ${url.origin} serves HTTP/1.1. Turning on HTTP/2 in its reverse proxy lets the browser load requests in parallel instead of 6 at a time.`,
    );
  }
}

async function checkAccount(
  target: string,
  role: Role,
  account: Account,
): Promise<Record<string, string>> {
  const response = await get(`${target}/api/roms?limit=1`, account);
  const who = `The ${role} account "${account.username}"`;
  if (response instanceof Error) {
    return {
      [role]: `${who} got no answer from GET /api/roms (${response.message}).`,
    };
  }
  if (response.status === 401) {
    return {
      [role]: `${who} can't sign in: check its password in e2e/.env, and that it exists on this backend.`,
    };
  }
  if (response.status === 403) {
    return { [role]: `${who} signs in but can't read ROMs.` };
  }
  if (!response.ok) {
    return { [role]: `GET /api/roms returned ${response.status} for ${who}.` };
  }
  return {};
}

async function checkLibrary(
  target: string,
  account: Account,
): Promise<Record<string, string>> {
  const response = await get(`${target}/api/roms?limit=1`, account);
  if (response instanceof Error || !response.ok) {
    return { library: "Couldn't count the library's games." };
  }
  const body: unknown = await response.json().catch(() => undefined);
  const total = (body as { total?: unknown } | undefined)?.total;
  if (typeof total !== "number") {
    return { library: "GET /api/roms didn't report a total." };
  }
  if (total === 0) {
    return {
      library:
        "The library has no games, and the specs open one. Scan a platform first.",
    };
  }
  return {};
}

export default async function globalSetup() {
  const env = readE2EEnv();
  const target = env.E2E_BASE_URL;

  // Every other check would only repeat that the backend is unreachable.
  const backend = await checkBackend(target);
  if (Object.keys(backend).length) throw new PreflightError(backend);
  await reportProtocol(target);

  const accounts = await Promise.all(
    ROLES.map((role) => checkAccount(target, role, accountFor(env, role))),
  );
  const problems: Record<string, string> = Object.assign({}, ...accounts);
  // The admin sees every game, so its count is the library's.
  if (!problems.admin) {
    Object.assign(
      problems,
      await checkLibrary(target, accountFor(env, "admin")),
    );
  }
  if (Object.keys(problems).length) throw new PreflightError(problems);
}
