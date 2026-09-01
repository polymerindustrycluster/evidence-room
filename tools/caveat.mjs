/* HOW MUCH APPARATUS SITS UNDER A CHART.
 *
 *   node tools/caveat.mjs [names...]
 *
 * page-design.md has carried this budget since it was written: "Caveat budget per figure:
 * <=45 words visible — one source line + at most one limitation sentence. The rest goes
 * into the notes disclosure or the methodology box." Nothing measured it. On 2026-09-01 a
 * scored editorial rubric found METHODOLOGY BALANCE the weakest dimension on the site,
 * failing at severity 4 or worse on 14 of 23 pages, and the measurement behind that verdict
 * is this one: 60 source lines over budget and 6,902 words of source-line ink, with a single
 * line on reach running to 318 words and one on atlas to 257.
 *
 * A RATCHET, not a pass/fail line, and for the same reason coldopen is one: every page here
 * is already over, so a hard line would fail the build on day one and be switched off by
 * Friday. _data/caveat.json records where each page stands today. A listed page may only
 * improve. A page not listed, or one that has been paid off, must clear the budget outright,
 * so new apparatus cannot be born in debt.
 *
 * WHAT COUNTS. Source lines only — the elements the house marks .src / .fig-src / [id$=src].
 * That is deliberate and it is the narrow reading of the rule. The budget governs APPARATUS
 * ink; a figure SUBTITLE that explains what the chart shows is editorial and is not capped
 * (page-design.md:177-179 says so explicitly, and the caveat BEAT is exempt as well). An
 * earlier draft of this file counted .fig-sub too and would have flagged legitimate
 * explanatory subtitles as debt, which is how a gate teaches people to ignore it.
 *
 * THE INCENTIVE THIS CREATES, named by the same refutation. A word-count ratchet rewards
 * deleting a limitation to make a number fall, which would be the opposite of what the
 * budget is for. One partial guard already exists and it is worth knowing about: a caveat
 * moved into the methodology block has to be classified in _shared/picviz.js as LIMITS,
 * METHOD or STRUCTURAL, and verify_consistency.py fails the build on an unclassified meta
 * key, so apparatus cannot be quietly dropped on the way out of a source line. Nothing
 * stops a limitation being deleted outright. That is a human check, and it is why the debt
 * file says in its own readme never to lower a number by deleting a warning.
 *
 * WHAT IT CANNOT DO. It counts words, not judgment. A tight 44-word source line that omits
 * the one caveat a reader needs passes here and is worse than a 60-word line that carries
 * it. Trimming is an editorial act: move the detail into the methodology block or the
 * register, never delete a limitation to make a number go down.
 */
import {readFileSync, readdirSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const CFG = JSON.parse(readFileSync("_data/caveat.json", "utf8"));
const LIMIT = CFG.limit;
const DEBT = CFG.ceilings || {};
const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

const SEL = ".src, .fig-src, .source, [id$='src'], [id$='source']";
const b = await chromium.launch();
let bad = 0, loose = 0;
const rows = [];

for (const n of list) {
  const p = await b.newPage({viewport: {width: 1440, height: 900}});
  await p.goto(pathToFileURL(`${process.cwd()}/dist/${n}.html`).href, {waitUntil: "networkidle"});
  const words = await p.evaluate(sel => [...document.querySelectorAll(sel)]
    .map(e => (e.textContent || "").trim().split(/\s+/).filter(Boolean).length)
    .filter(x => x > 0), SEL);
  await p.close();

  if (!words.length) { rows.push(`${n.padEnd(18)} PASS  no source line`); continue; }
  const worst = Math.max(...words);
  const ceiling = DEBT[n];

  if (ceiling === undefined) {
    if (worst > LIMIT) { bad++; rows.push(`${n.padEnd(18)} FAIL  worst source line ${worst}w, over the ${LIMIT}w budget and carrying no recorded debt`); }
    else rows.push(`${n.padEnd(18)} PASS  worst ${worst}w (limit ${LIMIT}w)`);
  } else if (worst > ceiling) {
    bad++; rows.push(`${n.padEnd(18)} FAIL  worst source line ${worst}w, over its recorded debt of ${ceiling}w`);
  } else {
    if (worst < ceiling) loose++;
    rows.push(`${n.padEnd(18)} PASS  worst ${worst}w (debt ${ceiling}w)${worst < ceiling ? "  — improved, lower the debt" : ""}`);
  }
}
await b.close();

console.log(rows.join("\n"));
console.log(bad
  ? `\n${bad} page(s) put more apparatus under a chart than they are allowed to. The budget ` +
    `is one source line of ${LIMIT} words; the rest belongs in the methodology box or the register.`
  : `\nall ${list.length} pages within their caveat budget; ${Object.keys(DEBT).length} still ` +
    `carry a recorded debt${loose ? `, and ${loose} have improved past it and should have it lowered` : ""}`);
process.exit(bad ? 1 : 0);
