/* Wage premium, rebuilt. The measure is a RATIO against each county's own all-industry
   average, so chart 1 diverges around 1.0 — the one place a diverging layout is right,
   because 1.0 genuinely means "nothing". Color encodes the industry FAMILY (chemistry
   side vs products side), never above/below — position against the 1.0 line already
   carries that — and dot AREA carries employment, so a 30-job cell can no longer
   impersonate a 2,800-job one. Every chart re-lays itself out per form below 760px:
   no sideways-scroll hint, evidence in the first paint. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, CAT, GRAY, INK} = PV;
const D = await PV.data("wages.json");
const FP = PV.footprint(D.meta);
const N = n => n.toLocaleString("en-US");
const money = v => "$" + Math.round(v).toLocaleString("en-US");
const med = a => { const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
/* Exclusive quartiles (matches the claims harness's convention closely enough for a
   drawn band; no printed number depends on the method). */
const quart = (a, p) => { const s = [...a].sort((x, y) => x - y), n = s.length;
  const k = p * (n + 1) - 1, f = Math.max(0, Math.min(n - 1, Math.floor(k)));
  const c = Math.min(n - 1, f + 1); return s[f] + (s[c] - s[f]) * (k - f); };

/* ---------------------------------------------------------------- derived facts */
const CHEM = new Set(["325", "3252", "3255"]);
const FAM = r => CHEM.has(r.naics) ? "chem" : "prod";
/* The products family is a DARKENED burnt orange rather than the shared CAT[1] (#C85F0C).
   Measured relative luminance puts CAT[0] at L* 53.3 and CAT[1] at 52.2 — near-isoluminant,
   so on a grayscale print or to a colourblind reader the two families collapsed into one
   gray and the legend showed two identical swatches. #8F4008 is the same hue doing the same
   semantic job at L* 37, a 16-point separation that survives desaturation. Mirrored in
   styles.css (.statv.prod) and the legend swatch in index.html. */
const PROD = "#8F4008";
const FAMC = r => CHEM.has(r.naics) ? CAT[0] : PROD;
const SHORT = {"325": "Chemicals (group)", "3252": "Resin & synthetic rubber",
  "3255": "Paint & coatings", "326": "Plastics & rubber (group)",
  "3261": "Plastics products", "3262": "Rubber products"};
const rows = D.latest_rows.filter(r => r.vs_local_all)
  .sort((a, b) => b.vs_local_all - a.vs_local_all);
const above = rows.filter(r => r.vs_local_all > 1).length;
const belowN = rows.length - above;
const medPrem = med(rows.map(r => r.vs_local_all));
const medWage = med(rows.map(r => r.weekly_wage));
const chem = rows.filter(r => FAM(r) === "chem"), prod = rows.filter(r => FAM(r) === "prod");
const chemMed = med(chem.map(r => r.vs_local_all)), prodMed = med(prod.map(r => r.vs_local_all));
const chemAbove = chem.filter(r => r.vs_local_all > 1).length;
const prodAbove = prod.filter(r => r.vs_local_all > 1).length;
const usBelow = rows.filter(r => r.vs_us && r.vs_us < 1).length;
const usMed = med(rows.filter(r => r.vs_us).map(r => r.vs_us));
const qBeatTrail = rows.filter(r => r.vs_local_all > 1 && r.vs_us <= 1).length;
const qBoth = rows.filter(r => r.vs_local_all > 1 && r.vs_us > 1).length;
const qNeither = rows.filter(r => r.vs_local_all <= 1 && r.vs_us <= 1).length;
const maxEmp = Math.max(...rows.map(r => r.emp));
/* Overlap accounting: the data ship industry GROUPS (325, 326) alongside their disclosed
   sub-industries, so a county can appear at both levels. For the reconciliation sentence
   each county is counted once, at its finest disclosed level. */
const byC = {};
rows.forEach(r => { (byC[r.name] = byC[r.name] || {})[r.naics] = r; });
const KIDS = {"325": ["3252", "3255"], "326": ["3261", "3262"]};
const dedup = [];
for (const c in byC) for (const k in byC[c]) {
  if (KIDS[k] && KIDS[k].some(x => x in byC[c])) continue;
  dedup.push(byC[c][k]);
}
const dAbove = dedup.filter(r => r.vs_local_all > 1).length;
const empShare = dedup.filter(r => r.vs_local_all > 1).reduce((s, r) => s + r.emp, 0) /
                 dedup.reduce((s, r) => s + r.emp, 0);
