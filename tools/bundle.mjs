/* Inline one artifact folder into a single self-contained file in dist/.
 *
 * Sources stay split the way web/funding-map is split — index.html, styles.css,
 * app.js, data/*.json — so they are readable, diffable, and servable over HTTP with
 * no build step. This bundler exists only because a published Artifact must be one
 * file with no external requests; it is a packaging step, never the authoring model.
 *
 *   node tools/bundle.mjs                 bundle every artifact that has an index.html
 *   node tools/bundle.mjs churn chain     bundle just those
 */
import {readFile, writeFile, readdir, stat, mkdir} from "node:fs/promises";
import {existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(WEB, "dist");

const read = p => readFile(p, "utf8");
const esc = s => s.replace(/<\/script>/gi, "<\\/script>");   // never break out of the tag

/* EVERY replacement below passes a FUNCTION, never a string, and that is load-bearing.
   In String.prototype.replace a replacement STRING treats `$'` as "the text after the
   match", `` $` `` as the text before it, and `$&` as the match itself. Inlined page code
   is full of dollar signs — `return '$' + (n / 1e6).toFixed(2)` contains the sequence `$'`
   — so string replacement silently spliced the remainder of the document into the middle of
   a function body and produced `return '
</body>
</html>
 + (n / 1e6)`. It bundled
   without error, passed the parse gate (which runs on the SOURCE, before this step), and
   failed only in the browser. A function replacer disables the whole `$` mini-language. */
async function bundle(name) {
  const dir = path.join(WEB, name);
  const entry = path.join(dir, "index.html");
  if (!existsSync(entry)) return null;
  let html = await read(entry);
  /* The gate asks "does this page participate in the shared system", and it used to test
     for the shared RENDERER specifically. funding-map and timeline draw with their own code
     but now take the shared column system, so that test excluded them from dist/ entirely —
     two artifacts with no build and no published URL for no reason anyone had decided.
     Referencing anything in _shared/ is the honest test. */
  if (!/_shared\//.test(html)) return {name, skipped: true};

  // 1. <link rel="stylesheet" href="..."> → <style>
  for (const m of [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)]) {
    const href = /href=["']([^"']+)["']/.exec(m[0])?.[1];
    if (!href || /^https?:/i.test(href)) continue;
    const cssPath = path.resolve(dir, href);
    let css = await read(cssPath);
    /* A stylesheet's relative url() is relative to the STYLESHEET, but once inlined it
       resolves against the PAGE. _shared/pic-viz.css says url(fonts/x.woff2) and means
       _shared/fonts/x.woff2; inlined into churn/index.html it would mean churn/fonts/.
       Nothing caught this until Lato became the first font shipped from the shared sheet
       (2026-08-31): three pages failed verify with ERR_FILE_NOT_FOUND and the rest were
       about to render in a fallback face. Rewrite to page-relative before inlining. */
    const cssDir = path.dirname(cssPath);
    css = css.replace(/url\((['"]?)(?!https?:|data:|#|\/)([^'")]+)\1\)/gi, (whole, q, u) => {
      const rel = path.relative(dir, path.resolve(cssDir, u)).split(path.sep).join("/");
      return `url(${q}${rel}${q})`;
    });
    html = html.replace(m[0], () => `<style>\n${css}\n</style>`);
  }

  /* 1b. url('fonts/X.ttf') in the inlined CSS -> data URI.
     A bundle is meant to be self-contained and the Artifact host blocks every external
     request, so a relative font URL is not "degrades gracefully" - it is four guaranteed
     404s and a page rendered in a fallback face nobody chose. The files are local and
     about 220KB each; base64 costs a third more and stays far inside the size limit. */
  for (const m of [...html.matchAll(/url\((['"]?)((?:\.\.\/)*(?:[\w.-]+\/)*(?:fonts|assets)\/[^'")]+)\1\)/gi)]) {
    const abs = path.resolve(dir, m[2]);
    if (!existsSync(abs)) { console.log(`  ${name}: missing ${m[2]}`); continue; }
    const ext = path.extname(abs).slice(1).toLowerCase();
    const mime = {ttf: "font/ttf", otf: "font/otf", woff: "font/woff",
                  woff2: "font/woff2"}[ext] || "application/octet-stream";
    const b64 = (await readFile(abs)).toString("base64");
    html = html.replace(m[0], () => `url(data:${mime};base64,${b64})`);
  }

  /* 1c. <img src="img/X.jpg"> -> data URI. Same reason as the fonts: a bundle is
     self-contained or it is not a bundle, and a relative <img> in dist/ is a broken image
     nobody chose. Only local img/ and assets/ paths; remote images are left alone (a page
     should not be using any). Missing files print, so a typo cannot ship as a blank frame.
     Added 2026-08-18 for the timeline's five public-domain stills. */
  for (const m of [...html.matchAll(/<img\b[^>]*\bsrc=(["'])((?:img|assets)\/[^"']+)\1[^>]*>/gi)]) {
    const abs = path.resolve(dir, m[2]);
    if (!existsSync(abs)) { console.log(`  ${name}: missing ${m[2]}`); continue; }
    const ext = path.extname(abs).slice(1).toLowerCase();
    const mime = {jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
                  svg: "image/svg+xml", gif: "image/gif"}[ext] || "application/octet-stream";
    const b64 = (await readFile(abs)).toString("base64");
    const tag = m[0].replace(m[2], () => `data:${mime};base64,${b64}`);
    html = html.replace(m[0], () => tag);
  }

  // 2. <script src="..."></script> → inline
  for (const m of [...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi)]) {
    if (/^https?:/i.test(m[1])) continue;
    const js = await read(path.resolve(dir, m[1]));
    // Fail here, not in a browser. A syntax error still bundles cleanly and produces a
    // page whose only symptom is a few empty divs — cheap to catch, expensive to miss.
    try { new Function(js); }
    catch (e) { throw new Error(`${name}: ${m[1]} does not parse — ${e.message}`); }
    html = html.replace(m[0], () => `<script>\n${esc(js)}\n</script>`);
  }

  // 3. data/*.json referenced by fetch() → a JSON script tag the runtime prefers.
  //    app.js calls PV.data("x.json"), which reads the tag when present and falls
  //    back to fetch() when serving the folder directly.
  // claims.json lives at the page root and is read by PV.methodology(), which is in
  // _shared — so the "is it referenced by app.js" test below would never see it.
  // It is always inlined: a page's disclosure must survive bundling.
  /* The SOURCE REGISTRY travels with every page, unconditionally. It is what makes the
     "Reproduce this" block possible, and a bundle that omitted it would silently render a
     page with no provenance — the exact failure the registry exists to fix. Shared, not
     per-artifact, so one edit updates every page. */
  const regPath = path.join(WEB, "_data", "SOURCES.json");
  if (existsSync(regPath)) {
    const rj = await read(regPath);
    html = html.replace("</style>", () =>
      `</style>
<script type="application/json" data-pv-file="SOURCES.json">${esc(rj)}</script>`);
  }

  const claimsPath = path.join(dir, "claims.json");
  if (existsSync(claimsPath)) {
    const cj = await read(claimsPath);
    html = html.replace("</style>", () =>
      `</style>
<script type="application/json" data-pv-file="claims.json">${esc(cj)}</script>`);
  }

  const dataDir = path.join(dir, "data");
  if (existsSync(dataDir)) {
    const files = (await readdir(dataDir)).filter(f => f.endsWith(".json"));
    const tags = [];
    for (const f of files) {
      if (!html.includes(f) && !(await read(path.join(dir, "app.js")).catch(() => "")).includes(f))
        continue;
      const json = await read(path.join(dataDir, f));
      tags.push(`<script type="application/json" data-pv-file="${f}">${esc(json)}</script>`);
    }
    if (tags.length) html = html.replace("</style>", () => "</style>\n" + tags.join("\n"));
  }

  await mkdir(DIST, {recursive: true});
  const out = path.join(DIST, `${name}.html`);
  await writeFile(out, html, "utf8");
  const kb = Math.round((await stat(out)).size / 1024);
  const titleIn8k = html.slice(0, 8192).includes("<title>");
  return {name, kb, titleIn8k};
}

const args = process.argv.slice(2);
const names = args.length
  ? args
  : (await readdir(WEB, {withFileTypes: true}))
      .filter(d => d.isDirectory() && !d.name.startsWith("_") &&
                   !["dist", "tools", "node_modules"].includes(d.name))
      .map(d => d.name);

let n = 0;
for (const name of names) {
  const r = await bundle(name);
  if (!r) { if (args.length) console.log(`${name.padEnd(20)} no index.html — skipped`); continue; }
  if (r.skipped) { console.log(`${r.name.padEnd(20)} predates _shared — not bundled`); continue; }
  n++;
  console.log(`${r.name.padEnd(20)} ${String(r.kb).padStart(5)} KB  title-in-8KB=${r.titleIn8k}`);
}
console.log(`\n${n} artifact${n === 1 ? "" : "s"} bundled into dist/`);
