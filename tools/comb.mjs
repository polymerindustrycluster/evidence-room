/* THE FINE-TOOTH COMB: cross-page style-consistency miner.
 *
 *   node tools/comb.mjs            render all pages, mine inconsistencies
 *
 * Not a gate. Gates assert rules someone already named; every formatting defect found on
 * 2026-08-31 (unstyled .fig-title, unshipped Lato, below-chart legends, the compounding
 * measure) was invisible to rules because nobody had named it. This instrument needs no
 * rule: it measures every element's computed style on every page, groups by (tag, class,
 * context), and reports MINORITY PATTERNS — a property that is almost-always one value
 * and sometimes another. A human adjudicates each flag: defect, or deliberate register.
 * Its output is a review document, not an exit code.
 */
import {readdirSync, writeFileSync} from "fs";
import {resolve, dirname} from "path";
import {fileURLToPath, pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = readdirSync(`${WEB}/dist`).filter(f => f.endsWith(".html") && f !== "index.html")
  .map(f => f.slice(0, -5));

const b = await chromium.launch();
const records = [];
for (const name of pages) {
  const p = await b.newPage({viewport: {width: 1440, height: 1000}});
  await p.goto(pathToFileURL(`${WEB}/dist/${name}.html`).href);
  await p.waitForTimeout(1300);
  await p.evaluate(() => document.querySelectorAll("details").forEach(d => d.open = true));
  await p.waitForTimeout(300);
  const rows = await p.evaluate(() => {
    const SEL = "h1,h2,h3,p,li,summary,figcaption,td,th,blockquote,.legend,.takeaway,.lede,.fig-title,.fig-sub,.statv,.stat,.byline";
    const out = [];
    document.querySelectorAll(SEL).forEach(e => {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const txt = (e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) || e.matches(".legend");
      if (!txt) return;
      const cls = (e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className || "").toString().trim();
      out.push({
        tag: e.tagName.toLowerCase(),
        cls: cls.split(/\s+/).filter(c => !/^(only-|is-|pv-num)/.test(c)).sort().join("."),
        inDetails: !!e.closest("details"),
        inChart: !!e.closest(".chart,svg"),
        size: cs.fontSize, weight: cs.fontWeight, lh: cs.lineHeight,
        family: cs.fontFamily.split(",")[0].replace(/['"]/g, ""),
        color: cs.color, transform: cs.textTransform, spacing: cs.letterSpacing,
        left: Math.round(r.left), width: Math.round(r.width),
        chars: e.textContent.trim().length,
      });
    });
    return out;
  });
  rows.forEach(r => records.push({page: name, ...r}));
  await p.close();
  process.stdout.write(".");
}
await b.close();
console.log(` ${records.length} elements measured across ${pages.length} pages`);

/* mine: group by identity key, split by property, report minority values */
const PROPS = ["size", "weight", "family", "color", "transform", "spacing", "left", "width"];
const groups = new Map();
for (const r of records) {
  if (r.inChart) continue;                       // svg text is chart-tool territory
  const key = `${r.tag}${r.cls ? "." + r.cls : ""}${r.inDetails ? " (in details)" : ""}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}
const findings = [];
for (const [key, rows] of groups) {
  if (rows.length < 4) continue;                 // too few to call anything a majority
  for (const prop of PROPS) {
    if ((prop === "left" || prop === "width") && !/p|h2|h3|lede|fig-|legend|takeaway/.test(key)) continue;
    const counts = new Map();
    rows.forEach(r => {
      let v = r[prop];
      if (prop === "width" || prop === "left") v = Math.round(v / 4) * 4;   // 4px tolerance
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    if (counts.size < 2) continue;
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const [majV, majN] = sorted[0];
    const minority = sorted.slice(1).filter(([v, n]) => n <= rows.length * 0.25);
    if (!minority.length || majN < rows.length * 0.6) continue;
    for (const [v, n] of minority) {
      const where = [...new Set(rows.filter(r => {
        let rv = r[prop];
        if (prop === "width" || prop === "left") rv = Math.round(rv / 4) * 4;
        return rv === v;
      }).map(r => r.page))];
      findings.push({key, prop, majority: `${majV} (${majN}/${rows.length})`, minority: String(v), n, pages: where});
    }
  }
}
findings.sort((a, b) => b.n - a.n);
const lines = findings.map(f =>
  `${f.key.padEnd(34)} ${f.prop.padEnd(9)} usually ${f.majority}  BUT ${f.minority} x${f.n} on: ${f.pages.join(", ")}`);
writeFileSync(`${WEB}/shots/comb-report.txt`, lines.join("\n"));
console.log(`\n${findings.length} minority patterns -> shots/comb-report.txt (top 30):\n`);
lines.slice(0, 30).forEach(l => console.log("  " + l));
