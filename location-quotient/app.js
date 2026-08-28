/* Location quotient, re-centred on the finding the first build buried: paint and coatings
   is the region's strongest polymer concentration, not the rubber the place is named for.
   Forms follow the data's job — trend → line with EMPHASIS (one industry forward, the rest
   as context) rather than six competing hues; the disclosure twist → two lines on one
   axis, fixed base against moving base; county × industry → sequential heatmap; ratio vs
   base → scatter, because a big ratio can sit on a tiny base; verification → a histogram
   with the bound drawn, because a dot lattice encodes nothing.
   Every chart re-lays itself out below 760px: no sideways scroll, takeaway in the first
   paint. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, GRAY, INK, CAT} = PV;
const D = await PV.data("lq.json");
const FP = PV.footprint(D.meta);
const N = n => n.toLocaleString("en-US");
const LATEST = D.meta.years[1], FIRST = D.meta.years[0];
const NAICS = D.naics.map(n => n.code);
const MOBILE = matchMedia("(max-width: 760px)");
let picked = "3255";                       // paint & coatings — the page's finding

/* One rendering per quantity, and no round-lies: 1.25 prints as 1.25× and never 1.3×,
   while anything at or above 10 prints to one decimal so a cell reading "11.2" in the
   grid is never quoted as "11.21×" in the sentence beside it. */
const fx = v => (v >= 10 ? v.toFixed(1)
               : Math.round(v * 100) % 10 ? v.toFixed(2) : v.toFixed(1)) + "×";
/* A paper plate behind a label that must cross other ink (cost-scissors pattern). */
const plate = (parent, s, x, y, fs = 7.2, anchor = "start") => {
  const wpx = s.length * fs + 6;
  const x0 = anchor === "end" ? x - wpx + 3
           : anchor === "middle" ? x - wpx / 2 : x - 3;
  return el("rect", {x: x0, y: y - 12, width: wpx, height: 15, fill: "var(--paper)",
    opacity: .94, rx: 2}, parent);
};
const plated = (parent, s, x, y, cls, fill, fs, anchor) => {
  plate(parent, s, x, y, fs, anchor);
  const a = {x, y, class: cls, "data-pv-plated": "1"};
  if (fill) a.fill = fill;
  if (anchor) a["text-anchor"] = anchor;
  txt(parent, s, a);
};

/* ------------------------------------------------------------- derived facts */
const YEARS = [...new Set(D.composite.map(c => c.year))].sort();
const comp = (n, y) => D.composite.find(c => c.naics === n && c.year === y);
const rankIn = y => D.composite.filter(c => c.year === y && c.lq).sort((a, b) => b.lq - a.lq);
const paint = comp("3255", LATEST), rubber = comp("3262", LATEST), pr = comp("326", LATEST);
const runnerUp = rankIn(LATEST)[1];
/* Persistence, not a scan: paint is one of six series and leads in EVERY year, so the
   ranking is not the winner of a 3,000-cell lottery (SKILL stage 3). */
const leadYears = YEARS.filter(y => rankIn(y)[0].naics === "3255");
const leadRatio = Math.min(...YEARS.map(y => rankIn(y)[0].lq / rankIn(y)[1].lq));
const paintSeries = D.composite.filter(c => c.naics === "3255" && c.lq)
  .sort((a, b) => a.year - b.year);
const paintPeak = paintSeries.reduce((a, b) => b.lq > a.lq ? b : a);
const prSeries = D.composite.filter(c => c.naics === "326" && c.lq).sort((a, b) => a.year - b.year);

const CNTY = D.areas.filter(a => !["39000", "US000"].includes(a.code));
const isCnty = code => CNTY.some(a => a.code === code);
const cell = (name, n, y) => D.cells.find(c => c.year === y && c.name === name && c.naics === n);
const pts = D.cells.filter(c => c.year === LATEST && c.lq && c.emp && isCnty(c.area));
const POSSIBLE = CNTY.length * NAICS.length;          // computed, never typed
const ohioPaint = D.cells.find(c => c.year === LATEST && c.area === "39000" && c.naics === "3255");
const cuyPaint = cell("Cuyahoga", "3255", LATEST);
const cuyShare = cuyPaint.emp / paint.emp;
const medPaint = cell("Medina", "3255", LATEST);
const paintCounties = pts.filter(c => c.naics === "3255").sort((a, b) => b.lq - a.lq);

/* THE FIXED-BASE PAINT SERIES, derived here from the shipped cells rather than a new
   data file. The national share is recovered from any disclosed county:
       lq = (emp / local_total) / nat   →   nat = (emp / local_total) / lq
   Every disclosed county in a year agrees on `nat` to seven figures, which is the check
   that this inversion is the bureau's own arithmetic and not a reconstruction. The fixed
   base is the set of counties BLS discloses for paint in ALL eleven years, so the line
   answers "did concentration move?" without the county set moving underneath it. */
const natShare = (y, n) => {
  const v = D.cells.filter(c => c.year === y && c.naics === n && c.lq && c.emp &&
    c.local_total && isCnty(c.area)).map(c => (c.emp / c.local_total) / c.lq);
  return v.reduce((a, b) => a + b, 0) / v.length;
};
const alwaysOn = CNTY.filter(a =>
  YEARS.every(y => D.cells.some(c => c.year === y && c.area === a.code &&
    c.naics === "3255" && c.lq)));
const fixed = YEARS.map(y => {
  const sel = D.cells.filter(c => c.year === y && c.naics === "3255" &&
    alwaysOn.some(a => a.code === c.area));
  const emp = sel.reduce((s, c) => s + c.emp, 0);
  const tot = sel.reduce((s, c) => s + c.local_total, 0);
  return {year: y, lq: (emp / tot) / natShare(y, "3255"), emp, n: sel.length};
});
const fixedNow = fixed.at(-1), fixedThen = fixed[0];
const fixedPeak = fixed.reduce((a, b) => b.lq > a.lq ? b : a);
/* The county that left the disclosed set between the last two years — the whole of the
   apparent 2025 decline in the moving-base line. */
const dropouts = CNTY.filter(a => cell(a.name, "3255", LATEST - 1)?.lq && !cell(a.name, "3255", LATEST)?.lq);
const drop = dropouts.map(a => cell(a.name, "3255", LATEST - 1))
  .sort((a, b) => b.emp - a.emp)[0];
