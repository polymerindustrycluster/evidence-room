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

const byCode = {};
D.naics.forEach(r => {
  const c = byCode[r.code] = byCode[r.code] ||
    {code: r.code, name: r.name, amount: 0, real: 0, years: new Set()};
  c.amount += r.amount; c.real += r.real; c.years.add(r.fy);
});
const codes = Object.values(byCode).sort((a, b) => b.real - a.real);
const top = codes[0], second = codes[1];
const topTwoShare = (top.real + second.real) / totalReal;
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
PV.figures([
  ["key", short(avgReal), "a year, on average", `FY${fys[0]}–FY${fys.at(-1)}, 2025 dollars`],
  ["", short(award), "the Tech Hub award", `${A.leads.length} awards, as awarded`],
  ["", years.toFixed(1), "routine years to match it",
   `${yearsClosed.toFixed(1)} on closed years only`],
  ["", short(totalReal), "eight-year total", `${short(totalNom)} as awarded`]
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
    yfmt: short, ylab: "Obligations, polymer NAICS, 2025 dollars"});

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
    const cx = xs(i) + bw / 2, s = short(real[fy]);
    let ly = ys(real[fy]) - 9;
    const near = REFS.find(r => Math.abs(ly - r) < 16);
    if (near !== undefined) ly = Math.min(ly, near - 13);
    txt(svg, s, {x: cx, y: ly, "text-anchor": "middle", class: "pv-lab"});
  });

  txt(svg, `FY${clears[0]} clears the award line on its own.`,
    {x: m.l + 4, y: 24, class: "pv-lab"});
  txt(svg, `FY${nearFy} comes within ${short(gap)} of it.`,
    {x: m.l + 4, y: 42, class: "pv-labq"});
  txt(svg, `EDA Tech Hub award ${short(award)} = about ${years.toFixed(1)} routine years`,
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
  txt(svg, "partial year", {x: xs(fys.indexOf(PARTIAL)) + bw / 2,
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
  const m = {t: 74, r: 10, b: 30, l: 10}, W = 375, rowH = 38;
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
    const tag = fy === PARTIAL ? " · partial year"
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

  txt(svg, `FY${clears[0]} clears the award line`, {x: m.l, y: 20, class: "pv-labq"});
  txt(svg, `award ${short(award)}`, {x: xs(award), y: 42, "text-anchor": "end",
    class: "pv-labq", fill: AWARD});
  txt(svg, `average ${short(avgReal)}`, {x: xs(avgReal), y: 62, "text-anchor": "end",
    class: "pv-labq", fill: INK});
}

/* ============================================================ 2. by industry code */
function drawCodes() { MOBILE.matches ? codesMobile() : codesDesktop(); }

function codesDesktop() {
  const m = {t: 44, r: 250, b: 60, l: 236}, rowH = 34;
  const {svg, W, w, h} = PV.chart("na", {W: 1100, rows: codes.length, rowH, m});
  const maxV = top.real;
  const xs = v => m.l + (v / maxV) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(0, maxV, 4), yt: [],
    xfmt: short, xlab: `Obligations, FY${fys[0]}–FY${fys.at(-1)} combined, 2025 dollars`});
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
  [`Two rubber-product codes`, `hold ${Math.round(topTwoShare * 100)}% of eight`,
   `years of money. The`, `larger of them is a`, `residual bucket.`]
    .forEach((s, i) => txt(svg, s, {x: rail + 8, y: m.t + 18 + i * 17,
      class: i ? "pv-labq" : "pv-lab", fill: i ? null : INK}));
}

function codesMobile() {
  const m = {t: 46, r: 10, b: 30, l: 10}, W = 375, rowH = 44;
  const H = m.t + codes.length * rowH + m.b;
  const {svg, w} = PV.chart("na", {W, H, m});
  const maxV = top.real;
  const xs = v => m.l + (v / maxV) * w;
  txt(svg, `Two rubber codes hold ${Math.round(topTwoShare * 100)}% of it`,
    {x: m.l, y: 20, class: "pv-lab", fill: INK});
  txt(svg, `FY${fys[0]}–FY${fys.at(-1)} combined, 2025 dollars`,
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
  document.getElementById("leads").innerHTML = A.leads.map(l =>
    `<div class="lead"><div class="amt">${short(l.amount)}<span class="bar"
       style="width:${Math.round(l.amount / wide * 88) + 12}px"></span></div>
     <div class="who">${l.name}</div><div class="what">${l.funds}</div></div>`).join("");
  /* The source line a reader can act on. What stood here named a script, a file path and
     the repository they live in: reproduction detail addressed to a maintainer, printed
     under a chart for an audience that has no repository. It now sits in the README and
     the generated methodology box, where reproduction detail belongs. */
  document.getElementById("leadsrc").innerHTML =
    `PIC funding map, verified against the signed federal Notices of Award. The seven
     amounts sum to ${short(A.leads.reduce((s, l) => s + l.amount, 0))}, the award line on
     the first chart; a ${short(A.match)} ${A.match_label} sits alongside them, is not
     federal money, and is not counted here.`;
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
   As awarded, the same eight years come to <b>${short(totalNom)}</b> and the average year
   to ${short(avgNom)}; both columns are in the table. Counting only the ${closed.length}
   closed years the average is ${short(avgClosed)} and the award is about
   ${yearsClosed.toFixed(1)} years of it, so the ratio the page prints is the less
   flattering of the two. Award line: ${A.meta.source} ${A.meta.note} ${D.meta.scope}`);
document.getElementById("fysrc").innerHTML =
  `${D.meta.source}, in the twelve PIC-12 counties, restated in 2025 dollars with BLS
   CPI-U annual averages. FY${PARTIAL} is partial: its bar is a running total, drawn
   hatched, and not comparable to the closed years.`;

document.getElementById("natable").innerHTML = withNotes(tableView("n",
  "Federal polymer obligations by industry code",
  ["NAICS", "Industry", "2025 dollars", "As awarded", "Years with a row"],
  codes.map(r => [r.code, r.name, usd(r.real), usd(r.amount), r.years.size])),
  `${top.name} (${top.code}) leads the eight-year total while
   ${second.name.split("(")[0].trim()} (${second.code}) leads several single years, so a
   one-year ranking would not reproduce this order. Bar labels on the chart are shortened
   by hand; the census names above are the full ones.`);
document.getElementById("nasrc").innerHTML =
  `${D.meta.source}, summed FY${fys[0]}–FY${fys.at(-1)} in 2025 dollars.
   ${D.naics.length} of the ${codes.length * fys.length} possible code-by-year cells carry
   an obligation, and an absent cell is a year with no recorded obligation for that code
   rather than a confirmed zero.`;

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
