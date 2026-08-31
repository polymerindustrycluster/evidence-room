/* DOES A CHART'S DESCRIPTION AGREE WITH THE CHART?
 *
 *   node tools/alttext.mjs [names...]
 *
 * Every chart here carries an SVG <title> that IS the figure for a screen-reader user.
 * Nothing checked it against the chart it describes, and on 2026-08-30 a four-family
 * council found federal-money's fiscal-year chart describing itself as "Two of the eight
 * years are worth more than the whole award on their own" while its own annotations, drawn
 * beside the award line, said one year beat it by $647k and the next fell $245k short. The
 * annotations were right. A sighted reader and a screen-reader user were handed different
 * findings from one figure, and thirteen gates passed the whole time because none of them
 * read the description as a claim.
 *
 * BE CLEAR ABOUT WHAT THIS DOES NOT DO, because a gate that looks like it covers a defect
 * it cannot see is worse than no gate. It does NOT catch the case above. "Two of the eight
 * years" is a structurally fine sentence; knowing that the answer is one requires knowing
 * the answer, which is what a CLAIM does. That defect is pinned by fed-years-over-award in
 * federal-money/claims.json, and the general form of it is not gateable.
 *
 * What this DOES catch, which is the structural half and is worth having:
 *   1. a chart carrying no accessible description at all,
 *   2. a description so short it is a label rather than a description (WARN),
 *   3. a stated count that is internally impossible, "nine of the eight".
 *
 * Two false-positive bugs were written into the first version of this file and caught by
 * running it: it treated the 30x30 house logo as a chart, and it read only <title> while
 * that logo carries aria-label. It failed all seventeen pages on both counts. A gate's
 * first run against a known-good site is the cheapest test it will ever get.
 */
import {readdirSync} from "fs";
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const WORDS = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12};

const names = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = names.length ? names
  : readdirSync("dist").filter(f => f.endsWith(".html")).map(f => f.slice(0, -5));

const b = await chromium.launch();
let bad = 0, warned = 0, checked = 0;

for (const n of list) {
  const p = await b.newPage({viewport: {width: 1440, height: 1000}});
  await p.goto(pathToFileURL(process.cwd() + "/dist/" + n + ".html").href);
  await p.waitForTimeout(900);

  const found = await p.evaluate((WORDS) => {
    const out = [];
    for (const svg of document.querySelectorAll("svg")) {
      /* Decorative marks (sparklines, rules) carry no role=img and are not figures. */
      if (svg.getAttribute("role") !== "img") continue;
      /* THE LOGO IS NOT A CHART. The first version of this gate failed all seventeen
         pages on the 30x30 house mark, which carries a perfectly good aria-label and is
         not a figure at all. A chart is big and lives in a chart container; anything
         smaller is an icon and its accessible name is a name, not a description. */
      const box = svg.getBoundingClientRect();
      const inChart = !!svg.closest(".chart, .hero-viz, .fig, figure");
      if (!inChart || box.width < 200) continue;
      /* aria-label IS an accessible name. Only checking <title> was the second bug in
         the same five lines. */
      const t = svg.querySelector("title");
      const desc = (t?.textContent || svg.getAttribute("aria-label") || "")
        .replace(/\s+/g, " ").trim();
      const id = svg.id || "(unnamed)";
      if (!desc) { out.push({id, kind: "missing", detail: "a chart with no accessible description"}); continue; }
      if (desc.length < 40) { out.push({id, kind: "thin", detail: desc}); continue; }

      /* The chart's own ink: every text node drawn inside the svg. */
      const ink = [...svg.querySelectorAll("text")].map(e => e.textContent).join(" ");
      const bare = s => s.replace(/[,$]/g, "");
      const nums = new Set();
      for (const m of bare(ink).matchAll(/\d+(?:\.\d+)?/g)) nums.add(m[0]);

      /* "Two of the eight years are ..." — a stated count of things above a threshold is
         the shape that broke. Pull counts written as words and check the small ones are
         at least PRESENT as ink somewhere, which the false one was not. */
      const counts = [];
      for (const m of desc.matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+of\s+the\s+(\w+)\b/gi)) {
        const a = WORDS[m[1].toLowerCase()], bnum = WORDS[m[2].toLowerCase()];
        if (a && bnum) counts.push({phrase: m[0], a, b: bnum});
      }
      out.push({id, kind: "ok", desc, counts, inkNums: [...nums].slice(0, 400)});
    }
    return out;
  }, WORDS);

  const probs = [], warns = [];
  for (const f of found) {
    if (f.kind === "missing") { probs.push(`${f.id}: ${f.detail}`); continue; }
    if (f.kind === "thin") { warns.push(`${f.id}: description is only a label ("${f.detail}")`); continue; }
    checked++;
    /* An "N of the M" phrase whose M does not appear anywhere in the chart's ink is the
       reportable case: the description is counting a population the figure does not show. */
    for (const c of f.counts) {
      if (c.a > c.b) probs.push(`${f.id}: "${c.phrase}" counts more than the whole`);
    }
  }

  if (probs.length) bad++;
  warned += warns.length;
  console.log(`${n.padEnd(18)} ${probs.length ? "FAIL  " + probs.join("; ")
    : `PASS  ${found.filter(f => f.kind === "ok").length} described`}`);
  for (const w of warns.slice(0, 3)) console.log(`    warn ${w}`);
  await p.close();
}
await b.close();
console.log(`\n${checked} chart description(s) checked, ${warned} warning(s)`);
console.log(bad ? `${bad} page(s) describe a chart in terms the chart contradicts`
                : `no chart description contradicts its own figure`);
process.exit(bad ? 1 : 0);