const counties = Object.keys(byC).sort();
const top = rows[0], bot = rows.at(-1);

/* Trend: per-year median + interquartile band across all disclosed cells. */
const T = D.trend.filter(r => r.vs_local_all);
const years = [...new Set(T.map(r => r.year))].sort();
const pts = years.map(y => {
  const v = T.filter(r => r.year === y).map(r => r.vs_local_all);
  return {year: y, med: med(v), q1: quart(v, .25), q3: quart(v, .75), n: v.length};
});
const dip = pts.reduce((a, b) => b.med < a.med ? b : a);

/* ------------------------------------------------------------------- hero stats */
/* Exactly one accented card, and it is the headline's number: the H1 says "1.2 times", so
   the median-premium card carries the lime rule and the row has one focal point. */
PV.figures([
  ["", `${above} of ${rows.length}`, "pairings out-pay their county",
   `one polymer industry in one county, ${D.meta.latest}`],
  ["key", medPrem.toFixed(2) + "×", "median premium",
   "the middle pairing pays a fifth more than its county’s average job"],
  ["", Math.round(empShare * 100) + "%", "of jobs beat their county average",
   "counted once per county, so groups and their parts do not double up"],
  ["", money(medWage), "median weekly wage",
   `about $${Math.round(medWage * 52 / 1000)},000 a year`]
]);

document.getElementById("sv1").textContent = chemMed.toFixed(2) + "×";
document.getElementById("sv1d").textContent =
  `about a third above the county’s average job; all ${chem.length} pairings clear it`;
document.getElementById("sv2").textContent = prodMed.toFixed(2) + "×";
document.getElementById("sv2d").textContent =
  `level with the county’s average job; ${prodAbove} of ${prod.length} above it, and every one ` +
  `of the page’s ${belowN} below-average pairings`;

/* ------------------------------------------------------- county selector + verdict */
let SEL = null;
const dim = r => SEL && r.name !== SEL;
function verdict() {
  const v = document.getElementById("verdict");
  if (!SEL) {
    v.innerHTML = `<b>All twelve counties:</b> ${above} of ${rows.length} pairings pay
      above their county&rsquo;s average job, and every county keeps at least one
      above-average pairing. Tap a county to re-read the chart from its seat.`;
    return;
  }
  const rs = Object.values(byC[SEL]);
  const a = rs.filter(r => r.vs_local_all > 1).length;
  const best = rs.reduce((x, y) => y.vs_local_all > x.vs_local_all ? y : x);
  const worst = rs.reduce((x, y) => y.vs_local_all < x.vs_local_all ? y : x);
  v.innerHTML = rs.length === 1
    ? `<b>${SEL} County:</b> its one published pairing, ${best.label.toLowerCase()},
       pays <b>${best.vs_local_all.toFixed(2)}×</b> the county&rsquo;s average job
       (${money(best.weekly_wage)}/wk).`
    : `<b>${SEL} County:</b> ${a} of ${rs.length} pairings pay above the county&rsquo;s
       average job. Best: ${SHORT[best.naics].toLowerCase()} at
       <b>${best.vs_local_all.toFixed(2)}×</b> (${money(best.weekly_wage)}/wk);
       lowest: ${SHORT[worst.naics].toLowerCase()} at ${worst.vs_local_all.toFixed(2)}×.`;
}
{
  const host = document.getElementById("csel");
  const mk = (label, name) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label;
    b.setAttribute("aria-pressed", String(SEL === name));
    b.addEventListener("click", () => {
      SEL = (SEL === name) ? null : name;
      host.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed",
        String(SEL === null ? x.dataset.all === "1" : x.textContent === SEL)));
      verdict(); drawPremium(); drawScatter();
    });
    if (name === null) { b.dataset.all = "1"; b.setAttribute("aria-pressed", "true"); }
    host.appendChild(b); return b;
  };
  mk("All 12", null);
  counties.forEach(c => mk(c, c));
}
verdict();

