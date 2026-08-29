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
/* A paper plate behind an SVG label that must cross other ink (cost-scissors pattern).
   PLATE names how far the box reaches above and below the label's BASELINE. It used to be
   two unnamed numbers inside the helper, which meant a caller positioning a plated label
   against something else — a gridline, an axis rule — had to guess the box it was about
   to draw. One did, and drew it across a gridline. */
const PLATE = {up: 12, down: 3};
const plate = (parent, s, x, y, fs = 7.2, anchor = "start") => {
  const wpx = s.length * fs + 6;
  const x0 = anchor === "middle" ? x - wpx / 2 : anchor === "end" ? x - wpx + 3 : x - 3;
  return el("rect", {x: x0, y: y - PLATE.up, width: wpx, height: PLATE.up + PLATE.down,
    fill: "var(--paper)", opacity: .94, rx: 2, "data-pv-plated": "1"}, parent);
};

/* Wrap MEASURED against the rendered face. Character count does not know the face, and a
   note authored as one line for a 1100-unit box ran 69 units past it, 29px into the page
   margin at 1440, because nothing ever measured the string it actually drew.
   getComputedTextLength reports in viewBox units, so this is safe to call before the
   viewBox is set: the caller needs the line count to size its own bottom margin.

   BALANCED, NOT GREEDY. A plain greedy wrap of this page's one long note put twelve
   characters alone on line two — a widow, which reads as a mistake rather than as a
   sentence. Once the line COUNT is known, the narrowest width that still yields that many
   lines evens them out without touching a single word. */
const wrapText = (svg, s, cls, max) => {
  const probe = txt(svg, "", {x: 0, y: 0, class: cls, opacity: 0});
  const words = s.split(/\s+/);
  const fit = wide => {
    const out = [];
    let line = "";
    for (const word of words) {
      probe.textContent = line ? line + " " + word : word;
      if (line && probe.getComputedTextLength() > wide) { out.push(line); line = word; }
      else line = probe.textContent;
    }
    if (line) out.push(line);
    return out;
  };
  const n = fit(max).length;
  let lo = 40, hi = max;              // hi always fits in n lines, lo assumed not to
  while (n > 1 && hi - lo > 8) {
    const mid = (lo + hi) / 2;
    if (fit(mid).length <= n) hi = mid; else lo = mid;
  }
  const out = fit(hi);
  svg.removeChild(probe);
  return out;
};

/* Three cards, not four: the house rule is cut to three before letting four wrap, and
   the climb already lives inside the first card's sub-line. */
/* Every card here is a constructed unit, so each one carries its own direction: what #1
   means on a rank, and what a price level of 92.9 means in money terms at FIRST use. */
/* The two hero denominators are DIFFERENT POPULATIONS and sat side by side reading as
   peers: 56 is the polymer field, 235 is every metro BEA prices. Each key now names its
   own universe, and card 3 says which way to read it — it is the yardstick that shrinks
   the claim, not more good news. */
PV.figures([
  ["key", `#${AK.big_rank_real}`, `of ${B.length} polymer metros, on what the pay buys`,
   `up ${AK.big_climb} places from #${AK.big_rank_nominal} on the paycheck itself; #1 is the best paid of the ${B.length} metros with 2,000+ polymer jobs`],
  ["", usd(AK.real), "a week: what Akron’s wage buys",
   `${usd(AK.nominal)} on the paycheck, at a price level of ${AK.rpp.toFixed(1)}: prices here run about ${Math.round(100 - AK.rpp)} percent below the US average, so the same dollars go further`],
  ["", `${cheaper}`, `of ${M.length} priced US metros are cheaper`,
   "the yardstick, not the good news: Akron’s prices sit in the middle of the metro range, so the argument here is not that the region is cheap"]
]);

/* ------------------------------------------------ comparator: picker + verdict */
let SEL = null;                       // area code of the picked rival, or null
const selRow = () => SEL ? B.find(r => r.area === SEL) : null;