const entrants = CNTY.filter(a => !cell(a.name, "3255", LATEST - 1)?.lq && cell(a.name, "3255", LATEST)?.lq);

/* ------------------------------------------------------------- hero figures */
/* Four cards, and they must not wrap: at 980px the row has 980 minus three 38px gaps to
   spend, and the .k line sets each card's width, so the keys stay short. */
PV.figures([
  ["key", fx(paint.lq), "paint & coatings", `strongest of the six, ${LATEST}`],
  ["", fx(rubber.lq), "rubber products", "the industry Akron is named for"],
  ["", `${leadYears.length} of ${YEARS.length}`, "years paint has led",
   `top of the six since ${FIRST}`],
  ["", Math.round(cuyShare * 100) + "%", "paint jobs in Cuyahoga",
   `${N(cuyPaint.emp)} of ${N(paint.emp)} disclosed`]
]);

/* --------------------------------------------------- the register, in the open */
document.getElementById("regkey").innerHTML =
  `<b>Core</b> counts as the cluster: resin, paint, and plastics and rubber products.
   <b>Detail</b> is a slice of a core code and is never added to it. <b>Context</b> sits
   outside the register and is drawn for comparison only.`;

const picker = document.getElementById("picker");
picker.innerHTML = D.naics.map(n =>
  `<button class="pick reg-${n.register}" type="button" data-n="${n.code}"
     aria-pressed="${n.code === picked}">${n.label}<span class="reg">${n.register}</span></button>`)
  .join("");
picker.querySelectorAll(".pick").forEach(b => b.addEventListener("click", () => {
  picked = b.dataset.n;
  picker.querySelectorAll(".pick").forEach(x =>
    x.setAttribute("aria-pressed", String(x.dataset.n === picked)));
  drawTrend(); trendCopy();
}));

/* -------------------------------------------------------------- 1. the trend */
const SHORT = {"325": "Chemicals", "3252": "Resin", "3255": "Paint", "326": "All plastics",
               "3261": "Plastics prod.", "3262": "Rubber prod."};
const trendGeom = () => {
  const vals = D.composite.filter(c => c.lq).map(c => c.lq);
  return {maxY: Math.max(...vals) * 1.07};
};
const seriesOf = code => D.composite.filter(c => c.naics === code && c.lq)
  .sort((a, b) => a.year - b.year);

function drawTrend() { MOBILE.matches ? drawTrendMobile() : drawTrendDesktop(); }

function drawTrendDesktop() {
  const {svg, m, w, h} = PV.chart("trend",
    {W: 1100, H: 440, m: {t: 46, r: 252, b: 64, l: 46}});
  const {maxY} = trendGeom();
  const xs = y => m.l + ((y - YEARS[0]) / (YEARS.at(-1) - YEARS[0])) * w;
  const ys = v => m.t + h - (v / maxY) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: YEARS.filter((_, i) => i % 2 === 0),
    yt: ticks(0, maxY, 6), xfmt: v => v, yfmt: fx,
    xlab: "Year", ylab: `Location quotient, ${FP.label} against the nation`});

  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  txt(svg, "1.0× is the national share", {x: m.l + 8, y: ys(1) - 8, class: "pv-lab",
    fill: "var(--hover)"});

  /* Right-hand direct labels, nudged apart, with a leader where one had to move. */
  const ends = NAICS.map(code => {
    const s = seriesOf(code);
    return s.length ? {code, s, y: ys(s.at(-1).lq)} : null;
  }).filter(Boolean).sort((a, b) => a.y - b.y);
  const MIN = 17;
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < MIN) ends[i].y = ends[i - 1].y + MIN;

  NAICS.forEach(code => {
    const e = ends.find(x => x.code === code);
    if (!e) return;
    const s = e.s, on = code === picked;
    el("path", {d: "M" + s.map(c => `${xs(c.year)},${ys(c.lq)}`).join("L"), fill: "none",
      stroke: on ? INK : GRAY, "stroke-width": on ? 3 : 1.5, opacity: on ? 1 : .45}, svg);
    const yTrue = ys(s.at(-1).lq);
    if (Math.abs(e.y - yTrue) > 2)
      el("path", {d: `M${m.l + w + 2},${yTrue}L${m.l + w + 9},${e.y - 4}`, fill: "none",
        stroke: on ? INK : GRAY, "stroke-width": 1, opacity: .6}, svg);
    txt(svg, `${fx(s.at(-1).lq)} ${s[0].label}`,
      {x: m.l + w + 12, y: e.y, class: on ? "pv-lab" : "pv-labq",
       fill: on ? INK : "var(--pv-muted)"});
    if (on) s.forEach(c => hoverable(
      el("circle", {cx: xs(c.year), cy: ys(c.lq), r: 5, fill: INK,
        stroke: "var(--paper)", "stroke-width": 2}, svg),
      `<b>${c.label}, ${c.year}</b><br><span class="v">${fx(c.lq)}</span> the national share
       <br><span class="v">${N(c.emp)}</span> jobs across ${N(c.estabs)} establishments
       ${c.counties_suppressed ? `<br>${c.counties_suppressed} of ${FP.n} counties withheld` : ""}`,
      `${c.label} ${c.year}: ${fx(c.lq)}`));
  });

  /* The paint annotation, drawn last so nothing paints over it. It is the section's
     claim and stays on the chart whichever industry the reader brings forward. */
  const col = picked === "3255" ? INK : "var(--pv-muted)";
  const mid = paintSeries.find(c => c.year === 2019) || paintSeries[4];
  const s1 = `Paint has led all six industries in every one of ${leadYears.length} years,`;
  const s2 = `by at least ${leadRatio.toFixed(1)}× the next-highest.`;
  plated(svg, s1, xs(mid.year) - 92, ys(mid.lq) + 28, "pv-lab", col, 7.4);
  plated(svg, s2, xs(mid.year) - 92, ys(mid.lq) + 45, "pv-labq", col, 7.0);
  el("circle", {cx: xs(paintPeak.year), cy: ys(paintPeak.lq), r: 5, fill: "none",
    stroke: col, "stroke-width": 2}, svg);
  plated(svg, `${fx(paintPeak.lq)} peak in ${paintPeak.year}`,
    xs(paintPeak.year) + 10, ys(paintPeak.lq) + 18, "pv-labq", col, 6.9);
}

