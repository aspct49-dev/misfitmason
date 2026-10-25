import 'server-only';

import { promises as fs } from 'node:fs';

import { neon } from '@neondatabase/serverless';
import path from 'node:path';

/**
 * The JSON store the tournaments, guesses, giveaway, profiles and VIP-reward
 * claims all sit on. Ported from the Fugroo build.
 *
 * Three backends, chosen by the environment rather than by a flag (Postgres,
 * for Neon, is described at `pgBackend`):
 *
 *   **Files** (default) — `data/*.json`, written atomically: serialised to a
 *   temporary file and renamed over the real one, so a crash mid-write leaves
 *   the previous version intact rather than a truncated file. This is what a
 *   single Next process on a VPS wants, and it is what the site was designed
 *   for.
 *
 *   **KV** — used the moment `KV_REST_API_URL` (Vercel KV) or
 *   `UPSTASH_REDIS_REST_URL` appears in the environment. Serverless platforms
 *   have no writable disk outside `/tmp`, and `/tmp` is per-instance and
 *   wiped, so on Vercel the file backend does not merely degrade — every write
 *   throws and every read comes back empty. That is the whole reason this
 *   exists.
 *
 * Talking to KV over its REST API with `fetch` rather than a client library is
 * deliberate: it is two calls, `GET /get/<key>` and `POST /set/<key>`, and a
 * dependency to make those is a dependency to audit, update and explain.
 *
 * **What this still does not fix.** Writes are serialised per key behind a
 * promise chain, which stops two saves *in one process* from interleaving. It
 * does nothing about two processes, because there is no compare-and-set here.
 * On Vercel that means two admins saving the same bracket at the same moment
 * can still lose one edit. For one person running an event that is fine; it is
 * not a general-purpose concurrent store, and the fix if it ever matters is a
 * real database rather than a lock bolted onto this.
 */

/*
 * `store/`, not `data/`: `data/` already holds the archived leaderboard
 * snapshots, which are reference files rather than live state, and mixing the
 * two would make "safe to delete" impossible to answer by looking.
 */
const DIR = path.join(process.cwd(), 'store');

/* ---------------------------------------------------------------- backend */

interface Backend {
  read(name: string): Promise<string | null>;
  write(name: string, body: string): Promise<void>;
}

/** Vercel KV and Upstash expose the same REST shape under different names. */
function kvConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

const fileBackend: Backend = {
  async read(name) {
    try {
      return await fs.readFile(path.join(DIR, name), 'utf8');
    } catch {
      return null;
    }
  },
  async write(name, body) {
    const file = path.join(DIR, name);
    await fs.mkdir(DIR, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, body, 'utf8');
    // Rename is atomic on the same filesystem: a reader sees the old file or
    // the new one, never a half-written one.
    await fs.rename(tmp, file);
  },
};

function kvBackend(cfg: { url: string; token: string }): Backend {
  const auth = { authorization: `Bearer ${cfg.token}` };
  const key = (name: string) => `misfitmason:${encodeURIComponent(name)}`;

  return {
    async read(name) {
      const res = await fetch(`${cfg.url}/get/${key(name)}`, {
        headers: auth,
        // Next caches fetches by default in some paths; a cached read of a
        // mutable store is a store that stops updating.
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { result?: string | null };
      return body.result ?? null;
    },
    async write(name, body) {
      const res = await fetch(`${cfg.url}/set/${key(name)}`, {
        method: 'POST',
        headers: auth,
        body,
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`KV write failed for ${name}: ${res.status} ${await res.text()}`);
      }
    },
  };
}

/**
 * Postgres, for Neon from the Vercel Marketplace.
 *
 * The store only ever reads and writes whole named documents, so Postgres
 * needs nothing more than one table of name → JSON text. That keeps every
 * feature above this file unchanged whichever backend is underneath.
 *
 * Neon's HTTP driver rather than a pooled TCP client: each query is one
 * request, which is what a serverless function wants — no connection to hold
 * open between invocations, and nothing to exhaust when traffic spikes.
 *
 * The table is created on first use, so connecting the database is the whole
 * setup: no migration to run, no console to visit.
 */
function pgConfig(): string | null {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function pgBackend(url: string): Backend {
  const sql = neon(url);
  let ready: Promise<unknown> | null = null;
  const ensureTable = () =>
    (ready ??= sql`
      CREATE TABLE IF NOT EXISTS misfitmason_store (
        name       text PRIMARY KEY,
        body       text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `.catch((err) => {
      // Let the next call try again rather than caching a failure forever.
      ready = null;
      throw err;
    }));

  return {
    async read(name) {
      await ensureTable();
      const rows = (await sql`SELECT body FROM misfitmason_store WHERE name = ${name}`) as {
        body: string;
      }[];
      return rows[0]?.body ?? null;
    },
    async write(name, body) {
      await ensureTable();
      await sql`
        INSERT INTO misfitmason_store (name, body, updated_at)
        VALUES (${name}, ${body}, now())
        ON CONFLICT (name) DO UPDATE SET body = EXCLUDED.body, updated_at = now()
      `;
    },
  };
}

/* Redis wins if both are configured — it was here first, and switching an
   existing deployment's store by adding a second integration would make its
   data appear to vanish. */
const cfg = kvConfig();
const pg = cfg ? null : pgConfig();
const backend: Backend = cfg ? kvBackend(cfg) : pg ? pgBackend(pg) : fileBackend;

/** Which store is in use, for the admin panel to be able to say so. */
export const STORE_KIND: 'kv' | 'postgres' | 'files' = cfg ? 'kv' : pg ? 'postgres' : 'files';

/* ------------------------------------------------------------------- api */

/** One queue per key, so a slow write to one table does not block another. */
const queues = new Map<string, Promise<unknown>>();

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = await backend.read(name);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Missing, unreachable or unparseable is the same as empty — the first
    // write creates it. A store that throws on read would take the whole page
    // down over an empty table.
    return fallback;
  }
}

export function writeJson<T>(name: string, value: T): Promise<void> {
  const prev = queues.get(name) ?? Promise.resolve();
  const run = prev.then(() => backend.write(name, JSON.stringify(value, null, 2)));
  // The queue swallows the error so one failed write does not poison every
  // later write to the same key; the caller still gets the rejection below.
  queues.set(name, run.catch(() => {}));
  return run;
}

/** Read, change, write — the shape almost every caller wants. */
export async function mutateJson<T>(name: string, fallback: T, fn: (value: T) => void): Promise<T> {
  const value = await readJson<T>(name, fallback);
  fn(value);
  await writeJson(name, value);
  return value;
}

/* ---------------------------------------------------------------- health */

/**
 * Whether the store can actually be written to.
 *
 * There is no way to answer this by inspection — a read-only filesystem and a
 * mistyped KV token both look fine until something tries to save. So it tries,
 * against a key nothing else uses.
 *
 * Cached, because the answer changes about as often as a deploy and the panel
 * asks on every render. A failure is cached for much less time than a success:
 * if someone is in the middle of connecting a KV store, they should not have
 * to wait a minute to find out it worked.
 */
const HEALTH_KEY = '.writable-probe.json';
const OK_MS = 60_000;
const FAIL_MS = 5_000;

let health: { ok: boolean; at: number } | null = null;

export async function storeWritable(): Promise<boolean> {
  const now = Date.now();
  if (health && now - health.at < (health.ok ? OK_MS : FAIL_MS)) return health.ok;

  let ok = true;
  try {
    await backend.write(HEALTH_KEY, JSON.stringify({ at: new Date().toISOString() }));
  } catch {
    ok = false;
  }
  health = { ok, at: now };
  return ok;
}
