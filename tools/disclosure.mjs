/* AI DISCLOSURE — asserted, because discipline did not hold it.
 *
 * A byline-tidying regex run earlier stripped "by Claude (Anthropic), directed and
 * reviewed by" as one unit and left "Analysis and graphics J. Swanson" behind, so
 * three pages credited a person for work Claude did. Two more were BUILT that way.
 * Eight of sixteen pages ended up with no AI disclosure in the line a reader actually
 * reads, on a site whose entire premise is showing what AI makes of public data.
 * Every other gate passed the whole time: none of them was looking.
 *
 *   node tools/disclosure.mjs [names...]
 *
 * Checks the RENDERED page, with scripting on, so a JS-emitted byline is covered too.
 * One wording, everywhere: the same fact must not appear in five phrasings.
 *
 * It also asserts the OTHER thing a reader is owed about authorship, added 2026-09-01:
 * what the site's own checks can and cannot establish. See the note above SCOPE below.
 */
import {readdirSync, readFileSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const CANON = "Analysis and graphics by Claude (Anthropic)";
/* WHAT THE CHECKS ACTUALLY DO, asserted here for the reason the byline is.
 *
 * Until 2026-09-01 the methodology box promised that every numbered sentence carried "a
 * written condition that would prove it wrong". The conditions run against the SHIPPED
 * data: they establish that a sentence still matches its own file, and nothing about the
 * world. A cross-family review called presenting that suite as verification the largest
 * overclaim on the site, and the incident behind it is in CORRECTIONS.md — a transposed
 * classification code moved a series by half while its assertion kept passing, because the
 * assertion was true of the wrong number and of the right one.
 *
 * The sentence is prose authored ONCE in _shared/picviz.js and rendered into every page,
 * which is the surface no page-level author ever reviews: it regressed onto 23 pages at
 * once and can re-inflate the same way. Two assertions. A page that prints its check count
 * must also print what the check cannot do, and no page may carry the old promise. */
const SCOPE = "consistency check, not a check against the world";
const OVERCLAIM = /condition that would prove it wrong|test that can fail/i;
/* and the human who answers for it must be named in the same line */
const OWNER = "John Swanson";
/* Names that must never be the sole credit for analysis or graphics. */
const MISCREDIT = /\b(?:analysis and graphics|analysis)\b[^·.]{0,40}\b(?:J\.? ?Swanson|John Swanson|the Evidence Room)\b/i;

const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

const REG = JSON.parse(readFileSync("_data/SOURCES.json", "utf8"));

const b = await chromium.launch();
let bad = 0;
for (const n of list) {
  const p = await b.newPage({viewport: {width: 1440, height: 1000}});
  await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const el = document.querySelector(".byline");
    const norm = s => s.replace(/\s+/g, " ").trim();
    return {byline: el ? norm(el.textContent) : null,
            text: norm(document.body.innerText),
            links: [...document.querySelectorAll("a")].map(a => a.href),
            method: norm(document.querySelector(".pv-method")?.textContent || "")};
  });
  const probs = [];
  if (r.byline === null) probs.push("no .byline element");
  else {
    if (!r.byline.includes(CANON)) probs.push("byline lacks the AI credit");
    if (!r.byline.includes(OWNER)) probs.push("byline names no responsible person");
    /* John is the byline and answers for the page; what he must never be credited with
       is producing the analysis and graphics, which is the regression this catches. */
    const m = r.byline.match(MISCREDIT);
    if (m) probs.push(`credits a person for the analysis: "${m[0]}"`);
  }
  if (r.method && !r.method.includes("Claude (Anthropic)"))
    probs.push("methodology box drops the disclosure");
  if (/carry a written condition/.test(r.method) && !r.method.includes(SCOPE))
    probs.push("methodology box prints its check count without saying what the checks cannot do");
  const over = r.text.match(OVERCLAIM);
  if (over) probs.push(`claims a check would prove a sentence wrong: "${over[0]}"`);

  /* LICENCE ATTRIBUTION, WHICH IS AN OBLIGATION RATHER THAN A COURTESY. A hostile review
     on 2026-08-29 found IPEDS arriving through the Urban Institute's portal under ODC-By
     1.0, which requires attribution, with none printed on any page that used it; and the
     O*NET credit rendered without the registered-trademark symbol and with no link to
     CC BY 4.0, both of which that licence explicitly requires. The compliant strings were
     already in the registry and nothing rendered them, which is how an obligation becomes
     an omission.

     OBLIGATION FOLLOWS USE, NOT MENTION. Keyed on the registry's by_artifact list rather
     than on the dataset's name appearing in the text: the hub glosses what IPEDS is
     without printing a figure derived from it, and owes nothing for that. */
  for (const [key, src] of Object.entries(REG.sources || {})) {
    if (!src.attribution) continue;
    if (!(REG.by_artifact?.[n] || []).includes(key)) continue;
    const mark = src.attribution.match(/[A-Z][A-Za-z*®]+® is a trademark/);
    if (mark && !r.text.includes(mark[0]))
      probs.push(`${key}: licence requires the trademark symbol, and it is not rendered`);
    if (src.licence_url && !r.links.some(h => h.startsWith(src.licence_url.slice(0, 40))))
      probs.push(`${key}: uses ${src.licence} data with no link to the licence`);
  }
  if (probs.length) bad++;
  console.log(`${n.padEnd(18)} ${probs.length ? "FAIL  " + probs.join("; ")
                                              : "PASS  disclosure present"}`);
  await p.close();
}
await b.close();
console.log(bad ? `\n${bad} page(s) do not disclose who wrote them, or overstate their own checks`
                : `\nall ${list.length} pages carry the same disclosure and the same scope on their checks`);
process.exit(bad ? 1 : 0);
