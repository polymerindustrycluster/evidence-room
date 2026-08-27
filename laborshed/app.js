/* The commute matrix, rebuilt.
 *
 * FORM. Origin-destination data pulls hard toward a flow map or a chord diagram. Twelve
 * counties makes both illegible, and neither lets you look at the thing that matters — the
 * DIAGONAL, which is each county's self-supply. A matrix is the only form where a diagonal
 * is an object you can inspect, so it is a matrix, and the diagonal is then pulled out
 * again as a ranked bar because a heatmap is bad at precise comparison. Below 760px the
 * matrix is deliberately summarized to a per-county three-way split (own / rest of
 * footprint / outside): a 13-column grid at 375px shows four columns and hides the
 * finding. The full matrix survives in the table view. That summarization is an editorial
 * choice, stated in the figure's source line and the README.
 *
 * COLOR — one accent, one job. Orange (CAT[1]) means exactly one thing on this page:
 * UNDER HALF, the counties that break the majority-resident assumption. The matrix ramp
 * stays a sequential teal (magnitude). Plum (CAT[2]) appears once, as the distant-metro
 * series. The residents-side dots are a slate neutral, the matched peer (Pittsburgh) is
 * the dark teal INK, and threshold rules share var(--hover).
 *
 * INTERACTION. One selector (12 buttons), Tse-compliant: the default state tells the
 * whole story; selection re-reads the same charts from one county's seat and rewrites one
 * templated sentence. Claims guard the default state and each data ingredient.
 */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, chart, figures, N,
       SEQ, CAT, GRAY, INK} = PV;
const D = await PV.data("laborshed.json");
const FP = PV.footprint(D.meta);
const M = D.matrix, ORDER = D.order;
const B = await PV.data("bench.json");
const pct = v => (v * 100).toFixed(1) + "%";
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
               "nine", "ten", "eleven", "twelve"];
const SLATE = "#4A5457";           // residents-side series — never reuses the accent

/* ---------------------------------------------------------------- derived facts */
const weak = M.reduce((a, r) => r.in_county < a.in_county ? r : a);
const strong = M.reduce((a, r) => r.in_county > a.in_county ? r : a);
const summit = M.find(r => r.work_name === "Summit");
const underHalf = M.filter(r => r.in_county < 0.5);
const E = D.external;
const distGrew = Math.round((E["2022"].distant / E["2019"].distant - 1) * 100);
const adjGrew = Math.round((E["2022"].adjacent / E["2019"].adjacent - 1) * 100);
const franklin = E.top[0];
const pairs = B.pairs.slice().sort((a, b) => b.work_own - a.work_own);
const nJobsMoreLocal = pairs.filter(p => p.work_own > p.res_own).length;
const cuy = pairs.find(p => p.name === "Cuyahoga");
const bm = B.benchmark;
const gapPts = ((bm.pic12_median - bm.peer_median) * 100).toFixed(1);
const ashB = bm.pic12_counties.find(r => r.name === "Ashtabula");

/* ------------------------------------------------------------------- hero stats */
figures([
  ["key", pct(summit.in_county), "Summit’s own residents",
   `of its ${N(summit.jobs_total)} jobs`],
  ["", pct(strong.in_county), "the highest",
   `${strong.work_name}; none reaches 69%`],
  ["", pct(weak.in_county), "the lowest",
   `${weak.work_name}; 7 in 10 live elsewhere`],
  ["", N(E["2022"].distant), "from distant metros",
   `already ${N(E["2019"].distant)} back in 2019`]
]);

/* ------------------------------------------------------- county selector + verdict */
let SEL = null;
function verdict() {
  const v = document.getElementById("verdict");
  if (!SEL) {
    v.innerHTML = `<b>All twelve counties:</b> none reaches 69% of its own jobs.
      ${strong.work_name} holds the most (${pct(strong.in_county)}), ${weak.work_name}
      the least (${pct(weak.in_county)}). Tap a county to follow it across the matrix,
      the ranking and the two-direction chart.`;
    return;
  }
  const r = M.find(x => x.work_name === SEL);
  const p = B.pairs.find(x => x.name === SEL);
  v.innerHTML = `<b>${SEL}:</b> ${pct(r.in_county)} of the jobs in ${SEL} are held by
    people who live there, and ${pct(p.res_own)} of ${SEL} residents’ jobs sit inside
    the county. ${N(r.outside)} of its jobs are held from outside the twelve counties.`;
}
{
  const host = document.getElementById("csel");
  const counties = M.map(r => r.work_name).sort();
  const mk = (label, name) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label;
    b.setAttribute("aria-pressed", String(SEL === name));
    b.addEventListener("click", () => {
      SEL = (SEL === name) ? null : name;
      host.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed",
        String(SEL === null ? x.dataset.all === "1" : x.textContent === SEL)));
      verdict(); drawMatrix(); drawDiag(); drawRecip(); drawBench();
    });
    if (name === null) { b.dataset.all = "1"; b.setAttribute("aria-pressed", "true"); }
    host.appendChild(b); return b;
  };
  mk("All 12", null);
  counties.forEach(c => mk(c, c));
}
verdict();

const MOBILE = matchMedia("(max-width: 760px)");
const dimRow = name => SEL && name !== SEL;

/* ------------------------------------------------------------- 1. the matrix */
function drawMatrix() { MOBILE.matches ? drawMatrixMobile() : drawMatrixDesktop(); }