/* --------------------------------------------------------- chart 1: the premium */
const MOBILE = matchMedia("(max-width: 760px)");
const rEmp = (e, mx) => 2.2 + mx * Math.sqrt(e / maxEmp);
/* Ticks that never round-lie: 1.25 prints as 1.25×, never 1.3×. */
const fx = v => (Math.round(v * 100) % 10 ? v.toFixed(2) : v.toFixed(1)) + "×";
/* A paper plate behind an SVG label that must cross other ink (cost-scissors pattern). */
const plate = (parent, s, x, y, fs = 7.2) => el("rect", {x: x - 3, y: y - 12,
  width: s.length * fs + 6, height: 15, fill: "var(--paper)", opacity: .94, rx: 2}, parent);

function drawPremium() { MOBILE.matches ? drawPremiumMobile() : drawPremiumDesktop(); }

function drawPremiumDesktop() {
  const {svg, W, m, w} = PV.chart("prem",
    {W: 1100, rows: rows.length, rowH: 22, m: {t: 78, r: 210, b: 56, l: 270}});
  const lo = Math.min(0.7, ...rows.map(r => r.vs_local_all)) - 0.02;
  const hi = Math.max(...rows.map(r => r.vs_local_all)) * 1.03;
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  const h = rows.length * 22;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(lo, hi, 6),
    xfmt: fx, yt: [],
    xlab: "pays less than the county ←   1.0×   → pays more than the county"});
  /* A 51-row stack has ONE axis at the bottom, which left the top rows ~1,200px from any
     tick label — a value scale a reader cannot reach is not a scale. Repeat the tick row
     above the plot and run a hairline down each tick so every row sits on a readable grid. */
  const grid = el("g", {}, svg);
  ticks(lo, hi, 6).forEach(v => {
    el("line", {x1: xs(v), y1: m.t, x2: xs(v), y2: m.t + h, stroke: "var(--pv-grid)",
      "stroke-width": 1}, grid);
    txt(grid, fx(v), {x: xs(v), y: m.t - 32, class: "pv-tick", "text-anchor": "middle"});
  });
  const one = xs(1);
  el("line", {x1: one, y1: m.t - 8, x2: one, y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 2}, svg);
  txt(svg, "1.0×: pay matches the county’s average job", {x: one + 8, y: m.t - 14,
    class: "pv-lab", fill: "var(--hover)"});
  rows.forEach((r, i) => {
    const g = el("g", SEL && dim(r) ? {opacity: .16} : {}, svg);
    const y = m.t + i * 22 + 11;
    const x0 = Math.min(one, xs(r.vs_local_all)), x1 = Math.max(one, xs(r.vs_local_all));
    el("line", {x1: x0, y1: y, x2: x1, y2: y, stroke: FAMC(r), "stroke-width": 2,
      opacity: .55}, g);
    el("circle", {cx: xs(r.vs_local_all), cy: y, r: rEmp(r.emp, 7.3), fill: FAMC(r),
      stroke: "var(--paper)", "stroke-width": 1.2}, g);
    txt(g, `${r.name} · ${SHORT[r.naics]}`,
      {x: m.l - 12, y: y + 4, "text-anchor": "end", class: "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 11, width: W, height: 22, fill: "transparent"}, g),
      `<b>${r.name} County · ${r.label}</b><br><span class="v">${money(r.weekly_wage)}</span>
       a week<br><span class="v">${r.vs_local_all.toFixed(2)}×</span> the county average
       ${r.vs_us ? `<br><span class="v">${r.vs_us.toFixed(2)}×</span> the same industry nationally` : ""}
       <br><span class="v">${N(r.emp)}</span> jobs in the pairing`,
      `${r.name}, ${r.label}: ${r.vs_local_all.toFixed(2)} times the county average`);
  });
  /* Boundary between the 40th and 41st row — the above/below line, named. */
  const yB = m.t + above * 22;
  el("line", {x1: m.l, y1: yB, x2: m.l + w, y2: yB, stroke: "var(--pv-axis)",
    "stroke-width": 1, "stroke-dasharray": "5 4"}, svg);
  txt(svg, `↑ ${above} pairings above · ${belowN} below ↓`,
    {x: one + 120, y: yB - 6, class: "pv-lab"});
  /* Group brackets in the right rail — the claims drawn as group structure. */
  const rail = m.l + w + 14;
  const bracket = (i0, i1, color) => el("path",
    {d: `M${rail + 5},${m.t + i0 * 22 + 3} h-5 V${m.t + (i1 + 1) * 22 - 3} h5`,
     fill: "none", stroke: color, "stroke-width": 1.6}, svg);
  const lines = (ls, y0, color) => ls.forEach((s, i) => {
    const a = {x: rail + 12, y: y0 + i * 17, class: i ? "pv-labq" : "pv-lab"};
    if (!i) a.fill = color;
    txt(svg, s, a);
  });
  bracket(0, 10, CAT[0]);
  lines(["All chemistry up here:", "chemicals, resin and paint",
         "hold the 11 largest", "premiums. Lake chemicals",
         `tops the page: ${money(top.weekly_wage)}/wk.`], m.t + 18, CAT[0]);
  bracket(rows.length - 11, rows.length - 1, CAT[1]);
  lines(["All 11 that pay under", "their own county make",
         "plastics or rubber. The", `lowest, Stark rubber: ${money(bot.weekly_wage)}/wk`,
         `on ${N(bot.emp)} jobs.`], m.t + (rows.length - 11) * 22 + 14, CAT[1]);
}

