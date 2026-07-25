// Themed "История удалена" (Gone) page for retired legacy URLs. Plain string —
// runtime-agnostic, so both the Edge middleware and the Node route can reuse it.
export const GONE_HTML = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>История удалена</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#141418;color:#c8c8d0;font-family:Georgia,serif;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem}
h1{color:#B85450;font-size:1.75rem;margin-bottom:1rem}
p{margin-bottom:1.5rem;line-height:1.6;opacity:.8}
a{color:#B85450;text-decoration:none}
a:hover{text-decoration:underline}
</style></head>
<body>
<div>
<h1>История удалена</h1>
<p>Эта страница больше не существует.<br>Возможно, материал был удалён или никогда не был опубликован.</p>
<a href="/ru">← На главную</a>
</div>
</body>
</html>`;

/** 410 Gone response rendering the themed page. */
export function goneResponse(): Response {
  return new Response(GONE_HTML, {
    status: 410,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
