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
const UP = "#0C6473", DOWN = "#C85F0C", MARK = "#9A948A";
const dirColor = t => t.band.latest >= 0 ? UP : DOWN;

/* The verdict, written out rather than left as a class name. A median is a description of
   the middle, never a threshold somebody set, so the sentence always carries the count.
   The count alone settles it: nine moves with seven smaller leaves two larger, and saying
   both halves reads as new information that never arrives. */
function verdictText(t) {
  const b = t.band, rest = b.n_prior - b.beats;
  const w = n => WORDS[n] || String(n);
  if (b.verdict === "ordinary")
    return `Inside the range this measure normally moves: ${w(rest)} of its ${w(b.n_prior)}
      earlier year-to-year moves were at least this big.`;
  if (b.verdict === "record")
    return `Larger than every one of its ${w(b.n_prior)} earlier year-to-year moves.
      Nothing in the published series has moved this far before.`;
  return `Larger than ${w(b.beats)} of its ${w(b.n_prior)} earlier year-to-year moves.`;
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

/* Two sentences, one job each. The first names the three industries the word "cluster"
   stands for and prints the three years the headline claims, because a headline about a
   three-year fall on a page showing one year is a claim the reader cannot check. The
   second is the finding, with the negation as a trailing clause rather than nested inside
   the sentence it qualifies. */
const bal = D.register.disclosed.slice(-3);
document.getElementById("stand").innerHTML =
  `Plastics and rubber, paint and coatings and resin held ${N(bal[0].balanced)} jobs in
   ${bal[0].year}, ${N(bal[1].balanced)} in ${bal[1].year} and ${N(bal[2].balanced)} in
   ${bal[2].year}, counted on the same set of county figures each year. ${WORD[moved]} of
   the five measures below moved further this year than that measure usually moves, and
   federal contracting, up ${cap.direction.pct.toFixed(0)} percent, was not one of them.`;

/* Each hero number's sub-line is that number's plain reading, because for three of the
   four this is where the reader meets the measure first. Whether a big number is good
   news is said here, not left to the tiles two screens down. */
const withheld = D.register.possible_cells - D.register.disclosed.at(-1).cells;
const ORD = ["", "first", "second", "third", "fourth", "fifth", "sixth"];
PV.figures([
  ["key", scale.value, "jobs counted in " + D.asof.qcew_year,
   `down ${N(Math.abs(scale.direction.value))} on the figures published in both years, the
    ${ORD[scale.direction.streak]} fall running. ${withheld} of the
    ${D.register.possible_cells} county-by-industry figures are hidden to protect single
    employers.`],
  ["", conc.value, "the U.S. share of paint work",
   `these counties do ${WORDS[Math.round(parseFloat(conc.value))]} times as much paint and
    coatings work, per job, as the country. High concentration is the cluster&rsquo;s
    distinction and its exposure.`],
  ["", pay.value.split(" / ")[1], "of the national rate",
   `the same work pays about a tenth less here than the U.S. average for it, and about a
    quarter more than the average job in its own county.`],
  ["", cap.value, "signed, none of it spent",
   `${WORDS[D.federal_awards.leads.length]} organizations have signed for it. It is worth
    about ${cap.drivers[2].value} of the federal contracting already arriving.`],
]);

/* ------------------------------------------------------------------- the movement chart

   Bar = |this year's change| ÷ the median of that measure's earlier changes. The record
   mark = the largest of those earlier changes, on the same scale. Both are computed in
   the derive script; nothing here recomputes them, so the chart and the claims cannot
   disagree.

   WHY A MARK AND NOT A BAND. This used to be a filled band running from zero to the
   widest earlier move, captioned "a bar inside the band is a year this measure has had
   before". Every bar is inside its band, always, because the widest earlier move is
   almost always larger than a single year's move. So the band said "nothing here is
   remarkable" while the row labels three inches away said "bigger than usual", and a
   reader who took the caption at its word came away with the opposite of the finding. A
   single upright at the record is the same fact with no region to be inside or outside
   of: it says how far this measure has ever gone, and the 1.0 line does the judging. */
const ORDER = [...T].sort((a, b) => b.band.typicals - a.band.typicals);
/* 1.12, not 1.04: the widest record mark is a thin upright at the top of the domain, and
   at 4 percent headroom it sat close enough to the right-hand label column to read as
   part of it. */
const XMAX = Math.max(...T.map(t => Math.max(t.band.typicals, t.band.max_typicals))) * 1.12;

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
    txt(svg, String(v), {x: x(v), y: m.t + h + 22, "text-anchor": "middle",
      class: "pv-tick"});
  });
  txt(svg, "TIMES AS FAR AS THAT MEASURE USUALLY MOVES IN A YEAR →",
    {x: m.l, y: m.t + h + 48, "text-anchor": "start", class: "pv-axlab"});

  ORDER.forEach((t, i) => {
    const cy = m.t + i * rowH + rowH / 2;
    txt(svg, t.dimension, {x: m.l - 16, y: cy - 6, "text-anchor": "end", class: "pv-lab"});
    txt(svg, t.short, {x: m.l - 16, y: cy + 13, "text-anchor": "end", class: "pv-labq"});

    const bar = el("rect", {x: x(0), y: cy - 10, width: Math.max(2, x(t.band.typicals) - x(0)),
      height: 20, fill: dirColor(t)}, svg);
    /* Drawn after the bar, so a record mark a long bar reaches stays visible. */
    el("line", {x1: x(t.band.max_typicals), y1: cy - 17, x2: x(t.band.max_typicals),
      y2: cy + 17, stroke: MARK, "stroke-width": 3}, svg);
    hoverable(bar, `<b>${t.dimension}</b><br>${t.direction.words}<br>
      <span class="v">${t.band.typicals.toFixed(2)}</span> times as far as it usually moves
      <br>furthest it has ever moved:
      <span class="v">${t.band.max_typicals.toFixed(2)}</span>`,
      `${t.dimension}: ${t.band.typicals.toFixed(2)} times as far as it usually moves`);

    txt(svg, moveWords(t), {x: m.l + w + 16, y: cy - 4, "text-anchor": "start",
      class: "pv-lab", fill: dirColor(t)});
    txt(svg, verdictShort(t), {x: m.l + w + 16, y: cy + 15, "text-anchor": "start",
      class: "pv-labq"});
  });

  /* The reference line and the annotations, drawn LAST so nothing paints over them. The
     line is labelled by what CROSSING it means, not by what it equals. */
  el("line", {x1: x(1), y1: m.t - 8, x2: x(1), y2: m.t + h + 4, stroke: "#2A3A3E",
    "stroke-width": 2}, svg);
  txt(svg, "1.0: a normal year. Right of it, a bigger move than that measure usually makes",
    {x: x(1) + 10, y: m.t - 16, "text-anchor": "start", class: "pv-lab"});

  /* The record mark is a repeated element, so it is named once, on the row with the most
     empty space between its bar and its mark. */
  const ti = ORDER.findIndex(t => t.id === "talent");
  txt(svg, "furthest it has ever moved",
    {x: x(ORDER[ti].band.max_typicals) - 10, y: m.t + ti * rowH + rowH / 2 + 5,
     "text-anchor": "end", class: "pv-labq"});

  const ci = ORDER.findIndex(t => t.id === "capital");
  const cy = m.t + ci * rowH + rowH / 2;
  // Past the RECORD MARK, not past the bar. Anchored to the bar it sat on top of the mark
  // behind it, which is the one thing on this chart a reader must be able to see.
  const ax = x(Math.max(cap.band.typicals, cap.band.max_typicals)) + 22;
  txt(svg, `Federal contracting rose ${cap.direction.pct.toFixed(0)} percent`,
    {x: ax, y: cy - 2, "text-anchor": "start", class: "pv-lab"});
  txt(svg, "and still moved less than it does in a normal year.",
    {x: ax, y: cy + 18, "text-anchor": "start", class: "pv-labq"});
}

