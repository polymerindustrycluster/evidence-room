/* Federal obligations, rebuilt around the comparison the page exists to make.
 *
 * ONE DOLLAR BASIS PER CHART, and on this page it is the same basis everywhere: 2025
 * dollars, the `real` column, computed upstream from BLS CPI-U annual averages. The
 * previous version charted nominal bars under a real hero, so the hero said $98.2M and
 * the bar under it said $87.6M with nothing reconciling them. Nominal survives in the
 * tables and the source lines, which is where a reader goes to tie back to USAspending.
 *
 * TWO SCOPES live in federal.json — polymer-NAICS rows and all-industry county rows —
 * and they are an order of magnitude apart. They are never summed and never share a
 * chart; the county figure appears once, as stated context.
 *
 * THE AWARD comes from techhub.json, cross-referenced by derive_techhub.py out of the
 * funding map's own shipped file. It is a competitive implementation grant and the bars
 * are procurement obligations: different instruments, one unit of account.
 *
 * Annotations are drawn AFTER the bars, always. The old average-line label was drawn
 * first and the FY2019 bar painted over it, leaving "ge $31.1M" on the page.
 */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, INK} = PV;
const D = await PV.data("federal.json");
const A = await PV.data("techhub.json");
/* READER WORDS, NOT REGISTER WORDS. The footprint note used to say the counties this page
   drops are ones "the vault's NEO-14 includes" — a sentence about an internal registry,
   addressed to nobody who reads the page. Rewritten in data/federal.json so the generated
   methodology box and the banner both get the reader's version; which internal list holds
   the wider footprint is a README fact. */
const FP = PV.footprint(D.meta);
const MOBILE = matchMedia("(max-width: 760px)");

/* The counter-accent, darkened. The award rule is the comparison this page exists to make,
   and at CAT[1] weight it converted to a gray a shade off the gridlines: in print or for a
   reader who cannot see the hue, the page's central comparator became chrome. Three pixels
   of a darker tint puts it a full luminance step below the grid (93 vs 224 on the standard
   conversion) so the rule survives without its colour. */
const AWARD = "#A34A08";

const usd = v => "$" + Math.round(v).toLocaleString("en-US");
/* ROUND AT THE UNIT, NOT AFTER DIVIDING. `(2650000 / 1e6).toFixed(1)` printed "$2.6M":
   2.65 has no exact binary form and lands a hair below the midpoint, so toFixed rounds
   down and the smallest of the seven Tech Hub awards was published a hundred thousand
   dollars light. Rounding the integer to the tenth-of-a-million first is exact, and it is
   the same defect class as an axis whose tick labels round-lie. */
const short = v => v >= 1e9 ? "$" + (Math.round(v / 1e8) / 10).toFixed(1) + "B"
                 : v >= 1e6 ? (v % 1e6 ? "$" + (Math.round(v / 1e5) / 10).toFixed(1) + "M"
                                       : "$" + (v / 1e6).toFixed(0) + "M")
                 : v ? "$" + Math.round(v / 1e3) + "k" : "$0";
/* A paper plate behind a label that has to cross a reference line (cost-scissors
   pattern). Marked data-pv-plated so collide.mjs reads the covering as deliberate. */
const plate = (parent, s, x, y, fs = 7.4) => el("rect", {x: x - s.length * fs / 2 - 4,
  y: y - 13, width: s.length * fs + 8, height: 17, fill: "var(--paper)", opacity: .95,
  rx: 2}, parent);
/* The measured variant, for left-anchored labels whose width is not guessable from a
   character count. getComputedTextLength() returns 0 on a detached node, so this runs
   after the text is in the document and moves the plate BEHIND it. */
const plateBehind = (svg, node, pad = 5) => {
  const b = node.getBBox();
  const r = el("rect", {x: b.x - pad, y: b.y - 2, width: b.width + pad * 2,
    height: b.height + 4, fill: "var(--paper)", opacity: .95, rx: 2});
  svg.insertBefore(r, node);
  node.setAttribute("data-pv-plated", "");
  return r;
};

