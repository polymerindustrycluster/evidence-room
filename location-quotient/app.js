/* Location quotient — computed from QCEW components, checked against BLS's own figure.
   Forms chosen per the data's job: trend → line with EMPHASIS (one industry forward,
   the rest as context) rather than six competing hues; ratio-vs-base → scatter, because
   the whole point is that a big ratio can sit on a tiny base; county × industry →
   heatmap, sequential; verification → a residual strip. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, GRAY, INK, CAT} = PV;
const D = await PV.data("lq.json");
const FP = PV.footprint(D.meta);
const N = n => n.toLocaleString("en-US");
const LATEST = D.meta.years[1];
const NAICS = D.naics.map(n => n.code);
let picked = "3262";                       // rubber products — the region's signature

/* ------------------------------------------------------------- hero figures */
{
  const comp = y => D.composite.filter(c => c.year === y);
  const latest = comp(LATEST);
  const top = [...latest].filter(c => c.lq).sort((a, b) => b.lq - a.lq)[0];
  const rubber = latest.find(c => c.naics === "3262");
  const pr = latest.find(c => c.naics === "326");
  PV.figures([
    ["key", pr.lq.toFixed(2) + "×", "plastics & rubber", `${FP.label} against the nation, ${LATEST}`],
    ["", rubber.lq.toFixed(2) + "×", "rubber products", "the industry Akron is named for"],
    ["", top.lq.toFixed(2) + "×", top.label.split(",")[0].split(" &")[0].toLowerCase(),
     "the region's strongest, and least discussed"],
    ["", "±" + D.meta.verification.max_abs_residual.toFixed(3), "worst error",
     `against BLS across ${N(D.meta.verification.cells_checked)} cells`]
  ]);
}

/* ------------------------------------------------------------- 1. the trend */
const picker = document.getElementById("picker");
const REG = {core: "measured as the cluster", detail: "sub-slice of a core code",
             context: "outside the measurement register"};
picker.innerHTML = D.naics.map(n =>
  `<button class="pick reg-${n.register}" type="button" data-n="${n.code}"
     aria-pressed="${n.code === picked}"
     title="${n.code} — ${REG[n.register]}">${n.label}<span class="reg">${n.register}</span></button>`)
  .join("");
picker.querySelectorAll(".pick").forEach(b => b.addEventListener("click", () => {
  picked = b.dataset.n;
  picker.querySelectorAll(".pick").forEach(x =>
    x.setAttribute("aria-pressed", String(x.dataset.n === picked)));
  drawTrend();
}));

