/* Labor flow. Hires and separations are FLOWS; employment is a STOCK. They are drawn
   as a diverging area around a shared zero — one axis, both flows in the same unit
   (jobs per quarter) — with the net as a line. Employment never appears on that axis. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, CAT, GRAY, INK} = PV;
const D = await PV.data("churn.json");
const FP = PV.footprint(D.meta);
const Q = D.quarters, N = n => n.toLocaleString("en-US");
const label = q => `${q.year}Q${q.q}`;
const tHires = Q.reduce((a, q) => a + q.hires, 0);
const tSeps  = Q.reduce((a, q) => a + q.seps, 0);
const first = Q[0], last = Q.at(-1);
const neoChurn = Q.reduce((a, q) => a + q.churn_rate, 0) / Q.length;

PV.figures([
  ["key", N(tHires), "hires", `across ${Q.length} quarters`],
  ["", N(tSeps), "separations", "over the same period"],
  ["", (tHires - tSeps >= 0 ? "+" : "") + N(tHires - tSeps), "net jobs",
   `${N(first.emp)} → ${N(last.emp)}`],
  ["", (D.quarters.reduce((a, q) => a + q.churn_rate, 0) / Q.length * 100).toFixed(1) + "%",
   "average churn", "of the workforce, per quarter"]
]);

/* ------------------------------------------------------------ 1. the flows */
{
  const {svg, W, H, m, w, h} = PV.chart("flow", {W: 1100, H: 470, m: {t: 46, r: 87, b: 66, l: 43}});
  const maxF = Math.max(...Q.map(q => Math.max(q.hires, q.seps)));
  const xs = i => m.l + (i / (Q.length - 1)) * w;
  const cy = m.t + h / 2;
  const ys = v => cy - (v / maxF) * (h / 2);
  const bw = Math.max(3, w / Q.length - 3);

  ticks(0, maxF, 3).forEach(v => {
    [1, -1].forEach(sgn => {
      if (v === 0 && sgn < 0) return;
      const y = cy - sgn * (v / maxF) * (h / 2);
      el("line", {x1: m.l, y1: y, x2: m.l + w, y2: y, stroke: "var(--pv-grid)",
        "stroke-width": 1}, svg);
      txt(svg, N(v), {x: m.l - 10, y: y + 4, "text-anchor": "end", class: "pv-tick"});
    });
  });
  Q.forEach((q, i) => {
    if (q.q !== 1 || q.year % 2) return;
    txt(svg, q.year, {x: xs(i), y: m.t + h + 22, "text-anchor": "middle", class: "pv-tick"});
  });
  txt(svg, "Jobs starting or ending in the quarter", {x: m.l, y: m.t - 22, class: "pv-axlab"});
  txt(svg, "hires", {x: m.l + w + 10, y: ys(maxF * .55), class: "pv-lab", fill: SEQ[5]});
  txt(svg, "separations", {x: m.l + w + 10, y: ys(-maxF * .55), class: "pv-lab",
    fill: CAT[1]});

  Q.forEach((q, i) => {
    const x = xs(i) - bw / 2;
    el("rect", {x, y: ys(q.hires), width: bw, height: cy - ys(q.hires), fill: SEQ[4],
      rx: 2}, svg);
    el("rect", {x, y: cy + 1, width: bw, height: cy - ys(q.seps), fill: CAT[1], rx: 2}, svg);
  });
  el("line", {x1: m.l, y1: cy, x2: m.l + w, y2: cy, stroke: "var(--pv-axis)",
    "stroke-width": 1.5}, svg);

  // net as a line on the SAME unit (jobs per quarter) — no second scale
  const net = "M" + Q.map((q, i) => `${xs(i)},${ys(q.net)}`).join("L");
  el("path", {d: net, fill: "none", stroke: INK, "stroke-width": 2}, svg);
  txt(svg, "net", {x: m.l + w + 10, y: ys(last.net) + 4, class: "pv-lab"});

  Q.forEach((q, i) => hoverable(
    el("rect", {x: xs(i) - bw / 2 - 1, y: m.t, width: bw + 2, height: h, fill: "transparent"},
      svg),
    `<b>${label(q)}</b><br><span class="v">${N(q.hires)}</span> hires<br>
     <span class="v">${N(q.seps)}</span> separations<br>
     net <span class="v">${q.net >= 0 ? "+" : ""}${N(q.net)}</span> ·
     <span class="v">${N(q.emp)}</span> jobs
     ${q.counties < FP.n ? `<br>${FP.n - q.counties} of ${FP.n} counties withheld` : ""}`,
    `${label(q)}: ${N(q.hires)} hires, ${N(q.seps)} separations`));

  const thin = Q.filter(q => q.counties < FP.n).length;
  document.getElementById("flowsrc").innerHTML =
    `Source: ${D.meta.source}, NAICS ${D.meta.naics}. ${D.meta.row}. Employment rose
     <b>${((last.emp / first.emp - 1) * 100).toFixed(1)}%</b> across the period while
     <b>${N(tHires)}</b> jobs started and <b>${N(tSeps)}</b> ended — the region replaced
     roughly ${(tHires / first.emp).toFixed(1)} times its own workforce to get there.
     ${thin ? `<b>${thin} of ${Q.length} quarters have one county withheld</b>, so those
     bars are floors — a withheld county drops jobs out of an additive count.` : ""} 2025Q4 is not drawn because QWI has not published it — an
     unpublished quarter is absent, not zero.`;
  document.getElementById("flowtable").innerHTML = tableView("f",
    "Quarterly hires, separations and net change",
    ["Quarter", "Hires", "Separations", "Net", "Jobs", "Counties"],
    Q.map(q => [label(q), N(q.hires), N(q.seps), (q.net >= 0 ? "+" : "") + N(q.net),
      N(q.emp), q.counties]));
}

