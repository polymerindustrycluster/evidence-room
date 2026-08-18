/* Real wages. Three forms for three jobs: a slope chart for RANK CHANGE (the only form
   that shows a reordering as a reordering), a distribution strip for WHERE ONE VALUE SITS
   among many, and a scatter for the TRADE-OFF between two continuous quantities. The
   scatter carries iso-lines of constant real wage, because the whole argument is that
   points off the diagonal are mispriced. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, CAT, GRAY, INK} = PV;
const D = await PV.data("realwage.json");
const M = D.metros, B = D.big;
const N = n => Math.round(n).toLocaleString("en-US");
const usd = v => "$" + N(v);
const short = s => s.split(" (")[0].split("-")[0].split(",")[0];
const full = s => s.split(" (")[0];
const AK = B.find(r => r.area === "10420") || M.find(r => r.area === "10420");
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const cheaper = M.filter(r => r.rpp < AK.rpp).length;

PV.figures([
  ["key", `#${AK.big_rank_real}`, `of ${B.length} on real wages`,
   `up from #${AK.big_rank_nominal} on nominal — metros with 2,000+ polymer jobs`],
  ["", usd(AK.real), "what Akron's wage buys", `${usd(AK.nominal)} nominal, at a ${AK.rpp.toFixed(1)} price level`],
  ["", `${cheaper}`, `of ${M.length} metros are cheaper`, "Akron is a median-price metro, not a cheap one"],
  ["", `+${AK.big_climb}`, "places gained", "the entire size of the cost-of-living argument"]
]);

/* ------------------------------------------------------------- 1. slope */
{
  const {svg, W, H, m, w, h} = PV.chart("slope", {W: 1100, H: 40 + B.length * 15, m: {t: 54, r: 179, b: 44, l: 193}});
  const ys = rank => m.t + ((rank - 1) / (B.length - 1)) * h;
  txt(svg, "Rank by nominal wage", {x: m.l, y: m.t - 26, "text-anchor": "end",
    class: "pv-axlab"});
  txt(svg, "Rank by what it buys", {x: m.l + w, y: m.t - 26, class: "pv-axlab"});
  el("line", {x1: m.l, y1: m.t, x2: m.l, y2: m.t + h, stroke: "var(--pv-axis)"}, svg);
  el("line", {x1: m.l + w, y1: m.t, x2: m.l + w, y2: m.t + h, stroke: "var(--pv-axis)"}, svg);

  // label only what a reader can act on: the home metro, the biggest movers, the top
  const named = new Set([AK.area]);
  [...B].sort((a, b) => b.big_climb - a.big_climb).slice(0, 3).forEach(r => named.add(r.area));
  [...B].sort((a, b) => a.big_climb - b.big_climb).slice(0, 4).forEach(r => named.add(r.area));
  B.filter(r => r.big_rank_real <= 3 || r.big_rank_nominal <= 3).forEach(r => named.add(r.area));

  // Labelled ranks can be adjacent (1, 2, 3), which puts their labels ~8px apart on a
  // 56-row scale while the type is 14px. Precompute a nudged y for each gutter so no two
  // printed labels overlap; the CONNECTOR still lands on the true rank.
  const nudge = (sel) => {
    const pts = B.filter(r => named.has(r.area))
      .map(r => ({area: r.area, y: ys(sel(r))})).sort((a, b) => a.y - b.y);
    const MIN = 16;
    for (let i = 1; i < pts.length; i++)
      if (pts[i].y - pts[i - 1].y < MIN) pts[i].y = pts[i - 1].y + MIN;
    return new Map(pts.map(p => [p.area, p.y]));
  };
  const lyL = nudge(r => r.big_rank_nominal), lyR = nudge(r => r.big_rank_real);

  B.forEach(r => {
    const me = r.area === AK.area, show = named.has(r.area);
    const y1 = ys(r.big_rank_nominal), y2 = ys(r.big_rank_real);
    el("path", {d: `M${m.l},${y1}C${m.l + w * .4},${y1} ${m.l + w * .6},${y2} ${m.l + w},${y2}`,
      fill: "none", stroke: me ? CAT[1] : (show ? INK : GRAY),
      "stroke-width": me ? 3.5 : (show ? 1.6 : 1), opacity: me ? 1 : (show ? .7 : .28)}, svg);
    [[m.l, y1], [m.l + w, y2]].forEach(([cx, cy]) =>
      el("circle", {cx, cy, r: me ? 5.5 : (show ? 3.5 : 2.2),
        fill: me ? CAT[1] : (show ? INK : GRAY), stroke: "var(--paper)",
        "stroke-width": me ? 2 : 1}, svg));
    if (show) {
      txt(svg, `${r.big_rank_nominal}. ${short(r.name)}`,
        {x: m.l - 12, y: (lyL.get(r.area) ?? y1) + 4,
        "text-anchor": "end", class: me ? "pv-lab" : "pv-labq",
        ...(me ? {fill: CAT[1]} : {})});
      txt(svg, `${r.big_rank_real}. ${short(r.name)}`,
        {x: m.l + w + 12, y: (lyR.get(r.area) ?? y2) + 4,
        class: me ? "pv-lab" : "pv-labq", ...(me ? {fill: CAT[1]} : {})});
    }
    hoverable(el("rect", {x: m.l, y: Math.min(y1, y2) - 5, width: w,
      height: Math.abs(y2 - y1) + 10, fill: "transparent"}, svg),
      `<b>${full(r.name)}</b><br>nominal <span class="v">${usd(r.nominal)}</span> —
       rank ${r.big_rank_nominal}<br>price level <span class="v">${r.rpp.toFixed(1)}</span><br>
       buys <span class="v">${usd(r.real)}</span> — rank ${r.big_rank_real}<br>
       <b>${r.big_climb >= 0 ? "+" : ""}${r.big_climb} places</b> ·
       ${N(r.emp)} polymer jobs`,
      `${short(r.name)}: ${r.big_rank_nominal} to ${r.big_rank_real}`);
  });
  document.getElementById("slopetable").innerHTML = tableView("sl",
    `Polymer metros with ${N(D.meta.big_floor)}+ jobs, nominal and price-adjusted weekly wage`,
    ["Metro", "Jobs", "Nominal", "Price level", "Buys", "Nominal rank", "Real rank", "Change"],
    [...B].sort((a, b) => a.big_rank_real - b.big_rank_real).map(r =>
      [full(r.name), N(r.emp), usd(r.nominal), r.rpp.toFixed(1), usd(r.real),
       r.big_rank_nominal, r.big_rank_real, (r.big_climb >= 0 ? "+" : "") + r.big_climb]));
  document.getElementById("slopesrc").innerHTML =
    `${D.meta.source}. ${D.meta.row}. <b>${D.meta.geography}</b>
     Restricted to the <b>${B.length} metros with at least ${N(D.meta.big_floor)} polymer
     jobs</b>, so the comparison is against places that actually do this work rather than
     against every metro in the country. ${D.meta.suppression}
     <b>Cleveland and Canton are not here</b> — BLS withholds their NAICS 326 wage for
     2023, so the region appears through Akron alone.`;
}