function drawPremiumMobile() {
  const m = {t: 40, r: 12, b: 46, l: 12}, W = 375, rowH = 36, headH = 44, bndH = 44;
  const H = m.t + headH + rows.length * rowH + bndH + m.b;
  const {svg} = PV.chart("prem", {W, H});
  const w = W - m.l - m.r;
  const lo = Math.min(0.7, ...rows.map(r => r.vs_local_all)) - 0.02;
  const hi = Math.max(...rows.map(r => r.vs_local_all)) * 1.03;
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  const one = xs(1);
  const yFor = i => m.t + headH + i * rowH + (i >= above ? bndH : 0);
  el("line", {x1: one, y1: m.t + 8, x2: one, y2: H - m.b, stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  txt(svg, "1.0×: same as the county", {x: one + 6, y: m.t + 2, class: "pv-labq",
    fill: "var(--hover)"});
  {
    const s = "Top 11 all chemistry: Lake tops it, " + money(top.weekly_wage) + "/wk";
    plate(svg, s, m.l, m.t + 28);
    txt(svg, s, {x: m.l, y: m.t + 28, class: "pv-labq", fill: CAT[0]});
  }
  rows.forEach((r, i) => {
    const g = el("g", SEL && dim(r) ? {opacity: .16} : {}, svg);
    const y = yFor(i);
    const lab = `${r.name} · ${SHORT[r.naics]}`;
    plate(g, lab, m.l, y + 12);
    txt(g, lab, {x: m.l, y: y + 12, class: "pv-labq"});
    const yl = y + 24;
    const x0 = Math.min(one, xs(r.vs_local_all)), x1 = Math.max(one, xs(r.vs_local_all));
    el("line", {x1: x0, y1: yl, x2: x1, y2: yl, stroke: FAMC(r), "stroke-width": 2,
      opacity: .55}, g);
    el("circle", {cx: xs(r.vs_local_all), cy: yl, r: rEmp(r.emp, 5.4), fill: FAMC(r),
      stroke: "var(--paper)", "stroke-width": 1}, g);
    hoverable(el("rect", {x: 0, y: y, width: W, height: rowH, fill: "transparent"}, g),
      `<b>${r.name} · ${r.label}</b><br><span class="v">${money(r.weekly_wage)}</span> a week
       · <span class="v">${r.vs_local_all.toFixed(2)}×</span> local<br>
       <span class="v">${N(r.emp)}</span> jobs`,
      `${r.name}, ${r.label}: ${r.vs_local_all.toFixed(2)} times the county average`);
  });
  const yB = m.t + headH + above * rowH + bndH / 2;
  el("line", {x1: m.l, y1: yB, x2: W - m.r, y2: yB, stroke: "var(--pv-axis)",
    "stroke-width": 1, "stroke-dasharray": "5 4"}, svg);
  {
    const s = `↑ ${above} above · ${belowN} below, all plastics & rubber ↓`;
    plate(svg, s, m.l, yB - 8);
    txt(svg, s, {x: m.l, y: yB - 8, class: "pv-labq"});
  }
  const ax = el("g", {}, svg);
  ticks(lo, hi, 4).forEach(v => {
    txt(ax, fx(v), {x: xs(v), y: H - m.b + 18, class: "pv-tick",
      "text-anchor": "middle"});
  });
  txt(svg, "← pays less than the county · pays more →",
    {x: m.l, y: H - 8, class: "pv-labq"});
}

/* ------------------------------------------------- chart 2: the national scatter */
function drawScatter() { MOBILE.matches ? drawScatterMobile() : drawScatterDesktop(); }

function scDomains() {
  const xlo = Math.min(0.7, ...rows.map(r => r.vs_local_all)) - 0.02;
  const xhi = Math.max(...rows.map(r => r.vs_local_all)) * 1.04;
  const ylo = Math.min(...rows.map(r => r.vs_us)) - 0.04;
  const yhi = Math.max(...rows.map(r => r.vs_us)) * 1.06;
  return {xlo, xhi, ylo, yhi};
}

function drawScatterDesktop() {
  const {svg, m, w, h} = PV.chart("scat", {W: 1100, H: 540,
    m: {t: 50, r: 230, b: 64, l: 64}});
  const {xlo, xhi, ylo, yhi} = scDomains();
  const xs = v => m.l + ((v - xlo) / (xhi - xlo)) * w;
  const ys = v => m.t + h - ((v - ylo) / (yhi - ylo)) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: ticks(xlo, xhi, 6),
    yt: ticks(ylo, yhi, 5), xfmt: fx, yfmt: fx,
    xlab: "pays less than the county ←   → pays more than the county",
    ylab: "pays less than the industry nationally ←   → pays more"});
  el("line", {x1: xs(1), y1: m.t, x2: xs(1), y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  txt(svg, "1.0×: matches the industry nationally", {x: m.l + 6, y: ys(1) - 8,
    class: "pv-labq", fill: "var(--hover)"});
  txt(svg, "1.0×: matches the county", {x: xs(1) - 6, y: m.t + 14,
    class: "pv-labq", fill: "var(--hover)", "text-anchor": "end"});
  rows.forEach(r => {
    const g = el("g", SEL && dim(r) ? {opacity: .14} : {}, svg);
    hoverable(el("circle", {cx: xs(r.vs_local_all), cy: ys(r.vs_us),
      r: rEmp(r.emp, 8.5), fill: FAMC(r), "fill-opacity": .78,
      stroke: "var(--paper)", "stroke-width": 1.2}, g),
      `<b>${r.name} County · ${r.label}</b><br><span class="v">${r.vs_local_all.toFixed(2)}×</span>
       the county average · <span class="v">${r.vs_us.toFixed(2)}×</span> the industry
       nationally<br><span class="v">${money(r.weekly_wage)}</span> a week ·
       <span class="v">${N(r.emp)}</span> jobs`,
      `${r.name}, ${r.label}: ${r.vs_local_all.toFixed(2)} local, ${r.vs_us.toFixed(2)} national`);
  });
  /* Quadrant verdicts, written where the dots are (plated where dots crowd). */
  {
    const s1 = `Beats the town, trails the industry · ${qBeatTrail} pairings`;
    plate(svg, s1, xs(1.06), ys(ylo + 0.03), 7.6);
    txt(svg, s1, {x: xs(1.06), y: ys(ylo + 0.03), class: "pv-lab"});
    const s2 = `Trails both · ${qNeither}`;
    plate(svg, s2, xs(1) - 12 - s2.length * 7.6, ys(ylo + 0.03), 7.6);
    txt(svg, s2, {x: xs(1) - 12, y: ys(ylo + 0.03), class: "pv-lab",
      "text-anchor": "end"});
    txt(svg, `Beats both · ${qBoth} pairings`,
      {x: xs(1.5), y: m.t + 16, class: "pv-lab"});
  }
  /* Two story dots, labeled in the right rail with leader lines. */
  const wayne = rows.find(r => r.name === "Wayne" && r.naics === "3255");
  const lake = rows.find(r => r.name === "Lake" && r.naics === "325");
  const rail = m.l + w + 16;
  if (lake) {
    el("line", {x1: xs(lake.vs_local_all) + 10, y1: ys(lake.vs_us), x2: rail - 4,
      y2: ys(lake.vs_us), stroke: "var(--pv-axis)", "stroke-width": 1}, svg);
    ["Lake chemicals: 2.09× its", "county, but only 1.04× its",
     "industry nationally"].forEach((s, i) => txt(svg, s,
      {x: rail, y: ys(lake.vs_us) + 4 + i * 16, class: i ? "pv-labq" : "pv-lab"}));
  }
  if (wayne) {
    el("line", {x1: xs(wayne.vs_local_all) + 8, y1: ys(wayne.vs_us) - 8, x2: rail - 4,
      y2: ys(wayne.vs_us) - 30, stroke: "var(--pv-axis)", "stroke-width": 1}, svg);
    ["Wayne paint beats both:", "1.98× the county, 1.28×", "the industry"]
      .forEach((s, i) => txt(svg, s,
        {x: rail, y: ys(wayne.vs_us) - 26 + i * 16, class: i ? "pv-labq" : "pv-lab"}));
  }
}

function drawScatterMobile() {
  /* Left margin is 44, not 36, because this axis now prints "0.6×" rather than "0.6": the
     units travel with the tick, and the label needs the room to do it. */
  const m = {t: 62, r: 14, b: 50, l: 44}, W = 375, H = 422;
  const {svg} = PV.chart("scat", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const {xlo, xhi, ylo, yhi} = scDomains();
  const xs = v => m.l + ((v - xlo) / (xhi - xlo)) * w;
  const ys = v => m.t + h - ((v - ylo) / (yhi - ylo)) * h;
  /* THE AXIS MAY NOT ROUND-LIE. This chart shipped `yfmt: v => v.toFixed(1)` over ticks at
     0.75 / 1.00 / 1.25, so three gridlines 86px apart were labelled 0.8 / 1.0 / 1.3 — equal
     pixel gaps asserting spans of 0.2 and 0.3, and every dot near the outer lines misread by
     0.05. Five requested ticks land the domain on a clean 0.2 step (0.6/0.8/1.0/1.2) and the
     page's own no-round-lie formatter prints them, exactly as the desktop chart does. */
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: ticks(xlo, xhi, 3),
    yt: ticks(ylo, yhi, 5), xfmt: fx,
    yfmt: fx, xlab: "← under town   ·   over town →",
    ylab: "← under industry   ·   over →"});
  /* The family key lives on chart 1's legend, roughly 3,000px up the phone scroll. A figure
     that has to be read where it sits carries its own. */
  {
    const ky = 24;
    el("circle", {cx: m.l + 5, cy: ky - 5, r: 5, fill: CAT[0]}, svg);
    txt(svg, "chemistry", {x: m.l + 15, y: ky, class: "pv-labq"});
    el("circle", {cx: m.l + 105, cy: ky - 5, r: 5, fill: PROD}, svg);
    txt(svg, "plastics & rubber", {x: m.l + 115, y: ky, class: "pv-labq"});
  }
  el("line", {x1: xs(1), y1: m.t, x2: xs(1), y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 1.2, "stroke-dasharray": "4 3"}, svg);
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.2, "stroke-dasharray": "4 3"}, svg);
  rows.forEach(r => {
    const g = el("g", SEL && dim(r) ? {opacity: .14} : {}, svg);
    hoverable(el("circle", {cx: xs(r.vs_local_all), cy: ys(r.vs_us),
      r: rEmp(r.emp, 5.5), fill: FAMC(r), "fill-opacity": .78,
      stroke: "var(--paper)", "stroke-width": 1}, g),
      `<b>${r.name} · ${r.label}</b><br><span class="v">${r.vs_local_all.toFixed(2)}×</span>
       local · <span class="v">${r.vs_us.toFixed(2)}×</span> national`,
      `${r.name}, ${r.label}`);
  });
  {
    const s1 = `beats town, trails industry · ${qBeatTrail}`;
    plate(svg, s1, xs(1) + 6, ys(ylo + 0.02));
    txt(svg, s1, {x: xs(1) + 6, y: ys(ylo + 0.02), class: "pv-labq"});
    const s2 = `trails both · ${qNeither}`;
    plate(svg, s2, xs(1) - 6 - s2.length * 7.2, m.t + h - 46);
    txt(svg, s2, {x: xs(1) - 6, y: m.t + h - 46, class: "pv-labq",
      "text-anchor": "end"});
    txt(svg, `beats both · ${qBoth}`, {x: xs(1) + 6, y: m.t + 12, class: "pv-labq"});
  }
}

