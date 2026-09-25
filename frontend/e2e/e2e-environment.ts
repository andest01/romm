import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

// The only place the e2e suite reads its environment. To add a variable: add it
// to E2EEnv and EXPECTED, validate it in readE2EEnv(), document it in
// .env.example (and in e2e.yml if CI needs it). Tests get the result as the
// `e2eEnv` fixture; playwright.config.ts calls this first, so a bad environment
// fails before any server or browser starts.

const ENV_FILE = fileURLToPath(new URL("./.env", import.meta.url));
const ENV_FILE_LABEL = "frontend/e2e/.env";
const EXAMPLE_LABEL = "frontend/e2e/.env.example";
const PREFIX = "E2E_";

/** 1:1 with the environment variables. Required variables are required props. */
export interface E2EEnv {
  CI: boolean;
  E2E_ADMIN_USERNAME: string;
  E2E_ADMIN_PASSWORD: string;
  E2E_VIEWER_USERNAME: string;
  E2E_VIEWER_PASSWORD: string;
  // The backend under test: exactly one of these two is set.
  E2E_DEV_PORT?: number;
  E2E_DEV_PROXY_TARGET?: string;
  E2E_WORKERS?: number;
}

type E2EKey = Exclude<keyof E2EEnv, "CI">;

/** What a valid value looks like, quoted in every error about that variable. */
const EXPECTED: Record<E2EKey, string> = {
  E2E_ADMIN_USERNAME: "required, the username of an admin account",
  E2E_ADMIN_PASSWORD: "required, that account's password",
  E2E_VIEWER_USERNAME:
    "required, the username of a non-admin account in the Viewer group",
  E2E_VIEWER_PASSWORD: "required, that account's password",
  E2E_DEV_PORT:
    "a local backend's port (1-65535); set this or E2E_DEV_PROXY_TARGET, not both",
  E2E_DEV_PROXY_TARGET:
    "a backend's http(s) URL with its port, e.g. http://127.0.0.1:3000; set this or E2E_DEV_PORT, not both",
  E2E_WORKERS: "optional, a whole number of parallel workers (1 or more)",
};

/** Thrown once, listing every problem. Names variables, never their values. */
export class E2EEnvError extends Error {
  constructor(problems: string[], source: string) {
    super(
      [
        `The e2e environment has ${problems.length} problem(s), read from ${source}:`,
        ...problems.map((p) => `  - ${p}`),
        `Fix them all at once; ${EXAMPLE_LABEL} lists every variable and its format.`,
      ].join("\n"),
    );
    this.name = "E2EEnvError";
    // The stack points into this parser, which helps nobody fix their env.
    this.stack = `${this.name}: ${this.message}`;
  }
}

type RawVars = Record<string, string | undefined>;

/** Syntax problems `parseEnv` would otherwise skip or silently resolve. */
function lintEnvFile(text: string): string[] {
  const problems: string[] = [];
  const linesByKey = new Map<string, number[]>();
  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const key = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(trimmed)?.[1];
    if (!key) {
      problems.push(`line ${index + 1} is not in KEY=value form`);
      return;
    }
    linesByKey.set(key, [...(linesByKey.get(key) ?? []), index + 1]);
  });
  for (const [key, lines] of linesByKey) {
    if (lines.length > 1) {
      problems.push(`${key} is set more than once (lines ${lines.join(", ")})`);
    }
  }
  return problems;
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[b.length];
}

function unknownKeyProblem(key: string): string {
  const closest = Object.keys(EXPECTED)
    .map((known) => ({ known, distance: editDistance(key, known) }))
    .sort((x, y) => x.distance - y.distance)[0];
  const hint =
    closest && closest.distance <= 3 ? ` Did you mean ${closest.known}?` : "";
  return `${key} is not a variable the suite reads.${hint}`;
}

/** The variables to validate, plus any problems with where they came from. */
function readSource(ci: boolean): {
  label: string;
  vars: RawVars;
  problems: string[];
} {
  if (!existsSync(ENV_FILE)) {
    if (!ci) {
      throw new E2EEnvError(
        [`${ENV_FILE_LABEL} does not exist. Copy ${EXAMPLE_LABEL} to it and fill it in.`],
        ENV_FILE_LABEL,
      );
    }
    // CI has no file: the workflow env is the source.
    const vars = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key.startsWith(PREFIX)),
    );
    return { label: "the process environment", vars, problems: [] };
  }

  const text = readFileSync(ENV_FILE, "utf8");
  const vars = parseEnv(text);
  const problems = lintEnvFile(text);
  for (const key of Object.keys(vars)) {
    if (!key.startsWith(PREFIX)) {
      // Anything else would leak into the dev server Playwright spawns.
      problems.push(`${key} is not allowed here: only ${PREFIX}* variables are`);
    }
  }
  return { label: ENV_FILE_LABEL, vars, problems };
}

