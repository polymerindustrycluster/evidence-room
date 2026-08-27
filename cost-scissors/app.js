/* The polymer price chain, re-read as one question: squeeze or windfall, by seat.
   Forms follow the jobs: retracement is a SHARE of a known whole, so it gets a bar
   against a full-width track (with the one overshoot marked honestly, not clamped);
   the level histories are change-over-time on a common rebased scale, so they get
   lines with a story/context hierarchy; the spread is one derived quantity around a
   zero baseline, plus the same computation one link up as its only fair comparator.
   The seat selector re-emphasizes; it never recomputes, so the claims harness guards
   the default state and the data ingredients each variant sentence is built from.
   Every chart re-lays itself out per form below 760px: no sideways-scroll hint,
   evidence in the first paint. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, CAT, GRAY, INK} = PV;
const D = await PV.data("scissors.json");
const S = D.series;

const STAGE = {feedstock: {c: "#A32A78", n: "Feedstock"},
               resin:     {c: CAT[1],    n: "Resin"},
               product:   {c: "#008BA8", n: "Product"},
               context:   {c: GRAY,      n: "Context"}};
const pct = v => (v * 100).toFixed(0) + "%";
const mon = d => d.slice(0, 7);
const M3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MF = ["January","February","March","April","May","June","July","August",
            "September","October","November","December"];
const mon3 = d => `${M3[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
const monF = d => `${MF[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
const sp = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(0);
const vsB = i => (i >= 100 ? "+" : "−") + Math.abs(i - 100).toFixed(0) + "%";

/* Series, by hand so a lineup change fails loudly rather than silently reshuffling. */
const gas = S.find(s => /natural gas/i.test(s.label));
const crude = S.find(s => /crude oil/i.test(s.label));
const elec = S.find(s => /electricity/i.test(s.label));
const resinMfg = S.find(s => s.label === "PPI: plastics material and resin manufacturing");
const resinsMat = S.find(s => s.label === "PPI: plastics resins and materials");
const prodMfg = S.find(s => s.label === "PPI: plastics and rubber products manufacturing");
const prodRP = S.find(s => s.label === "PPI: rubber and plastic products");
const chem = S.find(s => /industrial chemicals/i.test(s.label));

/* Label strings are editorial text: hand-shortened, never machine-truncated. */
const SHORT = {
  "Henry Hub natural gas spot": "Henry Hub natural gas",
  "Crude oil, WTI spot": "WTI crude oil",
  "Ohio industrial electricity price": "Ohio industrial electricity",
  "PPI: plastics resins and materials": "Plastics resins & materials",
  "PPI: plastics material and resin manufacturing": "Resin manufacturing",
  "PPI: rubber and plastic products": "Rubber & plastic products",
  "PPI: plastics and rubber products manufacturing": "Plastics & rubber products mfg"};
const TINY = {
  "Henry Hub natural gas spot": "Henry Hub gas",
  "Crude oil, WTI spot": "WTI crude",
  "Ohio industrial electricity price": "Ohio industrial power",
  "PPI: plastics resins and materials": "Resins & materials",
  "PPI: plastics material and resin manufacturing": "Resin mfg",
  "PPI: rubber and plastic products": "Rubber & plastic goods",
  "PPI: plastics and rubber products manufacturing": "Plastics & rubber mfg"};

/* ------------------------------------------------------------- derived facts */
const byDate = s => Object.fromEntries(s.points.map(p => [p.date, p.index]));
const PM = byDate(prodMfg), RM = byDate(resinMfg), CH = byDate(chem);
const sdates = prodMfg.points.map(p => p.date).filter(d => d in RM);
const spr = sdates.map(d => ({date: d, v: PM[d] - RM[d]}));
const cdates = resinMfg.points.map(p => p.date).filter(d => d in CH);
const comp = cdates.map(d => ({date: d, v: RM[d] - CH[d]}));
const last = spr.at(-1);
const sPeak = spr.reduce((a, b) => b.v > a.v ? b : a);
const sTrough = spr.reduce((a, b) => b.v < a.v ? b : a);
const cPeak = comp.reduce((a, b) => b.v > a.v ? b : a);
const rows = S.filter(s => s.retraced !== null && s.stage !== "context")
              .sort((a, b) => b.retraced - a.retraced);

/* ------------------------------------------------------------------- hero stats
   Plain reading leads; the technical figure is the sub-line. */
