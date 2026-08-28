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
const {el, txt, ticks, frame, hoverable, tableView, SEQ, GRAY, INK} = PV;
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
/* HOW BIG IS ANY OF THIS. A ratio with no magnitude beside it is the defect this page
   spends a whole section levelling at other people's numbers, and it committed the same
   one at the regional level: eleven "×" figures and no denominator a reader could feel.
   Regional employment is the LQ's own denominator, summed once per county (local_total is
   constant across a county-year's rows), and the cluster is the three CORE codes — the
   two DETAIL codes are slices of 326 and adding them would count the same jobs twice. */
const regionJobs = CNTY.reduce((s, a) =>
  s + (D.cells.find(c => c.year === LATEST && c.area === a.code)?.local_total || 0), 0);
const CORE = D.naics.filter(n => n.register === "core").map(n => n.code);
const clusterJobs = CORE.reduce((s, n) => s + comp(n, LATEST).emp, 0);
const regionM = (regionJobs / 1e6).toFixed(2);              // "1.70"
const oneIn = n => Math.round(regionJobs / n / 10) * 10;    // rounded, so the division reads
const paintShareOfCluster = Math.round(paint.emp / clusterJobs * 100);
/* Paint outside the one county the section is about, so "76%" has its complement printed
   next to it rather than left as an exercise. */
const paintElsewhere = paint.emp - cuyPaint.emp;
const paintOtherCounties = paintCounties.length - 1;
/* The industries that are THINNER here than nationally. Three dots sit visibly below the
   scatter's reference line and the page never said what they were. */
const below1 = pts.filter(p => p.lq < 1);
const below1Cuy = below1.filter(p => p.name === "Cuyahoga");
/* Number words for counts a sentence has to speak. Digits below ten read as data in a
   line of prose, and these are prose. */
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight",
               "nine", "ten", "eleven", "twelve"];
const word = n => WORDS[n] || N(n);
const Cap = s => s[0].toUpperCase() + s.slice(1);

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
/* WHAT THE CARD IS FOR CHANGED. Card 1 now spends its sub-line on the READING rather than
   on a rank the headline already gave: a naive reader could state what 5.96× measures and
   could not say whether to be pleased about it, which is the only question a chamber board
   actually has. Card 3 was "11 of 11 years paint has led" — true, and said in the dek, in
   the H2 below it and in the trend annotation, so it was the page's most duplicated
   apparatus. It is now the magnitude the page had nowhere: the cluster against regional
   employment, so every "×" downstream has something to stand on. Card 4 drops the word
   "disclosed", which did its first work here four screens before the page explained that
   the bureau hides small counts. */
PV.figures([
  ["key", fx(paint.lq), "paint & coatings",
   `strongest of the six, ${LATEST}. More coatings work per job here than the country has.`],
  ["", fx(rubber.lq), "rubber products", "the industry Akron is named for"],
  ["", N(clusterJobs), "polymer cluster jobs",
   `of ${regionM} million in the region, about one job in ${oneIn(clusterJobs)}`],
  ["", Math.round(cuyShare * 100) + "%", "paint jobs in Cuyahoga",
   `${N(cuyPaint.emp)} of the ${N(paint.emp)} paint jobs the bureau publishes`]
]);

/* The byline. Every element of it is read from the data rather than typed, so the month
   cannot drift from the vintage it describes (claim lq-byline). */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
                "September", "October", "November", "December"];
const [fy, fm] = D.meta.fetched.split("-");
const AGENCY = D.meta.source.split(/[ ,]+/).slice(0, 2).join(" ");   // "BLS QCEW"
document.getElementById("byline").innerHTML =
  /* One person holds both roles, so the roles collapse rather than printing the name
     twice (page-design.md, byline anatomy). */
  `By the Polymer Industry Cluster desk &middot; Analysis and graphics by Claude (Anthropic), directed and reviewed by <b>John Swanson</b> &middot; Data
   ${AGENCY}, ${FIRST}&ndash;${LATEST} &middot; ${MONTHS[+fm - 1]} ${fy}`;

/* --------------------------------------------------- the register, in the open */
/* "CONTEXT SITS OUTSIDE THE REGISTER" was the page's worst sentence: three capitalised
   terms in three sentences, one of them ("the register") a piece of internal vocabulary
   defined nowhere on the page, and no example of any of them. A naive reader read it three
   times and moved on without it. The internal word is gone, and each label now arrives
   with the one case that shows why it exists. */