/* ------------------------------------------------------------------ derived facts */
const fys = [...new Set(D.naics.map(r => r.fy))].sort((a, b) => a - b);
/* The open federal year at the time of the pull. Stated here rather than inferred from
   a low bar, because a low bar is also what a quiet year looks like. Guarded by the
   fed-partial-year claim, which fails if the file ever stops ending in this year. */
const PARTIAL = 2026;
const sumBy = (key, pred) => D.naics.filter(pred).reduce((s, r) => s + r[key], 0);
const real = {}, nom = {};
fys.forEach(fy => { real[fy] = sumBy("real", r => r.fy === fy);
                    nom[fy] = sumBy("amount", r => r.fy === fy); });
const totalReal = fys.reduce((s, fy) => s + real[fy], 0);
const totalNom = fys.reduce((s, fy) => s + nom[fy], 0);
const avgReal = totalReal / fys.length;
const avgNom = totalNom / fys.length;
const closed = fys.filter(fy => fy !== PARTIAL);
const avgClosed = closed.reduce((s, fy) => s + real[fy], 0) / closed.length;

const award = A.award;
const years = award / avgReal;                 // the arithmetic the page is built on
const yearsClosed = award / avgClosed;         // the same sum, partial year removed
const clears = fys.filter(fy => real[fy] >= award);
const gap = Math.min(...fys.filter(fy => real[fy] < award).map(fy => award - real[fy]));
const nearFy = fys.find(fy => real[fy] < award && award - real[fy] === gap);
/* THE SUBTRACTION A READER ACTUALLY DOES. The chart labels its bars to the tenth of a
   million, so the eye reads $51.0M against $50.8M and gets $200k while the true distance
   is $245k. Both distances are exact here and printed on the bar they belong to; the
   rounding step that separates them is stated once, in the figure's how-to-read line. */
const over = real[clears[0]] - award;           // how far the one clearing year clears by

const byCode = {};
D.naics.forEach(r => {
  const c = byCode[r.code] = byCode[r.code] ||
    {code: r.code, name: r.name, amount: 0, real: 0, years: new Set()};
  c.amount += r.amount; c.real += r.real; c.years.add(r.fy);
});
const codes = Object.values(byCode).sort((a, b) => b.real - a.real);
const top = codes[0], second = codes[1];
const topTwoShare = (top.real + second.real) / totalReal;
/* THE BAR LABELS DO NOT ADD UP TO THE CARD ABOVE THEM, and they cannot: eight figures
   rounded to the tenth of a million add to $279.2M under a $279.3M total, and two codes
   print the same $23.5M while drawing different lengths. Both are the same rounding, and
   both are stated under the chart rather than left for a reader to find and distrust. */
const dimes = v => Math.round(v / 1e5);          // integer tenths-of-a-million, no FP drift
const codeDimes = codes.reduce((s, c) => s + dimes(c.real), 0);
const tie = codes.find((c, i) => i && dimes(c.real) === dimes(codes[i - 1].real));
/* Hand-shortened bar labels. Census names run to seventy characters and a .slice() would
   truncate mid-word; the table below the chart carries the full names. */
const SHORT = {
  "326299": "Rubber products, all other", "326211": "Tire manufacturing",
  "325510": "Paint and coatings", "326122": "Plastics pipe and fittings",
  "325998": "Chemical products, all other", "325120": "Industrial gases",
  "326220": "Hoses and belting", "325413": "In-vitro diagnostics"
};
const label = c => SHORT[c.code] || c.name;
/* The trough. FY2023 is the lowest year on the chart and the reader's eye goes straight
   to it, so the chart says what the records show: the code that carried the two years
   around it has no row that year. An absent row is a year with no recorded obligation,
   which is not the same as a confirmed zero. */