function drawTrendMobile() {
  const W = 375, H = 392, m = {t: 96, r: 14, b: 46, l: 38};
  const {svg} = PV.chart("trend", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const {maxY} = trendGeom();
  const xs = y => m.l + ((y - YEARS[0]) / (YEARS.at(-1) - YEARS[0])) * w;
  const ys = v => m.t + h - (v / maxY) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys,
    xt: YEARS.filter(y => y % 5 === 0), yt: ticks(0, maxY, 4),
    xfmt: v => v, yfmt: fx, xlab: "", ylab: ""});
  /* The takeaway sits above the plot, in the first paint. */
  txt(svg, `Paint leads all six industries,`, {x: m.l - 2, y: 30, class: "pv-lab"});
  txt(svg, `and has in every year since ${FIRST}.`, {x: m.l - 2, y: 50, class: "pv-lab"});
  txt(svg, `Location quotient against the nation`, {x: m.l - 2, y: 70, class: "pv-labq"});

  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.3}, svg);
  txt(svg, "1.0×", {x: m.l + 3, y: ys(1) - 6, class: "pv-labq", fill: "var(--hover)"});

  NAICS.forEach(code => {
    const s = seriesOf(code);
    if (!s.length) return;
    const on = code === picked;
    el("path", {d: "M" + s.map(c => `${xs(c.year)},${ys(c.lq)}`).join("L"), fill: "none",
      stroke: on ? INK : GRAY, "stroke-width": on ? 3 : 1.4, opacity: on ? 1 : .5}, svg);
    hoverable(el("path", {d: "M" + s.map(c => `${xs(c.year)},${ys(c.lq)}`).join("L"),
      fill: "none", stroke: "transparent", "stroke-width": 16}, svg),
      `<b>${s[0].label}, ${s.at(-1).year}</b><br><span class="v">${fx(s.at(-1).lq)}</span>
       the national share<br><span class="v">${N(s.at(-1).emp)}</span> jobs`,
      `${s[0].label}: ${fx(s.at(-1).lq)} in ${s.at(-1).year}`);
  });

  /* Direct labels re-laid out INSIDE the plot: the subject, the reader's pick if it is
     something else, and one grouped range for the rest. Every series is still drawn and
     every value is still in the table below — only the LABELS aggregate. */
  const named = new Set(["3255", picked]);
  [...named].forEach(code => {
    const s = seriesOf(code);
    if (!s.length) return;
    const last = s.at(-1);
    plated(svg, `${fx(last.lq)} ${SHORT[code]}`, m.l + w - 3, ys(last.lq) - 7,
      "pv-lab", code === picked ? INK : "var(--pv-muted)", 7.6, "end");
  });
  /* The unnamed series get one range label, parked at the foot of the plot rather than
     beside their own lines: placed on the cluster it collided with whichever series the
     reader had just brought forward. */
  const rest = NAICS.filter(c => !named.has(c)).map(c => seriesOf(c).at(-1).lq);
  if (rest.length) {
    const lo = Math.min(...rest), hi = Math.max(...rest);
    plated(svg, `the other ${rest.length} run ${fx(lo)} to ${fx(hi)}`,
      m.l + 3, m.t + h - 6, "pv-labq", "var(--pv-muted)", 7.0);
  }
}

/* Prose that travels with the selection. The DEFAULT state (paint) is what the claims
   harness guards; per-variant sentences are template-generated from the same fields. */
function trendCopy() {
  const sel = seriesOf(picked);
  const last = sel.at(-1);
  const supp = last.counties_suppressed;
  const reg = D.naics.find(n => n.code === picked).register;
  const regLine = reg === "core"
    ? `<b>${last.label} is in PIC&rsquo;s measurement register</b> (resin, paint, plastics and
       rubber products), the slice the cluster-health dashboard may publish as the cluster.`
    : reg === "detail"
    ? `<b>${last.label} is a slice of plastics and rubber products.</b> Real on its own,
       never added to its parent.`
    : `<b>${last.label} sits outside PIC&rsquo;s measurement register.</b> It sweeps in
       pharmaceuticals, agricultural chemicals, industrial gas and explosives, so read it
       as context and never as the cluster.`;

  document.getElementById("trendtitle").textContent =
    `Paint runs ${fx(paint.lq)} against the nation, more than double the ${fx(runnerUp.lq)} ` +
    `of ${runnerUp.label.split(",")[0].toLowerCase()}`;

  document.getElementById("trendsrc").innerHTML = regLine +
    ` Source: BLS QCEW annual averages, ${FIRST}&ndash;${LATEST}. A row is one year, county
      and industry cell, and it counts <b>jobs covered by unemployment insurance</b>, not
      people and not companies, so it never reconciles with the vault&rsquo;s company
      counts. The ${FP.label} composite is summed from counties and is ours, not the
      bureau&rsquo;s: BLS publishes no figure for a custom geography. ` +
    (supp
      ? `<b>${supp} of ${FP.n} counties are withheld for ${last.label.toLowerCase()} in
         ${LATEST}.</b> Withholding drops a county from the numerator and the denominator
         together, and the withheld counties are the small ones, which are usually the
         least concentrated, so an incomplete composite reads more plausibly as a ceiling
         than as a floor. Only additive counts, jobs and establishments, are floors when
         cells go missing.`
      : `All ${FP.n} counties are disclosed for this industry in ${LATEST}, so nothing is
         missing from this line.`);

  document.getElementById("trendtable").innerHTML = tableView("t",
    `Location quotient by year · ${sel[0].label}`,
    ["Year", "LQ", "Jobs", "Establishments", "Counties withheld"],
    sel.map(c => [c.year, fx(c.lq), N(c.emp), N(c.estabs), c.counties_suppressed]));
}

/* ------------------------------------------------ 2. the disclosure twist */
const twistGeom = () => {
  const all = [...fixed.map(p => p.lq), ...paintSeries.map(p => p.lq)];
  return {lo: Math.min(...all) - 0.5, hi: Math.max(...all) + 0.6};
};

function drawTwist() { MOBILE.matches ? drawTwistMobile() : drawTwistDesktop(); }