document.getElementById("regkey").innerHTML =
  `<b>Core</b> is what this page counts as the cluster: resin, paint, and plastics and
   rubber products. <b>Detail</b> is a slice of one of those three and is never added to
   it. Rubber products sits inside plastics and rubber products, so counting both would
   count the same jobs twice. <b>Context</b> sits outside the cluster and is drawn only for
   comparison. Chemical manufacturing is here for that reason: it also carries
   pharmaceuticals, farm chemicals and industrial gas, which are not this cluster.`;

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
    /* No "YEAR" axis title. The tick row already reads 2015 … 2025; a caps label under it
       is ink that tells the reader something the numbers said first.
       The y axis is a constructed unit, so its title carries the READING and not the
       arithmetic: the formula lives in the methodology box, where a reader who wants it
       goes looking. */
    xlab: "", ylab: "↑ more concentrated here than in the country"});

  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  /* The reference line is labelled by what CROSSING it means, not by its value alone. */
  txt(svg, "1.0× · above it, more concentrated here", {x: m.l + 8, y: ys(1) - 8,
    class: "pv-lab", fill: "var(--hover)"});

  /* Right-hand direct labels, nudged apart, with a leader where one had to move.
     TWO LINES NOW, not one. Five of the six series are drawn in the same pale grey, so a
     reader could read their 2025 endpoints and could not trace whether any of them had
     risen or fallen across eleven years — and "is rubber up or down?" is the first
     question anyone in this region asks. Printing each line's 2015 reading under its 2025
     one answers it without adding a hue the page would then have to explain. The minimum
     gap doubles to carry the second line. */
  const ends = NAICS.map(code => {
    const s = seriesOf(code);
    return s.length ? {code, s, y: ys(s.at(-1).lq)} : null;
  }).filter(Boolean).sort((a, b) => a.y - b.y);
  /* Two passes, not one. A push-down-only nudge with the taller gap ran the last label's
     second line straight through the "2025" tick — the collision gate caught it. The
     second pass pulls the stack back up off the floor, which is free here because the
     subject line sits alone at the top of an empty half. FLOOR leaves room for the second
     line of the lowest label. */
  const MIN = 33, FLOOR = m.t + h - 22;
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < MIN) ends[i].y = ends[i - 1].y + MIN;
  if (ends.at(-1).y > FLOOR) {
    ends.at(-1).y = FLOOR;
    for (let i = ends.length - 2; i >= 0; i--)
      if (ends[i + 1].y - ends[i].y < MIN) ends[i].y = ends[i + 1].y - MIN;
  }

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
    txt(svg, `from ${fx(s[0].lq)} in ${FIRST}`,
      {x: m.l + w + 12, y: e.y + 15, class: "pv-labq", fill: "var(--pv-muted)"});
    if (on) s.forEach(c => hoverable(
      el("circle", {cx: xs(c.year), cy: ys(c.lq), r: 5, fill: INK,
        stroke: "var(--paper)", "stroke-width": 2}, svg),
      `<b>${c.label}, ${c.year}</b><br><span class="v">${fx(c.lq)}</span> the national share
       <br><span class="v">${N(c.emp)}</span> jobs across ${N(c.estabs)} separate sites
       ${c.counties_suppressed ? `<br>${c.counties_suppressed} of ${FP.n} counties withheld` : ""}`,
      `${c.label} ${c.year}: ${fx(c.lq)}`));
  });

  /* The paint annotation, drawn last so nothing paints over it. It is the section's
     claim and stays on the chart whichever industry the reader brings forward. */
  const col = picked === "3255" ? INK : "var(--pv-muted)";
  const mid = paintSeries.find(c => c.year === 2019) || paintSeries[4];
  const s1 = `Paint has led all six industries in every one of ${leadYears.length} years,`;
  /* "2.1× the next-highest" is a ratio OF ratios, and beside a chart whose every other
     number is "× the national share" it reads as one. Say which comparison it is. */
  const s2 = `always at least ${leadRatio.toFixed(1)} times the second industry.`;
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
  txt(svg, `and has every year since ${FIRST}.`, {x: m.l - 2, y: 50, class: "pv-lab"});
  txt(svg, `Higher means more concentrated here.`, {x: m.l - 2, y: 70, class: "pv-labq"});

  /* Plated, and labelled by what crossing it means — the phone build printed a bare
     "1.0× national share" straight onto the rule it names, which both blurred the glyphs
     and gave the value without the direction. */
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.3}, svg);
  plated(svg, "1.0× · above it, more concentrated", m.l + 3, ys(1) - 6, "pv-labq",
    "var(--hover)", 7.0);

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
  /* Register status is stated only where it changes how the line should be READ — a
     context or detail code. For a core code the chip on the button and the key above the
     picker have already said it, and repeating it here spends the figure's whole caveat
     budget on a definition. Reader words throughout: the internal name for this list does
     not appear on the page, only what it does. */
  const regLine = reg === "detail"
    ? `${last.label} is a slice of plastics and rubber products and is never added to it. `
    : reg === "context"
    ? `${last.label} sits outside the cluster this page measures: it also carries
       pharmaceuticals, farm chemicals and industrial gas, so read it as comparison. `
    : "";

  document.getElementById("trendtitle").textContent =
    `Paint runs ${fx(paint.lq)} the national share, more than double the ${fx(runnerUp.lq)} ` +
    `of ${runnerUp.label.split(",")[0].toLowerCase()}`;

  /* CAVEAT BUDGET: one source line plus one limitation sentence, ~30 words in the default
     state. What used to sit here — how a row is defined, what employment covers, that the
     composite is ours and not the bureau's — is all in the generated methodology box,
     which reads it from the same meta. Saying it twice made a third of the mid-scroll
     read as disclaimer. */
  /* WITHHELD IS DEFINED HERE, because this is where it first does work in prose. The word
     was carrying a whole disclosure regime four screens before the page explained it, and
     one reader read it as "confirmed" and took 4,259 for the region's entire paint
     workforce. Translation is exempt from the caveat budget; the budget pays for it by
     having lost the row definition and the ownership note to the methodology box. */
  document.getElementById("trendsrc").innerHTML =
    `Source: BLS QCEW annual averages, ${FIRST}&ndash;${LATEST}. ` + regLine +
    (supp
      ? `${Cap(word(supp))} of ${FP.words} counties are withheld for
         ${last.label.toLowerCase()} in ${LATEST}, meaning the bureau will not publish a
         county with too few employers in it to keep them anonymous, so this line reads the
         counties that report and not the whole region.`
      : `All ${FP.words} counties are disclosed for this industry in ${LATEST}.`);

  document.getElementById("trendtable").innerHTML = tableView("t",
    `Concentration against the national share, by year · ${sel[0].label}`,
    ["Year", "× the national share", "Jobs", "Separate sites", "Counties withheld"],
    sel.map(c => [c.year, fx(c.lq), N(c.emp), N(c.estabs), c.counties_suppressed]));
}

