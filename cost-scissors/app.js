/* The polymer price chain, in three stages. Forms follow the jobs: retracement is a SHARE
   of a known whole, so it gets a bar against a full-width track; the level histories are
   change-over-time on a common rebased scale, so they get lines with emphasis by stage;
   the spread is one derived quantity over time, so it gets a single line around a zero
   baseline. No dual axis anywhere — indexing is what buys the shared axis. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, CAT, GRAY, INK} = PV;
const D = await PV.data("scissors.json");
const S = D.series;
const STAGE = {feedstock: {c: "#A32A78", n: "Feedstock"},
               resin:     {c: CAT[1],    n: "Resin"},
               product:   {c: "#008BA8", n: "Product"},
               context:   {c: GRAY,      n: "Context"}};
const ORDER = ["feedstock", "resin", "product", "context"];
const pct = v => (v * 100).toFixed(0) + "%";
const mon = d => d.slice(0, 7);
const has = S.filter(s => s.retraced !== null && s.stage !== "context")
             .sort((a, b) => b.retraced - a.retraced);
const gas = S.find(s => /natural gas/i.test(s.label));
const prod = S.find(s => s.stage === "product" && /plastics and rubber/i.test(s.label))
          || S.find(s => s.stage === "product");
const resin = S.find(s => /resin manufacturing/i.test(s.label))
           || S.find(s => s.stage === "resin");

PV.figures([
  ["key", pct(gas.retraced), "of the gas spike is gone", `now ${gas.now.index.toFixed(0)} against a 2019 base of 100`],
  ["", pct(resin.retraced), "of the resin spike is gone", "what converters buy"],
  ["", pct(prod.retraced), "of the product spike is gone", `still at ${prod.now.index.toFixed(0)} — its peak is this month`],
  ["", "+" + (prod.now.index - resin.now.index).toFixed(0), "point spread", "output above input since 2019"]
]);

/* ------------------------------------------------------------ 1. the ladder */
{
  const rows = has;
  const {svg, W, H, m, w, h} = PV.chart("ladder", {W: 1100, rows: rows.length, rowH: 42, m: {t: 52, r: 85, b: 56, l: 307}});
  const xs = v => m.l + Math.max(0, Math.min(1, v)) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, yt: [],
    xt: [0, .25, .5, .75, 1], xfmt: pct,
    xlab: "Share of the rise above January 2019 that has come back"});
  rows.forEach((s, i) => {
    const y = m.t + i * 42 + 8, bh = 24, c = STAGE[s.stage].c;
    el("rect", {x: m.l, y, width: w, height: bh, fill: "#EDE9E2", rx: 4}, svg);
    el("rect", {x: m.l, y, width: Math.max(3, xs(s.retraced) - m.l), height: bh,
      fill: c, rx: 4}, svg);
    txt(svg, s.label.replace(/^PPI: /, ""), {x: m.l - 14, y: y + bh - 6,
      "text-anchor": "end", class: "pv-lab"});
    txt(svg, STAGE[s.stage].n.toUpperCase(), {x: m.l - 14, y: y + bh + 9,
      "text-anchor": "end", class: "pv-labq", fill: c});
    txt(svg, `${pct(s.retraced)} back`, {x: m.l + w + 12, y: y + bh - 12, class: "pv-lab"});
    txt(svg, `now ${s.now.index.toFixed(0)}`, {x: m.l + w + 12, y: y + bh + 5,
      class: "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 8, width: W, height: bh + 18, fill: "transparent"},
      svg), `<b>${s.label}</b><br>${STAGE[s.stage].n} stage<br>
      peaked at <span class="v">${s.peak.index.toFixed(1)}</span> in ${mon(s.peak.date)}<br>
      now <span class="v">${s.now.index.toFixed(1)}</span> ·
      <span class="v">${pct(s.retraced)}</span> of the rise retraced`,
      `${s.label}: ${pct(s.retraced)} retraced`);
  });
  document.getElementById("laddertable").innerHTML = tableView("ld",
    "Peak, current level and retracement by stage (January 2019 = 100)",
    ["Series", "Stage", "Peak", "Peak month", "Now", "Retraced"],
    rows.map(s => [s.label, STAGE[s.stage].n, s.peak.index.toFixed(1), mon(s.peak.date),
      s.now.index.toFixed(1), pct(s.retraced)]));
  document.getElementById("laddersrc").innerHTML =
    `${D.meta.sources}. ${D.meta.row}. <b>${D.meta.base_month_bias}</b>
     Retracement is defined as (peak &minus; now) &divide; (peak &minus; 100), so a series
     that never rose above its base has no retracement and is not shown. Industrial
     chemicals is excluded here as context rather than a link in this chain.`;
}

