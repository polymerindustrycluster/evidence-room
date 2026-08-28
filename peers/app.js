/* National position. The design problem here is suppression: a rank computed from what
   BLS discloses omits Chicago, New York and Atlanta. So the state chart (51/51 disclosed)
   carries the claim; the metro scatter carries the interest with the withheld field drawn
   ON it rather than confessed underneath; a third chart sizes the blind spot; and the time
   series says what it found instead of leaving the reader to squint.

   Two subjects, not one. Cleveland is 4th of the 155 disclosed metros and Akron is 6th,
   and both metros' core counties sit inside PIC-12 — so the page argues the pair, and
   colour carries exactly that: orange = Akron, plum = Cleveland, teal = every other
   disclosed metro, grey hatch = withheld. Every chart re-lays itself out per form below
   760px: no sideways-scroll hint, subject and reference line in the first paint. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, CAT, GRAY, INK} = PV;
const D = await PV.data("peers.json");
const FP = PV.footprint(D.meta);
const N = n => Math.round(n).toLocaleString("en-US");
const short = v => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : String(Math.round(v));
const pctf = (a, b) => (a / b * 100).toFixed(0) + "%";
/* Tick labels never round-lie. The trend's ticks land on exact thousands, so print them
   as exact thousands rather than letting short() mix "5.0k" with "20k". */
const kfmt = v => v === 0 ? "0" : (v / 1000) + "k";
/* ticks() yields 2.5 and 7.5 on the concentration axis; toFixed(0) would print those as
   "3×" and "8×". Format to the tick's real precision instead. */
const lqfmt = v => (Math.abs(v % 1) > 1e-9 ? v.toFixed(1) : v.toFixed(0)) + "×";
/* Ordinals, because the metro finder prints whatever rank the reader lands on and
   "52th of 155" is the kind of thing that costs a page its credibility in one glance. */
const ord = n => { const t = n % 100;
  return t >= 11 && t <= 13 ? n + "th" : n + ({1: "st", 2: "nd", 3: "rd"}[n % 10] || "th"); };
/* A source line is capped at about 45 words: source, period, one limitation. Everything
   past that goes INSIDE the figure's own table disclosure rather than in front of a
   reader who did not ask for it (page-design § caveat ink). */
const withNote = (html, note) =>
  html.replace("</details>", `<p class="tnote">${note}</p></details>`);
const S = D.states["326"], M = D.metros["326"];
const AKRON = M.subject, CLE = "C1741";
const shortName = s => s.split(",")[0].split("-")[0].trim();
const MOBILE = matchMedia("(max-width: 760px)");

/* A paper plate behind a label that must cross other ink (the cost-scissors idiom).
   data-pv-plated on the text tells collide.mjs the covering is deliberate. */
const plate = (parent, s, x, y, fs = 6.4, anchor = "start") =>
  el("rect", {x: (anchor === "end" ? x - s.length * fs - 3 : x - 3), y: y - 12,
    width: s.length * fs + 6, height: 16, fill: "var(--paper)", opacity: .93, rx: 2}, parent);
/* A multi-line caption gets ONE plate, not one per line: three stacked rects read as a
   ragged wall of white boxes where a single card reads as a caption. `rule` paints the
   block's left edge in the withheld grey, which is how the void caption ties itself to
   the hatch under the whole plot rather than to the shaded corner it happens to sit in. */
const platedBlock = (parent, lines, xRight, y0, o = {}) => {
  const fs = o.fs || 6.4, lh = o.lh || 18;
  const wmax = Math.max(...lines.map(l => l.s.length * fs));
  const x0 = xRight - wmax - 10, H = lines.length * lh + 6;
  el("rect", {x: x0, y: y0 - 13, width: wmax + 16, height: H, fill: "var(--paper)",
    opacity: .93, rx: 3}, parent);
  if (o.rule) el("rect", {x: x0, y: y0 - 13, width: 3, height: H, fill: o.rule}, parent);
  lines.forEach((l, i) => txt(parent, l.s, {x: xRight, y: y0 + i * lh, "text-anchor": "end",
    class: l.cls || "pv-labq", "data-pv-plated": "1", fill: l.fill}));
};
const plated = (parent, s, x, y, o = {}) => {
  const fs = o.fs || 6.4, anchor = o.anchor || "start";
  plate(parent, s, x, y, fs, anchor);
  return txt(parent, s, {x, y, "text-anchor": anchor, class: o.cls || "pv-labq",
    "data-pv-plated": "1", fill: o.fill});
};

/* ------------------------------------------------------------- derived facts
   Computed, never typed: every denominator on the page is the length of a filtered
   set, so a data revision moves the sentence and the claims harness catches it. */
const SC = D.metro_scatter;
const ranked = [...SC].sort((a, b) => b.emp - a.emp);
const rankOf = a => ranked.findIndex(p => p.area === a) + 1;
const akron = SC.find(p => p.area === AKRON);
const cle = SC.find(p => p.area === CLE);
const cleRank = rankOf(CLE);
/* The corner's two thresholds are editorial round numbers, stated on the chart and in the
   source line so a reader can re-cut them from the table view. */
const JOBCUT = 4000, LQCUT = 2;
const bigN = SC.filter(p => p.emp >= JOBCUT).length;
const conN = SC.filter(p => p.lq >= LQCUT).length;
const quad = SC.filter(p => p.emp >= JOBCUT && p.lq >= LQCUT).sort((a, b) => b.emp - a.emp);
const quadSet = new Set(quad.map(p => p.area));
const V = D.visibility;
const metroShare = V.metro.disclosed_emp / V.state.disclosed_emp;
const top20 = S.top.slice(0, 20);
const top20Share = top20.reduce((s, r) => s + r.emp, 0) / V.state.disclosed_emp;
const stateLead = S.subject_emp - S.top[1].emp;

