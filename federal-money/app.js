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
const {el, txt, ticks, frame, hoverable, tableView, SEQ, CAT, INK} = PV;
const D = await PV.data("federal.json");
const A = await PV.data("techhub.json");
const FP = PV.footprint(D.meta);
const MOBILE = matchMedia("(max-width: 760px)");

const usd = v => "$" + Math.round(v).toLocaleString("en-US");
const short = v => v >= 1e9 ? "$" + (v / 1e9).toFixed(1) + "B"
                 : v >= 1e6 ? "$" + (v / 1e6).toFixed(v % 1e6 ? 1 : 0) + "M"
                 : v ? "$" + Math.round(v / 1e3) + "k" : "$0";
/* A paper plate behind a label that has to cross a reference line (cost-scissors
   pattern). Marked data-pv-plated so collide.mjs reads the covering as deliberate. */
const plate = (parent, s, x, y, fs = 7.4) => el("rect", {x: x - s.length * fs / 2 - 4,
  y: y - 13, width: s.length * fs + 8, height: 17, fill: "var(--paper)", opacity: .95,
  rx: 2}, parent);

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

const countyReal = D.counties.reduce((s, r) => s + r.real, 0);

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
  el("line", {x1: m.l, y1: ys(award), x2: m.l + w, y2: ys(award), stroke: CAT[1],
    "stroke-width": 2}, svg);
  el("line", {x1: m.l, y1: ys(avgReal), x2: m.l + w, y2: ys(avgReal), stroke: INK,
    "stroke-width": 1.5, "stroke-dasharray": "5 4"}, svg);

  fys.forEach((fy, i) => {
    /* A value label whose band straddles a reference line gets a plate, or the dashed
       average rules straight through the digits. */
    const cx = xs(i) + bw / 2, ly = ys(real[fy]) - 9, s = short(real[fy]);
    const crossed = Math.abs(ly - ys(avgReal)) < 16 || Math.abs(ly - ys(award)) < 16;
    if (crossed) plate(svg, s, cx, ly);
    const t = txt(svg, s, {x: cx, y: ly, "text-anchor": "middle", class: "pv-lab"});
    if (crossed) t.setAttribute("data-pv-plated", "");
  });

  txt(svg, `FY${clears[0]} clears the award line on its own.`,
    {x: m.l + 4, y: 24, class: "pv-lab"});
  txt(svg, `FY${nearFy} comes within ${short(gap)} of it.`,
    {x: m.l + 4, y: 42, class: "pv-labq"});
  txt(svg, `EDA Tech Hub award ${short(award)} = about ${years.toFixed(1)} routine years`,
    {x: m.l + w, y: ys(award) - 9, "text-anchor": "end", class: "pv-lab", fill: CAT[1]});
  /* Anchored over the two shortest bars, clear of every bar top. Anchoring it at the
     right edge put it inside the FY2025 bar, which is the occlusion this rebuild fixes. */
  txt(svg, `eight-year average ${short(avgReal)} a year`,
    {x: xs(fys.indexOf(trough)) + 10, y: ys(avgReal) - 9, class: "pv-labq", fill: INK});

  if (troughMissing) {
    const tx = xs(fys.indexOf(trough)) + 10;
    txt(svg, `No ${label(troughMissing).toLowerCase()} obligation`,
      {x: tx, y: ys(maxV * 0.484), class: "pv-labq"});
    txt(svg, `appears in FY${trough}.`, {x: tx, y: ys(maxV * 0.428), class: "pv-labq"});
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
    const tag = fy === PARTIAL ? " · partial year"
      : (troughMissing && fy === trough) ? ` · no ${troughWord} obligations` : "";
    txt(svg, `FY${fy} · ${short(v)}${tag}`, {x: m.l, y: y + 12, class: "pv-labq"});
    el("rect", {x: m.l, y: y + 18, width: Math.max(3, xs(v) - m.l), height: 14,
      fill: part ? "url(#fmhatch)" : SEQ[4], rx: 3}, svg);
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, svg),
      `<b>FY${fy}</b><br><span class="v">${usd(v)}</span> in 2025 dollars<br>
       ${usd(nom[fy])} as awarded`,
      `FY${fy}: ${usd(v)} in 2025 dollars`);
  });

  /* Reference lines after the bars, so the bars cannot paint over them. */
  el("line", {x1: xs(award), y1: m.t - 4, x2: xs(award), y2: H - m.b, stroke: CAT[1],
    "stroke-width": 2}, svg);
  el("line", {x1: xs(avgReal), y1: m.t - 4, x2: xs(avgReal), y2: H - m.b,
    stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "5 4"}, svg);
  txt(svg, `FY${clears[0]} clears the award line`, {x: m.l, y: 20, class: "pv-labq"});
  txt(svg, `award ${short(award)}`, {x: xs(award), y: 42, "text-anchor": "end",
    class: "pv-labq", fill: CAT[1]});
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
  document.getElementById("leadsrc").innerHTML =
    `${A.meta.source} ${A.meta.derived_note} ${A.meta.caution} The seven amounts sum to
     ${short(A.leads.reduce((s, l) => s + l.amount, 0))}, the award line on the first
     chart. A ${short(A.match)} ${A.match_label} sits alongside it and is not counted here.`;
}