/* ---------------------------------------------------------- chart 3: the decade */
function drawTrend() { MOBILE.matches ? drawTrendVariant(375, 300, true)
                                      : drawTrendVariant(640, 340, false); }

function drawTrendVariant(W, H, mobile) {
  const m = mobile ? {t: 42, r: 58, b: 46, l: 42} : {t: 46, r: 150, b: 52, l: 50};
  const {svg} = PV.chart("trend", {W, H, narrow: true, keep: 1});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const lo = Math.min(...pts.map(p => p.q1), 1) - 0.04;
  const hi = Math.max(...pts.map(p => p.q3)) + 0.05;
  const xs = y => m.l + ((y - years[0]) / (years.at(-1) - years[0])) * w;
  const ys = v => m.t + h - ((v - lo) / (hi - lo)) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys,
    xt: years.filter((_, i) => i % (mobile ? 3 : 2) === 0),
    yt: ticks(lo, hi, 5), xfmt: v => v, yfmt: v => v.toFixed(1) + "×",
    xlab: "", ylab: mobile ? "← below the county · above →"
      : "below the county’s average job ← 1.0× → above it"});
  /* The spread first, so the line reads against it. */
  el("path", {d: "M" + pts.map(p => `${xs(p.year)},${ys(p.q3)}`).join("L") +
    "L" + [...pts].reverse().map(p => `${xs(p.year)},${ys(p.q1)}`).join("L") + "Z",
    fill: "rgba(0,139,168,.13)"}, svg);
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  txt(svg, mobile ? "1.0×: same as the county"
    : "1.0×: pay matches the county’s average job",
    {x: m.l + 4, y: ys(1) + 16, class: "pv-labq", fill: "var(--hover)"});
  el("path", {d: "M" + pts.map(p => `${xs(p.year)},${ys(p.med)}`).join("L"),
    fill: "none", stroke: INK, "stroke-width": 3}, svg);
  pts.forEach(p => hoverable(
    el("circle", {cx: xs(p.year), cy: ys(p.med), r: mobile ? 4 : 5, fill: INK,
      stroke: "var(--paper)", "stroke-width": 2}, svg),
    `<b>${p.year}</b><br>median premium <span class="v">${p.med.toFixed(2)}×</span><br>
     middle half of pairings: <span class="v">${p.q1.toFixed(2)}–${p.q3.toFixed(2)}×</span><br>
     across <span class="v">${p.n}</span> pairings`,
    `${p.year}: median ${p.med.toFixed(2)}`));
  const band0 = pts[1];
  txt(svg, mobile ? "middle half of pairings" : "the middle half of pairings sits in this band",
    {x: xs(band0.year) + 4, y: ys(band0.q3) - 8, class: "pv-labq", fill: "#3D9CAC"});
  txt(svg, pts.at(-1).med.toFixed(2) + "×", {x: xs(years.at(-1)) + 8,
    y: ys(pts.at(-1).med) + 4, class: "pv-lab"});
  txt(svg, pts[0].med.toFixed(2) + "×", {x: xs(years[0]) + 2,
    y: ys(pts[0].med) + 18, class: "pv-lab"});
  {
    const s = `${dip.med.toFixed(2)}× in ${dip.year}`;
    plate(svg, s, xs(dip.year) - s.length * 3.4, ys(dip.med) + 20, 6.8);
    txt(svg, s, {x: xs(dip.year), y: ys(dip.med) + 20, class: "pv-labq",
      "text-anchor": "middle"});
  }
}

