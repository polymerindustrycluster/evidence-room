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
/* THE TWO SHARES ARE PRINTED, NEVER LEFT TO THE READER TO INFER. 27/35 and 40/51 are the
   same finding on two different sets, and the page used to call them both "roughly
   three-in-four" while a hero card rounded one of them to 78% — a reader who divided got
   77.1% and 78.4% and could not tell which rounding to believe. Both percentages are now
   computed here and printed side by side in the methodology, so the reconciliation closes
   on the page rather than in a reader's head. */
const pctDedup = Math.round(dAbove / dedup.length * 100);
const pctHead = Math.round(above / rows.length * 100);
/* The employment-weighted share was a hero card no reader could check: no job count
   appeared anywhere on the page, and 78% collided with 40/51 = 78.4% two cards away. The
   totals themselves now travel with it in the methodology, where its definition lives. */
const empAbove = dedup.filter(r => r.vs_local_all > 1).reduce((s, r) => s + r.emp, 0);
const empTot = dedup.reduce((s, r) => s + r.emp, 0);
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
/* Card 3 used to be the employment-weighted 78%. It came out: it was the one hero number
   with no denominator on it and no job count anywhere on the page to check it against, and
   it landed a rounding apart from 40/51 = 78.4% two cards away, so it read as the headline
   said twice. Its replacement is the page's own counterweight, which is checkable from the
   scatter (7 beat both + 33 beat the town only = 40; 33 + 11 = 44; 40 + 44 − 33 = 51) and
   which puts the bad half of the finding in the hero row instead of only in act three.
   Card 1 now carries the de-duplicated tally beside the headline it corrects. */
