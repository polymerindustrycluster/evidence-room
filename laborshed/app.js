/* The commute matrix.
 *
 * FORM. Origin-destination data pulls hard toward a flow map or a chord diagram. Twelve
 * counties makes both illegible, and neither lets you look at the thing that matters — the
 * DIAGONAL, which is each county's self-supply. A matrix is the only form where a diagonal
 * is an object you can inspect, so it is a matrix, and the diagonal is then pulled out
 * again as a ranked bar because a heatmap is bad at precise comparison.
 *
 * COLOR. Sequential single hue, because the quantity is a magnitude with a meaningful zero.
 * The diagonal is marked with a RULE rather than a second hue: it is the same quantity, not
 * a different category, and giving it its own color would imply otherwise.
 */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, chart, figures, N,
       SEQ, CAT, GRAY, INK} = PV;
const D = await PV.data("laborshed.json");
const FP = PV.footprint(D.meta);
const M = D.matrix, ORDER = D.order;
const pct = v => (v * 100).toFixed(1) + "%";
const weak = M.reduce((a, r) => r.in_county < a.in_county ? r : a);
const strong = M.reduce((a, r) => r.in_county > a.in_county ? r : a);
const summit = M.find(r => r.work_name === "Summit");
const E = D.external;

figures([
  ["key", pct(summit.in_county), "Summit's own residents",
   `hold ${pct(summit.in_county)} of its ${N(summit.jobs_total)} jobs — the cluster's center`],
  ["", pct(strong.in_county), "the highest",
   `${strong.work_name}; no county reaches 69 percent`],
  ["", pct(weak.in_county), "the lowest",
   `${weak.work_name}; seven in ten of its workers live elsewhere`],
  ["", N(E["2022"].distant), "from distant metros",
   "two hours away, and already 54,416 in 2019 — not a pandemic effect"]
]);

/* ------------------------------------------------------------- 1. the matrix */
{
  const n = ORDER.length;
  /* The cell size FOLLOWS the column width; it does not set it. Sizing the cell first
     and letting the box fall where it may is what left this chart 96 units narrower
     than every other figure on the page — the one grid the reader sees as indented. */
  const LEFT = 132, TOP = 128, W = 1100;
  const CELL = Math.floor((W - LEFT) / (n + 1));
  const H = TOP + n * CELL + 40;
  const {svg, m} = chart("matrix", {W, H, m: {t: TOP, r: W - LEFT - (n + 1) * CELL,
                                              b: 40, l: LEFT}});
  const maxShare = Math.max(...M.flatMap(r => r.cells.map(c => c.share)));
  // sequential ramp; a share of zero is a real zero and gets the palest step, not white,
  // so an empty cell reads as measured rather than missing
  const ramp = v => SEQ[Math.min(SEQ.length - 1, Math.max(0,
    Math.round((v / maxShare) ** 0.55 * (SEQ.length - 1))))];

  // VERTICAL, not angled. At -52 degrees each name occupies length*cos(52) of horizontal
  // room — more than a 46px cell — so neighboring headers overlapped. Upright costs only
  // the line height and every header clears its own column.
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
    txt(svg, r.work_name, {x: LEFT - 12, y: TOP + ri * CELL + CELL / 2 + 5,
      "text-anchor": "end", class: "pv-lab"});
    r.cells.forEach((c, ci) => {
      const x = LEFT + ci * CELL, y = TOP + ri * CELL;
      el("rect", {x: x + 1, y: y + 1, width: CELL - 2, height: CELL - 2,
        fill: ramp(c.share)}, svg);
      if (c.share >= 0.05)
        txt(svg, Math.round(c.share * 100), {x: x + CELL / 2, y: y + CELL / 2 + 5,
          "text-anchor": "middle", class: "pv-lab",
          fill: c.share > maxShare * 0.45 ? "#fff" : "var(--pv-ink)"});
      hoverable(el("rect", {x: x + 1, y: y + 1, width: CELL - 2, height: CELL - 2,
        fill: "transparent"}, svg),
        `<b>${N(c.jobs)}</b> jobs<br>worked in <b>${r.work_name}</b><br>
         lived in <b>${c.home_name}</b><br><span class="v">${pct(c.share)}</span> of
         ${r.work_name}'s ${N(r.jobs_total)} jobs`,
        `${c.home_name} to ${r.work_name}: ${N(c.jobs)} jobs, ${pct(c.share)}`);
    });
    // the outside-footprint remainder, so the row is a whole county's jobs
    const ox = LEFT + n * CELL, oy = TOP + ri * CELL;
    el("rect", {x: ox + 1, y: oy + 1, width: CELL - 2, height: CELL - 2,
      fill: ramp(r.outside_share)}, svg);
    txt(svg, Math.round(r.outside_share * 100), {x: ox + CELL / 2, y: oy + CELL / 2 + 5,
      "text-anchor": "middle", class: "pv-lab",
      fill: r.outside_share > maxShare * 0.45 ? "#fff" : "var(--pv-ink)"});
    hoverable(el("rect", {x: ox + 1, y: oy + 1, width: CELL - 2, height: CELL - 2,
      fill: "transparent"}, svg),
      `<b>${N(r.outside)}</b> jobs in <b>${r.work_name}</b><br>held from outside the
       twelve counties<br><span class="v">${pct(r.outside_share)}</span> of its jobs`,
      `${r.work_name}: ${pct(r.outside_share)} from outside the footprint`);
    // the diagonal gets a rule, not a color — it is the same quantity, marked
    const di = ORDER.findIndex(o => o.fips === r.work);
    el("rect", {x: LEFT + di * CELL + 1, y: oy + 1, width: CELL - 2, height: CELL - 2,
      fill: "none", stroke: CAT[1], "stroke-width": 2.5}, svg);
  });
  el("line", {x1: LEFT + n * CELL, y1: TOP - 4, x2: LEFT + n * CELL, y2: TOP + n * CELL,
    stroke: "var(--pv-axis)", "stroke-width": 1.5}, svg);

  document.getElementById("matrixtable").innerHTML = tableView("mx",
    "Share of each county's jobs by home county, 2022",
    ["Works in", "Total jobs", ...ORDER.map(o => o.name), "Outside PIC-12"],
    M.map(r => [r.work_name, N(r.jobs_total),
      ...r.cells.map(c => pct(c.share)), pct(r.outside_share)]));
  document.getElementById("matrixsrc").innerHTML =
    `${D.meta.source}. ${D.meta.row} <b>${D.meta.no_industry}</b>
     ${D.meta.not_a_commute} Cells below five percent are shaded but not numbered, to keep
     the diagonal readable; every value is in the table.`;
}