/* ------------------------------------------------------------------- hero stats */
/* Four cards, and they must not wrap onto a second row (house rule: cut to three before
   letting four wrap). The binding constraint is the KEY line — uppercase and letterspaced,
   with no max-width — so every key here is kept under about twenty characters. */
/* The concentration card is the FIRST place a reader meets the × unit, so its sub-line
   is the plain reading of the ratio, not a restatement of the arithmetic. The rank and
   the job counts move to the card beside it, which is what ranks and counts are for. */
PV.figures([
  ["key", "#" + S.rank_emp, "Ohio, nationally", `${N(S.subject_emp)} jobs, none withheld`],
  ["", `#${cleRank} · #${M.rank_emp}`, "the cluster&rsquo;s metros",
   `Cleveland ${N(cle.emp)} · Akron ${N(akron.emp)} jobs, of ${M.of_disclosed} disclosed`],
  ["", akron.lq.toFixed(2) + "×", "Akron concentration",
   `plastics fills nearly five times as much of Akron&rsquo;s job base as of the
    country&rsquo;s`],
  ["", String(M.suppressed), "metros withhold", "rank unknown, not estimated"]
]);

/* ------------------------------------------------------------- 1. states */
function drawStates() { MOBILE.matches ? statesMobile() : statesDesktop(); }

function statesDesktop() {
  const rows = top20;
  const {svg, W, m, w} = PV.chart("states",
    {W: 1100, rows: rows.length, rowH: 28, m: {t: 40, r: 105, b: 56, l: 100}});
  const maxV = rows[0].emp;
  const xs = v => m.l + (v / maxV) * w;
  const h = rows.length * 28;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(0, maxV, 5), yt: [],
    xfmt: short, xlab: "Plastics and rubber products jobs"});
  rows.forEach((r, i) => {
    const y = m.t + i * 28 + 4, bh = 18;
    const isOh = r.area === S.subject;
    // emphasis, not categorical: one bar is the subject, the rest are context
    el("rect", {x: m.l, y, width: Math.max(3, xs(r.emp) - m.l), height: bh,
      fill: isOh ? SEQ[5] : SEQ[2], rx: 4}, svg);
    txt(svg, shortName(r.name), {x: m.l - 12, y: y + bh - 4, "text-anchor": "end",
      class: isOh ? "pv-lab" : "pv-labq"});
    txt(svg, `${N(r.emp)}${r.lq ? `  ·  ${r.lq.toFixed(2)}×` : ""}`,
      {x: xs(r.emp) + 10, y: y + bh - 4, class: isOh ? "pv-lab" : "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 5, width: W, height: bh + 10, fill: "transparent"},
      svg), `<b>${r.name}</b><br><span class="v">${N(r.emp)}</span> jobs<br>
      <span class="v">${r.lq ? r.lq.toFixed(2) : "—"}</span>× the national share<br>
      <span class="v">${N(r.estabs)}</span> establishments`,
      `${r.name}: ${N(r.emp)} jobs`);
  });
  /* The margin, drawn: a rule at second place and the gap named above it. */
  const x2 = xs(S.top[1].emp);
  el("line", {x1: x2, y1: m.t - 8, x2, y2: m.t + 56, stroke: "var(--hover)",
    "stroke-width": 1.5, "stroke-dasharray": "5 4"}, svg);
  plated(svg, `${N(stateLead)} jobs clear of ${shortName(S.top[1].name)}`, x2 + 8, m.t - 14,
    {cls: "pv-lab", fill: "var(--hover)"});
}

function statesMobile() {
  const rows = top20;
  const m = {t: 34, r: 12, b: 54, l: 12}, W = 375, rowH = 34;
  const H = m.t + rows.length * rowH + m.b;
  const {svg} = PV.chart("states", {W, H});
  const w = W - m.l - m.r, h = rows.length * rowH;
  const maxV = rows[0].emp;
  const xs = v => m.l + (v / maxV) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: [0, 25000, 50000], yt: [],
    xfmt: short, xlab: ""});
  rows.forEach((r, i) => {
    const y = m.t + i * rowH, isOh = r.area === S.subject;
    /* Value rides the LABEL line, not the bar end: nothing to clip at the viewport edge. */
    txt(svg, `${shortName(r.name)} · ${N(r.emp)}${r.lq ? ` · ${r.lq.toFixed(2)}×` : ""}`,
      {x: m.l, y: y + 13, class: isOh ? "pv-lab" : "pv-labq"});
    el("rect", {x: m.l, y: y + 19, width: Math.max(3, xs(r.emp) - m.l), height: 11,
      fill: isOh ? SEQ[5] : SEQ[2], rx: 3}, svg);
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, svg),
      `<b>${r.name}</b><br><span class="v">${N(r.emp)}</span> jobs<br>
       <span class="v">${r.lq ? r.lq.toFixed(2) : "—"}</span>× the national share`,
      `${r.name}: ${N(r.emp)} jobs`);
  });
  txt(svg, "plastics and rubber products jobs", {x: m.l, y: H - 10, class: "pv-labq"});
}

/* ------------------------------------------------------------- 2. metro scatter */
let FOUND = null;      // the metro the reader looked up, or null
let MISS = null;       // what they typed when nothing matched
let LASTQ = "";

function drawScatter() { MOBILE.matches ? scatterMobile() : scatterDesktop(); }

/* The withheld field. 227 metros have no coordinates at all — not a region of the plane,
   the WHOLE plane — so the honest mark is a wash under everything, labelled. Drawn first
   and kept inside the plot rect so it can never sit on a tick label. */
