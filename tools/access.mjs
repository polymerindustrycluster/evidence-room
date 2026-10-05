/* CAN A READER WITHOUT A MOUSE, OR WITHOUT SIGHT, GET THROUGH THE PAGE?
 *
 *   node tools/access.mjs [names...] [404]      default: every bundle in dist/, then 404.html
 *
 * Written 4 October 2026 from three findings of the multi-persona audit (ER-02, ER-07,
 * ER-10) and the usability review, none of which any gate here could see:
 *
 *   TAB STOPS PER CHART. Every mark on every chart was its own Tab stop: 198 on peers, 113
 *     on wages, 266 on reach, so a keyboard reader walked every dot to reach the table
 *     holding the same numbers. This presses Tab through the whole page, as a reader does,
 *     and fails any chart that takes more than ONE stop (picviz.js now gives each chart one,
 *     with arrow keys inside) or that is not preceded by its "Skip the chart" control. A
 *     chart is the nearest [data-pv-group], else the .chart box, else the outermost svg.
 *   THE TABLE UNDER A CHART HOLDS WHAT THE CHART PLOTS. The peers metro table held the top
 *     25 of the 155 metros drawn above it. A table view that declares data-pv-twin must
 *     carry exactly the data-pv-id set of the marks in that svg.
 *   A CHANGED RESULT IS ANNOUNCED. The peers metro search and the wages county buttons
 *     rewrote a verdict with no live region and no tie to the control. Each search box,
 *     select and button group is USED here (typed into, changed, pressed) and every piece
 *     of text it changes outside the chart's own furniture (the svg, its titles and source
 *     line, legends, tables) is collected; at least one must sit in a polite live region
 *     the control names through aria-describedby or aria-controls. A control that changes
 *     no such text (a series picker that only redraws a chart) owes nothing, and is listed.
 *   EVERY LINK HAS A NAME. No rendered link may have an empty accessible name. (The
 *     review's "blank" chart-area links on the hub turned out to sit in a closed disclosure,
 *     where nothing is rendered or announced; this keeps the rule anyway.)
 *   THE 404 PAGE LEADS BACK IN. The repository is served the way GitHub Pages serves it,
 *     a missing address is requested, and the page that comes back must render in the
 *     site's own styles and link to the index and its story list, with both targets real.
 *
 * WHAT IT CANNOT INSPECT IS A FAILURE, NOT A PASS: a Tab walk that never comes back round,
 * a twin table or chart with no ids, or a control that is rendered at neither 1440 nor
 * 390px. It does not run a screen reader. Whether VoiceOver or NVDA actually speaks a
 * region once, and only once, is a manual test this cannot replace.
 */
import {createServer} from "node:http";
import {readFile, stat} from "node:fs/promises";
import {readdirSync, existsSync} from "node:fs";
import {extname, join, resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {chromium} from "./_browser.mjs";

const ROOT = process.cwd();
const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const pages = args.length ? args.filter(a => a !== "404")
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));
const want404 = !args.length || args.includes("404");

const LIVE = "[role=status],[role=log],[role=alert],[aria-live=polite],[aria-live=assertive]";
/* Text that belongs to the chart itself. A redraw rewrites it, and the chart's own
   alternative (title, table view) carries it, so it is not a "result" to announce. */
const FURNITURE = "svg, .chart, table, summary, .pv-tip, .tip, [role=tooltip], " +
  ".fig-title, .fig-sub, .src, .legend, .tnote, button, select, input, [aria-hidden=true]";

const b = await chromium.launch();
let bad = 0;

async function open(name, width) {
  const p = await b.newPage({viewport: {width, height: 1000}});
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  await p.goto(pathToFileURL(`${ROOT}/dist/${name}.html`).href);
  await p.waitForTimeout(1200);
  return {p, errors};
}

