/* Real wages, rebuilt. Three forms for three jobs: a slope chart for RANK CHANGE (the
   only form that shows a reordering as a reordering), a distribution strip for WHERE ONE
   VALUE SITS among many, and a scatter for the TRADE-OFF between two continuous
   quantities. New in this revision: every chart argues on-canvas (climb annotation,
   rivals bracket, region labels), a pick-a-metro comparator re-tells the story from the
   reader's seat and highlights the pair on all three charts, and every chart re-lays
   itself out per form below 760px — no sideways-scroll hint, evidence in the first
   paint. Color law: CAT[1] orange = Akron, CAT[2] magenta = the picked rival, one job
   each, on every chart. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, CAT, GRAY, INK} = PV;
const D = await PV.data("realwage.json");
const M = D.metros, B = D.big;
const N = n => Math.round(n).toLocaleString("en-US");
const usd = v => "$" + N(v);
const short = s => s.split(" (")[0].split("-")[0].split(",")[0];
const full = s => s.split(" (")[0];
const ord = n => { const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const fmtClimb = c => (c > 0 ? "+" : "") + c;
const AK = B.find(r => r.area === "10420") || M.find(r => r.area === "10420");
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const cheaper = M.filter(r => r.rpp < AK.rpp).length;
/* The offer arithmetic behind the comparator: the same dollars restated at another
   metro's price level. eqBasket translates Akron's real value; eqOffer is the nominal
   offer a rival has to write to match Akron's average. */
const eqBasket = r => AK.real * r.rpp / AK.rpp;
const eqOffer = r => AK.nominal * r.rpp / AK.rpp;
/* Metros that pay more on paper and buy less — the outright flips. */
const flips = B.filter(r => r.nominal > AK.nominal && r.real < AK.real);
/* The three steepest falls, drawn and bracketed as the recruiting rivals. */
const fallers = [...B].sort((a, b) => a.big_climb - b.big_climb).slice(0, 3);
const fallLo = Math.min(...fallers.map(r => -r.big_climb));
const fallHi = Math.max(...fallers.map(r => -r.big_climb));
const MOBILE = matchMedia("(max-width: 760px)");
/* A paper plate behind an SVG label that must cross other ink (cost-scissors pattern). */
const plate = (parent, s, x, y, fs = 7.2, anchor = "start") => {
  const wpx = s.length * fs + 6;
  const x0 = anchor === "middle" ? x - wpx / 2 : anchor === "end" ? x - wpx + 3 : x - 3;
  return el("rect", {x: x0, y: y - 12, width: wpx, height: 15,
    fill: "var(--paper)", opacity: .94, rx: 2, "data-pv-plated": "1"}, parent);
};

/* Three cards, not four: the house rule is cut to three before letting four wrap, and
   the climb already lives inside the first card's sub-line. */
/* Every card here is a constructed unit, so each one carries its own direction: what #1
   means on a rank, and what a price level of 92.9 means in money terms at FIRST use. */
PV.figures([
  ["key", `#${AK.big_rank_real}`, `of ${B.length} on what the pay buys`,
   `up ${AK.big_climb} places from #${AK.big_rank_nominal} on the paycheck itself; #1 is the best of the ${B.length} metros with 2,000+ polymer jobs`],
  ["", usd(AK.real), "what Akron’s wage buys",
   `${usd(AK.nominal)} on the paycheck, at a price level of ${AK.rpp.toFixed(1)}: about ${Math.round(100 - AK.rpp)} percent below the US average`],
  ["", `${cheaper}`, `of ${M.length} metros are cheaper`, "Akron’s prices sit in the middle of the metro range"]
]);

/* ------------------------------------------------ comparator: picker + verdict */
let SEL = null;                       // area code of the picked rival, or null
const selRow = () => SEL ? B.find(r => r.area === SEL) : null;