const trough = fys.reduce((a, b) => real[b] < real[a] ? b : a);
const troughMissing = codes.filter(c => !c.years.has(trough) && c.years.size >= 5)
  .sort((a, b) => b.real - a.real)[0];
const troughWord = troughMissing ? label(troughMissing).split(" ")[0].toLowerCase() : "";

/* The all-industry county total is stated in Band 2's prose rather than injected here.
   It is a caveat that changes how the polymer bars should be read, so it has to survive
   with scripts off; the fed-county-scope claim holds the printed figure to ±$50M. */

/* ------------------------------------------------------------------- hero stat row */
/* THE PAIR HAS TO TRANSLATE ITSELF INSIDE THE ROW. The detail lines used to read "2025
   dollars" and "as awarded", a real-versus-nominal pair the page never translated, so a
   reader met two numbers for the eight-year total, $279.3M and $248.8M, with nothing
   saying which was the bigger or why. "In the dollars of the day" sits one card away from
   "in 2025 dollars" and does the work of the contrast on the first screen; Band 1's
   definition line carries the full reading. The detail line wraps past about thirty
   characters, so the translation goes on the longer-lived card, not the first one.
   "Closed years" was register-speak for years that have finished. */
/* A MAGNITUDE WITHOUT A ROLE IS A NUMBER A READER CANNOT PLACE. The first card used to
   read "a year, on average", which says what the arithmetic is and not what the figure is
   for: it is the yardstick, the money already arriving that the award gets measured
   against, and a reader who does not know that cannot tell whether a bigger one would be
   good news. The third card carries the finished-year average it comes from, because
   "1.4 counting finished years only" asked the reader to trust a ratio whose denominator
   the page never printed. */
PV.figures([
  ["key", short(avgReal), "a year the region already gets",
   `${fys.length}-year average, 2025 dollars`],
  ["", short(award), "the Tech Hub award", `${A.leads.length} awards, as awarded`],
  ["", years.toFixed(1), "routine years to match it",
   `${yearsClosed.toFixed(1)} on ${short(avgClosed)}, finished years`],
  ["", short(totalReal), "eight-year total",
   `${short(totalNom)} in the dollars of the day`]
]);

/* ==================================================== 1. the year bars vs the award */
function drawYears() { MOBILE.matches ? yearsMobile() : yearsDesktop(); }

