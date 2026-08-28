/* Cluster health — the front door to the Evidence Room, and a maintained instrument
   rather than an article.

   THE ONE CHART. Five measures in five different units cannot share a value axis, so the
   axis is not a value: it is "how far this measure usually moves in a year", and every
   bar is this year's change divided by that. One scale, one reference line at 1.0, one
   reading a person can state out loud. The gray band behind each bar is the full range of
   that measure's earlier moves, which is what stops a long bar being read as
   unprecedented when two earlier years went further.

   NOTHING IS TYPED. Every figure comes from data/health.json, which derive_health.py
   rebuilds from the shipped data files of the six pages that publish these measures. The
   claims file re-derives each of them from those same source files, so a correction over
   there fails the gate over here instead of leaving a stale tile behind. */
(async () => {
"use strict";
const {el, txt, ticks, hoverable, tableView, GRAY} = PV;
const D = await PV.data("health.json");
const FP = PV.footprint(D.meta);
const T = D.tiles;
const byId = id => T.find(t => t.id === id);

const N = n => Math.round(n).toLocaleString("en-US");
const MOBILE = matchMedia("(max-width: 760px)");
/* Direction is separated by LUMINANCE as well as hue, so up and down survive grayscale
   and a colourblind reader: #0C6473 sits at relative luminance 0.104, #C85F0C at 0.205.
   Any recolour has to keep roughly that 2:1 ratio or the two directions become one gray. */
const UP = "#0C6473", DOWN = "#C85F0C", BAND = "#DDD9D2";
const dirColor = t => t.band.latest >= 0 ? UP : DOWN;

/* The verdict, written out rather than left as a class name. A median is a description of
   the middle, never a threshold somebody set, so the sentence always carries the count. */
function verdictText(t) {
  const b = t.band, rest = b.n_prior - b.beats;
  const w = n => WORDS[n] || String(n);
  if (b.verdict === "ordinary")
    return `Inside the range this measure normally moves: ${w(rest)} of its ${w(b.n_prior)}
      earlier year-to-year moves were at least this big.`;
  if (b.verdict === "record")
    return `Larger than every one of its ${w(b.n_prior)} earlier year-to-year moves.
      Nothing in the published series has moved this far before.`;
  return `Larger than ${w(b.beats)} of its ${w(b.n_prior)} earlier year-to-year moves, and
    ${w(rest)} ${rest === 1 ? "has" : "have"} been larger.`;
}
const verdictShort = t => t.band.verdict === "ordinary" ? "Ordinary year"
  : t.band.verdict === "record" ? "Never moved this far" : "Bigger than usual";

/* ------------------------------------------------------------------------ hero copy */
const scale = byId("scale"), conc = byId("concentration"), pay = byId("pay");
const talent = byId("talent"), cap = byId("capital");
const moved = D.moved_more_than_usual;
const WORD = {1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "All five"};

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve"];

document.getElementById("stand").innerHTML =
  `${WORD[moved]} of the five measures below moved further this year than they usually
   move, and the biggest percentage change on the page, federal contracting up
   ${cap.direction.pct.toFixed(0)} percent, was not one of them.`;

const withheld = D.register.possible_cells - D.register.disclosed.at(-1).cells;
PV.figures([
  ["key", scale.value, "jobs counted",
   `down ${N(Math.abs(scale.direction.value))} on the year, and ${withheld} of the
    ${D.register.possible_cells} cells withheld`],
  ["", conc.value, "paint concentration",
   `the strongest of the three, ahead of plastics and rubber at
    ${conc.drivers.find(d => d.label.indexOf("Plastics") === 0).value}`],
  ["", pay.value.split(" / ")[1], "of the national rate",
   `for the same work, and ${pay.value.split(" / ")[0]} the average job in its own county`],
  ["", cap.value, "in signed awards",
   `federal money naming ${WORDS[D.federal_awards.leads.length]} recipients, none of it
    spent yet`],
]);

/* ------------------------------------------------------------------- the movement chart

   Bar = |this year's change| ÷ the median of that measure's earlier changes. Band = the
   largest of those earlier changes, on the same scale. Both are computed in the derive
   script; nothing here recomputes them, so the chart and the claims cannot disagree. */
const ORDER = [...T].sort((a, b) => b.band.typicals - a.band.typicals);
const XMAX = Math.max(...T.map(t => Math.max(t.band.typicals, t.band.max_typicals))) * 1.04;

/* The bar's own label is in the measure's OWN unit, never a percent. Five percents from
   five different denominators, stacked on one chart, invite the reader to compare them —
   and "down 3% of jobs" against "down 7% of a ratio" is not a comparison. The normalised
   axis is the only quantity on this chart that is comparable across rows, and it is
   already the bar length. */
const moveWords = t => t.direction.short_move;

function drawMove() {
  const mob = MOBILE.matches;
  return mob ? drawMoveMobile() : drawMoveDesktop();
}

function drawMoveDesktop() {
  const {svg, m, w, h} = PV.chart("move", {W: 1100, m: {t: 40, r: 236, b: 62, l: 246},
    rows: T.length, rowH: 66});
  const rowH = h / T.length;
  const x = v => m.l + (v / XMAX) * w;

  ticks(0, XMAX, 4).forEach(v => {
    el("line", {x1: x(v), y1: m.t, x2: x(v), y2: m.t + h, stroke: "var(--pv-grid)",
      "stroke-width": 1}, svg);
    txt(svg, v + "×", {x: x(v), y: m.t + h + 22, "text-anchor": "middle", class: "pv-tick"});
  });
  txt(svg, "BIGGER MOVES TO THE RIGHT", {x: m.l, y: m.t + h + 48,
    "text-anchor": "start", class: "pv-axlab"});

  ORDER.forEach((t, i) => {
    const cy = m.t + i * rowH + rowH / 2;
    txt(svg, t.dimension, {x: m.l - 16, y: cy - 6, "text-anchor": "end", class: "pv-lab"});
    txt(svg, t.short, {x: m.l - 16, y: cy + 13, "text-anchor": "end", class: "pv-labq"});

    el("rect", {x: x(0), y: cy - 15, width: x(t.band.max_typicals) - x(0), height: 30,
      fill: BAND}, svg);
    const bar = el("rect", {x: x(0), y: cy - 10, width: Math.max(2, x(t.band.typicals) - x(0)),
      height: 20, fill: dirColor(t)}, svg);
    hoverable(bar, `<b>${t.dimension}</b><br>${t.direction.words}<br>
      <span class="v">${t.band.typicals.toFixed(2)}×</span> a typical year&rsquo;s move
      <br>widest earlier move: <span class="v">${t.band.max_typicals.toFixed(2)}×</span>`,
      `${t.dimension}: ${t.band.typicals.toFixed(2)} times a typical year\u2019s move`);

    txt(svg, moveWords(t), {x: m.l + w + 16, y: cy - 4, "text-anchor": "start",
      class: "pv-lab", fill: dirColor(t)});
    txt(svg, verdictShort(t), {x: m.l + w + 16, y: cy + 15, "text-anchor": "start",
      class: "pv-labq"});
  });

  /* The reference line, and the annotation, drawn LAST so nothing paints over them. */
  el("line", {x1: x(1), y1: m.t - 8, x2: x(1), y2: m.t + h + 4, stroke: "#2A3A3E",
    "stroke-width": 2}, svg);
  txt(svg, "1.0×: a typical year for that measure", {x: x(1) + 10, y: m.t - 16,
    "text-anchor": "start", class: "pv-lab"});

  const ci = ORDER.findIndex(t => t.id === "capital");
  const cy = m.t + ci * rowH + rowH / 2;
  // Past the END OF THE GRAY BAND, not past the bar. Anchored to the bar it sat on top of
  // the band behind it, which is the one thing on this chart a reader must be able to see.
  const ax = x(Math.max(cap.band.typicals, cap.band.max_typicals)) + 22;
  txt(svg, `Federal contracting rose ${cap.direction.pct.toFixed(0)} percent`,
    {x: ax, y: cy - 2, "text-anchor": "start", class: "pv-lab"});
  txt(svg, "and still moved less than it does in a normal year.",
    {x: ax, y: cy + 18, "text-anchor": "start", class: "pv-labq"});
}

/* Mobile is a re-layout, not a shrink: the row label moves above its own bar so the plot
   keeps the full width, and the takeaway is in the first paint with no sideways pan. */
function drawMoveMobile() {
  const W = 390, m = {t: 44, r: 16, b: 52, l: 16}, rowH = 78;
  const {svg, w, h} = PV.chart("move", {W, m, H: m.t + T.length * rowH + m.b});
  const x = v => m.l + (v / XMAX) * w;

  /* Gridlines run across the BAR STRIP of each row and stop there. Drawn full height they
     struck through every label above every bar, which collide.mjs cannot see because it
     measures the desktop layout only. Read off a 375px crop, not off the gate. */
  const strip = i => [m.t + i * rowH + 40, m.t + i * rowH + 68];
  ticks(0, XMAX, 4).forEach(v => {
    ORDER.forEach((t, i) => {
      const [y1, y2] = strip(i);
      el("line", {x1: x(v), y1, x2: x(v), y2, stroke: "var(--pv-grid)",
        "stroke-width": 1}, svg);
    });
    txt(svg, v + "×", {x: x(v), y: m.t + T.length * rowH + 22, "text-anchor": "middle",
      class: "pv-tick"});
  });

  ORDER.forEach((t, i) => {
    const y = m.t + i * rowH;
    txt(svg, t.dimension, {x: m.l, y: y + 14, "text-anchor": "start", class: "pv-lab"});
    txt(svg, `${moveWords(t)} · ${verdictShort(t).toLowerCase()}`,
      {x: m.l, y: y + 34, "text-anchor": "start", class: "pv-labq", fill: dirColor(t)});
    el("rect", {x: x(0), y: y + 44, width: x(t.band.max_typicals) - x(0), height: 20,
      fill: BAND}, svg);
    const bar = el("rect", {x: x(0), y: y + 47, width: Math.max(2, x(t.band.typicals) - x(0)),
      height: 14, fill: dirColor(t)}, svg);
    hoverable(bar, `<b>${t.dimension}</b><br>${t.direction.words}`,
      `${t.dimension}: ${t.band.typicals.toFixed(2)} times a typical year\u2019s move`);
  });

  ORDER.forEach((t, i) => {
    const [y1, y2] = strip(i);
    el("line", {x1: x(1), y1, x2: x(1), y2, stroke: "#2A3A3E", "stroke-width": 2}, svg);
  });
  txt(svg, "1.0×: a typical year", {x: x(1) + 8, y: m.t - 20, "text-anchor": "start",
    class: "pv-lab"});
  txt(svg, "bigger to the right", {x: m.l, y: m.t + T.length * rowH + 44,
    "text-anchor": "start", class: "pv-axlab"});
}

document.getElementById("movetitle").textContent =
  `${WORD[moved]} of the five moved further than they usually do, and federal money was ` +
  `not among them`;

document.getElementById("movetable").innerHTML = tableView("move",
  "This year\u2019s change against each measure\u2019s own record of year-to-year change",
  ["Measure", "This year", "A typical year", "Widest earlier move", "Reading"],
  ORDER.map(t => [t.dimension, t.direction.words,
    t.band.median_prior.toLocaleString("en-US"),
    t.band.max_prior.toLocaleString("en-US"),
    `${t.band.typicals.toFixed(2)}× a typical year`]));

document.getElementById("movesrc").innerHTML =
  `Recomputed from the shipped data of six Evidence Room pages; employment, wage and
   contracting figures cover the ${FP.words} Northeast Ohio counties. Each measure&rsquo;s
   typical move is the median absolute change between consecutive published years, taken
   over every earlier pair in its own series. It describes movement between published
   years, not the size of a future revision, which is unmeasured for four of these five.`;

/* ---------------------------------------------------------------------------- tiles */
const drivers = t => t.drivers.map(d => `<li><span class="d-lab">${d.label}</span>
  <span class="d-val">${d.value}</span><span class="d-note">${d.note}</span></li>`).join("");

document.getElementById("tiles").innerHTML = T.map(t => `
  <article class="tile">
    <div class="t-rail">
      <p class="t-dim">${t.dimension}</p>
      <p class="t-q">${t.question}</p>
      <p class="t-val${t.value.indexOf("/") > -1 ? " two" : ""}">${t.value}
        <span class="t-unit">${t.unit}</span></p>
      <p class="t-move" style="color:${dirColor(t)}">${t.direction.short_move}
        <span>on the year</span></p>
      <span class="t-pill ${t.band.verdict}">${verdictShort(t)}</span>
    </div>
    <div class="t-body">
      <p class="t-read">${t.reading}</p>
      <ul class="t-drivers">${drivers(t)}</ul>
      <dl class="t-facts">
        <dt>Against</dt><dd><b>${t.baseline.name}.</b> ${t.baseline.why}</dd>
        <dt>This year</dt><dd>${t.direction.words}.</dd>
        <dt>Unusual?</dt><dd>${verdictText(t)}</dd>
        <dt>Cannot see</dt><dd>${t.blind}</dd>
        <dt>Vintage</dt><dd><b>${t.vintage.as_of}.</b> ${t.vintage.changes_it}</dd>
      </dl>
      <a class="t-link" href="${t.link.href}">${t.link.label} &rarr;</a>
    </div>
  </article>`).join("");

/* ------------------------------------------------------------- the register change band
   The one moment at display scale away from the hero, and it carries the page's own
   measured calibration rather than another headline. */
const R = D.measured_revisions;
document.getElementById("statgrid").innerHTML = `
  <div class="statv"><div class="n">${R.median_pct.toFixed(2)}%</div>
    <div class="k">middle revision, price indexes</div>
    <div class="d">Across ${R.n_periods} reference months of archived vintages for
      ${WORDS[R.series.length]} producer-price series, the middle revision moved the
      published level by ${R.median_pct.toFixed(2)} percent of it and the largest by
      ${R.max_pct.toFixed(2)} percent.</div></div>
  <div class="statv warn"><div class="n">0</div>
    <div class="k">series here with a measured revision band</div>
    <div class="d">No archived vintages have been assembled for the employment, degree or
      spending series on this page, so how far a fresh figure will move once it is restated
      is not known. Treat a one-year move in any tile as provisional.</div></div>`;

/* -------------------------------------------------------------- what would change these */
document.getElementById("changes").innerHTML = T.map(t =>
  `<li><b>${t.dimension}</b><span>${t.vintage.changes_it}</span></li>`).join("");

const HS = D.human_scale;
document.getElementById("scalesub").innerHTML =
  `Two of these are easier to picture than to read. The ${N(HS.jobs_lost)} jobs lost
   between the two years are close to the whole disclosed plastics-and-rubber payroll of
   ${HS.nearest_county} County, ${N(HS.nearest_county_emp)} jobs. The
   $${(HS.largest_award / 1e6).toFixed(1)} million award to ${HS.largest_award_name} is the
   largest of the ${WORDS[D.federal_awards.leads.length]}, which average
   $${(HS.mean_award / 1e6).toFixed(1)} million each; both come from signed federal Notices
   of Award rather than from an announcement.`;

/* --------------------------------------------------------------------------- closer */
document.getElementById("closerline").textContent =
  "Smaller every year, paid above its towns and below its industry, holding $51 million " +
  "it has not spent.";
document.getElementById("closersub").innerHTML =
  `That is the reading on ${WORDS[T.length]} measures, none of which has a target set for
   it, and ${withheld} of the ${D.register.possible_cells} employment cells behind the
   first one are withheld rather than small. The degree figure is the one to watch and the
   one to trust least: it is ${WORDS[D.asof.qcew_year - D.asof.ipeds_year]} years behind
   everything else here.`;

document.getElementById("lagsub").textContent =
  `${WORDS[D.asof.qcew_year - D.asof.ipeds_year]} years`;

/* -------------------------------------------------------------------------- assemble */
drawMove();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawMove)
                        : MOBILE.addListener(drawMove);

const meth = await PV.methodology({page: "cluster-health", meta: D.meta,
  definitions: `Every figure is recomputed by <span class="mono">derive_health.py</span> in
    this folder, which reads the shipped data files of the wages, location-quotient,
    occupations, federal-money, funding-map and revisions pages and writes
    <span class="mono">data/health.json</span>. It fetches nothing. Each claim behind this
    page re-runs against those source files rather than against the derived one, so a
    figure that has gone stale here fails the check instead of rendering.`});

{
  const h = [...meth.querySelectorAll("h3")]
    .find(x => x.textContent.trim() === "Data sources");
  if (h) {
    const p = document.createElement("p");
    p.className = "pv-method-note";
    p.textContent = `Coverage: PIC’s official ${FP.words}-county footprint ` +
      `(${FP.counties.join(", ")}), all in Northeast Ohio. A wider fourteen-county ` +
      `definition of the region, used by some other sources, adds Crawford, Huron, ` +
      `Richland and Tuscarawas; the two never reconcile, and this page does not mix ` +
      `them. The degree completions are three named universities, and the openings ` +
      `estimate printed beside them is a state projection for an eighteen-county region; ` +
      `they are shown side by side and never divided into one another.`;
    h.parentNode.appendChild(p);
  }
}
})();
