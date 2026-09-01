/* Labor flow, rebuilt. Hires and separations are FLOWS; employment is a STOCK. They are
   drawn as a diverging area around a shared zero — one axis, both flows in the same unit
   (jobs per quarter) — with the net as a line. Employment never appears on that axis.

   The page's third act is the DECOMPOSITION: the churn rate is the average of a hire rate
   and a separation rate, and only one of them moved. That chart is a derived spread around
   zero rather than a second pair of lines, so it cannot be mistaken for a repeat of the
   rate chart and so its own zero is a real anchor rather than a truncated axis.

   The page's first act is now the COMPARISON, because the magnitude question was being
   asked in the hero and answered nowhere. bench.json carries the same measure, same
   industry code and same quarters for Ohio and the five other states with the biggest
   plastics-and-rubber payrolls, plus the eight age bands for the same twelve counties.
   Both are the identical instrument with one parameter changed, which is what makes them
   comparable at all; the county-sum-against-whole-state check that licenses the geography
   comparison runs in the fetch and prints under the chart.

   Every chart re-lays itself out per form below 760px: annual bars, compact lines, a
   re-scaled scatter. No sideways-scroll hint, evidence in the first paint. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, CAT, GRAY, INK} = PV;
const D = await PV.data("churn.json");
/* The comparator and the age structure. A second file rather than a second block inside
   churn.json, so churn.json keeps one producer (derive_rest.py) and this keeps its own
   (fetch_qwi_bench.py then derive_churn_bench.py). claims.json reads both. */
const BN = await PV.data("bench.json");
const FP = PV.footprint(D.meta);
/* The industry code and its name, split on the FIRST comma. `meta.naics` is one field
   holding both ("326, plastics and rubber products manufacturing"), and splitting it on
   whitespace kept the comma — so three captions shipped "NAICS 326,,". A caption string
   is editorial text: it is composed here, never stitched out of a data-dictionary field.
   `meta.row` in particular stays out of reader prose; it is rendered, correctly, in the
   methodology box. */
const NAICS = D.meta.naics.split(",")[0].trim();
const NAICS_NAME = D.meta.naics.slice(D.meta.naics.indexOf(",") + 1).trim();
const Q = D.quarters, N = n => Math.round(n).toLocaleString("en-US");
const label = q => `${q.year}Q${q.q}`;
const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
/* Percent formatters that never round-lie: a tick prints at its own precision. */
const pc1 = v => (v * 100).toFixed(1) + "%";
const pcT = v => { const p = v * 100;
  return (Math.abs(p - Math.round(p)) < 1e-9 ? String(Math.round(p)) : p.toFixed(1)) + "%"; };
/* Signed points: + for gains, TRUE MINUS for losses. JS stringifies negatives with an
   ASCII hyphen a third the width of the digits; every other negative on this page
   already used \u2212 and these two ticks were the leak (found 2026-08-31). */
const ptsT = v => (v > 0 ? "+" : "") + (Number.isInteger(v) ? v : v.toFixed(1))
  .toString().replace(/^-/, "\u2212");
/* Two decimals, for the one quantity on this page that lives between 0.06 and 0.90 of a
   point. ptsT would print 0.058 as +0.1, which is a rounding lie of nearly double. */
const pts2 = v => (v > 0 ? "+" : "") + v.toFixed(2).replace(/^-/, "\u2212");

/* ------------------------------------------------------------- derived facts */
const tHires = Q.reduce((a, q) => a + q.hires, 0);
const tSeps  = Q.reduce((a, q) => a + q.seps, 0);
const tNet   = tHires - tSeps;
const first = Q[0], last = Q.at(-1);
const meanChurn = avg(Q.map(q => q.churn_rate));
const base12 = avg(Q.slice(0, 4).map(q => q.churn_rate));
const recent4 = avg(Q.slice(-4).map(q => q.churn_rate));
const gapPts = (recent4 - base12) * 100;
/* Trailing four-quarter averages: the trend under the seasonality. */
const roll = k => Q.map((_, i) => i < 3 ? null : avg(Q.slice(i - 3, i + 1).map(k)));
const rChurn = roll(q => q.churn_rate);
const rHire  = roll(q => q.hires / q.emp);
const rSep   = roll(q => q.seps / q.emp);
const spread = Q.map((_, i) => rHire[i] == null ? null : (rSep[i] - rHire[i]) * 100);
const nRoll = Q.length - 3;
const aboveBase = rChurn.filter(v => v != null && v > base12).length;
let sepRun = 0;
for (let i = Q.length - 1; i >= 3 && spread[i] > 0; i--) sepRun++;
const sepSince = label(Q[Q.length - sepRun]);
const peakI = rChurn.reduce((b, v, i) => v != null && (b < 0 || v > rChurn[b]) ? i : b, -1);
const lowHire = Q.reduce((a, q) => q.hires < a.hires ? q : a);
const topHire = Q.reduce((a, q) => q.hires > a.hires ? q : a);
const replMult = tHires / first.emp;

/* ------------------------------------------- TWO INSTRUMENTS, TWO QUESTIONS
   The page publishes two Census numbers for the same industry and the same span, and
   they disagree in sign: the flow ledger nets +168 while the headcount falls 719. A
   reader met both, could not tell which one answered "did jobs grow", and finished
   unsure. Neither is wrong. QWI counts hires and separations as EVENTS during a quarter
   and counts Emp as a HEADCOUNT on one day at the start of it; the Census publishes the
   two as separate estimates and they are not required to add up, which across this
   series they do not, by about 1,100 jobs. The one that answers whether there are more
   jobs is the headcount.
   Everything below derives that comparison rather than asserting it in prose.

   THIS PARAGRAPH USED TO BLAME SEPARATE SEASONAL ADJUSTMENT, and that explanation was
   false: this pull is unadjusted (see derive_rest.py). The mechanism it was replaced
   with is only what the shipped file can show. What the page still cannot say is WHY the
   two part company, because the answer needs a column this pull does not carry; the
   REFER is recorded in README.md. */
const stockFall = first.emp - last.emp;                    // 719, a FALL, printed unsigned
const stockPct = stockFall / first.emp * 100;
/* Emp is the stock at quarter START, so the flows DURING quarter i are the ones that
   would have to carry the stock from Q[i] to Q[i+1]. That is the honest pairing, and it
   is the one a reader makes by eye when they difference the Jobs column of the table. */
const dStock = i => Q[i + 1].emp - Q[i].emp;
const pairs = Q.slice(0, -1).map((q, i) => ({q, d: dStock(i), gap: Math.abs(dStock(i) - q.net)}));
const clashes = pairs.filter(r => (r.q.net > 0) !== (r.d > 0));
/* The example is DERIVED, not typed: the widest gap between the two measures anywhere in
   the series. A hand-picked quarter would be a number the next revision silently
   falsifies. Reduced over `pairs`, which cannot be empty, rather than over `clashes`,
   which a revision could empty and take the whole page down with a TypeError. As shipped
   the widest gap is also a sign disagreement, and the claim asserts both. */
const clash = pairs.reduce((a, r) => r.gap > a.gap ? r : a);
/* Aligned to the same 54 quarters the two stock readings bracket, the flows still net
   positive against a stock that fell. The mismatch is not an end-effect. */
const netAligned = Q.slice(0, -1).reduce((a, q) => a + q.net, 0);

/* Counties: twelve same-method readings of the same measure. */
const CO = D.counties.filter(c => c.churn_rate);
const nCO = CO.length;
const byRate = [...CO].sort((a, b) => b.churn_rate - a.churn_rate);
const hiCo = byRate[0], loCo = byRate.at(-1);
const bigCo = CO.reduce((a, c) => c.emp > a.emp ? c : a);
const ev = c => c.hires + c.seps;
const outflowCo = CO.filter(c => c.seps > c.hires).length;
const evRatio = ev(bigCo) / ev(hiCo);
/* The county panel covers the last four quarters; the hero covers all 55. A
   reader who reads "nine of twelve ended more jobs than they started" next to a headline
   +168 stops to check whether the two contradict. They do not, because they are different
   periods, and the verdict line now says so with the four-quarter figure. */
const last4Net = Q.slice(-4).reduce((a, q) => a + q.net, 0);

/* The hero stat row is STATIC HTML in index.html rather than a PV.figures() call. Without
   JS the page used to open on a headline and no numbers at all; these four are
   single-vintage strings guarded by claims.json, so there is no reason for a script to be
   the only thing that can print them. Same reasoning removed the JS that wrote the
   claim-carrying titles and ledes: one copy of each sentence, in the markup. */

const MOBILE = matchMedia("(max-width: 760px)");
/* A paper plate behind an SVG label that must cross other ink (cost-scissors pattern). */
const plate = (parent, s, x, y, fs = 7.2, anchor = "start") => el("rect",
  {x: anchor === "end" ? x - s.length * fs - 3 : x - 3, y: y - 12,
   width: s.length * fs + 6, height: 15, fill: "var(--paper)", opacity: .94, rx: 2}, parent);
const ORD = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
  "eighth", "ninth", "tenth", "eleventh", "twelfth"];

/* Vertical de-collision for point labels: keep every label on its own line, and draw a
   leader wherever one had to move. collide.mjs finds overlaps after the fact; this is the
   loop that stops them happening (the shared core has no annotation primitive). */
function placeLabels(items, lh) {
  const done = [];
  [...items].sort((a, b) => a.y - b.y).forEach(it => {
    const x0 = it.x0 == null ? it.x : it.x0;
    let y = it.y;
    done.forEach(p => {
      const xOverlap = !(x0 + it.w < p.x || p.x + p.w < x0);
      if (xOverlap && Math.abs(y - p.y) < lh) y = p.y + lh;
    });
    it.ly = y;
    done.push({x: x0, w: it.w, y});
  });
  return items;
}

/* ============================================================ 1. the flows */
/* The narrow rendering draws YEARS, so its how-to-read line and its text alternative are
   written for years. A subtitle that says "quarterly" over annual bars, and an alt text
   promising a net line the phone chart does not draw, are the same defect as a title that
   names marks the reader cannot see. Both are set per rendering, here, so a breakpoint
   change re-writes them with the chart. */