function drawMatrixDesktop() {
  const n = ORDER.length;
  /* The cell size FOLLOWS the column width; it does not set it. A 214-unit rail on the
     right is reserved for the two on-chart callouts, so the claims live on the chart
     rather than only in prose (chart-craft: no naked charts). */
  const LEFT = 132, TOP = 128, W = 1100, RAIL = 214;
  const CELL = Math.floor((W - LEFT - RAIL) / (n + 1));
  const H = TOP + n * CELL + 40;
  const {svg} = chart("matrix", {W, H, m: {t: TOP, r: RAIL, b: 40, l: LEFT}});
  const maxShare = Math.max(...M.flatMap(r => r.cells.map(c => c.share)));
  // sequential ramp; a share of zero is a real zero and gets the palest step, not white,
  // so an empty cell reads as measured rather than missing
  const ramp = v => SEQ[Math.min(SEQ.length - 1, Math.max(0,
    Math.round((v / maxShare) ** 0.55 * (SEQ.length - 1))))];

  // VERTICAL, not angled: upright headers clear their own columns (see git history).
  const head = (label, i, cls) => {
    const cx = LEFT + i * CELL + CELL / 2;
    txt(svg, label, {x: cx, y: TOP - 10, "text-anchor": "start", class: cls,
      transform: `rotate(-90 ${cx} ${TOP - 10})`});
  };
  ORDER.forEach((o, i) => head(o.name, i, "pv-labq"));
  head("Outside", n, "pv-lab");
  txt(svg, "LIVES IN →", {x: LEFT, y: TOP - 88, class: "pv-axlab"});
  txt(svg, "WORKS IN ↓", {x: 8, y: TOP - 12, class: "pv-axlab"});

  M.forEach((r, ri) => {
    const g = el("g", dimRow(r.work_name) ? {opacity: .22} : {}, svg);
    txt(g, r.work_name, {x: LEFT - 12, y: TOP + ri * CELL + CELL / 2 + 5,
      "text-anchor": "end", class: "pv-lab"});
    r.cells.forEach((c, ci) => {
      const x = LEFT + ci * CELL, y = TOP + ri * CELL;
      el("rect", {x: x + 1, y: y + 1, width: CELL - 2, height: CELL - 2,
        fill: ramp(c.share)}, g);
      if (c.share >= 0.05)
        txt(g, Math.round(c.share * 100), {x: x + CELL / 2, y: y + CELL / 2 + 5,
          "text-anchor": "middle", class: "pv-lab",
          fill: c.share > maxShare * 0.45 ? "#fff" : "var(--pv-ink)"});
      hoverable(el("rect", {x: x + 1, y: y + 1, width: CELL - 2, height: CELL - 2,
        fill: "transparent"}, g),
        `<b>${N(c.jobs)}</b> jobs<br>worked in <b>${r.work_name}</b><br>
         lived in <b>${c.home_name}</b><br><span class="v">${pct(c.share)}</span> of
         ${r.work_name}’s ${N(r.jobs_total)} jobs`,
        `${c.home_name} to ${r.work_name}: ${N(c.jobs)} jobs, ${pct(c.share)}`);
    });
    // the outside-footprint remainder, so the row is a whole county's jobs
    const ox = LEFT + n * CELL, oy = TOP + ri * CELL;
    el("rect", {x: ox + 1, y: oy + 1, width: CELL - 2, height: CELL - 2,
      fill: ramp(r.outside_share)}, g);
    txt(g, Math.round(r.outside_share * 100), {x: ox + CELL / 2, y: oy + CELL / 2 + 5,
      "text-anchor": "middle", class: "pv-lab",
      fill: r.outside_share > maxShare * 0.45 ? "#fff" : "var(--pv-ink)"});
    hoverable(el("rect", {x: ox + 1, y: oy + 1, width: CELL - 2, height: CELL - 2,
      fill: "transparent"}, g),
      `<b>${N(r.outside)}</b> jobs in <b>${r.work_name}</b><br>held from outside the
       twelve counties<br><span class="v">${pct(r.outside_share)}</span> of its jobs`,
      `${r.work_name}: ${pct(r.outside_share)} from outside the footprint`);
    /* The diagonal gets a rule, not a fill — same quantity, marked. Orange only where
       the county is under half: the accent's one job on this page. */
    const di = ORDER.findIndex(o => o.fips === r.work);
    const under = r.in_county < 0.5;
    el("rect", {x: LEFT + di * CELL + 1, y: oy + 1, width: CELL - 2, height: CELL - 2,
      fill: "none", stroke: under ? CAT[1] : "#3A4448",
      "stroke-width": under ? 2.5 : 1.6}, g);
  });
  el("line", {x1: LEFT + n * CELL, y1: TOP - 4, x2: LEFT + n * CELL, y2: TOP + n * CELL,
    stroke: "var(--pv-axis)", "stroke-width": 1.5}, svg);

  /* On-chart callouts: the hero number and the maximum, tied to their cells by leader
     lines that run inside the grid's own row gaps. Drawn last, never occluded. */
  const railX = LEFT + (n + 1) * CELL + 14;
  const sg = el("g", dimRow("Summit") ? {opacity: .25} : {}, svg);
  const sRow = M.findIndex(r => r.work_name === "Summit");
  const sDi = ORDER.findIndex(o => o.name === "Summit");
  const sy = TOP + (sRow + 1) * CELL;
  el("line", {x1: railX - 4, y1: sy, x2: LEFT + (sDi + 1) * CELL + 1, y2: sy,
    stroke: CAT[1], "stroke-width": 1.4}, sg);
  [`Summit is at ${Math.round(summit.in_county * 100)}%.`,
   "Under half of the jobs at the",
   "cluster’s center are held by",
   "people who live in Summit."].forEach((s, i) => {
    const a = {x: railX, y: sy - 51 + i * 17, class: i ? "pv-labq" : "pv-lab"};
    if (!i) a.fill = CAT[1];
    txt(sg, s, a);
  });
  const ag = el("g", dimRow("Ashtabula") ? {opacity: .25} : {}, svg);
  const aRow = M.findIndex(r => r.work_name === "Ashtabula");
  const aDi = ORDER.findIndex(o => o.name === "Ashtabula");
  const ay = TOP + aRow * CELL;
  el("line", {x1: railX - 4, y1: ay, x2: LEFT + (aDi + 1) * CELL + 1, y2: ay,
    stroke: "#3A4448", "stroke-width": 1.2}, ag);
  [`Ashtabula tops out at ${Math.round(strong.in_county * 100)}%,`,
   "and no county reaches 69%.",
   "Whether that is low is what",
   "the benchmark below settles."].forEach((s, i) =>
    txt(ag, s, {x: railX, y: ay - 60 + i * 17, class: i ? "pv-labq" : "pv-lab"}));
}

/* Mobile: the matrix becomes a per-county list — each row is one county's three-way
   split. The finding (a weak diagonal) is the first segment of every bar, in the first
   paint; the full cell detail stays in the table view. */