function voidWash(svg, m, w, h) {
  const defs = el("defs", {}, svg);
  const pat = el("pattern", {id: "voidhatch", width: 7, height: 7,
    patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)"}, defs);
  el("line", {x1: 0, y1: 0, x2: 0, y2: 7, stroke: "#E3DED5", "stroke-width": 2}, pat);
  el("rect", {x: m.l, y: m.t, width: w, height: h, fill: "url(#voidhatch)"}, svg);
}

function quadTint(svg, m, w, xs, ys) {
  const x0 = xs(JOBCUT), y0 = ys(LQCUT);
  el("rect", {x: x0, y: m.t, width: m.l + w - x0, height: y0 - m.t,
    fill: "rgba(0,139,168,.09)"}, svg);
  el("line", {x1: x0, y1: m.t, x2: x0, y2: y0, stroke: "#008BA8", "stroke-width": 1.4,
    "stroke-dasharray": "6 4"}, svg);
  el("line", {x1: x0, y1: y0, x2: m.l + w, y2: y0, stroke: "#008BA8", "stroke-width": 1.4,
    "stroke-dasharray": "6 4"}, svg);
}

function dotFill(p) {
  return p.area === AKRON ? CAT[1] : p.area === CLE ? CAT[2] : SEQ[3];
}
function dotTip(p) {
  return `<b>${p.name}</b><br><span class="v">${N(p.emp)}</span> jobs ·
    <span class="v">${N(p.estabs)}</span> establishments<br>
    <span class="v">${p.lq.toFixed(2)}</span>× the national share<br>
    rank <span class="v">${rankOf(p.area)}</span> of ${M.of_disclosed} disclosed`;
}

function scatterDesktop() {
  const {svg, m, w, h} = PV.chart("scatter",
    {W: 1100, H: 520, m: {t: 44, r: 132, b: 68, l: 34}});
  const maxE = Math.max(...SC.map(p => p.emp)), maxL = Math.max(...SC.map(p => p.lq)) * 1.05;
  const xs = v => m.l + (Math.sqrt(v) / Math.sqrt(maxE)) * w;
  const ys = v => m.t + h - (v / maxL) * h;
  voidWash(svg, m, w, h);
  quadTint(svg, m, w, xs, ys);
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys,
    xt: [0, 500, 2000, 5000, 10000, 17000].filter(v => v <= maxE),
    yt: ticks(0, maxL, 6), xfmt: short, yfmt: lqfmt,
    /* Both axis titles carry the READING. The square-root scale gets the one reading aid
       a compressed scale owes a reader; the arithmetic is in the source line. */
    xlab: "Jobs. Square-root scale: twice as far right is four times as many",
    ylab: "plastics a smaller slice of local jobs ←   1.0×   → a bigger slice than nationally"});
  SC.forEach(p => {
    const big = p.area === AKRON || p.area === CLE;
    hoverable(el("circle", {cx: xs(p.emp), cy: ys(p.lq), r: big ? 9 : 5, fill: dotFill(p),
      stroke: "var(--paper)", "stroke-width": big ? 3 : 1.5}, svg),
      dotTip(p), `${p.name}: ${N(p.emp)} jobs at ${p.lq.toFixed(2)} times the national share`);
  });
  // label the two subjects, the seven in the corner, and anything genuinely large
  const notable = SC.filter(p => p.area === AKRON || p.area === CLE ||
    quadSet.has(p.area) || p.emp >= 10000);
  notable.forEach(p => {
    const sub = p.area === AKRON || p.area === CLE, off = sub ? 14 : 10;
    // flip to the inside when the label would run past the plot's right edge
    const flip = xs(p.emp) > m.l + w - 70;
    txt(svg, shortName(p.name),
      {x: xs(p.emp) + (flip ? -off : off), y: ys(p.lq) + 4,
       "text-anchor": flip ? "end" : "start",
       class: sub ? "pv-lab" : "pv-labq",
       fill: p.area === AKRON ? CAT[1] : p.area === CLE ? CAT[2] : "var(--pv-muted)"});
  });
  /* Drawn last: rules and captions sit ON TOP of the point labels. */
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  /* Named by what the line IS, in reader words, not by its value alone; which way to
     cross it is on the axis title. It sits at the LEFT end of its own line: the right end
     is where the big low-concentration metros carry their names, and a longer caption
     there plated over "Detroit". Outside the right margin it was the only ink on the page
     past the figure's quantized width, so left-inside is the remaining seat. */
  plated(svg, "1.0× = the US average", m.l + 6, ys(1) - 8, {fill: "var(--hover)"});
  // the corner's claim, written in the corner
  platedBlock(svg, [
    {s: "Large and concentrated", cls: "pv-lab", fill: "#00707F"},
    {s: `${quad.length} of ${M.of_disclosed} disclosed metros clear ${N(JOBCUT)} jobs and 2.0×`}
  ], m.l + w - 6, m.t + 24, {rule: "#008BA8"});
  // the void, written on the plane it covers
  platedBlock(svg, [
    {s: `${M.suppressed} metros are withheld from this whole chart.`, cls: "pv-lab"},
    {s: `${M.could_displace.slice(0, 4).map(x => shortName(x.name)).join(", ")} are somewhere on`},
    {s: "this plane, at jobs BLS will not publish."}
  ], m.l + w - 6, m.t + 96, {rule: "#C9C3B8"});
  drawFound(svg, xs, ys, 13);
}

