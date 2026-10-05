/* WHAT WOULD PROVE THIS PAGE WRONG, asserted on every story the hub lists.
 *
 *   node tools/breaksif.mjs [names...]
 *
 * The hub promises that each story "states what would contradict its claims". Until
 * 2026-10-05 that was true only of claims.json, which no reader opens: the conditions
 * lived in `falsified_if`, written for the checker. DECISIONS.md (2026-10-04) puts them
 * on the page in plain words, through `breaks_if` on each story's hero claim, and this
 * gate is what keeps the promise kept.
 *
 * For every page with a card on the hub (or every page named), it asserts:
 *   - its claims.json names a `hero` claim, and that claim carries `breaks_if` and
 *     `guards` (the sentence as the page prints it). Read from the SOURCE claims file,
 *     so a renderer cannot vouch for itself;
 *   - every claim with `breaks_if` also has `guards`, and the reverse;
 *   - the page carries exactly one line reading "This finding breaks if: " followed by
 *     the hero claim's sentence, DIRECTLY UNDER THE FIRST CHART: nothing between the
 *     chart's block and the line but its table twin, legend and source lines. First chart
 *     is tools/coldopen.mjs's definition. Under the hero, where it first shipped, it
 *     pushed four first charts past their cold-open ceilings (John, 2026-10-05);
 *   - the page carries one closed "What would prove this page wrong" disclosure, placed
 *     before the methodology box, listing every claim's `breaks_if` with its `guards`;
 *   - every `guards` sentence is printed on the page outside that disclosure, so the list
 *     cannot quote a sentence the page has since rewritten.
 * A page it cannot read (no bundle, no claims file, no hub) FAILS as uninspectable.
 * It checks that the sentences are present and in place, not that they are true: whether
 * a breaks_if names a change that really would make the finding wrong is a reviewer's
 * call, made in the pull request that writes it.
 */
import {readFileSync, existsSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const LEAD = "This finding breaks if:";
const TITLE = "What would prove this page wrong";
const norm = s => String(s || "").replace(/\s+/g, " ").trim();

const listed = existsSync("dist/index.html")
  ? [...readFileSync("dist/index.html", "utf8").matchAll(/<a class="card"[^>]*data-slug="([^"]+)"/g)].map(m => m[1])
  : null;
const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
if (!listed) {
  console.log("cannot inspect: dist/index.html missing, so the hub's story list is unknown (run tools/bundle.mjs)");
  process.exit(1);
}
const list = names.length ? names : listed;

const b = await chromium.launch();
let bad = 0, checked = 0;
for (const n of list) {
  const probs = [];
  if (!listed.includes(n)) { console.log(`${n.padEnd(18)} SKIP  not listed on the hub, not required`); continue; }
  checked++;
  let spec = null;
  try { spec = JSON.parse(readFileSync(`${n}/claims.json`, "utf8")); }
  catch (e) { probs.push(`cannot inspect: ${n}/claims.json unreadable (${e.message.split("\n")[0]})`); }
  const claims = spec?.claims || [];
  const hero = claims.find(c => c.id === spec?.hero);
  if (spec && !spec.hero) probs.push("claims.json names no hero claim");
  else if (spec && !hero) probs.push(`hero "${spec.hero}" is not a claim in claims.json`);
  else if (hero && !hero.breaks_if) probs.push(`hero claim ${hero.id} has no breaks_if`);
  else if (hero && !hero.guards) probs.push(`hero claim ${hero.id} has no guards sentence`);
  for (const c of claims) {
    if (c.breaks_if && !c.guards) probs.push(`${c.id} has breaks_if but no guards`);
    if (c.guards && !c.breaks_if) probs.push(`${c.id} has guards but no breaks_if`);
  }
  const want = claims.filter(c => c.breaks_if && c.guards);

  if (!existsSync(`dist/${n}.html`)) probs.push(`cannot inspect: dist/${n}.html missing`);
  else {
    const p = await b.newPage({viewport: {width: 1440, height: 1000}});
    await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const norm = s => String(s || "").replace(/\s+/g, " ").trim();
      const all = document.querySelectorAll(".pv-breaks-all");
      const sec = all[0], d = sec?.querySelector("details"), method = document.querySelector(".pv-method");
      const body = document.body.cloneNode(true);
      body.querySelectorAll(".pv-breaks-all, .pv-breaks, script").forEach(e => e.remove());
      return {
        lines: [...document.querySelectorAll(".pv-breaks")].map(e => norm(e.textContent)),
        placed: (() => {
          const svg = [...document.querySelectorAll("svg")].find(s => {
            const b = s.getBoundingClientRect();
            return b.width > 200 && b.height > 80 && !s.closest(".mast");
          });
          const line = document.querySelector(".pv-breaks");
          if (!svg) return "cannot inspect: no chart on the page";
          if (!line) return null;
          const tail = e => e.matches("p.src, details, [id$='table'], [class*='legend']") ||
            !!e.querySelector(":scope > .pv-table");
          let at = svg.closest(".wrap > *") || svg;
          while (at.nextElementSibling && at.nextElementSibling !== line && tail(at.nextElementSibling))
            at = at.nextElementSibling;
          return at.nextElementSibling === line ? null : "the breaks-if line is not directly under the first chart";
        })(),
        sections: all.length,
        summary: norm(d?.querySelector("summary")?.textContent),
        open: d ? d.open : null,
        before: !!(sec && method && (sec.compareDocumentPosition(method) & Node.DOCUMENT_POSITION_FOLLOWING)),
        items: [...(sec?.querySelectorAll("li") || [])].map(li => norm(li.textContent)),
        text: norm(body.textContent),
      };
    });
    await p.close();
    if (hero && hero.breaks_if) {
      const line = `${LEAD} ${norm(hero.breaks_if)}`;
      if (r.lines.length !== 1) probs.push(`${r.lines.length} breaks-if lines on the page, not one`);
      else if (r.lines[0] !== line) probs.push(`the breaks-if line reads "${r.lines[0]}", not the hero claim's`);
      if (r.placed) probs.push(r.placed);
    }
    if (r.sections !== 1) probs.push(`${r.sections} "${TITLE}" disclosures, not one`);
    else {
      if (r.summary !== TITLE) probs.push(`disclosure is titled "${r.summary}"`);
      if (r.open !== false) probs.push("disclosure is not a closed <details>");
      if (!r.before) probs.push("disclosure does not sit before the methodology box");
      if (r.items.length !== want.length) probs.push(`disclosure lists ${r.items.length} claims, claims.json has ${want.length}`);
      for (const c of want)
        if (!r.items.some(t => t.includes(norm(c.guards)) && t.includes(norm(c.breaks_if))))
          probs.push(`disclosure lacks ${c.id}`);
    }
    for (const c of want)
      if (!r.text.includes(norm(c.guards)))
        probs.push(`${c.id} guards a sentence the page does not print: "${norm(c.guards).slice(0, 70)}"`);
  }
  if (probs.length) bad++;
  console.log(`${n.padEnd(18)} ${probs.length ? "FAIL  " + probs.join("; ")
                                              : `PASS  line under the first chart and ${want.length} in the disclosure`}`);
}
await b.close();
console.log(bad ? `\n${bad} listed page(s) do not state what would prove them wrong`
                : `\nall ${checked} listed pages state what would prove their headline wrong, under the first chart and in full`);
process.exit(bad ? 1 : 0);