/* Mobile is a re-layout, not a shrink: the row label moves above its own bar so the plot
   keeps the full width, and the takeaway is in the first paint with no sideways pan. */
function drawMoveMobile() {
  /* Top margin carries two caption lines and a leader down to the first reference-line
     segment. Set to one line, the caption floated sixty pixels clear of anything it
     named and read as a chart title instead of a label for the line. */
  const W = 390, m = {t: 66, r: 16, b: 52, l: 16}, rowH = 78;
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
    txt(svg, String(v), {x: x(v), y: m.t + T.length * rowH + 22, "text-anchor": "middle",
      class: "pv-tick"});
  });

  ORDER.forEach((t, i) => {
    const y = m.t + i * rowH;
    txt(svg, t.dimension, {x: m.l, y: y + 14, "text-anchor": "start", class: "pv-lab"});
    txt(svg, `${moveWords(t)} · ${verdictShort(t).toLowerCase()}`,
      {x: m.l, y: y + 34, "text-anchor": "start", class: "pv-labq", fill: dirColor(t)});
    const bar = el("rect", {x: x(0), y: y + 47, width: Math.max(2, x(t.band.typicals) - x(0)),
      height: 14, fill: dirColor(t)}, svg);
    el("line", {x1: x(t.band.max_typicals), y1: y + 43, x2: x(t.band.max_typicals),
      y2: y + 65, stroke: MARK, "stroke-width": 3}, svg);
    hoverable(bar, `<b>${t.dimension}</b><br>${t.direction.words}`,
      `${t.dimension}: ${t.band.typicals.toFixed(2)} times as far as it usually moves`);
  });

  ORDER.forEach((t, i) => {
    const [y1, y2] = strip(i);
    el("line", {x1: x(1), y1, x2: x(1), y2, stroke: "#2A3A3E", "stroke-width": 2}, svg);
  });
  /* A STUB, not a full leader. Run all the way down to the first segment of the line it
     names, it struck through the first row's measure name and its move label on the way.
     The stub plus the shared x is enough to read the caption as belonging to the line
     rather than as a title centred over the plot. */
  el("line", {x1: x(1), y1: m.t - 22, x2: x(1), y2: m.t - 6, stroke: "#2A3A3E",
    "stroke-width": 2}, svg);
  txt(svg, "1.0: a normal year", {x: x(1) + 8, y: m.t - 46, "text-anchor": "start",
    class: "pv-lab"});
  txt(svg, "right of it, bigger than usual", {x: x(1) + 8, y: m.t - 28,
    "text-anchor": "start", class: "pv-labq"});
  txt(svg, "TIMES ITS USUAL MOVE →", {x: m.l, y: m.t + T.length * rowH + 44,
    "text-anchor": "start", class: "pv-axlab"});
}