function scatterMobile() {
  const m = {t: 38, r: 12, b: 64, l: 32}, W = 375, H = 440;
  const {svg} = PV.chart("scatter", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const maxE = Math.max(...SC.map(p => p.emp)), maxL = Math.max(...SC.map(p => p.lq)) * 1.05;
  const xs = v => m.l + (Math.sqrt(v) / Math.sqrt(maxE)) * w;
  const ys = v => m.t + h - (v / maxL) * h;
  voidWash(svg, m, w, h);
  quadTint(svg, m, w, xs, ys);
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: [0, 2000, 10000], yt: ticks(0, maxL, 4),
    xfmt: kfmt, yfmt: lqfmt, xlab: "", ylab: ""});
  SC.forEach(p => {
    const big = p.area === AKRON || p.area === CLE;
    hoverable(el("circle", {cx: xs(p.emp), cy: ys(p.lq), r: big ? 7 : 3.2, fill: dotFill(p),
      stroke: "var(--paper)", "stroke-width": big ? 2.5 : 1}, svg),
      dotTip(p), `${p.name}: ${N(p.emp)} jobs at ${p.lq.toFixed(2)} times the national share`);
  });
  /* Subject and reference line in the first paint: Akron labelled, Cleveland labelled,
     the parity rule drawn and named. Nothing here is behind a pan. */
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.4}, svg);
  plated(svg, "1.0× = the US average", m.l + 4, ys(1) - 6, {fs: 7.6, fill: "var(--hover)"});
  plated(svg, "Akron", xs(akron.emp) + 11, ys(akron.lq) + 5,
    {fs: 7.8, cls: "pv-lab", fill: CAT[1]});
  plated(svg, "Cleveland", xs(cle.emp) + 11, ys(cle.lq) + 5,
    {fs: 7.8, cls: "pv-lab", fill: CAT[2]});
  /* Two short lines rather than one long one: at 375px a one-line caption's plate ran
     back past the corner's own boundary and read as a label for the whole plot. */
  platedBlock(svg, [{s: `${quad.length} of ${M.of_disclosed} metros`, cls: "pv-lab",
    fill: "#00707F"}, {s: `${short(JOBCUT)}+ jobs, 2×+`}], m.l + w - 2, m.t + 16,
    {fs: 7.6, lh: 17, rule: "#008BA8"});
  platedBlock(svg, [{s: `${M.suppressed} withheld metros`, cls: "pv-lab"},
    {s: "could be anywhere here"}], m.l + w - 2, m.t + h - 34,
    {fs: 7.6, lh: 17, rule: "#C9C3B8"});
  /* At 375px the two axis titles are the only place direction can live, so they say the
     reading rather than the formula. */
  txt(svg, "up = a bigger slice of local jobs than the US",
    {x: m.l, y: H - 24, class: "pv-labq"});
  txt(svg, "right = more jobs, on a square-root scale",
    {x: m.l, y: H - 6, class: "pv-labq"});
  drawFound(svg, xs, ys, 11);
}

/* The lookup ring. Verification and lookup are the two ladder jobs this page owes a
   reader: 155 dots identified by hover alone made "where is my metro" unanswerable. */
function drawFound(svg, xs, ys, r) {
  if (!FOUND) return;
  const g = el("g", {}, svg);
  el("circle", {cx: xs(FOUND.emp), cy: ys(FOUND.lq), r, fill: "none", stroke: INK,
    "stroke-width": 2.5}, g);
  if (FOUND.area !== AKRON && FOUND.area !== CLE) {
    const flip = xs(FOUND.emp) > 0.72 * (svg.viewBox.baseVal.width);
    plated(g, shortName(FOUND.name), xs(FOUND.emp) + (flip ? -r - 5 : r + 5),
      ys(FOUND.lq) + 5, {cls: "pv-lab", fs: 7.4, anchor: flip ? "end" : "start",
      fill: INK});
  }
}

function verdict() {
  const v = document.getElementById("mverdict");
  /* A miss is the page's own argument, live: most of the country is not on this chart.
     Typing Toledo or Chicago should say why nothing lit up, not fail silently. */
  if (!FOUND && MISS) {
    v.innerHTML = `No disclosed metro matches &ldquo;${MISS.replace(/[<&]/g, "")}&rdquo;.
      Either it is one of the <b>${M.suppressed} metros the bureau withholds</b>, in which
      case its jobs are unknown rather than zero, or it is written differently in the BLS
      area file. ${M.of_disclosed} of ${M.of_disclosed + M.suppressed} metros are here.`;
    return;
  }
  if (!FOUND) {
    /* Says what the ratio MEANS, in the same shape as the looked-up verdict below, so a
       reader who types a metro gets the sentence they have already learnt to read.
       "4.69× the national share" alone told them nothing about which way was up. */
    v.innerHTML = `<b>Akron</b>: ${N(akron.emp)} jobs, and plastics fills
      ${akron.lq.toFixed(2)}× as much of its job base as of the country&rsquo;s,
      ${ord(M.rank_emp)} of the ${M.of_disclosed} metros that disclose. Cleveland is
      ${ord(cleRank)} on ${N(cle.emp)} jobs at ${cle.lq.toFixed(2)}×: more jobs, a thinner
      slice of a bigger economy, which keeps it out of the shaded corner. Type a metro to
      find it on the chart.`;
    return;
  }
  const p = FOUND;
  v.innerHTML = `<b>${p.name}</b>: ${N(p.emp)} jobs, and plastics fills
    ${p.lq.toFixed(2)}× as much of its job base as of the country&rsquo;s.
    <b>${ord(rankOf(p.area))} of ${M.of_disclosed}</b> disclosed metros, across
    ${N(p.estabs)} establishments. ${quadSet.has(p.area)
      ? "It shares the shaded corner with Akron."
      : `Akron is ${ord(M.rank_emp)} at ${akron.lq.toFixed(2)}×.`}`;
}

{
  const input = document.getElementById("mfind");
  const list = document.getElementById("metrolist");
  list.innerHTML = [...SC].sort((a, b) => a.name.localeCompare(b.name))
    .map(p => `<option value="${p.name}"></option>`).join("");
  const match = q => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return null;
    return SC.find(p => p.name.toLowerCase() === s) ||
           SC.find(p => p.name.toLowerCase().startsWith(s)) ||
           SC.find(p => p.name.toLowerCase().includes(s)) || null;
  };
  input.addEventListener("input", () => {
    const q = input.value.trim();
    const hit = match(q);
    const key = hit ? hit.area : (q.length >= 2 ? "miss:" + q.toLowerCase() : "");
    if (key === LASTQ) return;
    LASTQ = key;
    FOUND = hit;
    MISS = hit || q.length < 2 ? null : q;
    verdict();
    drawScatter();
  });
}
verdict();