function verdict() {
  const v = document.getElementById("verdict");
  const r = selRow();
  if (!r) {
    v.innerHTML = `<b>Everywhere at once:</b> Akron’s polymer average is
      ${usd(AK.nominal)} a week, which buys like ${usd(AK.real)} at national prices.
      ${flips.length} of the ${B.length} metros, New York and Los Angeles among them,
      pay more on paper and buy less. Pick the metro you are recruiting against to
      price the difference.`;
    return;
  }
  const s1 = `<b>${full(r.name)}:</b> ${usd(AK.real)} in Akron buys what
    ${usd(eqBasket(r))} buys in ${short(r.name)}.`;
  const s2 = `It ranks ${ord(r.big_rank_nominal)} of ${B.length} on paper and
    ${ord(r.big_rank_real)} in what the paycheck buys; Akron ranks
    ${ord(AK.big_rank_nominal)} and ${ord(AK.big_rank_real)}.`;
  let s3;
  if (r.real < AK.real && r.nominal > AK.nominal) {
    s3 = `Its average paycheck is ${usd(r.nominal)} against Akron’s
      ${usd(AK.nominal)}, and the bigger number buys less: ${usd(r.real)} against
      ${usd(AK.real)}. The flip is outright.`;
  } else if (r.real < AK.real) {
    s3 = `Its average paycheck is ${usd(r.nominal)} and buys ${usd(r.real)};
      Akron is ahead on both counts.`;
  } else if (r.nominal <= AK.nominal) {
    s3 = `It pays ${usd(r.nominal)} on paper, no more than Akron, and buys
      ${usd(r.real)}; once local prices are counted it is the better deal of the two.`;
  } else {
    s3 = `To match Akron’s buying power an offer there has to clear
      ${usd(eqOffer(r))} a week, about $${Math.round(eqOffer(r) * 52 / 1000)},000 a
      year. Its average paycheck is ${usd(r.nominal)}, which buys ${usd(r.real)}, so
      on averages it stays ahead; the adjustment cuts its edge from
      ${usd(r.nominal - AK.nominal)} a week on paper to ${usd(r.real - AK.real)} in
      buying power.`;
  }
  v.innerHTML = `${s1} ${s2} ${s3}`;
}

{
  const host = document.getElementById("msel");
  const RIVALS = ["Chicago", "New York", "Los Angeles", "Boston", "Houston",
    "Minneapolis", "Seattle", "San Francisco"];
  const byShort = new Map(B.map(r => [short(r.name), r]));
  const sync = () => {
    host.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed",
      String(SEL === null ? b.dataset.all === "1" : b.dataset.area === SEL)));
    const sel = host.querySelector("select");
    sel.value = SEL && [...sel.options].some(o => o.value === SEL) ? SEL : "";
  };
  /* A legend entry for ink that is not on the plot is a key to nothing. The magenta
     swatch appears only once a rival has been picked and the magenta line exists. */
  const legend = () => document.getElementById("picklegend").hidden = !SEL;
  const setSel = area => { SEL = area || null; sync(); legend(); verdict(); drawAll(); };
  const mk = (label, area) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label;
    if (area === null) b.dataset.all = "1"; else b.dataset.area = area;
    b.setAttribute("aria-pressed", String(area === null));
    b.addEventListener("click", () => setSel(SEL === area ? null : area));
    host.appendChild(b);
  };
  mk("Everywhere", null);
  RIVALS.forEach(n => { const r = byShort.get(n); if (r) mk(n, r.area); });
  const sel = document.createElement("select");
  sel.setAttribute("aria-label", "All 56 metros with 2,000 or more polymer jobs");
  const opt0 = document.createElement("option");
  opt0.value = ""; opt0.textContent = "More of the 56…";
  sel.appendChild(opt0);
  [...B].filter(r => r.area !== AK.area)
    .sort((a, b) => short(a.name).localeCompare(short(b.name)))
    .forEach(r => { const o = document.createElement("option");
      o.value = r.area; o.textContent = short(r.name); sel.appendChild(o); });
  sel.addEventListener("change", () => setSel(sel.value || null));
  host.appendChild(sel);
}
verdict();

/* ------------------------------------------------------------- 1. slope */
/* Label only what a reader can act on: the home metro, the biggest movers, the top —
   plus whatever metro is picked. */
const baseNamed = (() => {
  const s = new Set([AK.area]);
  [...B].sort((a, b) => b.big_climb - a.big_climb).slice(0, 3).forEach(r => s.add(r.area));
  [...B].sort((a, b) => a.big_climb - b.big_climb).slice(0, 4).forEach(r => s.add(r.area));
  B.filter(r => r.big_rank_real <= 3 || r.big_rank_nominal <= 3).forEach(r => s.add(r.area));
  return s;
})();

