import { createHash } from "node:crypto";

/** Stable local filename for a remote image: "<prefix>-<sha1(url)[0:12]>.<ext>". */
export function localImageName(absUrl: string, prefix: string): string {
  const hash = createHash("sha1").update(absUrl).digest("hex").slice(0, 12);
  const path = absUrl.split("?")[0];
  // Extension from the last path segment that has one — Fandom URLs end in /revision/latest.
  const ext =
    path
      .split("/")
      .reverse()
      .map((seg) => seg.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1])
      .find((e): e is string => !!e)
      ?.toLowerCase() ?? "bin";
  return `${prefix}-${hash}.${ext}`;
}

/** Replace `src="<absUrl>"` with the mapped local path for every entry of `map`. */
export function rewriteImageSrcs(html: string, map: Map<string, string>): string {
  let out = html;
  for (const [from, to] of map) out = out.split(`src="${from}"`).join(`src="${to}"`);
  return out;
}
