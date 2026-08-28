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
 */
import {readdirSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const CANON = "Analysis and graphics by Claude (Anthropic), " +
              "directed and reviewed by John Swanson";
/* Names that must never be the sole credit for analysis or graphics. */
const MISCREDIT = /\b(?:analysis and graphics|analysis)\b[^·.]{0,40}\b(?:J\.? ?Swanson|John Swanson|the Evidence Room)\b/i;

const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

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
            method: norm(document.querySelector(".pv-method")?.textContent || "")};
  });
  const probs = [];
  if (r.byline === null) probs.push("no .byline element");
  else {
    if (!r.byline.includes(CANON)) probs.push("byline lacks the disclosure");
    const m = r.byline.match(MISCREDIT);
    /* the canonical line contains "directed and reviewed by John Swanson", which is
       credit for direction, not for the analysis — only flag it outside that phrase */
    if (m && !r.byline.includes(CANON)) probs.push(`miscredits: "${m[0]}"`);
  }
  if (r.method && !r.method.includes("Claude (Anthropic)"))
    probs.push("methodology box drops the disclosure");
  if (probs.length) bad++;
  console.log(`${n.padEnd(18)} ${probs.length ? "FAIL  " + probs.join("; ")
                                              : "PASS  disclosure present"}`);
  await p.close();
}
await b.close();
console.log(bad ? `\n${bad} page(s) do not disclose who wrote them`
                : `\nall ${list.length} pages carry the same disclosure`);
process.exit(bad ? 1 : 0);