function drawSlope() { MOBILE.matches ? drawSlopeMobile() : drawSlopeDesktop(); }

function drawSlopeDesktop() {
  const named = new Set(baseNamed);
  if (SEL) named.add(SEL);
  const {svg, W, H, m, w, h} = PV.chart("slope",
    {W: 1100, H: 52 + B.length * 15 + 58, m: {t: 66, r: 300, b: 44, l: 193}});
  const ys = rank => m.t + ((rank - 1) / (B.length - 1)) * h;
  /* A rank is a constructed unit and nothing about "33rd" says which end is good, so each
     axis title carries its own direction under it: 1 is the top of both columns. */
  txt(svg, "Rank on paper", {x: m.l, y: m.t - 40, "text-anchor": "end",
    class: "pv-axlab"});
  txt(svg, "1 = biggest paycheck", {x: m.l, y: m.t - 20, "text-anchor": "end",
    class: "pv-labq"});
  txt(svg, "Rank on what it buys", {x: m.l + w, y: m.t - 40, class: "pv-axlab"});
  txt(svg, "1 = buys the most", {x: m.l + w, y: m.t - 20, class: "pv-labq"});
  el("line", {x1: m.l, y1: m.t, x2: m.l, y2: m.t + h, stroke: "var(--pv-axis)"}, svg);
  el("line", {x1: m.l + w, y1: m.t, x2: m.l + w, y2: m.t + h, stroke: "var(--pv-axis)"}, svg);

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

  const color = r => r.area === AK.area ? CAT[1] : r.area === SEL ? CAT[2]
    : (named.has(r.area) ? INK : GRAY);
  B.forEach(r => {
    const me = r.area === AK.area, pick = r.area === SEL, show = named.has(r.area);
    const y1 = ys(r.big_rank_nominal), y2 = ys(r.big_rank_real);
    el("path", {d: `M${m.l},${y1}C${m.l + w * .4},${y1} ${m.l + w * .6},${y2} ${m.l + w},${y2}`,
      fill: "none", stroke: color(r),
      "stroke-width": me || pick ? 3.5 : (show ? 1.6 : 1),
      opacity: me || pick ? 1 : (show ? .7 : .28)}, svg);
    [[m.l, y1], [m.l + w, y2]].forEach(([cx, cy]) =>
      el("circle", {cx, cy, r: me || pick ? 5.5 : (show ? 3.5 : 2.2),
        fill: color(r), stroke: "var(--paper)",
        "stroke-width": me || pick ? 2 : 1}, svg));
    if (show) {
      const cls = me || pick ? "pv-lab" : "pv-labq";
      const fill = me ? {fill: CAT[1]} : pick ? {fill: CAT[2]} : {};
      txt(svg, `${r.big_rank_nominal}. ${short(r.name)}`,
        {x: m.l - 12, y: (lyL.get(r.area) ?? y1) + 4,
        "text-anchor": "end", class: cls, ...fill});
      txt(svg, `${r.big_rank_real}. ${short(r.name)}`,
        {x: m.l + w + 12, y: (lyR.get(r.area) ?? y2) + 4, class: cls, ...fill});
    }
    hoverable(el("rect", {x: m.l, y: Math.min(y1, y2) - 5, width: w,
      height: Math.abs(y2 - y1) + 10, fill: "transparent"}, svg),
      `<b>${full(r.name)}</b><br>on paper <span class="v">${usd(r.nominal)}</span>,
       rank ${r.big_rank_nominal} of ${B.length}<br>price level
       <span class="v">${r.rpp.toFixed(1)}</span> (US average 100)<br>
       buys <span class="v">${usd(r.real)}</span>, rank ${r.big_rank_real}<br>
       <b>${fmtClimb(r.big_climb)} places</b> ·
       ${N(r.emp)} polymer jobs`,
      `${short(r.name)}: ${r.big_rank_nominal} to ${r.big_rank_real}`);
  });

  /* The claim, on the chart: Akron's climb, annotated at the midpoint of its own line —
     and directly under it, the uncertainty that qualifies it. The climb rests on a single
     print of a revision-prone series, and a reader who reads charts and skips captions
     was previously shown an unqualified +14. It is drawn, not footnoted. */
  {
    const yMid = (ys(AK.big_rank_nominal) + ys(AK.big_rank_real)) / 2;
    const s = `+${AK.big_climb} places once prices count`;
    plate(svg, s, m.l + w / 2, yMid - 12, 8.6, "middle");
    txt(svg, s, {x: m.l + w / 2, y: yMid - 12, "text-anchor": "middle",
      class: "pv-lab", fill: CAT[1]});
    const q = `${D.meta.year} only, no track record`;
    plate(svg, q, m.l + w / 2, yMid + 6, 7.6, "middle");
    txt(svg, q, {x: m.l + w / 2, y: yMid + 6, "text-anchor": "middle", class: "pv-labq"});
  }
  /* The counter-claim, also on the chart: the three steepest falls, bracketed. */
  {
    const yy = fallers.map(r => (lyR.get(r.area) ?? ys(r.big_rank_real)) + 4);
    const y0 = Math.min(...yy) - 10, y1 = Math.max(...yy) + 4;
    const bx = m.l + w + 150;
    el("path", {d: `M${bx},${y0} h6 V${y1} h-6`, fill: "none", stroke: INK,
      "stroke-width": 1.6}, svg);
    const lines = ["The recruiting", "rivals: the three", "steepest falls,",
      `${fallLo} to ${fallHi} places.`];
    const ty = (y0 + y1) / 2 - ((lines.length - 1) * 17) / 2 + 4;
    lines.forEach((s, i) => txt(svg, s, {x: bx + 14, y: ty + i * 17,
      class: i ? "pv-labq" : "pv-lab", ...(i ? {} : {fill: INK})}));
  }
}

