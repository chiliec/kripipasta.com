import { createHash } from "node:crypto";

/** Stable local filename for a remote image: "mrakopedia-<sha1(url)[0:12]>.<ext>". */
export function localImageName(absUrl: string): string {
  const hash = createHash("sha1").update(absUrl).digest("hex").slice(0, 12);
  const ext = absUrl.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1].toLowerCase() ?? "bin";
  return `mrakopedia-${hash}.${ext}`;
}

/** Replace `src="<absUrl>"` with the mapped local path for every entry of `map`. */
export function rewriteImageSrcs(html: string, map: Map<string, string>): string {
  let out = html;
  for (const [from, to] of map) out = out.split(`src="${from}"`).join(`src="${to}"`);
  return out;
}