/* One hatch for the partial year, defined once per render. */
function hatch(svg, id) {
  const defs = el("defs", {}, svg);
  const p = el("pattern", {id, width: 7, height: 7, patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)"}, defs);
  el("rect", {width: 7, height: 7, fill: SEQ[1]}, p);
  el("line", {x1: 0, y1: 0, x2: 0, y2: 7, stroke: SEQ[4], "stroke-width": 3.4}, p);
}

function yearsDesktop() {
  const m = {t: 86, r: 26, b: 66, l: 64}, W = 1100, H = 440;
  const {svg, w, h} = PV.chart("fy", {W, H, m});
  hatch(svg, "fmhatch");
  const maxV = Math.max(award, ...fys.map(fy => real[fy])) * 1.19;
  const bw = w / fys.length;
  const xs = i => m.l + i * bw;
  const ys = v => m.t + h - (v / maxV) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs: i => xs(i) + bw / 2, ys,
    xt: fys.map((_, i) => i), xfmt: i => "FY" + fys[i], yt: ticks(0, maxV, 5),
    /* The axis said "polymer NAICS", a classification acronym the page never expands.
       The scale is money adjusted for inflation, and that is what it now says. */
    yfmt: short, ylab: "Federal money committed, in 2025 dollars"});

  fys.forEach((fy, i) => {
    const v = real[fy], x = xs(i) + 7, bwi = bw - 14, part = fy === PARTIAL;
    el("rect", {x, y: ys(v), width: bwi, height: m.t + h - ys(v),
      fill: part ? "url(#fmhatch)" : SEQ[4], rx: 4}, svg);
    el("rect", {x, y: m.t + h - 5, width: bwi, height: 5,
      fill: part ? SEQ[2] : SEQ[4]}, svg);
  });

  /* ---- reference lines, then labels, then annotations: everything that carries text
     is drawn after every filled mark, which is the fix for the occluded average label
     this page shipped with ---- */
  el("line", {x1: m.l, y1: ys(award), x2: m.l + w, y2: ys(award), stroke: AWARD,
    "stroke-width": 3}, svg);
  el("line", {x1: m.l, y1: ys(avgReal), x2: m.l + w, y2: ys(avgReal), stroke: INK,
    "stroke-width": 1.5, "stroke-dasharray": "5 4"}, svg);

  const REFS = [ys(avgReal), ys(award)];
  fys.forEach((fy, i) => {
    /* LIFT, DON'T PLATE. A plate the width of "$31.8M" left the dashes butting against
       both sides of the digits at the text's own mid-height, so the label read as struck
       through even though nothing overlapped it. A label whose baseline lands within a
       line-width of a reference rule is raised clear above the rule instead, never
       lowered: the FY2019 label already sits above the award line and must stay there. */
    /* THE CROSSING IS DECIDED BY A DIFFERENCE THE CHART CANNOT DRAW. FY2019 clears the
       award rule by $647k, about two pixels on a $60M scale, and FY2021 misses by half
       that. A reader who cannot see it has to take the claim on the caption's word, so
       the two bars nearest the rule carry their exact distance from it in their own
       label — the number goes where the eye already is. */
    const cx = xs(i) + bw / 2;
    const s = short(real[fy]) + (fy === clears[0] ? ` · ${short(over)} over`
      : fy === nearFy ? ` · ${short(gap)} under` : "");
    let ly = ys(real[fy]) - 9;
    const near = REFS.find(r => Math.abs(ly - r) < 16);
    if (near !== undefined) ly = Math.min(ly, near - 13);
    txt(svg, s, {x: cx, y: ly, "text-anchor": "middle", class: "pv-lab"});
  });

  /* A DERIVED NUMBER HAS TO FOLLOW FROM THE NUMBERS PRINTED BESIDE IT. This line read
     "came within $245k of it" above two labels, $51.0M and $50.8M, whose difference is
     $200k — so a reader who checked the page against itself found a contradiction and had
     no way to tell which figure to keep. Both gaps are now exact and sit on the two bars
     as well; the rounding step that hides them is stated once, in the figure's how-to-read
     line, rather than twice here and again on the phone layout. */
  txt(svg, `FY${clears[0]} beat the whole award on its own, by ${short(over)}.`,
    {x: m.l + 4, y: 24, class: "pv-lab"});
  txt(svg, `FY${nearFy} fell ${short(gap)} short of it.`,
    {x: m.l + 4, y: 42, class: "pv-labq"});
  /* A REFERENCE LINE IS LABELLED BY WHAT CROSSING IT MEANS. This label used to read
     "award $51.0M = about 1.5 routine years", which is the arithmetic: it left the reader
     to work out that a bar reaching the rule is one ordinary year worth more than the
     entire award, and most will not. The ratio still leads the page, in the hero card and
     the figure title above the chart; the line itself now carries the reading. */
  txt(svg, `EDA Tech Hub award ${short(award)}. A bar above it is a bigger single year.`,
    {x: m.l + w, y: ys(award) - 9, "text-anchor": "end", class: "pv-lab", fill: AWARD});
  /* Anchored over the two shortest bars, clear of every bar top. Anchoring it at the
     right edge put it inside the FY2025 bar, which is the occlusion this rebuild fixes. */
  txt(svg, `eight-year average ${short(avgReal)} a year`,
    {x: xs(fys.indexOf(trough)) + 10, y: ys(avgReal) - 9, class: "pv-labq", fill: INK});

  if (troughMissing) {
    const tx = xs(fys.indexOf(trough)) + 10;
    txt(svg, `No ${label(troughMissing).toLowerCase()} obligation`,
      {x: tx, y: ys(maxV * 0.484), class: "pv-labq"});
    txt(svg, `appears in FY${trough}.`, {x: tx, y: ys(maxV * 0.428), class: "pv-labq"});
    /* A leader, because the note runs right across the FY2024 column and words were the
       only thing binding it to the FY2023 bar. Vertical on purpose: collide.mjs reads any
       flat mark under 3px tall as an axis, so a horizontal leader would report as a bar
       crossing the axis. */
    el("line", {x1: tx + 2, y1: ys(maxV * 0.428) + 7, x2: tx + 2, y2: ys(real[trough]) - 5,
      stroke: "var(--pv-axis)", "stroke-width": 1.2}, svg);
  }
  /* "partial year" is the register word for a bar that is a running total. The reader
     needs to know the year is not over, which is what the hatching means. */
  txt(svg, "still running", {x: xs(fys.indexOf(PARTIAL)) + bw / 2,
    y: ys(real[PARTIAL]) - 26, "text-anchor": "middle", class: "pv-labq"});

  /* Hover targets last: transparent, so they cover the annotations without hiding them. */
  fys.forEach((fy, i) => {
    const inFy = D.naics.filter(r => r.fy === fy).sort((a, b) => b.real - a.real);
    hoverable(el("rect", {x: xs(i) + 7, y: m.t, width: bw - 14, height: h,
      fill: "transparent"}, svg),
      `<b>FY${fy}</b>${fy === PARTIAL ? " (partial year)" : ""}<br>
       <span class="v">${usd(real[fy])}</span> in 2025 dollars<br>
       ${usd(nom[fy])} as awarded<br>` +
      inFy.slice(0, 3).map(r => `${label({code: r.code, name: r.name})}:
        <span class="v">${short(r.real)}</span>`).join("<br>"),
      `FY${fy}: ${usd(real[fy])} in 2025 dollars`);
  });
}