/* -------------------------------------------------------- 2. price strip */
{
  const {svg, W, H, m, w, h} = PV.chart("strip", {W: 1100, H: 230, m: {t: 60, r: 0, b: 66, l: 0}});
  const rpps = M.map(r => r.rpp);
  const lo = Math.floor(Math.min(...rpps)), hi = Math.ceil(Math.max(...rpps));
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(lo, hi, 7), yt: [],
    xfmt: v => v.toFixed(0),
    xlab: "Metro price level, US average = 100 (BEA Regional Price Parities, all items)"});
  // one tick per metro — the distribution as it is, not smoothed into a curve
  M.forEach(r => {
    const me = r.area === AK.area;
    el("line", {x1: xs(r.rpp), y1: m.t + (me ? 4 : 22), x2: xs(r.rpp), y2: m.t + h - 4,
      stroke: me ? CAT[1] : GRAY, "stroke-width": me ? 3 : 1,
      opacity: me ? 1 : .38}, svg);
    if (me) {
      txt(svg, `Akron ${r.rpp.toFixed(1)}`, {x: xs(r.rpp), y: m.t - 8,
        "text-anchor": "middle", class: "pv-lab", fill: CAT[1]});
    }
  });
  const mRpp = med(rpps);
  el("line", {x1: xs(mRpp), y1: m.t + 14, x2: xs(mRpp), y2: m.t + h, stroke: INK,
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  txt(svg, `median metro ${mRpp.toFixed(1)}`, {x: xs(mRpp) + 8, y: m.t + 26, class: "pv-lab"});
  el("line", {x1: xs(100), y1: m.t + 14, x2: xs(100), y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  txt(svg, "US average 100", {x: xs(100) + 8, y: m.t + 44, class: "pv-lab",
    fill: "var(--hover)"});
  M.forEach(r => hoverable(el("rect", {x: xs(r.rpp) - 3, y: m.t, width: 6, height: h,
    fill: "transparent"}, svg),
    `<b>${full(r.name)}</b><br>price level <span class="v">${r.rpp.toFixed(1)}</span>`,
    `${short(r.name)}: ${r.rpp.toFixed(1)}`));

  const ext = [...M].sort((a, b) => a.rpp - b.rpp);
  document.getElementById("striptable").innerHTML = tableView("st",
    "Cheapest and most expensive metros by price level",
    ["Metro", "Price level", "Polymer jobs"],
    ext.slice(0, 6).concat(ext.slice(-6)).map(r =>
      [full(r.name), r.rpp.toFixed(1), N(r.emp)]));
  document.getElementById("cheapnote").innerHTML =
    `<b>${cheaper} of ${M.length} metros have a lower price level than Akron.</b> It sits at
     ${AK.rpp.toFixed(1)} against a median metro of ${mRpp.toFixed(1)} — that is
     the ${Math.round(cheaper / M.length * 100)}th percentile, which is another way of
     saying <b>typical</b>. The familiar "low cost of living" line is true only against the
     <em>national average of 100</em>, and that average is pulled up by a handful of very
     expensive places most Ohioans will never compete with for a job.
     <b>So the climb on the previous chart is not because Akron is cheap.</b> It is because
     a large share of the polymer industry sits in metros that are genuinely expensive —
     ${[...B].sort((a, b) => a.big_climb - b.big_climb).slice(0, 3).map(r => short(r.name)).join(", ")}
     all fall when their wages are adjusted. PIC's advantage is relative to <em>this
     industry's geography</em>, not to the country.`;
}

/* ------------------------------------------------------------ 3. scatter */
{
  const {svg, W, H, m, w, h} = PV.chart("scatter", {W: 1100, H: 520, m: {t: 44, r: 71, b: 66, l: 32}});
  const nx = B.map(r => r.nominal), ry = B.map(r => r.rpp);
  const x0 = Math.min(...nx) * .95, x1 = Math.max(...nx) * 1.04;
  const y0 = Math.min(...ry) - 2, y1 = Math.max(...ry) + 2;
  const xs = v => m.l + ((v - x0) / (x1 - x0)) * w;
  const ys = v => m.t + h - ((v - y0) / (y1 - y0)) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: ticks(x0, x1, 6), yt: ticks(y0, y1, 6),
    xfmt: usd, yfmt: v => v.toFixed(0),
    xlab: "Nominal average weekly wage", ylab: "Metro price level (100 = US average)"});
  // iso-lines: every metro on one line offers identical purchasing power
  [1100, 1300, 1500, 1700].forEach(real => {
    const pts = [];
    for (let p = y0; p <= y1; p += 1) { const nom = real * p / 100;
      if (nom >= x0 && nom <= x1) pts.push(`${xs(nom)},${ys(p)}`); }
    if (pts.length < 2) return;
    el("path", {d: "M" + pts.join("L"), fill: "none", stroke: "var(--pv-grid)",
      "stroke-width": 1.5, "stroke-dasharray": "5 4"}, svg);
    const last = pts.at(-1).split(",");
    txt(svg, `buys ${usd(real)}`, {x: +last[0] + 5, y: +last[1] - 5, class: "pv-labq"});
  });
  const rmax = Math.max(...B.map(r => r.emp));
  const placedLbl = {};
  B.forEach(r => {
    const me = r.area === AK.area;
    const rad = 4 + Math.sqrt(r.emp / rmax) * 13;
    el("circle", {cx: xs(r.nominal), cy: ys(r.rpp), r: rad,
      fill: me ? CAT[1] : SEQ[3], opacity: me ? 1 : .5,
      stroke: "var(--paper)", "stroke-width": 2}, svg);
    if (me || r.emp > rmax * .42 || r.rpp > 110) {
      // expensive metros cluster at the top of the scale and their labels collide;
      // remember what has been placed and step down when a slot is taken
      const key = Math.round(xs(r.nominal) / 90);
      const lvl = (placedLbl[key] = (placedLbl[key] || 0) + 1) - 1;
      txt(svg, short(r.name), {x: xs(r.nominal), y: ys(r.rpp) - rad - 6 - lvl * 16,
        "text-anchor": "middle", class: me ? "pv-lab" : "pv-labq",
        ...(me ? {fill: CAT[1]} : {})});
    }
    hoverable(el("circle", {cx: xs(r.nominal), cy: ys(r.rpp), r: Math.max(rad, 11),
      fill: "transparent"}, svg),
      `<b>${full(r.name)}</b><br>nominal <span class="v">${usd(r.nominal)}</span><br>
       price level <span class="v">${r.rpp.toFixed(1)}</span><br>
       buys <span class="v">${usd(r.real)}</span><br>${N(r.emp)} polymer jobs`,
      `${short(r.name)}: ${usd(r.nominal)} at ${r.rpp.toFixed(1)}, buys ${usd(r.real)}`);
  });
  document.getElementById("scattertable").innerHTML = tableView("sc",
    "Largest polymer metros by employment",
    ["Metro", "Jobs", "Nominal", "Price level", "Buys"],
    [...B].sort((a, b) => b.emp - a.emp).slice(0, 20).map(r =>
      [full(r.name), N(r.emp), usd(r.nominal), r.rpp.toFixed(1), usd(r.real)]));
  document.getElementById("scattersrc").innerHTML =
    `Circle area is polymer employment. <b>${D.meta.not}</b> A price level is not a
     quality-of-life measure and this chart is not an argument that anyone should move —
     it is the trade-off a recruiter is already making implicitly, drawn once.`;
}

document.getElementById("closersub").innerHTML =
  `<b>Akron's polymer wage is ${usd(AK.nominal)} a week, which is ${AK.nominal < med(B.map(r => r.nominal)) ? "below" : "above"}
   the median polymer metro. Adjusted for local prices it is ${usd(AK.real)}, which is
   ${AK.real > med(B.map(r => r.real)) ? "above" : "below"} it.</b> That is the whole
   argument, and it is worth exactly ${AK.big_climb} places — real, useful in a recruiting
   conversation, and much smaller than "cost of living" is usually made to carry.
   <b>The number PIC should stop using is "cheap."</b> ${cheaper} metros are cheaper than
   this one. The number worth using is that the polymer industry's biggest employers sit in
   places where the same salary buys a quarter less.`;

/* This page is metro-level end to end; it has no county footprint and says so. */
{
  const b = document.createElement("div");
  b.className = "pv-footprint";
  b.innerHTML = `<b>Metropolitan areas, not the PIC-12 counties.</b> BEA publishes price
    parities only for metros, and they cannot be summed to a county footprint.
    <span class="d">The region appears here as the Akron MSA alone — Cleveland and Canton
    withhold their polymer wage for 2023.</span>`;
  document.querySelector(".mast").after(b);
}

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "realwage", meta: D.meta});
})();