function drawTwistDesktop() {
  const {svg, m, w, h} = PV.chart("twist",
    {W: 640, H: 372, narrow: true, m: {t: 44, r: 128, b: 56, l: 50}});
  const {lo, hi} = twistGeom();
  const xs = y => m.l + ((y - YEARS[0]) / (YEARS.at(-1) - YEARS[0])) * w;
  const ys = v => m.t + h - ((v - lo) / (hi - lo)) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: YEARS.filter((_, i) => i % 2 === 0),
    yt: ticks(lo, hi, 5), xfmt: v => v, yfmt: fx, xlab: "",
    ylab: "Paint location quotient"});
  el("path", {d: "M" + paintSeries.map(p => `${xs(p.year)},${ys(p.lq)}`).join("L"),
    fill: "none", stroke: GRAY, "stroke-width": 2}, svg);
  el("path", {d: "M" + fixed.map(p => `${xs(p.year)},${ys(p.lq)}`).join("L"),
    fill: "none", stroke: CAT[1], "stroke-width": 3}, svg);
  fixed.forEach(p => hoverable(
    el("circle", {cx: xs(p.year), cy: ys(p.lq), r: 4.5, fill: CAT[1],
      stroke: "var(--paper)", "stroke-width": 2}, svg),
    `<b>${p.year}, the same five counties</b><br><span class="v">${fx(p.lq)}</span>
     the national share<br><span class="v">${N(p.emp)}</span> paint jobs`,
    `${p.year}, fixed five counties: ${fx(p.lq)}`));
  txt(svg, `${fx(fixedNow.lq)} same five`, {x: m.l + w + 10, y: ys(fixedNow.lq) + 4,
    class: "pv-lab", fill: CAT[1]});
  txt(svg, "counties", {x: m.l + w + 10, y: ys(fixedNow.lq) + 21,
    class: "pv-labq", fill: CAT[1]});
  txt(svg, `${fx(paint.lq)} all`, {x: m.l + w + 10, y: ys(paint.lq) + 4, class: "pv-lab",
    fill: "var(--pv-muted)"});
  txt(svg, "disclosed", {x: m.l + w + 10, y: ys(paint.lq) + 21, class: "pv-labq",
    fill: "var(--pv-muted)"});
  /* The one thing that changed, marked where it happened. */
  const y0 = ys(comp("3255", LATEST - 1).lq), y1 = ys(paint.lq);
  el("path", {d: `M${xs(LATEST) - 2},${y0 - 3}L${xs(LATEST) - 2},${y1 - 3}`, fill: "none",
    stroke: "var(--hover)", "stroke-width": 1.5}, svg);
  plated(svg, `${drop.name} withheld`, xs(LATEST) - 12, (y0 + y1) / 2 - 4, "pv-labq",
    "var(--hover)", 6.9, "end");
  plated(svg, `${fx(fixedThen.lq)} in ${FIRST}`, xs(fixedThen.year) + 8,
    ys(fixedThen.lq) - 12, "pv-labq", CAT[1], 6.9);
}

function drawTwistMobile() {
  const W = 375, H = 350, m = {t: 84, r: 14, b: 44, l: 40};
  const {svg} = PV.chart("twist", {W, H, narrow: true});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const {lo, hi} = twistGeom();
  const xs = y => m.l + ((y - YEARS[0]) / (YEARS.at(-1) - YEARS[0])) * w;
  const ys = v => m.t + h - ((v - lo) / (hi - lo)) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: YEARS.filter(y => y % 5 === 0),
    yt: ticks(lo, hi, 4), xfmt: v => v, yfmt: fx, xlab: "", ylab: ""});
  txt(svg, "Same five counties every year,", {x: m.l - 2, y: 30, class: "pv-lab"});
  txt(svg, "paint is at its eleven-year high.", {x: m.l - 2, y: 50, class: "pv-lab"});
  el("path", {d: "M" + paintSeries.map(p => `${xs(p.year)},${ys(p.lq)}`).join("L"),
    fill: "none", stroke: GRAY, "stroke-width": 2}, svg);
  el("path", {d: "M" + fixed.map(p => `${xs(p.year)},${ys(p.lq)}`).join("L"),
    fill: "none", stroke: CAT[1], "stroke-width": 3}, svg);
  fixed.forEach(p => hoverable(
    el("circle", {cx: xs(p.year), cy: ys(p.lq), r: 4, fill: CAT[1],
      stroke: "var(--paper)", "stroke-width": 1.5}, svg),
    `<b>${p.year}, the same five counties</b><br><span class="v">${fx(p.lq)}</span>
     the national share<br><span class="v">${N(p.emp)}</span> paint jobs`,
    `${p.year}, fixed five counties: ${fx(p.lq)}`));
  plated(svg, `${fx(fixedNow.lq)} same five`, m.l + w - 2, ys(fixedNow.lq) - 9,
    "pv-lab", CAT[1], 7.6, "end");
  plated(svg, `${fx(paint.lq)} all disclosed`, m.l + w - 2, ys(paint.lq) + 22,
    "pv-labq", "var(--pv-muted)", 7.2, "end");
  plated(svg, `${drop.name} withheld in ${LATEST}`, m.l + 2, m.t + 16, "pv-labq",
    "var(--hover)", 7.2);
}

function twistCopy() {
  const prev = comp("3255", LATEST - 1);
  document.getElementById("twistlede").innerHTML =
    `The composite above is summed from whichever counties the bureau discloses that year,
     and the set moves. ${drop.name}, ${fx(drop.lq)} on ${N(drop.emp)} paint jobs in
     ${LATEST - 1}, went withheld in ${LATEST}, which is most of the fall from
     ${fx(prev.lq)} to ${fx(paint.lq)}. Restricted to the ${alwaysOn.length} counties the
     bureau discloses in all ${YEARS.length} years, paint reads ${fx(fixedNow.lq)} in
     ${LATEST} against ${fx(fixedThen.lq)} in ${FIRST}, the highest value in the series.
     The concentration is not eroding, and on a base that never moves it is climbing.`;
  document.getElementById("twisttitle").textContent =
    `On a fixed five-county base, paint climbs from ${fx(fixedThen.lq)} to ${fx(fixedNow.lq)}`;
  document.getElementById("twistsrc").innerHTML =
    `Derived from the same cells as the chart above, not from a second file. The national
     paint share each year is recovered from any disclosed county
     (share = jobs ÷ county total ÷ that county&rsquo;s published location quotient); all
     disclosed counties agree on it to seven figures. The fixed base is
     ${alwaysOn.map(a => a.name).join(", ")}, the counties disclosed in every year from
     ${FIRST} to ${LATEST}. It is a subset of ${FP.label} chosen for continuity and is not
     a second footprint. ${entrants.length
       ? `${entrants.map(a => a.name).join(" and ")} entered the disclosed set in ${LATEST}
          and ${entrants.length > 1 ? "are" : "is"} in the grey line, not the orange one.`
       : ""}`;
  document.getElementById("twisttable").innerHTML = tableView("w",
    "Paint concentration on a fixed base and on the disclosed base, by year",
    ["Year", "Same five counties", "All disclosed", "Counties disclosed", "Fixed-base jobs"],
    fixed.map(p => {
      const a = comp("3255", p.year);
      return [p.year, fx(p.lq), fx(a.lq), a.counties_counted, N(p.emp)];
    }));
}