function drawMatrixMobile() {
  const W = 375, m = {t: 66, b: 16, l: 12, r: 12}, rowH = 44;
  const H = m.t + M.length * rowH + m.b;
  const {svg} = chart("matrix", {W, H});
  const w = W - m.l - m.r;
  txt(svg, "No county reaches 69% of its own jobs", {x: m.l, y: 18, class: "pv-lab"});
  const leg = [["own residents", SEQ[4]], ["rest of PIC-12", SEQ[1]],
               ["outside", "#D8D3CB"]];
  let lx = m.l;
  leg.forEach(([s, c]) => {
    el("rect", {x: lx, y: 28, width: 10, height: 10, fill: c}, svg);
    txt(svg, s, {x: lx + 14, y: 37, class: "pv-labq"});
    lx += 14 + s.length * 6.9 + 13;
  });
  txt(svg, "orange: under half", {x: m.l, y: 56, class: "pv-labq", fill: CAT[1]});
  M.forEach((r, i) => {
    const g = el("g", dimRow(r.work_name) ? {opacity: .25} : {}, svg);
    const y0 = m.t + i * rowH;
    txt(g, `${r.work_name} · ${N(r.jobs_total)} jobs`,
      {x: m.l, y: y0 + 11, class: "pv-labq"});
    const own = r.in_county, rest = Math.max(0, 1 - r.in_county - r.outside_share);
    const y = y0 + 17, h = 17;
    let x = m.l;
    const seg = (v, c) => { const wv = v * w;
      el("rect", {x, y, width: Math.max(0, wv - 1), height: h, fill: c}, g);
      const cx = x + wv / 2; x += wv; return {wv, cx}; };
    const s1 = seg(own, own < 0.5 ? CAT[1] : SEQ[4]);
    seg(rest, SEQ[1]);
    const s3 = seg(r.outside_share, "#D8D3CB");
    txt(g, Math.round(own * 100) + "%", {x: s1.cx, y: y + 13, "text-anchor": "middle",
      class: "pv-labq", fill: "#fff"});
    if (s3.wv > 26)
      txt(g, Math.round(r.outside_share * 100) + "%", {x: s3.cx, y: y + 13,
        "text-anchor": "middle", class: "pv-labq", fill: "var(--pv-ink)"});
    hoverable(el("rect", {x: m.l, y: y0, width: w, height: rowH, fill: "transparent"}, g),
      `<b>${r.work_name}</b><br><span class="v">${pct(r.in_county)}</span> of its
       ${N(r.jobs_total)} jobs held by its own residents<br>
       <span class="v">${pct(r.outside_share)}</span> from outside the twelve counties`,
      `${r.work_name}: ${pct(r.in_county)} in-county`);
  });
}

/* --------------------------------------------------------- 2. the diagonal */
const diagRows = [...M].sort((a, b) => b.in_county - a.in_county);
function drawDiag() { MOBILE.matches ? drawDiagMobile() : drawDiagDesktop(); }

function drawDiagDesktop() {
  const {svg, m, w, h} = chart("diag", {rows: diagRows.length, rowH: 34,
    m: {t: 44, r: 17, b: 58, l: 80}});
  const xs = v => m.l + v * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, yt: [],
    xt: [0, .2, .4, .6, .8, 1], xfmt: v => (v * 100).toFixed(0) + "%",
    xlab: "Share of the county’s jobs held by its own residents"});
  el("line", {x1: xs(.5), y1: m.t - 8, x2: xs(.5), y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  /* The rule grew from a one-word label into the sentence it stands for. */
  txt(svg, "half: below this line, a county is a minority-resident workplace",
    {x: xs(.5) + 8, y: m.t - 12, class: "pv-labq", fill: "var(--hover)"});
  diagRows.forEach((r, i) => {
    const g = el("g", dimRow(r.work_name) ? {opacity: .22} : {}, svg);
    const y = m.t + i * 34 + 6, bh = 22;
    const me = r.in_county < 0.5;
    el("rect", {x: m.l, y, width: Math.max(3, xs(r.in_county) - m.l), height: bh,
      fill: me ? CAT[1] : SEQ[4], rx: 4}, g);
    txt(g, r.work_name, {x: m.l - 12, y: y + bh - 6, "text-anchor": "end",
      class: "pv-lab"});
    txt(g, `${pct(r.in_county)}  ·  ${N(r.jobs_total)} jobs`,
      {x: xs(r.in_county) + 10, y: y + bh - 6, class: me ? "pv-lab" : "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 6, width: m.l + w + 170, height: bh + 12,
      fill: "transparent"}, g),
      `<b>${r.work_name}</b><br><span class="v">${N(r.jobs_total)}</span> jobs<br>
       <span class="v">${pct(r.in_county)}</span> held by ${r.work_name} residents<br>
       <span class="v">${pct(r.outside_share)}</span> from outside the twelve counties`,
      `${r.work_name}: ${pct(r.in_county)} in-county`);
  });
}

function drawDiagMobile() {
  const W = 375, m = {t: 64, r: 12, b: 44, l: 12}, rowH = 40;
  const H = m.t + diagRows.length * rowH + m.b;
  const {svg} = chart("diag", {W, H});
  const w = W - m.l - m.r;
  const xs = v => m.l + v * w;
  txt(svg, "half: below this line, a county is a", {x: xs(.5) - 110, y: 18,
    class: "pv-labq", fill: "var(--hover)"});
  txt(svg, "minority-resident workplace", {x: xs(.5) - 110, y: 34,
    class: "pv-labq", fill: "var(--hover)"});
  /* The rule goes down FIRST so row labels print over it, not under it. */
  el("line", {x1: xs(.5), y1: 40, x2: xs(.5), y2: H - m.b + 4, stroke: "var(--hover)",
    "stroke-width": 1.4}, svg);
  diagRows.forEach((r, i) => {
    const g = el("g", dimRow(r.work_name) ? {opacity: .22} : {}, svg);
    const y0 = m.t + i * rowH;
    const me = r.in_county < 0.5;
    txt(g, `${r.work_name} · ${pct(r.in_county)} · ${N(r.jobs_total)} jobs`,
      {x: m.l, y: y0 + 11, class: me ? "pv-lab" : "pv-labq"});
    el("rect", {x: m.l, y: y0 + 17, width: Math.max(3, xs(r.in_county) - m.l),
      height: 15, fill: me ? CAT[1] : SEQ[4], rx: 3}, g);
    hoverable(el("rect", {x: 0, y: y0, width: W, height: rowH, fill: "transparent"}, g),
      `<b>${r.work_name}</b><br><span class="v">${pct(r.in_county)}</span> held by its
       own residents`, `${r.work_name}: ${pct(r.in_county)} in-county`);
  });
  [0, .5, 1].forEach(v => txt(svg, Math.round(v * 100) + "%",
    {x: xs(v), y: H - m.b + 22, "text-anchor": v ? (v === 1 ? "end" : "middle") : "start",
     class: "pv-tick"}));
}