/* ---------------------------------------------------------- 3. visibility */
function drawVis() { MOBILE.matches ? visMobile() : visDesktop(); }
const VKEYS = ["state", "metro", "county"];
const VLAB = {state: "States", metro: "Metro areas", county: "County areas"};

function hatchDefs(svg) {
  const defs = el("defs", {}, svg);
  const pat = el("pattern", {id: "supp", width: 8, height: 8,
    patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)"}, defs);
  el("rect", {width: 8, height: 8, fill: "#F2EFE9"}, pat);
  el("line", {x1: 0, y1: 0, x2: 0, y2: 8, stroke: "#C9C3B8", "stroke-width": 3}, pat);
}

function visDesktop() {
  const {svg, W, m, w, h} = PV.chart("vis",
    {W: 1100, H: 250, m: {t: 44, r: 97, b: 56, l: 92}});
  hatchDefs(svg);
  const bh = 34, gap = (h - VKEYS.length * bh) / (VKEYS.length - 1);
  VKEYS.forEach((k, i) => {
    const v = V[k], tot = v.disclosed + v.suppressed, y = m.t + i * (bh + gap);
    const dw = (v.disclosed / tot) * w;
    el("rect", {x: m.l, y, width: dw, height: bh, fill: SEQ[4], rx: 4}, svg);
    // 2px surface gap, then the suppressed remainder as texture — never a solid block.
    // States are 100% disclosed, so there is no remainder to draw at all.
    const rem = w - dw - 2;
    if (rem > 0)
      el("rect", {x: m.l + dw + 2, y, width: rem, height: bh, fill: "url(#supp)", rx: 4}, svg);
    txt(svg, VLAB[k], {x: m.l - 12, y: y + bh / 2 + 5, "text-anchor": "end", class: "pv-lab"});
    /* Every bar is normalised to its own level's universe, so the 51-state bar draws
       longer than the 703-county segment. The share rides INSIDE the bar with the count,
       which is the only place a reader can trip over the unit switch. */
    txt(svg, `${N(v.disclosed)} shown · ${pctf(v.disclosed, tot)} visible`,
      {x: m.l + 12, y: y + bh / 2 + 5, class: "pv-lab", fill: "#fff"});
    txt(svg, `${N(v.suppressed)} withheld`, {x: m.l + w + 12, y: y + bh / 2 + 5,
      class: "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 4, width: W, height: bh + 8, fill: "transparent"},
      svg), `<b>${VLAB[k]}</b><br><span class="v">${v.disclosed}</span> disclosed of
      <span class="v">${tot}</span> (${pctf(v.disclosed, tot)})<br>
      withheld areas hold <span class="v">${N(v.suppressed_estabs)}</span> establishments`,
      `${VLAB[k]}: ${v.disclosed} of ${tot} disclosed`);
  });
}

function visMobile() {
  const m = {t: 22, r: 12, b: 22, l: 12}, W = 375, rowH = 68;
  const H = m.t + VKEYS.length * rowH + m.b;
  const {svg} = PV.chart("vis", {W, H});
  hatchDefs(svg);
  const w = W - m.l - m.r;
  VKEYS.forEach((k, i) => {
    const v = V[k], tot = v.disclosed + v.suppressed, y = m.t + i * rowH;
    const dw = (v.disclosed / tot) * w;
    /* Counts ride the label line above the bar, so nothing clips at the screen edge. */
    txt(svg, `${VLAB[k]} · ${N(v.disclosed)} shown · ${N(v.suppressed)} withheld`,
      {x: m.l, y: y + 14, class: "pv-lab"});
    el("rect", {x: m.l, y: y + 22, width: dw, height: 24, fill: SEQ[4], rx: 3}, svg);
    const rem = w - dw - 2;
    if (rem > 0)
      el("rect", {x: m.l + dw + 2, y: y + 22, width: rem, height: 24, fill: "url(#supp)",
        rx: 3}, svg);
    txt(svg, pctf(v.disclosed, tot) + " visible", {x: m.l, y: y + 58, class: "pv-labq"});
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, svg),
      `<b>${VLAB[k]}</b><br><span class="v">${v.disclosed}</span> of
       <span class="v">${tot}</span> disclosed`,
      `${VLAB[k]}: ${v.disclosed} of ${tot} disclosed`);
  });
}

/* -------------------------------------------------------------- 4. trend */
const TR = Object.values(D.trend).filter(t => t.naics === "326");
const tAkron = TR.find(t => t.area === AKRON);
const peers = TR.filter(t => t.area !== AKRON)
  .sort((a, b) => b.series.at(-1).emp - a.series.at(-1).emp).slice(0, 8);
const YRS = [...new Set([tAkron, ...peers].flatMap(t => t.series.map(s => s.year)))].sort();
const emp = (t, y) => (t.series.find(s => s.year === y) || {}).emp;
const first = t => t.series[0].emp, last = t => t.series.at(-1).emp;
const tLA = TR.find(t => t.name.startsWith("Los Angeles"));
const laDrop = first(tLA) - last(tLA);
const laPct = laDrop / first(tLA) * 100;
const akBase = emp(tAkron, YRS[0]);
const akSwing = Math.max(...tAkron.series.map(s => Math.abs(s.emp - akBase)));
const grew = TR.filter(t => last(t) > first(t)).length;
const gappy = TR.filter(t => t.series.length < YRS.length).length;
let picked = peers[0] ? peers[0].area : null;

function drawTrend() { MOBILE.matches ? trendMobile() : trendDesktop(); }

