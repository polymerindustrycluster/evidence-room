/* CROSS-PAGE NUMBER DRIFT — the class every per-page check is blind to by construction.
 *
 *   node tools/crosspage.mjs [--all] [names...]
 *
 * Each page here is built as an isolated artifact with its own data pull and its own
 * claims file, and verify_claims.py asserts each page against ITS OWN data. That isolation
 * is why the per-page guards are strong, and exactly why nothing watched BETWEEN pages. A
 * naive-reader pass on 2026-08-29 found the hub calling the Tech Hub award "about a year
 * and a half" of routine contracting while the dashboard called it "about 1.4 years", one
 * page counting 24,030 polymer jobs in 2025 and another 23,457, a concentration printed as
 * 2.32x here and 2.44x there, and a hub card advertising 23 claims for a 27-claim page.
 * Every one of those passed every gate.
 *
 * TWO SIGNALS, because the drift does not announce itself with matching prose:
 *
 *   NEAR-VALUE   two pages print numbers 0.5% to 15% apart in contexts sharing content
 *                words. Identical numbers are fine; wildly different ones are usually
 *                different quantities; near-but-not-equal is the signature of a figure
 *                recomputed on a second basis, a second vintage, or a second rounding.
 *
 *   NAMED ENTITY two pages attach different numbers to the same distinctive proper noun
 *                (NEO-SMART, Tech Hub, Synthe6). This is the one that catches a 10x gap:
 *                $160M against $14,999,983 for the same award.
 *
 * This is a REPORT, not a pass/fail gate. It cannot know whether two figures are the same
 * quantity, so it hands a human candidates and takes silence as the default. Anything it
 * confirms as a real shared quantity belongs in _data/FIGURES.json, which IS assertable.
 */
import {readdirSync, readFileSync, existsSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const STOP = new Set(("the a an of in on at to for and or is are was were be been it its" +
  " this that these those with by from as than then so but not no than out up over under" +
  " one two three four five six seven eight nine ten per each every all any both").split(/\s+/));
/* Years, industry codes and CIP programme codes are not quantities; they dominate any
   naive extraction (993 distinct figures on this site, and the top thirty were all codes). */
const CODE = /^(?:19|20)\d\d$|^3(?:25|26)\d*$|^1[45]\d{4}$|^40\d{4}$/;

const args = process.argv.slice(2);
const names = args.filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

const b = await chromium.launch();
const found = [];
for (const n of list) {
  const p = await b.newPage({viewport: {width: 1440, height: 1200}});
  await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
  await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelectorAll("details").forEach(d => (d.open = true)));
  await p.waitForTimeout(200);
  const text = await p.evaluate(() => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let t, out = [];
    while ((t = w.nextNode())) {
      const e = t.parentElement;
      if (!e || e.closest("script,style,noscript")) continue;
      /* THE APPARATUS IS EXCLUDED, AND THAT IS NOT A LOOPHOLE. Every page carries the
         same methodology box and the same source registry, each printing ITS OWN counts
         and the same agency codes. Those numbers are supposed to differ page to page, so
         including them buried the real findings under thousands of false pairs: "There
         are 29 of them" against "There are 30 of them" is two pages correctly reporting
         their own claim totals. Drift that matters lives in editorial claims. */
      if (e.closest(".pv-method")) continue;
      /* TABLE CELLS ARE EXCLUDED TOO. A table is the raw material; the claim is the
         sentence. Two pages tabulating the same twelve counties produce a positional key
         match on every row while the columns hold different measures entirely, which is a
         job count paired against a weekly wage. The drift a reader actually trips over
         lives in prose, headlines and stat cards, and that is what this reads. */
      if (e.closest("td,th")) continue;
      const s = t.textContent.replace(/\s+/g, " ").trim();
      if (s) out.push(s);
    }
    return out.join(" ");
  });
  await p.close();

  const re = /\$?(\d[\d,]*(?:\.\d+)?)\s?(million|billion|percent|%|×|x\b|M\b|B\b|k\b)?/g;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[1].replace(/,/g, "");
    if (CODE.test(raw)) continue;
    let v = parseFloat(raw);
    if (!isFinite(v)) continue;
    const u = (m[2] || "").toLowerCase();
    if (u === "million" || u === "m") v *= 1e6;
    else if (u === "billion" || u === "b") v *= 1e9;
    else if (u === "k") v *= 1e3;
    if (v < 10) continue;                       // ratios below 10 are too common to key on
    const before = text.slice(Math.max(0, m.index - 90), m.index);
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 50);
    /* THE KEY IS POSITIONAL, NOT A BAG OF WORDS. A bag matched every cell of a shared
       table against every other cell, because they sit among the same entity names: the
       first build reported 5,117 candidates, nearly all of them one table cross-producted
       with itself. What identifies a quantity is the words immediately AROUND it. */
    const cw = t => (t.toLowerCase().match(/[a-z][a-z-]{2,}/g) || []).filter(w => !STOP.has(w));
    const pre = cw(before).slice(-2), post = cw(after).slice(0, 2);
    found.push({page: n, v, shown: m[0].trim(), unit: u,
                key: pre.concat(post),
                ctx: (before.slice(-58) + "[" + m[0].trim() + "]" + after.slice(0, 22))
                       .replace(/\s+/g, " ")});
  }
}
await b.close();