document.getElementById("diagtitle").textContent =
  `${underHalf.length} of the twelve counties are under half`;
document.getElementById("diagfigtitle").textContent =
  `Summit, the cluster’s center, is at ${pct(summit.in_county)}`;

/* --------------------------------------------------- 3. adjacent vs distant */
const extRows = [
  ["Adjacent counties", "plausible daily travel", E["2019"].adjacent,
   E["2022"].adjacent, SEQ[4]],
  ["Distant metros", "Columbus, Toledo, Cincinnati, Dayton", E["2019"].distant,
   E["2022"].distant, CAT[2]],
  ["Everywhere else", "including out of state", E["2019"].other,
   E["2022"].other, GRAY]];

function drawExt() { MOBILE.matches ? drawExtMobile() : drawExtDesktop(); }

function drawExtDesktop() {
  const {svg, m, w, h} = chart("ext", {H: 300, m: {t: 52, r: 85, b: 66, l: 235}});
  const maxV = Math.max(...extRows.flatMap(r => [r[2], r[3]])) * 1.08;
  const xs = v => m.l + (v / maxV) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, yt: [], xt: ticks(0, maxV, 5),
    xfmt: N, xlab: "Jobs in PIC-12 held by people living outside it"});
  const bh = 20, gap = (h - extRows.length * (bh * 2 + 10)) / (extRows.length - 1 || 1);
  extRows.forEach(([label, sub, v19, v22, col], i) => {
    const y = m.t + i * (bh * 2 + 10 + gap);
    el("rect", {x: m.l, y, width: Math.max(2, xs(v19) - m.l), height: bh - 4,
      fill: col, opacity: .38, rx: 3}, svg);
    el("rect", {x: m.l, y: y + bh, width: Math.max(2, xs(v22) - m.l), height: bh - 4,
      fill: col, rx: 3}, svg);
    txt(svg, label, {x: m.l - 12, y: y + bh - 2, "text-anchor": "end", class: "pv-lab"});
    txt(svg, sub, {x: m.l - 12, y: y + bh + 14, "text-anchor": "end", class: "pv-labq"});
    txt(svg, `${N(v19)}  2019`, {x: xs(v19) + 10, y: y + bh - 6, class: "pv-labq"});
    const ch = v19 ? Math.round((v22 / v19 - 1) * 100) : 0;
    txt(svg, `${N(v22)}  2022  (${ch >= 0 ? "+" : ""}${ch}%)`,
      {x: xs(v22) + 10, y: y + bh + 12, class: "pv-lab"});
    hoverable(el("rect", {x: 0, y: y - 6, width: m.l + w + 200, height: bh * 2 + 12,
      fill: "transparent"}, svg),
      `<b>${label}</b><br>${sub}<br>2019 <span class="v">${N(v19)}</span><br>
       2022 <span class="v">${N(v22)}</span> (${ch >= 0 ? "+" : ""}${ch}%)`,
      `${label}: ${N(v19)} in 2019, ${N(v22)} in 2022`);
  });
}

function drawExtMobile() {
  const W = 375, m = {t: 20, r: 12, b: 40, l: 12}, groupH = 88;
  const H = m.t + extRows.length * groupH + m.b;
  const {svg} = chart("ext", {W, H});
  const w = W - m.l - m.r;
  const maxV = Math.max(...extRows.flatMap(r => [r[2], r[3]])) * 1.05;
  const xs = v => m.l + (v / maxV) * w;
  extRows.forEach(([label, sub, v19, v22, col], i) => {
    const y0 = m.t + i * groupH;
    txt(svg, label, {x: m.l, y: y0 + 12, class: "pv-lab"});
    txt(svg, sub, {x: m.l, y: y0 + 28, class: "pv-labq"});
    const ch = v19 ? Math.round((v22 / v19 - 1) * 100) : 0;
    el("rect", {x: m.l, y: y0 + 36, width: xs(v19) - m.l, height: 13, fill: col,
      opacity: .38, rx: 2}, svg);
    txt(svg, `${N(v19)} · 2019`, {x: xs(v19) - 6, y: y0 + 47, "text-anchor": "end",
      class: "pv-labq", fill: "var(--pv-ink)"});
    el("rect", {x: m.l, y: y0 + 53, width: xs(v22) - m.l, height: 13, fill: col,
      rx: 2}, svg);
    txt(svg, `${N(v22)} · 2022 (${ch >= 0 ? "+" : ""}${ch}%)`,
      {x: xs(v22) - 6, y: y0 + 64, "text-anchor": "end", class: "pv-labq",
       fill: col === GRAY ? "var(--pv-ink)" : "#fff"});
    hoverable(el("rect", {x: m.l, y: y0, width: w, height: groupH - 8,
      fill: "transparent"}, svg),
      `<b>${label}</b><br>2019 <span class="v">${N(v19)}</span><br>
       2022 <span class="v">${N(v22)}</span> (${ch >= 0 ? "+" : ""}${ch}%)`,
      `${label}: ${N(v19)} in 2019, ${N(v22)} in 2022`);
  });
  txt(svg, "jobs in PIC-12 held by people living outside it",
    {x: m.l, y: H - 12, class: "pv-labq"});
}

document.getElementById("extfigtitle").textContent =
  `Distant residence grew ${distGrew}% since 2019; adjacent commuting grew ${adjGrew}%`;

/* ------------------------------------------- 4. the reciprocal (dumbbell) */
function drawRecip() { MOBILE.matches ? drawRecipMobile() : drawRecipDesktop(); }