function drawFlow() {
  const mob = MOBILE.matches;
  /* SEASONALLY ADJUSTED is a term of art, and this is its first appearance on the page,
     so it is translated here and used bare everywhere after. The translation was
     BACKWARDS until 2026-09-01: it told the reader the winter and summer swing had been
     taken out of a series that is not adjusted at all. The swing is still in the
     quarterly bars, which is why every trend on this page is read off a four-quarter
     average rather than off adjacent quarters. */
  /* NAICS 326 is spelled out HERE, not only in the source line under the chart. This
     caption is the code's first appearance in reading order, and a bare classification
     number above a chart is a term of art the reader has to carry until the small grey
     type below finally translates it. */
  document.getElementById("flowsub").textContent = mob
    ? `Hires above zero and separations below it in ${NAICS_NAME} (NAICS ${NAICS}), ` +
      `${FP.words} counties summed, not seasonally adjusted, so the usual winter and ` +
      `summer swing is still in them. Each bar is one calendar year, ${first.year} to ` +
      `${last.year}; the pale last bar is three published quarters. Ends are plotted as ` +
      `negative jobs. Across all of them the flow ledger comes to ${N(tNet)} more starts ` +
      `than ends, too small to draw beside bars this size.`
    : `Quarterly hires (above zero) and separations (below it, as negative jobs) in ` +
      `${NAICS_NAME} (NAICS ${NAICS}), ${FP.words} counties summed, not seasonally ` +
      `adjusted, so the usual winter and summer swing is still in them, ` +
      `${D.meta.span[0]} to ${D.meta.span[1]}. The net line is the two bars added.`;
  document.getElementById("flow-t").textContent = mob
    ? `Hires and separations in plastics and rubber manufacturing across ${FP.words} ` +
      `counties, totalled by year, hires drawn up from zero and separations down as ` +
      `negative jobs. The two sides are close to mirror images in every year.`
    : `Quarterly hires and separations in plastics and rubber manufacturing across ` +
      `${FP.words} counties, hires drawn up from zero and separations down as negative ` +
      `jobs, with their sum as a net line that stays close to the zero axis.`;
  mob ? flowMobile() : flowDesktop();
}

function flowDesktop() {
  /* Left margin is 64 rather than 48 because the lower half of the axis is SIGNED (see
     the tick loop): "−4,000" is a character wider than "4,000", and at 48 the minus sign
     was drawn at a negative x. */
  const {svg, W, H, m, w, h} = PV.chart("flow",
    {W: 1100, H: 500, m: {t: 92, r: 96, b: 66, l: 64}});
  const maxF = Math.max(...Q.map(q => Math.max(q.hires, q.seps)));
  const xs = i => m.l + (i / (Q.length - 1)) * w;
  const cy = m.t + h / 2;
  const ys = v => cy - (v / maxF) * (h / 2);
  const bw = Math.max(3, w / Q.length - 3);
  const iLow = Q.indexOf(lowHire), iTop = Q.indexOf(topHire);

  /* The event band goes down FIRST, under the bars. Drawn as two panels that stop short
     of the zero axis, because a single full-height rect reads to collide.mjs as a bar
     running through its own axis. Annotation text goes on LAST. */
  [[m.t, cy - 1], [cy + 1, m.t + h]].forEach(([y0, y1]) =>
    el("rect", {x: xs(iLow) - bw, y: y0, width: xs(iTop) - xs(iLow) + 2 * bw,
      height: y1 - y0, fill: "rgba(12,100,115,.07)"}, svg));

  /* THE LOWER HALF CARRIES ITS SIGN. This axis ran 4,000 / 2,000 / 0 / 2,000 / 4,000 with
     no minus anywhere, and the NET LINE is drawn on it. So a point 155 units below zero
     was ambiguous by construction: on the bars, below the line meant "separations", a
     positive magnitude mirrored downward; on the net line it meant "minus 155". One axis
     cannot mean both. Signing it settles the question in the direction that makes the
     chart's own arithmetic close: ends are plotted as negative jobs, starts as positive,
     and the net line is then literally the height of the two bars added. A reader who
     traces the line below zero now reads a loss, which is what it is. */
  ticks(0, maxF, 3).forEach(v => {
    [1, -1].forEach(sgn => {
      if (v === 0 && sgn < 0) return;
      const y = cy - sgn * (v / maxF) * (h / 2);
      el("line", {x1: m.l, y1: y, x2: m.l + w, y2: y, stroke: "var(--pv-grid)",
        "stroke-width": 1}, svg);
      txt(svg, (sgn < 0 ? "−" : "") + N(v), {x: m.l - 10, y: y + 4,
        "text-anchor": "end", class: "pv-tick"});
    });
  });
  Q.forEach((q, i) => {
    if (q.q !== 1 || q.year % 2) return;
    txt(svg, q.year, {x: xs(i), y: m.t + h + 22, "text-anchor": "middle", class: "pv-tick"});
  });
  PV.axlab(svg, "Jobs per quarter: starts positive, ends negative, net is the two added",
    {x: m.l, y: m.t - 62});
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
  el("path", {d: "M" + Q.map((q, i) => `${xs(i)},${ys(q.net)}`).join("L"), fill: "none",
    stroke: INK, "stroke-width": 2}, svg);
  txt(svg, "net", {x: m.l + w + 10, y: ys(last.net) + 4, class: "pv-lab"});

  Q.forEach((q, i) => hoverable(
    el("rect", {x: xs(i) - bw / 2 - 1, y: m.t, width: bw + 2, height: h, fill: "transparent"},
      svg),
    /* The tooltip is where the two measures sit closest together, so it is where each
       one has to name itself. "net +X · N jobs" put a flow and a stock in one line with
       nothing to tell them apart. */
    `<b>${label(q)}</b><br><span class="v">${N(q.hires)}</span> hires<br>
     <span class="v">${N(q.seps)}</span> separations<br>
     net flow <span class="v">${q.net >= 0 ? "+" : "−"}${N(Math.abs(q.net))}</span><br>
     <span class="v">${N(q.emp)}</span> jobs counted at quarter start, a separate estimate
     ${q.counties < FP.n ? `<br>not published for ${FP.n - q.counties} of ${FP.n} counties` : ""}`,
    `${label(q)}: ${N(q.hires)} hires, ${N(q.seps)} separations`));

  /* Annotations last, in the top margin. TWO targets, so two treatments: the quarter-
     specific line is centred over the 2020Q2 bar pair and dropped onto it by a leader;
     the wave line is not leadered at all, because the shaded band under it already IS
     its target. The single leader they used to share landed at the midpoint of the band,
     two bars right of the quarter the bold text names. */
  const xLow = xs(iLow);
  txt(svg, `${label(lowHire)}: hiring froze at ${N(lowHire.hires)} while ${N(lowHire.seps)} jobs ended`,
    {x: xLow, y: m.t - 42, "text-anchor": "middle", class: "pv-lab"});
  /* The shaded span is named here rather than left as an unlabeled grey rectangle a
     reader has to infer from the line above it. */
  txt(svg, `shaded: the freeze, then a two-year rehiring wave peaking at ` +
    `${N(topHire.hires)} hires in ${label(topHire)}`,
    {x: m.l + w, y: m.t - 22, "text-anchor": "end", class: "pv-labq"});
  /* Leader last and short, so it drops from under the wave line straight onto the bar
     pair rather than crossing it. */
  el("line", {x1: xLow, y1: m.t - 11, x2: xLow, y2: m.t, stroke: "var(--pv-axis)",
    "stroke-width": 1}, svg);
}

/* Mobile: quarters aggregate to years. Fourteen bars fit 375px; 55 do not, and a
   sideways-scroll hint is not a mobile design. This is an editorial change to the
   rendering, flagged in the figure's own source line. */
const YEARS = (() => {
  const m = new Map();
  Q.forEach(q => {
    const y = m.get(q.year) || {year: q.year, hires: 0, seps: 0, n: 0};
    y.hires += q.hires; y.seps += q.seps; y.n++; m.set(q.year, y);
  });
  return [...m.values()].sort((a, b) => a.year - b.year);
})();
const partial = YEARS.filter(y => y.n < 4);

