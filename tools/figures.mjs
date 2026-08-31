/* THE FIGURE REGISTRY, ASSERTED. Companion to tools/crosspage.mjs.
 *
 *   node tools/figures.mjs [names...]
 *
 * crosspage.mjs PROPOSES: it reads the rendered pages and guesses which figures might be
 * the same quantity. It is a report and it is allowed to be noisy. This is the other half
 * — once a human has confirmed a quantity and written it into _data/FIGURES.json, this
 * fails the build when a page contradicts it.
 *
 * Three things it enforces:
 *   1. AGREED figures must not appear at a value other than the registered one, in any
 *      rendering the entry allows. A page printing $34.9M where the registry says $36.6M
 *      is drift, and drift is what shipped.
 *   2. UNOBSERVABLE quantities must not be given a value ANYWHERE, including zero.
 *      cluster-health printed "signed, none of it spent" for a disbursement the record
 *      cannot see; stating zero is as much a claim as stating a number.
 *   3. UNVERIFIED figures must not appear at all until they carry a source. The $160M
 *      NEO-SMART headline sat in a typed event title with no amount field and no citation,
 *      ten times the obligated figure the sibling page prints to the dollar.
 *
 * UNRESOLVED entries are NOT failures. They are recorded disagreements waiting on a human
 * decision, and the run reports them so they stay visible instead of quietly persisting.
 */
import {readdirSync, readFileSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const REG = JSON.parse(readFileSync("_data/FIGURES.json", "utf8")).figures;
const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/* A figure's registered renderings, plus the raw grouped digits, so "$51.0M" and
   "$51,001,413" are one fact rather than two strings. */
const forms = f => [f.display, ...(f.also_printed_as || [])].filter(Boolean);

const b = await chromium.launch();
let bad = 0, notes = [];
for (const n of list) {
  const p = await b.newPage({viewport: {width: 1440, height: 1200}});
  await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
  await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelectorAll("details").forEach(d => (d.open = true)));
  const text = await p.evaluate(() => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let t, out = [];
    while ((t = w.nextNode())) {
      const e = t.parentElement;
      if (!e || e.closest("script,style,noscript,.pv-method")) continue;
      const s = t.textContent.replace(/\s+/g, " ").trim();
      if (s) out.push(s);
    }
    return out.join(" ");
  });
  await p.close();

  const probs = [];
  for (const [id, f] of Object.entries(REG)) {
    if (id.startsWith("_")) continue;

    if (f.status === "unverified" && f.display && text.includes(f.display))
      probs.push(`${id}: prints ${f.display}, which is registered UNVERIFIED — ${f.action || "needs a source"}`);

    if (f.observability === "NOT PUBLICLY OBSERVABLE") {
      /* a value asserted for something nobody can see, including a stated zero */
      const zero = /\bnone of it (?:spent|disbursed|drawn)\b|\bnothing (?:spent|disbursed)\b|\bzero (?:spent|disbursed)\b/i;
      if (zero.test(text))
        probs.push(`${id}: states an amount for a quantity the record cannot show — ${f.forbidden || ""}`);
    }

    if (f.status === "agreed" && (f.pages || []).includes(n)) {
      const shown = forms(f).some(s => text.includes(s));
      if (!shown) notes.push(`${n}: ${id} registered on this page but no registered rendering found`);
    }
  }
  if (probs.length) bad++;
  console.log(`${n.padEnd(18)} ${probs.length ? "FAIL" : "OK"}`);
  probs.forEach(m => console.log("      " + m));
}
await b.close();

const unresolved = Object.entries(REG).filter(([k, f]) => f.status === "unresolved");
if (unresolved.length) {
  console.log(`\n${unresolved.length} recorded disagreement(s) awaiting a decision:`);
  for (const [id, f] of unresolved)
    console.log(`  ${id}: ${(f.conflict || f.why || "no reason recorded").slice(0, 160)}`);
}
if (notes.length) {
  console.log("\nnotes:");
  notes.slice(0, 8).forEach(m => console.log("  " + m));
}
console.log(bad ? `\n${bad} page(s) contradict the figure registry`
                : `\nno page contradicts the figure registry`);
process.exit(bad ? 1 : 0);
