/* HOUSE STYLE LAW, asserted against the rendered page.
 *
 * The law is written down and the pages broke it anyway: 34 em-dashes and 6 straight
 * apostrophes shipped across five pages. That is the pattern this harness keeps meeting
 * — a rule held only by an author's memory decays — so it becomes a check.
 *
 *   node tools/style.mjs [names...]
 *
 * WHY A TREEWALKER AND NOT innerText: innerText skips collapsed and hidden content, so
 * it cannot see the methodology box's source registry or the <details> table twins.
 * The first pass of this audit used innerText and undercounted by more than half.
 *
 * THREE THINGS ARE DELIBERATELY NOT VIOLATIONS:
 *   - a BARE em-dash alone in a cell or chart label: the no-data placeholder, correct
 *   - an en-dash between numbers (2015-2026): a range, correct
 *   - anything inside <script>: inlined source comments, which no reader sees
 */
import {readdirSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

const b = await chromium.launch();
let bad = 0, total = 0;
for (const n of list) {
  const p = await b.newPage({viewport: {width: 1440, height: 1000}});
  await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
  await p.waitForTimeout(900);
  const hits = await p.evaluate(() => {
    const BANNED = /\b(crucial|delve|matters)\b/i;
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = w.nextNode())) {
      const el = t.parentElement;
      /* <noscript> content parses as RAW TEXT while scripting is on, so a walker sees
         its markup (class="..." and all) as prose. It is markup, and when scripting is
         off the browser parses it as markup. Skip it here; it is covered by whatever
         checks run against the no-script rendering. */
      if (!el || el.closest("script,style,noscript")) continue;
      const s = t.textContent;
      const ctx = s.replace(/\s+/g, " ").trim();
      if (!ctx) continue;
      /* a lone dash is the no-data placeholder, not prose */
      const bare = /^[—–-]$/.test(ctx);
      if (s.includes("—") && !bare) out.push(["em-dash", ctx.slice(0, 70)]);
      if (/(?<=\w)'(?=\w)|(?<=\s)'|'(?=\s)/.test(s)) out.push(["straight-quote", ctx.slice(0, 70)]);
      if (/"/.test(s)) out.push(["straight-double", ctx.slice(0, 70)]);
      const m = s.match(BANNED);
      if (m) out.push([`banned:${m[1].toLowerCase()}`, ctx.slice(0, 70)]);
    }
    return out;
  });
  total += hits.length;
  if (hits.length) {
    bad++;
    console.log(`${n.padEnd(18)} FAIL  ${hits.length} violation(s)`);
    for (const [kind, ctx] of hits.slice(0, 6)) console.log(`    ${kind}: ${ctx}`);
    if (hits.length > 6) console.log(`    ...and ${hits.length - 6} more`);
  } else {
    console.log(`${n.padEnd(18)} PASS`);
  }
  await p.close();
}
await b.close();
console.log(bad ? `\n${total} style-law violation(s) on ${bad} page(s)`
                : `\nall ${list.length} pages clean: no em-dashes, no straight quotes, ` +
                  `no banned words`);
process.exit(bad ? 1 : 0);