function yearsMobile() {
  /* Top margin carries one more line than it used to: the two gaps to the award rule are
     the page's most-checked subtraction and a phone reader does it too. */
  const m = {t: 92, r: 10, b: 30, l: 10}, W = 375, rowH = 38;
  const H = m.t + fys.length * rowH + m.b;
  const {svg, w} = PV.chart("fy", {W, H, m});
  hatch(svg, "fmhatch");
  const maxV = Math.max(award, ...fys.map(fy => real[fy])) * 1.06;
  const xs = v => m.l + (v / maxV) * w;

  fys.forEach((fy, i) => {
    const y = m.t + i * rowH, v = real[fy], part = fy === PARTIAL;
    el("rect", {x: m.l, y: y + 18, width: Math.max(3, xs(v) - m.l), height: 14,
      fill: part ? "url(#fmhatch)" : SEQ[4], rx: 3}, svg);
  });

  /* Reference lines after the bars, so the bars cannot paint over them. */
  el("line", {x1: xs(award), y1: m.t - 4, x2: xs(award), y2: H - m.b, stroke: AWARD,
    "stroke-width": 3}, svg);
  el("line", {x1: xs(avgReal), y1: m.t - 4, x2: xs(avgReal), y2: H - m.b,
    stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "5 4"}, svg);

  /* ROW LABELS LAST, and knocked out of the rules they cross. Drawn before the reference
     lines, the dashed average struck straight through the word "obligations" in the
     FY2023 row and through the FY2026 tag: a label the reader has to reconstruct. Only
     the two tagged rows are long enough to reach a rule, so only they are plated, and the
     rules stay continuous everywhere else. */
  fys.forEach((fy, i) => {
    const y = m.t + i * rowH, v = real[fy];
    const tag = fy === PARTIAL ? " · still running"
      : (troughMissing && fy === trough) ? ` · no ${troughWord} obligations` : "";
    const t = txt(svg, `FY${fy} · ${short(v)}${tag}`, {x: m.l, y: y + 12,
      class: "pv-labq"});
    const right = m.l + t.getComputedTextLength();
    if (right > xs(avgReal) - 3) plateBehind(svg, t);
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, svg),
      `<b>FY${fy}</b><br><span class="v">${usd(v)}</span> in 2025 dollars<br>
       ${usd(nom[fy])} as awarded`,
      `FY${fy}: ${usd(v)} in 2025 dollars`);
  });

  /* Same reading as the desktop chart: the orange rule is labelled by what passing it
     means, not by its value alone. */
  txt(svg, `Bars past the orange line beat the award. FY${clears[0]} did.`,
    {x: m.l, y: 18, class: "pv-labq"});
  txt(svg, `By ${short(over)}. FY${nearFy} fell ${short(gap)} short.`,
    {x: m.l, y: 36, class: "pv-labq"});
  txt(svg, `award ${short(award)}`, {x: xs(award), y: 58, "text-anchor": "end",
    class: "pv-labq", fill: AWARD});
  txt(svg, `average ${short(avgReal)}`, {x: xs(avgReal), y: 78, "text-anchor": "end",
    class: "pv-labq", fill: INK});
}