function drawTrend() {
  const {svg, W, H, m, w, h} = PV.chart("trend", {W: 1100, H: 420, m: {t: 40, r: 237, b: 62, l: 38}});
  const years = [...new Set(D.composite.map(c => c.year))].sort();
  const vals = D.composite.filter(c => c.lq).map(c => c.lq);
  const maxY = Math.max(...vals) * 1.06;
  const xs = y => m.l + ((y - years[0]) / (years.at(-1) - years[0])) * w;
  const ys = v => m.t + h - (v / maxY) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: years.filter((_, i) => i % 2 === 0),
    yt: ticks(0, maxY, 6), xfmt: v => v, yfmt: v => v.toFixed(1) + "×",
    xlab: "Year", ylab: `Location quotient, ${FP.label} against the nation`});

  // parity line: 1.0 is "exactly the national share" and is the only meaningful gridline
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  txt(svg, "1.0× — the national share", {x: m.l + 8, y: ys(1) - 8, class: "pv-lab",
    fill: "var(--hover)"});

  // Right-hand labels: nudge apart so no two collide, then draw a leader where a
  // label had to move off its line.
  const ends = NAICS.map(code => {
    const s = D.composite.filter(c => c.naics === code && c.lq).sort((a, b) => a.year - b.year);
    return s.length ? {code, s, y: ys(s.at(-1).lq)} : null;
  }).filter(Boolean).sort((a, b) => a.y - b.y);
  const MIN = 15;
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < MIN) ends[i].y = ends[i - 1].y + MIN;

  NAICS.forEach(code => {
    const e = ends.find(x => x.code === code);
    if (!e) return;
    const s = e.s, on = code === picked;
    const d = "M" + s.map(c => `${xs(c.year)},${ys(c.lq)}`).join("L");
    el("path", {d, fill: "none", stroke: on ? INK : GRAY,
      "stroke-width": on ? 3 : 1.5, opacity: on ? 1 : .45}, svg);
    const last = s.at(-1), yTrue = ys(last.lq);
    if (Math.abs(e.y - yTrue) > 2)
      el("path", {d: `M${m.l + w + 2},${yTrue}L${m.l + w + 9},${e.y - 4}`, fill: "none",
        stroke: on ? INK : GRAY, "stroke-width": 1, opacity: .6}, svg);
    txt(svg, `${last.lq.toFixed(2)}× ${s[0].label}`,
      {x: m.l + w + 12, y: e.y, class: on ? "pv-lab" : "pv-labq",
       fill: on ? INK : "var(--pv-muted)"});
    if (on) s.forEach(c => hoverable(
      el("circle", {cx: xs(c.year), cy: ys(c.lq), r: 5, fill: INK,
        stroke: "var(--paper)", "stroke-width": 2}, svg),
      `<b>${c.label}, ${c.year}</b><br><span class="v">${c.lq.toFixed(2)}×</span> the national share
       <br><span class="v">${N(c.emp)}</span> jobs across ${N(c.estabs)} establishments
       ${c.counties_suppressed ? `<br>${c.counties_suppressed} of ${FP.n} counties withheld` : ""}`,
      `${c.label} ${c.year}: ${c.lq.toFixed(2)}×`));
  });

  const sel = D.composite.filter(c => c.naics === picked).sort((a, b) => a.year - b.year);
  const supp = sel.at(-1).counties_suppressed;
  const reg = D.naics.find(n => n.code === picked).register;
  const regLine = reg === "core"
    ? `<b>${picked} is in PIC's measurement register</b> (3252 + 3255 + 326) — the slice the
       cluster-health dashboard may publish as the cluster.`
    : reg === "detail"
    ? `<b>${picked} is a sub-slice of 326</b>. Real on its own; never add it to its parent.`
    : `<b>${picked} is outside PIC's measurement register.</b> Chemical manufacturing sweeps in
       pharmaceuticals, agricultural chemicals, industrial gas and explosives — 9,219 jobs in
       NEO-14 in 2025, 60% of its own figure. Read it as context, never as the cluster.`;
  document.getElementById("trendsrc").innerHTML = regLine + " " +
    `Source: BLS QCEW annual averages, ${D.meta.years[0]}&ndash;${D.meta.years[1]}. A row is one
     (year, county, industry) cell and <b>counts jobs covered by unemployment insurance</b> — not
     people, and not companies, so it never reconciles with the vault's company counts. The NEO-14
     composite is summed from counties and is ours, not BLS's; BLS publishes no figure for a custom
     geography. ${supp ? `<b>${supp} of ${FP.n} counties are withheld in ${LATEST} for
     ${sel.at(-1).label.toLowerCase()}</b>. <b>That does not make the line a floor.</b> A
     withheld county drops out of the numerator and the denominator together, and the
     counties BLS withholds are the small ones — which are usually the least concentrated.
     Removing them tends to <em>raise</em> a location quotient, so an incomplete composite
     is more plausibly a ceiling than a floor. Only additive counts — jobs, establishments —
     are floors when cells are missing. Ratios are neither.`
     : `All ${FP.n} counties disclosed in the latest year for this industry.`}`;

  document.getElementById("trendtable").innerHTML = tableView("t",
    `Location quotient by year — ${sel[0].label}`,
    ["Year", "LQ", "Jobs", "Establishments", "Counties withheld"],
    sel.map(c => [c.year, c.lq ? c.lq.toFixed(2) + "×" : "—", c.emp ? N(c.emp) : "—",
      c.estabs ? N(c.estabs) : "—", c.counties_suppressed]));
}