/* ------------------------------------------------------------- 2. the rate */
{
  // right gutter sized for the direct label it carries — at 390px a 60-unit gutter
  // left "four-quarter average" hanging 3px off the page
  const {svg, W, H, m, w, h} = PV.chart("rate", {W: 1100, H: 320, m: {t: 40, r: 149, b: 60, l: 36}});
  const vals = Q.map(q => q.churn_rate);
  const maxV = Math.max(...vals) * 1.08;
  const xs = i => m.l + (i / (Q.length - 1)) * w;
  const ys = v => m.t + h - (v / maxV) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: [], yt: ticks(0, maxV, 5),
    yfmt: v => (v * 100).toFixed(0) + "%", ylab: "Share of jobs moving in or out, per quarter"});
  Q.forEach((q, i) => { if (q.q === 1 && q.year % 2 === 0)
    txt(svg, q.year, {x: xs(i), y: m.t + h + 22, "text-anchor": "middle", class: "pv-tick"}); });
  el("path", {d: "M" + Q.map((q, i) => `${xs(i)},${ys(q.churn_rate)}`).join("L"),
    fill: "none", stroke: GRAY, "stroke-width": 1.5}, svg);
  // trailing four-quarter mean — the trend under the seasonality
  const roll = Q.map((_, i) => i < 3 ? null
    : Q.slice(i - 3, i + 1).reduce((a, q) => a + q.churn_rate, 0) / 4);
  el("path", {d: "M" + roll.map((v, i) => v == null ? "" : `${xs(i)},${ys(v)}`)
    .filter(Boolean).join("L"), fill: "none", stroke: INK, "stroke-width": 3}, svg);
  txt(svg, "four-quarter average", {x: m.l + w + 8, y: ys(roll.at(-1)) + 4, class: "pv-lab"});
  Q.forEach((q, i) => hoverable(
    el("rect", {x: xs(i) - w / Q.length / 2, y: m.t, width: w / Q.length, height: h,
      fill: "transparent"}, svg),
    `<b>${label(q)}</b><br>churn <span class="v">${(q.churn_rate * 100).toFixed(1)}%</span>
     of <span class="v">${N(q.emp)}</span> jobs`,
    `${label(q)}: churn ${(q.churn_rate * 100).toFixed(1)}%`));
  document.getElementById("ratetable").innerHTML = tableView("r",
    "Churn rate by quarter", ["Quarter", "Churn rate", "Jobs"],
    Q.map(q => [label(q), (q.churn_rate * 100).toFixed(1) + "%", N(q.emp)]));
}