/* ============================================================ 2. by industry code */
function drawCodes() { MOBILE.matches ? codesMobile() : codesDesktop(); }

function codesDesktop() {
  const m = {t: 44, r: 250, b: 60, l: 236}, rowH = 34;
  const {svg, W, w, h} = PV.chart("na", {W: 1100, rows: codes.length, rowH, m});
  /* AN AXIS THAT STOPS BEFORE THE DATA DOES. Scaled to the top bar exactly, the ticks
     landed on $0/$25M/$50M/$75M and the $98.2M bar ran past the last labelled one, so the
     longest bar on the page had nothing to measure it against. Rounding the domain up to
     the next $25M puts a tick at the end of the longest bar. */
  const maxV = Math.ceil(top.real / 25e6) * 25e6;
  const xs = v => m.l + (v / maxV) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(0, maxV, 4), yt: [],
    xfmt: short,
    xlab: `Federal money committed, FY${fys[0]}–FY${fys.at(-1)} added up, 2025 dollars`});
  codes.forEach((r, i) => {
    const y = m.t + i * rowH + 7, bh = 20;
    /* One hue, two tints: the darker pair is the group the annotation names. Bar length
       already carries the amount, so a full value ramp would double-encode it. */
    el("rect", {x: m.l, y, width: Math.max(3, xs(r.real) - m.l), height: bh,
      fill: i < 2 ? INK : SEQ[3], rx: 4}, svg);
    txt(svg, label(r), {x: m.l - 12, y: y + bh - 5, "text-anchor": "end",
      class: "pv-labq"});
    /* The two long bars carry their value inside, in paper, so the right rail stays
       clear for the annotation. */
    const inside = xs(r.real) - m.l > w * 0.72;
    txt(svg, short(r.real), inside
      ? {x: xs(r.real) - 10, y: y + bh - 5, "text-anchor": "end", class: "pv-lab",
         fill: "var(--paper)"}
      : {x: xs(r.real) + 10, y: y + bh - 5, class: "pv-lab"});
    hoverable(el("rect", {x: 0, y: y - 7, width: W, height: rowH, fill: "transparent"},
      svg), `<b>${r.code} &middot; ${r.name}</b><br><span class="v">${usd(r.real)}</span>
      in 2025 dollars<br>${usd(r.amount)} as awarded<br>across
      <span class="v">${r.years.size}</span> of ${fys.length} fiscal years`,
      `${r.name}: ${usd(r.real)} in 2025 dollars`);
  });
  /* Right rail: the group the two top bars make, named. Drawn after the bars. */
  const rail = m.l + w + 16;
  el("path", {d: `M${rail - 6},${m.t + 5} h6 V${m.t + 2 * rowH - 5} h-6`, fill: "none",
    stroke: INK, "stroke-width": 1.8}, svg);
  /* A SHARE GETS ITS PLAIN EQUIVALENT ONCE. "65%" is legible on its own; "about two
     dollars in every three" is the sentence a reader repeats. "Residual bucket" was the
     census word for a class defined by what does not fit anywhere else. */
  [`Two rubber-product codes`, `hold ${Math.round(topTwoShare * 100)}% of eight years`,
   `of money, about two dollars`, `in every three. The larger`, `is a leftovers class.`]
    .forEach((s, i) => txt(svg, s, {x: rail + 8, y: m.t + 18 + i * 17,
      class: i ? "pv-labq" : "pv-lab", fill: i ? null : INK}));
}