function drawSlopeMobile() {
  const named = new Set(baseNamed);
  if (SEL) named.add(SEL);
  const list = B.filter(r => named.has(r.area))
    .sort((a, b) => a.big_rank_real - b.big_rank_real);
  const m = {t: 16, r: 12, b: 14, l: 12}, W = 375, rowH = 34, headH = 46, footH = 46;
  const H = m.t + headH + list.length * rowH + footH + m.b;
  const {svg} = PV.chart("slope", {W, H});
  txt(svg, "paper", {x: 30, y: m.t + 12, "text-anchor": "middle", class: "pv-labq"});
  txt(svg, "buys", {x: 88, y: m.t + 12, "text-anchor": "middle", class: "pv-labq"});
  txt(svg, "places", {x: W - m.r, y: m.t + 12, "text-anchor": "end", class: "pv-labq"});
  /* Two ranks and a signed number, none of which say which way is good. The cue does. */
  txt(svg, "1 = biggest paycheck; + = climbed", {x: 12, y: m.t + 34, class: "pv-labq"});
  const chip = (g, x, y, s, fill, fg, bold) => {
    el("rect", {x, y, width: 36, height: 22, rx: 7, fill,
      ...(fill === "none" ? {stroke: "var(--pv-axis)"} : {})}, g);
    txt(g, s, {x: x + 18, y: y + 15.5, "text-anchor": "middle",
      class: bold ? "pv-lab" : "pv-labq", fill: fg});
  };
  list.forEach((r, i) => {
    const me = r.area === AK.area, pick = r.area === SEL;
    const y = m.t + headH + i * rowH;
    const g = el("g", {}, svg);
    const accent = me ? CAT[1] : pick ? CAT[2] : null;
    chip(g, 12, y + 5, String(r.big_rank_nominal),
      accent || "none", accent ? "#fff" : "var(--pv-muted)", !!accent);
    txt(g, "→", {x: 59, y: y + 20.5, "text-anchor": "middle", class: "pv-labq"});
    chip(g, 70, y + 5, String(r.big_rank_real),
      accent || "var(--pv-grid)", accent ? "#fff" : "var(--pv-ink)", true);
    txt(g, short(r.name), {x: 116, y: y + 20.5,
      class: accent ? "pv-lab" : "pv-labq", ...(accent ? {fill: accent} : {})});
    txt(g, fmtClimb(r.big_climb),
      {x: W - m.r, y: y + 20.5, "text-anchor": "end",
       class: accent ? "pv-lab" : "pv-labq", ...(accent ? {fill: accent} : {})});
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, g),
      `<b>${full(r.name)}</b><br>on paper <span class="v">${usd(r.nominal)}</span>,
       rank ${r.big_rank_nominal}<br>buys <span class="v">${usd(r.real)}</span>,
       rank ${r.big_rank_real}<br><b>${fmtClimb(r.big_climb)}
       places</b>`,
      `${short(r.name)}: ${r.big_rank_nominal} to ${r.big_rank_real}`);
  });
  const fy = m.t + headH + list.length * rowH;
  txt(svg, `${B.length - list.length} more metros sit between these; see the table.`,
    {x: 12, y: fy + 16, class: "pv-labq"});
  // the same drawn qualifier the desktop slope carries, so the mobile reader who
  // never reaches the caption still sees that +14 is one year's reading
  txt(svg, `${D.meta.year} only, no track record.`, {x: 12, y: fy + 38, class: "pv-labq"});
}

