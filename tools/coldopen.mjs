/* THE COLD OPEN — a reader meets evidence in the first screen.
 *
 * page-design.md has said so since it was written. Measured on 2026-08-28, fifteen of
 * sixteen pages put their first chart below the fold, the median at 1,668px: two full
 * screens of prose before a single mark. No gate was looking, which is the same shape as
 * every other defect this harness has found in itself.
 *
 *   node tools/coldopen.mjs [names...]
 *
 * A RATCHET, not a pass/fail line. _data/coldopen.json records where each unfixed page
 * stands today; those pages may only improve. Fixed pages, and any page not listed, must
 * clear the limit outright, so a NEW page cannot be born in debt.
 *
 * "First chart" means the first SVG wider than 200px and taller than 80px outside the
 * masthead — the masthead mark and a 0x0 placeholder are not evidence.
 */
import {readFileSync, readdirSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const CFG = JSON.parse(readFileSync("_data/coldopen.json", "utf8"));
const LIMIT = CFG.limit;
const FIXED = new Set(CFG.fixed);
const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

const b = await chromium.launch();
let bad = 0, loose = 0;
for (const n of list) {
  const p = await b.newPage({viewport: {width: 1440, height: 900}});
  await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
  await p.waitForTimeout(1000);
  const {top, hidden} = await p.evaluate(() => {
    const c = [...document.querySelectorAll("svg")].find(s => {
      const bx = s.getBoundingClientRect();
      return bx.width > 200 && bx.height > 80 && !s.closest(".mast");
    });
    /* A VISUAL THAT IS NOT SVG IS INVISIBLE TO EVERY GATE HERE. One page carried an
       isotype in its hero built from HTML <i> squares: this gate read the gap it left
       and reported the first chart 5,000px further down, while textsize and collide
       could not measure it at all. Repeated small empty elements are the signature, so
       name them rather than let a page keep an unmeasurable graphic. */
    const hidden = [];
    document.querySelectorAll(".hero *, .band *").forEach(el => {
      const kids = [...el.children];
      if (kids.length < 12 || el.closest("svg")) return;
      const tag = kids[0].tagName;
      if (!kids.every(k => k.tagName === tag && !k.textContent.trim())) return;
      const ok = kids.every(k => { const b = k.getBoundingClientRect();
        return b.width > 0 && b.width < 24 && b.height < 24; });
      if (ok) hidden.push(`${kids.length}x <${tag.toLowerCase()}> in ` +
        `.${(el.getAttribute("class") || el.tagName).split(" ")[0]}`);
    });
    return {top: c ? Math.round(c.getBoundingClientRect().top + scrollY) : null,
            hidden: [...new Set(hidden)]};
  });
  await p.close();
  if (hidden.length) loose++,
    console.log(`${" ".repeat(18)}      note: graphic built from HTML, unmeasurable by ` +
                `any gate here (${hidden.join("; ")}) — redraw it as SVG`);

  const ceiling = FIXED.has(n) ? LIMIT : (CFG.ceilings[n] ?? LIMIT);
  const kind = FIXED.has(n) || !(n in CFG.ceilings) ? "limit" : "debt";

  if (top === null) {
    /* a page with no chart at all cannot satisfy a cold-open rule, and pretending it
       passes is the silent-pass failure this harness keeps meeting */
    bad++;
    console.log(`${n.padEnd(18)} FAIL  no chart on the page at all`);
  } else if (top > ceiling) {
    bad++;
    console.log(`${n.padEnd(18)} FAIL  first chart @${top}px, over its ${kind} of ${ceiling}px`);
  } else {
    const slack = ceiling - top;
    if (kind === "debt" && slack > 60) {
      loose++;
      console.log(`${n.padEnd(18)} PASS  @${top}px, ${slack}px under its recorded debt ` +
                  `of ${ceiling} — tighten _data/coldopen.json`);
    } else {
      console.log(`${n.padEnd(18)} PASS  @${top}px (${kind} ${ceiling}px)`);
    }
  }
}
await b.close();
const debts = Object.keys(CFG.ceilings).filter(k => list.includes(k)).length;
console.log(bad ? `\n${bad} page(s) open later than they are allowed to`
                : `\nall ${list.length} pages within their cold-open budget` +
                  (debts ? `; ${debts} still carry a recorded debt` : ""));
if (loose) console.log(`${loose} page(s) improved past their recorded debt — lower it so the ratchet holds.`);
process.exit(bad ? 1 : 0);