function codesMobile() {
  const m = {t: 46, r: 10, b: 30, l: 10}, W = 375, rowH = 44;
  const H = m.t + codes.length * rowH + m.b;
  const {svg, w} = PV.chart("na", {W, H, m});
  const maxV = top.real;
  const xs = v => m.l + (v / maxV) * w;
  txt(svg, `Two rubber codes hold ${Math.round(topTwoShare * 100)}%, two dollars in three`,
    {x: m.l, y: 20, class: "pv-lab", fill: INK});
  txt(svg, `FY${fys[0]}–FY${fys.at(-1)} added up, 2025 dollars`,
    {x: m.l, y: 38, class: "pv-labq"});
  codes.forEach((r, i) => {
    const y = m.t + i * rowH;
    txt(svg, `${label(r)} · ${short(r.real)}`, {x: m.l, y: y + 13, class: "pv-labq"});
    el("rect", {x: m.l, y: y + 19, width: Math.max(3, xs(r.real) - m.l), height: 14,
      fill: i < 2 ? INK : SEQ[3], rx: 3}, svg);
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, svg),
      `<b>${r.code} &middot; ${r.name}</b><br><span class="v">${usd(r.real)}</span>
       in 2025 dollars<br>${usd(r.amount)} as awarded`,
      `${r.name}: ${usd(r.real)} in 2025 dollars`);
  });
}

/* ================================================= 3. the award, lead by lead */
{
  const wide = A.leads[0].amount;
  /* A LENGTH THAT DISAGREES WITH ITS OWN CAPTION. The rules were drawn at
     `amount / wide * 88 + 12`, a proportional length on top of a twelve-pixel floor, so
     the smallest award ($2.7M, a quarter of the largest) got a third of the longest rule.
     The figure now tells the reader a bar half as long is an award about half the size,
     which is only true of a rule with no floor under it. Same maximum width, no floor:
     the shortest is 24px, legible without lying. */
  document.getElementById("leads").innerHTML = A.leads.map(l =>
    `<div class="lead"><div class="amt">${short(l.amount)}<span class="bar"
       style="width:${Math.round(l.amount / wide * 100)}px"></span></div>
     <div class="who">${l.name}</div><div class="what">${l.funds}</div></div>`).join("");
  /* The source line a reader can act on. What stood here named a script, a file path and
     the repository they live in: reproduction detail addressed to a maintainer, printed
     under a chart for an audience that has no repository. It now sits in the README and
     the generated methodology box, where reproduction detail belongs. */
  /* "The seven amounts sum to $51.0M" sat directly under seven figures that add to
     $51.1M. Both are true — the unrounded amounts total the award line to the dollar,
     and each printed figure is rounded to the nearest $0.1M — but only one was said, so
     a reader who added the column found the page contradicting itself. The partner match
     moved into the Band 3 lede, where a fact a reader wants belongs, and out of here. */
  const leadDimes = A.leads.reduce((s, l) => s + Math.round(l.amount / 1e5), 0);
  document.getElementById("leadsrc").innerHTML =
    `PIC funding map, verified against the signed federal Notices of Award. The seven
     amounts sum to exactly ${usd(A.leads.reduce((s, l) => s + l.amount, 0))}, which is the
     award line on the first chart. Each figure above is rounded to the nearest $0.1M, so
     the seven as printed add to $${(leadDimes / 10).toFixed(1)}M.`;
}

