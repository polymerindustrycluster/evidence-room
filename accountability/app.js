/* PIC accountability — the subtraction, the promise register, and the negative space.
 *
 * THE TWO RULES THIS FILE ENFORCES AT RENDER TIME
 *   1. An absent number never renders as a small one. The disbursement stage is drawn as a
 *      dashed outline with words inside it and no numeric value bound to it; assertEmpty
 *      throws if the derive script ever hands one over. A board row awaiting PIC's private
 *      registers renders a chip, never a zero, a dash or a range.
 *   2. Match is never in the same accumulator as awards. The staged bar in band A is built
 *      from D.attribution.stages only; the match bar is drawn separately, below a gap,
 *      with its own label, and nothing sums the two.
 *
 * WHAT IS DRAWN, AND WHY THOSE FORMS
 *   A. Four nested stages as horizontal bars on one dollar scale, each row showing the
 *      previous stage in pale behind the current one, so the subtraction is the shape of
 *      the chart rather than a caption under it. Part-to-whole inside a magnitude
 *      comparison. Not a donut: four nested quantities where the last is 3.9 percent of
 *      the first cannot be read as angles.
 *   B. The same total in three stages, the third an empty outline. The absence is the
 *      finding, so it gets a stage rather than a footnote.
 *   C. One sortable table, one row per executed line, with the $1,000,000 rule drawn where
 *      it falls. No second chart of the same file: the sort, the rule and the callout
 *      carry the concentration finding, and a ladder chart beside them would be a third
 *      rendering of one dataset.
 *   D. A date-axis swimlane, owner above and below the line, plus the register itself.
 *      Status encoding is inherited from the public event register so the two cannot drift.
 *   E. A five-row reconciliation table. No funnel and no odds.
 *   F. Two generated lists and no chart. The force of that section is that it is plain.
 */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, chart, figures, INK, GRAY, CAT} = PV;

const D = await PV.data("accountability.json");
const MOBILE = matchMedia("(max-width: 760px)");

/* LEADING IS THE PHONE CANVASES' ENTIRE COLLISION BUDGET, and all three of them had it
   set too small. Every text-over-text pair the width sweep found on this page was a label
   printing on the line beneath it: two runs of text both anchored at m.l, so they overlap
   horizontally whatever either string says, and only the distance between their baselines
   decides whether they clear. Nothing here is a string-length problem, so nothing here is
   fixed by measuring strings.
   Measured rather than guessed: at the narrowest column this page ever gives a 375-unit
   canvas (320px at a 360px viewport, scale 0.853) a 14.2-unit .pv-lab paints a box 18.8
   units tall and a 13.6-unit .pv-labq 18.7, so the 14, 15 and 16 authored across these
   three charts left two to five units of overlap on every stacked pair, at every width
   from 360 to 760. 22 clears the tallest measured box with three units to spare.
   The desktop rows' 18 could not simply be borrowed: it clears by one unit at the scale
   THEY render at and by nothing at this one, which is exactly why a leading that reads
   fine in source has to be checked against rendered boxes. */
const MOBLEAD = 22;

const usd = v => "$" + Math.round(v).toLocaleString("en-US");
/* Round at the unit, not after dividing: (2650000 / 1e6).toFixed(1) prints "$2.6M"
   because 2.65 has no exact binary form. The house published an award a hundred thousand
   dollars light that way once. */
const short = v => v >= 1e6 ? "$" + (Math.round(v / 1e5) / 10).toFixed(1) + "M"
                 : v ? "$" + Math.round(v / 1e3) + "K" : "$0";
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const pct1 = v => v.toFixed(1) + "%";
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August",
               "September", "October", "November", "December"];