/* CAVEAT INK. The visible caption under a figure is one source line plus one limitation
   sentence, ≤45 words (page-design). Everything else that was here — the row definition,
   why the 2,000-job floor was chosen, the suppression rule, the missing prior years —
   is depth rather than disclosure, so it moves inside the table twin this figure already
   opens. Nothing that changes how a number should be read left the visible caption. */
const withNotes = (html, notes) =>
  html.replace("</details>", `<p class="tnote">${notes}</p></details>`);

document.getElementById("slopetable").innerHTML = withNotes(tableView("sl",
  `Polymer metros with ${N(D.meta.big_floor)}+ jobs, nominal and price-adjusted weekly wage`,
  ["Metro", "Jobs", "On paper", "Price level", "Buys", "Rank on paper", "Rank on buys",
   "Places moved"],
  [...B].sort((a, b) => a.big_rank_real - b.big_rank_real).map(r =>
    [full(r.name), N(r.emp), usd(r.nominal), r.rpp.toFixed(1), usd(r.real),
     r.big_rank_nominal, r.big_rank_real, fmtClimb(r.big_climb)])),
  `${D.meta.row} Full source: ${D.meta.source}. The field is cut to the
   ${B.length} metros with at least ${N(D.meta.big_floor)} polymer jobs, so the ranking
   runs against places that actually do this work rather than against every metro in the
   country; a different floor gives a different rank. ${D.meta.suppression}`);
document.getElementById("slopesrc").innerHTML =
  `Source: BLS QCEW and BEA Regional Price Parities, ${D.meta.year}. Metros where BLS
   will not publish a polymer wage are missing, Cleveland and Canton among them. Both
   agencies revise later, so read the ${AK.big_climb}-place climb as one year’s
   reading.`;

/* -------------------------------------------------------- 2. price strip */
function drawStrip() { drawStripVariant(MOBILE.matches); }