function trendGeom(svg, m, w, h) {
  const shown = [tAkron, ...peers];
  const maxV = Math.max(cle.emp, ...shown.flatMap(t => t.series.map(s => s.emp))) * 1.06;
  const xs = y => m.l + ((y - YRS[0]) / (YRS.at(-1) - YRS[0])) * w;
  const ys = v => m.t + h - (v / maxV) * h;
  return {shown, maxV, xs, ys};
}

function trendLines(svg, xs, ys, mobile) {
  const out = [];
  [tAkron, ...peers].forEach(t => {
    const on = t.area === AKRON || t.area === picked;
    const s = t.series;
    el("path", {d: "M" + s.map(p => `${xs(p.year)},${ys(p.emp)}`).join("L"), fill: "none",
      stroke: t.area === AKRON ? CAT[1] : (on ? INK : GRAY),
      "stroke-width": on ? 3 : 1.2, opacity: on ? 1 : .35}, svg);
    if (on) {
      out.push({t, y: ys(last(t))});
      s.forEach(p => hoverable(
        el("circle", {cx: xs(p.year), cy: ys(p.emp), r: mobile ? 3.6 : 4.5,
          fill: t.area === AKRON ? CAT[1] : INK, stroke: "var(--paper)",
          "stroke-width": 1.5}, svg),
        `<b>${t.name}, ${p.year}</b><br><span class="v">${N(p.emp)}</span> jobs<br>
         <span class="v">${p.lq ? p.lq.toFixed(2) : "—"}</span>× the national share`,
        `${t.name} ${p.year}: ${N(p.emp)} jobs`));
    }
  });
  return out;
}

/* Cleveland has a 2024 cell and no series: the extract keeps metros with at least eight
   disclosed years, and Cleveland's earlier cells are withheld too often to clear it. An
   absence this load-bearing is drawn as a ghost, not left off the chart. */
function clevelandGhost(svg, xs, ys, mobile) {
  const cx = xs(YRS.at(-1)), cy = ys(cle.emp);
  el("circle", {cx, cy, r: mobile ? 5 : 7, fill: "none", stroke: CAT[2],
    "stroke-width": 2, "stroke-dasharray": "3 3"}, svg);
  plated(svg, mobile ? `Cleveland ${short(cle.emp)}, 2024 only` : `Cleveland, ${N(cle.emp)} in 2024`,
    cx - (mobile ? 10 : 14), cy + (mobile ? -8 : 4),
    {cls: "pv-lab", fs: mobile ? 7.6 : 6.6, anchor: "end", fill: CAT[2]});
  if (!mobile)
    plated(svg, "too few disclosed years for a line", cx - 14, cy - 13, {anchor: "end"});
}

function trendDesktop() {
  const {svg, m, w, h} = PV.chart("trend",
    {W: 1100, H: 420, m: {t: 40, r: 138, b: 62, l: 40}});
  const {maxV, xs, ys} = trendGeom(svg, m, w, h);
  /* Every third year, which lands on BOTH endpoints: an axis whose last tick is 2023
     while the series ends in 2024 leaves the final point floating past the scale. */
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: YRS.filter((_, i) => i % 3 === 0),
    yt: ticks(0, maxV, 5), xfmt: v => v, yfmt: kfmt,
    xlab: "Year", ylab: "Plastics and rubber jobs"});
  const ends = trendLines(svg, xs, ys, false);
  clevelandGhost(svg, xs, ys, false);
  /* The finding, on the chart: the biggest disclosed metro slid, Akron's line did not.
     Both captions sit BELOW their own line, in the gap to the next series, and both are
     plated because a caption over a point cloud has to win. */
  plated(svg, `Los Angeles: ${N(laDrop)} jobs gone since ${YRS[0]}, down ${laPct.toFixed(1)}%`,
    xs(YRS[5]), ys(emp(tLA, YRS[5])) + 24, {cls: "pv-lab", fill: INK});
  plated(svg, `Akron never moves more than ${N(akSwing)} jobs from its ${YRS[0]} level`,
    xs(YRS[1]), ys(akBase) + 24, {cls: "pv-lab", fill: CAT[1]});
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;
  ends.forEach(e => txt(svg, `${shortName(e.t.name)} · ${short(last(e.t))}`,
    {x: m.l + w + 12, y: e.y + 4, class: "pv-lab",
     fill: e.t.area === AKRON ? CAT[1] : INK}));
}

function trendMobile() {
  const m = {t: 34, r: 14, b: 66, l: 38}, W = 375, H = 380;
  const {svg} = PV.chart("trend", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const {maxV, xs, ys} = trendGeom(svg, m, w, h);
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: [YRS[0], YRS[Math.floor(YRS.length / 2)],
    YRS.at(-1)], yt: ticks(0, maxV, 4), xfmt: v => v, yfmt: kfmt, xlab: "", ylab: ""});
  trendLines(svg, xs, ys, true);
  clevelandGhost(svg, xs, ys, true);
  const p = peers.find(x => x.area === picked);
  if (p) plated(svg, `${shortName(p.name)} · ${short(last(p))}`, m.l + w - 2,
    ys(last(p)) - 8, {cls: "pv-lab", fs: 7.8, anchor: "end", fill: INK});
  plated(svg, `Akron · ${short(last(tAkron))}`, m.l + w - 2, ys(last(tAkron)) + 18,
    {cls: "pv-lab", fs: 7.8, anchor: "end", fill: CAT[1]});
  plated(svg, `Los Angeles down ${laPct.toFixed(1)}% since ${YRS[0]}`, m.l + 4,
    ys(emp(tLA, YRS[5])) + 34, {cls: "pv-lab", fs: 7.6, fill: INK});
  txt(svg, "plastics and rubber jobs", {x: m.l, y: H - 24, class: "pv-labq"});
  txt(svg, `${YRS[0]}–${YRS.at(-1)}, disclosed metros only`,
    {x: m.l, y: H - 6, class: "pv-labq"});
}