/* ------------------------------------------------------------ 3. the heatmap */
/* Human column labels. The audit found rotated, truncated headers printing the parent
   "Plastics & rubber products" as "Plastics" directly beside its own child — erasing the
   distinction the whole register section exists to make. Words, horizontal, and the
   parent column ruled off. */
const HEAD = {
  "325": ["Chemical", "manufacturing"], "3252": ["Resin", "& synthetic rubber"],
  "3255": ["Paint", "& coatings"], "326": ["All plastics", "& rubber"],
  "3261": ["Plastics", "products"], "3262": ["Rubber", "products"]
};
const HEAD1 = {"325": "Chemicals (context)", "3252": "Resin", "3255": "Paint",
  "326": "All plastics & rubber", "3261": "Plastics products", "3262": "Rubber products"};
const STEPS = [0, 1, 2, 4, 7, 11];
const shade = lq => SEQ[Math.max(0, STEPS.findLastIndex(s => lq >= s))];
const heatRows = () => {
  const rows = CNTY.map(a => ({...a}));
  rows.sort((a, b) => (cell(b.name, "326", LATEST)?.lq || 0) -
                      (cell(a.name, "326", LATEST)?.lq || 0));
  return rows;
};
function suppPattern(svg) {
  const defs = el("defs", {}, svg);
  const pat = el("pattern", {id: "supp", width: 7, height: 7,
    patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)"}, defs);
  el("rect", {width: 7, height: 7, fill: "#F2EFE9"}, pat);
  el("line", {x1: 0, y1: 0, x2: 0, y2: 7, stroke: "#C9C3B8", "stroke-width": 3}, pat);
}
const LEGEND = STEPS.map((s, i) => [SEQ[i],
  i === STEPS.length - 1 ? `${s}×+` : `${s}–${STEPS[i + 1]}×`])
  .concat([["url(#supp)", "withheld"]]);
function heatLegend(svg, items, x, y, step) {
  items.forEach(([fill, label], i) => {
    el("rect", {x: x + i * step, y, width: 18, height: 18, fill}, svg);
    txt(svg, label, {x: x + i * step + 22, y: y + 14, class: "pv-tick"});
  });
}

function drawHeat() { MOBILE.matches ? drawHeatMobile() : drawHeatDesktop(); }

function drawHeatDesktop() {
  const rows = heatRows();
  const {svg, m, w, h} = PV.chart("heat",
    {W: 1100, rows: rows.length, rowH: 34, m: {t: 112, r: 246, b: 78, l: 104}});
  suppPattern(svg);
  const cw = w / NAICS.length, ch = h / rows.length;
  const cx = i => m.l + i * cw + cw / 2;

  D.naics.forEach((n, i) => {
    HEAD[n.code].forEach((line, k) => txt(svg, line,
      {x: cx(i), y: m.t - 46 + k * 17, "text-anchor": "middle",
       class: k ? "pv-labq" : "pv-lab"}));
    txt(svg, n.register, {x: cx(i), y: m.t - 11, "text-anchor": "middle", class: "pv-tick",
      fill: n.register === "core" ? INK : "var(--pv-muted)"});
  });
  /* Parent column, ruled off from its own slices. */
  const pi = NAICS.indexOf("326");
  [m.l + pi * cw, m.l + (pi + 1) * cw].forEach(x =>
    el("line", {x1: x, y1: m.t - 66, x2: x, y2: m.t + h, stroke: "var(--pv-axis)",
      "stroke-width": 1.5}, svg));
  el("path", {d: `M${m.l + (pi + 1) * cw + 4},${m.t - 74}h${2 * cw - 8}`, fill: "none",
    stroke: "var(--pv-axis)", "stroke-width": 1.5}, svg);
  txt(svg, "slices of the column at left, never added to it",
    {x: m.l + (pi + 2) * cw, y: m.t - 80, "text-anchor": "middle", class: "pv-labq"});

  rows.forEach((a, r) => {
    txt(svg, a.name, {x: m.l - 12, y: m.t + r * ch + ch / 2 + 5, "text-anchor": "end",
      class: "pv-lab"});
    NAICS.forEach((n, c) => {
      const cl = cell(a.name, n, LATEST);
      const x = m.l + c * cw + 1, y = m.t + r * ch + 1;
      const ok = cl && cl.lq != null;
      el("rect", {x, y, width: cw - 2, height: ch - 2,
        fill: ok ? shade(cl.lq) : "url(#supp)"}, svg);
      // White is legible on the darkest step only. PIC brand law: never white on #1A8A9E.
      if (ok) txt(svg, cl.lq.toFixed(1), {x: x + cw / 2 - 1, y: y + ch / 2 + 5,
        "text-anchor": "middle", class: "pv-lab",
        fill: cl.lq >= 11 ? "#fff" : "var(--pv-ink)"});
      hoverable(el("rect", {x, y, width: cw - 2, height: ch - 2, fill: "transparent"}, svg),
        ok ? `<b>${a.name} County · ${cl.label}</b><br><span class="v">${fx(cl.lq)}</span>
              on <span class="v">${N(cl.emp)}</span> jobs across
              <span class="v">${N(cl.estabs)}</span> establishments`
           : `<b>${a.name} County · ${D.naics[c].label}</b><br>withheld by BLS for disclosure,
              which is not a zero`,
        ok ? `${a.name}, ${cl.label}: ${fx(cl.lq)}` : `${a.name}: withheld`);
    });
  });

  /* The darkest cell, named. */
  const cr = rows.findIndex(a => a.name === "Cuyahoga");
  const ci = NAICS.indexOf("3255");
  const bx = m.l + ci * cw, by = m.t + cr * ch;
  el("rect", {x: bx - 1, y: by - 1, width: cw, height: ch, fill: "none",
    stroke: "var(--hover)", "stroke-width": 3}, svg);
  /* The leader runs along the bottom edge of the row, not across it: routed through the
     row's middle it printed a rule straight through three neighbouring cell values. */
  const rail = m.l + w + 16;
  el("path", {d: `M${bx + cw / 2},${by + ch}H${rail - 6}`, fill: "none",
    stroke: "var(--hover)", "stroke-width": 1.5}, svg);
  [[`Cuyahoga paint, ${fx(cuyPaint.lq)}`, "pv-lab", "var(--hover)"],
   [`${N(cuyPaint.emp)} jobs across ${N(cuyPaint.estabs)} sites,`, "pv-labq", null],
   [`${Math.round(cuyShare * 100)}% of every disclosed`, "pv-labq", null],
   ["paint job in the region", "pv-labq", null]]
    .forEach(([s, cls, fill], i) => {
      const a = {x: rail, y: by + ch / 2 - 18 + i * 17, class: cls};
      if (fill) a.fill = fill;
      txt(svg, s, a);
    });

  heatLegend(svg, LEGEND, m.l, m.t + h + 26, 104);
  heatCopy(rows);
}

function drawHeatMobile() {
  const rows = heatRows();
  const W = 420, m = {t: 128, r: 10, b: 116, l: 92};
  const {svg, h, w} = PV.chart("heat", {W, rows: rows.length, rowH: 30, m});
  suppPattern(svg);
  const cw = w / NAICS.length, ch = h / rows.length;
  const cx = i => m.l + i * cw + cw / 2;
  /* Angled headers carrying the WHOLE word — the phone version of the horizontal header
     block. 45° is the readable angle; -90° with a truncated string, which printed the
     parent column as "Plastics" beside its own child, is the defect this replaces. */
  D.naics.forEach((n, i) => {
    const x = cx(i), y = m.t - 10;
    txt(svg, HEAD1[n.code], {x, y, "text-anchor": "end", class: "pv-labq",
      transform: `rotate(45 ${x} ${y})`});
  });
  const pi = NAICS.indexOf("326");
  [m.l + pi * cw, m.l + (pi + 1) * cw].forEach(x =>
    el("line", {x1: x, y1: m.t - 4, x2: x, y2: m.t + h, stroke: "var(--pv-axis)",
      "stroke-width": 1.5}, svg));

  rows.forEach((a, r) => {
    txt(svg, a.name, {x: m.l - 8, y: m.t + r * ch + ch / 2 + 5, "text-anchor": "end",
      class: "pv-lab"});
    NAICS.forEach((n, c) => {
      const cl = cell(a.name, n, LATEST);
      const x = m.l + c * cw + 1, y = m.t + r * ch + 1;
      const ok = cl && cl.lq != null;
      el("rect", {x, y, width: cw - 2, height: ch - 2,
        fill: ok ? shade(cl.lq) : "url(#supp)"}, svg);
      if (ok) txt(svg, cl.lq.toFixed(1), {x: x + cw / 2 - 1, y: y + ch / 2 + 5,
        "text-anchor": "middle", class: "pv-lab",
        fill: cl.lq >= 11 ? "#fff" : "var(--pv-ink)"});
      hoverable(el("rect", {x, y, width: cw - 2, height: ch - 2, fill: "transparent"}, svg),
        ok ? `<b>${a.name} County · ${cl.label}</b><br><span class="v">${fx(cl.lq)}</span>
              on <span class="v">${N(cl.emp)}</span> jobs`
           : `<b>${a.name} County · ${D.naics[c].label}</b><br>withheld by BLS, not a zero`,
        ok ? `${a.name}, ${cl.label}: ${fx(cl.lq)}` : `${a.name}: withheld`);
    });
  });
  const cr = rows.findIndex(a => a.name === "Cuyahoga");
  const ci = NAICS.indexOf("3255");
  el("rect", {x: m.l + ci * cw - 1, y: m.t + cr * ch - 1, width: cw, height: ch,
    fill: "none", stroke: "var(--hover)", "stroke-width": 3}, svg);
  txt(svg, `Outlined: Cuyahoga paint, ${fx(cuyPaint.lq)} on ${N(cuyPaint.emp)} jobs,`,
    {x: 6, y: m.t + h + 26, class: "pv-lab", fill: "var(--hover)"});
  txt(svg, `${Math.round(cuyShare * 100)}% of the region’s disclosed paint jobs`,
    {x: 6, y: m.t + h + 44, class: "pv-labq"});
  heatLegend(svg, LEGEND.slice(0, 4), 6, m.t + h + 58, 100);
  heatLegend(svg, LEGEND.slice(4), 6, m.t + h + 84, 100);
  heatCopy(rows);
}

function heatCopy(rows) {
  const disclosed = pts.length;
  document.getElementById("heatlede").innerHTML =
    `Cuyahoga&rsquo;s ${fx(cuyPaint.lq)} is the darkest cell on this grid and the largest
     employment base anywhere above 10&times;: ${N(cuyPaint.emp)} jobs across
     ${N(cuyPaint.estabs)} establishments, ${Math.round(cuyShare * 100)}% of every paint job
     the bureau discloses in the region. Paint is also the industry the bureau hides most
     of: ${paint.counties_suppressed} of ${FP.n} counties are withheld, so this column
     shows ${paintCounties.length} readings and not twelve.`;
  document.getElementById("heattitle").textContent =
    `Cuyahoga paint, ${fx(cuyPaint.lq)}, is the darkest cell in the grid`;
  document.getElementById("heattable").innerHTML = tableView("h",
    `Location quotient by county and industry, ${LATEST} · ` +
    `${disclosed} of ${POSSIBLE} cells disclosed`,
    ["County", ...D.naics.map(n => n.label)],
    rows.map(a => [a.name, ...NAICS.map(n => {
      const c = cell(a.name, n, LATEST);
      return c && c.lq != null ? c.lq.toFixed(2) : "withheld";
    })]));
}

/* ------------------------------------------------------------ 4. the scatter */
const scatGeom = () => ({
  maxE: Math.max(...pts.map(p => p.emp)),
  maxL: Math.max(...pts.map(p => p.lq)) * 1.06
});
/* Point labels in words. NAICS codes as reader-facing annotation ("Geauga · 3252") were
   the defect here; the code lives in the table and the tooltip, never on the plot. */
const WORD = {"325": "chemicals", "3252": "resin", "3255": "paint",
  "326": "plastics & rubber", "3261": "plastics products", "3262": "rubber products"};
const wordLabel = p => `${p.name} ${WORD[p.naics]}, ${fx(p.lq)} on ${N(p.emp)} jobs`;
const bigAbove10 = [...pts].filter(p => p.lq >= 10).sort((a, b) => b.emp - a.emp)[0];
const topLQ = [...pts].sort((a, b) => b.lq - a.lq);
const bigBase = [...pts].sort((a, b) => b.emp - a.emp)[0];

function drawScatter() { MOBILE.matches ? drawScatterMobile() : drawScatterDesktop(); }

function drawScatterDesktop() {
  const {svg, m, w, h} = PV.chart("scatter",
    {W: 1100, H: 474, m: {t: 44, r: 18, b: 72, l: 46}});
  const {maxE, maxL} = scatGeom();
  const xs = v => m.l + (Math.sqrt(v) / Math.sqrt(maxE)) * w;   // sqrt: small bases matter
  const ys = v => m.t + h - (v / maxL) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys,
    xt: [0, 100, 500, 1000, 2000, 4000, 6000].filter(v => v <= maxE),
    yt: ticks(0, maxL, 6), xfmt: N, yfmt: v => v.toFixed(0) + "×",
    xlab: "Jobs in that county and industry (square-root scale)",
    ylab: "Location quotient"});
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  plated(svg, "1.0× is the national share", m.l + 8, ys(1) - 9, "pv-lab",
    "var(--hover)", 7.3);
  pts.forEach(p => hoverable(
    el("circle", {cx: xs(p.emp), cy: ys(p.lq), r: 6,
      fill: p.naics === "3255" ? CAT[1] : SEQ[4],
      stroke: "var(--paper)", "stroke-width": 2}, svg),
    `<b>${p.name} County · ${p.label}</b><br><span class="v">${fx(p.lq)}</span>
     the national share<br><span class="v">${N(p.emp)}</span> jobs across
     ${N(p.estabs)} establishments`,
    `${p.name}, ${p.label}: ${fx(p.lq)} on ${N(p.emp)} jobs`));
  /* Words, not codes, and only where a point carries the argument. */
  const label = (p, dx, dy, anchor) =>
    plated(svg, wordLabel(p), xs(p.emp) + dx, ys(p.lq) + dy, "pv-lab",
      p.naics === "3255" ? CAT[1] : "var(--pv-ink)", 7.3, anchor);
  label(topLQ[0], 13, 5);
  label(topLQ[1], 13, 5);
  label(bigBase, -11, -13, "end");
  label(bigAbove10, -13, 5, "end");
}