function drawStripVariant(mobile) {
  const opts = mobile
    ? {W: 375, H: 190, m: {t: 52, r: 6, b: 56, l: 6}}
    : {W: 1100, H: 230, m: {t: 60, r: 0, b: 66, l: 0}};
  const {svg, W, H, m, w, h} = PV.chart("strip", opts);
  const rpps = M.map(r => r.rpp);
  const lo = Math.floor(Math.min(...rpps)), hi = Math.ceil(Math.max(...rpps));
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(lo, hi, mobile ? 5 : 7),
    yt: [], xfmt: v => v.toFixed(0),
    /* The scale is an index, so the axis title carries the reading, not the recipe: the
       formula and the series name now live in the subtitle above the figure. */
    xlab: mobile ? "Cheaper ← price level → costlier"
                 : "Cheaper ← local price level, US average = 100 → more expensive"});
  // one tick per metro — the distribution as it is, not smoothed into a curve
  M.forEach(r => {
    const me = r.area === AK.area, pick = r.area === SEL;
    el("line", {x1: xs(r.rpp), y1: m.t + (me || pick ? 4 : 22), x2: xs(r.rpp),
      y2: m.t + h - 4, stroke: me ? CAT[1] : pick ? CAT[2] : GRAY,
      // 4px for Akron: at 3px the subject tick, the dashed median and the US-average
      // rule all collapsed to the same weight in grayscale, leaving the three labels
      // as the only separation. Weight now carries it too.
      "stroke-width": me ? 4 : pick ? 3 : 1, opacity: me || pick ? 1 : .38}, svg);
    if (me) txt(svg, `Akron ${r.rpp.toFixed(1)}`, {x: xs(r.rpp), y: m.t - 8,
      "text-anchor": "middle", class: "pv-lab", fill: CAT[1]});
    if (pick) {
      const near = Math.abs(xs(r.rpp) - xs(AK.rpp)) < (mobile ? 90 : 130);
      txt(svg, `${short(r.name)} ${r.rpp.toFixed(1)}`,
        {x: xs(r.rpp), y: near ? m.t - 28 : m.t - 8,
         "text-anchor": "middle", class: "pv-lab", fill: CAT[2]});
    }
  });
  /* Both reference labels sit over the tick mass, so each gets a paper plate first.
     Without it they read as gray-on-gray at 375px, where the mass is densest. */
  const mRpp = med(rpps);
  el("line", {x1: xs(mRpp), y1: m.t + 14, x2: xs(mRpp), y2: m.t + h, stroke: INK,
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  const mLab = mobile ? `median ${mRpp.toFixed(1)}` : `median metro ${mRpp.toFixed(1)}`;
  plate(svg, mLab, xs(mRpp) + 8, m.t + 26, 8.2);
  txt(svg, mLab, {x: xs(mRpp) + 8, y: m.t + 26, class: "pv-lab"});
  /* At 375px the median label's plate is 96px wide and the two reference lines are only
     72px apart, so the plate was covering the top of the US-average rule — a plate that
     hides a reference mark is worse than the crossing it was added to fix. The US line
     starts below that plate on mobile; on desktop the two are 218px apart and it does
     not arise. */
  el("line", {x1: xs(100), y1: m.t + (mobile ? 30 : 14), x2: xs(100), y2: m.t + h,
    stroke: "var(--hover)", "stroke-width": 1.5}, svg);
  plate(svg, "US average 100", xs(100) + 8, m.t + 44, 8.2);
  txt(svg, "US average 100", {x: xs(100) + 8, y: m.t + 44, class: "pv-lab",
    fill: "var(--hover)"});
  M.forEach(r => hoverable(el("rect", {x: xs(r.rpp) - 3, y: m.t, width: 6, height: h,
    fill: "transparent"}, svg),
    `<b>${full(r.name)}</b><br>price level <span class="v">${r.rpp.toFixed(1)}</span>
     (US average 100)`,
    `${short(r.name)}: ${r.rpp.toFixed(1)}`));
}

{
  const ext = [...M].sort((a, b) => a.rpp - b.rpp);
  document.getElementById("striptable").innerHTML = tableView("st",
    "Cheapest and most expensive metros by price level",
    ["Metro", "Price level", "Polymer jobs"],
    ext.slice(0, 6).concat(ext.slice(-6)).map(r =>
      [full(r.name), r.rpp.toFixed(1), N(r.emp)]));
  const mRpp = med(M.map(r => r.rpp));
  /* The page's one .note box, at the ~80-word budget: the percentile reading of the
     strip, and the judgment it licenses. The "the climb is not because Akron is cheap"
     point that used to close this box is the band lede's job two paragraphs above, and
     saying it twice inside one reading context is hedge repetition. */
  document.getElementById("cheapnote").innerHTML =
    `<b>${cheaper} of ${M.length} metros have a lower price level than Akron.</b> It sits
     at ${AK.rpp.toFixed(1)} against a median metro of ${mRpp.toFixed(1)}: the
     ${Math.round(cheaper / M.length * 100)}th percentile, which is another way of saying
     typical. The familiar “low cost of living” line holds only against the national
     average of 100, and that average is pulled up by a handful of very expensive places
     most Ohioans will never compete with for a job. PIC’s advantage is relative to this
     industry’s geography, not to the country.`;
}

/* ------------------------------------------------------------ 3. scatter */
function drawScatter() { drawScatterVariant(MOBILE.matches); }

function drawScatterVariant(mobile) {
  const opts = mobile
    ? {W: 375, H: 380, m: {t: 34, r: 12, b: 50, l: 34}}
    : {W: 1100, H: 520, m: {t: 44, r: 71, b: 66, l: 32}};
  const {svg, W, H, m, w, h} = PV.chart("scatter", opts);
  const nx = B.map(r => r.nominal), ry = B.map(r => r.rpp);
  const x0 = Math.min(...nx) * .95, x1 = Math.max(...nx) * 1.04;
  const y0 = Math.min(...ry) - 2, y1 = Math.max(...ry) + 2;
  const xs = v => m.l + ((v - x0) / (x1 - x0)) * w;
  const ys = v => m.t + h - ((v - y0) / (y1 - y0)) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys,
    xt: ticks(x0, x1, mobile ? 3 : 6), yt: ticks(y0, y1, mobile ? 4 : 6),
    xfmt: usd, yfmt: v => v.toFixed(0),
    /* Dollars need no direction; an index does, so the vertical title says which way is
       dearer before a reader has to work it out from the tick numbers. */
    xlab: mobile ? "Average weekly wage →" : "Average weekly wage on the paycheck →",
    ylab: mobile ? "↑ More expensive · price level"
                 : "↑ More expensive · price level (US = 100)"});
  // iso-lines: every metro on one line offers identical purchasing power. Labels sit at
  // the sparse bottom ends of the lines, not in the crowded top band of expensive metros.
  /* At 375px the bottom-right corner held three labels in ~40px of height: two diagonal
     tags and the half-plane annotation, the nearest pair within a few pixels of touching.
     Mobile now tags ONE diagonal — the $1,300 line, the one Akron nearly sits on — and
     the subtitle carries the generalization ("every metro on one dashed diagonal buys the
     same"). The remaining diagonals still read as a family without being labelled. */
  const isoLabel = mobile ? [1300] : [1300, 1500, 1700];
  /* Two passes, not one. Drawing each line and then its own label meant the NEXT line in
     the series painted straight through the label just written: at 375px the $1,500
     diagonal ran through "buys $1,300". Every line first, then every label with its
     paper plate on top. */
  const isoPts = new Map();
  [1100, 1300, 1500, 1700].forEach(real => {
    const pts = [];
    for (let p = y0; p <= y1; p += 1) { const nom = real * p / 100;
      if (nom >= x0 && nom <= x1) pts.push([xs(nom), ys(p), nom]); }
    if (pts.length < 2) return;
    isoPts.set(real, pts);
    el("path", {d: "M" + pts.map(p => `${p[0]},${p[1]}`).join("L"), fill: "none",
      stroke: "var(--pv-grid)", "stroke-width": 1.5, "stroke-dasharray": "5 4"}, svg);
  });
  isoPts.forEach((pts, real) => {
    if (!isoLabel.includes(real) || pts[0][2] <= x0 + 10 || pts[0][2] >= x1 - 90) return;
    const s = `buys ${usd(real)}`;
    plate(svg, s, pts[0][0] + 6, m.t + h - 8, mobile ? 8.2 : 7.2);
    txt(svg, s, {x: pts[0][0] + 6, y: m.t + h - 8, class: "pv-labq"});
  });
  const rmax = Math.max(...B.map(r => r.emp));
  const rEmp = e => (mobile ? 3 : 4) + Math.sqrt(e / rmax) * (mobile ? 9 : 13);
  const placedLbl = {};
  const draw = r => {
    const me = r.area === AK.area, pick = r.area === SEL;
    const rad = rEmp(r.emp);
    if (mobile && pick) el("circle", {cx: xs(r.nominal), cy: ys(r.rpp), r: rad + 4,
      fill: "none", stroke: CAT[2], "stroke-width": 1.5}, svg);
    el("circle", {cx: xs(r.nominal), cy: ys(r.rpp), r: rad,
      fill: me ? CAT[1] : pick ? CAT[2] : SEQ[3], opacity: me || pick ? 1 : .5,
      stroke: "var(--paper)", "stroke-width": 2}, svg);
    const label = mobile ? (me || pick || r.emp === rmax)
                         : (me || pick || r.emp > rmax * .42 || r.rpp > 110);
    if (label) {
      // expensive metros cluster at the top of the scale and their labels collide;
      // remember what has been placed and step down when a slot is taken
      const key = Math.round(xs(r.nominal) / 90);
      const lvl = (placedLbl[key] = (placedLbl[key] || 0) + 1) - 1;
      txt(svg, short(r.name), {x: xs(r.nominal), y: ys(r.rpp) - rad - 6 - lvl * 16,
        "text-anchor": "middle", class: me || pick ? "pv-lab" : "pv-labq",
        ...(me ? {fill: CAT[1]} : pick ? {fill: CAT[2]} : {})});
    }
    hoverable(el("circle", {cx: xs(r.nominal), cy: ys(r.rpp), r: Math.max(rad, 11),
      fill: "transparent"}, svg),
      `<b>${full(r.name)}</b><br>on paper <span class="v">${usd(r.nominal)}</span><br>
       price level <span class="v">${r.rpp.toFixed(1)}</span> (US average 100)<br>
       buys <span class="v">${usd(r.real)}</span><br>${N(r.emp)} polymer jobs`,
      `${short(r.name)}: ${usd(r.nominal)} at ${r.rpp.toFixed(1)}, buys ${usd(r.real)}`);
  };
  B.filter(r => r.area !== SEL && r.area !== AK.area).forEach(draw);
  B.filter(r => r.area === SEL || r.area === AK.area).forEach(draw);
  /* The half-planes, named on the plane, drawn last. At 375px the right-hand one is no
     longer in an empty corner once it lifts clear of the axis, so it gets a paper plate;
     the desktop corner is genuinely empty and needs none. */
  txt(svg, "salary flatters the offer", {x: m.l + 8, y: m.t + 16,
    class: "pv-labq", opacity: .8});
  const uy = m.t + h - (mobile ? 34 : 12);
  if (mobile) plate(svg, "salary understates it", m.l + w - 6, uy, 8.2, "end");
  txt(svg, "salary understates it", {x: m.l + w - 6, y: uy,
    "text-anchor": "end", class: "pv-labq", opacity: .8});
}