/* -------------------------------------------------------- tables + source lines */
document.getElementById("premtable").innerHTML = tableView("p",
  `Wage premium by county and industry, ${D.meta.latest}. Above 1.00 means the work ` +
  `out-pays the comparison; below 1.00 means it pays less.`,
  ["County", "Industry", "Weekly wage", "× its county", "× its industry US", "Jobs"],
  rows.map(r => [r.name, r.label, money(r.weekly_wage), r.vs_local_all.toFixed(2),
    r.vs_us ? r.vs_us.toFixed(2) : "—", N(r.emp)]));
/* CAVEAT INK. This line ran ~50 words and did methodology work in a caption: the
   parent/child overlap reconciliation now sits in the methods box, where a reader who wants
   it will look, and the figure keeps the one limitation that changes how the chart is read.
   The possible-pairings denominator is COMPUTED from the disclosed industries and counties,
   never typed. */
document.getElementById("premsrc").innerHTML =
  `${D.meta.source}, ${D.meta.latest}; ${FP.words} Northeast Ohio counties. Ratio =
   average weekly wage &divide; the county&rsquo;s all-industry average. Pairings too
   small to publish are absent, not zero: ${rows.length} of
   ${[...new Set(D.latest_rows.map(r => r.naics))].length * counties.length} possible
   pairings are published.`;
