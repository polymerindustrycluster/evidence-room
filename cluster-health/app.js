/* Cluster health — the front door to the Evidence Room, and a maintained instrument
   rather than an article.

   TWO CHARTS, TWO QUESTIONS, AND THEY ARE NOT THE SAME QUESTION.

   STANDING (first, and the one the eyebrow asks): where each level sits on the range of
   its own published years, lowest at the left and highest at the right, with the better
   end of that range marked where the measure has one. Five units cannot share a value
   axis; a position within a measure's own history can be shared, and it is the only
   reference here nobody had to choose. It is not a grade, and the note under it says so
   using the row that proves it: pay sits at the top of its range and is under the
   national rate for the same work in every year of that range.

   MOVEMENT (second): how far this year's step was against how far that measure usually
   steps. The axis is not a value either: it is "how far this measure usually moves in a
   year", and every bar is this year's change divided by that. One reference line at 1.0.
   For a while this was the ONLY chart, and a reader who came asking how the cluster was
   doing left with a volatility meter whose longest bar belonged to the one measure this
   page says has no better end. Bar length is size of move; colour is rose or fell.
   Neither is merit, and the band now says that in its first line.

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

/* ---------------------------------------------------------------- standing vocabulary
   Two different questions live on this page and a reader who conflates them comes away
   with the wrong one answered. STANDING is where a level sits in the same measure's own
   published range, and which end of that range is the better one for the region. MOVEMENT
   is how far this year's step was against how far that measure usually steps. The
   movement chart alone reads as a verdict and is not one: its longest bar belongs to the
   measure this page says has no better end at all. */
const SFMT = {
  n: v => N(v),
  x2: v => v.toFixed(2) + "×",
  x3: v => v.toFixed(3) + "×",
  usd_m2: v => "$" + (v / 1e6).toFixed(2) + "M",
};
const sfmt = (s, v) => SFMT[s.fmt](v);
const syear = (s, y) => (s.year_prefix || "") + y;
const sPoint = (s, side) => `${sfmt(s, s[side].value)} in ${syear(s, s[side].year)}`;
const AT_LOW = s => s.position === 0, AT_HIGH = s => s.position === 1;
const standColor = s => s.better_end ? UP : MARK;
const cap1 = t => t.charAt(0).toUpperCase() + t.slice(1);

/* ------------------------------------------------------------------------ hero copy */
const scale = byId("scale"), conc = byId("concentration"), pay = byId("pay");
const talent = byId("talent"), cap = byId("capital");
const moved = D.moved_more_than_usual;
const WORD = {1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "All five"};

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve"];

/* Three jobs, in order. (1) The three-year run the headline claims, on the basis that
   supports it, NAMED as that basis. (2) The other total for the same year, also named,
   because a reader met 24,030 in the hero and 23,457 here and could not reconcile two
   figures for one year. They are two bases and both are correct: a level counts every
   figure the bureau published, a trend counts only the figures published in every year,
   and neither can be fixed into the other. (3) The standing reading, which is the
   question the eyebrow asks. It used to be the MOVEMENT reading, which answers a
   different question and left a reader who wanted to know how the cluster was doing
   holding a volatility meter. */
const bal = D.register.disclosed.slice(-3);
const BASES = scale.bases;
const standLine = t => `${t.dimension === "Job quality" ? "pay against the national rate"
  : t.dimension === "Scale" ? "jobs" : t.dimension === "Talent supply" ? "polymer degrees"
  : t.dimension === "Capital" ? "federal contracting" : t.dimension.toLowerCase()}
  at the ${t.standing.rank_words}`;
document.getElementById("stand").innerHTML =
  `On ${BASES.trend.label}, plastics and rubber, paint and coatings and resin held
   ${N(bal[0].balanced)} jobs in ${bal[0].year}, ${N(bal[1].balanced)} in ${bal[1].year}
   and ${N(bal[2].balanced)} in ${bal[2].year}. ${cap1(BASES.level.label)} gives a higher
   total, ${BASES.level.display}, on a basis that cannot carry a trend. Against their own
   histories: ${[scale, talent, pay, cap].map(standLine).join("; ")}. Concentration, the
   fifth measure, has no better end.`;

