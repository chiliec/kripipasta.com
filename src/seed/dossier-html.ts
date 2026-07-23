function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function paragraphsHtml(paras: string[]): string {
  return paras
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

export function editorNoteHtml(labelText: string, body: string): string {
  return `<aside class="editor-note"><span class="editor-note__label">${escapeHtml(
    labelText,
  )}</span><p>${escapeHtml(body)}</p></aside>`;
}

export function blockquoteHtml(quote: string, foot: string): string {
  return `<blockquote><p>${escapeHtml(quote)}</p><footer>${escapeHtml(
    foot,
  )}</footer></blockquote>`;
}

export function definitionListHtml(items: { t: string; x: string }[]): string {
  const body = items
    .map((i) => `<dt>${escapeHtml(i.t)}</dt><dd>${escapeHtml(i.x)}</dd>`)
    .join("");
  return `<dl>${body}</dl>`;
}

export function timelineHtml(items: { t: string; b: string }[]): string {
  const body = items
    .map(
      (i) =>
        `<li><strong>${escapeHtml(i.t)}</strong><span>${escapeHtml(i.b)}</span></li>`,
    )
    .join("");
  return `<ol class="timeline">${body}</ol>`;
}

export function referencesHtml(items: string[]): string {
  const body = items.map((i) => `<li>${escapeHtml(i)}</li>`).join("");
  return `<ol class="refs">${body}</ol>`;
}
