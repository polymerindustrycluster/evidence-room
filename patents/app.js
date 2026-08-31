/* Does the region still invent it? — USPTO filings, three baselines, one finding.
 *
 * CHART-BOUND VALUES RENDER FROM data/patents.json; nothing numeric is typed here.
 * Both charts re-lay out from their container width, so the render scale is 1 and the
 * 12px floor is a real floor at every viewport (the sources-page approach, not the
 * shared fixed-width-and-pan fallback, which hides evidence on phones).
 */
(async () => {
"use strict";
const {el, txt, ticks, frame, chart, figures, tableView, hoverable, N, GRAY, INK} = PV;

const D = await PV.data("patents.json");
const ROWS = D.rows;
const C = ROWS.filter(r => r.complete);
const BASE = C[0], LAST = C.at(-1);
const idx = (r, k) => r[k] / BASE[k] * 100;

const OHIO = INK, ALL = "#7A8C91", US = "#B9C4C7", WARN = "#C85F0C";

/* ---------------------------------------------------------------- hero stats */
figures([
  ["key", Math.round((1 - LAST.us_inv / BASE.us_inv) * 100) + "%",
   "fall in American polymer filings since 2015",
   "while American patenting overall fell " +
     Math.round((1 - LAST.us_inv_all / BASE.us_inv_all) * 100) + "%"],
  ["", N(LAST.ohio), "polymer applications filed from Ohio, 2023",
   Math.round((1 - LAST.ohio / BASE.ohio) * 100) +
     "% below 2015, in step with American polymer filings"],
  ["", (BASE.ohio / BASE.us_inv * 100).toFixed(1) + "% → " +
       (LAST.ohio / LAST.us_inv * 100).toFixed(1) + "%",
   "Ohio’s share of American polymer filings", "held near one in ten"],
]);

/* ------------------------------------------------- chart 1: the three lines */
function drawIdx() {
  const host = document.getElementById("idx");
  const CW = Math.max(320, Math.round(host.parentElement.getBoundingClientRect().width));
  const mob = CW < 620;
  const m = {t: 30, r: mob ? 96 : 168, b: 44, l: 40};
  const H = mob ? 300 : 380;
  const {svg, w, h} = chart("idx", {W: CW, H, m});

  const years = C.map(r => r.year);
  const vals = C.flatMap(r => ["ohio", "ohio_all", "us_inv", "us_inv_all"].map(k => idx(r, k)));
  const lo = Math.floor(Math.min(...vals) / 5) * 5 - 2;
  const hi = Math.ceil(Math.max(...vals) / 5) * 5 + 2;
  const xs = y => m.l + (y - years[0]) / (years.at(-1) - years[0]) * w;
  const ys = v => m.t + (hi - v) / (hi - lo) * h;

  frame(svg, {x: m.l, y: m.t, w, h, xs, ys,
    xt: years.filter((y, i) => mob ? i % 2 === 0 : true), yt: ticks(lo + 2, hi - 2, 6),
    xfmt: y => "’" + String(y).slice(2), ylab: "2015 = 100"});
  el("line", {x1: m.l, y1: ys(100), x2: m.l + w, y2: ys(100), stroke: INK,
    "stroke-width": 1, "stroke-dasharray": "4 3", opacity: .55}, svg);

  const series = [
    {k: "us_inv_all", c: US,        wd: 2,   dash: "5 4", lab: mob ? "US, all" : "US, all classes"},
    {k: "ohio_all",   c: ALL,       wd: 2,   dash: null,  lab: mob ? "Ohio, all" : "Ohio, all classes"},
    {k: "us_inv",     c: "#4E8A96", wd: 2.5, dash: "5 4", lab: mob ? "US poly." : "US polymer"},
    {k: "ohio",       c: OHIO,      wd: 3.5, dash: null,  lab: mob ? "Ohio poly." : "Ohio polymer"},
  ];
  /* End labels, de-collided the cost-scissors way. */
  const ends = series.map(s => ({s, y: ys(idx(LAST, s.k))})).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < 17) ends[i].y = ends[i - 1].y + 17;

  series.forEach(s => {
    const a = {d: "M" + C.map(r => `${xs(r.year)},${ys(idx(r, s.k))}`).join("L"),
      fill: "none", stroke: s.c, "stroke-width": s.wd};
    if (s.dash) a["stroke-dasharray"] = s.dash;
    el("path", a, svg);
  });
  series.forEach(s => {
    const e = ends.find(x => x.s === s);
    const a = {x1: m.l + w + 4, y1: e.y, x2: m.l + w + 16, y2: e.y,
      stroke: s.c, "stroke-width": s.wd};
    if (s.dash) a["stroke-dasharray"] = s.dash;
    el("line", a, svg);
    txt(svg, `${idx(LAST, s.k).toFixed(mob ? 0 : 1)} ${s.lab}`,
      {x: m.l + w + 20, y: e.y + 4, class: "pv-labq",
       fill: s.k === "ohio" ? OHIO : "#4A5A5E"});
  });

  /* The claim, on the chart. */
  /* The wedge annotation needs open air the phone layout does not have; the lede
     carries the sentence there and the end labels still name the wedge's two edges. */
  if (!mob) {
  const ax = xs(2020.4);
  const ay = ys((idx(LAST, "us_inv") + idx(LAST, "ohio_all")) / 2);
  txt(svg, "American polymer fell;", {x: ax, y: ay - 8,
    "text-anchor": "middle", class: "pv-lab", fill: OHIO});
  txt(svg, "American patenting did not", {x: ax, y: ay + 10,
    "text-anchor": "middle", class: "pv-labq"});
  }

  years.forEach(y => {
    const r = C.find(x => x.year === y);
    hoverable(el("rect", {x: xs(y) - w / years.length / 2, y: m.t,
      width: Math.max(2, w / years.length), height: h, fill: "transparent"}, svg),
      `<b>${y}</b><br>Ohio polymer <span class="v">${idx(r, "ohio").toFixed(1)}</span>` +
      `<br>US polymer <span class="v">${idx(r, "us_inv").toFixed(1)}</span>` +
      `<br>Ohio, all classes <span class="v">${idx(r, "ohio_all").toFixed(1)}</span>` +
      `<br>US, all classes <span class="v">${idx(r, "us_inv_all").toFixed(1)}</span>`, String(y));
  });

  document.getElementById("idxtable").innerHTML =
    tableView("idxtable", "Indexed to 2015 = 100, complete years, US inventor addresses",
    ["Year", "Ohio polymer", "US polymer", "Ohio all classes", "US all classes"],
    C.map(r => [r.year, idx(r, "ohio").toFixed(1), idx(r, "us_inv").toFixed(1),
                idx(r, "ohio_all").toFixed(1), idx(r, "us_inv_all").toFixed(1)]));
}

/* ------------------------------------------- chart 2: the level and the lag */
function drawBars() {
  const host = document.getElementById("bars");
  const CW = Math.max(320, Math.round(host.parentElement.getBoundingClientRect().width));
  const mob = CW < 620;
  const m = {t: 44, r: 12, b: 40, l: 40};
  const H = mob ? 280 : 340;
  const {svg, w, h} = chart("bars", {W: CW, H, m});

  const max = Math.max(...ROWS.map(r => r.ohio)) * 1.06;
  const bw = w / ROWS.length * 0.66;
  const xs = i => m.l + (i + 0.5) / ROWS.length * w;
  const ys = v => m.t + h - v / max * h;

  frame(svg, {x: m.l, y: m.t, w, h, xs: i => xs(i), ys,
    xt: ROWS.map((_, i) => i).filter(i => mob ? i % 2 === 0 : true),
    yt: ticks(0, max, 5), xfmt: i => "’" + String(ROWS[i].year).slice(2),
    ylab: "applications filed"});

  ROWS.forEach((r, i) => {
    const a = {x: xs(i) - bw / 2, y: ys(r.ohio), width: bw, height: m.t + h - ys(r.ohio)};
    if (r.complete) { a.fill = INK; }
    else { a.fill = "var(--paper)"; a.stroke = WARN; a["stroke-width"] = 1.6;
           a["stroke-dasharray"] = "4 3"; }
    hoverable(el("rect", a, svg),
      `<b>${r.year}</b><br>${N(r.ohio)} filed` +
      (r.complete ? "" : "<br>still filling: publication lag"), String(r.year));
  });

  /* Annotations last (house smell list). */
  const li = ROWS.indexOf(LAST);
  txt(svg, "complete through here", {x: xs(li), y: ys(LAST.ohio) - 22,
    "text-anchor": mob ? "end" : "middle", class: "pv-lab", fill: "#26333A"});
  el("line", {x1: xs(li), y1: ys(LAST.ohio) - 17, x2: xs(li), y2: ys(LAST.ohio) - 4,
    stroke: "#26333A", "stroke-width": 1.2}, svg);
  const tallestHollow = Math.max(...ROWS.filter(r => !r.complete).map(r => r.ohio));
  txt(svg, "the lag, not a collapse", {x: m.l + w,
    y: ys(tallestHollow) - 12, "text-anchor": "end", class: "pv-lab", fill: WARN});

  document.getElementById("barstable").innerHTML =
    tableView("barstable", "Ohio polymer applications by filing year",
    ["Year", "Filed", "Status"],
    ROWS.map(r => [r.year, N(r.ohio), r.complete ? "complete" : "incomplete (lag)"]));
}

/* --------------------------------------------------- the city table, plain */
document.getElementById("citytable").innerHTML =
  tableView("citytable", "Anchor-city counts, complete years. Small numbers; no ranking.",
  ["Year", "Akron", "Cleveland", "Canton", "Youngstown"],
  C.map(r => [r.year, r.akron, r.cleveland, r.canton, r.youngstown]));

/* The cold open: the four lines, minimal, in the hero itself. The cold-open gate
   counts this svg as the first chart, so it must never be allowed to render empty:
   drawAll() throws loudly if the spark drew nothing, because an empty svg that
   satisfies a gate is the silent pass this repo's own lessons warn about. */
function drawSpark() {
  const host = document.getElementById("spark");
  if (!host) return;
  const CW = Math.max(300, Math.round(host.parentElement.getBoundingClientRect().width));
  const m = {t: 14, r: 124, b: 8, l: 8}, H = 170;
  const {svg, w, h} = chart("spark", {W: CW, H, m});
  const years = C.map(r => r.year);
  const KEYS = [
    {k: "us_inv_all", c: "#9FCBD2", wd: 1.6, dash: "4 3", lab: "US, all"},
    {k: "ohio_all",   c: "#9FCBD2", wd: 1.6, dash: null,  lab: "Ohio, all"},
    {k: "us_inv",     c: "#CBE64D", wd: 2,   dash: "4 3", lab: "US polymer"},
    {k: "ohio",       c: "#CBE64D", wd: 3,   dash: null,  lab: "Ohio polymer"},
  ];
  const vals = C.flatMap(r => KEYS.map(x => idx(r, x.k)));
  const lo = Math.min(...vals) - 3, hi = Math.max(...vals) + 3;
  const xs = y => m.l + (y - years[0]) / (years.at(-1) - years[0]) * w;
  const ys = v => m.t + (hi - v) / (hi - lo) * h;
  const ends = KEYS.map(x => ({x, y: ys(idx(LAST, x.k))})).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
  KEYS.forEach(x => {
    const a = {d: "M" + C.map(r => `${xs(r.year)},${ys(idx(r, x.k))}`).join("L"),
      fill: "none", stroke: x.c, "stroke-width": x.wd};
    if (x.dash) a["stroke-dasharray"] = x.dash;
    el("path", a, svg);
    const e = ends.find(q => q.x === x);
    txt(svg, `${Math.round(idx(LAST, x.k))} ${x.lab}`,
      {x: m.l + w + 8, y: e.y + 4, class: "pv-labq", fill: x.c});
  });
  if (!svg.querySelector("path")) throw new Error("spark drew nothing");
}

function drawAll() { drawSpark(); drawIdx(); drawBars(); }
drawAll();
let pending = false;
addEventListener("resize", () => {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; drawAll(); });
}, {passive: true});

/* ---------------------------------------------------------- methodology box */
await PV.methodology({
  page: "patents",
  meta: D.meta,
  definitions: `An <b>application</b> is a filing, not a granted patent: a decision to
    try, roughly eighteen months before the record becomes public. <b>CPC C08</b> is the
    Cooperative Patent Classification class for organic macromolecular compounds, the
    closest single class to this cluster’s subject and a choice, like every code choice
    on this site. The <b>inventor basis</b> counts an application once if any listed
    inventor gives an Ohio correspondence address; an address is where the mail goes,
    not where the laboratory is.`,
});
})();