/* ----------------------------------------------------------- 3. by county */
{
  const rows = D.counties.filter(c => c.churn_rate).sort((a, b) => b.churn_rate - a.churn_rate);
  const {svg, W, H, m, w, h} = PV.chart("county", {W: 1100, rows: rows.length, rowH: 30, m: {t: 40, r: 107, b: 56, l: 80}});
  const maxV = Math.max(...rows.map(r => r.churn_rate));
  const xs = v => m.l + (v / maxV) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(0, maxV, 5),
    xfmt: v => (v * 100).toFixed(0) + "%", yt: [],
    xlab: "Average quarterly churn rate, last four published quarters"});
  rows.forEach((r, i) => {
    const y = m.t + i * 30 + 5, bh = 18;
    el("rect", {x: m.l, y, width: Math.max(3, xs(r.churn_rate) - m.l), height: bh,
      fill: SEQ[4], rx: 4}, svg);
    el("rect", {x: m.l, y, width: 4, height: bh, fill: SEQ[4]}, svg);
    txt(svg, r.county, {x: m.l - 12, y: y + bh - 3, "text-anchor": "end", class: "pv-lab"});
    txt(svg, `${(r.churn_rate * 100).toFixed(1)}%  ·  ${N(r.emp)} jobs`,
      {x: xs(r.churn_rate) + 10, y: y + bh - 3, class: "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 5, width: W, height: bh + 10, fill: "transparent"}, svg),
      `<b>${r.county} County</b><br>churn <span class="v">${(r.churn_rate * 100).toFixed(1)}%</span>
       per quarter<br><span class="v">${N(r.hires)}</span> hires and
       <span class="v">${N(r.seps)}</span> separations over four quarters
       ${r.quarters_missing ? `<br>${r.quarters_missing} of 4 quarters withheld` : ""}`,
      `${r.county}: churn ${(r.churn_rate * 100).toFixed(1)}%`);
  });
  const miss = D.counties.filter(c => c.quarters_missing);
  document.getElementById("countytable").innerHTML = tableView("c",
    "Churn by county, last four published quarters",
    ["County", "Churn rate", "Hires", "Separations", "Jobs", "Quarters withheld"],
    rows.map(r => [r.county, (r.churn_rate * 100).toFixed(1) + "%", N(r.hires), N(r.seps),
      N(r.emp), r.quarters_missing]));
  document.getElementById("caveat").innerHTML =
    `<b>What this cannot tell you.</b> QWI counts jobs, not people, so one person taking two
     jobs in a year appears twice, and a person moving between two plants in the same county
     shows as one separation and one hire — churn here includes movement <em>within</em> the
     cluster, which is not the same as leaving it. The data cannot separate a quit from a
     layoff, or a retirement from a poach.
     ${miss.length ? `${miss.length} ${miss.length === 1 ? "county has" : "counties have"}
     at least one withheld quarter and ${miss.length === 1 ? "its" : "their"} totals are
     floors.` : ""}`;
}


/* --------------------------------------------------- 4. against real peers */
/* The peer comparison was removed, not repaired. Three independent defects, two of them
   named by outside review and one of them structural to how this figure is built. The
   explanation stays on the page because it is the more useful artifact. */
document.getElementById("peersrc").innerHTML =
  `<b>Three reasons, and the third one is the interesting one.</b>
   <b>One:</b> a ratio of churn rates is not a ratio of retention. Northeast Ohio at
   ${(neoChurn * 100).toFixed(1)}% quarterly churn against a peer at half that is roughly
   ${(100 - neoChurn * 100).toFixed(0)}% retention against ${(100 - neoChurn * 50).toFixed(0)}%
   &mdash; a real gap, and nothing like "twice as well."
   <b>Two:</b> the peer was selected to match the <em>Akron metro</em> on scale and
   concentration, then measured as a single county against twelve summed ones. The
   geography did not match itself.
   <b>Three:</b> summing counties counts a worker moving from Summit to Stark as a
   separation <em>and</em> a hire. That event pair cannot occur inside a one-county peer,
   so the regional rate is inflated against any single-county benchmark by an amount QWI
   cannot measure. There is no correction factor available; the comparison is not
   repairable at this geography.
   <b>QWI also cannot support the word "holds."</b> It counts separations without
   distinguishing a quit from a layoff from a plant closing, so nothing in this data says
   whether an employer kept anyone. A defensible version of this benchmark would compare
   Summit County alone against Greenville County alone, on the same NAICS and quarters, and
   would call the result turnover rather than loyalty. That is worth building. It is not
   what was here.`;

document.getElementById("closersub").innerHTML =
  `Between ${label(first)} and ${label(last)} the cluster gained
   <b>${N(tHires - tSeps)} net jobs</b> across <b>${N(tHires + tSeps)} hire and separation
   events</b>. Net employment is a legitimate outcome measure &mdash; funders back growth,
   and they are entitled to score it. The point is only that it is roughly
   <b>${Math.round((tHires + tSeps) / (tHires - tSeps))} times smaller</b> than the flow
   that produced it, so a program that changes how people move through this industry can
   do real work without moving the number it is judged on.`;

/* Footprint banner — stated on the page, not left to the reader to infer. */
PV.footprintBanner(FP);

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "churn", meta: D.meta});
})();