/* ---------------------------------------------------------- 2. the scatter */
{
  const pts = D.cells.filter(c => c.year === LATEST && c.lq && c.emp && c.area !== "39000");
  const {svg, W, H, m, w, h} = PV.chart("scatter", {W: 1100, H: 460, m: {t: 40, r: 6, b: 66, l: 34}});
  const maxE = Math.max(...pts.map(p => p.emp));
  const maxL = Math.max(...pts.map(p => p.lq)) * 1.05;
  const xs = v => m.l + (Math.sqrt(v) / Math.sqrt(maxE)) * w;   // sqrt: the small bases matter
  const ys = v => m.t + h - (v / maxL) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys,
    xt: [0, 100, 500, 1000, 2000, 4000, 6000].filter(v => v <= maxE),
    yt: ticks(0, maxL, 6), xfmt: N, yfmt: v => v.toFixed(0) + "×",
    xlab: "Jobs in that county and industry (square-root scale)",
    ylab: "Location quotient"});
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  pts.forEach(p => {
    hoverable(el("circle", {cx: xs(p.emp), cy: ys(p.lq), r: 6, fill: SEQ[4],
      stroke: "var(--paper)", "stroke-width": 2}, svg),
      `<b>${p.name} County — ${p.label}</b><br><span class="v">${p.lq.toFixed(2)}×</span>
       the national share<br><span class="v">${N(p.emp)}</span> jobs across
       ${N(p.estabs)} establishments`,
      `${p.name}, ${p.label}: ${p.lq.toFixed(2)}× on ${N(p.emp)} jobs`);
  });
  // label only the extremes — never a value on every point
  [...pts].sort((a, b) => b.lq - a.lq).slice(0, 3).forEach(p =>
    txt(svg, `${p.name} · ${p.naics}`, {x: xs(p.emp) + 11, y: ys(p.lq) + 4, class: "pv-lab"}));
  const big = [...pts].sort((a, b) => b.emp - a.emp)[0];
  txt(svg, `${big.name} · ${big.naics}`, {x: xs(big.emp) - 11, y: ys(big.lq) + 4,
    "text-anchor": "end", class: "pv-lab"});

  /* Parity caption LAST, on a backing plate. Drawn earlier it collided with the
     largest-base county's label at the same right edge — SVG paints in document order,
     so a plate is only a plate if nothing is painted after it. */
  {
    const lx = m.l + w - 4, ly = ys(1) - 9;
    el("rect", {x: lx - 34, y: ly - 12, width: 38, height: 18, fill: "var(--paper)",
      opacity: .92, rx: 3}, svg);
    txt(svg, "1.0×", {x: lx, y: ly, "text-anchor": "end", class: "pv-lab", "data-pv-plated": "1",
      fill: "var(--hover)"});
  }

  const top = [...pts].sort((a, b) => b.lq - a.lq)[0];
  document.getElementById("scattersrc").innerHTML =
    `The x-axis is square-root scaled so the small-base counties stay readable; that is a
     legibility choice, not a transformation of the data. <b>${top.name} County's
     ${top.lq.toFixed(1)}× in ${top.label.toLowerCase()} is ${N(top.emp)} jobs across
     ${N(top.estabs)} establishments</b> — real, and small. A concentration figure without its
     base is half a fact.`;
  document.getElementById("scattertable").innerHTML = tableView("s",
    `Concentration against employment, ${LATEST}`,
    ["County", "Industry", "LQ", "Jobs", "Establishments"],
    [...pts].sort((a, b) => b.lq - a.lq).slice(0, 20)
      .map(p => [p.name, p.label, p.lq.toFixed(2) + "×", N(p.emp), N(p.estabs)]));
}