document.getElementById("scattable").innerHTML = tableView("s",
  `Pay against the county and against the same industry nationally, ${D.meta.latest}. ` +
  `Above 1.00 means the work out-pays that comparison.`,
  ["County", "Industry", "× its county", "× its industry US", "Jobs"],
  [...rows].sort((a, b) => a.vs_us - b.vs_us).map(r => [r.name, r.label,
    r.vs_local_all.toFixed(2), r.vs_us.toFixed(2), N(r.emp)]));
document.getElementById("scatsrc").innerHTML =
  `${D.meta.source}, ${D.meta.latest}; ${FP.words} Northeast Ohio counties. National
   comparison: county weekly wage ÷ the same industry&rsquo;s U.S. average weekly wage.`;
document.getElementById("trendtable").innerHTML = tableView("t",
  "The middle pairing each year, and the middle half of pairings around it",
  ["Year", "Middle pairing", "Middle half, low", "Middle half, high", "Pairings measured"],
  pts.map(p => [p.year, p.med.toFixed(3) + "×", p.q1.toFixed(2), p.q3.toFixed(2), p.n]));
document.getElementById("trendsrc").innerHTML =
  `${D.meta.source}, ${years[0]}–${years.at(-1)}; ${FP.words} Northeast Ohio counties.
   Between ${Math.min(...pts.map(p => p.n))} and ${Math.max(...pts.map(p => p.n))} pairings
   are big enough to publish in a given year, so the set behind each year shifts slightly.`;