const longDate = iso => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTH[m - 1]} ${y}`;
};

const A = D.attribution, S = D.staging, C = D.coalition, P = D.promises,
      R = D.reconcile, N = D.negative, X = D.context;

/* ---------------------------------------------------------------- the second lock
   S.disbursed is the payment figure for the WHOLE $85,335,784 and there is none: the state
   grant publishes no drawdown and one federal award has no USAspending record at all. What
   there is, and what this page drew as an absence until 2026-09-01, is S.outlays: the
   federal lines that do publish one. So the lock now has two halves. No whole-total figure,
   ever; and no outlay total unless it reconciles to the register it claims to sum. */
if (S.disbursed !== null || S.disbursed === 0)
  throw new Error("the disbursement stage arrived carrying a value for the award TOTAL; "
                  + "this page must never render one, including a zero");
if (!S.outlays || !(S.outlays.paid > 0) || !(S.outlays.base > 0)
    || S.outlays.paid >= S.outlays.base || S.outlays.base >= A.stages[1].amount)
  throw new Error("the federal outlay block is missing or does not sit inside the award "
                  + "total it is a part of");
if (N.vault_rows.some(r => r.current || r.sub))
  throw new Error("a board row awaiting a private register arrived carrying a figure");

/* ------------------------------------------------ the stat row, below the lead figure
   Three findings, no apparatus stat, and the accent goes on the attribution figure
   because the subtraction is the page's single point. The host div lives in band A,
   under the attribution chart's source line rather than in the hero: three numbers on a
   dark slab where the chart should be is the composition page-design names outright, and
   moving them here is the trade it prescribes. They read as the chart's summary now. */
figures([
  ["key", usd(A.stages[3].amount), "on award lines naming the Greater Akron Chamber",
   `${pct1(A.share_of_awarded * 100)} of ${usd(S.awarded)} awarded`],
  ["", String(P.rows.length), "dated commitments on the public record",
   `${P.by_type.numeric_outcome} carries a numeric outcome target`],
  ["", `${N.counts.vault} of ${N.counts.accountable}`,
   "rows PIC answers for that no public record can fill",
   `and ${N.counts.owners_assigned === 0 ? "no row" : N.counts.owners_assigned + " rows"} `
   + "on the board names an owner"],
]);

/* ============================================================ A. the attribution stages
   Each row draws the PREVIOUS stage in pale behind the current one, and labels what fell
   away between them. That is the whole argument, drawn rather than described. */
const STG = A.stages;
const MAXA = STG[0].amount;
/* Label strings for what falls away between one stage and the next. Editorial text, hand
   authored; the amounts beside them are differences computed from the stages themselves,
   never typed. */
const DROP = ["", "match and cost share, promised by others", "with no recipient named yet",
              "obligated to other named recipients"];

function attribRow(g, i, geo, opts) {
  const {xs, rowH, m} = geo;
  const s = STG[i], prev = i ? STG[i - 1] : null;
  const y = m.t + i * rowH;
  const barY = y + opts.barTop, bh = opts.bh;
  if (prev)
    el("rect", {x: m.l, y: barY, width: xs(prev.amount) - m.l, height: bh,
      fill: "#E7E2D8", rx: 3}, g);
  el("rect", {x: m.l, y: barY, width: Math.max(3, xs(s.amount) - m.l), height: bh,
    fill: INK, rx: 3}, g);
  return {s, prev, y, barY, bh};
}

function attribDesktop() {
  /* Row geometry: label baseline, sub baseline 18 below it, bar 8 below that. The first
     version set the two label lines 12 apart and collide.mjs found nine text-over-text
     overlaps at 14.2px and 13.6px, which is what 12 units of leading buys. Leading is not
     a style choice here; it is the difference between a legible chart and a failing gate. */
  /* THE RIGHT MARGIN IS MEASURED AGAINST THE LONGEST DROP LABEL, NOT THE VALUE LABELS.
     It was typed at 156, which comfortably holds a value like "$85,335,784" at about 97
     units. But the drop annotation is drawn from the SAME x one line below, and
     "match and cost share, promised by others" with its amount paints 358 units: the row
     ran to 1130.9 in an 1100-unit box, 31 units past the edge at every desktop width.
     overflow:visible meant it painted into the page margin rather than being clipped, so
     it read as a ragged right edge and no gate saw it. collide.mjs measures ink against
     the page COLUMN, and 27px of overhang lands inside the 32px gutter.

     Clamping the label the way frame() clamps an axis title is wrong here: pulling it 31
     units left starts it at 740, inside the bar end at 761. Wrapping is wrong too, since
     the drop line sits 36 below the bar top and the next row's label is only 25 further
     down. What is actually too small is the margin, so the margin is computed: widen
     until the worst row fits, measuring the real strings. */
  const rowH = 86, W = 1100;
  const m = {t: 80, r: 156, b: 40, l: 16};
  {
    const probe = chart("attrib", {W, H: 200, m});
    const measure = (str, cls) => {
      const t = txt(probe.svg, str, {x: 0, y: 0, class: cls, opacity: 0});
      const len = t.getComputedTextLength();
      probe.svg.removeChild(t);
      return len;
    };
    const need = STG.map((st, i) => {
      const frac = st.amount / MAXA;
      const label = i && DROP[i]
        ? measure(`−${usd(STG[i - 1].amount - st.amount)} ${DROP[i]}`, "pv-labq")
        : measure(usd(st.amount), "pv-lab");
      /* right edge = m.l + frac*(W - m.l - r) + 12 + label  must clear W - 2 */
      return {frac, label};
    });
    let r = m.r;
    for (let i = 0; i < 40; i++) {
      const worst = Math.max(...need.map(q =>
        m.l + q.frac * (W - m.l - r) + 12 + q.label));
      if (worst <= W - 2) break;
      r += Math.ceil(worst - (W - 2));
    }
    m.r = r;
  }
  const H = m.t + STG.length * rowH + 34 + 86 + m.b;
  const {svg, w} = chart("attrib", {W, H, m});
  const xs = v => m.l + (v / MAXA) * w;
  const geo = {xs, rowH, m};

  /* The mechanism sentence goes ON the chart, verbatim from the award register's own
     source note, because it is what stops the last bar from being read as a verdict on
     PIC rather than a description of how EDA obligates money. A footnote would not do
     that work: a reader who screenshots this figure gets the sentence with it. */
  const mech = A.mechanism.split(". ");
  txt(svg, mech[0] + ".", {x: m.l, y: 22, class: "pv-lab"});
  txt(svg, mech.slice(1).join(". "), {x: m.l, y: 42, class: "pv-labq"});

  STG.forEach((_, i) => {
    const {s, prev, y, barY} = attribRow(svg, i, geo, {barTop: 38, bh: 26});
    txt(svg, s.label, {x: m.l, y: y + 13, class: "pv-lab"});
    txt(svg, s.sub, {x: m.l, y: y + 31, class: "pv-labq"});
    txt(svg, usd(s.amount), {x: xs(s.amount) + 12, y: barY + 18, class: "pv-lab"});
    /* What fell away, set UNDER the value rather than at the pale bar's right end. The
       first version put it there and collide.mjs caught "$79,170,176" running through
       "−$6,165,608": two labels chasing two bar ends that are 55 units apart. */
    if (prev)
      txt(svg, `−${usd(prev.amount - s.amount)} ${DROP[i]}`,
        {x: xs(s.amount) + 12, y: barY + 36, class: "pv-labq"});
  });

  /* The share is written on the chart, on the value line of the bar it describes, because
     the headline prints it and a reader should not have to carry it down from the hero.
     On its own line below, it ran through the "−$75,020,661 obligated to other named
     recipients" label; beside the value there is nothing to collide with. */
  const last = m.t + 3 * rowH;
  txt(svg, `${pct1(A.share_of_awarded * 100)} of the ${usd(S.awarded)} awarded`,
    {x: xs(STG[3].amount) + 118, y: last + 56, class: "pv-labq", fill: "#8C4325"});

  /* The detached match bar. A gap, a rule, its own label, and never a segment of the
     staged total above it. */
  const my = m.t + STG.length * rowH + 30;
  el("line", {x1: m.l, y1: my - 14, x2: m.l + w, y2: my - 14,
    stroke: "var(--pv-axis)", "stroke-width": 1, "stroke-dasharray": "3 4"}, svg);
  txt(svg, A.match.label, {x: m.l, y: my + 15, class: "pv-lab"});
  txt(svg, A.match.sub, {x: m.l, y: my + 33, class: "pv-labq"});
  el("rect", {x: m.l, y: my + 40, width: xs(A.match.amount) - m.l, height: 26,
    fill: "none", stroke: GRAY, "stroke-width": 1.5, "stroke-dasharray": "5 4", rx: 3},
    svg);
  txt(svg, usd(A.match.amount), {x: xs(A.match.amount) + 12, y: my + 58,
    class: "pv-labq"});

  STG.forEach((s, i) => {
    hoverable(el("rect", {x: 0, y: m.t + i * rowH, width: W, height: rowH,
      fill: "transparent"}, svg),
      `<b>${esc(s.label)}</b><br><span class="v">${usd(s.amount)}</span><br>${esc(s.sub)}`,
      `${s.label}: ${usd(s.amount)}`);
  });
}

function attribMobile() {
  /* The mechanism note rides on the phone canvas too, but as sentences 1 and 3 of the
     register's note, both verbatim. Sentence 2 ("The Greater Akron Chamber is one recipient
     among seven, for innovation governance") is 81 characters and does not fit a 375-unit
     canvas on one line; the last bar's own label already says the Chamber is the recipient,
     so dropping it here loses no reading. Nothing is machine-truncated. */

  /* Every pair the sweep flagged on this chart was a stage's label over its own value,
     14 units apart. See MOBLEAD. */
  const LAB = 14;               // label baseline, from the row top
  const VAL = LAB + MOBLEAD;    // its value, one line below
  const BARTOP = VAL + 8;       // bar top, below the value's descenders

  const m = {t: 66, r: 12, b: 22, l: 12}, rowH = 84, W = 375;
  const H = m.t + STG.length * rowH + 40 + 82 + m.b;
  const {svg, w} = chart("attrib", {W, H, m});
  const xs = v => m.l + (v / MAXA) * w;
  const geo = {xs, rowH, m};
  const mechM = A.mechanism.split(". ");
  txt(svg, mechM[0] + ".", {x: m.l, y: 20, class: "pv-lab"});
  txt(svg, mechM[2], {x: m.l, y: 20 + MOBLEAD, class: "pv-labq"});
  STG.forEach((_, i) => {
    const {s, prev, y, barY} = attribRow(svg, i, geo, {barTop: BARTOP, bh: 16});
    txt(svg, s.label, {x: m.l, y: y + LAB, class: "pv-lab"});
    txt(svg, usd(s.amount) + (prev ? `, down ${short(prev.amount - s.amount)}` : ""),
      {x: m.l, y: y + VAL, class: "pv-labq"});
    if (i === 3)
      txt(svg, `${pct1(A.share_of_awarded * 100)} of the awards`,
        {x: m.l, y: barY + 36, class: "pv-labq", fill: "#8C4325"});
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, svg),
      `<b>${esc(s.label)}</b><br><span class="v">${usd(s.amount)}</span>`,
      `${s.label}: ${usd(s.amount)}`);
  });
  const my = m.t + STG.length * rowH + 22;
  el("line", {x1: m.l, y1: my - 14, x2: m.l + w, y2: my - 14,
    stroke: "var(--pv-axis)", "stroke-width": 1, "stroke-dasharray": "3 4"}, svg);
  txt(svg, A.match.label, {x: m.l, y: my + 12, class: "pv-lab"});
  txt(svg, usd(A.match.amount) + ", not part of the total above",
    {x: m.l, y: my + 12 + MOBLEAD, class: "pv-labq"});
  el("rect", {x: m.l, y: my + 12 + MOBLEAD + 8, width: xs(A.match.amount) - m.l, height: 16,
    fill: "none", stroke: GRAY, "stroke-width": 1.5, "stroke-dasharray": "5 4", rx: 3},
    svg);
}

(MOBILE.matches ? attribMobile : attribDesktop)();

document.getElementById("attribtable").innerHTML = tableView("attrib",
  "Each stage of the award total, what falls away between one stage and the next, and the "
  + "match, which is drawn detached because it is a promise made by other organisations.",
  ["Stage", "Amount", "Falls away before the next stage"],
  STG.map((s, i) => [s.label, usd(s.amount),
    i + 1 < STG.length ? usd(s.amount - STG[i + 1].amount) : "nothing below this stage"])
    .concat([[A.match.label, usd(A.match.amount), "never enters the stages above"]]));

/* Source line, held to the caveat-ink budget: one source clause and one limitation
   sentence. The mechanism sentence used to live here and now rides on the chart, where
   the spec puts it and where a screenshot carries it. */
document.getElementById("attribsrc").innerHTML =
  `PIC award register as of ${D.as_of}, verified against signed federal Notices of Award `
  + `and state grant SBIG20251005. <b>${esc(X.defects[0].text)}</b>`;

/* ================================================================ B. awarded to disbursed
   Three stages of one total. The third carries no value, and the two named gaps and the
   programme-aggregate share are annotations on the chart rather than tooltips. */
const AGG = S.aggregates;

function hatch(svg, id) {
  const defs = el("defs", {}, svg);
  const p = el("pattern", {id, width: 7, height: 7, patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)"}, defs);
  el("rect", {width: 7, height: 7, fill: "#DCE9EB"}, p);
  el("line", {x1: 0, y1: 0, x2: 0, y2: 7, stroke: "#7FA8B0", "stroke-width": 2.4}, p);
}

function stageDesktop() {
  /* 18 units of leading between the two label lines, and both annotation lines below the
     bar rather than above it. Twelve units of leading is what collide.mjs reported as
     "Awarded" over "the three public awards". */
  const m = {t: 30, r: 168, b: 30, l: 16}, rowH = 136, W = 1100;
  const H = m.t + 3 * rowH + m.b;
  const {svg, w} = chart("stage", {W, H, m});
  hatch(svg, "agghatch");
  const xs = v => m.l + (v / S.awarded) * w;

  // 1. awarded
  let y = m.t;
  txt(svg, "Awarded", {x: m.l, y: y + 13, class: "pv-lab"});
  txt(svg, "the three public awards", {x: m.l, y: y + 31, class: "pv-labq"});
  el("rect", {x: m.l, y: y + 38, width: w, height: 28, fill: INK, rx: 3}, svg);
  txt(svg, usd(S.awarded), {x: m.l + w + 12, y: y + 57, class: "pv-lab"});

  // 2. assigned, with the programme-aggregate portion hatched inside it
  y = m.t + rowH;
  txt(svg, "On an executed line naming a recipient", {x: m.l, y: y + 13, class: "pv-lab"});
  txt(svg, `${pct1(S.share_assigned)} of the awards`, {x: m.l, y: y + 31,
    class: "pv-labq"});
  el("rect", {x: m.l, y: y + 38, width: xs(S.assigned) - m.l, height: 28, fill: INK,
    rx: 3}, svg);
  /* The hatched programme-aggregate portion sits at the LEFT end of the assigned bar,
     away from the dashed unassigned outline at its right end. Drawn adjacent to that
     outline, two different kinds of qualification read as one region. */
  const aggW = (AGG.total / S.awarded) * w;
  el("rect", {x: m.l, y: y + 38, width: aggW, height: 28,
    fill: "url(#agghatch)", rx: 3}, svg);
  el("rect", {x: xs(S.assigned), y: y + 38, width: m.l + w - xs(S.assigned), height: 28,
    fill: "none", stroke: GRAY, "stroke-width": 1, "stroke-dasharray": "4 3", rx: 3}, svg);
  txt(svg, usd(S.assigned), {x: m.l + w + 12, y: y + 57, class: "pv-lab"});
  txt(svg, `${usd(S.unassigned)} not yet`, {x: m.l + w + 12, y: y + 75,
    class: "pv-labq"});
  txt(svg, `Hatched: ${pct1(AGG.share_of_assigned)} of this bar names a building and a `
    + `programme rather than a company.`,
    {x: m.l, y: y + 84, class: "pv-labq", fill: "#3A6A72"});
  txt(svg, "Dashed: " + S.gaps.map(g => `${g.name} holds ${short(g.gap)}`).join(", ")
    + ", both inside the state grant.",
    {x: m.l, y: y + 102, class: "pv-labq"});

  /* 3. paid out: the federal lines carry an outlay and are drawn solid; the dashed
        outline behind them is the rest of the total, which publishes no drawdown figure
        and is therefore an absence rather than a zero. Until 2026-09-01 the whole stage
        was that outline and the page said the record never shows payment. It does. */
  y = m.t + 2 * rowH;
  const OL = S.outlays;
  txt(svg, "Paid out to recipients", {x: m.l, y: y + 13, class: "pv-lab"});
  txt(svg, "published for the federal lines only", {x: m.l, y: y + 31, class: "pv-labq"});
  el("rect", {x: m.l, y: y + 38, width: w, height: 28, fill: "none", stroke: "#9A9284",
    "stroke-width": 2, "stroke-dasharray": "7 5", rx: 3}, svg);
  el("rect", {x: m.l, y: y + 38, width: Math.max(3, xs(OL.paid) - m.l), height: 28,
    fill: INK, rx: 3}, svg);
  txt(svg, usd(OL.paid), {x: m.l + w + 12, y: y + 57, class: "pv-lab"});
  txt(svg, `${pct1(OL.share)} of the federal lines`, {x: m.l + w + 12, y: y + 75,
    class: "pv-labq"});
  txt(svg, `Solid: what the federal record says has been paid against ${usd(OL.base)} on `
    + `${OL.lines} federal award lines.`, {x: m.l, y: y + 88, class: "pv-labq"});
  txt(svg, `Dashed: ${S.disbursed_label}. The state grant and one federal award publish `
    + `no drawdown, so the remainder is unknown and not zero.`,
    {x: m.l, y: y + 106, class: "pv-labq"});
}

function stageMobile() {
  /* Baselines step by MOBLEAD throughout — label, value, and the annotation stack under
     the middle stage. It was authored at 15 between a label and its value and 16 between
     the two gap lines, and all five pairs printed on each other.
     THE THREE STAGES FLOW; THEY DO NOT SIT ON A UNIFORM ROW PITCH. A fixed rowH has to be
     tall enough for the middle stage, which carries a four-line annotation stack the other
     two do not, so it buys that clearance by stranding the first stage above 75 units of
     nothing — and once the leading grew, the pitch that fit at 15 no longer fit at 22 and
     the last gap line ran into the third stage's label. A cursor advanced past each
     stage's own last ink gives every stage the same measured air, BLOCK, and makes the
     canvas as tall as its content instead of three times its worst row. */
  const m = {t: 22, r: 12, b: 20, l: 12}, W = 375;
  const LAB = 13;      // first label baseline, below the top margin
  const BAR = MOBLEAD + 8, BARH = 18;   // bar top below the label baseline, and its height
  const BLOCK = 46;    // white between one stage's last ink and the next stage's label
  /* A nominal height to open the canvas with; the last line of this function sets the
     real one from where the cursor actually finished. Nothing here measures text, so the
     interim value only has to exist. */
  const {svg, w} = chart("stage", {W, H: 400, m});
  hatch(svg, "agghatch");
  const xs = v => m.l + (v / S.awarded) * w;

  let b = m.t + LAB;                       // baseline of the stage label being drawn
  txt(svg, "Awarded", {x: m.l, y: b, class: "pv-lab"});
  txt(svg, usd(S.awarded), {x: m.l, y: b + MOBLEAD, class: "pv-labq"});
  el("rect", {x: m.l, y: b + BAR, width: w, height: BARH, fill: INK, rx: 3}, svg);

  b += BAR + BARH + BLOCK;
  txt(svg, "On a line naming a recipient", {x: m.l, y: b, class: "pv-lab"});
  txt(svg, `${usd(S.assigned)}, ${pct1(S.share_assigned)}`, {x: m.l, y: b + MOBLEAD,
    class: "pv-labq"});
  const barY = b + BAR;
  el("rect", {x: m.l, y: barY, width: xs(S.assigned) - m.l, height: BARH, fill: INK,
    rx: 3}, svg);
  const aggW = (AGG.total / S.awarded) * w;
  el("rect", {x: m.l, y: barY, width: aggW, height: BARH,
    fill: "url(#agghatch)", rx: 3}, svg);
  const note = barY + BARH + 20;   // first annotation, clear of the bar's underside
  txt(svg, `hatched: ${pct1(AGG.share_of_assigned)} names a building and a programme`,
    {x: m.l, y: note, class: "pv-labq"});
  /* The two named gaps belong on the chart at every width, not only on the desktop one.
     One per line on a 375-unit canvas: both on one line renders 403 units wide and puts
     the whole page into horizontal scroll. */
  txt(svg, "dashed, both inside the state grant:",
    {x: m.l, y: note + MOBLEAD, class: "pv-labq"});
  S.gaps.forEach((g, i) =>
    txt(svg, `${g.name} ${short(g.gap)}`,
      {x: m.l + 10, y: note + MOBLEAD * (2 + i), class: "pv-labq"}));

  b = note + MOBLEAD * (1 + S.gaps.length) + BLOCK;
  const OL = S.outlays;
  txt(svg, "Paid out to recipients", {x: m.l, y: b, class: "pv-lab"});
  txt(svg, `${usd(OL.paid)}, ${pct1(OL.share)} of the federal lines`,
    {x: m.l, y: b + MOBLEAD, class: "pv-labq"});
  const outY = b + BAR;
  el("rect", {x: m.l, y: outY, width: w, height: 22, fill: "none", stroke: "#9A9284",
    "stroke-width": 2, "stroke-dasharray": "7 5", rx: 3}, svg);
  el("rect", {x: m.l, y: outY, width: Math.max(3, xs(OL.paid) - m.l), height: 22,
    fill: INK, rx: 3}, svg);
  txt(svg, `dashed: ${S.disbursed_label}`,
    {x: m.l, y: outY + 22 + 18, class: "pv-labq"});
  svg.setAttribute("viewBox", `0 0 ${W} ${outY + 22 + 18 + m.b}`);
}

(MOBILE.matches ? stageMobile : stageDesktop)();

document.getElementById("stagetable").innerHTML = tableView("stage",
  "Each public award, the dollars assigned to a named recipient, and the balance with no "
  + "recipient named yet. The last row is the federal payment record and is on a "
  + "different base: the seven federal award lines that publish an outlay, not the "
  + "three awards above it.",
  ["Award", "Awarded", "Named recipient", "Not yet named", "Share named"],
  S.sources.map(s => [s.name, usd(s.award), usd(s.assigned),
    s.unassigned ? usd(s.unassigned) : "none", pct1(s.pct)])
    .concat([["Paid out (federal lines)", usd(S.outlays.base), usd(S.outlays.paid),
              "not published", pct1(S.outlays.share)]]));

document.getElementById("stagesrc").innerHTML =
  `PIC award register and internal scorecard delivery rows as of ${D.as_of}. `
  + `Payments from ${esc(S.outlays.source)}, read ${longDate(S.outlays.as_of)}; `
  + `${esc(S.outlays.no_record.name)}&rsquo;s ${usd(S.outlays.no_record.amount)} award `
  + `has no record there and the ${usd(S.outlays.not_federal.amount)} state grant is not `
  + `a federal award, so neither is in the payment figure. `
  + `The two named gaps come from the register&rsquo;s own reconciliation note. `
  + `<b>${esc(D.meta.caution)}</b>`;

/* ============================================================== C. the coalition register
   One sortable table. The default order is amount descending and the claims file guards
   that state; re-sorting is a reader's verification move and changes no number. */
const KINDS = [["firm", "Company"], ["university", "University"],
               ["administrator", "Administrator"],
               ["program_aggregate", "Programme aggregate"]];
document.getElementById("coallegend").innerHTML = KINDS
  .filter(([k]) => C.rows.some(r => r.kind === k))
  .map(([k, label]) => `<span><i class="k-${k}"></i>${label}</span>`).join("");

const COLS = [
  {key: "recipient", label: "Recipient", sort: r => r.recipient.toLowerCase()},
  {key: "role", label: "Role", sort: r => r.role},
  {key: "funds", label: "What it funds", sort: r => r.funds.toLowerCase()},
  {key: "amount", label: "Amount", num: true, sort: r => r.amount},
  {key: "award_id", label: "Award ID", sort: r => r.award_id || "zzz"},
];
let sortKey = "amount", sortDir = -1;

function ruleRow() {
  return `<tr class="rule"><th colspan="5" scope="row">
    The $${(1e6).toLocaleString("en-US")} rule
    <span>${C.above.n} lines above it hold ${usd(C.above.sum)},
      ${pct1(C.above.share)} of every assigned dollar.
      The ${C.below.n} below it hold ${usd(C.below.sum)}, ${pct1(C.below.share)}.</span>
  </th></tr>`;
}

function bodyRows() {
  const col = COLS.find(c => c.key === sortKey);
  const rows = C.rows.slice().sort((a, b) => {
    const x = col.sort(a), y = col.sort(b);
    return (x < y ? -1 : x > y ? 1 : 0) * sortDir;
  });
  const defaultOrder = sortKey === "amount" && sortDir === -1;
  return rows.map((r, i) => {
    const rule = defaultOrder && i === C.above.n ? ruleRow() : "";
    return rule + `<tr class="k-${r.kind}">
      <th scope="row" data-l="Recipient">${esc(r.recipient)}
        <span class="sub">${esc(r.kind_label)}${r.also_known_as
          ? " &middot; " + esc(r.also_known_as) : ""}</span></th>
      <td data-l="Role">${esc(r.role)}<span class="sub">${esc(r.program)}</span></td>
      <td data-l="What it funds">${esc(r.funds)}</td>
      <td class="num" data-l="Amount">${usd(r.amount)}</td>
      <td data-l="Award ID">${r.award_id ? esc(r.award_id)
        : `<span class="notstated">no separate award number</span>`}</td>
    </tr>`;
  }).join("");
}

function drawCoalition() {
  document.getElementById("coalition").innerHTML = `
    <table class="lg">
      <caption><b>This table lists recipients of award money.</b> PIC&rsquo;s membership
        register is separate, is not published, and does not decide who appears here: PIC
        has members who receive nothing in this table, and recipients here who are not
        members. ${C.lines} executed lines, ${C.recipients} recipients,
        ${C.award_ids} award IDs, register as of ${D.as_of}.</caption>
      <thead><tr>${COLS.map(c =>
        `<th scope="col" class="${c.num ? "num" : ""}"${
          c.key === sortKey ? ` aria-sort="${sortDir === -1 ? "descending" : "ascending"}"`
                            : ""}>
          <button type="button" data-k="${c.key}">${c.label}</button></th>`).join("")}
      </tr></thead>
      <tbody>${bodyRows()}</tbody>
    </table>`;
  document.querySelectorAll("#coalition thead button").forEach(b =>
    b.addEventListener("click", () => {
      const k = b.dataset.k;
      if (k === sortKey) sortDir = -sortDir;
      else { sortKey = k; sortDir = k === "amount" ? -1 : 1; }
      drawCoalition();
    }));
}
drawCoalition();

document.getElementById("coalsrc").innerHTML =
  `PIC award register as of ${D.as_of}: signed federal Notices of Award, executed state `
  + `grant agreement SBIG20251005, and executed sub-grant agreements. Sorted by amount, `
  + `largest first, which is the order the $1,000,000 rule is drawn in; sorting by any `
  + `other column hides the rule and changes no figure. <b>Two rows name a programme or a `
  + `building rather than an organisation, and together they hold ${usd(AGG.total)}, `
  + `${pct1(AGG.share_of_assigned)} of everything assigned.</b>`;

/* ================================================================= D. the promise register
   The calibration statistic first, because a tracker that shows a keeping rate before it
   has commitments to keep is the silent pass this page exists to argue against. */
const CAL = P.calibration;
document.getElementById("calib").innerHTML = `
  <p class="c-k">Date-keeping, the accuracy statistic this register reports on itself</p>
  <p class="c-n">n = ${CAL.n}</p>
  <p class="c-t">${CAL.n === 0
    ? `The record of published dates opens on the day this page ships. No commitment has
       resolved against it yet, so n is zero and this page reports no keeping rate.`
    : `${CAL.kept} of ${CAL.n} resolved commitments landed on the date first published.`}</p>
  <p class="c-d">The statistic is ${esc(CAL.statistic)}.
    ${CAL.rate === null
      ? `No rate renders until ${CAL.floor} commitments have resolved. A tracker showing
         100 percent on a sample of two is a number a sceptical reader discounts faster
         than the page discounts it. <b>The floor of ${CAL.floor} is a stated default,
         not a decision: Open Question 4 in this page&rsquo;s README is unanswered.</b>`
      : `Keeping rate ${pct1(CAL.rate * 100)}, computed from resolved rows only.`}</p>`;

/* The swimlane. One mark per commitment on a date axis, PIC-owned above and partner-owned
   below, with the status encoding inherited from the public event register: a hollow ring
   with a centre pip is scheduled, a solid disc is delivered. Adding `moved` and `missed`
   now, before any row needs them, keeps the first slip from being a schema change in the
   week it happens. */
const STATUS = {
  scheduled: {fill: "none", stroke: INK, pip: true, word: "scheduled"},
  delivered: {fill: INK, stroke: INK, pip: false, word: "delivered"},
  moved: {fill: "#F3EFE0", stroke: "#B08A3C", pip: true, word: "moved"},
  missed: {fill: "#F6E9E4", stroke: "#9A4A2E", pip: true, word: "missed"},
};
const days = iso => Date.parse(iso + "T00:00:00Z") / 86400000;
const T0 = Math.min(...P.rows.map(r => days(r.current_date)));
const T1 = Math.max(...P.rows.map(r => days(r.current_date)));

function mark(g, cx, cy, st, r) {
  const s = STATUS[st] || STATUS.scheduled;
  el("circle", {cx, cy, r, fill: s.fill === "none" ? "#FFFFFF" : s.fill,
    stroke: s.stroke, "stroke-width": 2.2}, g);
  if (s.pip) el("circle", {cx, cy, r: 1.8, fill: s.stroke}, g);
}

function swimlane(W, mob) {
  const m = mob ? {t: 46, r: 14, b: 54, l: 14} : {t: 62, r: 40, b: 66, l: 40};
  const LEAD = mob ? MOBLEAD : 20;
  const H = mob ? 286 : 348;
  const {svg, w, h} = chart("swim", {W, H, m});
  const xs = d => m.l + ((days(d) - T0) / (T1 - T0 || 1)) * w;
  const axisY = m.t + h / 2;
  el("line", {x1: m.l, y1: axisY, x2: m.l + w, y2: axisY, stroke: "var(--pv-axis)",
    "stroke-width": 1}, svg);

  const yearStarts = [];
  for (let y = 2026; y <= 2030; y++) {
    const iso = `${y}-01-01`;
    if (days(iso) >= T0 && days(iso) <= T1) yearStarts.push(iso);
  }
  yearStarts.forEach(iso => {
    el("line", {x1: xs(iso), y1: m.t, x2: xs(iso), y2: m.t + h, stroke: "var(--pv-grid)",
      "stroke-width": 1}, svg);
  });

  /* THE ORIGIN LABEL AND THE YEAR TICKS SHARE ONE BASELINE, and on the narrow canvas the
     first year cannot clear the origin: the register opens 15 August 2026 and 2027 begins
     139 days later, 11.6 percent into a 1,203-day window, which puts "2027" 40 units from
     the start of "Aug 2026" on a 347-unit axis. Whether they clear is a question about
     rendered string lengths against an x that comes from the DATA, so it is measured, not
     guessed at a breakpoint: the origin's own rendered width is compared with each year's,
     and a year that will not clear drops to a second row DIRECTLY UNDER ITS OWN GRIDLINE,
     where it still labels the thing it labels. Nothing is dropped and nothing moves away
     from its mark. On the 1,020-unit desktop axis the same comparison passes at every
     width and all four labels stay on one row, so the canvas keeps its authored height. */
  const tickY = m.t + h + 20;
  const first = P.rows[0].current_date.split("-");
  const org = txt(svg, `${MONTH[+first[1] - 1].slice(0, 3)} ${first[0]}`,
    {x: m.l, y: tickY, class: "pv-tick"});
  const orgRight = m.l + org.getComputedTextLength();
  let staggered = false;
  yearStarts.forEach(iso => {
    const t = txt(svg, iso.slice(0, 4), {x: xs(iso), y: tickY, "text-anchor": "middle",
      class: "pv-tick"});
    if (xs(iso) - t.getComputedTextLength() / 2 < orgRight + 8) {
      t.setAttribute("y", tickY + LEAD);
      staggered = true;
    }
  });
  /* The second row is only paid for when it is used, and it is the viewBox that grows:
     h, the axis and every mark are already placed off the authored height. */
  const drop = staggered ? LEAD : 0;
  if (drop) svg.setAttribute("viewBox", `0 0 ${W} ${H + drop}`);

  const noteY = m.t - (mob ? 6 : 10);
  txt(svg, `PIC-owned ↑ ${P.by_owner.pic} commitments`,
    {x: m.l, y: noteY - LEAD, class: "pv-lab"});
  txt(svg, `Partner-owned ↓ ${P.by_owner.partner} commitments`,
    {x: m.l, y: m.t + h + (mob ? 40 : 46) + drop, class: "pv-lab"});

  /* Marks last, after every rule, so nothing is drawn over them. Rows sharing a date are
     stacked away from the axis rather than overplotted; six commitments share
     22 October 2026 and one dot would have hidden five of them. */
  const seen = {};
  P.rows.forEach(r => {
    const up = r.owner_class === "pic";
    const k = r.current_date + (up ? "u" : "d");
    const n = (seen[k] = (seen[k] || 0) + 1) - 1;
    const cy = axisY + (up ? -1 : 1) * (16 + n * 17);
    mark(svg, xs(r.current_date), cy, r.status, 6.5);
    hoverable(el("circle", {cx: xs(r.current_date), cy, r: 12, fill: "transparent"}, svg),
      `<b>${esc(longDate(r.current_date))}</b><br>${esc(r.commitment)}<br>
       ${esc(r.owner)} &middot; ${(STATUS[r.status] || STATUS.scheduled).word}`,
      `${longDate(r.current_date)}: ${r.commitment}, ${r.owner}`);
  });

  /* Shortened by hand for the narrow canvas rather than machine-truncated: the desktop
     sentence renders 404 units wide inside a 375-unit viewBox and pushes the page into
     horizontal scroll. */
  txt(svg, mob ? `None of the ${P.rows.length} has resolved yet.`
                : `Every mark is a hollow scheduled ring. None has resolved yet.`,
    {x: m.l, y: noteY, class: "pv-labq"});
}

swimlane(MOBILE.matches ? 375 : 1100, MOBILE.matches);

/* The register itself, grouped by owner. A PIC-owned date that moves is PIC's; a partner
   date that moves is the partner's, and the two are never averaged into one record. */
const GROUPS = [
  ["pic", "PIC-owned commitments", "Dates PIC or the Greater Akron Chamber holds."],
  ["partner", "Partner-owned commitments",
   "Dates held by a project lead, a university or a funding agency."],
];
const TAG = {numeric_outcome: ["num", "numeric outcome"],
             milestone: ["", "milestone"], period_end: ["per", "award period end"]};

document.getElementById("register").innerHTML = GROUPS.map(([cls, title, blurb]) => {
  const rows = P.rows.filter(r => r.owner_class === cls);
  return `<div class="rg-grp"><b>${title}</b>
      <span>${rows.length} of ${P.rows.length} &middot; ${esc(blurb)}</span></div>`
    + rows.map(r => {
      const [tcls, tword] = TAG[r.type];
      const st = STATUS[r.status] || STATUS.scheduled;
      return `<div class="rg">
        <div class="rg-d"><i class="${r.status === "delivered" ? "on" : ""}"></i>
          ${esc(r.current_date)}</div>
        <div class="rg-c">${esc(r.commitment)}
          <span class="rg-m">Set by <b>${esc(r.set_by)}</b>, owned by
            ${esc(r.owner)}. Source: ${esc(r.source_document)}.
            ${r.history.length ? `Moved ${r.history.length} time(s) since first published on
              ${esc(r.first_published_date)}.` : ""}</span></div>
        <div class="rg-t"><span class="tag ${tcls}">${tword}</span>
          <span class="read">${st.word}. ${r.reading
            ? esc(r.reading) : "No reading: " + esc(r.no_reading_because) + "."}</span></div>
      </div>`;
    }).join("");
}).join("");

const G = P.unsourced_goal, GC = P.goal_context;
document.getElementById("goalrow").innerHTML = `
  <p class="g-k">Stated goal, outside the register</p>
  <p class="g-t">${esc(G.commitment)}</p>
  <p class="g-b">${esc(G.why_uncited)} ${esc(G.counted_in_rows_reason)}</p>
  <p class="g-b">For scale, and with no chart: BLS counted ${GC.establishments}
    ${esc(GC.label.toLowerCase().replace(" &", " and"))} establishments across the
    ${GC.counties} PIC counties in
    ${GC.year}, with ${GC.suppressed === 0 ? "no county withheld" :
      GC.suppressed + " counties withheld"}. A goal of 150 is roughly two in five of that
    count, and an establishment is a site rather than a company.
    <a href="../location-quotient/">The concentration page</a> carries that series.</p>
  <span class="g-cell">Current reading: ${esc(G.reading)}</span>`;

document.getElementById("promisesrc").innerHTML =
  `Public event register as of ${D.as_of}, forward events only, seeded once into `
  + `<span class="mono">accountability/data/promises.json</span> on `
  + `${esc(P.opened_on)} and append-only from that date. ${esc(P.rule)} `
  + `<b>${esc(D.meta.excludes)}</b>`;

/* ==================================================== E. three published counts, reconciled
   A table, not a funnel. The last column reads "not stated" wherever no shipped document
   says what a figure counted, which at this version is four of the five rows. */
const UNSTATED = R.rows.filter(r => !r.counted).length;
document.getElementById("figreconcile").textContent =
  `${R.rows.length} published figures for one programme, and ${UNSTATED} of them do not `
  + `say what they counted`;

document.getElementById("reconcile").innerHTML = `
  <table class="lg">
    <caption>Five published figures describing one R&amp;D competition, with the document
      each came from. ${esc(R.standing_rule)}</caption>
    <thead><tr>
      <th scope="col">The published figure</th>
      <th scope="col">Published</th>
      <th scope="col">Document</th>
      <th scope="col">What it counted</th>
    </tr></thead>
    <tbody>${R.rows.map(r => `<tr>
      <th scope="row" data-l="The published figure">${esc(r.published)}</th>
      <td data-l="Published">${esc(r.display)}</td>
      <td data-l="Document">${esc(r.document)}</td>
      <td data-l="What it counted">${r.counted ? esc(r.counted)
        : `<span class="notstated">not stated</span>`}</td>
    </tr>`).join("")}</tbody>
  </table>`;

document.getElementById("reconcilesrc").innerHTML =
  `Public event register events ${R.events.map(e => e.id).join(", ")} at their recorded `
  + `dates, with each number parsed out of its own title at build time rather than read `
  + `off the page. The award register supplies the executed sub-grant total. `
  + `<b>The two descriptions of award ED25OIE0G0108 differ: the award register says `
  + `&ldquo;${esc(R.apex.funding)}&rdquo; and the public event register adds 400 `
  + `completions. One of the two is incomplete, and this page does not decide which.</b>`;

/* ===================================================================== F. the negative space
   Two generated lists and no chart. List 1 is the board's own target field; list 2 names
   every row this repository cannot fill, grouped, with the date each was defined. */
document.getElementById("targets").innerHTML =
  `<ul class="tgt">${N.targets.map(t => `<li>${esc(t.metric)}
      <b>${esc(t.target)}</b>
      <span>A ceiling fixed by a signed award document, in board group ${t.group}.</span>
    </li>`).join("")}</ul>
   <p class="tgt-none">${N.counts.targets_set} of ${N.counts.rows} board rows carry a
     target and all ${N.counts.targets_set} are the ceilings above.
     ${N.counts.owners_assigned === 0
       ? "No row on that board names an owner."
       : N.counts.owners_assigned + " rows name an owner."}
     Where PIC has set no target, the absence is the finding, and no placeholder stands in
     for it here.</p>`;

const TODAY = new Date(D.generated_on + "T00:00:00Z");
const ageWords = iso => {
  const d = Math.round((TODAY - new Date(iso + "T00:00:00Z")) / 86400000);
  if (d <= 0) return "defined today";
  if (d === 1) return "empty for 1 day";
  return `empty for ${d} days`;
};

document.getElementById("cannot").innerHTML = `
  <table class="lt">
    <thead><tr><th scope="col">Not here</th><th scope="col">Because</th>
      <th scope="col">Would need</th></tr></thead>
    <tbody>${N.list2.map(l => `<tr>
      <th scope="row" data-l="Not here">${esc(l.not_here)}
        <span class="age">Defined ${esc(l.defined_on)} &middot; ${ageWords(l.defined_on)}
          &middot; ${l.permanent_reason
            ? `<span class="perm">permanent</span>` : `will fill ${esc(l.fill_by)}`}</span>
      </th>
      <td data-l="Because">${esc(l.because)}
        <span class="from">From ${esc(l.because_from)}.</span></td>
      <td data-l="Would need">${esc(l.would_need)}
        ${l.permanent_reason ? `<span class="from">${esc(l.permanent_reason)}</span>` : ""}
      </td>
    </tr>`).join("")}</tbody>
  </table>`;

document.getElementById("negsrc").innerHTML =
  `Internal scorecard as of ${D.as_of}: ${N.counts.rows} rows, ${N.counts.accountable} of `
  + `them accountable, ${N.counts.vault} published as defined empty slots. Both lists are `
  + `generated from the published data files that carry each limitation, so neither can go stale `
  + `here. <b>${esc(X.defects[3].text)}</b>`;

/* Generated methodology box, then the closer. No footprint banner: the page is not
   county-scoped as a whole, and the one figure that is names the twelve counties in its
   own cell. */
await PV.methodology({
  page: "accountability",
  meta: D.meta,
  definitions: `Of the ${usd(S.awarded)} awarded across three public awards, `
    + `${usd(S.assigned)} sits on ${C.lines} executed lines naming ${C.recipients} `
    + `recipients, and ${usd(A.stages[3].amount)} of that is on the two lines naming the `
    + `Greater Akron Chamber, ${pct1(A.share_of_awarded * 100)} of the awards. The `
    + `promise register holds ${P.rows.length} dated commitments: `
    + `${P.by_type.numeric_outcome} numeric outcome target, ${P.by_type.milestone} `
    + `milestones and ${P.by_type.period_end} award-period end dates, which are counted `
    + `separately and never together. The board carries ${N.counts.targets_set} targets, `
    + `every one a ceiling fixed by a signed award document.`,
});
})();