document.getElementById("movetitle").textContent =
  `${WORD[moved]} of the five moved further than they usually do, and federal money was ` +
  `not among them`;

document.getElementById("movetable").innerHTML = tableView("move",
  "This year\u2019s change against each measure\u2019s own record of year-to-year change",
  ["Measure", "This year", "What it usually moves", "Furthest it has moved", "Reading"],
  ORDER.map(t => [t.dimension, t.direction.words,
    t.band.median_prior.toLocaleString("en-US"),
    t.band.max_prior.toLocaleString("en-US"),
    `${t.band.typicals.toFixed(2)} times its usual move`]));

document.getElementById("movesrc").innerHTML =
  `Recomputed from the published data of six pages in the Evidence Room, PIC&rsquo;s public
   data archive; employment, wage and contracting figures cover the ${FP.words} Northeast
   Ohio counties. What a measure usually moves is the middle of all its year-to-year
   changes, direction ignored, over every earlier pair of years in its own series. That
   describes movement between published years, not the size of a future revision, which is
   unmeasured for four of these five.`;

/* ---------------------------------------------------------------------------- tiles */
const drivers = t => t.drivers.map(d => `<li><span class="d-lab">${d.label}</span>
  <span class="d-val">${d.value}</span><span class="d-note">${d.note}</span></li>`).join("");

/* A tile holding two numbers used to print them as "1.24× / 0.90×" over the paired label
   "its county / its industry nationally", which asks the reader to match by position
   across two slashes. Each number now carries its own words. */
