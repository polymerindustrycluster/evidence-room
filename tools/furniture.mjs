/* IS A NUMBER IN A CHART'S FURNITURE SAID ANYWHERE ELSE ON ITS PAGE?
 *
 *   node tools/furniture.mjs [names...]
 *
 * Two independent figure audits swept this site and reached the same conclusion, which is
 * the reason this file exists: EVERY defect they found lived in a HAND-TYPED string. An
 * SVG <title> a screen reader announces, an HTML fig-title, a swatch key, an in-plot
 * annotation tail. Strings COMPUTED in app.js from the data were clean throughout, on all
 * 22 artifacts, across ~71 SVG titles and ~61 figure titles. The claims apparatus binds
 * sentences to data; nothing binds chart furniture to the sentences. So a passing suite
 * and a false caption coexisted on fourteen pages until a person read them.
 *
 * The four that motivated this, all shipped, all green:
 *   occupations  fig-title "below half their 2014-2021 pace" over a chart, a rule and a
 *                claim that all use 2014-2020. 2021 is itself a below-half year, so the
 *                title had put a fallen year inside its own baseline.
 *   sources      a dependency description still leading QCEW "at eleven" three days after
 *                the published correction to nine.
 *   programs     an in-plot bar tail ", ended 2015" against a college that had narrowed to
 *                a certificate it still offers, on the page whose README says "'Ended' is
 *                not 'closed'".
 *   chain        a legend key naming one footprint while the page compared two.
 *
 * WHAT THIS CHECKS, which is the structural half. Every numeric token that appears in a
 * hand-typed chart string must appear somewhere else on the same rendered page: in the
 * body prose, in another figure, or in the page's own claims. A number that exists ONLY
 * inside a chart caption is unverifiable by construction — no claim can be reading it,
 * because no claim mentions it — and every one of the four above is exactly that shape.
 *
 * BE CLEAR ABOUT WHAT IT CANNOT DO, because a gate that looks like it covers a defect it
 * cannot see is worse than no gate (tools/alttext.mjs makes the same declaration, for the
 * same reason). It does NOT know whether the number is RIGHT. A caption reading "2014-2020"
 * passes whether or not 2020 is the correct endpoint, so long as the page says 2020
 * somewhere. It catches the caption that drifted away from its page, not the page that is
 * wrong together. It also cannot see a WORD that drifted: ", ended 2015" would pass here
 * on the strength of 2015, and what caught that one was a person. The word half of this
 * class is pinned by DO-NOT-SAY rails in the kits and is not gateable.
 *
 * FALSE POSITIVES ARE THE WHOLE DESIGN PROBLEM, so the token rules are deliberately
 * generous and were tuned by running this against a site whose answer was already known,
 * per the house rule that a check is not trusted until it has failed on a case whose
 * answer you have. Ordinals in prose ("the third bar"), axis tick labels, years inside a
 * source line, and any token under two characters are out of scope. Entities and dashes
 * are normalised first: occupations ships "2014&ndash;2020" and would otherwise never
 * match the "2014-2020" in its own prose.
 */