function flowMobile() {
  const W = colW("flow"), H = 392, m = {t: 76, r: 12, b: 54, l: 42};
  const {svg} = PV.chart("flow", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const maxF = Math.max(...YEARS.map(y => Math.max(y.hires, y.seps)));
  const step = w / YEARS.length;
  const xs = i => m.l + step * (i + 0.5);
  const cy = m.t + h / 2;
  const ys = v => cy - (v / maxF) * (h / 2);
  const bw = step - 5;

  ticks(0, maxF, 3).forEach(v => {
    [1, -1].forEach(sgn => {
      if (v === 0 && sgn < 0) return;
      const y = cy - sgn * (v / maxF) * (h / 2);
      el("line", {x1: m.l, y1: y, x2: m.l + w, y2: y, stroke: "var(--pv-grid)",
        "stroke-width": 1}, svg);
      /* Signed for the same reason as the wide rendering, and to the same convention, so
         a reader who meets both forms meets one chart. This form draws no net line, but
         an unsigned mirror here and a signed one at 761px is two charts. */
      txt(svg, v ? (sgn < 0 ? "−" : "") + v / 1000 + "k" : "0", {x: m.l - 8, y: y + 5,
        "text-anchor": "end", class: "pv-tick"});
    });
  });
  /* Short enough to fit 358 units of phone column. The full reading ("ends are plotted as
     negative jobs") is in this rendering's own subtitle; an axis title that runs off the
     plot edge says nothing at all. */
  PV.axlab(svg, "Jobs per year, ends negative", {x: m.l, y: m.t - 50});
  YEARS.forEach((y, i) => {
    const x = xs(i) - bw / 2;
    const dim = y.n < 4 ? .55 : 1;
    el("rect", {x, y: ys(y.hires), width: bw, height: cy - ys(y.hires), fill: SEQ[4],
      rx: 2, opacity: dim}, svg);
    el("rect", {x, y: cy + 1, width: bw, height: cy - ys(y.seps), fill: CAT[1], rx: 2,
      opacity: dim}, svg);
    if (y.year % 3 === 0 || i === YEARS.length - 1)
      txt(svg, "’" + String(y.year).slice(2), {x: xs(i), y: m.t + h + 22,
        "text-anchor": "middle", class: "pv-tick"});
    hoverable(el("rect", {x: xs(i) - step / 2, y: m.t, width: step, height: h,
      fill: "transparent"}, svg),
      `<b>${y.year}</b><br><span class="v">${N(y.hires)}</span> hires<br>
       <span class="v">${N(y.seps)}</span> separations${y.n < 4
        ? `<br>${y.n} of 4 quarters published` : ""}`,
      `${y.year}: ${N(y.hires)} hires, ${N(y.seps)} separations`);
  });
  el("line", {x1: m.l, y1: cy, x2: m.l + w, y2: cy, stroke: "var(--pv-axis)",
    "stroke-width": 1.5}, svg);
  txt(svg, "hires", {x: m.l + 2, y: m.t - 8, class: "pv-lab", fill: SEQ[5]});
  txt(svg, "separations", {x: m.l + w, y: m.t + h + 44, "text-anchor": "end",
    class: "pv-lab", fill: CAT[1]});
  const s = `2020 to 2022: the rehiring wave`;
  txt(svg, s, {x: m.l + w, y: m.t - 8, "text-anchor": "end", class: "pv-labq"});
  if (partial.length) txt(svg, `’${String(partial[0].year).slice(2)} is ${partial[0].n} quarters`,
    {x: m.l + w, y: m.t - 28, "text-anchor": "end", class: "pv-labq"});
}

/* ============================================================== 2. the rate */
function drawRate() { MOBILE.matches ? rateVariant(colW("rate"), 320, true)
                                     : rateVariant(1100, 372, false); }

function rateVariant(W, H, mob) {
  const m = mob ? {t: 54, r: 16, b: 52, l: 42} : {t: 52, r: 176, b: 60, l: 44};
  const {svg} = PV.chart("rate", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const maxV = Math.max(...Q.map(q => q.churn_rate)) * 1.08;
  const xs = i => m.l + (i / (Q.length - 1)) * w;
  const ys = v => m.t + h - (v / maxV) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: [], yt: ticks(0, maxV, mob ? 4 : 5),
    /* A share is a constructed unit, so the axis title carries the READING and not the
       arithmetic: a reader who has never met a churn rate can still say what a high point
       on this line means. The formula sits in the source line below. */
    yfmt: pcT, ylab: mob ? "Share starting or ending ↑ more"
                         : "Share of jobs starting or ending each quarter ↑ more of the workforce moving"});
  Q.forEach((q, i) => { if (q.q === 1 && q.year % (mob ? 4 : 2) === 0)
    txt(svg, q.year, {x: xs(i), y: m.t + h + 22, "text-anchor": "middle", class: "pv-tick"}); });

  /* The 2012 baseline, labeled by what CROSSING it means rather than by its value and
     its own name. "8.5%: the 2012 four-quarter average" told a reader what the line was
     and left them to work out that above it is busier. */
  el("line", {x1: m.l, y1: ys(base12), x2: m.l + w, y2: ys(base12), stroke: "var(--hover)",
    "stroke-width": 1.5, "stroke-dasharray": "5 4"}, svg);
  txt(svg, mob ? `above this line, busier than 2012’s ${pc1(base12)}`
               : `above this line, more moving than in 2012 (${pc1(base12)})`,
    {x: m.l + 4, y: ys(base12) + 18, class: "pv-labq", fill: "var(--hover)"});

  el("path", {d: "M" + Q.map((q, i) => `${xs(i)},${ys(q.churn_rate)}`).join("L"),
    fill: "none", stroke: GRAY, "stroke-width": 1.5}, svg);
  el("path", {d: "M" + rChurn.map((v, i) => v == null ? "" : `${xs(i)},${ys(v)}`)
    .filter(Boolean).join("L"), fill: "none", stroke: INK, "stroke-width": 3}, svg);
  if (!mob) {
    /* No in-plot series label at 375px. The narrow rendering used to carry one, dropped
       from the heavy line on a full-height vertical leader, and that leader ran straight
       through the baseline annotation below it: two pieces of chrome fighting over the
       only clear band on the chart. The subtitle already names both lines ("Thin line:
       single quarters. Heavy line: the same share averaged over the four quarters to
       date"), and a subtitle and an in-plot label are the same reading context, so this
       was the same sentence printed twice at the cost of the collision. Cutting it also
       bought the baseline annotation the room to carry its own value on a phone. */
    const s1 = "averaged over a year";
    plate(svg, s1, xs(16), ys(rChurn[16]) - 12, 7.4);
    txt(svg, s1, {x: xs(16), y: ys(rChurn[16]) - 12, class: "pv-lab"});
    const s2 = "single quarters";
    plate(svg, s2, xs(30), ys(Q[30].churn_rate) + 24, 7.1);
    txt(svg, s2, {x: xs(30), y: ys(Q[30].churn_rate) + 24, class: "pv-labq",
      fill: "#8C857A"});
  }

  Q.forEach((q, i) => hoverable(
    el("rect", {x: xs(i) - w / Q.length / 2, y: m.t, width: w / Q.length, height: h,
      fill: "transparent"}, svg),
    `<b>${label(q)}</b><br>churn <span class="v">${pc1(q.churn_rate)}</span>
     of <span class="v">${N(q.emp)}</span> jobs`,
    `${label(q)}: churn ${pc1(q.churn_rate)}`));

  /* The peak, named — and named AS the heavy line's peak. It used to be typeset in the
     single-quarter series' gray and set beside the thin line's higher spike, so the eye
     bound 16.7% to the wrong series. Now it carries a dot on the heavy line, sits at that
     dot's own height, and says which line it belongs to. */
  {
    const s = mob ? `${pc1(rChurn[peakI])} peak` : `${pc1(rChurn[peakI])} peak, averaged over a year`;
    const px = mob ? xs(peakI) : xs(peakI) + 13;
    const py = ys(rChurn[peakI]) + (mob ? 22 : 4);
    el("circle", {cx: xs(peakI), cy: ys(rChurn[peakI]), r: 3.5, fill: INK,
      stroke: "var(--paper)", "stroke-width": 1.2}, svg);
    plate(svg, s, mob ? px - s.length * 3.6 : px, py, 7.2);
    txt(svg, s, {x: px, y: py, class: mob ? "pv-labq" : "pv-lab", fill: INK,
      "text-anchor": mob ? "middle" : "start"});
  }

  /* The endpoint gap: the section's claim, drawn. A 1.1-point gap is 13px tall on an
     axis that has to hold an 18% spike, so it is bracketed and labeled outside the plot
     rather than arrowed inside it. */
  const yA = ys(base12), yB = ys(recent4);
  if (mob) {
    /* Inside the plot, in the empty band under the series — the top margin belongs to the
       axis label, and a caption printed over it is how the first mobile pass failed. The
       label is bracketed to the line's last point and dropped to the clear band on a
       leader; unanchored, it read as a caption that happened to land in the plot. */
    const xE = m.l + w;
    el("path", {d: `M${xE - 5},${yB} h5 V${yA} h-5`, fill: "none", stroke: "var(--pv-ink)",
      "stroke-width": 1.4}, svg);
    el("line", {x1: xE, y1: yA + 2, x2: xE, y2: m.t + h - 58, stroke: "var(--pv-ink)",
      "stroke-width": 1}, svg);
    txt(svg, `still ${gapPts.toFixed(1)} points above 2012`,
      {x: xE, y: m.t + h - 44, "text-anchor": "end", class: "pv-lab"});
    txt(svg, `${pc1(recent4)} now, ${pc1(base12)} in 2012`,
      {x: xE, y: m.t + h - 26, "text-anchor": "end", class: "pv-labq"});
  } else {
    const bx = m.l + w + 10;
    el("path", {d: `M${bx - 5},${yB} h5 V${yA} h-5`, fill: "none", stroke: "var(--pv-ink)",
      "stroke-width": 1.4}, svg);
    txt(svg, `still ${gapPts.toFixed(1)} points`, {x: bx + 8, y: (yA + yB) / 2 - 2,
      class: "pv-lab"});
    txt(svg, "above 2012", {x: bx + 8, y: (yA + yB) / 2 + 15, class: "pv-lab"});
    txt(svg, `${pc1(recent4)} now`, {x: bx + 8, y: (yA + yB) / 2 + 33, class: "pv-labq"});
  }
}

/* THE PHONE COLUMN, MEASURED. Every mobile variant here was authored against a 375px
   phone, but the column is 320 on a 360px screen, a 0.853 scale that put labels at
   11.1px. Measuring the chart's own container makes the render scale 1.000. The fallback
   matters: a container that has not been laid out when the draw runs measures 0, which is
   how the first attempt at this silently kept the authored width. */
const colW = id => {
  const el = document.getElementById(id);
  const w = el && el.parentElement
    ? Math.round(el.parentElement.getBoundingClientRect().width) : 0;
  return Math.max(300, w || Math.min(980, innerWidth - 40));
};

/* ================================================== 3. which side moved */
function drawSplit() { MOBILE.matches ? splitVariant(colW("split"), 330, true)
                                      : splitVariant(1100, 400, false); }