/* 1. Tab through the page and attribute each stop to a chart. */
async function tabWalk(p) {
  await p.evaluate(() => {
    window.__stops = [];
    const outer = n => { let s = n.ownerSVGElement; while (s && s.ownerSVGElement) s = s.ownerSVGElement; return s; };
    document.addEventListener("focusin", e => {
      const t = e.target;
      const g = t.closest("[data-pv-group]") || t.closest(".chart") || outer(t);
      if (g && !g.dataset.accessKey) g.dataset.accessKey = g.id ||
        (g.querySelector("svg[id]") || {}).id || `chart${window.__stops.length}`;
      window.__stops.push({skip: t.classList.contains("pv-skipchart"),
        chart: g && !t.classList.contains("pv-skipchart") ? g.dataset.accessKey : null});
    }, true);
  });
  for (let i = 0; i < 3000; i++) {
    await p.keyboard.press("Tab");
    const done = await p.evaluate(() => window.__stops.length > 1 && document.activeElement === document.body);
    if (done) return {stops: await p.evaluate(() => window.__stops), complete: true};
  }
  return {stops: await p.evaluate(() => window.__stops), complete: false};
}

for (const name of pages) {
  const probs = [], notes = [];
  if (!existsSync(`dist/${name}.html`)) { console.log(`${name.padEnd(18)} FAIL  no dist/${name}.html; run bundle`); bad++; continue; }
  const {p, errors} = await open(name, 1440);

  const walk = await tabWalk(p);
  const per = {};
  walk.stops.forEach((s, i) => {
    if (!s.chart) return;
    (per[s.chart] ||= {n: 0, first: i}).n++;
  });
  if (!walk.complete) probs.push(`could not inspect: Tab never came back round in 3,000 presses`);
  for (const [chart, {n, first}] of Object.entries(per)) {
    if (n > 1) probs.push(`chart #${chart} takes ${n} Tab stops; one, then arrow keys`);
    if (!(walk.stops[first - 1] || {}).skip) probs.push(`chart #${chart} has no "Skip the chart" control before it`);
  }
  const charts = Object.keys(per).length;
  notes.push(`${walk.stops.length} Tab stops, ${charts} chart(s) at one each`);

  /* 2. twin tables against their plotted marks */
  const twins = await p.evaluate(() => [...document.querySelectorAll("details.pv-table[data-pv-twin]")].map(d => {
    const svg = document.getElementById(d.dataset.pvTwin);
    const rows = [...d.querySelectorAll("tr[data-pv-id]")].map(r => r.dataset.pvId);
    const marks = svg ? [...new Set([...svg.querySelectorAll("[data-pv-id]")].map(m => m.dataset.pvId))] : [];
    const R = new Set(rows), M = new Set(marks);
    return {twin: d.dataset.pvTwin, rows: rows.length, marks: marks.length,
      missing: marks.filter(x => !R.has(x)).slice(0, 3), extra: rows.filter(x => !M.has(x)).slice(0, 3)};
  }));
  for (const t of twins) {
    if (!t.rows || !t.marks) probs.push(`could not inspect the #${t.twin} table: ${t.rows} row id(s), ${t.marks} mark id(s)`);
    else if (t.missing.length || t.extra.length || t.rows !== t.marks)
      probs.push(`the #${t.twin} twin table holds ${t.rows} rows for ${t.marks} plotted marks` +
        (t.missing.length ? `; missing ${t.missing.join(", ")}` : "") +
        (t.extra.length ? `; not plotted ${t.extra.join(", ")}` : ""));
  }
  if (twins.length) notes.push(`${twins.length} twin table(s) match their marks`);

  /* 3. links with no accessible name */
  const links = await p.evaluate(() => {
    const out = {n: 0, blank: []};
    document.querySelectorAll("a[href]").forEach(a => {
      /* rendered: not inside a closed disclosure, which is laid out but neither drawn nor
         read out (checkVisibility knows that; getClientRects does not) */
      if (!a.checkVisibility() || a.closest("[aria-hidden=true]")) return;
      out.n++;
      const by = (a.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean)
        .map(i => (document.getElementById(i) || {}).textContent || "").join(" ");
      const name = by.trim() || (a.getAttribute("aria-label") || "").trim() || a.innerText.trim() ||
        [...a.querySelectorAll("img[alt], svg title")].map(x => x.alt || x.textContent).join(" ").trim() ||
        (a.getAttribute("title") || "").trim();
      if (!name) out.blank.push(a.getAttribute("href").slice(0, 60));
    });
    return out;
  });
  if (links.blank.length) probs.push(`${links.blank.length} link(s) with no accessible name: ${links.blank.slice(0, 3).join(", ")}`);
  notes.push(`${links.n} links named`);

  /* 4. controls whose result is not announced */
  const ctls = await p.evaluate(() => {
    const all = [...document.querySelectorAll(
      "input:not([type=hidden]), select, [role=group], [role=radiogroup], [role=toolbar]")];
    return all.map((c, i) => ({i, tag: c.tagName, type: c.type || c.getAttribute("role"),
      label: c.id || c.getAttribute("aria-label") || c.className || c.tagName,
      buttons: c.matches("input, select") ? 0 : c.querySelectorAll("button, [role=button]").length}))
      .filter(c => c.tag === "INPUT" || c.tag === "SELECT" || c.buttons);
  });
  await p.close();
  let quiet = 0, announced = 0;
  for (const c of ctls) {
    let r = null;
    for (const width of [1440, 390]) {
      const {p: q} = await open(name, width);
      const sel = await q.evaluate(i => {
        document.querySelectorAll("details").forEach(d => { d.open = true; });
        const c = [...document.querySelectorAll(
          "input:not([type=hidden]), select, [role=group], [role=radiogroup], [role=toolbar]")][i];
        if (!c || !c.getClientRects().length) return null;
        c.setAttribute("data-access", "1");
        return "[data-access]";
      }, c.i);
      if (!sel) { await q.close(); continue; }
      await q.waitForTimeout(150);
      await q.evaluate(FURN => {
        window.__changed = new Set();
        new MutationObserver(ms => ms.forEach(m => {
          const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
          if (!t || t.closest(FURN) || t.closest("[data-access]")) return;
          const added = m.type === "characterData" ? [m.target] : [...m.addedNodes];
          /* a table view redrawn whole is furniture too; the filter count inside one is not */
          if (added.some(n => (n.nodeType === 3 || !n.matches(FURN + ", details.pv-table")) &&
              n.textContent.trim()))
            window.__changed.add(t);
        })).observe(document.body, {subtree: true, childList: true, characterData: true});
      }, FURNITURE);
      try {
        if (c.tag === "SELECT") {
          const v = await q.$eval(sel, s => ([...s.options].find((o, i) => i > 0 && o.value) || {}).value);
          if (v) await q.selectOption(sel, v);
        } else if (c.tag === "INPUT") {
          if (c.type === "number") await q.fill(sel, "40");
          else { await q.focus(sel); await q.keyboard.type("yo", {delay: 40}); }
        } else {
          const btn = q.locator(`${sel} button, ${sel} [role=button]`).nth(c.buttons > 1 ? 1 : 0);
          try { await btn.click({timeout: 3000}); } catch { await btn.evaluate(n => n.click()); }
        }
        await q.waitForTimeout(500);
        r = await q.evaluate(([sel, LIVE]) => {
          const c = document.querySelector(sel);
          const refs = n => ["aria-describedby", "aria-controls"]
            .flatMap(a => (n.getAttribute(a) || "").split(/\s+/)).filter(Boolean)
            .map(id => document.getElementById(id)).filter(Boolean);
          const named = [c, ...c.querySelectorAll("button, [role=button], input")].flatMap(refs);
          const changed = [...window.__changed].filter(e => e.isConnected && e.getClientRects().length);
          const ok = changed.some(e => {
            const L = e.closest(LIVE);
            return L && !L.closest("[aria-hidden=true]") && named.some(R => R.contains(L) || L.contains(R));
          });
          return {changed: changed.map(e => "#" + (e.id || e.className || e.tagName)).slice(0, 3), ok};
        }, [sel, LIVE]);
      } catch (e) {
        r = {error: e.message.split("\n")[0]};
      }
      await q.close();
      break;
    }
    if (!r) probs.push(`could not inspect control ${c.label}: rendered at neither 1440 nor 390px`);
    else if (r.error) probs.push(`could not inspect control ${c.label}: ${r.error}`);
    else if (!r.changed.length) quiet++;
    else if (!r.ok) probs.push(`control ${c.label} rewrites ${r.changed.join(", ")} and no live region it names says so`);
    else announced++;
  }
  if (ctls.length) notes.push(`${announced} control(s) announce their result, ${quiet} change only their chart`);
  if (errors.length) probs.push(`page error: ${errors[0]}`);

  if (probs.length) bad++;
  console.log(`${name.padEnd(18)} ${probs.length ? "FAIL  " + probs.join("; ") : "PASS  " + notes.join(", ")}`);
}

