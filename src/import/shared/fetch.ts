import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const CACHE_ROOT = join(process.cwd(), ".cache");
const USER_AGENT = "kripipasta-import/0.1 (+https://kripipasta.com)";
const MIN_GAP_MS = 700;
const RETRY_DELAYS_MS = [2000, 4000, 8000];

export class NetworkError extends Error {}

let lastRequestAt = 0;

// ponytail: single global throttle; parallelise per-host if a run ever needs to be faster.
async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

type Init = { method?: string; body?: string; headers?: Record<string, string> };

async function requestWithRetry(url: string, init: Init = {}): Promise<Response | null> {
  for (let attempt = 0; ; attempt++) {
    await throttle();
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "user-agent": USER_AGENT, ...init.headers },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 404) return null;
      if (res.ok) return res;
      if (res.status < 500 && res.status !== 429) throw new NetworkError(`${res.status} for ${url}`);
      if (attempt >= RETRY_DELAYS_MS.length) throw new NetworkError(`${res.status} for ${url} after retries`);
    } catch (err) {
      if (err instanceof NetworkError) throw err;
      if (attempt >= RETRY_DELAYS_MS.length) throw new NetworkError(`${String(err)} for ${url}`);
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
  }
}

/** POST a JSON body and return the parsed JSON reply. Throttled and retried like GETs; not disk-cached. */
export async function postJson(url: string, body: string): Promise<unknown> {
  const res = await requestWithRetry(url, { method: "POST", body, headers: { "content-type": "application/json" } });
  if (!res) throw new NetworkError(`404 for ${url}`);
  try {
    return await res.json();
  } catch (err) {
    throw new NetworkError(`json read failed for ${url}: ${String(err)}`);
  }
}

/** GET a text page, cached on disk by URL hash. Returns null on 404. */
export async function fetchText(url: string, source: string): Promise<string | null> {
  const cacheDir = join(CACHE_ROOT, source);
  const cachePath = join(cacheDir, `${createHash("sha1").update(url).digest("hex")}.html`);
  if (existsSync(cachePath)) return readFileSync(cachePath, "utf8");
  const res = await requestWithRetry(url);
  if (!res) return null;
  // res.text() streams the body under the same AbortSignal as the fetch() call above;
  // a stall here throws an uncaught DOMException that bypasses requestWithRetry's catch.
  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    throw new NetworkError(`body read failed for ${url}: ${String(err)}`);
  }
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cachePath, text);
  return text;
}

/** Download a binary once. Returns true when the file exists afterwards. */
export async function downloadFile(url: string, destPath: string): Promise<boolean> {
  if (existsSync(destPath)) return true;
  try {
    const res = await requestWithRetry(url);
    if (!res) return false;
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
    return true;
  } catch (err) {
    console.warn(`image failed: ${url}: ${String(err)}`);
    return false;
  }
}