PV.figures([
  ["key", vsB(gas.now.index), "gas vs January 2019",
   `cheaper than before the spike: ${pct(gas.retraced)} of the rise given back`],
  ["", vsB(resinMfg.now.index), "resin vs January 2019",
   `about a third of the rise given back`],
  ["", vsB(prodMfg.now.index), "products vs January 2019",
   "none given back; the peak is the latest month"],
  ["", sp(last.v), "points, product over resin",
   `ran ${sp(sTrough.v)} at the bottom of the 2021 squeeze`]
]);

/* The vignette stat band: one part, priced at three moments, from the same indexes. */
document.getElementById("v0").textContent = "$" + (PM["2019-01-01"] / 100).toFixed(2);
document.getElementById("v1").textContent = "$" + (PM["2021-08-01"] / 100).toFixed(2);
document.getElementById("v1d").textContent =
  `resin up ${(RM["2021-08-01"] - 100).toFixed(0)}%: the squeeze`;
document.getElementById("v2").textContent = "$" + (prodMfg.now.index / 100).toFixed(2);
document.getElementById("v2k").textContent = monF(prodMfg.now.date);
document.getElementById("v2d").textContent =
  `resin up ${(RM[prodMfg.now.date] - 100).toFixed(0)}%, gas ` +
  `${(100 - gas.now.index).toFixed(0)}% below its 2019 price`;

/* --------------------------------------------------------- seat selector + verdict
   Lookup-rung interaction: the page re-tells its story from the reader's seat. The
   selector only re-emphasizes and restates; it never recomputes a chart. */
let SEL = null;
function verdict() {
  const v = document.getElementById("verdict");
  if (!SEL) v.innerHTML = `<b>The whole chain:</b> gas sellers have given back the whole
    rise, resin makers about a third, and product makers none of it. Tap a seat to
    re-read the charts from it.`;
  else if (SEL === "feedstock") v.innerHTML = `<b>Feedstock:</b> the windfall reversed.
    Gas peaked at nearly three times its January 2019 level in ${mon3(gas.peak.date)} and
    now sits ${(100 - gas.now.index).toFixed(0)}% below it, ${pct(gas.retraced)} of the
    rise given back. Ohio industrial power is the exception: still up
    ${(elec.now.index - 100).toFixed(0)}%, and its peak was this January.`;
  else if (SEL === "resin") v.innerHTML = `<b>Resin:</b> the middle seat. Your output
    crested at about ${vsB(Math.max(resinsMat.peak.index, resinMfg.peak.index))} across
    2021 and 2022, gave back about a third, and still runs
    ${vsB(resinMfg.now.index)}. Your own version of the spread, resin minus industrial
    chemicals, spiked to ${sp(cPeak.v)} points in ${mon3(cPeak.date)} and has unwound to
    just below zero: the shortage windfall did not keep.`;
  else v.innerHTML = `<b>Finished products:</b> the winning seat, on these two indexes.
    Your main input gave back about a third of its rise; your output gave back none and
    sits at its peak. The spread runs ${sp(last.v)} points in your favor, against
    ${sp(sTrough.v)} at the bottom of the 2021 squeeze, and a spread is not a margin:
    labor, freight, energy and packaging are in neither series.`;
}
{
  const host = document.getElementById("csel");
  const seats = [["The whole chain", null], ["Feedstock", "feedstock"],
                 ["Resin", "resin"], ["Finished products", "product"]];
  seats.forEach(([label, key]) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label;
    b.setAttribute("aria-pressed", String(key === SEL));
    b.addEventListener("click", () => {
      SEL = (SEL === key) ? null : key;
      host.querySelectorAll("button").forEach((x, i) =>
        x.setAttribute("aria-pressed", String(seats[i][1] === SEL)));
      verdict(); drawAll();
    });
    host.appendChild(b);
  });
}
verdict();

const MOBILE = matchMedia("(max-width: 760px)");
/* A paper plate behind a label that must cross other ink. The text is tagged
   data-pv-plated so the collision gate reads the cover as deliberate. */
const plated = (svg, s, a, fs = 7.4) => {
  el("rect", {x: (a["text-anchor"] === "end" ? a.x - s.length * fs - 3
                 : a["text-anchor"] === "middle" ? a.x - s.length * fs / 2 - 3
                 : a.x - 3),
              y: a.y - 12, width: s.length * fs + 6, height: 15,
              fill: "var(--paper)", opacity: .93, rx: 2}, svg);
  return txt(svg, s, Object.assign({"data-pv-plated": "1"}, a));
};
const dimStage = stage => SEL && stage !== SEL;