/** Parse and validate every variable the suite uses, throwing one
 *  `E2EEnvError` that lists every problem found. */
export function readE2EEnv(): E2EEnv {
  const ci = !!process.env.CI;
  const { label, vars, problems } = readSource(ci);

  for (const key of Object.keys(vars)) {
    if (key.startsWith(PREFIX) && !(key in EXPECTED)) {
      problems.push(unknownKeyProblem(key));
    }
  }

  const fail = (key: E2EKey, issue: string) =>
    problems.push(`${key} ${issue}. Expected: ${EXPECTED[key]}.`);

  // Names and URLs must be exact: stray whitespace usually means a quoting slip.
  const text = (key: E2EKey, required: boolean): string | undefined => {
    const value = vars[key];
    if (!value) {
      if (required) fail(key, "is missing or empty");
      return undefined;
    }
    if (value !== value.trim()) fail(key, "has leading or trailing whitespace");
    return value;
  };
  // Passwords are taken exactly as written, spaces included.
  const secret = (key: E2EKey): string | undefined => {
    const value = vars[key];
    if (!value) fail(key, "is missing or empty");
    return value || undefined;
  };
  const httpUrl = (key: E2EKey): string | undefined => {
    const value = text(key, false);
    if (value === undefined) return undefined;
    const url = URL.parse(value);
    if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
      fail(key, "is not an http(s) URL");
    }
    return value;
  };
  const integer = (
    key: E2EKey,
    required: boolean,
    min: number,
    max: number,
  ): number | undefined => {
    const value = text(key, required);
    if (value === undefined) return undefined;
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) {
      fail(key, "is not a whole number in range");
    }
    return n;
  };

  const adminUsername = text("E2E_ADMIN_USERNAME", true);
  const adminPassword = secret("E2E_ADMIN_PASSWORD");
  const viewerUsername = text("E2E_VIEWER_USERNAME", true);
  const viewerPassword = secret("E2E_VIEWER_PASSWORD");
  const devPort = integer("E2E_DEV_PORT", false, 1, 65_535);
  const proxyTarget = httpUrl("E2E_DEV_PROXY_TARGET");
  if (!vars.E2E_DEV_PORT === !vars.E2E_DEV_PROXY_TARGET) {
    problems.push(
      [
        `${
          vars.E2E_DEV_PORT
            ? "Both E2E_DEV_PORT and E2E_DEV_PROXY_TARGET are set."
            : "Neither E2E_DEV_PORT nor E2E_DEV_PROXY_TARGET is set."
        } Pick one of these:`,
        "      E2E_DEV_PORT=5000                             a local backend, by port",
        "      E2E_DEV_PROXY_TARGET=http://127.0.0.1:3000    any backend, by URL (port included)",
        "    They're alternatives: E2E_DEV_PORT is not the proxy target's port.",
      ].join("\n"),
    );
  }
  const workers = integer("E2E_WORKERS", false, 1, Number.MAX_SAFE_INTEGER);

  if (adminUsername && adminUsername === viewerUsername) {
    problems.push(
      "E2E_ADMIN_USERNAME and E2E_VIEWER_USERNAME are the same account. Every permission test compares the two, so they must differ.",
    );
  }

  if (problems.length) throw new E2EEnvError(problems, label);

  // Every required value was checked above, so the assertions below hold.
  return Object.freeze({
    CI: ci,
    E2E_ADMIN_USERNAME: adminUsername!,
    E2E_ADMIN_PASSWORD: adminPassword!,
    E2E_VIEWER_USERNAME: viewerUsername!,
    E2E_VIEWER_PASSWORD: viewerPassword!,
    E2E_DEV_PORT: devPort,
    E2E_DEV_PROXY_TARGET: proxyTarget,
    E2E_WORKERS: workers,
  });
}

/** Env for the dev server Playwright starts. Vite lets process env beat .env
 *  files, so its backend comes from here, never from the project's .env. An
 *  empty DEV_PROXY_TARGET means the local backend on DEV_PORT. */
export function webServerEnv(env: E2EEnv): Record<string, string> {
  // readE2EEnv() guarantees exactly one of the two is set.
  return env.E2E_DEV_PROXY_TARGET
    ? { DEV_PROXY_TARGET: env.E2E_DEV_PROXY_TARGET }
    : { DEV_PROXY_TARGET: "", DEV_PORT: String(env.E2E_DEV_PORT) };
}