/* --------------------------------------------------------- 2. the diagonal */
{
  const rows = [...M].sort((a, b) => b.in_county - a.in_county);
  const {svg, m, w, h} = chart("diag", {rows: rows.length, rowH: 34,
    m: {t: 44, r: 17, b: 58, l: 80}});
  const xs = v => m.l + v * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, yt: [],
    xt: [0, .2, .4, .6, .8, 1], xfmt: v => (v * 100).toFixed(0) + "%",
    xlab: "Share of the county's jobs held by its own residents"});
  el("line", {x1: xs(.5), y1: m.t - 8, x2: xs(.5), y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  txt(svg, "half", {x: xs(.5) + 8, y: m.t - 12, class: "pv-lab", fill: "var(--hover)"});
  rows.forEach((r, i) => {
    const y = m.t + i * 34 + 6, bh = 22;
    const me = r.in_county < 0.5;
    el("rect", {x: m.l, y, width: Math.max(3, xs(r.in_county) - m.l), height: bh,
      fill: me ? CAT[1] : SEQ[4], rx: 4}, svg);
    txt(svg, r.work_name, {x: m.l - 12, y: y + bh - 6, "text-anchor": "end",
      class: "pv-lab"});
    txt(svg, `${pct(r.in_county)}  ·  ${N(r.jobs_total)} jobs`,
      {x: xs(r.in_county) + 10, y: y + bh - 6, class: me ? "pv-lab" : "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 6, width: m.l + w + 170, height: bh + 12,
      fill: "transparent"}, svg),
      `<b>${r.work_name}</b><br><span class="v">${N(r.jobs_total)}</span> jobs<br>
       <span class="v">${pct(r.in_county)}</span> held by ${r.work_name} residents<br>
       <span class="v">${pct(r.outside_share)}</span> from outside the twelve counties`,
      `${r.work_name}: ${pct(r.in_county)} in-county`);
  });
  const under = rows.filter(r => r.in_county < 0.5);
  document.getElementById("diagtitle").textContent =
    `${under.length} of the twelve counties are under half`;
  document.getElementById("diagtable").innerHTML = tableView("dg",
    "In-county share of jobs, 2022",
    ["County", "Jobs", "Held by own residents", "From elsewhere in PIC-12",
     "From outside PIC-12"],
    rows.map(r => [r.work_name, N(r.jobs_total), pct(r.in_county),
      pct(1 - r.in_county - r.outside_share), pct(r.outside_share)]));
  document.getElementById("diagnote").innerHTML =
    `<b>What this does and does not license.</b> It licenses retiring the single-county
     workforce figure: "${summit.work_name} County has ${N(summit.jobs_total)} workers" is
     true and describes a place where ${pct(1 - summit.in_county)} of those workers live
     somewhere else. It does <b>not</b> license calling any of this a commute
     &mdash; ${D.meta.not_a_commute.toLowerCase()}
     And it is <b>the whole economy, not the cluster</b>: ${D.meta.no_industry}
     A polymer-specific version of this chart cannot be built from this source at all.`;
}