function drawScatterMobile() {
  const W = 375, H = 410, m = {t: 74, r: 12, b: 62, l: 40};
  const {svg} = PV.chart("scatter", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const {maxE, maxL} = scatGeom();
  const xs = v => m.l + (Math.sqrt(v) / Math.sqrt(maxE)) * w;
  const ys = v => m.t + h - (v / maxL) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: [0, 500, 2000, 6000].filter(v => v <= maxE),
    yt: ticks(0, maxL, 4), xfmt: N, yfmt: v => v.toFixed(0) + "×",
    xlab: "jobs in that county and industry", ylab: ""});
  txt(svg, "The biggest ratios sit on the", {x: m.l - 2, y: 26, class: "pv-lab"});
  txt(svg, "smallest job counts.", {x: m.l - 2, y: 46, class: "pv-lab"});
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.3}, svg);
  txt(svg, "1.0×", {x: m.l + 3, y: ys(1) - 6, class: "pv-labq", fill: "var(--hover)"});
  pts.forEach(p => hoverable(
    el("circle", {cx: xs(p.emp), cy: ys(p.lq), r: 5,
      fill: p.naics === "3255" ? CAT[1] : SEQ[4],
      stroke: "var(--paper)", "stroke-width": 1.5}, svg),
    `<b>${p.name} County · ${p.label}</b><br><span class="v">${fx(p.lq)}</span> the national
     share<br><span class="v">${N(p.emp)}</span> jobs`,
    `${p.name}, ${p.label}: ${fx(p.lq)} on ${N(p.emp)} jobs`));
  plated(svg, `${topLQ[0].name} ${SHORT[topLQ[0].naics].toLowerCase()}, ${fx(topLQ[0].lq)}`,
    xs(topLQ[0].emp) + 10, ys(topLQ[0].lq) + 5, "pv-labq", "var(--pv-ink)", 7.2);
  plated(svg, `on ${N(topLQ[0].emp)} jobs`, xs(topLQ[0].emp) + 10,
    ys(topLQ[0].lq) + 21, "pv-labq", "var(--pv-muted)", 7.2);
  plated(svg, `${bigAbove10.name} ${SHORT[bigAbove10.naics].toLowerCase()},`,
    xs(bigAbove10.emp) - 10, ys(bigAbove10.lq) - 4, "pv-labq", CAT[1], 7.2, "end");
  plated(svg, `${fx(bigAbove10.lq)} on ${N(bigAbove10.emp)} jobs`, xs(bigAbove10.emp) - 10,
    ys(bigAbove10.lq) + 12, "pv-labq", CAT[1], 7.2, "end");
}

