import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const CACHE_DIR = join(process.cwd(), ".cache", "mrakopedia");
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

async function requestWithRetry(url: string): Promise<Response | null> {
  for (let attempt = 0; ; attempt++) {
    await throttle();
    try {
      const res = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) });
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

/** GET a text page, cached on disk by URL hash. Returns null on 404. */
export async function fetchText(url: string): Promise<string | null> {
  const cachePath = join(CACHE_DIR, `${createHash("sha1").update(url).digest("hex")}.html`);
  if (existsSync(cachePath)) return readFileSync(cachePath, "utf8");
  const res = await requestWithRetry(url);
  if (!res) return null;
  const text = await res.text();
  mkdirSync(CACHE_DIR, { recursive: true });
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