/* ------------------------------------------------------------ 1. the ladder */
function drawLadder() { MOBILE.matches ? drawLadderMobile() : drawLadderDesktop(); }

function drawLadderDesktop() {
  const {svg, W, m, w, h} = PV.chart("ladder",
    {W: 1100, rows: rows.length, rowH: 42, m: {t: 56, r: 170, b: 56, l: 260}});
  const DOM = 1.08;                       // domain runs past 100% so the gas
  const xs = v => m.l + Math.min(v, DOM) / DOM * w;   // overshoot is drawn, not clipped
  frame(svg, {x: m.l, y: m.t, w, h, xs: v => xs(v), ys: () => 0, yt: [],
    xt: [0, .25, .5, .75, 1], xfmt: pct,
    xlab: "Share of the rise above January 2019 that has come back"});
  el("line", {x1: xs(1), y1: m.t - 10, x2: xs(1), y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  txt(svg, "100% = the full rise, given back", {x: xs(1), y: m.t - 16,
    "text-anchor": "middle", class: "pv-lab", fill: "var(--hover)"});
  rows.forEach((s, i) => {
    const g = el("g", dimStage(s.stage) ? {opacity: .18} : {}, svg);
    const y = m.t + i * 42 + 8, bh = 24, c = STAGE[s.stage].c;
    el("rect", {x: m.l, y, width: xs(1) - m.l, height: bh, fill: "#EDE9E2", rx: 4}, g);
    el("rect", {x: m.l, y, width: Math.max(3, xs(s.retraced) - m.l), height: bh,
      fill: c, rx: 4}, g);
    txt(g, SHORT[s.label], {x: m.l - 14, y: y + bh - 6, "text-anchor": "end",
      class: "pv-lab"});
    txt(g, STAGE[s.stage].n.toUpperCase(), {x: m.l - 14, y: y + bh + 9,
      "text-anchor": "end", class: "pv-labq", fill: c});
    txt(g, `${pct(s.retraced)} back`, {x: m.l + w + 12, y: y + bh - 12, class: "pv-lab"});
    txt(g, s.retraced > 1 ? `now ${s.now.index.toFixed(0)} · past its base`
                          : `now ${s.now.index.toFixed(0)}`,
      {x: m.l + w + 12, y: y + bh + 5, class: "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 8, width: W, height: bh + 18,
      fill: "transparent"}, g), `<b>${s.label}</b><br>${STAGE[s.stage].n} stage<br>
      peaked at <span class="v">${s.peak.index.toFixed(1)}</span> in ${mon(s.peak.date)}<br>
      now <span class="v">${s.now.index.toFixed(1)}</span> ·
      <span class="v">${pct(s.retraced)}</span> of the rise retraced`,
      `${s.label}: ${pct(s.retraced)} retraced`);
  });
}

function drawLadderMobile() {
  const W = 375, m = {t: 46, r: 12, b: 44, l: 12}, rowH = 46, bh = 14;
  const H = m.t + rows.length * rowH + m.b;
  const {svg} = PV.chart("ladder", {W, H});
  const w = W - m.l - m.r, DOM = 1.08;
  const xs = v => m.l + Math.min(v, DOM) / DOM * w;
  el("line", {x1: xs(1), y1: m.t - 4, x2: xs(1), y2: H - m.b + 4,
    stroke: "var(--hover)", "stroke-width": 1.2, "stroke-dasharray": "4 3"}, svg);
  txt(svg, "100% = full rise given back", {x: xs(1), y: m.t - 10,
    "text-anchor": "end", class: "pv-labq", fill: "var(--hover)"});
  rows.forEach((s, i) => {
    const g = el("g", dimStage(s.stage) ? {opacity: .18} : {}, svg);
    const y = m.t + i * rowH, c = STAGE[s.stage].c;
    txt(g, TINY[s.label], {x: m.l, y: y + 12, class: "pv-labq"});
    txt(g, `${pct(s.retraced)} · now ${s.now.index.toFixed(0)}`,
      {x: W - m.r, y: y + 12, "text-anchor": "end", class: "pv-lab"});
    el("rect", {x: m.l, y: y + 18, width: xs(1) - m.l, height: bh, fill: "#EDE9E2",
      rx: 3}, g);
    el("rect", {x: m.l, y: y + 18, width: Math.max(3, xs(s.retraced) - m.l),
      height: bh, fill: c, rx: 3}, g);
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, g),
      `<b>${s.label}</b><br><span class="v">${pct(s.retraced)}</span> of the rise
       retraced · now <span class="v">${s.now.index.toFixed(1)}</span>`,
      `${s.label}: ${pct(s.retraced)} retraced`);
  });
  const ax = H - m.b;
  el("line", {x1: m.l, y1: ax, x2: W - m.r, y2: ax, stroke: "var(--pv-axis)",
    "stroke-width": 1}, svg);
  [0, .5, 1].forEach(v => txt(svg, pct(v), {x: xs(v), y: ax + 16,
    "text-anchor": v ? "middle" : "start", class: "pv-tick"}));
  txt(svg, "share of the rise given back", {x: m.l, y: H - 6, class: "pv-labq"});
}