function splitVariant(W, H, mob) {
  const m = mob ? {t: 50, r: 16, b: 54, l: 40} : {t: 54, r: 200, b: 62, l: 46};
  const {svg} = PV.chart("split", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const lo = Math.min(...spread.filter(v => v != null)) - 0.35;
  const hi = Math.max(...spread.filter(v => v != null)) + 0.45;
  const xs = i => m.l + (i / (Q.length - 1)) * w;
  const ys = v => m.t + h - ((v - lo) / (hi - lo)) * h;
  const y0 = ys(0);

  ticks(lo, hi, mob ? 6 : 5).forEach(v => {
    el("line", {x1: m.l, y1: ys(v), x2: m.l + w, y2: ys(v), stroke: "var(--pv-grid)",
      "stroke-width": 1}, svg);
    txt(svg, ptsT(v), {x: m.l - 8, y: ys(v) + 4, "text-anchor": "end", class: "pv-tick"});
  });
  Q.forEach((q, i) => { if (q.q === 1 && q.year % (mob ? 4 : 2) === 0)
    txt(svg, q.year, {x: xs(i), y: m.t + h + 22, "text-anchor": "middle", class: "pv-tick"}); });
  /* The axis said what was subtracted from what, which is the one thing a reader can
     read off the source line. It now says what the height MEANS; the subtraction is in
     splitsrc. */
  PV.axlab(svg, mob ? "↑ more jobs ended than started"
                    : "Gap between separations and hires, in points ↑ above zero, more jobs ended than started",
    {x: m.l, y: m.t - 24});

  /* Area on both sides of zero, clipped rather than hand-split at the crossings. */
  const pts = spread.map((v, i) => v == null ? null : `${xs(i)},${ys(v)}`).filter(Boolean);
  const i0 = spread.findIndex(v => v != null);
  const area = `M${xs(i0)},${y0} L` + pts.join("L") + `L${xs(Q.length - 1)},${y0} Z`;
  const defs = el("defs", {}, svg);
  const cpU = el("clipPath", {id: "split-up"}, defs);
  el("rect", {x: m.l, y: m.t, width: w, height: Math.max(0, y0 - m.t)}, cpU);
  const cpD = el("clipPath", {id: "split-down"}, defs);
  el("rect", {x: m.l, y: y0, width: w, height: Math.max(0, m.t + h - y0)}, cpD);
  el("path", {d: area, fill: "rgba(200,95,12,.20)", "clip-path": "url(#split-up)"}, svg);
  el("path", {d: area, fill: "rgba(26,138,158,.20)", "clip-path": "url(#split-down)"}, svg);
  el("path", {d: "M" + pts.join("L"), fill: "none", stroke: "#7A5A3A", "stroke-width": 2},
    svg);
  el("line", {x1: m.l, y1: y0, x2: m.l + w, y2: y0, stroke: "var(--pv-axis)",
    "stroke-width": 1.5}, svg);
  {
    const s = "even: hires equal separations";
    plate(svg, s, m.l + 4, y0 - 8, mob ? 7.8 : 7.1);
    txt(svg, s, {x: m.l + 4, y: y0 - 8, class: "pv-labq"});
  }

  Q.forEach((q, i) => { if (spread[i] == null) return;
    hoverable(el("rect", {x: xs(i) - w / Q.length / 2, y: m.t, width: w / Q.length,
      height: h, fill: "transparent"}, svg),
      `<b>${label(q)}</b>, four quarters to date<br>hire rate
       <span class="v">${pc1(rHire[i])}</span><br>separation rate
       <span class="v">${pc1(rSep[i])}</span><br>gap
       <span class="v">${ptsT(+spread[i].toFixed(2))}</span> points`,
      `${label(q)}: separations minus hires ${spread[i].toFixed(2)} points`);
  });

  /* The two claims, drawn where they happen. */
  const iSince = Q.length - sepRun;
  el("line", {x1: xs(iSince), y1: m.t + 6, x2: xs(iSince), y2: m.t + h,
    stroke: "var(--hover)", "stroke-width": 1, "stroke-dasharray": "4 3"}, svg);
  if (mob) {
    txt(svg, `${sepSince} on: separations ahead`, {x: m.l + w, y: m.t - 4,
      "text-anchor": "end", class: "pv-lab", fill: CAT[1]});
    txt(svg, "2012: hiring ahead", {x: m.l + 4, y: ys(spread[3]) + 20, class: "pv-labq",
      fill: SEQ[5]});
  } else {
    txt(svg, `2012: hiring ran ${Math.abs(spread[3]).toFixed(1)} points ahead`,
      {x: xs(4), y: ys(spread[3]) + 24, class: "pv-lab", fill: SEQ[5]});
    txt(svg, "separations run ahead",
      {x: m.l + w + 10, y: ys(spread.at(-1)) - 6, class: "pv-lab", fill: CAT[1]});
    txt(svg, `since ${sepSince}: ${sepRun} quarters`,
      {x: m.l + w + 10, y: ys(spread.at(-1)) + 12, class: "pv-labq"});
  }
}

/* ============================================================= 4. by county */
let SEL = null;
function drawCounty() { MOBILE.matches ? countyVariant(colW("county"), 460, true)
                                       : countyVariant(1100, 520, false); }

function countyVariant(W, H, mob) {
  const m = mob ? {t: 44, r: 16, b: 66, l: 44} : {t: 56, r: 66, b: 74, l: 58};
  const {svg} = PV.chart("county", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const xhi = Math.max(...CO.map(c => c.emp)) * 1.12;
  const yhi = Math.max(...CO.map(c => c.churn_rate)) * 1.10;
  /* The vertical scale starts below the lowest county rather than at zero. Zero-based,
     five of the six gridlines carried no data at all, roughly half the desktop plot was
     empty, and the Trumbull-against-Summit contrast the section exists to show was
     squashed into a band at the top. A truncated ratio scale needs an anchor and this
     chart already draws one: the dashed line at the region's own rate. The floor is
     derived rather than typed, one whole point below the lowest county, so it cannot
     drift away from the data it has to clear. The horizontal scale keeps its zero,
     because a job count read off a truncated axis is a different kind of lie. */
  const ylo = Math.max(0,
    Math.floor(Math.min(...CO.map(c => c.churn_rate)) * 100 - 1) / 100);
  const xs = v => m.l + (v / xhi) * w;
  const ys = v => m.t + h - ((v - ylo) / (yhi - ylo)) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: ticks(0, xhi, mob ? 3 : 5),
    yt: ticks(ylo, yhi, mob ? 4 : 5), xfmt: N, yfmt: pcT,
    xlab: mob ? "Average jobs in the county" : "Average jobs in the county, last four quarters",
    /* The vertical scale is the constructed one, so it carries the direction; the
       horizontal is a plain job count and needs none. */
    ylab: mob ? "Share starting or ending ↑ more"
              : "Share of the county’s jobs starting or ending each quarter ↑ more movement"});

  /* The region on the same axis, so a county reads against the whole. Shortened on the
     narrow rendering and plated, because at 375px the long form ran back into Cuyahoga's
     dot and the dashed rule printed through its own label. */
  el("line", {x1: m.l, y1: ys(recent4), x2: m.l + w, y2: ys(recent4),
    stroke: "var(--hover)", "stroke-width": 1.5, "stroke-dasharray": "5 4"}, svg);
  {
    /* Length is load-bearing: the label is end-anchored at the plot edge, so every extra
       character runs LEFT into the dots. The long form collided with Cuyahoga. */
    const s = mob ? `↑ busier than region`
                  : `above this line: more movement than the region (${pc1(recent4)})`;
    /* The narrow label is end-anchored at the plot edge, so its LENGTH decides how far
       left it reaches. At 24 characters it came to rest on top of Stark's dot. */
    plate(svg, s, m.l + w, ys(recent4) - 8, mob ? 7.2 : 7.1, "end");
    txt(svg, s, {x: m.l + w, y: ys(recent4) - 8, "text-anchor": "end", class: "pv-labq",
      fill: "var(--hover)"});
  }

  /* Labels go right of their dot unless that would run off the plot, then left. Widths
     are estimated from the character count, which is what the de-collision loop needs. */
  const rDot = mob ? 6 : 8, cw = mob ? 6.7 : 7.0, off = rDot + 6;
  /* WHICH DOTS GET NAMES. Twelve labels fit 1,100px and do not fit 375px: at the rendered
     narrow size the reference label printed over Cuyahoga, the 10% gridline ran through
     Lorain and Geauga, Lake sat on the dashed rule and Portage touched Summit. Thinning
     the labels is the documented mobile move for a scatter, so the narrow rendering names
     only the three counties the annotations argue about, plus whichever county the reader
     has selected. Every dot keeps its hover value, and all twelve are in the table. */
  const NAMED = new Set([hiCo.county, loCo.county, bigCo.county]);
  const shown = mob ? CO.filter(c => NAMED.has(c.county) || SEL === c.county) : CO;
  const spots = placeLabels(shown.map(c => {
    const tw = c.county.length * cw, right = xs(c.emp) + off;
    /* Flip to the left when the right-hand run would print over another county's dot,
       or off the plot. Two dots 200 jobs apart at the same rate is the crowded case. */
    const overDot = CO.some(o => o !== c && xs(o.emp) > right && xs(o.emp) < right + tw &&
      Math.abs(ys(o.churn_rate) - ys(c.churn_rate)) < 12);
    const flip = overDot || right + tw > m.l + w - 2;
    /* On the narrow rendering a left-flipped name lands nearer the NEXT dot to its left
       than its own, because the counties it names sit at the ends of the x range: at 375px
       "Summit" flipped left and came to rest against Portage's dot, reading as Portage's
       label. There is no room to its right either, so it goes ABOVE its own dot, where it
       cannot be read as belonging to anything else. */
    const above = mob && flip;
    const left = flip && !above;
    const x = above ? xs(c.emp) : left ? xs(c.emp) - off : right;
    return {c, tw, left, above, x,
            y: ys(c.churn_rate) + (above ? -(rDot + 7) : 4),
            w: above ? tw : tw + off};
  }).map(s => Object.assign(s,
    {x0: s.above ? s.x - s.tw / 2 : s.left ? s.x - s.tw : s.x})),
    mob ? 15 : 16);
  const spotOf = new Map(spots.map(s => [s.c.county, s]));
  CO.forEach(c => {
    const g = el("g", !SEL || SEL === c.county ? {} : {opacity: .18}, svg);
    const cx = xs(c.emp), cyy = ys(c.churn_rate);
    const s = spotOf.get(c.county);
    if (s && Math.abs(s.ly - s.y) > 3)
      el("line", {x1: cx + (s.left ? -1 : 1) * (rDot + 1), y1: cyy,
        x2: s.x + (s.left ? 3 : -3), y2: s.ly - 4, stroke: "var(--pv-axis)",
        "stroke-width": 1}, g);
    el("circle", {cx, cy: cyy, r: SEL === c.county ? rDot + 3 : rDot,
      fill: SEL === c.county ? CAT[1] : SEQ[4], stroke: "var(--paper)",
      "stroke-width": 1.5}, g);
    if (s) {
      /* A paper plate under every name. Lake's rate sits within a tenth of a point of the
         regional reference, so the dashed rule printed straight through its label. A
         centred plate is the end-anchored one shifted by half its own width. */
      plate(g, c.county, s.above ? s.x + s.tw / 2 : s.x, s.ly, cw,
        s.above || s.left ? "end" : "start");
      txt(g, c.county, {x: s.x, y: s.ly, class: "c-dot",
        "text-anchor": s.above ? "middle" : s.left ? "end" : "start"});
    }
    hoverable(el("circle", {cx, cy: cyy, r: rDot + 8, fill: "transparent"}, g),
      `<b>${c.county} County</b><br>churn <span class="v">${pc1(c.churn_rate)}</span>
       per quarter<br><span class="v">${N(c.emp)}</span> jobs<br>
       <span class="v">${N(c.hires)}</span> hires and
       <span class="v">${N(c.seps)}</span> separations over four quarters`,
      `${c.county}: churn ${pc1(c.churn_rate)} on ${N(c.emp)} jobs`);
  });

  /* Annotations last. The section's claim is the contrast between these two dots.

     THE ARITHMETIC HAS TO CLOSE. These used to read "13.5% of 402 jobs is 434 job
     events", which asks the reader to multiply by eight without saying so: four quarters,
     and both sides of the flow. A naive reader did the sum, got 54, and assumed the page
     had a typo. The percentage now stays on the y-axis and in the fig-sub, where the
     ×4 and the ×2 are spelled out once in prose; the annotations print only counts, and
     the one derived number left on the chart — Summit against Trumbull — divides two
     figures printed beside it. */
  const aHi = [`high rate, small base`,
    `${N(ev(hiCo))} starts and ends in a year`];
  const aBig = mob
    ? [`low rate, largest base`, `${N(ev(bigCo))} in a year, on ${N(bigCo.emp)} jobs`]
    : [`low rate, largest base`,
       `${N(ev(bigCo))} in a year, on ${N(bigCo.emp)} jobs,`,
       `${evRatio.toFixed(1)} times ${hiCo.county}’s ${N(ev(hiCo))}`];
  if (mob) {
    aHi.forEach((s, i) => txt(svg, s, {x: xs(hiCo.emp) + 12,
      y: ys(hiCo.churn_rate) + 26 + i * 18, class: i ? "pv-labq" : "pv-lab",
      fill: i ? null : CAT[1]}));
    aBig.forEach((s, i) => txt(svg, s, {x: m.l + w,
      y: ys(bigCo.churn_rate) + 34 + i * 18, "text-anchor": "end", class: "pv-labq"}));
  } else {
    el("line", {x1: xs(hiCo.emp) + 10, y1: ys(hiCo.churn_rate) + 6,
      x2: xs(hiCo.emp) + 40, y2: ys(hiCo.churn_rate) + 30, stroke: "var(--pv-axis)",
      "stroke-width": 1}, svg);
    aHi.forEach((s, i) => txt(svg, s, {x: xs(hiCo.emp) + 44,
      y: ys(hiCo.churn_rate) + 34 + i * 17, class: i ? "pv-labq" : "pv-lab",
      fill: i ? null : CAT[1]}));
    /* Summit's callout gets the same leader Trumbull's has. Without one it floated
       between the Portage and Summit dots and could have named either. */
    el("line", {x1: xs(bigCo.emp) - 10, y1: ys(bigCo.churn_rate) + 7,
      x2: xs(bigCo.emp) - 20, y2: ys(bigCo.churn_rate) + 24, stroke: "var(--pv-axis)",
      "stroke-width": 1}, svg);
    aBig.forEach((s, i) => txt(svg, s, {x: xs(bigCo.emp) - 24,
      y: ys(bigCo.churn_rate) + 34 + i * 17, "text-anchor": "end",
      class: i ? "pv-labq" : "pv-lab"}));
  }
}