/* ------------------------------------------------ 2. the disclosure twist */
/* ONE HUE, ONE JOB, HELD FOR THE WHOLE SCROLL. Paint used to be teal in chart 1 and
   orange in charts 2 and 4, while teal became the CONTEXT colour in the scatter — the
   subject changed colour mid-page and the colour changed meaning under it. PAINT is the
   page's ink teal everywhere, context is warm grey everywhere, and the plum is reserved
   for annotation. The pair also separates by luminance (0.11 against 0.48), so the
   distinction survives a greyscale print, which the teal-against-orange pairing did not. */
const SUBJECT = INK, CONTEXT = GRAY;
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
    ylab: "↑ more concentrated here than in the country"});
  el("path", {d: "M" + paintSeries.map(p => `${xs(p.year)},${ys(p.lq)}`).join("L"),
    fill: "none", stroke: GRAY, "stroke-width": 2}, svg);
  el("path", {d: "M" + fixed.map(p => `${xs(p.year)},${ys(p.lq)}`).join("L"),
    fill: "none", stroke: SUBJECT, "stroke-width": 3}, svg);
  fixed.forEach(p => hoverable(
    el("circle", {cx: xs(p.year), cy: ys(p.lq), r: 4.5, fill: SUBJECT,
      stroke: "var(--paper)", "stroke-width": 2}, svg),
    `<b>${p.year}, the same five counties</b><br><span class="v">${fx(p.lq)}</span>
     the national share<br><span class="v">${N(p.emp)}</span> paint jobs`,
    `${p.year}, fixed five counties: ${fx(p.lq)}`));
  txt(svg, `${fx(fixedNow.lq)} same five`, {x: m.l + w + 10, y: ys(fixedNow.lq) + 4,
    class: "pv-lab", fill: SUBJECT});
  txt(svg, "counties", {x: m.l + w + 10, y: ys(fixedNow.lq) + 21,
    class: "pv-labq", fill: SUBJECT});
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
    ys(fixedThen.lq) - 12, "pv-labq", SUBJECT, 6.9);
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
  txt(svg, "Higher means more concentrated here.", {x: m.l - 2, y: 68, class: "pv-labq"});
  el("path", {d: "M" + paintSeries.map(p => `${xs(p.year)},${ys(p.lq)}`).join("L"),
    fill: "none", stroke: GRAY, "stroke-width": 2}, svg);
  el("path", {d: "M" + fixed.map(p => `${xs(p.year)},${ys(p.lq)}`).join("L"),
    fill: "none", stroke: SUBJECT, "stroke-width": 3}, svg);
  fixed.forEach(p => hoverable(
    el("circle", {cx: xs(p.year), cy: ys(p.lq), r: 4, fill: SUBJECT,
      stroke: "var(--paper)", "stroke-width": 1.5}, svg),
    `<b>${p.year}, the same five counties</b><br><span class="v">${fx(p.lq)}</span>
     the national share<br><span class="v">${N(p.emp)}</span> paint jobs`,
    `${p.year}, fixed five counties: ${fx(p.lq)}`));
  plated(svg, `${fx(fixedNow.lq)} same five`, m.l + w - 2, ys(fixedNow.lq) - 9,
    "pv-lab", SUBJECT, 7.6, "end");
  plated(svg, `${fx(paint.lq)} all disclosed`, m.l + w - 2, ys(paint.lq) + 22,
    "pv-labq", "var(--pv-muted)", 7.2, "end");
  plated(svg, `${drop.name} withheld in ${LATEST}`, m.l + 2, m.t + 16, "pv-labq",
    "var(--hover)", 7.2);
}