/* Each hero number's sub-line is that number's plain reading, because for three of the
   four this is where the reader meets the measure first. Whether a big number is good
   news is said here, not left to the tiles two screens down. */
const withheld = D.register.possible_cells - D.register.disclosed.at(-1).cells;
const ORD = ["", "first", "second", "third", "fourth", "fifth", "sixth"];
PV.figures([
  ["key", BASES.level.display, "jobs, all published counties",
   `${withheld} of the ${BASES.level.of_cells} county figures are withheld to protect
    single employers, so this is a floor. On the fixed set of ${BASES.trend.cells} it is
    ${BASES.trend.display}, down ${N(Math.abs(scale.direction.value))} and falling for the
    ${ORD[scale.direction.streak]} year.`],
  ["", conc.value, "the U.S. share of paint work",
   `these counties do ${WORDS[Math.round(parseFloat(conc.value))]} times as much paint and
    coatings work, per job, as the country. High concentration is the region&rsquo;s
    distinction and its exposure, so it is the one measure here with no better end.`],
  ["", pay.value.split(" / ")[1], "of the national rate",
   `the same work pays about a tenth less here than the U.S. average for it and about a
    quarter more than the average job in its own county. It has been under the U.S. rate
    in all ${WORDS[pay.standing.n_years]} published years.`],
  /* NOT "none of it spent". The public record shows what was awarded and what was
     assigned to a recipient, never what was drawn down, so an award that has paid out
     nothing and one that has paid out everything are the same document here. Stating a
     zero is as much a claim as stating a number, and this page can support neither.
     _data/FIGURES.json registers the quantity as not publicly observable and
     tools/figures.mjs fails the build on any page that gives it a value. */
  ["", cap.value, "signed, " + WORDS[D.federal_awards.leads.length] + " named recipients",
   `signed for and assigned, worth about ${cap.drivers[2].value} of the contracting
    already arriving. How much has been paid out is not in the public record, so no amount
    is stated here, not even a zero.`],
]);

/* ------------------------------------------------------------------- the standing chart

   THE CHART THAT ANSWERS THE EYEBROW. Five measures in five units cannot share a value
   axis, and the movement chart solved that by making the axis "how far this measure
   usually moves". That is a real quantity and it is not standing: it says how UNUSUAL a
   step was, never whether the level is good, and a reader arriving at "how is the cluster
   doing" left with a volatility meter whose longest bar was the one measure the page
   itself says cuts both ways.

   This axis is the other unit-free comparison available, and it is not a target: each
   measure's own published years, its lowest at the left and its highest at the right. No
   goal is invented, no peer set is chosen, and the reader can see the actual endpoint
   values and their years on every row.

   WHAT IT STILL CANNOT SAY. A position in a measure's own range is not a grade. Job
   quality sits at the far right of its rail and is under the national rate for the same
   work in all eleven of those years, so the top of a range is not a pass. The note under
   the chart says exactly that, using that row as the example, because a reader who takes
   the right-hand end for "good" has swapped one wrong reading for another.

   MERIT IS SPATIAL, NOT A THRESHOLD. Four of the five have a better end and it is the
   right-hand one for all four, which the axis label states once. The fifth is drawn grey
   and labelled "no better end". Nothing here colours a half of a range good or bad, which
   would be a cutoff nobody set. */
const STAND = [...T].sort((a, b) => a.standing.position - b.standing.position);

function drawStand() {
  return MOBILE.matches ? drawStandMobile() : drawStandDesktop();
}

