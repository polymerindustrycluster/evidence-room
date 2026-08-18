/* Revisions. The subject is the difference between what was published and what is
   published now, so the form is a dumbbell per reference month (first → latest) and a
   distribution of the deltas. Diverging color is correct here: zero genuinely means
   "no revision", and up and down are opposites. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, CAT, GRAY, INK} = PV;
const D = await PV.data("revisions.json");
const P = D.periods;
const N = n => n.toLocaleString("en-US");
const mon = d => d.slice(0, 7);
const SERIES = [...new Set(P.map(p => p.series))];
let picked = SERIES.includes("WPU072") ? "WPU072" : SERIES[0];

const totalPeriods = new Set(D.all.map(r => r.series + r.date)).size;
const med = a => { const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

PV.figures([
  ["key", Math.round(P.length / totalPeriods * 100) + "%", "were revised",
   `${N(P.length)} of ${N(totalPeriods)} published months`],
  ["", (P.reduce((a, p) => a + p.revisions, 0) / P.length).toFixed(1), "revisions each",
   `up to ${Math.max(...P.map(p => p.revisions))} times`],
  ["", med(P.map(p => Math.abs(p.pct || 0))).toFixed(2) + "%", "typical move",
   "median absolute change"],
  ["", P.filter(p => (p.pct || 0) < 0).length + " / " + P.filter(p => (p.pct || 0) > 0).length,
   "down / up", "which way first estimates lean"]
]);

/* ------------------------------------------------------------ 1. the paths */
function drawPaths() {
  const rows = P.filter(p => p.series === picked).sort((a, b) => a.date.localeCompare(b.date));
  const {svg, W, H, m, w, h} = PV.chart("path", {W: 1100, H: 430, m: {t: 44, r: 110, b: 62, l: 32}});
  while (svg.childNodes.length > 1) svg.removeChild(svg.lastChild);
  const vals = rows.flatMap(r => [r.first, r.latest]);
  const lo = Math.min(...vals) * 0.995, hi = Math.max(...vals) * 1.005;
  const xs = i => m.l + (i / (rows.length - 1)) * w;
  const ys = v => m.t + h - ((v - lo) / (hi - lo)) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: [], yt: ticks(lo, hi, 5),
    yfmt: v => v.toFixed(0), ylab: "Index level"});
  rows.forEach((r, i) => { if (r.date.slice(5, 7) === "01")
    txt(svg, r.date.slice(0, 4), {x: xs(i), y: m.t + h + 22, "text-anchor": "middle",
      class: "pv-tick"}); });
  // the two vintages as two thin lines, plus a stem where they differ
  rows.forEach((r, i) => {
    const up = r.latest >= r.first;
    el("line", {x1: xs(i), y1: ys(r.first), x2: xs(i), y2: ys(r.latest),
      stroke: up ? CAT[0] : CAT[1], "stroke-width": 2}, svg);
  });
  el("path", {d: "M" + rows.map((r, i) => `${xs(i)},${ys(r.first)}`).join("L"),
    fill: "none", stroke: GRAY, "stroke-width": 1.5, opacity: .8}, svg);
  el("path", {d: "M" + rows.map((r, i) => `${xs(i)},${ys(r.latest)}`).join("L"),
    fill: "none", stroke: INK, "stroke-width": 2}, svg);
  // the two vintages can end within a few pixels of each other; nudge them apart so the
  // labels never print on one another
  {
    const a = ys(rows.at(-1).first), b = ys(rows.at(-1).latest);
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const sep = hi - lo < 20 ? 20 : hi - lo;
    const mid = (a + b) / 2;
    txt(svg, "as first published", {x: m.l + w + 8, y: mid + sep / 2 + 4, class: "pv-labq"});
    txt(svg, "today", {x: m.l + w + 8, y: mid - sep / 2 + 4, class: "pv-lab"});
  }
  rows.forEach((r, i) => hoverable(
    el("rect", {x: xs(i) - w / rows.length / 2, y: m.t, width: Math.max(3, w / rows.length),
      height: h, fill: "transparent"}, svg),
    `<b>${mon(r.date)}</b><br>first published <span class="v">${r.first}</span><br>
     today <span class="v">${r.latest}</span><br>
     <span class="v">${r.pct > 0 ? "+" : ""}${r.pct}%</span> across
     <span class="v">${r.revisions}</span> revision${r.revisions === 1 ? "" : "s"}`,
    `${mon(r.date)}: ${r.first} to ${r.latest}`));
  document.getElementById("pathtitle").textContent =
    `First published against latest — ${rows[0].label}`;
  document.getElementById("pathsrc").innerHTML =
    `${D.meta.source}. ${D.meta.row}. ${D.meta.why} Showing
     <b>${rows[0].label}</b>; ${N(rows.length)} of its months were revised at least once,
     between ${mon(rows[0].date)} and ${mon(rows.at(-1).date)}.`;
  document.getElementById("pathtable").innerHTML = tableView("p",
    `Revision history — ${rows[0].label}`,
    ["Month", "First published", "Today", "Change", "Revisions"],
    rows.map(r => [mon(r.date), r.first, r.latest,
      (r.pct > 0 ? "+" : "") + r.pct + "%", r.revisions]));
}