function recipDomain() {
  /* The domain comes from the DATA, not from a guess (a hard-coded 0.25–0.80 once
     clipped Geauga outside its own axis). */
  const all = pairs.flatMap(r => [r.work_own, r.res_own]);
  const lo = Math.floor(Math.min(...all) * 20) / 20 - 0.01;
  const hi = Math.ceil(Math.max(...all) * 20) / 20 + 0.01;
  return {lo, hi};
}

function drawRecipDesktop() {
  const {svg, m, w} = chart("recip", {rows: pairs.length, rowH: 30,
    m: {t: 46, r: 210, b: 58, l: 80}});
  const {lo, hi} = recipDomain();
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  frame(svg, {x: m.l, y: m.t, w, h: pairs.length * 30, xs, ys: () => 0,
    xt: ticks(Math.ceil(lo * 10) / 10, Math.floor(hi * 10) / 10, 5),
    xfmt: v => Math.round(v * 100) + "%",
    xlab: "Share held locally", ylab: "County"});
  pairs.forEach((r, i) => {
    const g = el("g", dimRow(r.name) ? {opacity: .22} : {}, svg);
    const y = m.t + i * 30 + 15;
    txt(g, r.name, {x: m.l - 12, y: y + 5, "text-anchor": "end", class: "pv-lab"});
    el("line", {x1: xs(Math.min(r.work_own, r.res_own)), y1: y,
      x2: xs(Math.max(r.work_own, r.res_own)), y2: y,
      stroke: "var(--pv-axis)", "stroke-width": 2}, g);
    el("circle", {cx: xs(r.work_own), cy: y, r: 6, fill: CAT[0],
      stroke: "var(--paper)", "stroke-width": 2}, g);
    el("circle", {cx: xs(r.res_own), cy: y, r: 6, fill: SLATE,
      stroke: "var(--paper)", "stroke-width": 2}, g);
    hoverable(el("rect", {x: m.l, y: y - 15, width: w, height: 30,
      fill: "transparent"}, g),
      `<b>${r.name}</b><br><span class="v">${pct(r.work_own)}</span> of its
       ${N(r.work_jobs)} jobs are held by its own residents<br>
       <span class="v">${pct(r.res_own)}</span> of its residents’ ${N(r.res_jobs)} jobs
       sit in the county<br><span class="v">${pct(r.res_region)}</span> sit somewhere in PIC-12`,
      `${r.name}: ${pct(r.work_own)} of jobs held locally, ${pct(r.res_own)} of residents work locally`);
  });
  /* The exception, written where it happens. */
  const cg = el("g", dimRow("Cuyahoga") ? {opacity: .25} : {}, svg);
  const ci = pairs.indexOf(cuy);
  const cyY = m.t + ci * 30 + 15;
  const rail = m.l + w + 16;
  el("line", {x1: xs(cuy.res_own) + 9, y1: cyY, x2: rail - 6, y2: cyY,
    stroke: "var(--pv-axis)", "stroke-width": 1}, cg);
  ["Cuyahoga runs the other way:",
   `${Math.round(cuy.work_own * 100)}% of its jobs are filled`,
   `locally, while ${Math.round(cuy.res_own * 100)}% of its`,
   "residents’ jobs stay local."].forEach((s, i) =>
    txt(cg, s, {x: rail, y: cyY - 18 + i * 16, class: i ? "pv-labq" : "pv-lab"}));
}

function drawRecipMobile() {
  const W = 375, m = {t: 20, r: 14, b: 44, l: 12}, rowH = 42;
  const H = m.t + pairs.length * rowH + m.b;
  const {svg} = chart("recip", {W, H});
  const w = W - m.l - m.r;
  const {lo, hi} = recipDomain();
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  pairs.forEach((r, i) => {
    const g = el("g", dimRow(r.name) ? {opacity: .22} : {}, svg);
    const y0 = m.t + i * rowH;
    txt(g, `${r.name}: jobs ${Math.round(r.work_own * 100)}% · residents ${Math.round(r.res_own * 100)}%`,
      {x: m.l, y: y0 + 11, class: "pv-labq"});
    const y = y0 + 24;
    el("line", {x1: xs(Math.min(r.work_own, r.res_own)), y1: y,
      x2: xs(Math.max(r.work_own, r.res_own)), y2: y,
      stroke: "var(--pv-axis)", "stroke-width": 2}, g);
    el("circle", {cx: xs(r.work_own), cy: y, r: 5, fill: CAT[0],
      stroke: "var(--paper)", "stroke-width": 1.5}, g);
    el("circle", {cx: xs(r.res_own), cy: y, r: 5, fill: SLATE,
      stroke: "var(--paper)", "stroke-width": 1.5}, g);
    hoverable(el("rect", {x: 0, y: y0, width: W, height: rowH, fill: "transparent"}, g),
      `<b>${r.name}</b><br><span class="v">${pct(r.work_own)}</span> of its jobs held
       locally<br><span class="v">${pct(r.res_own)}</span> of residents’ jobs local`,
      `${r.name}: ${pct(r.work_own)} of jobs held locally`);
  });
  [.3, .5, .7].forEach(v => txt(svg, Math.round(v * 100) + "%",
    {x: xs(v), y: H - m.b + 22, "text-anchor": "middle", class: "pv-tick"}));
  txt(svg, "share held locally", {x: m.l, y: H - 8, class: "pv-labq"});
}

document.getElementById("recipfigtitle").textContent =
  `In ${WORDS[nJobsMoreLocal]} of the twelve counties, jobs stay local at a higher rate than residents do`;

/* --------------------------------------------------------- 5. the benchmark */
function drawBench() { MOBILE.matches ? drawBenchMobile() : drawBenchDesktop(); }