const valueBlock = t => (t.value_parts || [{v: t.value, k: t.unit}]).map(p =>
  `<p class="t-val${t.value_parts ? " two" : ""}">${p.v}
     <span class="t-unit">${p.k}</span></p>`).join("");

document.getElementById("tiles").innerHTML = T.map(t => `
  <article class="tile">
    <div class="t-rail">
      <p class="t-dim">${t.dimension}</p>
      <p class="t-q">${t.question}</p>
      ${valueBlock(t)}
      <p class="t-move" style="color:${dirColor(t)}">${t.direction.short_move}
        <span>${t.direction.of}</span></p>
      <span class="t-pill ${t.band.verdict}">${verdictShort(t)}</span>
    </div>
    <div class="t-body">
      <p class="t-read">${t.reading}</p>
      ${t.means ? `<p class="t-means">${t.means}</p>` : ""}
      <ul class="t-drivers">${drivers(t)}</ul>
      ${t.drivers_note ? `<p class="d-foot">${t.drivers_note}</p>` : ""}
      <dl class="t-facts">
        <dt>Against</dt><dd><b>${t.baseline.name}.</b> ${t.baseline.why}</dd>
        <dt>This year</dt><dd>${t.direction.words}.</dd>
        <dt>Unusual?</dt><dd>${verdictText(t)}</dd>
        <dt>Cannot see</dt><dd>${t.blind}</dd>
        <dt>Data as of</dt><dd><b>${t.vintage.as_of}.</b> ${t.vintage.changes_it}</dd>
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
    <div class="d">Across ${R.n_periods} reference months of archived earlier releases for
      ${WORDS[R.series.length]} producer-price series, which track the prices factories
      charge, the middle revision moved the published level by
      ${R.median_pct.toFixed(2)} percent of it and the largest by
      ${R.max_pct.toFixed(2)} percent.</div></div>
  <div class="statv warn"><div class="n">0</div>
    <div class="k">series here with a measured revision</div>
    <div class="d">Nobody has collected the earlier releases of the employment, degree or
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
   $${(HS.mean_award / 1e6).toFixed(1)} million each; both are read off the signed award
   documents rather than off an announcement.`;

/* --------------------------------------------------------------------------- closer
   "Smaller every year" was a claim about the whole series, which rose in two of the last
   five. The page evidences three consecutive falls, so the closer says three. */
document.getElementById("closerline").textContent =
  `Three years smaller, paid above its towns and below its industry, holding ` +
  `${cap.value.replace("M", " million")} it has not spent.`;
document.getElementById("closersub").innerHTML =
  `That is the reading on ${WORDS[T.length]} measures, none of which has a target set for
   it, and ${withheld} of the ${D.register.possible_cells} county employment figures
   behind the first one are withheld rather than small. The degree figure is the one to
   watch and the one to trust least: it is
   ${WORDS[D.asof.qcew_year - D.asof.ipeds_year]} years behind everything else here.`;

document.getElementById("lagsub").textContent =
  `${WORDS[D.asof.qcew_year - D.asof.ipeds_year]} years`;

/* -------------------------------------------------------------------------- assemble */
drawMove();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawMove)
                        : MOBILE.addListener(drawMove);

const meth = await PV.methodology({page: "cluster-health", meta: D.meta,
  definitions: `Every figure is recomputed by <span class="mono">derive_health.py</span> in
    this folder, which reads the published data files of six other pages in the Evidence
    Room, PIC&rsquo;s public data archive: wages, concentration, occupations, federal
    money, the funding map and revisions. It writes
    <span class="mono">data/health.json</span>. It fetches nothing. Each claim behind this
    page re-runs against those source files rather than against the derived one, so a
    figure that has gone stale here fails the check instead of rendering.`});

{
  const h = [...meth.querySelectorAll("h3")]
    .find(x => x.textContent.trim() === "Data sources");
  if (h) {
    const p = document.createElement("p");
    p.className = "pv-method-note";
    p.textContent = `Coverage: the ${FP.words} counties PIC treats as its region ` +
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