document.querySelectorAll("[data-series]").forEach(() => {});
drawPaths();

/* ----------------------------------------------------- 2. the distribution */
{
  const pcts = P.map(p => p.pct).filter(v => v != null);
  const {svg, W, H, m, w, h} = PV.chart("dist", {W: 1100, H: 300, m: {t: 40, r: 0, b: 62, l: 26}});
  const lim = Math.max(...pcts.map(Math.abs)) * 1.05;
  const bins = 41, step = (2 * lim) / bins;
  const counts = new Array(bins).fill(0);
  pcts.forEach(v => counts[Math.min(bins - 1, Math.floor((v + lim) / step))]++);
  const maxC = Math.max(...counts);
  const xs = v => m.l + ((v + lim) / (2 * lim)) * w;
  const ys = c => m.t + h - (c / maxC) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: ticks(-lim, lim, 7),
    xfmt: v => (v > 0 ? "+" : "") + v.toFixed(1) + "%", yt: ticks(0, maxC, 4),
    xlab: "Total change from first published value to today",
    ylab: "Months"});
  counts.forEach((c, i) => {
    if (!c) return;
    const v0 = -lim + i * step;
    const x = xs(v0) + 1, bwi = Math.max(2, (w / bins) - 2);
    el("rect", {x, y: ys(c), width: bwi, height: m.t + h - ys(c),
      fill: v0 + step / 2 < 0 ? CAT[1] : SEQ[4], rx: 2}, svg);
    hoverable(el("rect", {x, y: m.t, width: bwi, height: h, fill: "transparent"}, svg),
      `<b>${(v0 > 0 ? "+" : "") + v0.toFixed(2)}% to
       ${(v0 + step > 0 ? "+" : "") + (v0 + step).toFixed(2)}%</b><br>
       <span class="v">${c}</span> month${c === 1 ? "" : "s"}`,
      `${v0.toFixed(2)}% to ${(v0 + step).toFixed(2)}%: ${c} months`);
  });
  el("line", {x1: xs(0), y1: m.t - 6, x2: xs(0), y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 2}, svg);
  txt(svg, "no revision", {x: xs(0) + 8, y: m.t - 10, class: "pv-lab", fill: "var(--hover)"});
  const down = pcts.filter(v => v < 0).length, up = pcts.filter(v => v > 0).length;
  document.getElementById("disttable").innerHTML = tableView("d",
    "Revision size distribution", ["Measure", "Value"],
    [["Months revised at least once", N(P.length)],
     ["Revised downward", N(down)], ["Revised upward", N(up)],
     ["Median absolute change", med(pcts.map(Math.abs)).toFixed(3) + "%"],
     ["Largest single change", Math.max(...pcts.map(Math.abs)).toFixed(3) + "%"],
     ["Mean revisions per month", (P.reduce((a, p) => a + p.revisions, 0) / P.length).toFixed(2)]]);
  document.getElementById("caveat").innerHTML =
    `<b>Why this matters more than it looks.</b> These revisions are small — a median of
     ${med(pcts.map(Math.abs)).toFixed(2)}%, largest
     ${Math.max(...pcts.map(Math.abs)).toFixed(2)}% — and that is the finding, not a
     disappointment. <b>It does not mean a fresh figure is "safe to act on"</b>, which is
     how an earlier version of this sentence overreached: a small median revision says
     nothing about whether a <em>turning point</em> survives, and the newest months are the
     least revised only because they have had the least time to be. What it does support is
     narrower and still useful — the <em>level</em> of a producer-price series does not move
     much once published. The same is
     <em>not</em> true of every source on the other pages: county employment and the
     Quarterly Workforce Indicators revise substantially more, and QWI restates whole
     histories when it re-benchmarks. This page is the method; running it against the
     employment series is the follow-up worth doing before any of those numbers reaches a
     board packet. ${down > up
       ? `First estimates here lean <b>high</b> — ${N(down)} months were later revised down
          against ${N(up)} revised up.`
       : `First estimates here lean <b>low</b> — ${N(up)} months were later revised up
          against ${N(down)} revised down.`}`;
  document.getElementById("closersub").innerHTML =
    `Nothing on this page contradicts the other five. It calibrates them. <b>A figure with
     a revision history you have looked at is worth more than one you have not</b>, and the
     archival vintages are free from the same API that serves the current values.`;
}

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
/* revisions.json carries `why` — rationale, now classified METHOD rather than a
   limitation — and no caveats. The page published an empty Limitations section until the
   three-way classification exposed it. These are the page's own boundaries. */
await PV.methodology({page: "revisions", meta: {...D.meta,
  not: "Three price series, not a general claim about official statistics. Other " +
    "indicators revise harder and some barely move; nothing here measures them.",
  caution: "The most recent vintage on each chart is itself an estimate and will be " +
    "revised again. 'Final' is not a status these series have.",
  excludes: "A revision is only visible where ALFRED archived a vintage. A month showing " +
    "one value is not evidence it never moved — it may be evidence nobody kept the " +
    "earlier print.",
}});
})();