function drawBenchDesktop() {
  /* The peer distribution as a STRIP, not a histogram: a reader has to be able to find
     the twelve PIC counties inside it, which a binned histogram destroys. */
  const {svg, m, w, h} = chart("bench", {W: 1100, H: 380, m: {t: 96, r: 0, b: 78, l: 0}});
  const lo = 0.10, hi = 0.95;
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  const band = m.t + 46;
  frame(svg, {x: m.l, y: m.t, w, h: h - 12, xs, ys: () => 0,
    xt: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
    xfmt: v => Math.round(v * 100) + "%",
    xlab: "Share of a county’s jobs held by its own residents"});
  bm.peer_values.forEach((v, i) => {
    el("line", {x1: xs(v), y1: band - 30 + (i % 7) * 7, x2: xs(v),
      y2: band - 24 + (i % 7) * 7, stroke: GRAY, "stroke-width": 1.4, opacity: 0.5}, svg);
  });
  /* Threshold rules share one hue (var(--hover)); the two medians get their series
     inks. The gap between the medians is the claim, so it is drawn as a labeled
     bracket rather than left for the reader to subtract. */
  el("line", {x1: xs(bm.peer_median), y1: 70, x2: xs(bm.peer_median), y2: band + 82,
    stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "4 4"}, svg);
  el("line", {x1: xs(bm.pic12_median), y1: 70, x2: xs(bm.pic12_median), y2: band + 82,
    stroke: CAT[0], "stroke-width": 1.5, "stroke-dasharray": "4 4"}, svg);
  el("line", {x1: xs(.69), y1: 78, x2: xs(.69), y2: band + 82,
    stroke: "var(--hover)", "stroke-width": 1.5, "stroke-dasharray": "4 4"}, svg);
  txt(svg, "peer median", {x: xs(bm.peer_median) - 6, y: 88, "text-anchor": "end",
    class: "pv-axlab", fill: INK});
  txt(svg, "PIC-12 median", {x: xs(bm.pic12_median) + 6, y: 88, class: "pv-axlab",
    fill: CAT[0]});
  txt(svg, "69%", {x: xs(.69) + 6, y: 88, class: "pv-axlab", fill: "var(--hover)"});
  el("path", {d: `M${xs(bm.peer_median)},62 V56 H${xs(bm.pic12_median)} V62`,
    fill: "none", stroke: "var(--pv-ink)", "stroke-width": 1.4}, svg);
  txt(svg, `the median PIC-12 county sits ${gapPts} points above the peer median`,
    {x: xs(bm.peer_median) - 60, y: 48, class: "pv-lab"});
  const ordered = bm.pic12_counties.slice().sort((a, b) => a.own_share_work - b.own_share_work);
  /* Row-packed labels with leader lines; each label takes the first row whose last
     label it clears (see git history for the collision this replaced). */
  const rowEnd = [-1e9, -1e9, -1e9];
  ordered.forEach(r => {
    const wid = r.name.length * 6.6 + 14;
    let row = rowEnd.findIndex(e => xs(r.own_share_work) - wid / 2 > e);
    if (row < 0) row = rowEnd.indexOf(Math.min(...rowEnd));
    r._row = row;
    r._x = Math.max(xs(r.own_share_work), rowEnd[row] + wid / 2);
    rowEnd[row] = r._x + wid / 2;
  });
  ordered.forEach(r => {
    const g = el("g", dimRow(r.name) ? {opacity: .25} : {}, svg);
    const x = xs(r.own_share_work), y = band + 44 + r._row * 17;
    el("line", {x1: x, y1: band + 24, x2: r._x, y2: y - 10, stroke: CAT[0],
      "stroke-width": 1}, g);
    el("circle", {cx: x, cy: band + 19, r: 5, fill: CAT[0], stroke: "var(--paper)",
      "stroke-width": 2}, g);
    txt(g, r.name, {x: r._x, y, "text-anchor": "middle", class: "pv-labq"});
    hoverable(el("circle", {cx: x, cy: band + 19, r: 11, fill: "transparent"}, g),
      `<b>${r.name}</b><br><span class="v">${pct(r.own_share_work)}</span> of its jobs are
       held by its own residents<br>higher than <span class="v">${pct(r.percentile)}</span>
       of the ${bm.n_peer_counties} peer metro counties`,
      `${r.name}: ${pct(r.own_share_work)}, percentile ${pct(r.percentile)}`);
  });
}

function drawBenchMobile() {
  const W = 375, H = 320, m = {t: 88, r: 10, b: 58, l: 10};
  const {svg} = chart("bench", {W, H});
  const w = W - m.l - m.r;
  const lo = 0.10, hi = 0.95;
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  const band = m.t + 34;
  frame(svg, {x: m.l, y: m.t, w, h: H - m.t - m.b - 6, xs, ys: () => 0,
    xt: [.2, .4, .6, .8], xfmt: v => Math.round(v * 100) + "%",
    xlab: "share of jobs held by own residents"});
  bm.peer_values.forEach((v, i) => {
    el("line", {x1: xs(v), y1: band - 24 + (i % 5) * 6, x2: xs(v),
      y2: band - 19 + (i % 5) * 6, stroke: GRAY, "stroke-width": 1.1, opacity: 0.5}, svg);
  });
  txt(svg, `the PIC-12 median sits ${gapPts} points`, {x: m.l, y: 16, class: "pv-lab"});
  txt(svg, "above the peer median", {x: m.l, y: 32, class: "pv-lab"});
  el("path", {d: `M${xs(bm.peer_median)},52 V46 H${xs(bm.pic12_median)} V52`,
    fill: "none", stroke: "var(--pv-ink)", "stroke-width": 1.2}, svg);
  el("line", {x1: xs(bm.peer_median), y1: 56, x2: xs(bm.peer_median), y2: band + 20,
    stroke: INK, "stroke-width": 1.2, "stroke-dasharray": "3 3"}, svg);
  el("line", {x1: xs(bm.pic12_median), y1: 56, x2: xs(bm.pic12_median), y2: band + 20,
    stroke: CAT[0], "stroke-width": 1.2, "stroke-dasharray": "3 3"}, svg);
  el("line", {x1: xs(.69), y1: 56, x2: xs(.69), y2: band + 20,
    stroke: "var(--hover)", "stroke-width": 1.2, "stroke-dasharray": "3 3"}, svg);
  txt(svg, "69%", {x: xs(.69) + 4, y: 66, class: "pv-labq", fill: "var(--hover)"});
  const dots = bm.pic12_counties.slice().sort((a, b) => a.own_share_work - b.own_share_work);
  dots.forEach(r => {
    const g = el("g", dimRow(r.name) ? {opacity: .25} : {}, svg);
    hoverable(el("circle", {cx: xs(r.own_share_work), cy: band + 12, r: 4.5,
      fill: CAT[0], stroke: "var(--paper)", "stroke-width": 1.5}, g),
      `<b>${r.name}</b><br><span class="v">${pct(r.own_share_work)}</span> of its jobs
       held by its own residents`, `${r.name}: ${pct(r.own_share_work)}`);
  });
  [["Geauga", dots[0]], ["Summit", dots.find(r => r.name === "Summit")],
   ["Ashtabula", dots.at(-1)]].forEach(([name, r]) => {
    if (!r) return;
    const x = xs(r.own_share_work);
    el("line", {x1: x, y1: band + 18, x2: x, y2: band + 34, stroke: CAT[0],
      "stroke-width": 1}, svg);
    txt(svg, name, {x, y: band + 48, "text-anchor": "middle", class: "pv-labq"});
  });
}

