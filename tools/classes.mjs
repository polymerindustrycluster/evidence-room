/* DOES EVERY CLASS A PAGE USES RESOLVE TO A RULE THE SITE DEFINES?
 *
 *   node tools/classes.mjs [names...]
 *
 * On 2026-08-31 a reader asked why a chart title on the patents page looked like body
 * text. It was: `<p class="fig-title">` appeared 57 times across 17 pages, and the rule
 * defining .fig-title existed in exactly ONE place — federal-money's page-local
 * styles.css. The markup convention had been copied to sixteen other pages; the CSS had
 * not. Every chart title on the site except federal-money's rendered as a paragraph.
 *
 * Sixteen gates passed the whole time and none of them could have failed. A <p> carrying
 * a class nothing styles is a valid <p>: it has a size, a weight and a colour, it does
 * not overflow, it does not collide, its contrast is fine, and its text is correct. Every
 * gate here measures what IS rendered. None asked whether what rendered is what the
 * markup ASKED FOR. That gap is this file.
 *
 * WHAT THIS DOES: collects every class used in every page's HTML, collects every class
 * SELECTOR defined in the shared stylesheet plus that page's own stylesheets, and reports
 * classes that are used and never defined. A class used on many pages and defined on one
 * is called out specially, because that is the copied-convention shape and it is the one
 * that hides: the page it was invented on looks right forever.
 *
 * WHAT THIS DOES NOT DO: it cannot tell you a rule is CORRECT, only that one exists —
 * and "exists" means the class appears in SOME selector, which is weaker than it sounds.
 * `.fig-title + .fig-sub + .chart{margin-top:16px}` mentions both classes while styling
 * neither, so a sheet keeping only that line would pass this gate with every title still
 * rendering as body copy. Found while self-testing: deleting the two real rules did not
 * turn the gate red, because the third selector still named them. A sibling-margin rule
 * satisfying a "is it styled" check is the honest limit of a static class check. It
 * does not see classes added by JavaScript at runtime (JS_ADDED below is the escape
 * hatch, and every entry needs a reason). It does not check the reverse direction —
 * a defined class nobody uses is dead CSS, which is untidy, not broken.
 */
import {readFileSync, existsSync, readdirSync, statSync} from "fs";
import {resolve, dirname, join} from "path";
import {fileURLToPath} from "url";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* Acknowledged debt, ratcheted like coldopen: an entry tolerates a KNOWN unresolved
   class on a NAMED page; anything not listed fails. Fix a class, delete its entry. */
const DEBT = (() => {
  try { return JSON.parse(readFileSync(join(WEB, "_data", "classes-debt.json"), "utf-8")).debt || {}; }
  catch { return {}; }
})();

/* Classes written onto elements by app.js at runtime. Each needs a reason, so this list
   cannot quietly become the place defects go to be forgotten. */
const JS_ADDED = new Set([
  "is-active", "is-open", "is-hidden", "selected", "hidden", "on", "off", "dim", "hl",
]);

const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const pages = (args.length ? args : readdirSync(WEB).filter(d => {
  try { return statSync(join(WEB, d)).isDirectory() && existsSync(join(WEB, d, "index.html")); }
  catch { return false; }
})).filter(d => !d.startsWith("_") && !["node_modules", "dist", "tools", "shots"].includes(d));

/* Strip comments BEFORE extracting selectors. The first version of this gate did not,
   and it passed patents/ green because a comment in the file it was checking mentioned
   ".tint" and ".body" — a gate that reads its own prose as evidence. Caught by noticing
   that three rules had been written and five classes had gone quiet. */
const decomment = css => css.replace(/\/\*[\s\S]*?\*\//g, " ");
const classSelectors = css => new Set(
  [...decomment(css).matchAll(/\.(-?[_a-zA-Z][\w-]*)\s*(?=[{,:.\s>+~])/g)].map(m => m[1]));

const sharedCss = readdirSync(join(WEB, "_shared")).filter(f => f.endsWith(".css"))
  .map(f => readFileSync(join(WEB, "_shared", f), "utf-8")).join("\n");
const sharedDefined = classSelectors(sharedCss);

let debtHits = 0;
const usedOn = new Map();     // class -> [pages using it]
const definedOn = new Map();  // class -> [pages defining it locally]
const undef = [];

for (const page of pages) {
  const html = readFileSync(join(WEB, page, "index.html"), "utf-8");
  const local = readdirSync(join(WEB, page)).filter(f => f.endsWith(".css"))
    .map(f => readFileSync(join(WEB, page, f), "utf-8")).join("\n");
  const localDefined = classSelectors(local);
  for (const c of localDefined) definedOn.set(c, [...(definedOn.get(c) || []), page]);

  const used = new Set();
  for (const m of html.matchAll(/class="([^"]+)"/g))
    m[1].split(/\s+/).filter(Boolean).forEach(c => used.add(c));

  for (const c of used) {
    usedOn.set(c, [...(usedOn.get(c) || []), page]);
    if (sharedDefined.has(c) || localDefined.has(c) || JS_ADDED.has(c)) continue;
    if ((DEBT[c] || []).includes(page)) { debtHits++; continue; }
    undef.push({page, cls: c});
  }
}

/* group by class so the copied-convention shape is visible */
const byClass = new Map();
for (const u of undef) byClass.set(u.cls, [...(byClass.get(u.cls) || []), u.page]);

let fail = 0;
const sorted = [...byClass.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [cls, pgs] of sorted) {
  const definedSomewhere = definedOn.get(cls);
  const n = pgs.length;
  if (definedSomewhere && definedSomewhere.length) {
    console.log(`  \x1b[31mDEFINED-ON-ONE\x1b[0m .${cls} — used unstyled on ${n} page(s) [${pgs.slice(0,4).join(", ")}${n>4?", …":""}]`);
    console.log(`                  but DEFINED only in ${definedSomewhere.join(", ")}/ — promote it to _shared, or the page it was invented on is the only one that looks right`);
  } else {
    console.log(`  \x1b[31mUNDEFINED\x1b[0m .${cls} — used on ${n} page(s) [${pgs.slice(0,4).join(", ")}${n>4?", …":""}] and defined nowhere`);
  }
  fail += n;
}

console.log();
if (fail) {
  console.log(`\x1b[31mclasses: ${byClass.size} class(es) resolve to no rule, across ${fail} page-use(s)\x1b[0m`);
  console.log("Define the class, promote it to _shared, or remove it from the markup.");
  process.exit(1);
}
console.log(`\x1b[32mclasses: clean\x1b[0m  (${pages.length} pages, ${usedOn.size} distinct classes${debtHits ? `, ${debtHits} acknowledged debt uses per _data/classes-debt.json` : ", all resolve"})`);