function drawStandDesktop() {
  const {svg, m, w, h} = PV.chart("stand-chart",
    {W: 1100, m: {t: 44, r: 252, b: 66, l: 246}, rows: T.length, rowH: 76});
  const rowH = h / T.length;
  const x = p => m.l + p * w;

  STAND.forEach((t, i) => {
    const s = t.standing, cy = m.t + i * rowH + rowH / 2, col = standColor(s);
    txt(svg, t.dimension, {x: m.l - 16, y: cy - 6, "text-anchor": "end", class: "pv-lab"});
    txt(svg, s.basis_short, {x: m.l - 16, y: cy + 13, "text-anchor": "end",
      class: "pv-labq"});

    el("line", {x1: x(0), y1: cy, x2: x(1), y2: cy, stroke: "#D8D2C8", "stroke-width": 4,
      "stroke-linecap": "round"}, svg);
    [0, 1].forEach(p => el("line", {x1: x(p), y1: cy - 9, x2: x(p), y2: cy + 9,
      stroke: "#B9B3A9", "stroke-width": 2}, svg));

    /* The endpoint labels carry the real values and their years, so the rail is
       inspectable rather than decorative. When the current year IS an endpoint the
       endpoint label is the current label: printing a second one on top of it was the
       first thing that collided here. */
    const lowNow = AT_LOW(s), highNow = AT_HIGH(s);
    txt(svg, sPoint(s, "low"), {x: x(0), y: cy + 26, "text-anchor": "start",
      class: lowNow ? "pv-lab" : "pv-labq", fill: lowNow ? col : undefined});
    txt(svg, sPoint(s, "high"), {x: x(1), y: cy + 26, "text-anchor": "end",
      class: highNow ? "pv-lab" : "pv-labq", fill: highNow ? col : undefined});

    const dot = el("circle", {cx: x(s.position), cy, r: 9, fill: col}, svg);
    if (!lowNow && !highNow)
      txt(svg, sfmt(s, s.value), {x: x(s.position), y: cy - 16, fill: col, class: "pv-lab",
        "text-anchor": s.position < 0.1 ? "start" : s.position > 0.9 ? "end" : "middle"});
    hoverable(dot, `<b>${t.dimension}</b><br>${sfmt(s, s.value)} in ${syear(s, s.year)},
      the ${s.rank_words}<br>lowest ${sPoint(s, "low")}<br>highest ${sPoint(s, "high")}
      <br>${s.merit_short}`,
      `${t.dimension}: ${sfmt(s, s.value)}, the ${s.rank_words}`);

    txt(svg, cap1(s.rank_words), {x: m.l + w + 16, y: cy - 6, "text-anchor": "start",
      class: "pv-lab"});
    txt(svg, s.merit_short, {x: m.l + w + 16, y: cy + 13, "text-anchor": "start",
      class: "pv-labq"});
  });

  txt(svg, "ITS OWN LOWEST YEAR", {x: x(0), y: m.t + h + 30, "text-anchor": "start",
    class: "pv-axlab"});
  txt(svg, "ITS OWN HIGHEST YEAR →", {x: x(1), y: m.t + h + 30, "text-anchor": "end",
    class: "pv-axlab"});
}

/* Mobile is a re-layout, not a shrink. The two label columns stack above their own rail,
   and the current value joins the rank line rather than floating over the rail, where at
   358px of plot it would have sat on an endpoint label on three rows out of five. */
function drawStandMobile() {
  const W = 390, m = {t: 28, r: 16, b: 58, l: 16}, rowH = 110;
  const {svg, w} = PV.chart("stand-chart",
    {W, m, H: m.t + T.length * rowH + m.b});
  const x = p => m.l + p * w;

  STAND.forEach((t, i) => {
    const s = t.standing, y = m.t + i * rowH, col = standColor(s), ry = y + 70;
    txt(svg, t.dimension, {x: m.l, y: y + 14, "text-anchor": "start", class: "pv-lab"});
    txt(svg, `${sfmt(s, s.value)} · ${s.rank_words}`, {x: m.l, y: y + 33,
      "text-anchor": "start", class: "pv-labq", fill: col});
    txt(svg, s.merit_short, {x: m.l, y: y + 51, "text-anchor": "start", class: "pv-labq"});

    el("line", {x1: x(0), y1: ry, x2: x(1), y2: ry, stroke: "#D8D2C8", "stroke-width": 4,
      "stroke-linecap": "round"}, svg);
    [0, 1].forEach(p => el("line", {x1: x(p), y1: ry - 8, x2: x(p), y2: ry + 8,
      stroke: "#B9B3A9", "stroke-width": 2}, svg));
    const dot = el("circle", {cx: x(s.position), cy: ry, r: 8, fill: col}, svg);
    hoverable(dot, `<b>${t.dimension}</b><br>${sfmt(s, s.value)}, the ${s.rank_words}`,
      `${t.dimension}: ${sfmt(s, s.value)}, the ${s.rank_words}`);
    txt(svg, sPoint(s, "low"), {x: x(0), y: ry + 24, "text-anchor": "start",
      class: "pv-labq"});
    txt(svg, sPoint(s, "high"), {x: x(1), y: ry + 24, "text-anchor": "end",
      class: "pv-labq"});
  });

  txt(svg, "LOWEST YEAR", {x: m.l, y: m.t + T.length * rowH + 30, "text-anchor": "start",
    class: "pv-axlab"});
  txt(svg, "HIGHEST YEAR →", {x: m.l + w, y: m.t + T.length * rowH + 30,
    "text-anchor": "end", class: "pv-axlab"});
}