PV.figures([
  ["", `${above} of ${rows.length}`, "published pairings out-pay their county",
   `one polymer industry in one county, ${D.meta.latest}. Counting each county once
    instead: ${dAbove} of ${dedup.length}.`],
  ["key", medPrem.toFixed(2) + "×", "median premium",
   "the middle pairing pays a fifth more than its county’s average job"],
  ["", `${usBelow} of ${rows.length}`, "pay under their own industry nationally",
   `the typical one about 12 percent less (${usMed.toFixed(2)}×). ${qBeatTrail} pairings
    are in both counts, which is how ${above} and ${usBelow} fit inside ${rows.length}.`],
  ["", money(medWage), "the middle pairing’s weekly wage",
   `about $${Math.round(medWage * 52 / 1000)},000 a year, averaged over that whole pairing
    rather than any one person’s pay`]
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
/* A paper plate behind an SVG label that must cross other ink (cost-scissors pattern).
   MEASURED, never counted from the string. The plate used to size itself `s.length * fs`
   — a guess about a face the shared sheet enlarges below 760px — and the two
   right-anchored call sites positioned themselves from that same guess. On the phone
   scatter it ran 18 units wider than the words it covered, which put the plate's left
   edge at x=-15.9 in a 375-unit box: ink in the page margin at 560, 640 and 700, while
   the label itself sat inside. Draw the text, read its rendered box, slip the rect in
   behind it. One call now does both, so the plate cannot disagree with its own label. */
const plated = (parent, s, a) => {
  const t = txt(parent, s, a);
  let bb = null;
  try { bb = t.getBBox(); } catch { /* no layout yet: ship the label unplated */ }
  if (bb && bb.width) parent.insertBefore(el("rect", {x: bb.x - 3, y: bb.y - 2,
    width: bb.width + 6, height: bb.height + 4, fill: "var(--paper)", opacity: .94,
    rx: 2}), t);
  return t;
};

/* DOT SIZE NEEDS A SCALE OR IT IS DECORATION. Both scatter-family charts encode employment
   as dot area, and a reader who can see that one dot is bigger than another still cannot
   say whether that gap is ten jobs or ten thousand. That gap carries weight on this page
   more than most: the lowest value on chart 1 rests on 30 paychecks. Key circles are drawn by
   the same rEmp() the marks use, so the key cannot drift from the encoding it explains. */
const SIZE_STEPS = [100, 1000, 5000];
function sizeKey(svg, x, y, mx, fs) {
  const lead = "dot size = jobs";
  txt(svg, lead, {x, y, class: "pv-labq"});
  let cx = x + lead.length * fs + 12;
  SIZE_STEPS.forEach(n => {
    const r = rEmp(n, mx), s = N(n);
    el("circle", {cx: cx + r, cy: y - 4, r, fill: GRAY}, svg);
    txt(svg, s, {x: cx + r * 2 + 5, y, class: "pv-labq"});
    cx += r * 2 + 5 + s.length * fs + 12;
  });
}

function drawPremium() { MOBILE.matches ? drawPremiumMobile() : drawPremiumDesktop(); }

function drawPremiumDesktop() {
  const {svg, W, m, w} = PV.chart("prem",
    {W: 1100, rows: rows.length, rowH: 22, m: {t: 78, r: 210, b: 56, l: 270}});
  const lo = Math.min(0.7, ...rows.map(r => r.vs_local_all)) - 0.02;
  /* THE LAST TICK SITS BEYOND THE LAST DOT. At 1.03 headroom the axis stopped labelling at
     2.0× while the top row plots at 2.09×, so the page's most-quoted value hung past every
     label it could be read against. 1.08 with seven requested ticks keeps the same 0.25
     step and adds a 2.25× tick, which brackets the data instead of ending inside it. */
  const hi = Math.max(...rows.map(r => r.vs_local_all)) * 1.08;
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  const h = rows.length * 22;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(lo, hi, 7),
    xfmt: fx, yt: [],
    xlab: "pays less than the county ←   1.0×   → pays more than the county"});
  /* A 51-row stack has ONE axis at the bottom, which left the top rows ~1,200px from any
     tick label — a value scale a reader cannot reach is not a scale. Repeat the tick row
     above the plot and run a hairline down each tick so every row sits on a readable grid. */
  const grid = el("g", {}, svg);
  ticks(lo, hi, 7).forEach(v => {
    el("line", {x1: xs(v), y1: m.t, x2: xs(v), y2: m.t + h, stroke: "var(--pv-grid)",
      "stroke-width": 1}, grid);
    txt(grid, fx(v), {x: xs(v), y: m.t - 32, class: "pv-tick", "text-anchor": "middle"});
  });
  const one = xs(1);
  el("line", {x1: one, y1: m.t - 8, x2: one, y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 2}, svg);
  txt(svg, "1.0×: pay matches the county’s average job", {x: one + 8, y: m.t - 14,
    class: "pv-lab", fill: "var(--hover)"});
  sizeKey(svg, 12, 24, 7.3, 6.9);
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
  /* BOTH ENDS OF THE HEADLINE RANGE ARE PRINTED AS RATIOS. The title claims pay runs from
     more than double the county average down to about three-quarters of it; the top end
     was printed three ways and the bottom end only as $853/wk, so half the claim was
     checkable and half had to be eyeballed off the axis. */
  bracket(0, 10, CAT[0]);
  lines(["All chemistry up here:", "chemicals, resin and paint",
         "hold the 11 largest", "premiums. Lake chemicals",
         `tops the page at ${top.vs_local_all.toFixed(2)}×,`,
         `${money(top.weekly_wage)}/wk.`], m.t + 18, CAT[0]);
  bracket(rows.length - 11, rows.length - 1, CAT[1]);
  lines(["All 11 that pay under", "their own county make",
         "plastics or rubber. The", "lowest, Stark rubber, is",
         `${bot.vs_local_all.toFixed(2)}× its county:`,
         `${money(bot.weekly_wage)}/wk on ${N(bot.emp)} jobs.`],
        m.t + (rows.length - 11) * 22 + 14, CAT[1]);
}

