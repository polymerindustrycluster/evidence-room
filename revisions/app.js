/* Revisions, rebuilt. The subject of this page is the REVISION, so the lead chart plots
   the revision itself — latest minus first print, in percent — as three small multiples
   on one shared scale, one per series named in the headline. The previous lead plotted
   two vintages at index level, where a 0.15% median move is sub-pixel and the two lines
   coincided exactly; its up/down legend pointed at marks a reader could not find, and a
   series switcher was stubbed but never built. Small multiples answer all three: no
   click, three series visible at once, and the quantity on the y axis is the quantity in
   the headline.

   Diverging color is correct here: zero genuinely means "no revision", and up and down
   are opposites. One accent, one job, on both charts: orange = revised down, teal =
   revised up. Both charts re-lay out per form below 760px (stacked panels, coarser
   bins) rather than panning sideways. */
(async () => {
"use strict";
const {el, txt, hoverable, tableView, CAT} = PV;
const D = await PV.data("revisions.json");
const P = D.periods;
const N = n => n.toLocaleString("en-US");
const med = a => { const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const MINUS = "−";
const sgn = (v, dp) => (v > 0 ? "+" : v < 0 ? MINUS : "") + Math.abs(v).toFixed(dp) + "%";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
             "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mon = d => d.slice(0, 7);
const nice = d => MON[+d.slice(5, 7) - 1] + " " + d.slice(0, 4);

/* Color is a page constant, not a per-chart choice.

   The two directions are separated by LUMINANCE, not only hue. The first build paired
   CAT[1] with #1A8A9E, whose relative luminances are 0.205 and 0.209 — printed in
   grayscale or read by a colorblind reader, up and down collapsed into one identical
   mid-gray and direction survived only through position above or below zero. #0C6473 is
   the house ink token (SEQ[5]), so nothing new enters the palette, and its luminance is
   0.104: half the orange's, which is a visible step with the hue removed. */
const DOWN = CAT[1], UP = "#0C6473";

/* ------------------------------------------------------------- the vintage record

   D.all is every value ever published: one row per (series, reference month, vintage).
   Rebuilding first/latest from it rather than from D.periods keeps the 14 months that
   were never revised in the picture — they are published months with one archived
   vintage, and dropping them would quietly inflate every share on the page. */
const rec = {};
D.all.forEach(r => { (rec[r.series + "|" + r.date] = rec[r.series + "|" + r.date] || [])
  .push(r); });
Object.values(rec).forEach(a => a.sort((x, y) => x.vintage.localeCompare(y.vintage)));

const SERIES = [...new Set(D.all.map(r => r.series))];
const LABEL = {};
P.forEach(p => { LABEL[p.series] = p.label; });
/* Hand-shortened panel names. Two of the three are "rubber and plastics" in different
   words, so each carries the thing that separates them (a commodity index priced at the
   point of sale, an industry index for the plants that make them). */
const SHORT = {
  WPU06: "Industrial chemicals",
  WPU072: "Rubber and plastic products",
  PCU326326: "Plastics and rubber plants",
};
const CODE = {WPU06: "WPU06, commodity index", WPU072: "WPU072, commodity index",
              PCU326326: "PCU326326, industry index"};

const ALLM = [...new Set(D.all.map(r => r.date))].sort();
/* ONE NUMBER PER REVISION, FROM ONE PLACE. The derived file publishes `pct` rounded to
   three decimals; recomputing it from the raw values here printed the biggest mover as
   1.41% on the panel and 1.42% in the histogram beside it. The derived field is the
   published quantity and the one the claims check, so every surface reads it. */
const PMAP = {};
P.forEach(p => { PMAP[p.series + "|" + p.date] = p; });
const S = {};
SERIES.forEach(s => {
  const months = ALLM.filter(d => rec[s + "|" + d]);
  const rows = months.map(d => {
    const v = rec[s + "|" + d], p = PMAP[s + "|" + d];
    return {date: d, i: ALLM.indexOf(d), first: v[0].value, latest: v[v.length - 1].value,
            revisions: p ? p.revisions : 0, pct: p ? p.pct : 0,
            firstVintage: v[0].vintage};
  });
  const moved = rows.filter(r => r.revisions > 0);
  S[s] = {rows, moved, medAbs: med(moved.map(r => Math.abs(r.pct))),
          big: moved.reduce((a, b) => Math.abs(b.pct) > Math.abs(a.pct) ? b : a)};
});
/* Panels read hardest-revising first, so the sequence itself carries the comparison. */
const ORDER = [...SERIES].sort((a, b) => S[b].medAbs - S[a].medAbs);

const totalPeriods = new Set(D.all.map(r => r.series + r.date)).size;
const pcts = P.map(p => p.pct).filter(v => v != null);
const MEDABS = med(pcts.map(Math.abs));
const MAXABS = Math.max(...pcts.map(Math.abs));
const BIG = ORDER.map(s => S[s].big).reduce((a, b) =>
  Math.abs(b.pct) > Math.abs(a.pct) ? b : a);
const BIGS = SERIES.find(s => S[s].big === BIG);
const down = pcts.filter(v => v < 0).length, up = pcts.filter(v => v > 0).length;
/* 137 + 121 = 258 against 259 revised months, and the missing one was reconciled nowhere:
   a reader who adds the two annotated counts finds a month that does not exist. It is
   PCU326326 April 2025, revised four times and landing 0.001 index points from where it
   started, which rounds to a zero-percent change and so is neither up nor down. Counted
   here rather than typed, and named in the figure subtitle and the table. */
const flat = pcts.filter(v => v === 0).length;
const FLAT = P.filter(p => p.pct === 0)
  .map(p => Math.abs(Math.round((p.latest - p.first) * 1000) / 1000));

/* ------------------------------------------------- month-over-month, as it was read

   The page's own caveat says a small median revision says nothing about whether a
   turning point survives. This measures that instead of asserting it: for each month,
   the step from the previous month AS A READER SAW IT (the first print, against whatever
   the previous month carried in that same vintage), against the same step today. A pair
   counts only where both readings are at least 0.1%, so a flip between +0.02% and
   −0.01% is not called a reversal. */
const prevM = d => {
  const y = +d.slice(0, 4), m = +d.slice(5, 7);
  return (m === 1 ? y - 1 : y) + "-" + String(m === 1 ? 12 : m - 1).padStart(2, "0") + "-01";
};
const asOf = (s, d, V) => {
  const v = (rec[s + "|" + d] || []).filter(r => r.vintage <= V);
  return v.length ? v[v.length - 1].value : null;
};
const PAIRS = [];
SERIES.forEach(s => S[s].rows.forEach(r => {
  const p = prevM(r.date), q = rec[s + "|" + p];
  if (!q) return;
  const was = asOf(s, p, r.firstVintage);
  if (was == null) return;
  PAIRS.push({series: s, date: r.date,
    then: (r.first / was - 1) * 100,
    now: (r.latest / q[q.length - 1].value - 1) * 100});
}));
const MATERIAL = PAIRS.filter(p => Math.abs(p.then) >= 0.1 && Math.abs(p.now) >= 0.1);
const FLIPS = MATERIAL.filter(p => p.then * p.now < 0);
const FLIPBIG = FLIPS.filter(p => p.series === BIGS).length;

/* ------------------------------------------------------------------ byline dateline

   The byline's "as of" is READ FROM THE DATA, never typed: it is the newest vintage in
   the archive, which is the honest date for a page rebuilt from live federal series. A
   hand-typed month goes stale on the next refetch and nothing fails. */
const MONFULL = ["January", "February", "March", "April", "May", "June", "July",
                 "August", "September", "October", "November", "December"];
const ASOF = D.all.reduce((a, r) => r.vintage > a ? r.vintage : a, "");
document.getElementById("asof").textContent =
  MONFULL[+ASOF.slice(5, 7) - 1] + " " + ASOF.slice(0, 4);

/* ------------------------------------------------------------------- hero stats */
PV.figures([
  ["key", Math.round(P.length / totalPeriods * 100) + "%", "were revised",
   `${N(P.length)} of ${N(totalPeriods)} published months`],
  ["", (P.reduce((a, p) => a + p.revisions, 0) / P.length).toFixed(1), "revisions each",
   `up to ${Math.max(...P.map(p => p.revisions))} times`],
  ["", MEDABS.toFixed(2) + "%", "typical move", "median absolute change"],
  ["", down + " / " + up, "down / up", "which way first estimates lean"]
]);

/* =============================================== 1. the revision, three small multiples

   PV.chart is single-panel, so the panels are laid out by hand inside one svg: one
   .chart div at figure width keeps the column audit applicable, and the three panels
   share a y domain so the eye can compare across them. */
const MOBILE = matchMedia("(max-width: 760px)");
const LIM = 1.75;                     // headroom above the 1.42% extreme for the labels
const YT = [-1.5, -1, -0.5, 0.5, 1, 1.5];
const ytLab = v => (v > 0 ? "+" : MINUS) + Math.abs(v).toFixed(1) + "%";

/* Panel body. Everything that is identical between the wide and stacked layouts lives
   here; only the box geometry and which chrome is drawn differ. */
function panel(svg, s, box, o) {
  const d = S[s], xs = i => box.x + (i / (ALLM.length - 1)) * box.w;
  const ys = v => box.y + box.h / 2 - (v / LIM) * (box.h / 2);
  const bw = Math.max(1.6, (box.w / ALLM.length) * 0.62);

  /* The band is ±this series' own median move: half its months land inside it. Drawn as
     a filled path, not a rect: collide.mjs reads any rect straddling the widest
     horizontal line as a bar that ran into the axis, and this band straddles zero by
     design. A path says "region", a rect says "mark", which is the honest distinction. */
  el("path", {d: `M${box.x},${ys(d.medAbs)}H${box.x + box.w}V${ys(-d.medAbs)}H${box.x}Z`,
    fill: "rgba(12,100,115,.07)"}, svg);
  /* Gridlines are paths, not lines: collide.mjs takes the widest horizontal LINE as the
     axis, and a bar crossing a gridline would read as a bar crossing the axis. The zero
     line is the only <line> here, and no bar crosses it — every bar starts on it. */
  YT.forEach(v => el("path", {d: `M${box.x},${ys(v)}H${box.x + box.w}`, fill: "none",
    stroke: "var(--pv-grid)", "stroke-width": 1}, svg));
  el("line", {x1: box.x, y1: ys(0), x2: box.x + box.w, y2: ys(0),
    stroke: "var(--pv-axis)", "stroke-width": 1.4}, svg);

  d.rows.forEach(r => {
    if (!r.revisions) return;
    const y0 = ys(0), y1 = ys(r.pct);
    el("rect", {x: xs(r.i) - bw / 2, y: Math.min(y0, y1), width: bw,
      height: Math.max(0.7, Math.abs(y1 - y0)), fill: r.pct < 0 ? DOWN : UP}, svg);
  });

  /* Panel header: name, then the two numbers that make the panels comparable. */
  /* The stacked layout drops the word "move": at 375 the full line measured 376.4 units
     against a 375 viewBox, so the outermost svg's own overflow:hidden was shaving the
     last glyph. Hand-shortened rather than scaled or ellipsed, because a truncated label
     is a build error and a smaller one is a legibility loss. */
  txt(svg, SHORT[s], {x: box.x, y: box.y - o.h2, class: "pv-lab"});
  txt(svg, `${o.terse ? "median" : "median move"} ${d.medAbs.toFixed(2)}% · ` +
    `${d.moved.length} of ${d.rows.length} months revised`,
    {x: box.x, y: box.y - o.h1, class: "pv-labq"});

  /* Year ticks. Every other January on the wide layout, every third on the stacked one:
     a tick label that cannot be read is worse than one that is not there. */
  ALLM.forEach((dt, i) => {
    if (dt.slice(5, 7) !== "01") return;
    if ((+dt.slice(0, 4)) % o.every) return;
    txt(svg, dt.slice(0, 4), {x: xs(i), y: box.y + box.h + 20, "text-anchor": "middle",
      class: "pv-tick"});
  });

  /* The biggest mover, named on the chart rather than left for the reader to hunt. */
  const b = d.big, bx = xs(b.i), by = ys(b.pct);
  const lab = `${nice(b.date)} ${sgn(b.pct, 2)}`;
  const wide = lab.length * (o.charW || 7.1);
  const right = bx + 8 + wide < box.x + box.w;
  el("circle", {cx: bx, cy: by, r: 2.8, fill: b.pct < 0 ? DOWN : UP,
    stroke: "var(--paper)", "stroke-width": 1}, svg);
  txt(svg, lab, {x: bx + (right ? 8 : -8), y: by + 4, class: "pv-lab",
    "text-anchor": right ? "start" : "end", fill: b.pct < 0 ? DOWN : UP});

  d.rows.forEach(r => hoverable(
    el("rect", {x: xs(r.i) - box.w / ALLM.length / 2, y: box.y,
      width: Math.max(3, box.w / ALLM.length), height: box.h, fill: "transparent"}, svg),
    `<b>${SHORT[s]} · ${mon(r.date)}</b><br>first published
     <span class="v">${r.first}</span><br>today <span class="v">${r.latest}</span><br>
     ${r.revisions
       ? `<span class="v">${sgn(r.pct, 2)}</span> across
          <span class="v">${r.revisions}</span> revision${r.revisions === 1 ? "" : "s"}`
       : "never revised"}`,
    `${SHORT[s]} ${mon(r.date)}: ${r.first} to ${r.latest}, ${sgn(r.pct, 2)}`));
}

function drawSmall() { MOBILE.matches ? drawSmallStacked() : drawSmallWide(); }

function drawSmallWide() {
  const W = 1100, H = 420, m = {t: 92, r: 18, b: 70, l: 62};
  const {svg} = PV.chart("sm", {W, H});
  const w = W - m.l - m.r, gap = 40, pw = (w - gap * 2) / 3, h = H - m.t - m.b;
  const ys = v => m.t + h / 2 - (v / LIM) * (h / 2);

  txt(svg, "revision, %", {x: m.l, y: 34, class: "pv-axlab"});
  YT.forEach(v => txt(svg, ytLab(v), {x: m.l - 10, y: ys(v) + 4, "text-anchor": "end",
    class: "pv-tick"}));
  txt(svg, "0", {x: m.l - 10, y: ys(0) + 4, "text-anchor": "end", class: "pv-tick"});

  ORDER.forEach((s, k) => panel(svg, s,
    {x: m.l + k * (pw + gap), y: m.t, w: pw, h}, {h1: 14, h2: 32, every: 2}));

  /* Direction is labelled in the plot, not in a legend below it. The old legend named
     two colors a reader could not find; these sit at the ±1.5% level of the first panel,
     where no bar reaches. */
  txt(svg, "revised up", {x: m.l + 6, y: ys(1.53), class: "pv-labq", fill: UP});
  txt(svg, "revised down", {x: m.l + 6, y: ys(-1.61), class: "pv-labq", fill: DOWN});
  txt(svg, "reference month", {x: m.l + w / 2, y: H - 16, "text-anchor": "middle",
    class: "pv-axlab"});
}

function drawSmallStacked() {
  /* Pitch is set by the two labels that face each other across the gap: one panel's year
     ticks (20 below its plot) and the next panel's name (34 above its plot). collide.mjs
     only measures the wide layout, so this clearance is held by hand. */
  const W = 375, m = {l: 50, r: 12}, ph = 118, pitch = 208, top = 86;
  const H = top + pitch * 2 + ph + 40;
  const {svg} = PV.chart("sm", {W, H});
  const w = W - m.l - m.r;
  /* y=15, not 14: at 14 the cap box measured -0.6 against the viewBox top. */
  txt(svg, "revision, % of the first print", {x: m.l, y: 15, class: "pv-labq"});
  txt(svg, "revised up", {x: m.l, y: 34, class: "pv-labq", fill: UP});
  txt(svg, "revised down", {x: m.l + 104, y: 34, class: "pv-labq", fill: DOWN});

  ORDER.forEach((s, k) => {
    const y = top + k * pitch;
    const ys = v => y + ph / 2 - (v / LIM) * (ph / 2);
    /* Tick labels drop the % here: the header line above already carries the unit, and a
       "+1.0%" set right-aligned in a 50px gutter loses its sign off the left edge. */
    [-1, 1].forEach(v => txt(svg, (v > 0 ? "+" : MINUS) + Math.abs(v).toFixed(1),
      {x: m.l - 8, y: ys(v) + 4, "text-anchor": "end", class: "pv-tick"}));
    txt(svg, "0", {x: m.l - 8, y: ys(0) + 4, "text-anchor": "end", class: "pv-tick"});
    panel(svg, s, {x: m.l, y, w, h: ph}, {h1: 14, h2: 34, every: 3, charW: 8.1,
      terse: true});
  });
}

/* ================================================================ 2. the distribution */
function drawDist() { MOBILE.matches ? drawDistVariant(375, 340, true)
                                     : drawDistVariant(1100, 340, false); }

function drawDistVariant(W, H, mob) {
  const m = mob ? {t: 56, r: 10, b: 96, l: 30} : {t: 56, r: 24, b: 92, l: 44};
  const {svg} = PV.chart("dist", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  /* Bins are zero-aligned so no bin straddles "no revision" and every bar is one sign. */
  const step = mob ? 0.1 : 0.05, lim = 1.5, bins = Math.round(2 * lim / step);
  const counts = new Array(bins).fill(0);
  pcts.forEach(v => counts[Math.min(bins - 1, Math.max(0,
    Math.floor((v + lim) / step)))]++);
  const maxC = Math.max(...counts);
  /* Headroom above the tallest bar: the annotations live in the top of the plot, and a
     bar that reaches the frame leaves nowhere honest to put them. */
  const top = maxC * (mob ? 1.45 : 1.18);
  const xs = v => m.l + ((v + lim) / (2 * lim)) * w;
  const ys = c => m.t + h - (c / top) * h;

  const YC = mob ? [0, 20, 40] : [0, 10, 20];
  YC.forEach(c => {
    el("path", {d: `M${m.l},${ys(c)}H${m.l + w}`, fill: "none", stroke: "var(--pv-grid)",
      "stroke-width": 1}, svg);
    txt(svg, c, {x: m.l - 8, y: ys(c) + 4, "text-anchor": "end", class: "pv-tick"});
  });
  txt(svg, "months", {x: m.l, y: m.t - 26, class: "pv-axlab"});
  el("line", {x1: m.l, y1: m.t + h, x2: m.l + w, y2: m.t + h, stroke: "var(--pv-axis)",
    "stroke-width": 1}, svg);
  (mob ? [-1, -0.5, 0, 0.5, 1] : [-1.5, -1, -0.5, 0, 0.5, 1, 1.5]).forEach(v =>
    txt(svg, v === 0 ? "0" : ytLab(v), {x: xs(v), y: m.t + h + 20,
      "text-anchor": "middle", class: "pv-tick"}));
  /* The axis caption is set in letter-spaced caps, so it is much wider than its character
     count suggests; the stacked layout gets a shorter one rather than one that escapes
     the svg box. */
  txt(svg, mob ? "change since the first print"
               : "total change from the first published value to today",
    {x: m.l + w / 2, y: H - 8, "text-anchor": "middle", class: "pv-axlab"});

  counts.forEach((c, i) => {
    if (!c) return;
    const v0 = -lim + i * step, x = xs(v0) + 1;
    const bwi = Math.max(2, (w / bins) - 2);
    el("rect", {x, y: ys(c), width: bwi, height: m.t + h - ys(c),
      fill: v0 < 0 ? DOWN : UP, rx: 2}, svg);
    hoverable(el("rect", {x, y: m.t, width: bwi, height: h, fill: "transparent"}, svg),
      `<b>${sgn(v0, 2)} to ${sgn(v0 + step, 2)}</b><br>
       <span class="v">${c}</span> month${c === 1 ? "" : "s"}`,
      `${v0.toFixed(2)} to ${(v0 + step).toFixed(2)} percent: ${c} months`);
  });

  el("line", {x1: xs(0), y1: m.t - 6, x2: xs(0), y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 2}, svg);
  txt(svg, "no revision", {x: xs(0) + (mob ? -6 : 8), y: m.t - 10, class: "pv-lab",
    "text-anchor": mob ? "end" : "start", fill: "var(--hover)"});

  /* The two summary statistics the prose quotes, drawn on the axis they describe. */
  const by = m.t + h + 42;
  el("path", {d: `M${xs(-MEDABS)},${by - 6}V${by}H${xs(MEDABS)}V${by - 6}`, fill: "none",
    stroke: "var(--pv-axis)", "stroke-width": 1.2}, svg);
  txt(svg, mob ? `half land inside ±${MEDABS.toFixed(2)}%`
               : `the median move: half of all months land inside ±${MEDABS.toFixed(2)}%`,
    {x: xs(0), y: by + 18, "text-anchor": "middle", class: "pv-lab"});

  /* Annotation bands. Wide: the extreme is called out on the left where the tail is
     empty, the lean on the right above the up side. Stacked: the same two live on
     separate horizontal bands, because at 375px they would print on each other. */
  const mx = xs(-MAXABS);
  const exY = m.t + (mob ? 62 : 26);
  el("path", {d: `M${mx},${exY + 6}V${ys(1) - 5}`, fill: "none", stroke: DOWN,
    "stroke-width": 1}, svg);
  txt(svg, mob ? `largest: ${sgn(-MAXABS, 2)}` : `largest move ${sgn(-MAXABS, 2)}`,
    {x: mob ? m.l : mx + 7, y: exY, class: "pv-lab", fill: DOWN});
  if (!mob) txt(svg, `${SHORT[BIGS].toLowerCase()}, ${nice(BIG.date)}`,
    {x: mx + 7, y: m.t + 44, class: "pv-labq"});

  /* The lean, with an arrow at the side it leans to. 137 against 121 is a small
     majority, and the annotation says small. */
  /* THE STACKED COPY IS CUT TO CLEAR THE ZERO RULE, NOT JUST TO FIT THE BOX. Right-
     anchored at 365 with the zero line at x=198, "137 months revised up," ran back to
     x=185 and "121 down: first prints lean low" to x=158, so the magenta rule struck
     through both — measured on the built page, because collide.mjs reads the desktop
     layout only and would never have seen it. The budget is 365 minus 206, or 159 units;
     these two lines measure 131 and 141. Changing this copy means re-measuring it. */
  const ax = mob ? m.l + w : xs(0.55);
  const anc = mob ? "end" : "start";
  txt(svg, mob ? `${up} up, ${down} down` : `${up} months were revised up,`,
    {x: ax, y: m.t + (mob ? 22 : 26), class: "pv-lab", "text-anchor": anc});
  txt(svg, mob ? "first prints lean low"
               : `${down} down: first prints lean slightly low`,
    {x: ax, y: m.t + (mob ? 40 : 44), class: "pv-labq", "text-anchor": anc});
  /* The arrow lands 8px above the tallest up-side bar rather than at a hand-picked
     coordinate, so it cannot end up inside a bar when the bins change. */
  const upTop = counts.reduce((a, c, i) => (-lim + i * step >= 0 && c > a.c)
    ? {c, v: -lim + i * step + step / 2} : a, {c: 0, v: 0});
  const tipX = mob ? xs(upTop.v) : xs(0.34);
  const tipY = (mob ? ys(upTop.c) : ys(10)) - (mob ? 8 : 7);
  const fromX = mob ? m.l + 270 : ax - 4, fromY = m.t + (mob ? 48 : 56);
  el("path", {d: `M${fromX},${fromY}L${tipX},${tipY}`, fill: "none", stroke: "var(--pv-ink)",
    "stroke-width": 1.1}, svg);
  {
    const a = Math.atan2(tipY - fromY, tipX - fromX), s = 6;
    el("path", {d: `M${tipX},${tipY}L${tipX - s * Math.cos(a - 0.4)},${tipY - s * Math.sin(a - 0.4)}
      L${tipX - s * Math.cos(a + 0.4)},${tipY - s * Math.sin(a + 0.4)}Z`,
      fill: "var(--pv-ink)"}, svg);
  }
}

/* ----------------------------------------------------------- tables + source lines */
const smRows = [];
SERIES.forEach(s => S[s].moved.forEach(r => smRows.push({s, ...r})));
smRows.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
document.getElementById("smtable").innerHTML = tableView("s",
  "Every revised month, largest move first",
  ["Month", "Series", "First published", "Today", "Change", "Revisions"],
  smRows.map(r => [mon(r.date), SHORT[r.s], r.first, r.latest, sgn(r.pct, 3), r.revisions]));
/* CAPTION INK IS CAPPED AT ONE SOURCE LINE PLUS ONE LIMITATION (page-design § caveat ink,
   45 words). This note ran 90, with the three series IDs bolded inside it and a definition
   of what a revision is: a third of the band's lower half was caption-gray. The IDs now
   live in the methodology box, where a reader who wants to refetch is already standing,
   and the definition is meta.why, which the same box already publishes. */
document.getElementById("smsrc").innerHTML =
  `${D.meta.source}, for reference months ${mon(ALLM[0])} to
   ${mon(ALLM[ALLM.length - 1])}. ${N(P.length)} of ${N(totalPeriods)} published months
   carry a later value; the other ${totalPeriods - P.length} have one archived vintage
   each, which is not evidence they never moved.`;

document.getElementById("disttable").innerHTML = tableView("d",
  "Revision size distribution", ["Measure", "Value"],
  [["Months revised at least once", N(P.length)],
   ["Revised downward", N(down)], ["Revised upward", N(up)],
   [`Ended within ${Math.max(...FLAT)} index points of the first print`, N(flat)],
   ["Median absolute change", MEDABS.toFixed(3) + "%"],
   ["Largest single change", MAXABS.toFixed(3) + "%"],
   ["Mean revisions per month", (P.reduce((a, p) => a + p.revisions, 0) / P.length).toFixed(2)],
   ["Month pairs where the step changed sign", `${FLIPS.length} of ${MATERIAL.length}`]]);
/* The note owns the bin width, and it is now the ONLY place on the page that states it.
   The subtitle used to say 0.05 in hardcoded HTML while the stacked layout re-binned to
   0.10 and this line said so: one quantity, two numbers, on the same phone screen. Written
   from inside drawAll(), not once at load, so the number cannot go stale when a reader
   crosses the breakpoint — a single owner that only updates on first paint is the same
   defect with one fewer place to notice it. */
function distNote() {
  document.getElementById("distsrc").innerHTML =
    `${D.meta.source}. One mark per revised month, so the
     ${totalPeriods - P.length} months with a single archived vintage are not in this
     chart. Bin width ${(MOBILE.matches ? 0.1 : 0.05).toFixed(2)} percentage points; the
     axis is clipped at ±1.5%, which holds every observed value.`;
}

/* THE ONE CALLOUT BOX ON THE PAGE, capped at ~80 words. It ran 120, and half of those
   were spent restating the QWI sentence that the hero and the closer also carried, so by
   the third reading it landed as boilerplate rather than escalation. The QWI point is now
   made once, in the closer, where it is the forward move. The "least time to be revised"
   caveat moved into meta.caution, which the methodology box publishes. */
document.getElementById("caveat").innerHTML =
  `<b>What a small revision licenses.</b> A median move of ${MEDABS.toFixed(2)}% and a
   largest move of ${MAXABS.toFixed(2)}% support one narrow claim: the <em>level</em> of a
   producer-price series does not move much once published. They do not license calling a
   fresh figure &ldquo;safe to act on&rdquo;, which is how an earlier version of this
   sentence overreached. A small median also says nothing about whether a turning point
   survives: ${FLIPS.length} of ${MATERIAL.length} comparable month pairs changed sign.`;

/* ------------------------------------------------------- 3. one month, up close */
{
  const s = BIGS, d = BIG.date, p = prevM(d);
  const prev = rec[s + "|" + p];
  const wasThen = asOf(s, p, BIG.firstVintage);
  const momThen = (BIG.first / wasThen - 1) * 100;
  const momNow = (BIG.latest / prev[prev.length - 1].value - 1) * 100;

  document.getElementById("vg1").textContent = sgn(momThen, 1);
  document.getElementById("vg1d").textContent =
    `${nice(d)} at ${BIG.first} against ${nice(p)} at ${wasThen}, on the vintage a ` +
    `reader held in ${nice(BIG.firstVintage)}.`;
  document.getElementById("vg2").textContent = sgn(momNow, 1);
  document.getElementById("vg2d").textContent =
    `${nice(d)} at ${BIG.latest} against ${nice(p)} at ` +
    `${prev[prev.length - 1].value}, after ${BIG.revisions} corrections.`;
  /* The vignette is one month, so it needs the count that says it is not a lone oddity.
     The lede carries the story in body type; this line carries the guard against
     mistaking one named month for the pattern, and nothing else: it ran 79 words against
     a 45-word caption budget. The annual comparison it used to restate is already in the
     lede two paragraphs up (claim rev-vignette-year checks it there), and which vintage
     supplies the base month is a derivation, now stated once in the methodology box. The
     year-over-year arithmetic that fed only this line went with it rather than staying as
     four unused bindings. */
  document.getElementById("vgnote").innerHTML =
    `${nice(d)} is the largest mover here, not a lone one: of ${MATERIAL.length} month
     pairs where both readings clear 0.1%, <b>${FLIPS.length} changed sign</b>, and
     ${FLIPBIG} of those are ${SHORT[s].toLowerCase()}. ${D.meta.source}.`;
}

/* Bold budget: one phrase, not a three-line paragraph set in 900 weight. The old version
   bolded the whole QWI sentence, which at that length stops reading as emphasis and
   starts reading as a second closer. */
document.getElementById("closersub").innerHTML =
  `${N(P.length)} of ${N(totalPeriods)} published months changed after the fact, by a
   median ${MEDABS.toFixed(2)}%, and ${FLIPS.length} of ${MATERIAL.length} comparable
   month pairs changed sign. The Quarterly Workforce
   Indicators behind the churn page restate whole histories when they re-benchmark, and
   how far they move has not been measured: <b>that is the series this method should be
   pointed at next.</b>`;

/* ------------------------------------------------------------------------ assemble */
function drawAll() { drawSmall(); drawDist(); distNote(); }
drawAll();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
/* revisions.json carries `why` — rationale, classified METHOD rather than a limitation —
   and no caveats. The page published an empty Limitations section until the three-way
   classification exposed it. These are the page's own boundaries. */
await PV.methodology({page: "revisions",
  /* The three series IDs used to be bolded inside the first figure's caption, where they
     cost ink a reader scanning the chart did not want to spend. Here they sit beside the
     row definition, which is where someone who wants to refetch is already looking. */
  definitions: "The three series are " + ORDER.map(s => `${SHORT[s]} (${CODE[s]})`)
    .join(", ") + ".",
  meta: {...D.meta,
  not: "Three price series, not a general claim about official statistics. Other " +
    "indicators revise harder and some barely move; nothing here measures them.",
  caution: "The most recent vintage on each chart is itself an estimate and will be " +
    "revised again. ‘Final’ is not a status these series have, and the newest months " +
    "carry the smallest revisions only because they have had the least time to be " +
    "revised.",
  excludes: "A revision is only visible where ALFRED archived a vintage. A month showing " +
    "one value is not evidence it never moved; it may be evidence nobody kept the " +
    "earlier print.",
  derived_note: "The month-over-month comparison is computed from the archived vintages " +
    "on this page, not fetched separately: for each reference month it takes the first " +
    "published value against whatever the previous month carried in that same vintage, " +
    "then repeats the comparison on today’s values. A pair counts only where both " +
    "readings are at least 0.1 percent, so a flip between +0.02 and -0.01 percent is " +
    "not called a reversal; 201 of 270 pairs clear that floor. The annual comparison in " +
    "the vignette follows the same rule against the same month a year earlier.",
  uncertain: "Why September 2021 moved is not in this data. ALFRED archives values, not " +
    "the reasons for them, so the cause of the largest revision here is unreported. The " +
    "question we would put to the BLS Producer Price Index section: which late " +
    "respondent reports or recomputations moved industrial chemicals for September 2021, " +
    "and whether a correction of that size is routine for that month of the year.",
  /* THE REPORTING THIS PAGE DOES NOT HAVE, NAMED. A page whose only human beat is a
     translated vignette should say so and say who it would call, rather than let the
     absence read as a finished piece. */
  note: "Nobody was interviewed for this page. The reporting it lacks is one call to a " +
    "resin purchaser in the cluster who quotes WPU06 in a contract: what they did with " +
    "the September 2021 print, whether their contract re-prices on a later vintage, and " +
    "how they found out the number had changed. That answer belongs in the vignette " +
    "above. Until it exists the human beat here is arithmetic a reader can check, not a " +
    "reported voice.",
}});
})();