/* ------------------------------------------------------ tables and source lines */
/* ONE DISCLOSURE PER FIGURE. Each chart used to carry its whole method visibly beneath
   it — 190 words under the first one, a twenty-six-line wall on a phone — so a third of
   the second act was disclaimer and the reader waded. The visible caption is now a source
   line plus one limitation sentence, the budget page-design sets; everything else moves
   into the table twin this figure already opens, which is depth rather than disclosure
   because nothing that changes how a number should be read was moved into it. */
const withNotes = (html, notes) =>
  html.replace("</details>", `<p class="tnote">${notes}</p></details>`);

document.getElementById("fytable").innerHTML = withNotes(tableView("y",
  "Federal polymer obligations by fiscal year",
  ["Fiscal year", "2025 dollars", "As awarded"],
  fys.map(fy => [fy === PARTIAL ? `FY${fy} (partial)` : "FY" + fy,
    usd(real[fy]), usd(nom[fy])])),
  `One row is one obligation total for a single fiscal year, category and industry code.
   Without the inflation adjustment, the same eight years come to
   <b>${short(totalNom)}</b> and the average year to ${short(avgNom)}; both columns are in
   the table. Counting only the ${closed.length} years that have finished, the average is
   ${short(avgClosed)} and the award is about ${yearsClosed.toFixed(1)} years of it, so
   the ratio the page prints is the less flattering of the two. Award line:
   ${A.meta.source} ${A.meta.note} ${D.meta.scope}`);
document.getElementById("fysrc").innerHTML =
  `${D.meta.source}, in the twelve PIC-12 counties, marked up to 2025 dollars with the
   federal consumer price index (BLS CPI-U annual averages). FY${PARTIAL} is not over: its
   bar is the year so far, drawn hatched, and not comparable to the seven finished years.
   A year with no row for an industry (FY${trough} for
   ${label(troughMissing).toLowerCase()}) means nothing was recorded. Whether the true
   figure was zero, these files cannot say.`;

document.getElementById("natable").innerHTML = withNotes(tableView("n",
  "Federal polymer obligations by industry code",
  ["NAICS", "Industry", "2025 dollars", "As awarded", "Years with a row"],
  codes.map(r => [r.code, r.name, usd(r.real), usd(r.amount), r.years.size])),
  `${top.name} (${top.code}) leads the eight-year total while
   ${second.name.split("(")[0].trim()} (${second.code}) leads several single years, so a
   one-year ranking would not reproduce this order. Bar labels on the chart are shortened
   by hand; the census names above are the full ones.`);
document.getElementById("nasrc").innerHTML =
  `${D.meta.source}, added up FY${fys[0]}–FY${fys.at(-1)} in 2025 dollars. Pair every
   industry with every year (${codes.length} industries by ${fys.length} years) and only
   ${D.naics.length} of the ${codes.length * fys.length} pairs carry an obligation at all;
   a missing one is a year with nothing recorded for that industry, rather than a confirmed
   zero. Every bar label is rounded to the nearest $0.1M, so the eight add to
   $${(codeDimes / 10).toFixed(1)}M against the ${short(totalReal)} eight-year total${tie
     ? `, and two codes both print ${short(tie.real)} while differing below the rounding`
     : ""}; the table has the exact figures.`;

/* ------------------------------------------------------------------------ assemble */
function drawAll() { drawYears(); drawCodes(); }
drawAll();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* Footprint banner — stated on the page, not left to the reader to infer, but BELOW the
   hero. The shared helper drops it under the mast, which made a county-reconciliation
   notice the first ink on the page: apparatus ahead of the question, and a sixth of the
   first screen on a phone. It belongs where the twelve counties are first argued about. */
document.querySelector(".hero").after(PV.footprintBanner(FP));

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "federal-money", meta: D.meta});
})();