{
  const picker = document.getElementById("picker");
  picker.innerHTML = peers.map(p =>
    `<button class="pick" type="button" data-a="${p.area}" aria-pressed="${p.area === picked}">
       ${shortName(p.name)}</button>`).join("");
  picker.querySelectorAll(".pick").forEach(b => b.addEventListener("click", () => {
    picked = b.dataset.a;
    picker.querySelectorAll(".pick").forEach(x =>
      x.setAttribute("aria-pressed", String(x.dataset.a === picked)));
    drawTrend(); trendTable();
  }));
}

function trendTable() {
  const p = peers.find(x => x.area === picked);
  document.getElementById("trendtable").innerHTML = withNote(tableView("t",
    `Employment over time: Akron and ${p ? shortName(p.name) : "peers"}`,
    ["Year", "Akron", p ? shortName(p.name) : "—"],
    YRS.map(y => [y, emp(tAkron, y) ? N(emp(tAkron, y)) : "withheld",
      p && emp(p, y) ? N(emp(p, y)) : "withheld"])),
    `${TR.length} metros qualify for this extract. ${gappy} of them miss a year or two,
     where that metro&rsquo;s cell was withheld, and the chart connects the line across the
     gap rather than breaking it.`);
}

/* ------------------------------------------------- copy that reads from the data */
document.getElementById("statefig").textContent =
  `Ohio leads ${shortName(S.top[1].name)} by ${N(stateLead)} jobs`;
/* The second figure on each label is the page's first CHART use of the × unit, so the
   how-to-read line spends its ink on what the number means rather than on how it is
   computed. The arithmetic is in the methodology. */
document.getElementById("statefigsub").textContent =
  `The 20 largest of the ${S.of_disclosed} disclosed state geographies, plastics and rubber ` +
  `products, ${D.cross_year}. Bars are jobs. The second figure says how much of that ` +
  `state’s job base the industry fills next to the country’s: Ohio’s ` +
  `${S.subject_lq.toFixed(2)}× is more than double.`;
document.getElementById("statesrc").innerHTML =
  `${D.meta.source}, ${D.cross_year}, private ownership. All ${S.of_disclosed} state
   geographies are disclosed and none are suppressed, so this is the only complete ranking
   on the page. The chart draws the top 20; the table below lists the top ${S.top.length}.`;
document.getElementById("statestable").innerHTML = withNote(tableView("s",
  `Plastics and rubber products employment, top ${S.top.length} of ${S.of_disclosed} disclosed states, ${D.cross_year}`,
  /* The column head carries the anchor, so a reader scanning the table alone still knows
     which side of 1.0× is which. */
  ["Rank", "State", "Jobs", "Establishments", "Concentration (1.0× = US average)"],
  S.top.map((r, i) => [i + 1, r.name, N(r.emp), N(r.estabs),
    r.lq ? r.lq.toFixed(2) + "×" : "—"])),
  /* Stated as a percentage, not a second ratio: the page already spends "×" on
     concentration, and one glyph carrying two meanings is how a table goes unread. */
  `The 20 states drawn hold ${pctf(top20Share, 1)} of all state-level jobs. Ohio&rsquo;s
   ${N(S.subject_emp)} are ${pctf(S.subject_emp / S.top[1].emp - 1, 1)} more than
   second-place ${shortName(S.top[1].name)}.`);

document.getElementById("metrotitle").textContent =
  `Akron and Cleveland among the ${M.of_disclosed} metros we can see, ${D.cross_year}`;
document.getElementById("metrofig").textContent =
  `${quad.length} of ${M.of_disclosed} disclosed metros are both large and concentrated, ` +
  `and Akron is one`;
document.getElementById("metrofigsub").textContent =
  `Each dot is one metro area, ${D.cross_year}. The further RIGHT, the more plastics and ` +
  `rubber jobs it has. The further UP, the bigger a slice of its job base those jobs are ` +
  `next to the country’s. The shaded corner clears ${N(JOBCUT)} jobs and 2.0×.`;
document.getElementById("scattertable").innerHTML = withNote(tableView("m",
  `Metro plastics and rubber, ${D.cross_year}: top ${M.top.length} disclosed by employment`,
  ["Rank", "Metro", "Jobs", "Establishments", "Concentration (1.0× = US average)"],
  M.top.map((r, i) => [i + 1, r.name, N(r.emp), N(r.estabs),
    r.lq ? r.lq.toFixed(2) + "×" : "—"])),
  `The two thresholds that cut the corner, ${N(JOBCUT)} jobs and twice the national share of
   jobs, are round numbers picked to name it rather than the output of a test: ${bigN}
   disclosed metros clear the first, ${conN} clear the second, ${quad.length} clear both. The
   columns here let you re-cut them.`);
document.getElementById("scatsrc").innerHTML =
  `${D.meta.source}, ${D.cross_year}, private ownership. ${M.of_disclosed} of
   ${M.of_disclosed + M.suppressed} metro areas are disclosed; the other ${M.suppressed}
   are withheld and appear nowhere on this chart, which is what the hatching says.`;
document.getElementById("bound").innerHTML =
  `<b>Why this page says &ldquo;${ord(M.rank_emp)} of ${M.of_disclosed} disclosed&rdquo; and not
   &ldquo;${ord(M.rank_emp)} nationally&rdquo;.</b>
   ${M.suppressed} metros withhold their employment, including
   ${M.could_displace.slice(0, 4).map(x => shortName(x.name)).join(", ")}, and BLS will not
   say how many jobs any of them has. Establishment counts cannot stand in: a withheld metro
   with forty large plants beats Akron on jobs while running fewer sites. The defensible
   worst case is ${ord(M.rank_emp)} of ${M.of_disclosed + M.suppressed}, which says nothing,
   so the claim stays narrow at ${ord(M.rank_emp)} among those that disclose.`;

