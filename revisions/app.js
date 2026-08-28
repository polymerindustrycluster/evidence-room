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
   published quantity and the one the claims check, so every surface reads it.

   EXCEPT WHEN FORMATTING TO TWO DECIMALS, WHICH IS A DOUBLE ROUNDING AND WAS WRONG.
   September 2021 ran 348.8 to 343.866, which is −1.41456%. The derived file rounds that
   to −1.415, and rounding −1.415 again to two places gives 1.42 — the figure this page
   printed in four places, beside the two index values that a reader divides to get 1.41.
   A naive reader did exactly that and it was the one calculation on the page that did
   not close. `pc2` formats from the unrounded change, so the two-decimal figure always
   follows from the two index numbers printed next to it. Classification (which side of
   zero a month fell, the one month that came back to where it started), bar geometry,
   the bins and the median all still read the derived `pct`: that is the quantity the
   claims check and the only one whose rounding is published. Of the three panel extremes
   only WPU06 differs between the two; the other two round the same either way. */
const pc2 = r => sgn((r.latest - r.first) / r.first * 100, 2);
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
const BIG = ORDER.map(s => S[s].big).reduce((a, b) =>
  Math.abs(b.pct) > Math.abs(a.pct) ? b : a);
const BIGS = SERIES.find(s => S[s].big === BIG);
/* The extreme's own magnitude, unrounded, for every surface that prints it to two
   places beside the index values it came from. See the pc2 note above. */
const MAXPC = Math.abs((BIG.latest - BIG.first) / BIG.first * 100);
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

/* ---------------------------------------------------- the two yardsticks this page owed

   A reader could take in every figure here and still not say whether 0.15% is small or
   95% is worrying, because the page benchmarked these three series against nothing but
   each other and said so in its own limitations. Both answers were already sitting in
   the shipped archive.

   HOW BIG: the typical revision against the typical month. The same 270 consecutive-month
   pairs, read on today's values, move a median 0.34%. A revision is therefore a bit under
   half of what these prices do in an ordinary month — small against the LEVEL, and not
   small against the STEP, which is the mechanism behind the reversals further down. This
   is a same-pipeline comparison: both quantities come from one archive, one set of months
   and one set of series, so nothing about the sources differs between the two sides.

   HOW LONG: `path` carries the vintage that first published a month and the vintage of
   every later change, so the gap between its first and last entries is how long that
   month kept moving. Across a monthly archive running 2019 to 2026, no month changed
   more than six after its first print, and 250 of the 259 had stopped inside four. That
   is the page's missing answer to "so what do I do": wait about half a year, or name the
   vintage you priced against. */
const STEPMED = med(PAIRS.map(p => Math.abs(p.now)));
const mnum = d => +d.slice(0, 4) * 12 + +d.slice(5, 7);
const LAGS = P.map(p => mnum(p.path[p.path.length - 1].from) - mnum(p.path[0].from));
const LAGMAX = Math.max(...LAGS);
const LAGSET = LAGS.filter(v => v <= 4).length;
const REVTOT = P.reduce((a, p) => a + p.revisions, 0);

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
/* The fourth card used to read "121 / 137" over the key "down / up". A slash between two
   numbers is read as a quotient before it is read as a pair, so the card's headline
   quantity looked like a ratio of 0.88 that appears nowhere in the data. A middot makes
   it two counts, and the detail line now states the reading instead of posing it.

   EVERY SUB-LINE NOW CARRIES A DIRECTION OF MERIT, WHICH IS A SEPARATE OBLIGATION FROM
   DIRECTION OF MAGNITUDE. A reader could see that a bigger 95% meant more months changed
   and still not know whether to be alarmed; the same for 2.9 and for 0.15%. The stat card
   is where these numbers are first met in reading order, so the plain reading belongs
   here rather than three screens down beside a chart that has an axis to hang it on.

   Card 4's order is now up-then-down, matching every other statement of the pair on the
   page, and the pair is read against 121 rather than asserted to lean. */
