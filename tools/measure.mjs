/* DOES RUNNING PROSE HOLD THE MEASURE?
 *
 *   node tools/measure.mjs [names...]
 *
 * On 2026-08-31 a reader asked why churn's methodology notes ran narrower than the
 * paragraphs above them. Four prose widths were live on the site at once: 678 (the
 * measure), 488, 664 and 980. Three root causes, three different diseases: --measure
 * compounds under nesting because the browser flattens var(--figure) into the custom
 * property at :root and every element re-resolves the leftover 100% against its own
 * container (0.72 x 0.72 x 678 = 488); the same class defined per-page WITH and WITHOUT
 * its cap (.tnote); and an acknowledged-debt class rendering unstyled at container
 * width. All fixed in the same PR that adds this gate.
 *
 * The columns audit ran 4,249 measurements through all of it and stayed green, because
 * it checks LEFT EDGES — a narrowed-but-aligned paragraph is perfectly on-column. Width
 * was never asserted anywhere. This gate asserts it: every <p> carrying real running
 * text (>80 visible characters) must sit within 15px of the measure at 1440, unless
 * _data/measure-whitelist.json names it as a deliberate register. The whitelist is a
 * RATCHET like classes-debt.json: known registers are tolerated on named pages (or "*"),
 * anything new fails, and an entry is deleted when its register is retired.
 *
 * WHAT THIS DOES NOT CATCH: prose in elements other than <p> (an <li> essay would slip
 * through); widths at other viewports (the 1440 measure is the canonical one — mobile
 * re-layout is chart-craft territory); and a register that is WRONG but whitelisted —
 * the whitelist is adjudicated by a human and is only as honest as its last review.
 * It also cannot tell you 678 is the RIGHT measure, only that everyone shares it.
 */
import {readFileSync, readdirSync} from "fs";
import {resolve, dirname} from "path";
import {fileURLToPath, pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/* THE MEASURE IS THE PAGE'S OWN, not a constant. The first version hardcoded 678 and
   was falsified within hours: four story-layer pages landed (_shared/story.css, the
   Silver Bulletin geometry measured off the real thing — one 728px column for prose
   and figures alike) and 68 correct paragraphs turned red. Two documented design
   systems is not drift; a page failing ITS OWN system is. The gate now probes each
   page's resolved --measure with a real element and asserts against that. */
const TOL = 15;

let allow = {};
try { allow = JSON.parse(readFileSync(`${WEB}/_data/measure-whitelist.json`, "utf-8")).allowed || {}; }
catch { /* no whitelist is a valid state: everything must hold the measure */ }

const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const pages = (args.length ? args
  : readdirSync(`${WEB}/dist`).filter(f => f.endsWith(".html") && f !== "index.html").map(f => f.slice(0, -5)));

const b = await chromium.launch();
let fail = 0, checked = 0, tolerated = 0;
for (const name of pages) {
  const p = await b.newPage({viewport: {width: 1440, height: 1000}});
  await p.goto(pathToFileURL(`${WEB}/dist/${name}.html`).href);
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelectorAll("details").forEach(d => d.open = true));
  await p.waitForTimeout(300);
  const MEASURE = await p.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "width:10000px;max-width:var(--measure);position:absolute;visibility:hidden";
    document.body.appendChild(probe);
    const w = Math.round(probe.getBoundingClientRect().width);
    probe.remove(); return w;
  });
  const rows = await p.evaluate((allowKeys) => {
    const out = [];
    document.querySelectorAll("p").forEach(e => {
      if (e.closest(".chart,svg,.legend")) return;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (e.textContent.trim().length <= 80) return;
      /* which whitelist keys could claim this element: its own classes, or a classed/
         named ancestor (aside cards, source boxes) */
      const keys = [...e.classList];
      allowKeys.forEach(k => { if (!keys.includes(k) && e.closest("." + CSS.escape(k) + ", " + k)) keys.push(k); });
      out.push({w: Math.round(r.width), cls: e.className || "(bare)", keys,
                txt: e.textContent.trim().slice(0, 44)});
    });
    return out;
  }, Object.keys(allow));
  for (const row of rows) {
    checked++;
    if (Math.abs(row.w - MEASURE) <= TOL) continue;
    const excuse = row.keys.find(k => allow[k] && (allow[k].includes("*") || allow[k].includes(name)));
    if (excuse) { tolerated++; continue; }
    console.log(`  \x1b[31mOFF-MEASURE\x1b[0m ${name}  <p class="${row.cls}"> at ${row.w}px against the ${MEASURE}px measure  "${row.txt}"`);
    fail++;
  }
  await p.close();
}
await b.close();

console.log();
if (fail) {
  console.log(`\x1b[31mmeasure: ${fail} paragraph(s) off the measure\x1b[0m (${checked} checked).`);
  console.log("Fix the width, or — for a deliberate register a human has adjudicated — add it to _data/measure-whitelist.json.");
  process.exit(1);
}
console.log(`\x1b[32mmeasure: clean\x1b[0m  (${pages.length} pages, ${checked} paragraphs${tolerated ? `, ${tolerated} on whitelisted registers` : ""})`);