import {readdirSync, readFileSync, existsSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

/* Strings a human types by hand. Axis ticks and tooltips are drawn from data and are out
   of scope; including them was the first version's biggest false-positive source. */
const FURNITURE = [".fig-title", ".fig-sub", ".key", ".legend-key", "figure figcaption"];

/* Normalise before comparing: named entities, both dashes, and thin spaces all appear in
   shipped markup and none of them survive a naive string match. */
const norm = s => (s || "")
  .replace(/&ndash;|&mdash;|&#8211;|&#8212;/g, "-")
  .replace(/[‒-―−]/g, "-")
  .replace(/&nbsp;|[   ]/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ")
  .trim();

/* A token worth checking: a year, a range, a decimal, a thousands-grouped integer, a
   percentage, or a dollar figure. Bare one- and two-digit numbers are excluded — they are
   overwhelmingly ordinals and counts of bars, and they matched everything. */
const TOKEN = /\b(?:\$?\d{1,3}(?:,\d{3})+|\$?\d+\.\d+|\d{4}-\d{4}|\d{4}|\d+(?:\.\d+)?%)\b/g;

const b = await chromium.launch();
let bad = 0, checked = 0;
const rows = [];

for (const page of list) {
  const file = `dist/${page}.html`;
  if (!existsSync(file)) continue;
  const pg = await b.newPage();
  await pg.goto(pathToFileURL(file).href, {waitUntil: "networkidle"});

  const got = await pg.evaluate(sels => {
    const inChart = [];
    for (const sel of sels)
      for (const el of document.querySelectorAll(sel))
        inChart.push({sel, text: el.textContent || ""});
    /* SVG <title> is the figure for a screen-reader user, so it is furniture too. */
    for (const t of document.querySelectorAll(".chart svg > title, figure svg > title"))
      inChart.push({sel: "svg>title", text: t.textContent || ""});
    /* Everything the page says that is NOT chart furniture, which is what furniture must
       agree with. Scripts and styles are excluded so a literal in app.js cannot vouch for
       a caption that contradicts the prose. */
    const clone = document.body.cloneNode(true);
    for (const el of clone.querySelectorAll(
      [...sels, ".chart svg > title", "figure svg > title", "script", "style"].join(",")))
      el.remove();
    return {inChart, rest: clone.innerText || ""};
  }, FURNITURE);

  const claimsPath = `${page}/claims.json`;
  const claimsText = existsSync(claimsPath)
    ? JSON.parse(readFileSync(claimsPath, "utf8")).claims.map(c =>
        `${c.text || ""} ${c.source || ""}`).join(" ")
    : "";
  const haystack = norm(`${got.rest} ${claimsText}`);
  /* every number the page states anywhere, as bare significant digits */
  const haystackDigits = (haystack.match(/[\d,.]*\d/g) || [])
    .map(x => x.replace(/[^0-9]/g, "").replace(/^0+/, ""))
    .filter(x => x.length >= 2);

  const orphans = [];
  for (const {sel, text} of got.inChart) {
    const t = norm(text);
    for (const tok of t.match(TOKEN) || []) {
      checked++;
      if (haystack.includes(tok)) continue;
      /* A range whose halves are both spoken elsewhere is not an orphan; pages routinely
         write "between 2014 and 2020" in prose and "2014-2020" on the chart. */
      const halves = tok.split("-");
      if (halves.length === 2 && halves.every(h => haystack.includes(h))) continue;
      /* "22%" on a swatch and "22 percent" in the prose are the same number. The first
         version of this file flagged patents for exactly that and it was wrong: the page
         states the figure twice, once in each register. Chart furniture uses the symbol
         because it has no room; prose spells it because the house style does. */
      if (tok.endsWith("%") && haystack.includes(`${tok.slice(0, -1)} percent`)) continue;
      /* A ROUNDED RESTATEMENT IS NOT AN ORPHAN. accountability's table caption says "an
         $18.5 million capital line" while the page prints the same award exactly, as
         $18,521,985. Those are one number in two registers, which is good writing, not a
         drifting caption. Compare significant digits: 185 opens 18521985, so it passes.
         A number the page never states in ANY form still fails, which is the point: the
         cluster-health caption's 0.034 is the DIFFERENCE between two printed figures and
         is itself printed nowhere, so a reader cannot check it and no claim reads it. */
      const digits = tok.replace(/[^0-9]/g, "").replace(/^0+/, "");
      /* THREE significant digits, not two. At two, "0.034" was excused by any figure on
         the page beginning 34, which silenced the one real finding this rule was written
         beside. A rounding carries its precision with it; a coincidence does not. */
      if (digits.length >= 3 && haystackDigits.some(h => h.length > digits.length
                                                     && h.startsWith(digits))) continue;
      orphans.push({sel, tok, text: t.slice(0, 90)});
    }
  }
  await pg.close();

  if (orphans.length) {
    bad++;
    rows.push(`${page.padEnd(18)} FAIL  ${orphans.length} orphaned number(s)`);
    for (const o of orphans.slice(0, 6))
      rows.push(`    ${o.tok.padEnd(12)} in ${o.sel}: "${o.text}"`);
  } else {
    rows.push(`${page.padEnd(18)} PASS`);
  }
}
await b.close();

console.log(rows.join("\n"));
console.log(bad
  ? `\n${bad} page(s) print a number in chart furniture that the page says nowhere else. ` +
    `A number only a caption knows is a number no claim can be checking.`
  : `\nchart furniture: clean  (${list.length} pages, ${checked} numeric tokens, ` +
    `every one of them spoken somewhere else on its own page)`);
process.exit(bad ? 1 : 0);