/* ------------------------------------------------------------- 6. the regions */
function drawRegions() { MOBILE.matches ? drawRegionsMobile() : drawRegionsDesktop(); }
const R = B.regions;
const shortName = s => s.split(",")[0].split("--")[0];

function drawRegionsDesktop() {
  const {svg, m, w} = chart("regions", {rows: R.length, rowH: 34,
    m: {t: 44, r: 17, b: 56, l: 157}});
  const xs = v => m.l + v * w;
  frame(svg, {x: m.l, y: m.t, w, h: R.length * 34, xs, ys: () => 0,
    xt: [0, 0.25, 0.5, 0.75, 1], xfmt: v => Math.round(v * 100) + "%",
    xlab: "Jobs held by residents of the same region", ylab: "Region"});
  R.forEach((r, i) => {
    const y = m.t + i * 34 + 6, mine = r.kind === "footprint";
    const pgh = /^Pittsburgh/.test(r.name);
    const short = shortName(r.name);
    txt(svg, short.length > 22 ? short.slice(0, 21) + "…" : short,
      {x: m.l - 12, y: y + 16, "text-anchor": "end",
       class: mine || pgh ? "pv-lab" : "pv-labq"});
    el("rect", {x: m.l, y, width: xs(r.region_share_work) - m.l, height: 22,
      fill: mine ? CAT[0] : pgh ? INK : SEQ[1]}, svg);
    txt(svg, pct(r.region_share_work), {x: xs(r.region_share_work) + 8, y: y + 16,
      class: "pv-lab", fill: mine ? CAT[0] : pgh ? INK : "var(--pv-ink)"});
    txt(svg, `${r.counties} counties`, {x: m.l + 8, y: y + 16, class: "pv-labq",
      fill: mine || pgh ? "#fff" : "var(--pv-ink)"});
    if (pgh)
      txt(svg, "the only peer that matches", {x: xs(r.region_share_work) - 10,
        y: y + 16, "text-anchor": "end", class: "pv-lab", fill: "#fff"});
    hoverable(el("rect", {x: m.l, y, width: w, height: 22, fill: "transparent"}, svg),
      `<b>${r.name}</b><br>${r.counties} counties, ${N(r.jobs_located)} jobs<br>
       <span class="v">${pct(r.region_share_work)}</span> held by residents of the region`,
      `${short}: ${pct(r.region_share_work)} across ${r.counties} counties`);
  });
}

function drawRegionsMobile() {
  const W = 375, m = {t: 20, r: 12, b: 44, l: 12}, rowH = 42;
  const H = m.t + R.length * rowH + 18 + m.b;
  const {svg} = chart("regions", {W, H});
  const w = W - m.l - m.r;
  const xs = v => m.l + v * w;
  let y = m.t;
  R.forEach(r => {
    const mine = r.kind === "footprint", pgh = /^Pittsburgh/.test(r.name);
    const short = shortName(r.name);
    txt(svg, `${short} · ${r.counties} counties`,
      {x: m.l, y: y + 11, class: mine || pgh ? "pv-lab" : "pv-labq"});
    el("rect", {x: m.l, y: y + 17, width: xs(r.region_share_work) - m.l, height: 15,
      fill: mine ? CAT[0] : pgh ? INK : SEQ[1], rx: 2}, svg);
    txt(svg, pct(r.region_share_work), {x: xs(r.region_share_work) - 6, y: y + 29,
      "text-anchor": "end", class: "pv-labq",
      fill: mine || pgh ? "#fff" : "var(--pv-ink)"});
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, svg),
      `<b>${r.name}</b><br><span class="v">${pct(r.region_share_work)}</span> held by
       residents of the region`, `${short}: ${pct(r.region_share_work)}`);
    y += rowH;
    if (pgh) {
      txt(svg, "the only peer that matches", {x: m.l, y: y + 6, class: "pv-labq",
        fill: INK});
      y += 22;
    }
  });
  [0, .5, 1].forEach(v => txt(svg, Math.round(v * 100) + "%",
    {x: xs(v), y: H - m.b + 22, "text-anchor": v ? (v === 1 ? "end" : "middle") : "start",
     class: "pv-tick"}));
}

document.getElementById("regionsfigtitle").textContent =
  `Only Pittsburgh matches the footprint’s ${pct(B.totals.work_region_share)}`;

/* -------------------------------------------------------- tables + prose slots */
document.getElementById("matrixtable").innerHTML = tableView("mx",
  "Share of each county’s jobs by home county, 2022",
  ["Works in", "Total jobs", ...ORDER.map(o => o.name), "Outside PIC-12"],
  M.map(r => [r.work_name, N(r.jobs_total),
    ...r.cells.map(c => pct(c.share)), pct(r.outside_share)]));
document.getElementById("matrixsrc").innerHTML =
  `${D.meta.source}. ${D.meta.row} JT00 is the file’s all-jobs segment; “main” and
   “aux” are its in-state and cross-state halves. Whole economy, not the cluster:
   LODES records no industry at this grain. Cells below five percent are shaded but
   not numbered; every value is in the table. On a phone this chart compresses to each
   county’s three-way split; the full matrix is in the table.`;

document.getElementById("diagtable").innerHTML = tableView("dg",
  "In-county share of jobs, 2022",
  ["County", "Jobs", "Held by own residents", "From elsewhere in PIC-12",
   "From outside PIC-12"],
  diagRows.map(r => [r.work_name, N(r.jobs_total), pct(r.in_county),
    pct(1 - r.in_county - r.outside_share), pct(r.outside_share)]));