/* Two figures are candidates for the same quantity when the words hugging them agree.
   Three of the four positional slots must match: that keeps "1.5 years of" against
   "1.4 years of" and "NEO-SMART Engine $160M" against "NEO-SMART Engine, $15.0 million",
   while dropping two cells that merely share a table. */
const agree = (a, b2) => a.filter(x => b2.includes(x)).length;
const hits = [];
for (let i = 0; i < found.length; i++) {
  for (let j = i + 1; j < found.length; j++) {
    const A = found[i], B = found[j];
    if (A.page === B.page || A.v === B.v) continue;
    if (A.key.length < 3 || B.key.length < 3) continue;
    /* A dollar figure is not a percentage is not a multiple. Same slot, different unit,
       means two different measures of one subject, not one measure printed twice. */
    const cls = x => x.shown.startsWith("$") ? "$"
                   : /[%]/.test(x.shown) ? "%" : /[×x]$/.test(x.shown) ? "x" : "n";
    if (cls(A) !== cls(B)) continue;
    const shared = agree(A.key, B.key);
    if (shared < 3) continue;
    /* THE ADJACENT WORD IS THE ANCHOR. Without it a ranked list matches its own
       neighbours: "Pennsylvania 39,698" against "Michigan 39,518" shares three of four
       slots purely because the two lists run in the same order. key[1] is the word
       immediately before the figure and key[2] the word immediately after; one of them
       must be identical, which is what makes two figures a claim about the same thing
       rather than two entries in the same list. */
    if (A.key[1] !== B.key[1] && A.key[2] !== B.key[2]) continue;
    const hi = Math.max(A.v, B.v), lo = Math.min(A.v, B.v);
    const gap = (hi - lo) / hi;
    hits.push({why: gap < 0.15 ? "near-value" : "same-slot",
               gap: (gap * 100).toFixed(1) + "%", A, B, shared});
  }
}
/* one row per page-pair-and-value, strongest signal first */
const seen = new Set();
const ranked = hits
  .sort((x, y) => y.shared - x.shared || parseFloat(x.gap) - parseFloat(y.gap))
  .filter(h => {
    const k = [h.A.key.join(","), h.A.v, h.B.v].sort().join("|");
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

const REG = "_data/FIGURES.json";
const known = existsSync(REG)
  ? new Set(Object.values(JSON.parse(readFileSync(REG, "utf8")).figures || {})
      .flatMap(f => (f.also_printed_as || []).concat([f.display])))
  : new Set();

const fresh = ranked.filter(h => !(known.has(h.A.shown) && known.has(h.B.shown)));
console.log(`${found.length} figures read across ${list.length} pages`);
console.log(`${ranked.length} cross-page candidate(s), ${ranked.length - fresh.length} already reconciled in ${REG}\n`);
for (const h of fresh.slice(0, 25)) {
  console.log(`[${h.why}${h.why === "near-value" ? " " + h.gap : ""}] ` +
              `${h.A.page} ${h.A.shown}  vs  ${h.B.page} ${h.B.shown}`);
  console.log(`    ${h.A.page}: ...${h.A.ctx}`);
  console.log(`    ${h.B.page}: ...${h.B.ctx}\n`);
}
if (fresh.length > 25) console.log(`...and ${fresh.length - 25} more`);
console.log(fresh.length
  ? "\nEach is a CANDIDATE, not a verdict. Confirm the two are the same quantity, then\n" +
    "either reconcile the pages or record the pair in _data/FIGURES.json with the basis\n" +
    "that makes them legitimately different."
  : "\nno unreconciled cross-page drift");