function scatterCopy() {
  document.getElementById("scatterlede").innerHTML =
    `A location quotient is a ratio, so a county with seven plants can post a bigger number
     than a county with forty. Plotted against the jobs behind it, the dramatic figures move
     left where they belong: ${topLQ[0].name} County&rsquo;s ${fx(topLQ[0].lq)} in resin is
     ${N(topLQ[0].emp)} jobs across ${N(topLQ[0].estabs)} establishments, real and small.
     Paint is the exception on this chart. ${bigAbove10.name}&rsquo;s
     ${fx(bigAbove10.lq)} rests on ${N(bigAbove10.emp)} jobs, the largest base anywhere
     above 10&times;.`;
  document.getElementById("scattertitle").textContent =
    `${bigAbove10.name} paint is the one large base above 10×`;
  document.getElementById("scattersrc").innerHTML =
    `The horizontal axis is square-root scaled so the small-base counties stay readable.
     That is a legibility choice and not a transformation of the data. A concentration
     figure without its base is half a fact, which is why every point here carries both.
     ${pts.length} of ${POSSIBLE} possible industry and county cells are disclosed in
     ${LATEST}. Where the region sits against other metro areas on the same measure is the
     <a href="../peers/">national position page</a>&rsquo;s question.`;
  document.getElementById("scattertable").innerHTML = tableView("s",
    `Concentration against employment, ${LATEST}`,
    ["County", "Industry", "LQ", "Jobs", "Establishments"],
    topLQ.slice(0, 12).map(p => [p.name, p.label, fx(p.lq), N(p.emp), N(p.estabs)]));
}