document.getElementById("closersub").innerHTML =
  `${above} of ${rows.length} pairings beat their county&rsquo;s average job, a
   <b>${medPrem.toFixed(2)}×</b> median premium that has held for a decade, and
   <b>${usBelow} of ${rows.length}</b> still pay under their own industry&rsquo;s national
   average. Both halves are checkable from the same public file, and the honest
   recruiting pitch carries both.`;

/* --------------------------------------------------------------------- assemble */
function drawAll() { drawPremium(); drawScatter(); drawTrend(); }
drawAll();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* NO FOOTPRINT BANNER ABOVE THE HERO. It opened the page on apparatus, ate ~130px of the
   phone's first paint, and wrote registry names at the reader ("the vault's NEO-14"), which
   is internal shorthand nobody outside the tracker can parse. The geography a reader
   actually needs now travels with each figure ("twelve Northeast Ohio counties", in every
   source line), and the full county list and the reconciliation go to the methods box below,
   in reader words.

   Standard methodology + AI disclosure. Generated, not written — see picviz.js. The
   parent/child overlap reconciliation moves here out of chart 1's caption; every count in it
   is computed above, never typed. */
const meth = await PV.methodology({page: "wages", meta: D.meta,
  definitions: `The data ship industry groups (325 chemical manufacturing, 326 plastics and
    rubber) alongside their published sub-industries, so one county can appear at both levels
    and the ${rows.length} pairings are not additive. Counted once per county, at the finest
    industry detail published for it, ${dAbove} of ${dedup.length} pairings pay above their county average,
    the same roughly three-in-four share as the headline ${above} of ${rows.length}. The
    employment-weighted hero share uses that deduplicated set only.`});

/* Which counties, in reader words, filed under the sources it qualifies. */
{
  const h = [...meth.querySelectorAll("h3")]
    .find(x => x.textContent.trim() === "Data sources");
  if (h) {
    const p = document.createElement("p");
    p.className = "pv-method-note";
    p.textContent = `Coverage: the cluster’s official ${FP.words}-county footprint ` +
      `(${FP.counties.join(", ")}), all in Northeast Ohio. A wider fourteen-county ` +
      `definition of the region, used by some other sources, adds Crawford, Huron, ` +
      `Richland and Tuscarawas; the two never reconcile, and this page does not mix them.`;
    h.parentNode.appendChild(p);
  }
}
})();
