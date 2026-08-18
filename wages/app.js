/* Wage premium. The measure is deliberately a RATIO against each county's own
   all-industry average, so the chart is diverging around 1.0 — the one place a
   diverging encoding is correct here, because 1.0 genuinely means "nothing". */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, CAT, GRAY, INK} = PV;
const D = await PV.data("wages.json");
const FP = PV.footprint(D.meta);
const N = n => n.toLocaleString("en-US");
const money = v => "$" + Math.round(v).toLocaleString("en-US");
const rows = D.latest_rows.filter(r => r.vs_local_all).sort((a, b) => b.vs_local_all - a.vs_local_all);
const med = a => { const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const above = rows.filter(r => r.vs_local_all > 1).length;

PV.figures([
  ["key", above + " of " + rows.length, "pay above local", "county-industry cells, " + D.meta.latest],
  ["", med(rows.map(r => r.vs_local_all)).toFixed(2) + "×", "median premium",
   "against the county's own average"],
  ["", money(med(rows.map(r => r.weekly_wage))), "median weekly wage", "per covered job"],
  ["", rows.length - above, "pay below", "and that is worth knowing too"]
]);

/* ------------------------------------------------------------ 1. the premium */
{
  const {svg, W, H, m, w, h} = PV.chart("prem", {W: 1100, rows: rows.length, rowH: 21, m: {t: 50, r: 56, b: 58, l: 230}});
  const lo = Math.min(0.6, ...rows.map(r => r.vs_local_all));
  const hi = Math.max(...rows.map(r => r.vs_local_all)) * 1.03;
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(lo, hi, 6),
    xfmt: v => v.toFixed(1) + "×", yt: [],
    xlab: "Weekly wage ÷ that county's all-industry average weekly wage"});
  const one = xs(1);
  el("line", {x1: one, y1: m.t - 8, x2: one, y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 2}, svg);
  txt(svg, "1.0× — the local average", {x: one + 8, y: m.t - 14, class: "pv-lab",
    fill: "var(--hover)"});
  rows.forEach((r, i) => {
    const y = m.t + i * 21 + 10;
    const x0 = Math.min(one, xs(r.vs_local_all)), x1 = Math.max(one, xs(r.vs_local_all));
    el("line", {x1: x0, y1: y, x2: x1, y2: y,
      stroke: r.vs_local_all >= 1 ? SEQ[3] : CAT[1], "stroke-width": 2}, svg);
    el("circle", {cx: xs(r.vs_local_all), cy: y, r: 5,
      fill: r.vs_local_all >= 1 ? SEQ[4] : CAT[1], stroke: "var(--paper)",
      "stroke-width": 1.5}, svg);
    txt(svg, `${r.name} · ${r.label.split(" &")[0].split(",")[0]}`,
      {x: m.l - 12, y: y + 4, "text-anchor": "end", class: "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 10, width: W, height: 20, fill: "transparent"}, svg),
      `<b>${r.name} County — ${r.label}</b><br><span class="v">${money(r.weekly_wage)}</span>
       a week<br><span class="v">${r.vs_local_all.toFixed(2)}×</span> the local average
       ${r.vs_us ? `<br><span class="v">${r.vs_us.toFixed(2)}×</span> the same industry nationally` : ""}
       <br><span class="v">${N(r.emp)}</span> jobs`,
      `${r.name}, ${r.label}: ${r.vs_local_all.toFixed(2)}× local average`);
  });
  const top = rows[0], bot = rows.at(-1);
  [[top, 0], [bot, rows.length - 1]].forEach(([r, i]) =>
    txt(svg, `${money(r.weekly_wage)}/wk`,
      {x: xs(r.vs_local_all) + 12, y: m.t + i * 21 + 14, class: "pv-lab"}));
  document.getElementById("premtitle").textContent =
    `Every county and industry against its own local average, ${D.meta.latest}`;
  document.getElementById("premsrc").innerHTML =
    `${D.meta.source}. ${D.meta.row}. Cells BLS withheld are absent, not zero, which is why
     there are ${rows.length} rows rather than 84. <b>${D.meta.caution}</b> The highest
     premium here is ${top.name} County ${top.label.toLowerCase()} at
     ${top.vs_local_all.toFixed(2)}× on ${N(top.emp)} jobs; the lowest is ${bot.name}
     ${bot.label.toLowerCase()} at ${bot.vs_local_all.toFixed(2)}×.`;
  document.getElementById("premtable").innerHTML = tableView("p",
    `Wage premium by county and industry, ${D.meta.latest}`,
    ["County", "Industry", "Weekly wage", "× local average", "× same industry US", "Jobs"],
    rows.map(r => [r.name, r.label, money(r.weekly_wage), r.vs_local_all.toFixed(2),
      r.vs_us ? r.vs_us.toFixed(2) : "—", N(r.emp)]));
}