function verdict() {
  const v = document.getElementById("verdict");
  if (!SEL) {
    v.innerHTML = `<b>All ${FP.words} counties:</b> the lowest rate is
      ${pc1(loCo.churn_rate)} in ${loCo.county} and the highest ${pc1(hiCo.churn_rate)} in
      ${hiCo.county}, and ${outflowCo} of ${nCO} recorded more separations than hires over
      the four quarters. So did the region as a whole, by ${N(Math.abs(last4Net))}; the
      ${tNet >= 0 ? "+" : ""}${N(tNet)} in the headline is the ${Q.length}-quarter ledger, not
      this one. Select a county to see its own numbers.`;
    return;
  }
  const c = CO.find(x => x.county === SEL);
  const rank = byRate.indexOf(c) + 1;
  v.innerHTML = `<b>${c.county} County:</b> ${pc1(c.churn_rate)} a quarter on
    ${N(c.emp)} jobs, ${rank === 1 ? "the highest rate" : rank === nCO
      ? "the lowest rate" : `the ${ORD[rank]} highest rate of ${nCO}`} in the footprint.
    Over the last four published quarters that is ${N(c.hires)} hires and
    ${N(c.seps)} separations, ${N(ev(c))} job events in all.`;
}

{
  const host = document.getElementById("csel");
  const mk = (text, name) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = text;
    b.setAttribute("aria-pressed", String(name === null));
    b.addEventListener("click", () => {
      SEL = (SEL === name) ? null : name;
      host.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed",
        String(SEL === null ? x.dataset.all === "1" : x.textContent === SEL)));
      verdict(); drawCounty();
    });
    if (name === null) b.dataset.all = "1";
    host.appendChild(b);
  };
  mk("All 12", null);
  [...CO].sort((a, b) => a.county.localeCompare(b.county)).forEach(c => mk(c.county, c.county));
}
verdict();

/* ================================== 0. COMPARED WITH WHAT (the answer, first)

   Two panels, one row order, one shared set of names. They are two panels rather than one
   because the two quantities differ by an order of magnitude: turnover runs 7% to 11%, and
   the amount by which ending runs ahead of starting runs 0.06 to 0.9 of a point. Drawn on
   one axis the second is invisible, which is the failure this page's own rule about stocks
   and flows exists to prevent.

   The bars start at zero. A truncated axis would make a 7.1% and an 11.1% look like a
   chasm, and the finding here is the opposite of a chasm: they are all in the same
   neighbourhood, and the region is in the middle of it. */
const PW = BN.windows.now;
const PROWS = PW.rows;                                   // already sorted, fastest first
const PME = PROWS.find(r => r.kind === "region");
const PRANK = PROWS.indexOf(PME) + 1;
const PGAPRANK = [...PROWS].sort((a, b) => b.gap_pts - a.gap_pts).indexOf(PME) + 1;
const PWIDEST = [...PROWS].sort((a, b) => b.gap_pts - a.gap_pts)[0];
const MICH = BN.coverage.find(c => c.state === "26");
const AGGC = BN.aggregation_check;
/* Every window the region's position was tested on, so persistence is drawn from the data
   rather than asserted. `slower` is the count of states below it. */
const PWINS = Object.entries(BN.windows);
const ALWAYS_SLOWER = Math.min(...PWINS.map(([, w]) => w.slower));
const BELOW_OHIO = PWINS.filter(([, w]) => {
  const me = w.rows.find(r => r.kind === "region");
  const oh = w.rows.find(r => r.geo === "39");
  return me.churn_rate < oh.churn_rate;
}).length;

function drawPeer() { MOBILE.matches ? peerVariant(colW("peer"), 0, true)
                                     : peerVariant(1100, 0, false); }

function peerVariant(W, _H, mob) {
  const rowH = mob ? 30 : 34;
  const n = PROWS.length;
  const m = mob ? {t: 54, r: 12, b: 16, l: 96} : {t: 62, r: 20, b: 18, l: 152};
  const bandH = n * rowH;
  /* Wide: the panels sit side by side. Narrow: the second sits under the first, with its
     own heading and its own row names, because a 96px name column plus two plots does not
     fit a phone and shrinking both is how the small quantity disappears. */
  const H = mob ? m.t + bandH + 40 + m.t + bandH + m.b : m.t + bandH + m.b;
  const {svg} = PV.chart("peer", {W, H});
  const gap = mob ? 0 : 74;
  const wA = mob ? W - m.l - m.r : Math.round((W - m.l - m.r - gap) * 0.63);
  const wB = mob ? W - m.l - m.r : W - m.l - m.r - gap - wA;
  const xA0 = m.l, xB0 = mob ? m.l : m.l + wA + gap;
  const yB0 = mob ? m.t + bandH + 40 + m.t : m.t;

  const hiC = Math.max(...PROWS.map(r => r.churn_rate)) * 1.16;
  const hiG = Math.max(...PROWS.map(r => r.gap_pts)) * 1.24;
  const loG = Math.min(0, Math.min(...PROWS.map(r => r.gap_pts)) * 1.2);
  const xa = v => xA0 + (v / hiC) * wA;
  const xb = v => xB0 + ((v - loG) / (hiG - loG)) * wB;
  const yr = (i, base) => base + i * rowH + rowH / 2;

  /* Panel heads. They carry the unit and the direction, so neither plot depends on the
     subtitle above the figure to be readable on its own. */
  /* Panel heads start at the SVG's own left edge on a phone, not at the plot's. Set at
     the plot edge they began 96 units in and ran 15 to 23 units past the page column at
     every width from 360 to 700; a heading that leaves the column is not a heading. */
  txt(svg, mob ? "Starting or ending, each quarter"
               : "Share of jobs starting or ending, each quarter",
    {x: mob ? 0 : xA0, y: m.t - 32, class: "pv-lab"});
  /* Short enough to fit the panel it heads. The long form ran 28 units past the page
     column at 1180 and above; the sentence it was trying to be lives in the subtitle. */
  txt(svg, mob ? "Separations ahead of hires"
               : "Separations ahead of hires, in points",
    {x: mob ? 0 : xB0, y: yB0 - 32, class: "pv-lab"});

  /* Panel A: bars from zero, on a tagged category axis. The tag is not decoration:
     collide.mjs identifies the axis by `data-pv-axis` and falls back to "the widest flat
     line" when none exists, which on this chart picked the longest dumbbell stem in the
     right panel and reported the bar sharing that row as crossing it. */
  el("line", {x1: xA0, y1: m.t + bandH, x2: xA0 + wA, y2: m.t + bandH,
    "data-pv-axis": "1", stroke: "var(--pv-axis)", "stroke-width": 1}, svg);
  ticks(0, hiC, mob ? 3 : 5).forEach(v => {
    el("line", {x1: xa(v), y1: m.t, x2: xa(v), y2: m.t + bandH,
      stroke: "var(--pv-grid)", "stroke-width": 1}, svg);
    txt(svg, pcT(v), {x: xa(v), y: m.t - 10, "text-anchor": "middle", class: "pv-tick"});
  });
  /* Panel B: the zero rule is the anchor, and it is labelled by what standing on it
     MEANS rather than by the digit. */
  el("line", {x1: xb(0), y1: yB0, x2: xb(0), y2: yB0 + bandH, stroke: "var(--pv-ink)",
    "stroke-width": 1.4}, svg);
  txt(svg, mob ? "as many start as end" : "on this line, as many jobs start as end",
    {x: xb(0) + 5, y: yB0 - 12, class: "pv-labq"});

  PROWS.forEach((r, i) => {
    const me = r.kind === "region";
    const yA = yr(i, m.t), yB = yr(i, yB0);
    const nm = me ? "This region" : r.name;
    /* Row names, once per panel on the narrow rendering because the panels are stacked
       and a name 300px above its own dot names nothing. */
    const names = mob ? [[m.l - 8, yA], [m.l - 8, yB]] : [[m.l - 12, yA]];
    names.forEach(([nx, ny]) => txt(svg, nm, {x: nx, y: ny + 4, "text-anchor": "end",
      class: me ? "pv-lab" : "pv-labq", fill: me ? INK : "var(--pv-ink)"}));
    el("rect", {x: xa(0), y: yA - rowH * 0.30, width: Math.max(1, xa(r.churn_rate) - xa(0)),
      height: rowH * 0.60, fill: me ? INK : GRAY}, svg);
    txt(svg, pc1(r.churn_rate), {x: xa(r.churn_rate) + 6, y: yA + 4,
      class: me ? "pv-lab" : "pv-labq"});
    const gpos = r.gap_pts > 0;
    el("line", {x1: xb(0), y1: yB, x2: xb(r.gap_pts), y2: yB,
      stroke: gpos ? CAT[1] : SEQ[4], "stroke-width": 2, opacity: me ? 1 : .5}, svg);
    el("circle", {cx: xb(r.gap_pts), cy: yB, r: me ? 7 : 5,
      fill: gpos ? CAT[1] : SEQ[4], stroke: me ? INK : "var(--paper)",
      "stroke-width": me ? 2.5 : 1.2}, svg);
    txt(svg, pts2(r.gap_pts), {x: xb(r.gap_pts) + 11, y: yB + 4,
      class: me ? "pv-lab" : "pv-labq"});
    hoverable(el("rect", {x: xA0, y: yA - rowH / 2, width: wA, height: rowH,
      fill: "transparent"}, svg),
      `<b>${nm}</b><br>churn <span class="v">${pc1(r.churn_rate)}</span> a quarter<br>
       starting <span class="v">${pc1(r.hire_rate)}</span>, ending
       <span class="v">${pc1(r.sep_rate)}</span><br>
       <span class="v">${N(r.emp / r.quarters)}</span> jobs`,
      `${nm}: churn ${pc1(r.churn_rate)}, starting ${pc1(r.hire_rate)}, ending ${pc1(r.sep_rate)}`);
  });

  /* Annotations last, so nothing draws over them. The claim of the left panel is the
     region's POSITION, so the annotation counts the rows above and below it. */
  {
    /* Inside the region's own bar, in paper on ink. Set below the bar it belongs to, it
       printed across the next state's bar and read as that state's label. */
    const yMe = yr(PRANK - 1, m.t);
    const s = mob ? `${PW.faster} faster, ${PW.slower} slower`
                  : `${PW.faster} states churn faster, ${PW.slower} churn slower`;
    txt(svg, s, {x: xA0 + 10, y: yMe + 4, class: "pv-lab", fill: "var(--paper)"});
  }
}