/* ---------------------------------------------------------- 3. the heatmap */
{
  const areas = D.areas.filter(a => !["39000", "US000"].includes(a.code));
  const cells = D.cells.filter(c => c.year === LATEST);
  const get = (a, n) => cells.find(c => c.area === a && c.naics === n);
  const {svg, W, H, m, w, h} = PV.chart("heat", {W: 1100, rows: areas.length, rowH: 34, m: {t: 178, r: 192, b: 24, l: 80}});
  const defs = el("defs", {}, svg);
  const pat = el("pattern", {id: "supp", width: 7, height: 7,
    patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)"}, defs);
  el("rect", {width: 7, height: 7, fill: "#F2EFE9"}, pat);
  el("line", {x1: 0, y1: 0, x2: 0, y2: 7, stroke: "#C9C3B8", "stroke-width": 3}, pat);
  const cw = w / NAICS.length, ch = h / areas.length;
  const STEPS = [0, 1, 2, 4, 7, 11];
  const shade = lq => SEQ[Math.max(0, STEPS.findLastIndex(s => lq >= s))];
  D.naics.forEach((n, i) => {
    // Upright, anchored START. -18 degrees left a long industry name lying across its
    // neighbors; -90 with the default MIDDLE anchor centered it on the header line and
    // sent half of it down into the cells. Anchoring at the start makes it grow upward
    // from the header line only, which is what the enlarged top margin is for.
    const cx = m.l + i * cw + cw / 2;
    txt(svg, n.label.split(" &")[0].split(",")[0],
      {x: cx, y: m.t - 10, "text-anchor": "start", class: "pv-lab",
       transform: `rotate(-90 ${cx} ${m.t - 10})`});
  });
  areas.sort((a, b) => (get(b.code, "326")?.lq || 0) - (get(a.code, "326")?.lq || 0));
  areas.forEach((a, r) => {
    txt(svg, a.name, {x: m.l - 12, y: m.t + r * ch + ch / 2 + 4, "text-anchor": "end",
      class: "pv-lab"});
    NAICS.forEach((n, c) => {
      const cell = get(a.code, n);
      const x = m.l + c * cw + 1, y = m.t + r * ch + 1;
      const ok = cell && cell.lq != null;
      el("rect", {x, y, width: cw - 2, height: ch - 2,
        fill: ok ? shade(cell.lq) : "url(#supp)"}, svg);
      // White is legible on the darkest step only. PIC brand law: never white on #1A8A9E.
      if (ok) txt(svg, cell.lq.toFixed(1), {x: x + cw / 2 - 1, y: y + ch / 2 + 4,
        "text-anchor": "middle", class: "pv-lab",
        fill: cell.lq >= 11 ? "#fff" : "var(--pv-ink)"});
      hoverable(el("rect", {x, y, width: cw - 2, height: ch - 2, fill: "transparent"}, svg),
        ok ? `<b>${a.name} — ${cell.label}</b><br><span class="v">${cell.lq.toFixed(2)}×</span>
              on <span class="v">${N(cell.emp)}</span> jobs`
           : `<b>${a.name} — ${D.naics[c].label}</b><br>withheld by BLS (disclosure), not zero`,
        ok ? `${a.name}, ${cell.label}: ${cell.lq.toFixed(2)}×` : `${a.name}: withheld`);
    });
  });
  const lx = m.l + w + 34;
  txt(svg, "Location quotient", {x: lx, y: m.t - 12, class: "pv-axlab"});
  STEPS.forEach((s, i) => {
    el("rect", {x: lx, y: m.t + i * 26, width: 22, height: 22, fill: SEQ[i]}, svg);
    txt(svg, i === STEPS.length - 1 ? `${s}×+` : `${s}–${STEPS[i + 1]}×`,
      {x: lx + 30, y: m.t + 16 + i * 26, class: "pv-tick"});
  });
  el("rect", {x: lx, y: m.t + STEPS.length * 26 + 6, width: 22, height: 22,
    fill: "url(#supp)"}, svg);
  txt(svg, "withheld", {x: lx + 30, y: m.t + STEPS.length * 26 + 22, class: "pv-tick"});
  document.getElementById("heattitle").textContent =
    `Every county against every industry, ${LATEST}`;
  document.getElementById("heattable").innerHTML = tableView("h",
    `Location quotient by county and industry, ${LATEST}`,
    ["County", ...D.naics.map(n => n.label)],
    areas.map(a => [a.name, ...NAICS.map(n => {
      const c = get(a.code, n);
      return c && c.lq != null ? c.lq.toFixed(2) : "withheld";
    })]));
}

/* ------------------------------------------------------- 4. the verification */
{
  const rs = D.cells.filter(c => c.residual != null).map(c => c.residual);
  const {svg, W, H, m, w, h} = PV.chart("resid", {W: 1100, H: 190, m: {t: 34, r: 17, b: 56, l: 19}});
  const lim = 0.01;
  const xs = v => m.l + ((v + lim) / (2 * lim)) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0,
    xt: [-0.01, -0.005, 0, 0.005, 0.01], xfmt: v => v.toFixed(3), yt: [],
    xlab: "Computed location quotient minus the figure BLS publishes"});
  el("line", {x1: xs(0), y1: m.t, x2: xs(0), y2: m.t + h, stroke: "var(--pv-axis)",
    "stroke-width": 1.5}, svg);
  rs.forEach((v, i) => el("circle", {cx: xs(Math.max(-lim, Math.min(lim, v))),
    cy: m.t + 14 + (i % 9) * 8, r: 3, fill: SEQ[4], opacity: .55}, svg));
  hoverable(el("rect", {x: m.l, y: m.t, width: w, height: h, fill: "transparent"}, svg),
    `<b>${N(rs.length)} cells checked</b><br>mean absolute error
     <span class="v">${D.meta.verification.mean_abs_residual.toFixed(5)}</span><br>
     worst <span class="v">${D.meta.verification.max_abs_residual.toFixed(5)}</span>`,
    `${rs.length} cells checked, max error ${D.meta.verification.max_abs_residual}`);
  document.getElementById("residtable").innerHTML = tableView("v",
    "Reproduction check against BLS's published location quotient",
    ["Measure", "Value"],
    [["Cells checked", N(D.meta.verification.cells_checked)],
     ["Mean absolute error", D.meta.verification.mean_abs_residual.toFixed(6)],
     ["Worst error", D.meta.verification.max_abs_residual.toFixed(6)],
     ["Cells withheld by BLS", N(D.cells.filter(c => c.suppressed).length)]]);
  document.getElementById("defnote").innerHTML =
    `<b>The definition, established rather than assumed.</b> ${D.meta.definition} The intuitive
     alternative — private employment over private employment — is wrong by 0.19 on average and by
     as much as 1.03, which is the difference between "the region is twice the national average"
     and "three times." This chart exists so that if BLS changes its method, or ours drifts, the
     divergence is visible before it reaches a funder.`;
}

drawTrend();
addEventListener("resize", drawTrend, {passive: true});
document.getElementById("closersub").innerHTML =
  `Every figure on this page comes from a free public file, is reproduced to within
   ${D.meta.verification.max_abs_residual.toFixed(3)} of the official number, decomposes to six
   industries and ${FP.words} counties, and updates annually without a license. <b>Team NEO's single
   figure cannot be decomposed, cannot be trended, and cannot be checked.</b>`;

/* Footprint banner — stated on the page, not left to the reader to infer. */
PV.footprintBanner(FP);

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "location-quotient", meta: D.meta});
})();