document.getElementById("scattertable").innerHTML = withNotes(tableView("sc",
  "Largest polymer metros by employment",
  ["Metro", "Jobs", "On paper", "Price level", "Buys"],
  [...B].sort((a, b) => b.emp - a.emp).slice(0, 20).map(r =>
    [full(r.name), N(r.emp), usd(r.nominal), r.rpp.toFixed(1), usd(r.real)])),
  `Twenty largest employers of the ${B.length} plotted; every metro in the set is drawn.
   It maps the trade-off a recruiter is already making without drawing it.`);
/* This figure carries its own attribution: screenshotted alone it must still name where
   the two axes come from, which the subtitle above it does not do. */
document.getElementById("scattersrc").innerHTML =
  `Source: BLS QCEW and BEA Regional Price Parities, ${D.meta.year}. ${D.meta.not}`;

/* Closer ≤90 words: one display statement of ≤2 lines, then one qualifying paragraph.
   The New York / Los Angeles / Seattle clause moved down here out of the display line,
   which was running four rendered lines at 30px. */
document.getElementById("closersub").innerHTML =
  `<b>Akron’s polymer wage is ${usd(AK.nominal)} a week,
   ${AK.nominal < med(B.map(r => r.nominal)) ? "below" : "above"} the median polymer
   metro; adjusted for local prices it is ${usd(AK.real)},
   ${AK.real > med(B.map(r => r.real)) ? "above" : "below"} it.</b> Against New York, Los
   Angeles or Seattle the bigger paycheck buys less outright. The gap is worth
   ${AK.big_climb} places, and it is smaller than “cost of living” is usually made to
   carry: ${cheaper} metros are cheaper than this one, so PIC should retire the word
   “cheap” and argue the checkable version instead.`;

/* --------------------------------------------------------------- assemble */
function drawAll() { drawSlope(); drawStrip(); drawScatter(); }
drawAll();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* NO PRE-HERO FOOTPRINT BAR. This page is metro-level end to end, which is a real scope
   limit and was previously flagged in a banner injected between the masthead and the
   headline — apparatus above the finding, and (having no .wrap) flush to the viewport
   edge at x=0 while every other block sat on the 301px rail. The limit now appears in
   three proper places instead: one reader-language sentence in band 1's gloss, the
   slope figure's own source line, and meta.geography in the methodology box. */

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "realwage", meta: D.meta});
})();