/* ============================== 4b. WHO IS NEAREST THE DOOR (the age structure)

   One dumbbell per age band: where the band's hire rate sits, where its separation rate
   sits, and the line between them. Same two colours the flow chart uses, same meaning, so
   the reader learns one vocabulary and reuses it.

   The horizontal scale keeps its zero and covers the whole range, teenage band included.
   That compresses the older bands, and the compression IS the finding: a band hiring at
   4% and a band hiring at 37% cannot both look busy. Values a reader wants to the tenth
   are in the table and in every dot's hover. */
const AGE = BN.age.now, AGEB = BN.age.base;
const AOLD = AGE.older, AOLDB = AGEB.older;
const LAD = BN.ladder;
const RET = BN.retirement;
const bandChurn = b => (b.hire_rate + b.sep_rate) / 2;
const ATOP = AGE.bands.find(b => b.band === LAD.top);
const ABOT = AGE.bands.find(b => b.band === LAD.bottom);

function drawAge() { MOBILE.matches ? ageVariant(colW("age"), true)
                                    : ageVariant(1100, false); }

function ageVariant(W, mob) {
  /* THE TEENAGE BAND IS OFF THIS SCALE, ON PURPOSE AND IN WRITING. It starts 74.7% of its
     jobs in a quarter, twice the next band, and it is one job in a thousand here, drawn
     from 11 of its 48 possible county-quarter cells. Drawn in, it took 60% of the plot for 0.1% of the
     workforce and squeezed the other seven bands into the left quarter. It keeps its row
     in the table and its numbers in the figure's own note; what it does not get is the
     resolution of every band a reader came for. */
  const OFF = AGE.bands.find(b => b.band === "A01");
  const rows = AGE.bands.filter(b => b !== OFF);
  /* Two label lines per row on a phone (band, then its weight), so the row has to hold
     two baselines clear of each other: at 13 units apart their boxes overlapped at every
     width the sweep tests, which reads as fine and measures as a collision. */
  const rowH = mob ? 46 : 38;
  const m = mob ? {t: 50, r: 40, b: 22, l: 104} : {t: 58, r: 74, b: 24, l: 196};
  const h = rows.length * rowH, H = m.t + h + m.b;
  const {svg} = PV.chart("age", {W, H});
  const w = W - m.l - m.r;
  const hi = Math.max(...rows.map(b => Math.max(b.hire_rate, b.sep_rate))) * 1.06;
  const xs = v => m.l + (v / hi) * w;
  const yr = i => m.t + i * rowH + rowH / 2;
  /* Tagged, for the same reason as the comparison chart above: unlabelled, the widest
     dumbbell stem gets read as this chart's axis. */
  el("line", {x1: m.l, y1: m.t + h, x2: m.l + w, y2: m.t + h, "data-pv-axis": "1",
    stroke: "var(--pv-axis)", "stroke-width": 1}, svg);
  ticks(0, hi, mob ? 3 : 5).forEach(v => {
    el("line", {x1: xs(v), y1: m.t, x2: xs(v), y2: m.t + h,
      stroke: "var(--pv-grid)", "stroke-width": 1}, svg);
    txt(svg, pcT(v), {x: xs(v), y: m.t - 10, "text-anchor": "middle", class: "pv-tick"});
  });
  txt(svg, mob ? "Share of the band’s jobs, a quarter"
               : "Share of the band’s own jobs starting or ending, each quarter",
    {x: mob ? 0 : m.l, y: m.t - 30, class: "pv-lab"});

  rows.forEach((b, i) => {
    const y = yr(i);
    /* The band's name and its weight in one label: a rate on 5% of the jobs and a rate on
       23% of them are not the same fact, and a reader should not have to cross to the
       table to learn which is which. */
    txt(svg, mob ? b.label : `${b.label} · ${pcT(b.share)} of jobs`,
      {x: m.l - 12, y: y + (mob ? -6 : 4), "text-anchor": "end", class: "pv-lab"});
    if (mob) txt(svg, `${pcT(b.share)} of jobs`, {x: m.l - 12, y: y + 18,
      "text-anchor": "end", class: "pv-labq"});
    el("line", {x1: xs(b.hire_rate), y1: y, x2: xs(b.sep_rate), y2: y,
      stroke: "var(--pv-axis)", "stroke-width": 2}, svg);
    el("circle", {cx: xs(b.hire_rate), cy: y, r: mob ? 5 : 6, fill: SEQ[4],
      stroke: "var(--paper)", "stroke-width": 1.4}, svg);
    el("circle", {cx: xs(b.sep_rate), cy: y, r: mob ? 5 : 6, fill: CAT[1],
      stroke: "var(--paper)", "stroke-width": 1.4}, svg);
    hoverable(el("rect", {x: m.l, y: y - rowH / 2, width: w, height: rowH,
      fill: "transparent"}, svg),
      `<b>${b.label}</b><br><span class="v">${pcT(b.share)}</span> of the jobs the Census
       discloses by age<br>starting <span class="v">${pc1(b.hire_rate)}</span>, ending
       <span class="v">${pc1(b.sep_rate)}</span> a quarter<br>
       <span class="v">${b.cells}</span> of ${b.cells_expected} possible cells disclosed`,
      `${b.label}: starting ${pc1(b.hire_rate)}, ending ${pc1(b.sep_rate)}`);
  });

  /* Annotations last, so nothing draws over them. Two, both on the rows the section's
     claim is about, both anchored to their own dots rather than floated in a margin.
     `fit` keeps a label inside the SVG: estimated from the character count, because
     getComputedTextLength returns 0 until the node is in the document, and a label that
     runs off the right edge is invisible rather than wrong. */
  const fit = (str, x, fs) => Math.max(m.l, Math.min(x, W - 6 - str.length * fs * 0.92));
  {
    const iBot = rows.indexOf(ABOT);
    const s = mob ? `a tenth of the top band`
                  : `a ${pc1(ABOT.hire_rate)} hire rate, about a tenth of the ${ATOP.label} band’s ${pc1(ATOP.hire_rate)}`;
    const ax = fit(s, xs(ABOT.sep_rate) + 16, mob ? 6.6 : 7.2);
    plate(svg, s, ax, yr(iBot) + 4, mob ? 6.6 : 7.2);
    txt(svg, s, {x: ax, y: yr(iBot) + 4, class: "pv-lab", fill: SEQ[4]});
  }
  {
    const iOld = rows.findIndex(b => b.band === "A08");
    const o = rows[iOld];
    const mult = (o.sep_rate / o.hire_rate).toFixed(1);
    const s = mob ? `${mult}× the hire rate`
                  : `at 65 and older, jobs end at ${mult} times the rate they start`;
    const ax = fit(s, xs(o.sep_rate) + 16, mob ? 6.6 : 7.2);
    plate(svg, s, ax, yr(iOld) + 4, mob ? 6.6 : 7.2);
    txt(svg, s, {x: ax, y: yr(iOld) + 4, class: "pv-lab", fill: CAT[1]});
  }
  /* THE BAND THAT IS NOT DRAWN IS NAMED IN THE FIGURE'S SUBTITLE, NOT ON THE PLOT. A note
     set inside the SVG has to be broken into lines by hand and the same string cannot fit
     1,100 units and 350: the first attempt ran off the right edge at both widths, which
     makes a disclosure invisible rather than wrong. HTML wraps. The subtitle is the same
     reading context as the chart and sits directly above it. */
}

/* ============================================ 5. what it is on a shop floor */
const FLOOR = 150;
const perYr = hc => hc * meanChurn * 4;            // replacement hires in a year
const perYrNow = hc => hc * recent4 * 4;

/* The section head and its lede are static in index.html: the default 150-person case is
   a single-vintage sentence guarded by churn-shop-floor, so it is markup, not output. */

function calc() {
  const raw = Number(document.getElementById("hc").value);
  const hc = Number.isFinite(raw) ? Math.min(20000, Math.max(1, Math.round(raw))) : FLOOR;
  /* Current rate leads, whole-series average follows. Leading with 10.8% put the
     highest and least current of the page's three churn figures in front of a reader who
     was already holding three. */
  document.getElementById("calcout").innerHTML =
    `At the most recent four quarters&rsquo; ${pc1(recent4)} a quarter, a ${N(hc)}-person
     plant makes about <b>${N(perYrNow(hc))} replacement hires a year</b> and sees about
     ${N(perYrNow(hc))} people leave. At the ${Q.length}-quarter average of ${pc1(meanChurn)},
     about ${N(perYr(hc))}. Both are the cluster rate applied to one payroll, not a
     forecast for any particular plant.`;
}
document.getElementById("hc").addEventListener("input", calc);
calc();