function twistCopy() {
  const prev = comp("3255", LATEST - 1);
  document.getElementById("twistlede").innerHTML =
    /* ONE SENTENCE PER MOVE. This used to run "Restricted to the 5 counties the bureau
       discloses in all 11 years, paint reads 7.68× in 2025 against 7.14× in 2015, the
       highest value in the series" — two numbers, two baselines and a qualifier in one
       breath, and "the series" could mean either line on the chart. Split, and the
       ambiguous phrase replaced by the thing it meant. The level gap between the two lines
       is now accounted for too: a reader who is not told why 7.68× and 5.96× differ will
       assume one of them is wrong. */
    `The line above adds up whichever counties the bureau discloses that year, and the set
     moves. ${drop.name}, ${fx(drop.lq)} on ${N(drop.emp)} paint jobs in
     ${LATEST - 1}, went withheld in ${LATEST}, which is most of the fall from
     ${fx(prev.lq)} to ${fx(paint.lq)}. So hold the counties still.
     ${Cap(word(alwaysOn.length))} of the ${FP.words} are disclosed for paint in every one
     of the ${YEARS.length} years, and across those ${word(alwaysOn.length)} paint reads
     ${fx(fixedNow.lq)} in ${LATEST}, up from ${fx(fixedThen.lq)} in ${FIRST} and higher
     than in any year between. The teal line sits above the grey one because it counts
     ${word(alwaysOn.length)} counties and the grey counts
     ${word(paintCounties.length)}, not because it measures anything different.
     Concentration here is not eroding, and on a county set that never moves it is
     climbing.`;
  document.getElementById("twisttitle").textContent =
    `Holding the same five counties, paint climbs from ${fx(fixedThen.lq)} to ${fx(fixedNow.lq)}`;
  /* Source line plus one limitation, ~32 words. The recovery arithmetic and the entrant
     county are real and checkable, and they are the kind of detail a reader opens on
     purpose: they sit in the disclosure below, not in the caption. */
  document.getElementById("twistsrc").innerHTML =
    `Source: BLS QCEW annual averages, ${FIRST}&ndash;${LATEST}, county by county. The five
     held still are ${alwaysOn.map(a => a.name).join(", ")}, a subset of ${FP.label} chosen
     because the bureau discloses paint there in every year, and not a second footprint.`;
  document.getElementById("fixednote").innerHTML =
    `<b>Derived from the same county figures as the chart above, not from a second file.</b> The
     national paint share each year is recovered from any disclosed county
     (share = jobs ÷ county total ÷ that county&rsquo;s published location quotient), and
     all disclosed counties agree on it to seven figures, which is the check that this
     inversion is the bureau&rsquo;s own arithmetic rather than a reconstruction. The
     fixed-base line is then the summed jobs of the ${word(alwaysOn.length)} always
     disclosed counties over their summed county totals, divided by that share.
     ${entrants.length
       ? `${entrants.map(a => a.name).join(" and ")} entered the disclosed set in ${LATEST}
          and ${entrants.length > 1 ? "are" : "is"} in the grey line, not the teal one.`
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
/* WHAT THE DARKEST SHADE ACTUALLY CONTAINS. This page shipped "Cuyahoga paint is the
   darkest cell in the grid" in three places while the binned ramp drew SIX cells in the
   identical darkest colour, one of them at twice the value — a claim any reader could
   refute by looking two rows up, on a page whose whole offer is that you can re-run it.
   The bin is computed here rather than described, and every sentence about it is written
   off this array, so the prose cannot drift from the encoding again. */
const topBand = pts.filter(p => p.lq >= STEPS.at(-1)).sort((a, b) => b.emp - a.emp);
const topOthers = topBand.filter(p => p !== cuyPaint);
/* SORTING IS EDITORIAL AND THIS SORT WAS ARGUING AGAINST THE PAGE. Rows used to be ordered
   by the plastics-and-rubber column, on the reasonable ground that it is the one industry
   disclosed in all twelve counties — which put Cuyahoga, the county this whole section is
   about and the only outlined cell, in the LAST row, where a reader scans it as the least
   of the twelve. Paint is the sort key now. Counties whose paint cell is withheld have no
   key, so they sit beneath the disclosed ones in the old order, and the caption states
   both halves of the rule. */
const heatRows = () => {
  const key = a => cell(a.name, "3255", LATEST)?.lq;
  const rows = CNTY.map(a => ({...a}));
  rows.sort((a, b) => {
    const ka = key(a), kb = key(b);
    if (ka != null && kb != null) return kb - ka;
    if (ka != null) return -1;
    if (kb != null) return 1;
    return (cell(b.name, "326", LATEST)?.lq || 0) - (cell(a.name, "326", LATEST)?.lq || 0);
  });
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
    /* Top margin 126, not 112: the two-line bracket caption needs the extra 14 units, and
       a caption that runs off the top of the viewBox is the same defect as one that
       overhangs its bracket. */
    {W: 1100, rows: rows.length, rowH: 34, m: {t: 126, r: 246, b: 78, l: 104}});
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
  /* Two lines, not one. Set on a single line the caption ran 25 units wider than the
     bracket it belongs to and overhung the parent column it exists to exclude. */
  ["already counted inside", "the column at left"].forEach((s, i) =>
    txt(svg, s, {x: m.l + (pi + 2) * cw, y: m.t - 104 + i * 17, "text-anchor": "middle",
      class: "pv-labq"}));

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
      /* The × goes IN the cell. Every other number on the page carries it, and a reader
         who lands on the grid first has no way to tell whether a bare 22.7 is a multiple,
         a percentage or a job count in hundreds. */
      if (ok) txt(svg, cl.lq.toFixed(1) + "×", {x: x + cw / 2 - 1, y: y + ch / 2 + 5,
        "text-anchor": "middle", class: "pv-lab",
        fill: cl.lq >= 11 ? "#fff" : "var(--pv-ink)"});
      hoverable(el("rect", {x, y, width: cw - 2, height: ch - 2, fill: "transparent"}, svg),
        ok ? `<b>${a.name} County · ${cl.label}</b><br><span class="v">${fx(cl.lq)}</span>
              on <span class="v">${N(cl.emp)}</span> jobs across
              <span class="v">${N(cl.estabs)}</span> separate sites`
           : `<b>${a.name} County · ${D.naics[c].label}</b><br>withheld by BLS for disclosure,
              which is not a zero`,
        ok ? `${a.name}, ${cl.label}: ${fx(cl.lq)}` : `${a.name}: withheld`);
    });
  });

  /* The story cell, named — and named for what it IS. It is not the darkest cell; five
     others share its shade and four of them are higher. What is true, and what the
     callout says, is that it is the one carrying real employment. */
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
   [`${Math.round(cuyShare * 100)}% of every paint job`, "pv-labq", null],
   ["the bureau publishes here", "pv-labq", null]]
    .forEach(([s, cls, fill], i) => {
      const a = {x: rail, y: by + ch / 2 - 18 + i * 17, class: cls};
      if (fill) a.fill = fill;
      txt(svg, s, a);
    });

  /* A binned ramp whose key is six number ranges tells a reader nothing about which end
     is which. The direction goes ABOVE the swatches, where it is read first. */
  txt(svg, "paler cells sit near the national share; darker cells run many times it",
    {x: m.l, y: m.t + h + 22, class: "pv-labq"});
  heatLegend(svg, LEGEND, m.l, m.t + h + 34, 104);
  heatCopy(rows);
}

function drawHeatMobile() {
  const rows = heatRows();
  const W = 420, m = {t: 128, r: 10, b: 134, l: 92};
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
      /* The × goes IN the cell. Every other number on the page carries it, and a reader
         who lands on the grid first has no way to tell whether a bare 22.7 is a multiple,
         a percentage or a job count in hundreds. */
      if (ok) txt(svg, cl.lq.toFixed(1) + "×", {x: x + cw / 2 - 1, y: y + ch / 2 + 5,
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
  txt(svg, "darker cells are more concentrated", {x: 6, y: m.t + h + 66,
    class: "pv-labq"});
  heatLegend(svg, LEGEND.slice(0, 4), 6, m.t + h + 76, 100);
  heatLegend(svg, LEGEND.slice(4), 6, m.t + h + 102, 100);
  heatCopy(rows);
}

function heatCopy(rows) {
  const disclosed = pts.length;
  const lo = Math.min(...topOthers.map(p => p.emp)),
        hi = Math.max(...topOthers.map(p => p.emp));
  /* "CELL" IS DEFINED IN ITS OWN FIRST SENTENCE. The figure caption below already carried
     the definition, but the caption sits after this paragraph in reading order, so the
     page was using its most-repeated term of art (667 cells, 51 of 72 cells, the six
     darkest cells) a screen before it said what one is. */
  document.getElementById("heatlede").innerHTML =
    `A cell here is one industry in one county. ${Cap(word(topBand.length))} of them reach
     the darkest shade, and Cuyahoga&rsquo;s ${fx(cuyPaint.lq)} in paint is the
     one with real employment behind it: ${N(cuyPaint.emp)} jobs across
     ${N(cuyPaint.estabs)} separate sites, ${Math.round(cuyShare * 100)}% of every paint job
     the bureau publishes in the region. The other ${word(topOthers.length)} run between
     ${N(lo)} and ${N(hi)} jobs. Paint is also the industry the bureau hides most of:
     ${word(paint.counties_suppressed)} of ${FP.words} counties are withheld, so this column
     shows ${word(paintCounties.length)} readings and not twelve.`;
  /* WHICH HALF OF THE SENTENCE IS THE GOOD HALF. A reader at the Akron end of a
     twelve-county region reads "76% of it is in Cleveland" as bad news; the page presented
     it as an achievement and offered neither reading. Both are printed now, with the
     complement of the 76% beside it so the arithmetic closes. */
  document.getElementById("heatlede2").innerHTML =
    `Three of every four paint jobs sitting in one county reads two ways, and both are
     true. It is the reason the region can claim a coatings cluster at all, and it means
     one county&rsquo;s plant decisions move the regional figure on their own. Outside
     Cuyahoga, the ${word(paintOtherCounties)} other counties in this column hold
     ${N(paintElsewhere)} paint jobs between them.`;
  /* The claim the evidence supports, in the words the encoding uses. The binned ramp puts
     ${topBand.length} cells in one shade; what separates this one is the base under it. */
  document.getElementById("heattitle").textContent =
    `Cuyahoga paint has the most jobs of the ${word(topBand.length)} darkest cells`;
  document.getElementById("heatsrc").innerHTML =
    `Source: BLS QCEW annual averages, ${LATEST} county cells. Hatched cells are withheld
     by the bureau for disclosure and are never drawn as a zero.`;
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
    /* The axis ends ON the largest point, labelled, rather than running past its last
       tick: the biggest base in the file used to float 1,700 jobs beyond a "4,000" tick
       with nothing under it, which is an unlabelled axis extension, not a scale. */
    xt: [0, 100, 500, 1000, 2000, 4000].filter(v => v < maxE).concat(maxE),
    yt: ticks(0, maxL, 6), xfmt: N, yfmt: v => v.toFixed(0) + "×",
    /* Both axes name the reading, not the construction. The square-root scale is
       arithmetic and moves to the source line. */
    xlab: "more jobs in that county and industry →",
    ylab: "↑ more concentrated here than in the country"});
  pts.forEach(p => hoverable(
    el("circle", {cx: xs(p.emp), cy: ys(p.lq), r: 6,
      fill: p.naics === "3255" ? SUBJECT : CONTEXT,
      stroke: "var(--paper)", "stroke-width": 2}, svg),
    `<b>${p.name} County · ${p.label}</b><br><span class="v">${fx(p.lq)}</span>
     the national share<br><span class="v">${N(p.emp)}</span> jobs across
     ${N(p.estabs)} separate sites`,
    `${p.name}, ${p.label}: ${fx(p.lq)} on ${N(p.emp)} jobs`));
  /* ANNOTATION LAST. The reference line and its label used to be drawn before the marks,
     so a context point landed on top of the word "share" and the label shipped reading
     "sh●e" — a paper plate under text is no defence against ink painted after it. Every
     annotation on this chart is now drawn after every mark. */
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  plated(svg, "1.0× · above it, more concentrated here", m.l + 8, ys(1) - 9, "pv-lab",
    "var(--hover)", 7.3);
  /* Words, not codes, and only where a point carries the argument. */
  const label = (p, dx, dy, anchor) =>
    plated(svg, wordLabel(p), xs(p.emp) + dx, ys(p.lq) + dy, "pv-lab",
      p.naics === "3255" ? SUBJECT : "var(--pv-ink)", 7.3, anchor);
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
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys,
    xt: [0, 500, 2000].filter(v => v < maxE).concat(maxE),
    yt: ticks(0, maxL, 4), xfmt: N, yfmt: v => v.toFixed(0) + "×",
    xlab: "more jobs →", ylab: ""});
  txt(svg, "The biggest ratios sit on the", {x: m.l - 2, y: 26, class: "pv-lab"});
  txt(svg, "smallest job counts.", {x: m.l - 2, y: 46, class: "pv-lab"});
  txt(svg, "higher: more concentrated here", {x: m.l - 2, y: 64, class: "pv-labq"});
  pts.forEach(p => hoverable(
    el("circle", {cx: xs(p.emp), cy: ys(p.lq), r: 5,
      fill: p.naics === "3255" ? SUBJECT : CONTEXT,
      stroke: "var(--paper)", "stroke-width": 1.5}, svg),
    `<b>${p.name} County · ${p.label}</b><br><span class="v">${fx(p.lq)}</span> the national
     share<br><span class="v">${N(p.emp)}</span> jobs`,
    `${p.name}, ${p.label}: ${fx(p.lq)} on ${N(p.emp)} jobs`));
  plated(svg, `${topLQ[0].name} ${SHORT[topLQ[0].naics].toLowerCase()}, ${fx(topLQ[0].lq)}`,
    xs(topLQ[0].emp) + 10, ys(topLQ[0].lq) + 5, "pv-labq", "var(--pv-ink)", 7.2);
  plated(svg, `on ${N(topLQ[0].emp)} jobs`, xs(topLQ[0].emp) + 10,
    ys(topLQ[0].lq) + 21, "pv-labq", "var(--pv-muted)", 7.2);
  plated(svg, `${bigAbove10.name} ${SHORT[bigAbove10.naics].toLowerCase()},`,
    xs(bigAbove10.emp) - 10, ys(bigAbove10.lq) - 4, "pv-labq", SUBJECT, 7.2, "end");
  plated(svg, `${fx(bigAbove10.lq)} on ${N(bigAbove10.emp)} jobs`, xs(bigAbove10.emp) - 10,
    ys(bigAbove10.lq) + 12, "pv-labq", SUBJECT, 7.2, "end");
  /* Annotation last here too, for the reason given in the desktop variant. */
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.3}, svg);
  plated(svg, "1.0× · above it, more concentrated", m.l + 3, ys(1) - 6, "pv-labq",
    "var(--hover)", 7.2);
}

function scatterCopy() {
  document.getElementById("scatterlede").innerHTML =
    `Concentration is one share divided by another, so a county with seven plants can post
     a bigger number than a county with forty. Plotted against the jobs behind it, the
     dramatic figures move left where they belong: ${topLQ[0].name} County&rsquo;s
     ${fx(topLQ[0].lq)} in resin is ${N(topLQ[0].emp)} jobs at ${N(topLQ[0].estabs)} sites,
     real and small. Paint is the exception on this chart. ${bigAbove10.name}&rsquo;s
     ${fx(bigAbove10.lq)} rests on ${N(bigAbove10.emp)} jobs, more than any other cell
     above 10&times;. A concentration figure without the job count behind it is half a
     fact, which is why every point here carries both. ${Cap(word(below1.length))} dots sit
     below the 1.0&times; line: those are the county and industry pairs the region holds
     less of, for its size, than the country does, and ${word(below1Cuy.length)} of the
     ${word(below1.length)} are in Cuyahoga.`;
  document.getElementById("scattertitle").textContent =
    `${bigAbove10.name} paint has more jobs behind it than any other cell above 10×`;
  /* The colour mapping stated in the figure, not left to be inferred from one labelled
     point: the scatter is the only chart here where the subject is a whole group. */
  document.getElementById("scatterkey").innerHTML =
    `<span><i style="background:${SUBJECT}"></i>Paint &amp; coatings</span>
     <span><i style="background:${CONTEXT}"></i>Every other industry</span>`;
  /* The square-root scale moved OUT of this line and up into the figure's how-to-read
     caption, next to the sentence that already says what RIGHT means, and it went with a
     reading aid rather than a disclosure. A transform announced in grey type below the
     plot is announced after the reader has already measured horizontal distance and been
     wrong. One statement per reading context, so it is not repeated here. */
  document.getElementById("scattersrc").innerHTML =
    `Source: BLS QCEW annual averages, ${LATEST} county cells. ${pts.length} of ${POSSIBLE}
     possible county and industry combinations are disclosed; the withheld ones are not on
     this plane at all.`;
  document.getElementById("scattertable").innerHTML = tableView("s",
    `Concentration against employment, ${LATEST}`,
    ["County", "Industry", "× the national share", "Jobs", "Separate sites"],
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
  /* A count axis, because bar heights with no scale are a shape and not a quantity: the
     only number on this figure used to be the 667 in its title. Ticks are computed from
     the tallest bin, so nothing here is typed. */
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys,
    yt: ticks(0, maxBin, mobile ? 2 : 3).filter(v => v <= maxBin),
    xt: mobile ? [-0.005, 0, 0.005] : [-0.005, -0.0025, 0, 0.0025, 0.005],
    xfmt: v => v === 0 ? "0" : (v > 0 ? "+" : "−") + Math.abs(v).toFixed(4),
    yfmt: v => N(v),
    /* A deviation axis, so it is labelled by which side is which. */
    xlab: mobile ? "" : "our figure below the bureau’s ←  0  → our figure above",
    ylab: mobile ? "" : "Cells"});
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
  if (mobile) txt(svg, "our figure minus the bureau’s", {x: m.l, y: m.t - 14,
    class: "pv-labq", fill: "var(--pv-muted)"});
}

/* ------------------------------------------------------------- copy, once */
document.getElementById("residlede").innerHTML =
  `BLS publishes its own location quotient to two decimals, and publishes the components
   too. All ${N(D.meta.verification.cells_checked)} cells computed here, each one industry
   in one county in one year, agree with the published figure to within
   ${BOUND.toFixed(3)}, which is half of the last digit the bureau prints. The two are the
   same number as far as the bureau states it.`;
document.getElementById("residtitle").textContent =
  `${N(RS.length)} checked cells, none off the bureau’s figure by more than 0.005`;
document.getElementById("residsrc").innerHTML =
  `Source: the location quotient BLS publishes against the one computed here, all years and
   areas. Cells the bureau withholds carry no published figure and cannot be checked.`;
document.getElementById("residtable").innerHTML = tableView("v",
  "Reproduction check against the bureau&rsquo;s published location quotient",
  ["Measure", "Value"],
  [["Cells checked", N(D.meta.verification.cells_checked)],
   ["Mean absolute error", D.meta.verification.mean_abs_residual.toFixed(6)],
   ["Worst error", D.meta.verification.max_abs_residual.toFixed(6)],
   ["Cells withheld by BLS", N(D.cells.filter(c => c.suppressed).length)]]);
document.getElementById("defnote").innerHTML =
  `<b>Which denominator, and how we know.</b> ${D.meta.definition} The intuitive
   alternative, private employment over private employment, is wrong by 0.19 on average and
   by as much as 1.03, which is the distance between &ldquo;twice the national
   average&rdquo; and &ldquo;three times.&rdquo; This chart is the tripwire: if BLS changes
   its method, or ours drifts, the divergence shows up here before it reaches a funder.
   Team NEO&rsquo;s 2.69&times; is a Lightcast product, one number for one year with no
   decomposition and no way for anyone outside the licence to check it. The components are
   free, which is why this page can rank six industries and eleven years against each
   other and that figure cannot.`;

/* THE CLOSER RESOLVES THE QUESTION, AND THE QUESTION INCLUDED "SO WHAT". A naive reader
   finished this page able to state exactly what 5.96× measures and unable to say whether
   it was the thing to sell or the thing to hedge, which is the only decision the audience
   this page is written for actually faces. The verdict is the author's, so it is written
   as the author's ("we read") and the magnitude it rests on is printed beside it. */
document.getElementById("closersub").innerHTML =
  `Paint and coatings run <b>${fx(paint.lq)}</b> the national share in ${LATEST}, and
   <b>${fx(fixedNow.lq)}</b> across the ${alwaysOn.length} counties disclosed in every year
   since ${FIRST}, against ${fx(rubber.lq)} for the rubber products the region is named for.
   ${Math.round(cuyShare * 100)}% of the published paint jobs sit in one county, and
   ${paint.counties_suppressed} of ${FP.n} counties are withheld, so treat the twelve-county
   figure as a reading on the counties that report and not a census of the region.
   ${N(paint.emp)} paint jobs in a region of ${regionM} million makes this a specialism
   rather than a mainstay, and we read ${fx(paint.lq)} as a claim worth making to a
   coatings firm choosing a site, not as a concentration the region has to hedge against.`;

/* THE DOWNGRADE, RECORDED. An earlier build of this page called Cuyahoga's paint cell the
   darkest in the grid, in the band lede, the figure title and the chart's text
   alternative, while the binned ramp drew six cells in that same shade. A page that asks
   readers to re-run it owes them the walk-back in public, at the size of the original
   claim and not smaller. */
document.getElementById("footcorr").innerHTML =
  `Correction: an earlier version of this page called Cuyahoga&rsquo;s paint cell the
   darkest in the grid. ${Cap(word(topBand.length))}
   cells share that shade and ${word(topOthers.filter(p => p.lq > cuyPaint.lq).length)} of
   them are higher, so the claim is now the one the evidence carries: of the cells in the
   darkest shade, Cuyahoga paint has the most jobs behind it.`;

/* --------------------------------------------------------------------- assemble */
function drawAll() { drawTrend(); drawTwist(); drawHeat(); drawScatter(); drawResid(); }
trendCopy(); twistCopy(); scatterCopy();
drawAll();
/* Only the breakpoint redraws. Every chart is authored in viewBox units, so a plain
   resize needs no re-render — the old page redrew on every resize event and gained
   nothing for it. */
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* Footprint banner — stated on the page, not left to the reader to infer. The stored note
   read "PIC's official 12-county footprint, matching the cluster-health dashboard": PIC
   twice in the first sentence a reader ever meets, expanded only in the footer thousands
   of pixels below, and a cross-reference to a dashboard they have never seen. Expanded
   once, here, and the cross-reference replaced by what it was there to promise. */
PV.footprintBanner({...FP, note: `PIC stands for Polymer Industry Cluster, and these
  ${FP.words} are its official footprint, used on every page here that is built from
  federal files so the figures reconcile with each other.`});

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "location-quotient", meta: D.meta});
})();