function verdict() {
  const v = document.getElementById("verdict");
  const r = selRow();
  if (!r) {
    v.innerHTML = `<b>Across all ${B.length} metros:</b> Akron’s polymer average is
      ${usd(AK.nominal)} a week, which buys like ${usd(AK.real)} at national prices.
      ${flips.length} of them, New York and Los Angeles among them, pay more than Akron
      on paper and buy less than Akron once local prices are counted. Pick the metro you
      are recruiting against to price the difference.`;
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
  /* The grey crowd is most of the chart and was unexplained: a reader who counts the
     printed ranks (1, 2, 3, 5, 11 ...) goes looking for the missing ones. Say what the
     grey is, the way the mobile list already does. Composed BEFORE the chart is sized,
     because how many lines it takes decides how much bottom margin the chart needs — as
     one line it was 976 units wide from x=193 in an 1100-unit box, so it ran off the
     canvas and 29px past the page column at 1440. */
  const W = 1100, NOTE_TOP = 32, host = document.getElementById("slope");
  const note = `${named.size} metros are named here (Akron, the biggest movers and the top
    of each column); the other ${B.length - named.size} are drawn in grey. Every one of
    the ${B.length} is in the table below.`.replace(/\s+/g, " ");
  const mBase = {t: 66, r: 300, l: 193};
  const noteLines = wrapText(host, note, "pv-labq", W - mBase.l - 6);
  const noteLead = PV.lead(host, "pv-labq", "pv-labq");
  /* A ROW CHART DECLARES ITS ROWS. This passed H directly as `52 + rows * 15 + 58`, a pad
     that happened to equal t+b — right by luck, and unable to stay right once the bottom
     margin had to grow for a second note line. rows+rowH makes the core own the sum. */
  const m = Object.assign({}, mBase, {b: NOTE_TOP + (noteLines.length - 1) * noteLead
    + Math.ceil(PV.face(host, "pv-labq").descent) + 6});
  const {svg, w, h} = PV.chart("slope", {W, rows: B.length, rowH: 15, m});
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
  /* The note, on the lines it measured out to, on measured leading. */
  noteLines.forEach((s, i) => txt(svg, s,
    {x: m.l, y: m.t + h + NOTE_TOP + i * noteLead, class: "pv-labq"}));
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

/* The 2,000-job floor SELECTS the comparison set, so a sceptic is entitled to ask whether
   it was picked after Akron's rank was known. Answer it with the shipped data rather than
   with a rationale: recompute the climb at other floors and print what comes back. */
const climbAtFloor = floor => {
  const S = M.filter(r => r.emp >= floor);
  const iN = [...S].sort((a, b) => b.nominal - a.nominal).findIndex(r => r.area === AK.area);
  const iR = [...S].sort((a, b) => b.real - a.real).findIndex(r => r.area === AK.area);
  return {n: S.length, climb: iN - iR};
};
const FLO = climbAtFloor(1000), FHI = climbAtFloor(5000);

document.getElementById("slopetable").innerHTML = withNotes(tableView("sl",
  `Polymer metros with ${N(D.meta.big_floor)}+ jobs, nominal and price-adjusted weekly wage`,
  ["Metro", "Jobs", "On paper", "Price level", "Buys", "Rank on paper", "Rank on buys",
   "Places moved"],
  [...B].sort((a, b) => a.big_rank_real - b.big_rank_real).map(r =>
    [full(r.name), N(r.emp), usd(r.nominal), r.rpp.toFixed(1), usd(r.real),
     r.big_rank_nominal, r.big_rank_real, fmtClimb(r.big_climb)])),
  `${D.meta.row} Full source: ${D.meta.source}. (MARPP is BEA’s table of metro price
   parities; “all items” means the whole shopping list, not rent alone.) The field is cut
   to the ${B.length} metros with at least ${N(D.meta.big_floor)} polymer jobs, so the
   ranking runs against places that actually do this work rather than against every metro
   in the country. That floor is a choice, so here is what other floors give: at
   ${N(1000)} jobs Akron climbs ${FLO.climb} places in a field of ${FLO.n}, and at
   ${N(5000)} it climbs ${FHI.climb} in a field of ${FHI.n}. Akron climbs at every floor
   tested; how far it climbs depends on how many metros are left above it to pass.
   ${D.meta.suppression}`);
document.getElementById("slopesrc").innerHTML =
  `Source: BLS QCEW and BEA Regional Price Parities, ${D.meta.year}. Metros where BLS
   will not publish a polymer wage are missing, Cleveland and Canton among them. Both
   agencies revise later, so read the ${AK.big_climb}-place climb as one year’s
   reading.`;

/* -------------------------------------------------------- 2. price strip */
function drawStrip() { drawStripVariant(MOBILE.matches); }

function drawStripVariant(mobile) {
  const opts = mobile
    ? {W: 375, H: 202, m: {t: 64, r: 6, b: 56, l: 6}}
    : {W: 1100, H: 236, m: {t: 66, r: 0, b: 66, l: 0}};
  const {svg, W, H, m, w, h} = PV.chart("strip", opts);
  /* Centred labels above the plot can run off a 375px canvas. lw() is the half-width of a
     pv-lab string at this breakpoint's type size; clamp() keeps the label on the page. */
  const lw = chars => chars * (mobile ? 16 : 14.2) * 0.55 / 2;
  const clamp = (x, half) => Math.max(half + 4, Math.min(W - half - 4, x));
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
    if (me) txt(svg, `Akron ${r.rpp.toFixed(1)}`, {x: clamp(xs(r.rpp), lw(10)),
      y: m.t - 30, "text-anchor": "middle", class: "pv-lab", fill: CAT[1]});
    if (pick) {
      const near = Math.abs(xs(r.rpp) - xs(AK.rpp)) < (mobile ? 90 : 130);
      const s = `${short(r.name)} ${r.rpp.toFixed(1)}`;
      txt(svg, s, {x: clamp(xs(r.rpp), lw(s.length)), y: near ? m.t - 48 : m.t - 12,
         "text-anchor": "middle", class: "pv-lab", fill: CAT[2]});
    }
  });
  /* AKRON AND THE MEDIAN ARE 0.2 APART, WHICH IS THE FINDING AND ALSO THE PROBLEM: at
     100% zoom the solid orange tick and the dashed median rule are one smudge, and a
     reader who sees one line cannot have the finding. So the pair is labelled ONCE, above
     the plot, and the label states the gap in the same one-decimal values the page prints
     everywhere else — 93.1 minus 92.9 — so a reader who checks the subtraction gets the
     number that is written. The median rule also gets its own cap mark, so it reads as a
     second line rather than as thickness on the first. */
  const mRpp = med(rpps);
  const gap = (Math.round(mRpp * 10) - Math.round(AK.rpp * 10)) / 10;
  el("line", {x1: xs(mRpp), y1: m.t + 6, x2: xs(mRpp), y2: m.t + h, stroke: INK,
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  el("circle", {cx: xs(mRpp), cy: m.t + 6, r: 3, fill: INK}, svg);
  const mLab = mobile
    ? `median ${mRpp.toFixed(1)}, ${gap.toFixed(1)} above Akron`
    : `median metro ${mRpp.toFixed(1)}, ${gap.toFixed(1)} above Akron: effectively the same place`;
  const mx = clamp(xs(mRpp), lw(mLab.length));
  plate(svg, mLab, mx, m.t - 12, 8.2, "middle");
  txt(svg, mLab, {x: mx, y: m.t - 12, "text-anchor": "middle", class: "pv-lab"});
  el("line", {x1: xs(100), y1: m.t + 14, x2: xs(100), y2: m.t + h,
    stroke: "var(--hover)", "stroke-width": 1.5}, svg);
  plate(svg, "US average 100", xs(100) + 8, m.t + 28, 8.2);
  txt(svg, "US average 100", {x: xs(100) + 8, y: m.t + 28, class: "pv-lab",
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
    ? {W: 375, H: 404, m: {t: 58, r: 12, b: 50, l: 34}}
    : {W: 1100, H: 520, m: {t: 44, r: 71, b: 66, l: 32}};
  const {svg, W, H, m, w, h} = PV.chart("scatter", opts);
  const nx = B.map(r => r.nominal), ry = B.map(r => r.rpp);
  const x0 = Math.min(...nx) * .95, x1 = Math.max(...nx) * 1.04;
  /* THE AXIS MUST LABEL PAST THE DATA. At +2 the top gridline came out at 110 while San
     Francisco, Los Angeles, New York, Seattle, Miami, Boston and San Diego all plotted
     above it, so the figure title's "up to a fifth less" pointed at a band of the chart
     with no numbers in it. +3 puts the last tick at 120, above the highest metro. */
  const y0 = Math.min(...ry) - 2, y1 = Math.max(...ry) + 3;
  const xs = v => m.l + ((v - x0) / (x1 - x0)) * w;
  const ys = v => m.t + h - ((v - y0) / (y1 - y0)) * h;
  const yt = ticks(y0, y1, mobile ? 4 : 6);
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys,
    xt: ticks(x0, x1, mobile ? 3 : 6), yt,
    xfmt: usd, yfmt: v => v.toFixed(0),
    /* Dollars need no direction; an index does, so the vertical title says which way is
       dearer before a reader has to work it out from the tick numbers. */
    xlab: mobile ? "Average weekly wage →" : "Average weekly wage on the paycheck →",
    ylab: mobile ? null : "↑ More expensive · price level (US = 100)"});
  /* At 375px the one-line desktop title runs off the canvas, and the version that fitted
     dropped "(US = 100)" — which is the only thing on the chart that says what 100 means.
     Two lines keep the direction AND the anchor at the width where the reader has least
     other help. */
  if (mobile) {
    txt(svg, "↑ More expensive", {x: m.l, y: m.t - 34, class: "pv-axlab"});
    txt(svg, "price level, US average = 100", {x: m.l, y: m.t - 14, class: "pv-axlab"});
  }
  // iso-lines: every metro on one line offers identical purchasing power. Labels sit at
  // the sparse bottom ends of the lines, not in the crowded top band of expensive metros.
  /* At 375px the bottom-right corner held three labels in ~40px of height: two diagonal
     tags and the half-plane annotation, the nearest pair within a few pixels of touching.
     Mobile now tags ONE diagonal, Akron's own, and the subtitle carries the
     generalization ("every metro on one dashed diagonal buys the same"). The remaining
     diagonals still read as a family without being labelled. */
  /* AKRON'S OWN DIAGONAL IS DRAWN. The four iso-lines used to run 1100/1300/1500/1700 and
     none of them was $1,332 — the headline number of the page — so a reader could not see
     Akron's position against its own figure, or read off which metros buy less than Akron
     does. The $1,300 line is replaced by Akron's, in the Akron accent: every metro ABOVE
     the orange diagonal buys less than Akron, every metro below it buys more. */
  const AKISO = Math.round(AK.real);
  const isoAll = [1100, AKISO, 1500, 1700];
  const isoLabel = mobile ? [AKISO] : isoAll;
  /* Two passes, not one. Drawing each line and then its own label meant the NEXT line in
     the series painted straight through the label just written: at 375px the $1,500
     diagonal ran through the label below it. Every line first, then every label with its
     paper plate on top. */
  const isoPts = new Map();
  isoAll.forEach(real => {
    const pts = [];
    for (let p = y0; p <= y1; p += 1) { const nom = real * p / 100;
      if (nom >= x0 && nom <= x1) pts.push([xs(nom), ys(p), nom]); }
    if (pts.length < 2) return;
    isoPts.set(real, pts);
    el("path", {d: "M" + pts.map(p => `${p[0]},${p[1]}`).join("L"), fill: "none",
      stroke: real === AKISO ? CAT[1] : "var(--pv-grid)",
      "stroke-width": real === AKISO ? 2 : 1.5, "stroke-dasharray": "5 4"}, svg);
  });
  /* A label floating near the foot of four parallel lines belongs to none of them, so each
     one now gets a dot on the line it names and sits beside that dot. */
  /* THE LABEL SITS IN THE CLEAR BAND, NOT ACROSS A GRIDLINE. These labels sat at a typed
     13 units above the plot floor, which on the 375-unit canvas put the paper plate at
     329-344 with the bottom gridline at 330.6 running through it. The overlap was in the
     drawing at every width in the mobile band; it only crossed the collision gate's 2px
     floor once the canvas scaled past ~1.27x, so it read as a 560-700px bug and was not
     one. Position the plate against the LAST GRIDLINE, which is the ink it can hit, and
     against the plate's own declared box — then clamp so it stays off the axis rule. The
     desktop value is unchanged: its gridline already fell clear. */
  const gridLo = Math.max(...yt.filter(v => v >= y0 && v <= y1).map(ys));
  const isoY = Math.min(
    Math.max(m.t + h - 13, gridLo + PLATE.up + 2),
    m.t + h - PLATE.down - 2);
  isoPts.forEach((pts, real) => {
    if (!isoLabel.includes(real) || pts[0][2] <= x0 + 2 || pts[0][2] >= x1 - 90) return;
    const me = real === AKISO;
    const s = me ? `Akron buys ${usd(real)}` : `buys ${usd(real)}`;
    el("circle", {cx: pts[0][0], cy: pts[0][1], r: me ? 3.5 : 2.5,
      fill: me ? CAT[1] : "var(--pv-axis)"}, svg);
    plate(svg, s, pts[0][0] + 7, isoY, mobile ? 8.2 : 7.2);
    txt(svg, s, {x: pts[0][0] + 7, y: isoY, class: me ? "pv-lab" : "pv-labq",
      ...(me ? {fill: CAT[1]} : {})});
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
    /* Mobile named only Chicago and Akron. It now names Los Angeles too, because the band
       lede works its price level (114.7 against Akron's 92.9) as the case for "a fifth
       less" and a reader should be able to find the metro it is talking about. Not San
       Francisco: at 375px its label lands in the same band as the top-left half-plane cue,
       and the cue is worth more than a fourth name. */
    const label = mobile ? (me || pick || r.emp > rmax * .52)
                         : (me || pick || r.emp > rmax * .42 || r.rpp > 110);
    if (label) {
      // expensive metros cluster at the top of the scale and their labels collide;
      // remember what has been placed and step up when a slot is taken. The bucket is
      // narrower at 375px: at 90 units wide, San Francisco and Los Angeles shared one, so
      // San Francisco stepped up 16px and printed into the axis title above the plot.
      const key = Math.round(xs(r.nominal) / (mobile ? 60 : 90));
      const lvl = (placedLbl[key] = (placedLbl[key] || 0) + 1) - 1;
      // A stepped label must not leave the plot; the ceiling is the last defence.
      const ly = Math.max(m.t + 12, ys(r.rpp) - rad - 6 - lvl * 16);
      txt(svg, short(r.name), {x: xs(r.nominal), y: ly,
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
  const fy = m.t + (mobile ? 14 : 16);
  if (mobile) plate(svg, "salary flatters the offer", m.l + 8, fy, 8.2);
  txt(svg, "salary flatters the offer", {x: m.l + 8, y: fy,
    class: "pv-labq", opacity: .8});
  const uy = m.t + h - (mobile ? 52 : 12);
  if (mobile) plate(svg, "salary understates it", m.l + w - 6, uy, 8.2, "end");
  txt(svg, "salary understates it", {x: m.l + w - 6, y: uy,
    "text-anchor": "end", class: "pv-labq", opacity: .8});
  /* SIZE IS LOAD-BEARING HERE — the figure title is about where the BIGGEST employers sit
     — and "bigger circles mean more polymer jobs" converts no circle into a job count. A
     three-step key does. Desktop only: at 375px the key would cost more of the plot than
     it returns, so the subtitle names the two ends of the scale instead. */
  if (!mobile) {
    const kx = m.l + w - 176, ky = m.t + 34;
    el("rect", {x: kx - 16, y: ky - 36, width: 192, height: 66, fill: "var(--paper)",
      opacity: .94, rx: 3, "data-pv-plated": "1"}, svg);
    txt(svg, "Circle size = polymer jobs", {x: kx - 8, y: ky - 20, class: "pv-labq"});
    let cx = kx + 8;
    [2000, 10000, 30000].forEach(e => {
      const rr = rEmp(e);
      el("circle", {cx, cy: ky + 2, r: rr, fill: SEQ[3], opacity: .5,
        stroke: "var(--paper)", "stroke-width": 2}, svg);
      txt(svg, N(e), {x: cx, y: ky + 26, "text-anchor": "middle", class: "pv-labq"});
      cx += rr + 48;
    });
  }
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

/* --------------------------------------------------------- 0. the cold open */
/* The hero strip: the same 56 metros ticked twice, once by the wage on the paycheck and
   once by what that wage buys, against the middle metro of each ranking. That middle is
   the reference the page's whole argument turns on, so it is the line drawn, and it is
   labelled by what it means rather than by its value. Every number in here is derived from
   D.big at draw time with the same median convention as the rest of the page (sorted,
   floor(n/2)), so a revision to realwage.json moves the marks and their labels together.

   SIZED IN REAL CSS PIXELS. A viewBox authored at some fixed unit count and squeezed into
   a narrower column silently shrinks its own type: 678 units in a 350px phone column
   paints a 15-unit label at 7.7px, well under the 12px floor, while every gate that reads
   the markup says it is fine. Here the viewBox width IS the measured width, so the scale
   is 1 and a 15-unit label paints at 15px at every width from 280 to 720 — which is the
   real range this column takes, because below 760px the shared sheet collapses the
   measure to the full wrap and the strip gets WIDER, not narrower.

   THERE IS NO BREAKPOINT IN HERE. Every reflow is measured: the two reading lines wrap to
   the column with getComputedTextLength, the reference label drops to a line of its own
   when it cannot clear the row title, each subject label is clamped inside the box, and
   the dollar ticks thin out when their strings would touch. A hard-coded breakpoint is a
   guess about a string that has not been measured.

   COLOR. The hero ground is --ink #0C6473 and this page's chart inks were mixed for the
   light bands below it: CAT[1] orange, the Akron accent, measures 1.65:1 there and GRAY
   1.9:1, both far under the 3:1 floor for a mark. So the accent is lightened to #FFD09A
   (4.78:1, which also clears 4.5:1 for text), the field ticks are #A3C9CF (3.83:1, marks
   only), the reference and the secondary reading take #C6E2E6 (5.0:1, the standfirst's own
   ink) and the takeaway line is white (6.8:1). */
function drawOpen() {
  const svg = document.getElementById("open");
  if (!svg) return;
  const W = Math.round(svg.getBoundingClientRect().width);
  if (!W) return;                       // not laid out yet; the resize pass will catch it

  /* Keep the <title> and drop the previous render. This runs again on every width change,
     so appending would stack two strips in one box, and a naive innerHTML wipe would take
     the accessible title with it. Keep the first ELEMENT child, not the first childNode:
     with indented markup that slot holds whitespace and the title goes anyway. */
  let kept = 0;
  for (const n of [...svg.childNodes]) {
    if (n.nodeType === 1 && kept < 1) { kept++; continue; }
    svg.removeChild(n);
  }

  const WHITE = "#fff", KEY = "#C6E2E6", FIELD = "#A3C9CF", MARK = "#FFD09A";
  const F = {"font-size": 15, "font-weight": 700};
  const put = (s, a) => txt(svg, s, {...F, ...a});
  /* getComputedTextLength reports USER units, and the viewBox is set to the pixel width
     before anything is measured, so a user unit is a CSS pixel and the gaps below are in
     the same currency as the layout. */
  const len = s => { const n = put(s, {x: 0, y: -99}); const v = n.getComputedTextLength();
    svg.removeChild(n); return v; };
  const wrapTo = (s, max) => {
    const out = []; let line = "";
    for (const word of s.split(" ")) {
      const t = line ? line + " " + word : word;
      if (line && len(t) > max) { out.push(line); line = word; } else line = t;
    }
    return line ? out.concat(line) : out;
  };

  const m = {l: 2, r: 2};
  const w = W - m.l - m.r;
  /* One shared dollar scale for both rows, because both rows ARE dollars a week: the
     printed wage and the same wage restated at national prices. Domain from the data,
     rounded out to the next $50 so no tick sits on top of an extreme. */
  const vals = B.flatMap(r => [r.nominal, r.real]);
  const lo = Math.floor(Math.min(...vals) / 50) * 50;
  const hi = Math.ceil(Math.max(...vals) / 50) * 50;
  const X = v => m.l + (v - lo) / (hi - lo) * w;
  svg.setAttribute("viewBox", `0 0 ${W} 240`);   // provisional; the height is known at the end

  let y = 15;
  /* The takeaway, with a verb, and the reading under it. A ratio, an index or a rank would
     need its direction spelled out; dollars a week still need to be told which way is good,
     because nothing about a tick strip says so. */
  wrapTo(`Akron: below the middle metro on paper, above it once local prices count.`, w)
    .forEach(s => { put(s, {x: m.l, y, fill: WHITE}); y += 19; });
  y += 3;
  wrapTo(`One tick per metro. Further right is more money a week: better for a worker.`, w)
    .forEach(s => { put(s, {x: m.l, y, fill: KEY}); y += 19; });

  const REF = "the middle metro";
  const rows = [
    {title: "On paper", val: r => r.nominal, ak: AK.nominal, rank: AK.big_rank_nominal},
    {title: "What it buys", val: r => r.real, ak: AK.real, rank: AK.big_rank_real}
  ];
  rows.forEach(row => {
    const mx = X(med(B.map(row.val))), ax = X(row.ak);
    const tw = len(row.title), rw = len(REF);
    /* The reference label leans AWAY from Akron's mark. The two sit within 30px of each
       other on this scale, which is the finding and also the problem: left-anchored in both
       rows, the second row's label began left of Akron's tick and read as though it named
       it. Which side is free is a question about the data, so it is asked of the data.

       WHETHER IT THEN CLEARS THE ROW TITLE IS A QUESTION ABOUT RENDERED STRINGS, NOT ABOUT
       THE VIEWPORT, and this is where that lesson was paid for again. Leaning the second
       row's label left puts its END near the middle of the column while the row title's
       start is pinned to the margin, so the two meet at some widths and not others: with
       this guard removed, "What it buys" and "the middle metro" overlap by 89px at a 390px
       viewport and by 20px at 800px, and are CLEAN at 320 and at 1440 — the two widths
       anyone would think to test. The band is doubled because the shared sheet collapses
       the measure to the full wrap below 760px, so this column gets WIDER as the viewport
       narrows past that point and the collision zone reopens on the other side of it. So
       the strings are measured and the reference drops to a line of its own when it cannot
       clear. Verified by disabling this line and re-running the width sweep. */
    let rx = ax > mx ? mx - 7 : mx + 7, anchor = ax > mx ? "end" : "start";
    if (anchor === "start" && rx + rw > W - m.r) { rx = mx - 7; anchor = "end"; }
    if (anchor === "end" && rx - rw < m.l) { rx = mx + 7; anchor = "start"; }
    const own = (anchor === "start" ? rx : rx - rw) < m.l + tw + 14;
    y += 14;
    put(row.title, {x: m.l, y, fill: KEY});
    if (own) y += 19;      // the reference drops UNDER the title, staying next to its band
    put(REF, {x: rx, y, fill: KEY, "text-anchor": anchor});

    const refY = y + 5;                        // just under the reference label's baseline
    const top = y + 8, BH = 26, foot = top + BH + 5;
    // one tick per metro: the distribution as it is, not smoothed into a curve
    B.forEach(r => el("line", {x1: X(row.val(r)), y1: top + 8, x2: X(row.val(r)), y2: top + BH,
      stroke: FIELD, "stroke-width": 1.4, "stroke-opacity": .85}, svg));
    /* The reference runs the whole way from its own label down through the band. Drawn only
       across the band it was one more pale tick inside the densest part of the field, which
       is exactly where the middle metro is: the first render put a dot and a dash there and
       neither the desktop nor the phone read as a rule. */
    el("line", {x1: mx, y1: refY, x2: mx, y2: top + BH, stroke: KEY, "stroke-width": 1.4,
      "stroke-dasharray": "4 3"}, svg);
    el("circle", {cx: mx, cy: refY, r: 2.6, fill: KEY}, svg);
    // the subject, taller and heavier than either
    el("line", {x1: ax, y1: top - 4, x2: ax, y2: foot, stroke: MARK, "stroke-width": 3.6}, svg);

    /* Direct label, clamped inside the box: at the narrow end Akron sits close enough to
       the left margin that a centred label would hang outside the viewBox. */
    const s = `Akron ${usd(row.ak)}, ${ord(row.rank)} of ${B.length}`;
    const sw = len(s);
    let cx = ax, ca = "middle";
    if (ax - sw / 2 < m.l) { cx = m.l; ca = "start"; }
    else if (ax + sw / 2 > W - m.r) { cx = W - m.r; ca = "end"; }
    y = foot + 17;
    el("line", {x1: ax, y1: foot, x2: ax, y2: y - 11, stroke: MARK, "stroke-width": 1.2}, svg);
    put(s, {x: cx, y, fill: MARK, "text-anchor": ca});
    y += 8;
  });

  y += 6;
  el("line", {x1: m.l, y1: y, x2: m.l + w, y2: y, stroke: "rgba(255,255,255,.32)",
    "stroke-width": 1}, svg);
  y += 17;
  /* Ticks thin out by MEASUREMENT, not by breakpoint: a label is kept only if its box
     clears the last one it was drawn beside and stays inside the frame. */
  let right = -1e9;
  ticks(lo, hi, 5).forEach(v => {
    const s = usd(v), sw = len(s), x = X(v);
    if (x - sw / 2 < Math.max(m.l, right + 10) || x + sw / 2 > W - m.r) return;
    right = x + sw / 2;
    put(s, {x, y, "text-anchor": "middle", fill: KEY});
  });
  svg.setAttribute("viewBox", `0 0 ${W} ${y + 6}`);
}

/* --------------------------------------------------------------- assemble */
function drawAll() { drawOpen(); drawSlope(); drawStrip(); drawScatter(); }
drawAll();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);
/* ONE MECHANISM, ONE MORE TRIGGER. The cold open is sized in real pixels, so it has to be
   redrawn whenever its column changes width, not only when the 760px breakpoint flips —
   otherwise a 678-unit viewBox left in a 502px column paints its labels at 11.1px. The
   three charts below author fixed viewBoxes, so a redraw at an unchanged breakpoint
   reproduces exactly what is already on screen. */
let RESIZE;
addEventListener("resize", () => { clearTimeout(RESIZE); RESIZE = setTimeout(drawAll, 140); },
  {passive: true});

/* NO PRE-HERO FOOTPRINT BAR. This page is metro-level end to end, which is a real scope
   limit and was previously flagged in a banner injected between the masthead and the
   headline — apparatus above the finding, and (having no .wrap) flush to the viewport
   edge at x=0 while every other block sat on the 301px rail. The limit now appears in
   three proper places instead: one reader-language sentence in band 1's gloss, the
   slope figure's own source line, and meta.geography in the methodology box. */

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "realwage", meta: D.meta});
})();