/* ------------------------------------------------------------- 2. the lines */
const lineSeries = S.filter(s => s.stage !== "context");
const STORY = new Set([gas.label, resinMfg.label, prodMfg.label]);
function lineStyle(s) {
  if (SEL) return s.stage === SEL
    ? {stroke: STAGE[s.stage].c, wd: 2.8, op: 1, lab: STAGE[s.stage].c}
    : {stroke: GRAY, wd: 1.4, op: .5, lab: "var(--pv-muted)"};
  return STORY.has(s.label)
    ? {stroke: STAGE[s.stage].c, wd: 2.6, op: .95, lab: STAGE[s.stage].c}
    : {stroke: GRAY, wd: 1.6, op: .75, lab: "var(--pv-muted)"};
}

function drawLines() { MOBILE.matches ? drawLinesMobile() : drawLinesDesktop(); }

function drawLinesDesktop() {
  const {svg, m, w, h} = PV.chart("lines", {W: 1100, H: 460,
    m: {t: 46, r: 232, b: 62, l: 40}});
  const all = lineSeries.flatMap(s => s.points);
  const dates = [...new Set(all.map(p => p.date))].sort();
  const maxV = Math.max(...all.map(p => p.index)) * 1.04;
  const xs = d => m.l + dates.indexOf(d) / (dates.length - 1) * w;
  const ys = v => m.t + h - v / maxV * h;
  const yrs = [...new Set(dates.map(d => d.slice(0, 4)))].filter((_, i) => i % 2 === 0);
  frame(svg, {x: m.l, y: m.t, w, h, xs: d => xs(d), ys,
    xt: yrs.map(y => dates.find(d => d.startsWith(y))).filter(Boolean),
    yt: ticks(0, maxV, 6), xfmt: d => d.slice(0, 4),
    xlab: "", ylab: "Index, January 2019 = 100"});
  el("line", {x1: m.l, y1: ys(100), x2: m.l + w, y2: ys(100), stroke: INK,
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  /* Context ink first, story ink over it. */
  const ord = [...lineSeries].sort((a, b) =>
    (STORY.has(a.label) ? 1 : 0) - (STORY.has(b.label) ? 1 : 0));
  const ends = lineSeries.map(s => ({s, y: ys(s.points.at(-1).index)}))
                         .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;
  ord.forEach(s => {
    const st = lineStyle(s);
    el("path", {d: "M" + s.points.map(p => `${xs(p.date)},${ys(p.index)}`).join("L"),
      fill: "none", stroke: st.stroke, "stroke-width": st.wd, opacity: st.op}, svg);
  });
  lineSeries.forEach(s => {
    const st = lineStyle(s), e = ends.find(x => x.s === s);
    txt(svg, `${s.points.at(-1).index.toFixed(0)} ${SHORT[s.label]}`,
      {x: m.l + w + 10, y: e.y + 4, class: "pv-labq", fill: st.lab});
  });
  /* Annotations last, so no series paints over them (house smell list). */
  plated(svg, "100 = the January 2019 level", {x: m.l + 8, y: ys(100) - 8,
    class: "pv-lab"}, 8);
  /* Two claims, written on the chart. */
  const gp = gas.peak;
  el("circle", {cx: xs(gp.date), cy: ys(gp.index), r: 4.5, fill: STAGE.feedstock.c,
    stroke: "var(--paper)", "stroke-width": 1.5}, svg);
  plated(svg, `${mon3(gp.date)}: gas triples`, {x: xs(gp.date) - 10,
    y: ys(gp.index) + 4, "text-anchor": "end", class: "pv-lab",
    fill: STAGE.feedstock.c}, 8);
  {
    const ad = "2024-03-01", ay = ys(PM[ad]);
    const bx = xs(ad), by = ys(195);
    el("line", {x1: bx, y1: by + 8, x2: bx, y2: ay - 5, stroke: "var(--pv-axis)",
      "stroke-width": 1}, svg);
    plated(svg, "products plateau near +40%", {x: bx, y: by - 12,
      "text-anchor": "middle", class: "pv-lab", fill: STAGE.product.c}, 8);
    plated(svg, "and never come back down", {x: bx, y: by + 3,
      "text-anchor": "middle", class: "pv-labq"}, 7);
  }
  dates.forEach(d => hoverable(el("rect", {x: xs(d) - w / dates.length / 2, y: m.t,
    width: Math.max(2, w / dates.length), height: h, fill: "transparent"}, svg),
    `<b>${mon(d)}</b><br>` + lineSeries.map(s => {
      const p = s.points.find(x => x.date === d);
      return p ? `${SHORT[s.label]} <span class="v">${p.index.toFixed(0)}</span>` : "";
    }).filter(Boolean).join("<br>"), mon(d)));
}

function drawLinesMobile() {
  const W = 375, H = 310, m = {t: 42, r: 16, b: 42, l: 30};
  const {svg} = PV.chart("lines", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const all = lineSeries.flatMap(s => s.points);
  const dates = [...new Set(all.map(p => p.date))].sort();
  const maxV = Math.max(...all.map(p => p.index)) * 1.04;
  const xs = d => m.l + dates.indexOf(d) / (dates.length - 1) * w;
  const ys = v => m.t + h - v / maxV * h;
  const yrs = [...new Set(dates.map(d => d.slice(0, 4)))].filter((_, i) => i % 4 === 0);
  frame(svg, {x: m.l, y: m.t, w, h, xs: d => xs(d), ys,
    xt: yrs.map(y => dates.find(d => d.startsWith(y))).filter(Boolean),
    yt: ticks(0, maxV, 4), xfmt: d => d.slice(0, 4), xlab: "", ylab: ""});
  el("line", {x1: m.l, y1: ys(100), x2: m.l + w, y2: ys(100), stroke: INK,
    "stroke-width": 1.2, "stroke-dasharray": "4 3"}, svg);
  const ord = [...lineSeries].sort((a, b) =>
    (STORY.has(a.label) ? 1 : 0) - (STORY.has(b.label) ? 1 : 0));
  ord.forEach(s => {
    const st = lineStyle(s);
    el("path", {d: "M" + s.points.map(p => `${xs(p.date)},${ys(p.index)}`).join("L"),
      fill: "none", stroke: st.stroke, "stroke-width": Math.max(1.1, st.wd - .6),
      opacity: st.op}, svg);
  });
  plated(svg, "100 = Jan 2019", {x: m.l + 4, y: ys(100) + 14, class: "pv-labq"}, 7.6);
  /* End labels for the three chain links only; context stays gray and unlabeled
     (same series, same emphasis rule as desktop, named in the legend below). */
  const marked = [prodMfg, resinMfg, gas].map(s => ({s,
    y: ys(s.points.at(-1).index)})).sort((a, b) => a.y - b.y);
  for (let i = 1; i < marked.length; i++)
    if (marked[i].y - marked[i - 1].y < 15) marked[i].y = marked[i - 1].y + 15;
  const NAME = {[gas.label]: "gas", [resinMfg.label]: "resin",
                [prodMfg.label]: "products"};
  marked.forEach(({s, y}) => plated(svg,
    `${s.points.at(-1).index.toFixed(0)} ${NAME[s.label]}`,
    {x: m.l + w - 2, y: y + 4, "text-anchor": "end", class: "pv-lab",
     fill: STAGE[s.stage].c}, 8));
  const gp = gas.peak;
  el("circle", {cx: xs(gp.date), cy: ys(gp.index), r: 3.5, fill: STAGE.feedstock.c,
    stroke: "var(--paper)", "stroke-width": 1.2}, svg);
  plated(svg, "Aug 2022: gas triples", {x: xs(gp.date) - 7, y: ys(gp.index) + 4,
    "text-anchor": "end", class: "pv-lab", fill: STAGE.feedstock.c}, 8);
  hoverable(el("rect", {x: m.l, y: m.t, width: w, height: h, fill: "transparent"}, svg),
    `<b>${mon(dates.at(-1))}</b><br>` + lineSeries.map(s =>
      `${TINY[s.label]} <span class="v">${s.points.at(-1).index.toFixed(0)}</span>`)
      .join("<br>"), "latest values");
}

/* ------------------------------------------------------------ 3. the spread */
function drawSpread() { MOBILE.matches ? drawSpreadMobile() : drawSpreadDesktop(); }

function spreadStyles() {
  return {
    main: SEL === "resin"
      ? {wd: 2, op: .4} : {wd: SEL === "product" ? 3 : 2.6, op: 1},
    area: SEL === "resin" ? .06 : .14,
    cmp: SEL === "resin"
      ? {stroke: CAT[1], wd: 2.6, op: 1, lab: CAT[1]}
      : {stroke: GRAY, wd: 1.8, op: .9, lab: "var(--pv-muted)"}
  };
}

function drawSpreadDesktop() {
  const {svg, m, w, h} = PV.chart("spread", {W: 1100, H: 360,
    m: {t: 48, r: 100, b: 60, l: 44}});
  const lo = Math.min(...spr.map(p => p.v), ...comp.map(p => p.v)) * 1.15;
  const hi = Math.max(...spr.map(p => p.v), ...comp.map(p => p.v)) * 1.25;
  const dates = spr.map(p => p.date);
  const xs = d => m.l + dates.indexOf(d) / (dates.length - 1) * w;
  const ys = v => m.t + h - (v - lo) / (hi - lo) * h;
  const yrs = [...new Set(dates.map(d => d.slice(0, 4)))].filter((_, i) => i % 2 === 0);
  const st = spreadStyles();
  frame(svg, {x: m.l, y: m.t, w, h, xs: d => xs(d), ys,
    xt: yrs.map(y => dates.find(d => d.startsWith(y))).filter(Boolean),
    yt: ticks(lo, hi, 7), xfmt: d => d.slice(0, 4),
    yfmt: v => (v > 0 ? "+" : "") + v.toFixed(0),
    ylab: "Output index minus input index, points"});
  el("path", {d: "M" + spr.map(p => `${xs(p.date)},${ys(p.v)}`).join("L") +
    `L${xs(dates.at(-1))},${ys(0)}L${xs(dates[0])},${ys(0)}Z`,
    fill: `rgba(0,139,168,${st.area})`}, svg);
  el("line", {x1: m.l, y1: ys(0), x2: m.l + w, y2: ys(0), stroke: INK,
    "stroke-width": 1.5}, svg);
  plated(svg, "0 = both up the same since 2019", {x: m.l + 6, y: ys(0) - 8,
    class: "pv-labq"}, 7.4);
  el("path", {d: "M" + comp.map(p => `${xs(p.date)},${ys(p.v)}`).join("L"),
    fill: "none", stroke: st.cmp.stroke, "stroke-width": st.cmp.wd,
    opacity: st.cmp.op}, svg);
  plated(svg, `${sp(cPeak.v)} for resin makers in the shortage, unwound since`,
    {x: xs(cPeak.date), y: ys(cPeak.v) - 10, "text-anchor": "middle",
     class: "pv-labq", fill: st.cmp.lab}, 7.4);
  plated(svg, "resin − chemicals", {x: xs("2023-06-01"), y: ys(-8.5),
    "text-anchor": "middle", class: "pv-labq", fill: st.cmp.lab}, 7.4);
  el("path", {d: "M" + spr.map(p => `${xs(p.date)},${ys(p.v)}`).join("L"),
    fill: "none", stroke: "#008BA8", "stroke-width": st.main.wd,
    opacity: st.main.op}, svg);
  el("circle", {cx: xs(sTrough.date), cy: ys(sTrough.v), r: 5, fill: "#008BA8",
    stroke: "var(--paper)", "stroke-width": 2}, svg);
  plated(svg, `${sp(sTrough.v)} · ${mon3(sTrough.date)}: the squeeze`,
    {x: xs(sTrough.date) + 10, y: ys(sTrough.v) + 5, class: "pv-lab",
     fill: "#008BA8"}, 8);
  el("circle", {cx: xs(sPeak.date), cy: ys(sPeak.v), r: 5, fill: "#008BA8",
    stroke: "var(--paper)", "stroke-width": 2}, svg);
  plated(svg, `${sp(sPeak.v)} · ${mon3(sPeak.date)}`, {x: xs(sPeak.date),
    y: ys(sPeak.v) - 12, "text-anchor": "middle", class: "pv-lab",
    fill: "#008BA8"}, 8);
  txt(svg, `${sp(last.v)} now`, {x: m.l + w + 8, y: ys(last.v) + 4,
    class: "pv-lab", fill: "#008BA8"});
  spr.forEach(p => hoverable(el("rect", {x: xs(p.date) - w / spr.length / 2, y: m.t,
    width: Math.max(2, w / spr.length), height: h, fill: "transparent"}, svg),
    `<b>${mon(p.date)}</b><br>converter spread <span class="v">${p.v > 0 ? "+" : ""}${p.v.toFixed(1)}</span> points<br>
     product <span class="v">${PM[p.date].toFixed(0)}</span> ·
     resin <span class="v">${RM[p.date].toFixed(0)}</span>` +
     (p.date in CH ? `<br>resin-maker spread <span class="v">${(RM[p.date] - CH[p.date]).toFixed(1)}</span>` : ""),
    `${mon(p.date)}: ${p.v.toFixed(1)} points`));
}

function drawSpreadMobile() {
  const W = 375, H = 300, m = {t: 40, r: 62, b: 42, l: 34};
  const {svg} = PV.chart("spread", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const lo = Math.min(...spr.map(p => p.v), ...comp.map(p => p.v)) * 1.15;
  const hi = Math.max(...spr.map(p => p.v), ...comp.map(p => p.v)) * 1.3;
  const dates = spr.map(p => p.date);
  const xs = d => m.l + dates.indexOf(d) / (dates.length - 1) * w;
  const ys = v => m.t + h - (v - lo) / (hi - lo) * h;
  const yrs = [...new Set(dates.map(d => d.slice(0, 4)))].filter((_, i) => i % 4 === 0);
  const st = spreadStyles();
  frame(svg, {x: m.l, y: m.t, w, h, xs: d => xs(d), ys,
    xt: yrs.map(y => dates.find(d => d.startsWith(y))).filter(Boolean),
    yt: ticks(lo, hi, 4), xfmt: d => d.slice(0, 4),
    yfmt: v => (v > 0 ? "+" : "") + v.toFixed(0), ylab: ""});
  el("path", {d: "M" + spr.map(p => `${xs(p.date)},${ys(p.v)}`).join("L") +
    `L${xs(dates.at(-1))},${ys(0)}L${xs(dates[0])},${ys(0)}Z`,
    fill: `rgba(0,139,168,${st.area})`}, svg);
  el("line", {x1: m.l, y1: ys(0), x2: m.l + w, y2: ys(0), stroke: INK,
    "stroke-width": 1.2}, svg);
  el("path", {d: "M" + comp.map(p => `${xs(p.date)},${ys(p.v)}`).join("L"),
    fill: "none", stroke: st.cmp.stroke, "stroke-width": Math.max(1.2, st.cmp.wd - .6),
    opacity: st.cmp.op}, svg);
  el("path", {d: "M" + spr.map(p => `${xs(p.date)},${ys(p.v)}`).join("L"),
    fill: "none", stroke: "#008BA8", "stroke-width": Math.max(1.8, st.main.wd - .6),
    opacity: st.main.op}, svg);
  el("circle", {cx: xs(sTrough.date), cy: ys(sTrough.v), r: 4, fill: "#008BA8",
    stroke: "var(--paper)", "stroke-width": 1.5}, svg);
  plated(svg, `${sp(sTrough.v)} · the squeeze`, {x: xs(sTrough.date) + 8,
    y: ys(sTrough.v) + 4, class: "pv-lab", fill: "#008BA8"}, 8);
  el("circle", {cx: xs(sPeak.date), cy: ys(sPeak.v), r: 4, fill: "#008BA8",
    stroke: "var(--paper)", "stroke-width": 1.5}, svg);
  plated(svg, sp(sPeak.v), {x: xs(sPeak.date) - 6, y: ys(sPeak.v) - 8,
    "text-anchor": "end", class: "pv-lab", fill: "#008BA8"}, 8);
  txt(svg, `${sp(last.v)} now`, {x: m.l + w + 6, y: ys(last.v) + 4,
    class: "pv-lab", fill: "#008BA8"});
  txt(svg, "resin −", {x: m.l + w + 6, y: ys(comp.at(-1).v) + 2,
    class: "pv-labq", fill: st.cmp.lab});
  txt(svg, "chem", {x: m.l + w + 6, y: ys(comp.at(-1).v) + 15,
    class: "pv-labq", fill: st.cmp.lab});
  hoverable(el("rect", {x: m.l, y: m.t, width: w, height: h, fill: "transparent"}, svg),
    `<b>${mon(last.date)}</b><br>converter spread <span class="v">${sp(last.v)}</span>
     points<br>resin-maker spread <span class="v">${comp.at(-1).v.toFixed(1)}</span>`,
    "latest spread");
}

/* -------------------------------------------------------- tables + source lines */
document.getElementById("laddertable").innerHTML = tableView("ld",
  "Peak, current level and retracement by stage (January 2019 = 100)",
  ["Series", "Stage", "Peak", "Peak month", "Now", "Retraced"],
  rows.map(s => [s.label, STAGE[s.stage].n, s.peak.index.toFixed(1), mon(s.peak.date),
    s.now.index.toFixed(1), pct(s.retraced)]));
document.getElementById("laddersrc").innerHTML =
  `${D.meta.sources}; one (series, month) observation, monthly, 2015 through mid-2026.
   Retracement is (peak &minus; now) &divide; (peak &minus; 100); a series that never
   rose above its base has no retracement. January 2019 is a winter month: gas enters
   the index at a seasonal high, so its fall looks larger than an annual-average base
   would show. The stage ordering is robust to that; the exact percentages are not.`;

{
  const dates = [...new Set(lineSeries.flatMap(s => s.points.map(p => p.date)))].sort();
  const jans = dates.filter(d => d.endsWith("-01-01"));
  document.getElementById("linestable").innerHTML = tableView("ln",
    "Index level by series, January of each year (January 2019 = 100)",
    ["Series", "Stage", ...jans.map(d => d.slice(0, 4))],
    lineSeries.map(s => [s.label, STAGE[s.stage].n,
      ...jans.map(d => {
        const p = s.points.find(x => x.date === d);
        return p ? p.index.toFixed(0) : "—";
      })]));
}
document.getElementById("linessrc").innerHTML =
  `${D.meta.sources}. Every series is indexed to 100 at its own January 2019 level; the
   raw series sit in different units ($/mcf, &cent;/kWh, index points), and rebasing is
   what lets one honest axis carry them. These are national series: Henry Hub is not
   what an Ohio plant pays delivered or hedged, and a producer-price index is an
   industry average, not any member&rsquo;s realized price.`;

document.getElementById("spreadtable").innerHTML = tableView("sd",
  "Converter and resin-maker spreads, January of each year (index points)",
  ["Month", "Product", "Resin", "Converter spread", "Resin &minus; chemicals"],
  spr.filter(p => p.date.endsWith("-01-01")).map(p =>
    [mon(p.date), PM[p.date].toFixed(0), RM[p.date].toFixed(0),
     (p.v > 0 ? "+" : "") + p.v.toFixed(0),
     p.date in CH ? (RM[p.date] - CH[p.date] > 0 ? "+" : "") +
       (RM[p.date] - CH[p.date]).toFixed(0) : "—"]));
document.getElementById("spreadsrc").innerHTML =
  `Derived from two BLS producer price indexes: plastics &amp; rubber products
   manufacturing minus plastics material &amp; resin manufacturing, both set to 100 at
   January 2019. The gray line is resin manufacturing minus industrial chemicals, the
   same computation one link up. No economy-wide comparator is drawn: the shipped
   series include no total-manufacturing input pair, so whether every downstream
   industry held price this way is a question this page cannot answer.`;

document.getElementById("closersub").innerHTML =
  `<b>The wellhead gave back ${pct(gas.retraced)} of its spike; resin makers about a
   third; finished products none.</b> The converter&rsquo;s gap ran ${sp(sTrough.v)}
   points at the bottom of the 2021 squeeze and stands ${sp(last.v)} in their favor
   now, and an index spread is not a margin: labor, freight, energy and packaging are
   in neither series.`;

/* --------------------------------------------------------------------- assemble */
function drawAll() { drawLadder(); drawLines(); drawSpread(); }
drawAll();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* This page is national throughout — no county footprint applies. */

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "cost-scissors", meta: D.meta});
})();