document.getElementById("diagnote").innerHTML =
  `<b>What this licenses.</b> Retiring the single-county workforce figure:
   “${summit.work_name} County has ${N(summit.jobs_total)} workers” is true of a place
   where ${pct(1 - summit.in_county)} of those workers live somewhere else. Two
   readings stay off the table: none of this is a commute, since the home end is a
   residence on file rather than evidence of a trip, and none of it is
   cluster-specific, since LODES records no industry at this grain.`;

document.getElementById("exttable").innerHTML = tableView("ex",
  "Largest external sources of PIC-12 jobs",
  ["Home county", "Type", "2019", "2022", "Change"],
  E.top.map(r => [r.name, r.kind, N(r.jobs_2019), N(r.jobs_2022),
    r.jobs_2019 ? ((r.jobs_2022 / r.jobs_2019 - 1) * 100).toFixed(0) + "%" : "—"]));
document.getElementById("extreading").innerHTML =
  `<b>This section exists because a story died here.</b> The candidate finding was that
   remote work broke the labor shed after 2020; its kill condition was a 2019 baseline
   showing Franklin County already large. Franklin was already ${N(franklin.jobs_2019)}
   jobs in 2019, the largest single external source before the pandemic. What survives
   is sturdier: the adjacent-distant split was always structural, and only the mix
   moved.`;
document.getElementById("extsrc").innerHTML =
  `${D.meta.source}, 2019 and 2022 vintages. ${D.meta.split_is_judgment} Summing the
   two into one imported-workforce figure produces a number that means nothing, and
   that was true in 2019 too.`;

document.getElementById("reciptable").innerHTML = tableView("rc",
  "Both directions, by county",
  ["County", "Jobs located here", "Held by own residents", "Resident jobs",
   "In own county", "Anywhere in PIC-12"],
  pairs.map(r => [r.name, N(r.work_jobs), pct(r.work_own), N(r.res_jobs),
    pct(r.res_own), pct(r.res_region)]));
document.getElementById("recipsrc").innerHTML =
  `${B.meta.source} ${B.meta.row} ${B.meta.bases} The two dots are different
   populations and are never subtracted from one another: a county can fill its jobs
   with outsiders while its own residents also leave. Region-wide,
   ${pct(B.totals.res_region_share)} of PIC-12 residents’ jobs sit inside PIC-12, and
   ${pct(B.totals.out_of_state_share)} are out of state entirely.`;

document.getElementById("benchtable").innerHTML = tableView("bm",
  "PIC-12 counties against the peer distribution",
  ["County", "Jobs held by own residents", "Percentile among peer metro counties"],
  bm.pic12_counties.slice().sort((a, b) => a.own_share_work - b.own_share_work)
    .map(r => [r.name, pct(r.own_share_work), pct(r.percentile)]));
document.getElementById("benchreading").innerHTML =
  `So “no county reaches 69 percent” describes metropolitan America rather than
   Northeast Ohio: <b>${pct(bm.share_below_69)} of the ${bm.n_peer_counties} peer
   counties sit below that line too</b>, and the PIC-12 median
   (${pct(bm.pic12_median)}) runs above the peer median (${pct(bm.peer_median)}).
   Ashtabula crosses 69 here and not earlier because the peer files are in-state only;
   on that basis it reads ${pct(ashB.own_share_work)}.`;
document.getElementById("benchsrc").innerHTML =
  `${B.meta.peer_rule} ${B.meta.size_control} ${B.meta.bases}`;

document.getElementById("regionstable").innerHTML = tableView("rg",
  "Regions of six or more counties",
  ["Region", "Counties", "Jobs located here", "Held by residents of the region"],
  R.map(r => [r.name, r.counties, N(r.jobs_located), pct(r.region_share_work)]));
document.getElementById("regionsreading").innerHTML =
  `<b>PIC-12 holds ${pct(B.totals.work_region_share)} of its jobs inside its own
   borders</b>, and among comparable regions only Pittsburgh matches it. That is the
   claim the county-level figures cannot make, and it is the one that supports a
   twelve-county footprint.`;
document.getElementById("regionssrc").innerHTML =
  `${B.meta.size_control} Every single-state peer metro of six or more counties is
   shown; none was dropped after the numbers were seen.`;

document.getElementById("closersub").innerHTML =
  `<b>The county-level version of this page is not a finding about Northeast Ohio.</b>
   ${pct(B.benchmark.share_below_69)} of ${B.benchmark.n_peer_counties} counties in
   ${B.benchmark.n_peer_metros} peer metros are also below 69 percent, and PIC-12's median
   county (${pct(B.benchmark.pic12_median)}) is above the peer median
   (${pct(B.benchmark.peer_median)}). Published without that comparison it would have
   described the United States and been read as a diagnosis of this region.
   <b>What survives the benchmark is the argument for the footprint.</b> Raise the unit to
   the twelve counties and ${pct(B.totals.work_region_share)} of the jobs are held by
   people who live inside it, while ${pct(B.totals.res_region_share)} of residents' jobs
   sit inside it &mdash; a level matched only by Pittsburgh among comparable regions. It is
   not that twelve counties is a convenient administrative unit; it is that the labor
   market does not stop at any line inside it and very largely does stop at its edge.
   <b>The corollary is still the uncomfortable half:</b> four of the counties feeding this
   workforce most heavily are exactly the ones PIC-12 excludes and NEO-14 includes, so a
   workforce claim scoped to PIC-12 leaves out people who are functionally part of the same
   market. Both footprints are right about different questions, which is why every page
   here says which one it used.`;

/* --------------------------------------------------------------------- assemble */
function drawAll() { drawMatrix(); drawDiag(); drawExt(); drawRecip(); drawBench();
                     drawRegions(); }
drawAll();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* Footprint banner: one line, below the hero rather than above the headline — the
   scope disclosure follows the story's first screen instead of preceding it. */
{
  const fb = PV.footprintBanner({label: FP.label, words: FP.words, note: "", differs: ""},
    `Work end bounded to these twelve counties; home end open on purpose, since the
     question is who arrives from outside.`);
  const hero = document.querySelector(".hero");
  if (hero && fb) hero.after(fb);
}

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "laborshed", meta: D.meta});
})();
