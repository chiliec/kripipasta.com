import sanitizeHtml from "sanitize-html";
import he from "he";

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "figure",
    "figcaption",
    "iframe",
    "span",
    "h1",
    "h2",
  ]),
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    iframe: ["src", "width", "height", "frameborder", "allowfullscreen"],
    span: ["id"],
  },
  allowedIframeHostnames: [
    "www.youtube.com",
    "youtube.com",
    "player.vimeo.com",
    "vk.com",
  ],
};

/** Decode legacy HTML entities, then strip to a safe allowlist. */
export function sanitizeStoryHtml(raw: string): string {
  return sanitizeHtml(he.decode(raw), SANITIZE_OPTS);
}