document.getElementById("vislede").innerHTML =
  `The bureau suppresses any cell that could identify an employer. For plastics and rubber
   that removes ${M.suppressed} of ${M.of_disclosed + M.suppressed} metro areas and
   ${N(V.county.suppressed)} of ${N(V.county.disclosed + V.county.suppressed)} county areas,
   including some of the largest. The ${V.metro.disclosed} metros still visible hold
   ${N(V.metro.disclosed_emp)} jobs, <b>${pctf(metroShare, 1)} of the
   ${N(V.state.disclosed_emp)}</b> the states add up to. The rest sits in withheld cells and
   outside metro areas altogether.`;
document.getElementById("visfigsub").textContent =
  `Areas disclosed and areas withheld, by geography level, NAICS 326, ${D.cross_year}. ` +
  `Solid is disclosed; hatching is withheld. Each bar is the share of areas at that ` +
  `level, not a share of jobs.`;
document.getElementById("vissrc").innerHTML =
  `${D.meta.source}, ${D.cross_year}. The withheld areas are not empty:
   ${N(V.metro.suppressed_estabs)} establishments sit in withheld metro cells and
   ${N(V.county.suppressed_estabs)} in withheld county cells, so a withheld cell is never
   a zero.`;
document.getElementById("vistable").innerHTML = tableView("v",
  `Disclosure by geography level, NAICS 326, ${D.cross_year}`,
  ["Level", "Disclosed", "Withheld", "Share visible", "Establishments withheld"],
  VKEYS.map(k => { const v = V[k], t = v.disclosed + v.suppressed;
    return [VLAB[k], N(v.disclosed), N(v.suppressed), pctf(v.disclosed, t),
            N(v.suppressed_estabs)]; }));

document.getElementById("trendtitle").textContent =
  `Akron against the biggest disclosed metros, ${YRS[0]}–${YRS.at(-1)}`;
document.getElementById("trendlede").innerHTML =
  `Los Angeles is the largest metro the bureau discloses, and it has shed
   <b>${N(laDrop)} plastics and rubber jobs since ${YRS[0]}</b>, a ${laPct.toFixed(1)}%
   fall. Akron&rsquo;s line barely moves: every year of the decade sits within
   <b>${N(akSwing)} jobs</b> of where it started, and ${YRS.at(-1)} is the lowest of them at
   ${N(last(tAkron))}. Over the same years ${grew} of the ${TR.length} metros in this
   extract gained jobs, so the slide belongs to Los Angeles rather than to the
   industry.`;
document.getElementById("trendfig").textContent =
  `Los Angeles gave up ${N(laDrop)} jobs. Akron stayed within ${N(akSwing)} of where it started.`;
document.getElementById("trendsrc").innerHTML =
  `${D.meta.source}, ${YRS[0]}&ndash;${YRS.at(-1)}, NAICS 326. The extract keeps metros in the
   top 30 by ${D.cross_year} jobs with at least eight disclosed years. Cleveland,
   ${ord(cleRank)} by ${D.cross_year} jobs, misses that bar and appears as a ghosted
   ${D.cross_year} point.`;

document.getElementById("closersub").innerHTML =
  `Ohio&rsquo;s first place is complete and quotable in <b>NAICS 326, private ownership,
   ${D.cross_year}</b>, and that clause travels with it. The metro sentence is smaller and
   still worth saying: <b>Cleveland ${ord(cleRank)} and Akron ${ord(M.rank_emp)} among the
   ${M.of_disclosed} metros that disclose</b>, with ${M.suppressed} withheld and unranked.
   Said that way, it holds.`;

/* --------------------------------------------------------------------- assemble */
function drawAll() { drawStates(); drawScatter(); drawVis(); drawTrend(); }
drawAll();
trendTable();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* Footprint banner, cut to one line. The first thing a reader met on this page used to be
   130px of apparatus naming a rival county definition by its internal label; the footprint
   still has to be stated at the top, but its detail belongs in the methods. */
PV.footprintBanner({...FP, note: "", differs: ""},
  "County list and how it compares with wider regional definitions: see the methodology.");

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js.
   The meta strings are re-set in reader words on the way in: the committed file writes
   them as a data dictionary, with column names in backticks, and backticks rendered as
   literal characters in the published methods. */
await PV.methodology({
  page: "peers",
  meta: {...D.meta,
    suppression: "BLS marks a cell as not disclosed when publishing it could identify an " +
      "employer. Employment is withheld far more often than establishment counts, so a " +
      "ranking built on employment alone systematically omits the largest metros. Any rank " +
      "stated from this file is a rank among disclosed areas and has to say so.",
    row: "one (year, area, NAICS) annual-average cell, private ownership. The employment " +
      "column counts jobs covered by unemployment insurance, so a row counts jobs rather " +
      "than people or companies.",
    derived_note: "Every rank on this page is a rank among disclosed areas. The build also " +
      "counts the withheld metros that run more establishments than the subject, because " +
      "that count would have to be zero for a plain national rank to be honest."},
  definitions:
    `Concentration is the QCEW location quotient: the industry&rsquo;s share of an area&rsquo;s
     private jobs divided by its share of private jobs nationwide. The metro scatter plots
     jobs on a square-root scale, so the crowd of small metros can separate.
     The PIC-12 footprint is ${FP.counties.join(", ")}. Other regional work uses a wider
     fourteen-county definition that adds Crawford, Huron, Richland and Tuscarawas; figures
     built on the two never reconcile, and every county on this page is PIC-12.
     An earlier version of this page bounded Akron&rsquo;s metro rank at ${ord(M.rank_emp)}
     to ${ord(M.rank_emp + M.could_displace_n)} by counting the ${M.could_displace_n} withheld
     metros that run more establishments than Akron&rsquo;s ${N(M.subject_estabs)}. Two
     reviews rejected that bound, correctly: establishment counts do not bound employment,
     so the page states the rank among the ${M.of_disclosed} metros that disclose and
     nothing wider.`});
})();