PV.figures([
  ["key", Math.round(P.length / totalPeriods * 100) + "%", "were revised",
   `${N(P.length)} of ${N(totalPeriods)} published months, so a revision here is routine`],
  ["", (REVTOT / P.length).toFixed(1), "corrections each",
   `${N(REVTOT)} corrections over ${N(P.length)} revised months, up to ` +
   `${Math.max(...P.map(p => p.revisions))} on one month`],
  ["", MEDABS.toFixed(2) + "%", "typical move",
   `half of revised months moved less; these prices move ` +
   `${STEPMED.toFixed(2)}% in an ordinary month`],
  ["", up + " · " + down, "up · down",
   "a near-even split, with no sign that first estimates run high or low"]
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

  /* Panel header: name, then the two numbers that make the panels comparable.

     THE SUBTITLE LABELS THE SHADED BAND BY WHAT IT MEANS, not by the statistic that
     drew it. "median move 0.35%" is the arithmetic; a reader who has not met a median
     absolute deviation cannot say from it which months are inside the band or why the
     band is there. "half moved under 0.35%" is the same number as a reading.

     THE LINE IS MEASURED, NOT ESTIMATED. pv-labq runs about 7.1 viewBox units per
     character, and the narrower box is the stacked panel at 375 − 50 − 12 = 313 units,
     so the budget is 44 characters and this line is 40. The first attempt kept "months
     revised" and ran 48, which verify.mjs caught as 8px of horizontal overflow at 390.
     One string serves both layouts, which retired the hand-shortened stacked variant
     that used to drop the word "move". */
  txt(svg, SHORT[s], {x: box.x, y: box.y - o.h2, class: "pv-lab"});
  txt(svg, `half moved under ${d.medAbs.toFixed(2)}% · ` +
    `${d.moved.length} of ${d.rows.length} revised`,
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
  const lab = `${nice(b.date)} ${pc2(b)}`;
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
       ? `<span class="v">${pc2(r)}</span> across
          <span class="v">${r.revisions}</span> revision${r.revisions === 1 ? "" : "s"}`
       : "never revised"}`,
    `${SHORT[s]} ${mon(r.date)}: ${r.first} to ${r.latest}, ${pc2(r)}`));
}

function drawSmall() { MOBILE.matches ? drawSmallStacked() : drawSmallWide(); }

function drawSmallWide() {
  const W = 1100, H = 420, m = {t: 92, r: 18, b: 70, l: 62};
  const {svg} = PV.chart("sm", {W, H});
  /* GAP 52, NOT 40, BECAUSE ALL THREE PANELS NOW CARRY TICK LABELS. Only the left panel
     used to be numbered: the middle and right had gridlines and nothing beside them, so
     "all three panels share one scale" was a sentence in the prose above that the graphic
     gave a reader no way to check. A naive reader looked for the numbers, did not find
     them, and scrolled back up to take the scale on trust. The stacked layout never had
     this problem, because each panel there is a chart with its own axis.
     The ticks drop the "%" so a four-character label clears the gap: "+1.5" runs about
     33 viewBox units right-anchored 8 units off the plot, leaving 11 units of the 52. The
     unit is stated once, in the axis title, which is where it belongs anyway. */
  const w = W - m.l - m.r, gap = 52, pw = (w - gap * 2) / 3, h = H - m.t - m.b;
  const ys = v => m.t + h / 2 - (v / LIM) * (h / 2);
  const px = k => m.l + k * (pw + gap);

  /* THE AXIS TITLE CARRIES THE UNIT'S ANCHOR. "revision, %" is a percent of nothing
     stated: a reader can read the ticks and still not know 0.35% is 0.35% OF the figure
     the month was first given. Naming what the percent is taken on is the whole cost of
     making the scale legible. */
  txt(svg, "revision, % of the first published figure",
    {x: m.l, y: 34, class: "pv-axlab"});
  /* THE BAND IS NAMED IN THE CHART, NOT ONLY IN THE PARAGRAPH ABOVE IT. Its meaning used
     to live in one prose clause three lines up, and because the same paragraph insists
     all three panels share a scale, a reader's first read was that the band was one
     shared threshold. It is three different widths, one per panel, and saying "that
     panel's" is what carries the difference. */
  txt(svg, "shaded band: half of that panel’s months land inside it",
    {x: m.l + w, y: 34, "text-anchor": "end", class: "pv-labq"});
  [0, 1, 2].forEach(k => {
    YT.forEach(v => txt(svg, (v > 0 ? "+" : MINUS) + Math.abs(v).toFixed(1),
      {x: px(k) - 8, y: ys(v) + 4, "text-anchor": "end", class: "pv-tick"}));
    txt(svg, "0", {x: px(k) - 8, y: ys(0) + 4, "text-anchor": "end", class: "pv-tick"});
  });

  ORDER.forEach((s, k) => panel(svg, s,
    {x: px(k), y: m.t, w: pw, h}, {h1: 14, h2: 32, every: 2}));

  /* Direction is labelled in the plot, not in a legend below it, and each label says
     what its side MEANS rather than naming a color. "revised up" alone leaves open "up
     against what"; the answer, on a page about revisions, is the figure first reported.

     Vertical clearance is held by hand. WPU06 runs +1.382% to −1.415%, so the up label at
     the 1.53 level sits 11 units above the tallest bar. The down label moved from −1.61
     to −1.72 because at −1.61 it printed within a unit of the Sep 2021 callout, which is
     anchored at ys(−1.415)+4 and runs right across the same band; −1.72 still clears the
     year ticks 22 units below it. */
  txt(svg, "revised up: higher today", {x: m.l + 6, y: ys(1.53), class: "pv-labq",
    fill: UP});
  txt(svg, "revised down: lower today", {x: m.l + 6, y: ys(-1.72), class: "pv-labq",
    fill: DOWN});
  /* "Reference month" is the analyst's name for the distinction this whole page turns
     on, and a general reader does not hold it. Written out, it also teaches the axis:
     these are the months being priced, not the months the numbers came out. */
  txt(svg, "the month the price is for", {x: m.l + w / 2, y: H - 16,
    "text-anchor": "middle", class: "pv-axlab"});
}

function drawSmallStacked() {
  /* Pitch is set by the two labels that face each other across the gap: one panel's year
     ticks (20 below its plot) and the next panel's name (34 above its plot). collide.mjs
     only measures the wide layout, so this clearance is held by hand. */
  /* top 106, not 86: the band gloss takes a third header line, and the first panel's
     name sits 34 above its plot, so anything less printed the name into that line. */
  const W = 375, m = {l: 50, r: 12}, ph = 118, pitch = 208, top = 106;
  const H = top + pitch * 2 + ph + 40;
  const {svg} = PV.chart("sm", {W, H});
  const w = W - m.l - m.r;
  /* y=15, not 14: at 14 the cap box measured -0.6 against the viewBox top.
     The two direction labels share one line here, so they carry the reading in the
     fewest words that still answer "higher than what": the header line directly above
     supplies "revised", and the color supplies which is which. */
  txt(svg, "revision, % of the first published figure",
    {x: m.l, y: 15, class: "pv-labq"});
  txt(svg, "up: higher today", {x: m.l, y: 34, class: "pv-labq", fill: UP});
  txt(svg, "down: lower today", {x: m.l + 128, y: 34, class: "pv-labq", fill: DOWN});
  /* Same gloss as the wide layout, cut to the 313 units between the gutter and the right
     edge: 33 characters at about 8.3 units each lands near 274. */
  txt(svg, "band: half of that panel’s months", {x: m.l, y: 53, class: "pv-labq"});

  ORDER.forEach((s, k) => {
    const y = top + k * pitch;
    const ys = v => y + ph / 2 - (v / LIM) * (ph / 2);
    /* Tick labels drop the % here: the header line above already carries the unit, and a
       "+1.0%" set right-aligned in a 50px gutter loses its sign off the left edge. */
    [-1, 1].forEach(v => txt(svg, (v > 0 ? "+" : MINUS) + Math.abs(v).toFixed(1),
      {x: m.l - 8, y: ys(v) + 4, "text-anchor": "end", class: "pv-tick"}));
    txt(svg, "0", {x: m.l - 8, y: ys(0) + 4, "text-anchor": "end", class: "pv-tick"});
    panel(svg, s, {x: m.l, y, w, h: ph}, {h1: 14, h2: 34, every: 3, charW: 8.1});
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
  /* THE AXIS TITLE IS THE READING, NOT THE SUBTRACTION. It used to say "total change
     from the first published value to today", which is how the number was made and not
     what a position on it means; the fig-sub then had to spend a sentence saying that
     left of zero is a downward revision, which is the axis's own job. Naming both ends
     and the crossing point puts direction where the eye already is and buys that
     sentence back. Set in letter-spaced caps, so it is much wider than its character
     count suggests; the stacked layout gets a shorter one rather than one that escapes
     the svg box. */
  txt(svg, mob ? "revised down ← 0 → revised up"
               : "revised down ← no revision → revised up",
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
  /* "All months" was wrong by 14: this bracket is drawn over the 259 months that were
     revised, and the unrevised ones are not in the histogram at all. The distinction is
     the page's headline pairing ("almost every month moved, by almost nothing"), so the
     word the reader needs is "revised", not "all". */
  txt(svg, mob ? `half land inside ±${MEDABS.toFixed(2)}%`
               : `the typical move: half of revised months land inside ` +
                 `±${MEDABS.toFixed(2)}%`,
    {x: xs(0), y: by + 18, "text-anchor": "middle", class: "pv-lab"});

  /* Annotation bands. Wide: the extreme is called out on the left where the tail is
     empty, the lean on the right above the up side. Stacked: the same two live on
     separate horizontal bands, because at 375px they would print on each other. */
  const mx = xs(-MAXPC);
  const exY = m.t + (mob ? 62 : 26);
  el("path", {d: `M${mx},${exY + 6}V${ys(1) - 5}`, fill: "none", stroke: DOWN,
    "stroke-width": 1}, svg);
  txt(svg, mob ? `largest: ${pc2(BIG)}` : `largest move ${pc2(BIG)}`,
    {x: mob ? m.l : mx + 7, y: exY, class: "pv-lab", fill: DOWN});
  if (!mob) txt(svg, `${SHORT[BIGS].toLowerCase()}, ${nice(BIG.date)}`,
    {x: mx + 7, y: m.t + 44, class: "pv-labq"});

  /* THE SPLIT, NOT A LEAN. This annotation used to read "first estimates run slightly
     low", which is a claim about a direction and the counts do not support it: 137 of
     258 signed months is 53.1%, eight months from an even split, and one standard
     deviation on 258 coin flips is 8.0. A two-sided binomial test puts a split at least
     this lopsided at p = 0.35, so a fair coin produces it about a third of the time.
     A naive reader flagged it unprompted, having done the same sum. The annotation now
     says what the counts do say, and claim rev-lean guards the p-value so the sentence
     cannot quietly become true or false without failing.

     THE STACKED COPY IS CUT TO CLEAR THE ZERO RULE, NOT JUST TO FIT THE BOX. Right-
     anchored at 365 with the zero line at x=198, "137 months revised up," ran back to
     x=185 and "121 down: first prints lean low" to x=158, so the magenta rule struck
     through both — measured on the built page, because collide.mjs reads the desktop
     layout only and would never have seen it. The budget is 365 minus 206, or 159 units;
     "close to an even split" is 22 characters against the 23 that measured about 154. */
  const ax = mob ? m.l + w : xs(0.55);
  const anc = mob ? "end" : "start";
  txt(svg, mob ? `${up} up, ${down} down` : `${up} months were revised up,`,
    {x: ax, y: m.t + (mob ? 22 : 26), class: "pv-lab", "text-anchor": anc});
  txt(svg, mob ? "close to an even split"
               : `${down} down: close to an even split`,
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
  `${D.meta.source}, for the months priced from ${mon(ALLM[0])} to
   ${mon(ALLM[ALLM.length - 1])}. ${N(P.length)} of ${N(totalPeriods)} published months
   carry a later value; the other ${totalPeriods - P.length} have only one version on
   record, which is not evidence they never moved.`;

document.getElementById("disttable").innerHTML = tableView("d",
  "Revision size distribution", ["Measure", "Value"],
  [["Months revised at least once", N(P.length)],
   ["Revised downward", N(down)], ["Revised upward", N(up)],
   [`Ended within ${Math.max(...FLAT)} index points of its first value`, N(flat)],
   ["Median absolute change", MEDABS.toFixed(3) + "%"],
   ["Largest single change", MAXPC.toFixed(3) + "%"],
   ["Corrections published in total", N(REVTOT)],
   ["Mean corrections per revised month", (REVTOT / P.length).toFixed(2)],
   ["Months from first print to final value, median", med(LAGS)],
   ["Longest a month kept moving, in months", LAGMAX],
   ["Median month-over-month price change, today's values",
    STEPMED.toFixed(2) + "%"],
   ["Months whose step from the month before reversed",
    `${FLIPS.length} of ${MATERIAL.length}`]]);
/* The note owns the bin width, and it is now the ONLY place on the page that states it.
   The subtitle used to say 0.05 in hardcoded HTML while the stacked layout re-binned to
   0.10 and this line said so: one quantity, two numbers, on the same phone screen. Written
   from inside drawAll(), not once at load, so the number cannot go stale when a reader
   crosses the breakpoint — a single owner that only updates on first paint is the same
   defect with one fewer place to notice it. */
function distNote() {
  document.getElementById("distsrc").innerHTML =
    `${D.meta.source}. Every revised month is counted once, so the
     ${totalPeriods - P.length} months with only one version on record are not here. Each
     bar covers ${(MOBILE.matches ? 0.1 : 0.05).toFixed(2)} percentage points; the
     axis is clipped at ±1.5%, which holds every observed value.`;
}

/* THE ONE CALLOUT BOX ON THE PAGE, capped at ~80 words. It ran 120, and half of those
   were spent restating the QWI sentence that the hero and the closer also carried, so by
   the third reading it landed as boilerplate rather than escalation. The QWI point is now
   made once, in the closer, where it is the forward move. The "least time to be revised"
   caveat moved into meta.caution, which the methodology box publishes. */
document.getElementById("caveat").innerHTML =
  `<b>What a small revision licenses.</b> A typical move of ${MEDABS.toFixed(2)}% and a
   largest move of ${MAXPC.toFixed(2)}% support one narrow claim: the <em>level</em> of a
   producer-price series, how high it reads, does not move much once published. An earlier
   version of this page went further and called a fresh figure safe to act on, which the
   next sentence disproves. Of ${MATERIAL.length} months whose price clearly moved from the
   month before, meaning at least 0.1% both as first published and today,
   ${FLIPS.length} later turned out to have moved the other way.`;

/* ------------------------------------------------------- 3. one month, up close */
{
  const s = BIGS, d = BIG.date, p = prevM(d);
  const prev = rec[s + "|" + p];
  const wasThen = asOf(s, p, BIG.firstVintage);
  const momThen = (BIG.first / wasThen - 1) * 100;
  const momNow = (BIG.latest / prev[prev.length - 1].value - 1) * 100;

  /* EVERY OTHER PERCENT ON THIS PAGE IS A REVISION, so "+1.0%" under a key that says
     only "September as first published" is read as "September was revised up 1.0%",
     which is not what it is. The plain reading leads in both detail lines and the two
     index readings follow it, because the sign between them is the beat and the levels
     are the evidence for it. */
  document.getElementById("vg1").textContent = sgn(momThen, 1);
  /* The direction words are derived from the numbers, never typed: a refetch that flips
     either sign would otherwise leave the arithmetic right and the sentence backwards. */
  const way = v => v > 0 ? "higher" : "lower";
  document.getElementById("vg1d").textContent =
    `Prices looked ${Math.abs(momThen).toFixed(1)}% ${way(momThen)} in ${nice(d)} than ` +
    `in ${nice(p)}: index ${BIG.first} against ${wasThen}, as published in ` +
    `${nice(BIG.firstVintage)}.`;
  document.getElementById("vg2").textContent = sgn(momNow, 1);
  document.getElementById("vg2d").textContent =
    `They now read ${Math.abs(momNow).toFixed(1)}% ${way(momNow)}: index ${BIG.latest} ` +
    `against ${prev[prev.length - 1].value}, after ${BIG.revisions} corrections.`;
  /* The vignette is one month, so it needs the count that says it is not a lone oddity.
     The lede carries the story in body type; this line carries the guard against
     mistaking one named month for the pattern, and nothing else: it ran 79 words against
     a 45-word caption budget. The annual comparison it used to restate is already in the
     lede two paragraphs up (claim rev-vignette-year checks it there), and which vintage
     supplies the base month is a derivation, now stated once in the methodology box. The
     year-over-year arithmetic that fed only this line went with it rather than staying as
     four unused bindings. */
  document.getElementById("vgnote").innerHTML =
    `${nice(d)} is the largest mover, not a lone one: of ${MATERIAL.length} months that
     moved at least 0.1% from the month before, <b>${FLIPS.length} later reversed
     direction</b>, and ${FLIPBIG} of them are ${SHORT[s].toLowerCase()}.
     ${D.meta.source}.`;
}

/* Bold budget: one phrase, not a three-line paragraph set in 900 weight. The old version
   bolded the whole QWI sentence, which at that length stops reading as emphasis and
   starts reading as a second closer. */
document.getElementById("closersub").innerHTML =
  `${N(P.length)} of ${N(totalPeriods)} published months changed after the fact, by a
   typical ${MEDABS.toFixed(2)}% against the ${STEPMED.toFixed(2)}% these prices move in
   an ordinary month, and of ${MATERIAL.length} months that clearly moved from the month
   before, ${FLIPS.length} later turned out to have moved the other way. ${N(LAGSET)} of
   the ${N(P.length)} had stopped moving within four months of the first print, and the
   longest any month kept moving was ${LAGMAX} months. The Quarterly Workforce
   Indicators, the federal count of hires and
   separations behind the churn page, restate whole histories each time they are rebuilt,
   and how far they move has not been measured: <b>that is the series this method should
   be pointed at next.</b>`;

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
     row definition, which is where someone who wants to refetch is already looking.

     "Vintage", "first print" and "reference month" are the three words this page cannot
     do without and no general reader holds. They are translated here, once, directly
     under the row definition that uses the third of them, and the reader-facing surfaces
     above use the plain phrasing instead: the trade term is kept for the person who came
     to reproduce the work. */
  definitions: "A vintage is one published version of a figure: the value as it stood on " +
    "a given date, before any later correction. The first print, or first estimate, is " +
    "the earliest of those versions. A reference month is the month being priced, not " +
    "the month the number came out. The three series are " +
    ORDER.map(s => `${SHORT[s]} (${CODE[s]})`).join(", ") + ".",
  meta: {...D.meta,
  not: "Three price series, not a general claim about official statistics. Other " +
    "indicators revise harder and some barely move; nothing here measures them.",
  caution: "The most recent vintage on each chart is itself an estimate and will be " +
    "revised again. ‘Final’ is not a status these series have, and the newest months " +
    "carry the smallest revisions only because they have had the least time to be " +
    "revised. The six-month settling figure in the closer is what a seven-year archive " +
    "shows, not a rule the BLS publishes: a benchmark revision could reach further back " +
    "than anything in this record has.",
  excludes: "A revision is only visible where ALFRED archived a vintage. A month showing " +
    "one value is not evidence it never moved; it may be evidence nobody kept the " +
    "earlier print.",
  /* THE ARITHMETIC LIVES HERE, NOT UNDER THE CHART. The first figure's how-to-read line
     used to open "Latest published value minus the first print, in percent", which told
     a reader how the bar was built and left them to work out for themselves that up
     meant higher today. The subtraction is still published, in the place a reader who
     wants to check it will look. */
  derived_note: "Each bar on the first chart is the latest published value minus the " +
    "first, as a percent of the first. The month-over-month comparison is computed from " +
    "the archived vintages on this page, not fetched separately: for each month priced " +
    "it takes the first " +
    "published value against whatever the previous month carried in that same vintage, " +
    "then repeats the comparison on today’s values. A pair counts only where both " +
    "readings are at least 0.1 percent, so a flip between +0.02 and -0.01 percent is " +
    "not called a reversal; 201 of 270 pairs clear that floor. The annual comparison in " +
    "the September 2021 section follows the same rule against the same month a year " +
    "earlier. Two further figures come from the same archive. How long a month keeps " +
    "moving is the gap between the vintage that first published it and the vintage that " +
    "last changed it. The ordinary monthly price change quoted beside the typical " +
    "revision is the median absolute step between consecutive months on today’s values, " +
    "over those same 270 pairs, so both sides of that comparison come from one archive, " +
    "one set of months and one set of series. Two decimal places are always formatted " +
    "from the unrounded change rather than from the three-decimal figure the data file " +
    "publishes, so the printed percentage follows from the two index values beside it.",
  uncertain: "Why September 2021 moved is not in this data. ALFRED archives values, not " +
    "the reasons for them, so the cause of the largest revision here is unreported. The " +
    "question we would put to the BLS Producer Price Index section: which late " +
    "respondent reports or recomputations moved industrial chemicals for September 2021, " +
    "and whether a correction of that size is routine for that month of the year.",
  /* THE REPORTING THIS PAGE DOES NOT HAVE, NAMED. A page whose only human beat is a
     translated vignette should say so and say who it would call, rather than let the
     absence read as a finished piece. */
  note: "Nobody was interviewed for this page. The reporting it lacks is one call to a " +
    "resin purchaser in the Northeast Ohio polymer cluster who quotes WPU06 in a " +
    "contract: what they did with the September 2021 print, whether their contract " +
    "re-prices on a later vintage, and how they found out the number had changed. That " +
    "answer belongs in the September 2021 section above. Until it exists the human beat " +
    "here is arithmetic a reader can check, not a reported voice.",
}});
})();