/* ------------------------------------------------------------- 2. the lines */
{
  const draw = S.filter(s => s.stage !== "context");
  const {svg, W, H, m, w, h} = PV.chart("lines", {W: 1100, H: 460, m: {t: 46, r: 222, b: 62, l: 32}});
  const all = draw.flatMap(s => s.points);
  const dates = [...new Set(all.map(p => p.date))].sort();
  const maxV = Math.max(...all.map(p => p.index)) * 1.04;
  const xs = d => m.l + (dates.indexOf(d) / (dates.length - 1)) * w;
  const ys = v => m.t + h - (v / maxV) * h;
  const yrs = [...new Set(dates.map(d => d.slice(0, 4)))].filter((_, i) => i % 2 === 0);
  frame(svg, {x: m.l, y: m.t, w, h, xs: d => xs(d), ys,
    xt: yrs.map(y => dates.find(d => d.startsWith(y))).filter(Boolean),
    yt: ticks(0, maxV, 6), xfmt: d => d.slice(0, 4),
    xlab: "", ylab: "Index, January 2019 = 100"});
  el("line", {x1: m.l, y1: ys(100), x2: m.l + w, y2: ys(100), stroke: INK,
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  // the base-line caption sits inside the line cluster; a plate keeps it readable
  {
    const LBL = "100 — the January 2019 level", lw = LBL.length * 6.4;
    el("rect", {x: m.l + 4, y: ys(100) - 21, width: lw + 8, height: 18,
      fill: "var(--paper)", opacity: .92, rx: 3}, svg);
    txt(svg, LBL, {x: m.l + 8, y: ys(100) - 8, class: "pv-lab"});
  }

  // right-hand labels nudged apart so none collide
  const ends = draw.map(s => ({s, y: ys(s.points.at(-1).index)}))
                   .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
  draw.forEach(s => {
    const c = STAGE[s.stage].c;
    el("path", {d: "M" + s.points.map(p => `${xs(p.date)},${ys(p.index)}`).join("L"),
      fill: "none", stroke: c, "stroke-width": 2.4, opacity: .92}, svg);
    const e = ends.find(x => x.s === s);
    txt(svg, `${s.points.at(-1).index.toFixed(0)} ${s.label.replace(/^PPI: /, "").slice(0, 30)}`,
      {x: m.l + w + 10, y: e.y + 4, class: "pv-labq", fill: c});
  });
  dates.forEach(d => hoverable(el("rect", {x: xs(d) - w / dates.length / 2, y: m.t,
    width: Math.max(2, w / dates.length), height: h, fill: "transparent"}, svg),
    `<b>${mon(d)}</b><br>` + ORDER.filter(g => g !== "context").map(g =>
      draw.filter(s => s.stage === g).map(s => {
        const p = s.points.find(x => x.date === d);
        return p ? `${s.label.replace(/^PPI: /, "").slice(0, 30)}
          <span class="v">${p.index.toFixed(0)}</span>` : "";
      }).filter(Boolean).join("<br>")).filter(Boolean).join("<br>"),
    mon(d)));
  document.getElementById("linestable").innerHTML = tableView("ln",
    "Index level by series, January of each year (January 2019 = 100)",
    ["Series", "Stage", ...dates.filter(d => d.endsWith("-01-01")).map(d => d.slice(0, 4))],
    draw.map(s => [s.label, STAGE[s.stage].n,
      ...dates.filter(d => d.endsWith("-01-01")).map(d => {
        const p = s.points.find(x => x.date === d); return p ? p.index.toFixed(0) : "—";
      })]));
  document.getElementById("linessrc").innerHTML =
    `${D.meta.rebasing} ${D.meta.caution} <b>These are national series.</b> Henry Hub is not
     what an Ohio plant pays delivered or hedged, and a producer-price index is an average
     across an industry, not any member's realized price.`;
}

/* ------------------------------------------------------------ 3. the spread */
{
  const dates = prod.points.map(p => p.date)
    .filter(d => resin.points.some(p => p.date === d));
  const pts = dates.map(d => ({date: d,
    v: prod.points.find(p => p.date === d).index - resin.points.find(p => p.date === d).index}));
  const {svg, W, H, m, w, h} = PV.chart("spread", {W: 1100, H: 340, m: {t: 44, r: 70, b: 60, l: 34}});
  const lo = Math.min(...pts.map(p => p.v), 0) * 1.1;
  const hi = Math.max(...pts.map(p => p.v)) * 1.12;
  const xs = d => m.l + (dates.indexOf(d) / (dates.length - 1)) * w;
  const ys = v => m.t + h - ((v - lo) / (hi - lo)) * h;
  const yrs = [...new Set(dates.map(d => d.slice(0, 4)))].filter((_, i) => i % 2 === 0);
  frame(svg, {x: m.l, y: m.t, w, h, xs: d => xs(d), ys,
    xt: yrs.map(y => dates.find(d => d.startsWith(y))).filter(Boolean),
    yt: ticks(lo, hi, 5), xfmt: d => d.slice(0, 4),
    yfmt: v => (v > 0 ? "+" : "") + v.toFixed(0),
    ylab: "Product index minus resin index, points"});
  el("path", {d: "M" + pts.map(p => `${xs(p.date)},${ys(p.v)}`).join("L") +
    `L${xs(dates.at(-1))},${ys(0)}L${xs(dates[0])},${ys(0)}Z`,
    fill: "rgba(0,139,168,.14)"}, svg);
  el("line", {x1: m.l, y1: ys(0), x2: m.l + w, y2: ys(0), stroke: INK,
    "stroke-width": 1.5}, svg);
  el("path", {d: "M" + pts.map(p => `${xs(p.date)},${ys(p.v)}`).join("L"), fill: "none",
    stroke: "#008BA8", "stroke-width": 2.6}, svg);
  const last = pts.at(-1), peak = pts.reduce((a, b) => b.v > a.v ? b : a);
  txt(svg, `${last.v > 0 ? "+" : ""}${last.v.toFixed(0)} now`,
    {x: xs(last.date) + 10, y: ys(last.v) + 4, class: "pv-lab", fill: "#008BA8"});
  el("circle", {cx: xs(peak.date), cy: ys(peak.v), r: 5, fill: "#008BA8",
    stroke: "var(--paper)", "stroke-width": 2}, svg);
  txt(svg, `widest ${peak.v.toFixed(0)} · ${mon(peak.date)}`,
    {x: xs(peak.date), y: ys(peak.v) - 12, "text-anchor": "middle", class: "pv-lab",
     fill: "#008BA8"});
  pts.forEach(p => hoverable(el("rect", {x: xs(p.date) - w / pts.length / 2, y: m.t,
    width: Math.max(2, w / pts.length), height: h, fill: "transparent"}, svg),
    `<b>${mon(p.date)}</b><br>spread <span class="v">${p.v > 0 ? "+" : ""}${p.v.toFixed(1)}</span> points<br>
     product <span class="v">${prod.points.find(x => x.date === p.date).index.toFixed(0)}</span> ·
     resin <span class="v">${resin.points.find(x => x.date === p.date).index.toFixed(0)}</span>`,
    `${mon(p.date)}: ${p.v.toFixed(1)} points`));
  document.getElementById("spreadtable").innerHTML = tableView("sd",
    "Product and resin indices, January of each year",
    ["Month", "Product", "Resin", "Spread"],
    pts.filter(p => p.date.endsWith("-01-01")).map(p =>
      [mon(p.date), prod.points.find(x => x.date === p.date).index.toFixed(0),
       resin.points.find(x => x.date === p.date).index.toFixed(0),
       (p.v > 0 ? "+" : "") + p.v.toFixed(0)]));
  document.getElementById("spreadnote").innerHTML =
    `<b>This is not a margin, and it is worth being blunt about that.</b>
     ${D.meta.not_margin} A converter's costs also include labor, freight, energy, tooling
     and packaging, and several of those rose sharply over exactly this period — so a
     widening index spread is entirely consistent with flat or falling profitability.
     <b>What the line does establish</b> is that between 2019 and now, the prices this
     industry charges rose ${(prod.now.index - 100).toFixed(0)} points while the prices it
     pays for its main input rose ${(resin.now.index - 100).toFixed(0)}, and that the gap
     is at its widest today rather than during the shortage.
     <b>Two readings fit</b> and this data cannot separate them: the industry held price
     after input costs fell, or its other costs rose enough to require it. Anyone quoting
     this line owes the reader both.`;
}

document.getElementById("closersub").innerHTML =
  `<b>Gas has given back ${pct(gas.retraced)} of its spike; finished polymer products have
   given back ${pct(prod.retraced)}.</b> The ordering — feedstock, then resin, then
   product — is the sort of thing every operator in the region already feels and nobody has
   drawn. <b>The useful question it raises is not "why are prices high."</b> It is which
   link a PIC member sits on, because the answer determines whether the last four years
   were a squeeze or a windfall, and the cluster contains firms at every stage.`;

/* This page is national throughout — no county footprint applies. */

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "cost-scissors", meta: D.meta});
})();