/* ------------------------------------------------------ tables and source lines */
document.getElementById("fytable").innerHTML = tableView("y",
  "Federal polymer obligations by fiscal year",
  ["Fiscal year", "2025 dollars", "As awarded"],
  fys.map(fy => [fy === PARTIAL ? `FY${fy} (partial)` : "FY" + fy,
    usd(real[fy]), usd(nom[fy])]));
document.getElementById("fysrc").innerHTML =
  `${D.meta.source}. ${D.meta.row}. Every chart on this page is in 2025 dollars, using
   BLS CPI-U annual averages; as awarded, the same eight years come to
   <b>${short(totalNom)}</b> and the average year to ${short(avgNom)}, and both
   columns are in the table above. FY${PARTIAL} is partial: the federal year is not
   closed, so its bar is a running total, drawn hatched, and not comparable to the
   others. Counting only the ${closed.length} closed years the average is
   ${short(avgClosed)} and the award is about ${yearsClosed.toFixed(1)} years of it.
   Award line: ${A.meta.source} ${A.meta.note} ${D.meta.scope}`;

document.getElementById("natable").innerHTML = tableView("n",
  "Federal polymer obligations by industry code",
  ["NAICS", "Industry", "2025 dollars", "As awarded", "Years with a row"],
  codes.map(r => [r.code, r.name, usd(r.real), usd(r.amount), r.years.size]));
document.getElementById("nasrc").innerHTML =
  `${D.meta.source}, summed FY${fys[0]}–FY${fys.at(-1)} in 2025 dollars.
   ${D.naics.length} of the ${codes.length * fys.length} possible code-by-year cells
   carry an obligation. An absent cell is a year with no recorded obligation for that
   code, which is not a confirmed zero. ${top.name} (${top.code}) leads the eight-year
   total while ${second.name.split("(")[0].trim()} (${second.code}) leads several single
   years, so a one-year ranking would not reproduce this order.`;

document.getElementById("caveat").innerHTML =
  `<b>What this view cannot see.</b> The industry filter is 325* and 326* manufacturing
   codes, so university and research awards are invisible to it by construction: a
   university files under 61xxxx or 5417xx. The NSF NEO-SMART Engine ($14,999,983) and
   TARDISS are real federal money in these counties and appear in no bar above. The same
   API also returns all-industry totals for the same counties, <b>${short(countyReal)}</b>
   over the same years, dominated by aerospace, defense and health contracting with no
   polymer content. The two scopes sit in one data file and are never added together.`;

document.getElementById("closersub").innerHTML =
  `Routine federal polymer contracting in these twelve counties runs about
   <b>${short(avgReal)} a year</b> in 2025 dollars. The Tech Hub award, ${short(award)},
   is about ${years.toFixed(1)} years of it, and in FY${clears[0]} the routine flow was
   larger than the whole award on its own. A competitive grant and a procurement
   obligation are different instruments, so this is a comparison of order of magnitude
   rather than of like for like. That order of magnitude is the context every funder
   conversation has been missing.`;

/* ------------------------------------------------------------------------ assemble */
function drawAll() { drawYears(); drawCodes(); }
drawAll();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* Footprint banner — stated on the page, not left to the reader to infer. */
PV.footprintBanner(FP);

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "federal-money", meta: D.meta});
})();