/* --------------------------------------------------- 3. adjacent vs distant */
{
  const rows = [
    ["Adjacent counties", "plausible daily travel", E["2019"].adjacent, E["2022"].adjacent, SEQ[4]],
    ["Distant metros", "Columbus, Toledo, Cincinnati, Dayton", E["2019"].distant, E["2022"].distant, CAT[1]],
    ["Everywhere else", "including out of state", E["2019"].other, E["2022"].other, GRAY]];
  const {svg, m, w, h} = chart("ext", {H: 300, m: {t: 52, r: 85, b: 66, l: 235}});
  const maxV = Math.max(...rows.flatMap(r => [r[2], r[3]])) * 1.08;
  const xs = v => m.l + (v / maxV) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, yt: [], xt: ticks(0, maxV, 5),
    xfmt: N, xlab: "Jobs in PIC-12 held by people living outside it"});
  const bh = 20, gap = (h - rows.length * (bh * 2 + 10)) / (rows.length - 1 || 1);
  rows.forEach(([label, sub, v19, v22, col], i) => {
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
  document.getElementById("exttable").innerHTML = tableView("ex",
    "Largest external sources of PIC-12 jobs",
    ["Home county", "Type", "2019", "2022", "Change"],
    E.top.map(r => [r.name, r.kind, N(r.jobs_2019), N(r.jobs_2022),
      r.jobs_2019 ? ((r.jobs_2022 / r.jobs_2019 - 1) * 100).toFixed(0) + "%" : "—"]));
  document.getElementById("extnote").innerHTML =
    `<b>This chart exists because a story died here.</b> The hypothesis was that remote work
     broke the labor shed after 2020. Its kill condition was a 2019 baseline showing
     Franklin County already large. <b>Franklin was already 23,506 jobs in 2019</b> —
     already the single largest external source, before the pandemic — so the hypothesis is
     dead and is not on this page.
     <b>What the test found instead is sturdier.</b> Distant metros were already nearly half
     the imported workforce in 2019, which makes the split structural rather than pandemic.
     What did change is the mix: adjacent commuting is flat at +1% while distant residence
     grew 13%. <b>${D.meta.split_is_judgment}</b> Summing the two into one "imported
     workforce" number produces a figure that means nothing, and that was true in 2019 too.`;
}

/* ------------------------------------------- 4. the reciprocal, 5. the benchmark
   Added after a two-family council red-team of the story register asked for both. The
   matrix answers one direction of a two-directional quantity; the benchmark answers
   whether that direction is a finding about this region or a fact about the country. */
const B = await PV.data("bench.json");

{
  /* A DUMBBELL, not two bar charts. The point is the GAP between two measures of the same
     county, and a gap is a length — putting them in separate panels makes the reader hold
     two numbers in their head and subtract. */
  const rows = B.pairs.slice().sort((a, b) => b.work_own - a.work_own);
  const {svg, m, w} = chart("recip", {rows: rows.length, rowH: 30,
    m: {t: 46, r: 0, b: 58, l: 80}});
  /* The domain comes from the DATA, not from a guess. Hard-coded at 0.25-0.80 it clipped
     Geauga's resident share (25.5%) outside the axis entirely — a dot drawn past the end of
     its own scale, which reads as a rendering error and is one. */
  const all = rows.flatMap(r => [r.work_own, r.res_own]);
  const lo = Math.floor(Math.min(...all) * 20) / 20 - 0.01;
  const hi = Math.ceil(Math.max(...all) * 20) / 20 + 0.01;
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * 30, xs, ys: () => 0,
    xt: ticks(Math.ceil(lo * 10) / 10, Math.floor(hi * 10) / 10, 5),
    xfmt: v => Math.round(v * 100) + "%",
    xlab: "Share held locally", ylab: "County"});
  rows.forEach((r, i) => {
    const y = m.t + i * 30 + 15;
    txt(svg, r.name, {x: m.l - 12, y: y + 5, "text-anchor": "end", class: "pv-lab"});
    el("line", {x1: xs(Math.min(r.work_own, r.res_own)), y1: y,
      x2: xs(Math.max(r.work_own, r.res_own)), y2: y,
      stroke: "var(--pv-axis)", "stroke-width": 2}, svg);
    el("circle", {cx: xs(r.work_own), cy: y, r: 6, fill: CAT[0],
      stroke: "var(--paper)", "stroke-width": 2}, svg);
    el("circle", {cx: xs(r.res_own), cy: y, r: 6, fill: CAT[1],
      stroke: "var(--paper)", "stroke-width": 2}, svg);
    hoverable(el("rect", {x: m.l, y: y - 15, width: w, height: 30, fill: "transparent"}, svg),
      `<b>${r.name}</b><br><span class="v">${pct(r.work_own)}</span> of its
       ${N(r.work_jobs)} jobs are held by its own residents<br>
       <span class="v">${pct(r.res_own)}</span> of its residents' ${N(r.res_jobs)} jobs
       sit in the county<br><span class="v">${pct(r.res_region)}</span> sit somewhere in PIC-12`,
      `${r.name}: ${pct(r.work_own)} of jobs held locally, ${pct(r.res_own)} of residents work locally`);
  });
  document.getElementById("reciptable").innerHTML = tableView("rc",
    "Both directions, by county",
    ["County", "Jobs located here", "Held by own residents", "Resident jobs",
     "In own county", "Anywhere in PIC-12"],
    rows.map(r => [r.name, N(r.work_jobs), pct(r.work_own), N(r.res_jobs),
      pct(r.res_own), pct(r.res_region)]));
  document.getElementById("recipsrc").innerHTML =
    `${B.meta.source} ${B.meta.row} <b>${B.meta.bases}</b> The two dots are different
     populations and must not be subtracted from one another: a county can fill its jobs
     with outsiders while its own residents also leave. Region-wide,
     <b>${pct(B.totals.res_region_share)}</b> of PIC-12 residents' jobs sit inside PIC-12,
     and ${pct(B.totals.out_of_state_share)} are out of state entirely.`;
}