/* --------------------------------------------------------------- 2. the trend */
{
  const years = [...new Set(D.trend.filter(r => r.vs_local_all).map(r => r.year))].sort();
  const pts = years.map(y => {
    const v = D.trend.filter(r => r.year === y && r.vs_local_all).map(r => r.vs_local_all);
    return {year: y, med: med(v), n: v.length};
  });
  const {svg, W, H, m, w, h} = PV.chart("trend", {W: 1100, H: 320, narrow: true, m: {t: 40, r: 50, b: 60, l: 44}});
  const lo = Math.min(0.95, ...pts.map(p => p.med)) - 0.03;
  const hi = Math.max(...pts.map(p => p.med)) + 0.03;
  const xs = y => m.l + ((y - years[0]) / (years.at(-1) - years[0])) * w;
  const ys = v => m.t + h - ((v - lo) / (hi - lo)) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: years.filter((_, i) => i % 2 === 0),
    yt: ticks(lo, hi, 5), xfmt: v => v, yfmt: v => v.toFixed(2) + "×",
    xlab: "Year", ylab: "Median wage premium over the local average"});
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  txt(svg, "1.0×", {x: m.l + w + 8, y: ys(1) + 4, class: "pv-lab", fill: "var(--hover)"});
  el("path", {d: "M" + pts.map(p => `${xs(p.year)},${ys(p.med)}`).join("L"), fill: "none",
    stroke: INK, "stroke-width": 3}, svg);
  pts.forEach(p => hoverable(
    el("circle", {cx: xs(p.year), cy: ys(p.med), r: 5.5, fill: INK,
      stroke: "var(--paper)", "stroke-width": 2}, svg),
    `<b>${p.year}</b><br>median premium <span class="v">${p.med.toFixed(2)}×</span>
     <br>across <span class="v">${p.n}</span> measurable cells`,
    `${p.year}: ${p.med.toFixed(2)}×`));
  txt(svg, pts.at(-1).med.toFixed(2) + "×", {x: xs(pts.at(-1).year) + 12,
    y: ys(pts.at(-1).med) + 4, class: "pv-lab"});
  document.getElementById("trendtable").innerHTML = tableView("t",
    "Median wage premium by year", ["Year", "Median premium", "Cells measured"],
    pts.map(p => [p.year, p.med.toFixed(3) + "×", p.n]));
  document.getElementById("caveat").innerHTML =
    `<b>What an average weekly wage hides.</b> ${D.meta.caution} It is a total-payroll
     divided by a job-count, so a plant running overtime looks like a pay rise and a plant
     cutting hours looks like a pay cut. It also mixes a plant manager and a line operator
     into one number. The measure is still the right one for this question — it is the only
     wage series published annually for every county and industry — but it answers "what
     does this industry pay here relative to everything else here", not "what would you
     earn."`;
  document.getElementById("closersub").innerHTML =
    `The premium in ${years.at(-1)} is <b>${pts.at(-1).med.toFixed(2)}×</b> the local average,
     against <b>${pts[0].med.toFixed(2)}×</b> in ${years[0]}. That is a workforce claim PIC
     can make with a public source, a denominator, and eleven years behind it.`;
}

/* Footprint banner — stated on the page, not left to the reader to infer. */
PV.footprintBanner(FP);

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "wages", meta: D.meta});
})();