/* ================================ tables, source lines, and the one note box

   CAVEAT INK. Each figure gets one source line and at most one limitation sentence,
   inside a 45-word budget, and the page gets ONE callout box. Everything that used to
   crowd the captions — a 170-word source block under the flow chart with five bold
   interruptions, a second note box, the county/quarterly reconciliation — is now folded
   into the methodology, which is depth rather than disclosure: no caveat that changes how
   a number should be read has left the figure it qualifies. */
/* The flow caption is written per rendering inside drawFlow(), which runs after this
   block. A second copy here only ever printed the desktop wording over its own
   replacement, so it was one sentence maintained in two places and visible in neither. */
/* THE TWO COLUMNS THAT LOOK LIKE ONE MEASURE. "Net" beside "Jobs" invites a reader to
   difference the Jobs column and check it against Net, and it does not reconcile: Net is
   a difference of two event counts, Jobs is a headcount on one day, and the two are
   estimated separately. Both headers now name their own instrument, so the invitation is
   withdrawn at the point it was issued rather than corrected in a caption below. */
/* The comparison's table and source line. Michigan is IN the table, with the reason its
   cells are empty, because a state the selection rule picks and the data cannot serve is
   a fact about the comparison rather than a state to leave out of it. */
document.getElementById("peertable").innerHTML = tableView("p",
  "Turnover by geography, last four published quarters",
  ["Where", "Churn rate", "Hire rate", "Separation rate", "Separations ahead by, points",
   "Average jobs"],
  PROWS.map(r => [r.kind === "region" ? "This region, 12 counties" : r.name,
    pc1(r.churn_rate), pc1(r.hire_rate), pc1(r.sep_rate),
    pts2(r.gap_pts), N(r.emp / r.quarters)])
    .concat(MICH ? [[MICH.name, "—", "—", "—", "—",
      `no records after ${MICH.last_usable}`]] : []));
document.getElementById("peersrc").textContent =
  `Source: ${D.meta.source}, NAICS ${NAICS}, ${PW.quarters[0]} to ` +
  `${PW.quarters.at(-1)}. States are published whole; this region is the ${FP.label} ` +
  `counties summed. The six states are Ohio and the five others with the largest ` +
  `plastics and rubber payrolls, the same six at both ends of this page’s window. The ` +
  `position holds: in all ${PWINS.length} windows tested, including 2012 alone and the ` +
  `whole 2012 to 2025 span, ${ALWAYS_SLOWER} states sit below this region and it sits ` +
  `below Ohio in ${BELOW_OHIO} of ${PWINS.length}. ${MICH.name} has no usable figures ` +
  `after ${MICH.last_usable}: the state stopped supplying records to the program, at ` +
  `every industry, not only this one.`;

/* The age figure. `share` is of the jobs the Census discloses BY AGE, which is not all of
   them; the residual is printed here rather than spread across the bands, and the
   55-and-older finding is given as the range that residual allows. */
document.getElementById("agetable").innerHTML = tableView("a",
  "Turnover by age band, last four published quarters",
  ["Age band", "Share of disclosed jobs", "Hire rate", "Separation rate", "Churn rate",
   "County-quarters disclosed"],
  AGE.bands.map(b => [b.label, pcT(b.share), pc1(b.hire_rate), pc1(b.sep_rate),
    pc1(bandChurn(b)), `${b.cells} of ${b.cells_expected}`]));
document.getElementById("agesrc").textContent =
  `Source: ${D.meta.source}, NAICS ${NAICS}, ${FP.label} counties summed by age band, ` +
  `${PW.quarters[0]} to ${PW.quarters.at(-1)}. Bands do not sum to the all-ages total: ` +
  `withheld county-quarter cells leave ${pc1(AGE.residual_share)} of jobs outside them, ` +
  `so shares here are of the ${N(AGE.disclosed_emp / 4)} jobs the Census does disclose ` +
  `by age. Against all ${N(AGE.control.emp / 4)}, the 55-and-older share is between ` +
  `${pc1(AOLD.share_lo)} and ${pc1(AOLD.share_hi)}; in 2012 the same bracket ran ` +
  `${pc1(AOLDB.share_lo)} to ${pc1(AOLDB.share_hi)}, and the two do not overlap, so the ` +
  `rise survives the worst reading of the withheld cells.`;

document.getElementById("flowtable").innerHTML = tableView("f",
  "Quarterly hires, separations, the net flow of the two, and the separately counted headcount",
  ["Quarter", "Hires", "Separations", "Net flow", "Jobs at quarter start", "Counties"],
  Q.map(q => [label(q), N(q.hires), N(q.seps),
    (q.net >= 0 ? "+" : "−") + N(Math.abs(q.net)), N(q.emp), q.counties]));
/* The reconciliation, in prose, immediately under the table and above the source line.
   It is derived end to end: the example quarter is the widest gap between the two
   measures in the series, not a quarter somebody liked. */
document.getElementById("flowreconcile").innerHTML =
  `<b>Two measures, two questions.</b> Hires and separations are events counted through
   the quarter. The jobs column is a headcount taken on one day at the start of it. The
   Census publishes them as separate estimates, so they are not required to add up and
   across this series they do not. <b>Net flow</b> answers how the ledger of starts
   against ends came out. <b>The headcount</b> answers whether there are more jobs than
   there were, and it is the one to quote when the question is growth. Differencing the
   jobs column will not reproduce net flow, and in ${clashes.length} of the
   ${pairs.length} quarter-to-quarter comparisons the two point opposite ways. The widest
   gap of all is ${label(clash.q)}, where the ledger ran
   ${N(Math.abs(clash.q.net))} jobs short while the headcount rose ${N(clash.d)} into the
   next quarter. Across the whole series the
   ledger reads ${tNet >= 0 ? "+" : "−"}${N(Math.abs(tNet))} and the headcount reads
   ${N(stockFall)} fewer jobs, about ${stockPct.toFixed(0)}% down.`;
/* The limitation is stated in terms a reader can act on, and the qualifier it carries
   now also rides on the hero stat card, where +168 is first met. A number quoted three
   times as a jobs gain and corrected once in grey type two screens below is a number
   that will be quoted wrong. */
document.getElementById("flowsrc").textContent =
  `Source: ${D.meta.source}, NAICS ${NAICS}, ${FP.label} counties summed, ` +
  `${D.meta.span[0]} to ${D.meta.span[1]}. The job count reads ${N(first.emp)} in ` +
  `${label(first)} against ${N(last.emp)} in ${label(last)}. Aligning the flows to the ` +
  `same ${pairs.length} quarters those two readings bracket still leaves them apart: ` +
  `${netAligned >= 0 ? "+" : "−"}${N(Math.abs(netAligned))} on the ledger against ` +
  `${N(stockFall)} fewer jobs on the count, so the mismatch is not an end effect.`;

/* The measure and its direction now sit on the axis, and the dashed line names itself, so
   the subtitle keeps only what the eye cannot get from the plot: which line is which, and
   what a POINT is. That translation lands here because this is the page's first use of
   the unit; later sections use it bare. */
document.getElementById("ratesub").textContent =
  `Thin line: single quarters. Heavy line: the same share averaged over the four ` +
  `quarters to date. One point is one job in every hundred. ` +
  `${D.meta.span[0]} to ${D.meta.span[1]}.`;
document.getElementById("ratetable").innerHTML = tableView("r",
  "Churn rate by quarter, and the same share averaged over a year",
  ["Quarter", "Churn rate", "Averaged over a year", "Jobs"],
  Q.map((q, i) => [label(q), pc1(q.churn_rate), rChurn[i] == null ? "—" : pc1(rChurn[i]),
    N(q.emp)]));
/* The arithmetic the lede used to open with lives here instead: a reader who wants the
   formula can find it, and a reader who wants the reading gets it on the axis. */
document.getElementById("ratesrc").textContent =
  `Source: ${D.meta.source}, NAICS ${NAICS}, ${FP.label} summed, ${D.meta.span[0]} to ` +
  `${D.meta.span[1]}. Churn rate is hires and separations averaged, over jobs at quarter ` +
  `start. The Census revises these figures as later payroll records arrive, so read the ` +
  `${gapPts.toFixed(1)}-point rise as an estimate rather than a settled number.`;
/* The page's single callout box, merged from two. It carries the counting rule that
   governs every number here and the revision exposure of the one claim most sensitive to
   it, and nothing else. */
document.getElementById("revnote").innerHTML =
  `<b>What this cannot tell you.</b> The Quarterly Workforce Indicators count jobs, so one
   person holding two jobs appears twice, and a move between two plants inside the cluster
   shows as one separation and one hire. They cannot separate a quit from a layoff. The
   Census also revises the figures as later payroll records arrive, and this page shows
   one download rather than updating itself, so the ${gapPts.toFixed(1)}-point rise is an
   estimate. What a revision would have to reverse is the shape: the yearly average has
   sat above its 2012 level in ${aboveBase} of the ${nRoll} quarters it covers.`;

document.getElementById("splittable").innerHTML = tableView("s",
  "Hire rate, separation rate and the gap, each averaged over a year",
  ["Quarter", "Hiring rate", "Leaving rate", "Gap, points"],
  Q.map((q, i) => rHire[i] == null ? null
    : [label(q), pc1(rHire[i]), pc1(rSep[i]), ptsT(+spread[i].toFixed(2))]).filter(Boolean));
/* This figure names its own source. It used to open "Derived from the same series",
   which is a reference to a caption 800px above and leaves the figure unreadable alone. */
document.getElementById("splitsrc").textContent =
  `Source: ${D.meta.source}, NAICS ${NAICS}, ${FP.label} summed. Hires and separations ` +
  `are each divided by jobs, averaged over the four quarters to date, then differenced; ` +
  `2012’s first three quarters have no full year behind them and are not drawn.`;

document.getElementById("countytable").innerHTML = tableView("c",
  "Churn by county, last four published quarters",
  ["County", "Churn rate", "Hires", "Separations", "Jobs", "Quarters not published"],
  byRate.map(c => [c.county, pc1(c.churn_rate), N(c.hires), N(c.seps), N(c.emp),
    c.quarters_missing]));