{
  /* The peer distribution as a STRIP, not a histogram. 397 counties is enough that the
     shape is legible as points, and a reader has to be able to find the twelve PIC
     counties inside it — which a binned histogram destroys. */
  const bm = B.benchmark;
  const {svg, m, w, h} = chart("bench", {W: 1100, H: 340, m: {t: 56, r: 0, b: 78, l: 0}});
  const lo = 0.10, hi = 0.95;
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  const band = m.t + 46;
  frame(svg, {x: m.l, y: m.t, w, h: h - 12, xs, ys: () => 0,
    xt: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
    xfmt: v => Math.round(v * 100) + "%",
    xlab: "Share of a county's jobs held by its own residents"});
  bm.peer_values.forEach((v, i) => {
    el("line", {x1: xs(v), y1: band - 30 + (i % 7) * 7, x2: xs(v),
      y2: band - 24 + (i % 7) * 7, stroke: GRAY, "stroke-width": 1.4, opacity: 0.5}, svg);
  });
  [[bm.peer_median, "peer median", INK], [0.69, "69%", CAT[2]]].forEach(([v, lab, col]) => {
    el("line", {x1: xs(v), y1: m.t + 4, x2: xs(v), y2: band + 82,
      stroke: col, "stroke-width": 1.5, "stroke-dasharray": "4 4"}, svg);
    txt(svg, lab, {x: xs(v), y: m.t - 6, "text-anchor": "middle", class: "pv-axlab",
      fill: col});
  });
  const ordered = bm.pic12_counties.slice().sort((a, b) => a.own_share_work - b.own_share_work);
  /* Five of the twelve sit inside seven percentage points of each other, so a fixed
     three-row stagger overlapped them into "Mahoni?uyahoga". Each label takes the first
     row whose last label it clears, and is nudged right only if no row is free — the
     leader line keeps it tied to its own tick, so a nudged label still reads correctly. */
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
    const x = xs(r.own_share_work), y = band + 44 + r._row * 17;
    el("line", {x1: x, y1: band + 24, x2: r._x, y2: y - 10, stroke: CAT[0],
      "stroke-width": 1}, svg);
    el("circle", {cx: x, cy: band + 19, r: 5, fill: CAT[0], stroke: "var(--paper)",
      "stroke-width": 2}, svg);
    txt(svg, r.name, {x: r._x, y, "text-anchor": "middle", class: "pv-labq"});
    hoverable(el("circle", {cx: x, cy: band + 19, r: 11, fill: "transparent"}, svg),
      `<b>${r.name}</b><br><span class="v">${pct(r.own_share_work)}</span> of its jobs are
       held by its own residents<br>higher than <span class="v">${pct(r.percentile)}</span>
       of the ${bm.n_peer_counties} peer metro counties`,
      `${r.name}: ${pct(r.own_share_work)}, percentile ${pct(r.percentile)}`);
  });
  document.getElementById("benchtable").innerHTML = tableView("bm",
    "PIC-12 counties against the peer distribution",
    ["County", "Jobs held by own residents", "Percentile among peer metro counties"],
    ordered.map(r => [r.name, pct(r.own_share_work), pct(r.percentile)]));
  document.getElementById("benchsrc").innerHTML =
    `${B.meta.peer_rule} ${B.meta.size_control} <b>${pct(bm.share_below_69)} of the
     ${bm.n_peer_counties} peer metro counties are themselves below 69 percent</b>, and
     their median is ${pct(bm.peer_median)} against a PIC-12 median of
     ${pct(bm.pic12_median)}. <b>So "no county reaches 69 percent" describes metropolitan
     America, not Northeast Ohio — the PIC-12 counties are, if anything, slightly more
     self-contained than the typical peer.</b> ${B.meta.bases} <b>Ashtabula crosses the
     69 percent line here and does not earlier on this page</b>, and the gap is the whole
     point of naming a denominator: on this in-state basis it reads
     ${pct(ordered.at(-1).own_share_work)}, because Pennsylvania residents who work in
     Ashtabula are not in the peer files and so cannot be in Ashtabula's either.`;
}