const SS = D.standing_summary;
document.getElementById("standlede").innerHTML =
  `The axis is a position, not a value: each measure&rsquo;s own published years, its
   lowest year at the left and its highest at the right.`;

document.getElementById("standtable").innerHTML = tableView("stand",
  "Each measure now, against the lowest and highest years of its own published run",
  ["Measure", "Now", "Its lowest year", "Its highest year", "Where it sits",
   "Better end"],
  STAND.map(t => [t.dimension, `${sfmt(t.standing, t.standing.value)} in
    ${syear(t.standing, t.standing.year)}`, sPoint(t.standing, "low"),
    sPoint(t.standing, "high"), cap1(t.standing.rank_words), t.standing.merit_short]));

document.getElementById("standsrc").innerHTML =
  `For ${WORDS[SS.with_merit.length]} of the five the right-hand end is the better one for
   the region; the fifth, ${SS.without_merit.join(" and ").toLowerCase()}, has no better
   end and is drawn grey. Each rail is one measure on one basis, recomputed from the shipped data of the page it
   links to: ${STAND.map(t => `${t.dimension.toLowerCase()}, ${t.standing.basis}`)
     .join("; ")}. The dot is placed by VALUE and the rank counts YEARS, so a measure can
   sit near the middle of its rail and still be fourth from the bottom when the years
   above it are bunched together. Both are printed rather than one being picked as the
   tidier of the two.`;

document.getElementById("standnote").innerHTML =
  `<b>A range is not a grade.</b> ${SS.not_a_grade} ${SS.not_a_score} Nobody had to choose
   this reference, which is the whole reason it is the one used: a peer region would need
   a peer set somebody picked, and a goal line would need a goal nobody has set.`;

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
        <dt>Where it stands</dt><dd><b>The ${t.standing.rank_words}.</b>
          ${sfmt(t.standing, t.standing.value)} in ${syear(t.standing, t.standing.year)},
          on ${t.standing.basis}. Its lowest published year is
          ${sPoint(t.standing, "low")} and its highest ${sPoint(t.standing, "high")}. That
          is a comparison with its own history, not with a target.</dd>
        <dt>Better direction</dt><dd>${t.standing.merit}</dd>
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
  <div class="statv flag"><div class="n">0</div>
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
   five. The page evidences three consecutive falls, so the closer says three.
   "Holding $51.0 million it has not spent" went the same way as the hero card: it stated
   a drawdown of zero for a quantity nothing published can show. The closer now says what
   the record holds and stops there. */
document.getElementById("closerline").textContent =
  `Three years smaller, paid above its towns and below its industry, holding ` +
  `${cap.value.replace("M", " million")} in signed awards no public record follows ` +
  `to the ground.`;
document.getElementById("closersub").innerHTML =
  `That is the reading on ${WORDS[T.length]} measures, none of which has a target set for
   it. Against their own published years, ${[scale, talent, pay, cap].map(standLine)
     .join(", ")}, and concentration has no better end to be read against at all. The five
   are not added into a score, because that needs weights nobody has set. ${withheld} of
   the ${D.register.possible_cells} county employment figures behind the first one are
   withheld rather than small, and the degree figure is the one to watch and the one to
   trust least: it is ${WORDS[D.asof.qcew_year - D.asof.ipeds_year]} years behind
   everything else here.`;

document.getElementById("lagsub").textContent =
  `${WORDS[D.asof.qcew_year - D.asof.ipeds_year]} years`;

/* -------------------------------------------------------------------------- assemble */
const redraw = () => { drawStand(); drawMove(); };
redraw();
MOBILE.addEventListener ? MOBILE.addEventListener("change", redraw)
                        : MOBILE.addListener(redraw);

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