/* 5. the 404 page, served as GitHub Pages serves it: from the repository root, under the
   project path, with 404.html as the body of any address that has no file. */
if (want404) {
  const BASE = "/evidence-room";
  const MIME = {".html": "text/html", ".css": "text/css", ".js": "text/javascript",
    ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml"};
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    try {
      if (!path.startsWith(BASE + "/")) throw new Error("outside the site");
      let file = resolve(ROOT, "." + path.slice(BASE.length));
      if (!file.startsWith(ROOT + "/")) throw new Error("outside the repo");
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      const body = await readFile(file);
      res.writeHead(200, {"Content-Type": MIME[extname(file)] || "application/octet-stream"});
      res.end(body);
    } catch {
      res.writeHead(404, {"Content-Type": "text/html"});
      res.end(existsSync(join(ROOT, "404.html")) ? await readFile(join(ROOT, "404.html")) : "");
    }
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const probs = [];
  try {
    const p = await b.newPage({viewport: {width: 1440, height: 900}});
    const errors = [];
    p.on("pageerror", e => errors.push(e.message));
    p.on("console", m => m.type() === "error" && !/404/.test(m.text()) && errors.push(m.text()));
    const resp = await p.goto(`${origin}${BASE}/no/such/page/`);
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => ({
      mast: getComputedStyle(document.querySelector(".mast") || document.body).backgroundColor,
      mark: !!document.querySelector(".pv-mark"),
      links: [...document.querySelectorAll("a[href]")].map(a => a.href),
      here: location.href.split("#")[0],
      ids: [...document.querySelectorAll("[id]")].map(e => e.id)}));
    if (resp.status() !== 404) probs.push(`a missing address answered ${resp.status()}, not 404`);
    if (r.mast !== "rgb(5, 46, 54)") probs.push(`the site stylesheet did not load (masthead ${r.mast})`);
    if (!r.mark) probs.push("the shared script did not load (no masthead mark)");
    const home = `${origin}${BASE}/index/`;
    if (!r.links.includes(home)) probs.push("no link to the index");
    if (!r.links.includes(home + "#alltitle")) probs.push("no link to the story list (#alltitle)");
    for (const href of new Set(r.links.filter(h => h.startsWith(origin)))) {
      const [url, frag] = href.split("#");
      if (url === r.here) {                       // the skip link: a fragment of this page
        if (frag && !r.ids.includes(frag)) probs.push(`#${frag}: no such element on the 404 page`);
        continue;
      }
      const got = await fetch(url);
      if (got.status !== 200) { probs.push(`${href.slice(origin.length)} answers ${got.status}`); continue; }
      if (frag && !(await got.text()).includes(`id="${frag}"`))
        probs.push(`${href.slice(origin.length)}: no element with id "${frag}" there`);
    }
    if (errors.length) probs.push(`page error: ${errors[0]}`);
    await p.close();
  } catch (e) {
    probs.push(`could not inspect: ${e.message.split("\n")[0]}`);
  } finally {
    server.close();
  }
  if (probs.length) bad++;
  console.log(`${"404".padEnd(18)} ${probs.length ? "FAIL  " + probs.join("; ")
    : "PASS  a missing address renders the site 404, linked to the index and its story list"}`);
}

await b.close();
const n = pages.length + (want404 ? 1 : 0);
console.log(bad ? `\n${bad} of ${n} page(s) put a keyboard or screen-reader reader in the way`
  : `\nall ${n} page(s): one Tab stop per chart, complete twin tables, named links, announced results`);
process.exit(bad ? 1 : 0);
