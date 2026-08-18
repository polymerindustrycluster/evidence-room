/* Scaffold a new artifact that already passes the gate.
 *
 *   node tools/new.mjs realwage "What The Paycheck Buys"
 *
 * Writes index.html, app.js, claims.json and data/ into web/<slug>/, wired to the
 * shared core: validated palette, one working chart with its table-view twin, the
 * generated methodology box, and a claims file the harness will pick up.
 *
 * What it deliberately does NOT do is invent the chart. The scaffold ships ONE bar
 * chart because a page needs something that renders on first run; the gate in
 * README.md still applies, and step 2 — name the quantity and the mark encoding it —
 * is a decision no generator can make for you. Delete the example and write the real
 * one. */
import {writeFile, mkdir, readdir} from "node:fs/promises";
import {existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [slug, ...titleParts] = process.argv.slice(2);
const title = titleParts.join(" ");

if (!slug || !title) {
  console.error('usage: node tools/new.mjs <slug> "Page Title"');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(`slug must be lower-case kebab: got "${slug}"`);
  process.exit(1);
}
const dir = path.join(WEB, slug);
if (existsSync(dir)) {
  console.error(`${slug}/ already exists — pick another slug or edit it directly`);
  process.exit(1);
}

const html = `<title>${title}</title>
<link rel="stylesheet" href="../_shared/pic-viz.css">

<header class="mast">
  <div class="wrap">
    <strong>Polymer Industry Cluster</strong>
    <span>Cluster vitals &middot; ${slug}</span>
    <span class="proto">Prototype &middot; internal draft</span>
  </div>
</header>

<section class="hero">
  <div class="wrap">
    <p class="eyebrow">TODO: what this measures, and over what period</p>
    <h1>TODO: the finding, as a sentence with <em>the number in it</em>.</h1>
    <p class="stand">TODO: the standfirst. Say what the data is, what one row is, and
      what this page will not claim. If you cannot say what is uncertain here, you are
      not ready to draw it.</p>
    <div class="hero-row" id="figs"></div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <p class="takeaway">The chart</p>
    <h2 id="maintitle">TODO: a takeaway title, not a label</h2>
    <p class="lede">TODO: what the reader is looking at and why this form was chosen.</p>
    <div class="chart"><svg id="main" role="img" aria-labelledby="main-t">
      <title id="main-t">TODO: a one-sentence description for a screen reader.</title>
    </svg></div>
    <div id="maintable"></div>
    <p class="src" id="mainsrc"></p>
  </div>
</section>

<section class="closer">
  <div class="wrap">
    <p>TODO: the one sentence worth remembering.</p>
    <p class="sub" id="closersub"></p>
  </div>
</section>

<script src="../_shared/picviz.js"></script>
<script src="app.js"></script>
`;

const app = `/* ${title}
 *
 * THE GATE (web/README.md) — answer these in order before writing chart code:
 *   0. What is the dataset, and what is one row?
 *   1. What is the external benchmark?
 *   2. What quantity is encoded, and by what mark? If you cannot say, it is a
 *      document, not a chart.
 *   3. What is uncertain, and how does that show — suppression, revision, small base?
 *   4. Load the \`dataviz\` skill and validate any new palette before using it.
 *   5. Build.
 *   6. node tools/verify.mjs ${slug}
 *   7. Constant dollars for multi-year totals; name what the benchmark contains;
 *      bar charts are always linear.
 *   8. Send the READINGS to two independent model families to refute.
 */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, chart, figures, N,
       SEQ, CAT, GRAY, INK} = PV;

// Put the derived file in data/ — write it from a script in _data/build/ so the page
// is reproducible from source and never hand-edited.
const D = await PV.data("${slug}.json");
const FP = PV.footprint(D.meta);

/* ------------------------------------------------------------ hero figures */
figures([
  ["key", "TODO", "the headline measure", "and what qualifies it"],
  ["", "TODO", "second figure", ""],
]);

/* ---------------------------------------------------------------- 1. chart
   EXAMPLE ONLY — replace with the form the data's job actually calls for. */
{
  const rows = (D.rows || []).slice(0, 12);
  const {svg, m, w, h} = chart("main", {H: 70 + rows.length * 30,
    m: {t: 40, r: 170, b: 56, l: 200}});
  const maxV = Math.max(...rows.map(r => r.value), 1);
  const xs = v => m.l + (v / maxV) * w;              // LINEAR — bars encode from zero
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(0, maxV, 5), yt: [],
    xfmt: N, xlab: "TODO: what the axis measures, with its unit"});
  rows.forEach((r, i) => {
    const y = m.t + i * 30 + 5, bh = 18;
    el("rect", {x: m.l, y, width: Math.max(3, xs(r.value) - m.l), height: bh,
      fill: SEQ[4], rx: 4}, svg);
    txt(svg, r.label, {x: m.l - 12, y: y + bh - 4, "text-anchor": "end", class: "pv-lab"});
    txt(svg, N(r.value), {x: xs(r.value) + 10, y: y + bh - 4, class: "pv-lab"});
    hoverable(el("rect", {x: 0, y: y - 5, width: 1100, height: bh + 10,
      fill: "transparent"}, svg),
      \`<b>\${r.label}</b><br><span class="v">\${N(r.value)}</span>\`,
      \`\${r.label}: \${N(r.value)}\`);
  });
  document.getElementById("maintable").innerHTML = tableView("m",
    "TODO: table caption", ["Label", "Value"],
    rows.map(r => [r.label, N(r.value)]));
  document.getElementById("mainsrc").innerHTML =
    \`\${D.meta.source}. \${D.meta.row} <b>\${D.meta.not || ""}</b>\`;
}

document.getElementById("closersub").innerHTML = "TODO: the qualifying paragraph.";

// Footprint banner — delete if this page is not county-based.
if (D.meta.footprint) PV.footprintBanner(FP);

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "${slug}", meta: D.meta});
})();
`;

const claims = `{
  "data": "${slug}.json",
  "claims": [
    {
      "id": "${slug}-example",
      "text": "TODO: a sentence this page publishes, word for word.",
      "source": "TODO: the dataset and vintage it comes from",
      "assert": "len(D['rows']) > 0",
      "actual": "len(D['rows'])",
      "falsified_if": "TODO: what would make the sentence wrong. This field is the point of the file — a claim without one is not a claim."
    }
  ]
}
`;

await mkdir(path.join(dir, "data"), {recursive: true});
await writeFile(path.join(dir, "index.html"), html, "utf8");
await writeFile(path.join(dir, "app.js"), app, "utf8");
await writeFile(path.join(dir, "claims.json"), claims, "utf8");

console.log(`created ${slug}/
  index.html    hero, one band, closer — fill in every TODO
  app.js        one example chart wired to the shared core
  claims.json   one stub claim; the harness reads this automatically
  data/         put ${slug}.json here, written by a script in _data/build/

next:
  1. write _data/build/derive_${slug}.py so data/${slug}.json is reproducible
  2. node tools/bundle.mjs ${slug}
  3. node tools/verify.mjs ${slug}
  4. python _data/build/verify_claims.py ${slug}`);