/* "cell" was analyst language for the one row of the source table this rate is computed
   from; a reader does not hold it, and "number" loses nothing here. */
document.getElementById("countysrc").textContent =
  `Source: ${D.meta.source}, NAICS ${NAICS}, by county, 2024Q4 to ${label(last)}. ` +
  `${hiCo.county}’s rate rests on ${N(hiCo.emp)} jobs, the smallest base here, so it is ` +
  `the number most likely to move on revision and the ranking is unstable at the edges.`;


/* ---------------------------------------------------------------- assemble */
function drawAll() { drawPeer(); drawFlow(); drawRate(); drawSplit(); drawCounty(); drawAge(); }
drawAll();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* Footprint banner — stated on the page, not left to the reader to infer.

   It used to open the page on "excludes Crawford, Huron, Richland and Tuscarawas, which
   the vault's NEO-14 includes": two undefined internal terms in the most valuable
   position on the page, before the reader has met a single finding. A naive reader
   skipped the whole strip and started at the headline. The banner now names the twelve
   counties, which is the geography the headline promises and the one thing a reader
   actually wants from a footprint line. NEO-14 is explained in the methodology, where a
   reader who needs it can find it defined rather than referenced. */
PV.footprintBanner({...FP, note: `PIC’s official footprint: ` +
  FP.counties.slice(0, -1).join(", ") + ` and ` + FP.counties.at(-1) +
  `, in Northeast Ohio.`, differs: ""});

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. Three
   page-specific blocks are appended: the removed peer comparison, what a fair one would
   need, and the detail that used to crowd the figure captions. All three FOLD behind
   their own heads. Methodology was 28% of the scroll fully expanded, which is apparatus
   out-inking the story it underwrites; folded, it reads at caption scale and every
   inference-affecting caveat is still printed beside its own chart. PV.methodology()'s
   meta-key sets are fixed in the shared core, so page-specific blocks are added to the
   returned section rather than by editing that core. */
const meth = await PV.methodology({page: "churn", meta: D.meta});
meth.querySelector(".pv-method-grid").insertAdjacentHTML("beforeend", `
  <details class="fold">
    <summary><h3>Notes behind the four figures</h3></summary>
    <p>Across the period ${N(tHires)} jobs started and ${N(tSeps)} ended, so the region
      replaced about ${replMult.toFixed(1)} times its own opening workforce to finish with
      ${N(tNet)} more. The beginning-of-quarter count reads ${N(first.emp)} in
      ${label(first)} against ${N(last.emp)} in ${label(last)}: the Census publishes the
      headcount and the flows as separate estimates and they do not add up to one another,
      which is why the net drawn on the flow chart is a ledger of flows rather
      than the change in the stock.</p>
    <p><b>Which of the two answers whether employment grew.</b> The headcount does. It is
      a count of jobs on a day, so a fall in it is fewer jobs; ${N(stockFall)} fewer here,
      about ${stockPct.toFixed(1)}% of the ${label(first)} level. The flow ledger answers
      a different question, how the quarter&rsquo;s starts came out against its ends, and
      ${N(Math.abs(tNet))} is what is left of ${N(tHires + tSeps)} events after they
      cancel. Neither number is a correction of the other and neither is wrong. The
      mismatch is not confined to the endpoints: quarter by quarter, the ledger and the
      change in the headcount point opposite ways in ${clashes.length} of
      ${pairs.length} comparisons, and the widest gap between them falls at
      ${label(clash.q)}. Aligned to the
      ${pairs.length} quarters the two headcount readings bracket, the flows still net
      ${netAligned >= 0 ? "+" : "−"}${N(Math.abs(netAligned))}. This is ordinary for
      QWI and not a defect in this pull; a flow count and a point-in-time count of the
      same industry are separate estimates with separate reference periods. Neither
      series here is seasonally adjusted, so the quarterly swing is real movement in the
      data and every trend on this page is read off a four-quarter average.</p>
    <p>Every published quarter carries all ${FP.words} counties, so no bar on the flow
      chart is a floor. ${last.year}Q4 is absent rather than zero: the Census has not
      published it. Below 760px the flow chart aggregates quarters into years, which
      changes the shape of the chart and none of its values, and carries its own title.</p>
    <p><b>${FP.label}</b> is the ${FP.words}-county footprint PIC uses for its own
      reporting, and it is what every figure on this page is summed over. PIC&rsquo;s
      internal files also carry a wider fourteen-county definition called NEO-14, which
      adds Crawford, Huron, Richland and Tuscarawas. The two share ten counties and never
      reconcile, so a total from this page and a total from a NEO-14 page are not
      comparable and should not be differenced.</p>
    <p>On the gap chart, one point of separation rate on a ${N(last.emp)}-job base is about
      ${N(last.emp / 100)} jobs a quarter.</p>
    <p>On the county chart the horizontal scale starts at zero, so a county with twice the
      jobs sits twice as far right. The vertical scale starts a point below the lowest
      county rather than at zero, because zero-based it left all twelve crowded into the
      top third of the plot and made the contrast the section is about look small. Heights
      on it are therefore differences in rate rather than multiples of it, and the dashed
      line at the regional rate is the anchor. Each county’s rate is
      computed from its own row. County
      employment totals ${N(CO.reduce((a, c) => a + c.emp, 0))} against
      ${N(avg(Q.slice(-4).map(q => q.emp)))} in the quarterly series over the same span,
      because the two are averaged differently in the derivation; the dashed reference line
      is the quarterly figure used everywhere else on this page.</p>
  </details>
  <details class="fold">
    <summary><h3>Why the earlier county peer comparison came down</h3></summary>
    <p>The comparison at the top of this page is against whole states. An earlier version
      ended with a different one: six COUNTIES picked off a national ranking of payroll
      records, with Greenville County, South Carolina shown as holding its workers nearly
      twice as well. That one was removed rather than fixed, for three reasons, and the
      third is the one that decided which comparison replaced it.</p>
    <p><b>One.</b> A ratio of churn rates is not a ratio of retention.
      ${pc1(meanChurn)} quarterly churn against a peer at half that is roughly
      ${(100 - meanChurn * 100).toFixed(0)}% retention against
      ${(100 - meanChurn * 50).toFixed(0)}%, a real gap and nothing like
      &ldquo;twice as well.&rdquo;</p>
    <p><b>Two.</b> The peer was selected to match the Akron metro on scale and
      concentration, then measured as a single county against twelve summed ones. The
      geography did not match itself.</p>
    <p><b>Three.</b> Summing counties counts a worker moving from Summit to Stark as a
      separation and a hire, and a one-county peer records only one end of that move. This
      page used to call the resulting bias unmeasurable. It is measurable against a whole
      state, which is the comparison the page now publishes: summing every Ohio county the
      Census discloses for NAICS ${NAICS} in ${AGGC.quarter} gives a hire rate of
      ${pc1(AGGC.county_hire_rate)} against the ${pc1(AGGC.state_hire_rate)} Ohio
      publishes as one unit, and the county sum lands
      ${N(AGGC.state.emp - AGGC.county_sum.emp)} jobs SHORT of the state total rather than
      over it, which is about the employment in the ${AGGC.counties_withheld} counties
      withheld. Summing does not inflate the flows. That licenses a twelve-county rate
      beside a whole-state rate; it does not license one beside a single county, where the
      lost end of each cross-boundary move is a real difference and still unquantified.</p>
    <p>QWI also cannot support the word &ldquo;holds.&rdquo; It counts separations without
      distinguishing a quit from a layoff from a plant closing, so nothing in this data
      says whether an employer kept anyone.</p>
  </details>
  <details class="fold">
    <summary><h3>What the comparison at the top is, and three it still is not</h3></summary>
    <p>It is <span class="mono">industry=326</span> on <span class="mono">for=state:</span>
      for seven states, unadjusted, over ${PW.quarters[0]} to ${PW.quarters.at(-1)}: the
      identical request the county pull makes with the geography changed. The six states
      are Ohio and the five others with the largest plastics and rubber payrolls, a rule
      that picks the same six in 2012Q1, 2021Q4 and 2025Q3, so the peer group is not an
      artefact of the quarter it was chosen in. ${MICH.name} ranks next by the same rule
      and has no usable figures after ${MICH.last_usable}; the gap covers every industry,
      not this one, so it is the state leaving the program rather than a suppressed cell.
      Ranked ${PROWS.length} of ${PROWS.length}, this region comes ${ORD[PRANK]}.</p>
    <p>Three comparisons this page still does not carry:</p>
    <ul>
      <li>The same series with <span class="mono">industry=00</span> (all industries) and
        <span class="mono">industry=31-33</span> (all manufacturing) for the same twelve
        counties, which would say whether plastics and rubber churns unlike its neighbours
        rather than unlike itself elsewhere. The site pulls
        <span class="mono">industry=00</span> for earnings, but only
        <span class="mono">Emp,EarnBeg</span>, so the flow variables are missing.</li>
      <li>A single county against a single county, which is the only way to remove the
        lost end of a cross-boundary move rather than bound it.</li>
      <li>Census Job-to-Job Flows, a separate product, which is what separates a worker
        leaving plastics and rubber altogether from one moving to the plant next door. Its
        absence is why the retirement figure in the age section is a floor on replacement
        demand and not a total.</li>
    </ul>
    <p><b>The age estimate, stated as arithmetic.</b> ${N(RET.avg_jobs_5564)} of the
      region&rsquo;s ${N(RET.avg_jobs)} jobs are held by someone 55 to 64. Spread evenly
      over ten single-year cohorts, ${N(RET.annual)} of them reach 65 a year, which is
      ${(RET.annual_share * 100).toFixed(1)}% of all jobs here and about
      ${N(RET.annual)} of the ${N(RET.hires_year)} hires the region makes in a year. The
      even spread is an assumption and the Census cannot check it: QWI records separations,
      not retirements. The 65-and-older band recorded ${N(RET.observed_65plus_seps)}
      separations across the same four quarters, which is the size a flow of about
      ${N(RET.annual)} a year into that band would have to support. Read that as coherence
      and not as confirmation: the 65-and-older share of these jobs has roughly tripled
      since 2012, so the band is not in a steady state and the two figures were never
      required to agree.</p>
    <p>The missing number is how far past Census revisions have moved these same quarters.
      Answering it needs older editions of the series, saved before each revision, which
      this page does not carry. So the ${gapPts.toFixed(1)}-point rise is reported as an
      estimate and that caveat sits beside the chart it affects.</p>
  </details>`);
})();