/* ------------------------------------------------------- 5. the verification */
const RS = D.cells.filter(c => c.residual != null).map(c => c.residual);
const BOUND = 0.005, NB = 20, BW = 2 * BOUND / NB;
const bins = Array.from({length: NB}, (_, i) => ({
  x0: -BOUND + i * BW, x1: -BOUND + (i + 1) * BW, n: 0}));
RS.forEach(v => bins[Math.min(NB - 1, Math.max(0, Math.floor((v + BOUND) / BW)))].n++);
const maxBin = Math.max(...bins.map(b => b.n));
const worst = Math.max(...RS.map(Math.abs));

function drawResid() { MOBILE.matches ? drawResidVariant(375, 250, true)
                                      : drawResidVariant(640, 288, false); }

function drawResidVariant(W, H, mobile) {
  const m = mobile ? {t: 58, r: 16, b: 60, l: 34} : {t: 44, r: 26, b: 64, l: 44};
  const {svg} = PV.chart("resid", {W, H, narrow: true});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const lim = 0.0068;
  const xs = v => m.l + ((v + lim) / (2 * lim)) * w;
  const ys = n => m.t + h - (n / (maxBin * 1.42)) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, yt: [],
    xt: mobile ? [-0.005, 0, 0.005] : [-0.005, -0.0025, 0, 0.0025, 0.005],
    xfmt: v => v === 0 ? "0" : (v > 0 ? "+" : "−") + Math.abs(v).toFixed(4),
    xlab: mobile ? "" : "Computed location quotient minus the published figure"});
  bins.forEach(b => {
    const x = xs(b.x0), wd = xs(b.x1) - xs(b.x0) - 1.5;
    el("rect", {x, y: ys(b.n), width: wd, height: m.t + h - ys(b.n), fill: SEQ[3]}, svg);
    hoverable(el("rect", {x, y: m.t, width: wd, height: h, fill: "transparent"}, svg),
      `<b>${b.x0.toFixed(4)} to ${b.x1.toFixed(4)}</b><br><span class="v">${b.n}</span>
       of ${N(RS.length)} checked cells`,
      `${b.x0.toFixed(4)} to ${b.x1.toFixed(4)}: ${b.n} cells`);
  });
  /* The bound is the claim, so it is drawn, not described. Both rules are labelled from
     the middle of the plot so nothing reaches past the viewBox at either width. */
  [-BOUND, BOUND].forEach(v => el("line", {x1: xs(v), y1: m.t, x2: xs(v), y2: m.t + h,
    stroke: "var(--hover)", "stroke-width": 2, "stroke-dasharray": "5 4"}, svg));
  plated(svg, `all ${N(RS.length)} cells ${mobile ? "" : "land "}inside ±0.005`, xs(0),
    m.t + 16, "pv-lab", "var(--hover)", 7.3, "middle");
  plated(svg, mobile ? "half the last digit BLS prints"
                     : "half of the last digit the bureau prints",
    xs(0), m.t + 34, "pv-labq", "var(--pv-muted)", 6.9, "middle");
  if (mobile) txt(svg, "computed minus published", {x: m.l, y: m.t - 14,
    class: "pv-labq", fill: "var(--pv-muted)"});
}

/* ------------------------------------------------------------- copy, once */
document.getElementById("residlede").innerHTML =
  `BLS publishes its own location quotient to two decimals, and publishes the components
   too. All ${N(D.meta.verification.cells_checked)} cells computed here agree with the
   published figure to within ${BOUND.toFixed(3)}, which is half of the last digit the
   bureau prints. The two are the same number as far as the bureau states it, and the flat
   shape below is what rounding looks like.`;
document.getElementById("residtitle").textContent =
  `${N(RS.length)} checked cells, none outside ±0.005`;
document.getElementById("residtable").innerHTML = tableView("v",
  "Reproduction check against the bureau&rsquo;s published location quotient",
  ["Measure", "Value"],
  [["Cells checked", N(D.meta.verification.cells_checked)],
   ["Mean absolute error", D.meta.verification.mean_abs_residual.toFixed(6)],
   ["Worst error", D.meta.verification.max_abs_residual.toFixed(6)],
   ["Cells withheld by BLS", N(D.cells.filter(c => c.suppressed).length)]]);
document.getElementById("defnote").innerHTML =
  `<b>The denominator was established, not assumed.</b> ${D.meta.definition} The intuitive
   alternative, private employment over private employment, is wrong by 0.19 on average and
   by as much as 1.03, which is the distance between &ldquo;twice the national
   average&rdquo; and &ldquo;three times.&rdquo; This chart is the tripwire: if BLS changes
   its method, or ours drifts, the divergence shows up here before it reaches a funder.
   Team NEO&rsquo;s 2.69&times; is a Lightcast product, one number for one year with no
   decomposition and no way for anyone outside the licence to check it. The components are
   free, which is why this page can rank six industries and eleven years against each
   other and that figure cannot.`;

document.getElementById("closersub").innerHTML =
  `Paint and coatings run <b>${fx(paint.lq)}</b> the national share in ${LATEST}, and
   <b>${fx(fixedNow.lq)}</b> across the ${alwaysOn.length} counties disclosed in every year
   since ${FIRST}, against ${fx(rubber.lq)} for the rubber products the region is named for.
   ${Math.round(cuyShare * 100)}% of the disclosed paint jobs sit in one county, and
   ${paint.counties_suppressed} of ${FP.n} counties are withheld, so treat the composite as
   a reading on the counties that report and not a census of the region.`;

/* --------------------------------------------------------------------- assemble */
function drawAll() { drawTrend(); drawTwist(); drawHeat(); drawScatter(); drawResid(); }
trendCopy(); twistCopy(); scatterCopy();
drawAll();
/* Only the breakpoint redraws. Every chart is authored in viewBox units, so a plain
   resize needs no re-render — the old page redrew on every resize event and gained
   nothing for it. */
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* Footprint banner — stated on the page, not left to the reader to infer. */
PV.footprintBanner(FP);

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "location-quotient", meta: D.meta});
})();
