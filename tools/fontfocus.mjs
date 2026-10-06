/* A READER TABBING THROUGH A CHART KEEPS THEIR PLACE WHEN THE WEB FONT ARRIVES.
 *
 *   node tools/fontfocus.mjs [page:chart ...]      default: peers:states reach:dir
 *
 * Every chart page draws at once in the fallback face and draws again when Lato arrives
 * (the onFonts helper in each app.js). A redraw replaces the chart's nodes, so a reader
 * who had tabbed onto a mark was dropped onto <body>. PR #33 fixed that; its review
 * (Codex, 2026-09-30) then found the fix called focus() once per arriving face and once
 * more on `loadingdone`, so a screen reader could announce the same mark several times.
 *
 * Codex's review of PR #36 (2026-09-30) found the next defect in line: batching the
 * redraw until EVERY face had landed left peers drawn from fallback measurements while its
 * labels painted in Lato, clipping "North Carolina" at 768px on Linux while Lato 900 was
 * still loading.
 *
 * This serves the SOURCE pages over http (the dist bundles inline their fonts, so a
 * bundle cannot load late), holds every font file, focuses a mark in the named chart,
 * then releases all faces but one and requires:
 *   - a redraw happened while that face was still loading (geometry follows each face),
 * then releases the last face and requires:
 *   - the redraw replaced the focused mark (otherwise nothing was tested: FAIL, not pass),
 *   - focus sits on a mark with the same aria-label,
 *   - focus moved exactly once,
 *   - the chart still offers exactly one Tab stop, and it is the refocused mark (the roving
 *     tabindex picviz.js keeps since 4 October 2026: one stop per chart, arrows inside).
 * On reach use #dir: #map never redraws on a font load.
 */
import {createServer} from "node:http";
import {readFile, stat} from "node:fs/promises";
import {extname, join, resolve} from "node:path";
import {launch} from "./_browser.mjs";

const ROOT = process.cwd();
const MIME = {".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg"};
const specs = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = (specs.length ? specs : ["peers:states", "reach:dir"]).map(s => {
  const [page, chart] = s.split(":");
  if (!chart) throw new Error(`"${s}": name the chart too, as page:chart`);
  return {page, chart};
});

const server = createServer(async (req, res) => {
  try {
    let file = resolve(ROOT, "." + decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(ROOT + "/")) throw new Error("outside the repo");
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    res.writeHead(200, {"Content-Type": MIME[extname(file)] || "application/octet-stream"});
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await launch();

let bad = 0;
try {
  for (const {page: name, chart} of list) {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const held = [];                    // every face waits until this gate lets it go
    let holding = true;
    await page.route(/\.(woff2?|ttf|otf)(\?|$)/, async route => {
      if (holding) await new Promise(release => held.push({url: route.request().url(), release}));
      try { await route.continue(); } catch { /* page closed */ }
    });
    let r;
    try {
      await page.goto(`${base}/${name}/`, {waitUntil: "domcontentloaded"});
      await page.waitForSelector(`#${chart} [tabindex][aria-label]`, {timeout: 15000});
      await page.waitForTimeout(300);   // let every face the first draw needs be requested
      const label = await page.evaluate(chart => {
        /* the SECOND mark: not the chart's starting Tab stop, so the check also sees the
           stop follow focus across the redraw */
        const marks = document.querySelectorAll(`#${chart} [tabindex][aria-label]`);
        const node = marks[1] || marks[0];
        if (document.fonts.status !== "loading") return null;
        node.focus({preventScroll: true});
        window.__ff = {node, moves: 0};
        document.addEventListener("focusin", () => { window.__ff.moves++; }, true);
        return node.getAttribute("aria-label");
      }, chart);
      if (label === null || held.length < 2) {
        r = {ok: false, why: label === null
          ? "the fonts had already loaded, so the late redraw could not be inspected"
          : `only ${held.length} face(s) requested, so no face could be held back while others land`};
      } else {
        /* hold back the last face by name (Lato 900 where the page uses it), free the rest */
        held.sort((x, y) => x.url.localeCompare(y.url));
        const last = held.pop();
        holding = false;
        held.forEach(f => f.release());
        await page.waitForFunction(n => [...document.fonts].filter(f => f.status === "loaded").length >= n,
          held.length, {timeout: 15000});
        await page.waitForTimeout(200);
        const mid = await page.evaluate(() => ({replaced: !window.__ff.node.isConnected,
          pending: [...document.fonts].some(f => f.status === "loading")}));
        last.release();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(600);
        const s = await page.evaluate(chart => {
          const a = document.activeElement;
          const stops = [...document.querySelectorAll(`#${chart} [tabindex="0"]`)];
          return {replaced: !window.__ff.node.isConnected, moves: window.__ff.moves,
            got: a && a.getAttribute("aria-label"), tag: a && a.tagName,
            stops: stops.length, onFocus: stops.includes(a)};
        }, chart);
        const why = !mid.pending ? "no face was still loading at the midpoint; nothing was tested"
          : !mid.replaced ? "no redraw while a face was still loading: the chart kept fallback measurements under Lato"
          : !s.replaced ? "the font-load redraw did not replace the focused mark; nothing was tested"
          : s.got !== label ? `focus lost to ${s.got ? `"${s.got}"` : `<${s.tag}>`}`
          : s.moves !== 1 ? `focus moved ${s.moves} times; a screen reader announces each one`
          : s.stops !== 1 || !s.onFocus ? `the chart offers ${s.stops} Tab stop(s) after the redraw` +
            `${s.onFocus ? "" : ", none of them the refocused mark"}; it should offer one, there`
          : "";
        r = {ok: !why, why: why || `redrawn with a face pending; focus kept on "${label}", moved once`};
      }
    } catch (e) {
      r = {ok: false, why: `could not inspect: ${e.message.split("\n")[0]}`};
    }
    if (errors.length) r = {ok: false, why: `${r.why}; page error: ${errors[0]}`};
    if (!r.ok) bad++;
    console.log(`${r.ok ? "  ok  " : "FAIL  "}${name.padEnd(12)} #${chart.padEnd(8)} ${r.why}`);
    holding = false;
    held.forEach(f => f.release());
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(bad ? `\n${bad} chart(s) drop or repeat keyboard focus when the web font arrives.`
  : `\nFocus survives the font-load redraw, announced once, on ${list.length} chart(s).`);
process.exit(bad ? 1 : 0);