{
  const R = B.regions;
  const {svg, m, w} = chart("regions", {rows: R.length, rowH: 34,
    m: {t: 44, r: 17, b: 56, l: 157}});
  const xs = v => m.l + v * w;
  frame(svg, {x: m.l, y: m.t, w, h: R.length * 34, xs, ys: () => 0,
    xt: [0, 0.25, 0.5, 0.75, 1], xfmt: v => Math.round(v * 100) + "%",
    xlab: "Jobs held by residents of the same region", ylab: "Region"});
  R.forEach((r, i) => {
    const y = m.t + i * 34 + 6, mine = r.kind === "footprint";
    const short = r.name.split(",")[0].split("--")[0];
    txt(svg, short.length > 22 ? short.slice(0, 21) + "…" : short,
      {x: m.l - 12, y: y + 16, "text-anchor": "end", class: mine ? "pv-lab" : "pv-labq"});
    el("rect", {x: m.l, y, width: xs(r.region_share_work) - m.l, height: 22,
      fill: mine ? CAT[0] : SEQ[1]}, svg);
    txt(svg, pct(r.region_share_work), {x: xs(r.region_share_work) + 8, y: y + 16,
      class: "pv-lab", fill: mine ? CAT[0] : "var(--pv-ink)"});
    txt(svg, `${r.counties} counties`, {x: m.l + 8, y: y + 16, class: "pv-labq",
      fill: "#fff"});
    hoverable(el("rect", {x: m.l, y, width: w, height: 22, fill: "transparent"}, svg),
      `<b>${r.name}</b><br>${r.counties} counties, ${N(r.jobs_located)} jobs<br>
       <span class="v">${pct(r.region_share_work)}</span> held by residents of the region`,
      `${short}: ${pct(r.region_share_work)} across ${r.counties} counties`);
  });
  document.getElementById("regionstable").innerHTML = tableView("rg",
    "Regions of six or more counties",
    ["Region", "Counties", "Jobs located here", "Held by residents of the region"],
    R.map(r => [r.name, r.counties, N(r.jobs_located), pct(r.region_share_work)]));
  document.getElementById("regionssrc").innerHTML =
    `${B.meta.size_control} Every single-state peer metro of six or more counties is shown;
     none was dropped after the numbers were seen. <b>PIC-12 holds
     ${pct(B.totals.work_region_share)} of its jobs inside its own borders</b>, which among
     comparable regions is matched only by Pittsburgh. That is the claim the county-level
     figures cannot make, and it is the one that supports a twelve-county footprint.`;
}

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

PV.footprintBanner(FP, `The WORK end is bounded to these twelve counties. The HOME end is
  deliberately unbounded — the whole question is how much labor arrives from outside.`);

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "laborshed", meta: D.meta});
})();