function drawPremiumMobile() {
  const m = {t: 40, r: 12, b: 46, l: 12}, W = 375, rowH = 36, headH = 44, bndH = 44;
  const H = m.t + headH + rows.length * rowH + bndH + m.b;
  const {svg} = PV.chart("prem", {W, H});
  const w = W - m.l - m.r;
  const lo = Math.min(0.7, ...rows.map(r => r.vs_local_all)) - 0.02;
  const hi = Math.max(...rows.map(r => r.vs_local_all)) * 1.08;
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  const one = xs(1);
  const yFor = i => m.t + headH + i * rowH + (i >= above ? bndH : 0);
  el("line", {x1: one, y1: m.t + 8, x2: one, y2: H - m.b, stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  txt(svg, "1.0×: same as the county", {x: one + 6, y: m.t + 2, class: "pv-labq",
    fill: "var(--hover)"});
  sizeKey(svg, m.l, 20, 5.4, 7.8);
  {
    const s = `Top 11 all chemistry. Lake: ${top.vs_local_all.toFixed(2)}×, ` +
      money(top.weekly_wage) + "/wk";
    plated(svg, s, {x: m.l, y: m.t + 28, class: "pv-labq", fill: CAT[0]});
  }
  rows.forEach((r, i) => {
    const g = el("g", SEL && dim(r) ? {opacity: .16} : {}, svg);
    const y = yFor(i);
    const lab = `${r.name} · ${SHORT[r.naics]}`;
    plated(g, lab, {x: m.l, y: y + 12, class: "pv-labq"});
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
    plated(svg, s, {x: m.l, y: yB - 8, class: "pv-labq"});
  }
  /* SIX TICKS, NOT FOUR. At four requested ticks this axis stepped by 0.5 and printed
     1.0 / 1.5 / 2.0 only: nothing was labelled below parity even though eleven rows sit
     there, and the top row (2.09×) was drawn past the last tick with no way to read it.
     Six requests land the same 0.25 step the desktop uses, so both ends of the range have
     a tick to sit against. */
  const ax = el("g", {}, svg);
  ticks(lo, hi, 7).forEach(v => {
    txt(ax, fx(v), {x: xs(v), y: H - m.b + 18, class: "pv-tick",
      "text-anchor": "middle"});
  });
  txt(svg, "← pays less than the county · pays more →",
    {x: m.l, y: H - 8, class: "pv-labq"});
}

/* ------------------------------------------------- chart 2: the national scatter */
function drawScatter() { MOBILE.matches ? drawScatterMobile() : drawScatterDesktop(); }

/* Headroom is set so the outermost TICK lands past the outermost DOT on both scales: at the
   old padding the axis stopped at 2.0× and 1.2× while Lake plots at 2.09× and Wayne at
   1.28×, which left the two dots the annotations name sitting past every label. */
function scDomains() {
  const xlo = Math.min(0.7, ...rows.map(r => r.vs_local_all)) - 0.02;
  const xhi = Math.max(...rows.map(r => r.vs_local_all)) * 1.08;
  const ylo = Math.min(...rows.map(r => r.vs_us)) - 0.04;
  const yhi = Math.max(...rows.map(r => r.vs_us)) * 1.10;
  return {xlo, xhi, ylo, yhi};
}

function drawScatterDesktop() {
  const {svg, m, w, h} = PV.chart("scat", {W: 1100, H: 540,
    m: {t: 50, r: 230, b: 64, l: 64}});
  const {xlo, xhi, ylo, yhi} = scDomains();
  const xs = v => m.l + ((v - xlo) / (xhi - xlo)) * w;
  const ys = v => m.t + h - ((v - ylo) / (yhi - ylo)) * h;
  /* A VERTICAL AXIS DOES NOT GET LEFT-RIGHT ARROWS. This label used to read
     "pays less than the industry nationally ← → pays more", set horizontally above a plot
     whose real horizontal axis uses the identical arrow idiom for a different variable, so
     one figure spent the same visual grammar on two meanings. Naive readers parsed it as a
     second left-right scale and went looking for the axis it belonged to. */
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: ticks(xlo, xhi, 7),
    yt: ticks(ylo, yhi, 5), xfmt: fx, yfmt: fx,
    xlab: "pays less than the county ←   → pays more than the county",
    ylab: "↑ up the chart: pays more than the same industry nationally"});
  el("line", {x1: xs(1), y1: m.t, x2: xs(1), y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  /* Set on TWO SHORT LINES so it ends before the vertical reference line at xs(1). Run as
     one line it crossed that line and rendered as "industry|nationally", which is where a
     naive reader stalled. Each reference line is now named by what crossing it means. */
  ["1.0×: above this line,", "pay beats the industry"].forEach((s, i) =>
    txt(svg, s, {x: m.l + 6, y: ys(1) - 42 + i * 16, class: "pv-labq",
      fill: "var(--hover)"}));
  txt(svg, "1.0×: right of it, beats the county", {x: xs(1) + 6, y: m.t + 14,
    class: "pv-labq", fill: "var(--hover)"});
  sizeKey(svg, m.l + 6, m.t + 44, 8.5, 6.9);
  /* THE FOURTH QUADRANT IS A FINDING, NOT AN OVERSIGHT. Three quadrants carried counts and
     the fourth carried nothing, so a reader who counted dots and found it empty could not
     tell whether that was the answer or a missing label. Nothing in the region pays under
     its own town while out-paying its own industry, and the empty corner is the only place
     on the chart with room to say so. */
  ["This corner is empty:", "0 pairings pay under", "their own town while",
   "beating their industry."].forEach((s, i) => txt(svg, s,
    {x: m.l + 6, y: m.t + 80 + i * 16, class: i ? "pv-labq" : "pv-lab"}));
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
    plated(svg, s1, {x: xs(1.06), y: ys(ylo + 0.03), class: "pv-lab"});
    const s2 = `Trails both · ${qNeither}`;
    plated(svg, s2, {x: xs(1) - 12, y: ys(ylo + 0.03), class: "pv-lab",
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
  /* Top margin is 84, not 62: the phone header now carries three rows (family key, dot-size
     key, axis reading) and at 62 the size key printed straight over the axis label. */
  const m = {t: 84, r: 14, b: 50, l: 44}, W = 375, H = 444;
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
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: ticks(xlo, xhi, 4),
    yt: ticks(ylo, yhi, 5), xfmt: fx,
    yfmt: fx, xlab: "← under town   ·   over town →",
    ylab: "↑ up: beats its industry"});
  /* The family key lives on chart 1's legend, roughly 3,000px up the phone scroll. A figure
     that has to be read where it sits carries its own. */
  {
    const ky = 24;
    el("circle", {cx: m.l + 5, cy: ky - 5, r: 5, fill: CAT[0]}, svg);
    txt(svg, "chemistry", {x: m.l + 15, y: ky, class: "pv-labq"});
    el("circle", {cx: m.l + 105, cy: ky - 5, r: 5, fill: PROD}, svg);
    txt(svg, "plastics & rubber", {x: m.l + 115, y: ky, class: "pv-labq"});
    sizeKey(svg, m.l, ky + 22, 5.5, 7.8);
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
    plated(svg, s1, {x: xs(1) + 6, y: ys(ylo + 0.02), class: "pv-labq"});
    const s2 = `trails both · ${qNeither}`;
    plated(svg, s2, {x: xs(1) - 6, y: m.t + h - 46, class: "pv-labq",
      "text-anchor": "end"});
    txt(svg, `beats both · ${qBoth}`, {x: xs(1) + 6, y: m.t + 12, class: "pv-labq"});
    /* The fourth quadrant, counted on the phone too. Plated because 375px leaves the
       empty corner narrower than the words, so the label crosses the reference line and
       the plate keeps the type readable where it does. */
    ["0 pairings", "in this corner"].forEach((s, i) =>
      plated(svg, s, {x: m.l + 4, y: m.t + 32 + i * 18, class: "pv-labq"}));
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
  /* +0.09 rather than +0.05 so the tick ladder reaches 1.5× and the top of the shaded band
     (1.46× at its widest year) has a label above it instead of running off past the last
     one. Six requested ticks hold the 0.1 step that the wider span would otherwise lose. */
  const hi = Math.max(...pts.map(p => p.q3)) + 0.09;
  const xs = y => m.l + ((y - years[0]) / (years.at(-1) - years[0])) * w;
  const ys = v => m.t + h - ((v - lo) / (hi - lo)) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys,
    xt: years.filter((_, i) => i % (mobile ? 3 : 2) === 0),
    yt: ticks(lo, hi, 6), xfmt: v => v, yfmt: v => v.toFixed(1) + "×",
    xlab: "", ylab: mobile ? "↑ up: above the county"
      : "↑ up: further above the county’s average job"});
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
    plated(svg, s, {x: xs(dip.year), y: ys(dip.med) + 20, class: "pv-labq",
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
   small to publish are absent, not zero: the
   ${[...new Set(D.latest_rows.map(r => r.naics))].length} tracked industries across
   ${counties.length} counties make
   ${[...new Set(D.latest_rows.map(r => r.naics))].length * counties.length} possible
   pairings, and ${rows.length} of them are published.`;
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
/* ------------------------------------------------------- the cold open, in the hero
   One dot per published pairing on one axis: the headline claim, drawn, before any
   explanation. Deliberately the SAME measure as the first band's chart and a poorer
   view of it (no county, no industry, no size), because its only job is to put the
   shape of the distribution in the first screen and hand the reader to the detail.

   It re-lays out at the breakpoint through drawAll, like every other chart here. The
   phone variant is NOT the desktop one scaled: at 700 units squeezed into a 350px
   column every label rendered at 7.5px, half the 12px floor. The narrow viewBox
   restores a ~1:1 scale, and the two readings stack instead of sitting on one row. */
function drawOpen() {
  const M = MOBILE.matches;
  const svg = document.getElementById("open");
  if (svg) {
    /* THE VIEWBOX IS SIZED TO THE TEXT RAIL, NOT THE FIGURE RAIL. Drawn at the site's
       980px figure width this strip started 151px left of the headline above it, which
       is the two-rail defect the house has one law against.

       AND IT IS SIZED IN MEASURED PIXELS, not authored units. The first version fixed it
       at 700 and 358, which held at 1440 and 390 and painted 10.9px labels at 768, where
       the rail is narrower than either. Measuring makes the render scale exactly 1.000 at
       every width, so a 15-unit label is 15 real pixels always. */
    const railW = Math.round((svg.parentElement || svg).getBoundingClientRect().width);
    const W = Math.max(300, railW || (M ? 358 : 700));
    const H = M ? 232 : 196;
    const m = M ? {t: 84, r: 10, b: 40, l: 10} : {t: 52, r: 16, b: 42, l: 16};
    const w = W - m.l - m.r;
    const LO = 0.7, HI = 2.2;
    const X = v => m.l + (Math.min(Math.max(v, LO), HI) - LO) / (HI - LO) * w;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    /* Keep the <title> and drop the previous render: drawAll re-runs this at the
       breakpoint, and appending would stack two swarms in one box. */
    [...svg.childNodes].slice(1).forEach(n => svg.removeChild(n));
    const NS = "http://www.w3.org/2000/svg";
    const mk = (t, a, p) => { const n = document.createElementNS(NS, t);
      for (const k in a) { if (a[k] == null) continue;
        if (k === "fill" || k === "stroke") n.style[k] = a[k]; else n.setAttribute(k, a[k]); }
      (p || svg).appendChild(n); return n; };
    const tx = (s, a) => { const n = mk("text", a); n.textContent = s; return n; };

    const CHEM = "#6FD9EC", PROD = "#F4A45E", LIME = "#B8D637";
    const base = m.t + (H - m.t - m.b) - 6, R = M ? 4 : 5;

    /* Axis ticks skip 1.0: parity gets the lime rule and its own label, and a grey tick
       under it would print the same number twice in two inks. */
    (M ? [1.2, 1.6, 2.0] : [0.8, 1.2, 1.6, 2.0]).forEach(v => {
      tx(v.toFixed(1) + "×", {x: X(v), y: H - 12, "text-anchor": "middle",
        "font-size": 15, "font-weight": 700, fill: "rgba(255,255,255,.62)"});
    });
    mk("line", {x1: m.l, y1: base + 11, x2: m.l + w, y2: base + 11,
      stroke: "rgba(255,255,255,.28)", "stroke-width": 1});

    /* parity, the one line the whole page argues about. It starts BELOW the legend row:
       drawn from the top it ran straight through the legend's second chip, because
       1.0× lands at x≈150 and that is where a left-aligned legend puts it. */
    mk("line", {x1: X(1), y1: M ? m.t + 12 : m.t - 2, x2: X(1), y2: base + 11,
      stroke: LIME, "stroke-width": 2});
    tx("1.0×", {x: X(1) - 7, y: H - 12, "text-anchor": "end",
      "font-size": 15, "font-weight": 700, fill: LIME});

    /* beeswarm: stack rather than overlap, so 51 dots stay countable */
    const placed = [];
    rows.map(r => ({x: X(r.vs_local_all), fam: FAM(r)}))
        .sort((a, b) => a.x - b.x)
        .forEach(p => {
          let lvl = 0;
          while (placed.some(q => q.lvl === lvl && Math.abs(q.x - p.x) < R * 2 + 1)) lvl++;
          placed.push({x: p.x, lvl});
          mk("circle", {cx: p.x, cy: base - lvl * (R * 2 + 1.5), r: R,
            fill: p.fam === "chem" ? CHEM : PROD, "fill-opacity": .95});
        });

    /* The reading sits ABOVE the swarm on two rows, clear of the axis: the first draft
       put "11 pay less" on the tick row and it printed straight through the 1.0× label. */
    tx(`${above} of ${rows.length} pay more`, M ? {x: m.l, y: 18,
        "font-size": 15, "font-weight": 700, fill: "#fff"}
      : {x: m.l + w, y: 18, "text-anchor": "end",
         "font-size": 15, "font-weight": 700, fill: "#fff"});
    tx(`${belowN} pay less than their county`, {x: m.l, y: M ? 40 : 18,
      "font-size": 15, "font-weight": 700, fill: "rgba(255,255,255,.8)"});
    /* Legend clears the parity rule rather than starting at the left margin; on the phone
       it takes its own two rows, because one row of both keys does not fit 358 units. */
    const lx = M ? m.l : X(1) + 26, ly = M ? 62 : 34;
    mk("circle", {cx: lx, cy: ly, r: 5, fill: CHEM});
    tx("chemistry side", {x: lx + 11, y: ly + 5, "font-size": 15, "font-weight": 700,
      fill: CHEM});
    mk("circle", {cx: M ? lx : lx + 128, cy: M ? ly + 22 : ly, r: 5, fill: PROD});
    tx("plastics and rubber", {x: (M ? lx : lx + 128) + 11, y: (M ? ly + 22 : ly) + 5,
      "font-size": 15, "font-weight": 700, fill: PROD});
  }

}

function drawAll() { drawOpen(); drawPremium(); drawScatter(); drawTrend(); }
drawAll();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);
/* A viewBox measured from the rail is stale the moment the rail changes, and the
   breakpoint listener above only fires at 760px. Debounced so a drag-resize does not
   redraw on every frame. */
{
  let t;
  addEventListener("resize", () => { clearTimeout(t); t = setTimeout(drawAll, 150); });
}

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
  definitions: `NAICS is the federal industry classification, and the
    ${[...new Set(D.latest_rows.map(r => r.naics))].length} industries tracked here are its
    codes 325 chemical manufacturing, 3252 resin and synthetic rubber, 3255 paint and
    coatings, 326 plastics and rubber products, 3261 plastics products, and 3262 rubber
    products. A covered job is one covered by unemployment insurance, which is what this
    census counts. Codes 325 and 326 are broad families holding the four others, and where
    both a family and its parts clear the disclosure threshold in a county the data publish
    the county at both levels, so one county can be counted twice and the ${rows.length}
    pairings are not ${rows.length} separate places. Counted once per county, at the finest
    industry detail published for it, ${dAbove} of ${dedup.length} pairings pay above their
    county average: ${pctDedup}%, against ${pctHead}% for the headline ${above} of
    ${rows.length}. Those ${dAbove} cover ${N(empAbove)} of the ${N(empTot)} jobs in that
    de-duplicated set.`});

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
      `Richland and Tuscarawas, so figures on this page cannot be compared with ` +
      `fourteen-county figures published elsewhere.`;
    h.parentNode.appendChild(p);
  }
}
})();
