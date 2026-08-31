/* The polymer price chain, re-read as one question: squeeze or windfall, by seat.
   Forms follow the jobs: retracement is a SHARE of a known whole, so it gets a bar
   against a full-width track (with the one overshoot marked honestly, not clamped);
   the level histories are change-over-time on a common rebased scale, so they get
   lines with a story/context hierarchy; the spread is one derived quantity around a
   zero baseline, plus the same computation one link up as its only fair comparator.
   The seat selector re-emphasizes; it never recomputes, so the claims harness guards
   the default state and the data ingredients each variant sentence is built from.
   Every chart re-lays itself out per form below 760px: no sideways-scroll hint,
   evidence in the first paint. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, CAT, GRAY, INK} = PV;
const D = await PV.data("scissors.json");
const S = D.series;

const STAGE = {feedstock: {c: "#A32A78", n: "Feedstock"},
               resin:     {c: CAT[1],    n: "Resin"},
               product:   {c: "#008BA8", n: "Product"},
               context:   {c: GRAY,      n: "Context"}};
const pct = v => (v * 100).toFixed(0) + "%";
const mon = d => d.slice(0, 7);
const M3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MF = ["January","February","March","April","May","June","July","August",
            "September","October","November","December"];
const mon3 = d => `${M3[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
const monF = d => `${MF[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
/* ONE DECIMAL, NOT ZERO, ON THE GAP. The whole-number form printed −23, +23 and +14 for
   three values that are really −22.50, +22.50 and +14.32, and a reader who subtracted the
   140 and 125 on the charts got 15 and stopped trusting the page. The decimal does two
   jobs: it stops the page publishing three different quantities as "23", and it signals
   at a glance that the gap is not the difference of two rounded integers. The rounding
   step itself is stated in full in the reconciliation block under the gap lede. */
const sp = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1);
const vsB = i => (i >= 100 ? "+" : "−") + Math.abs(i - 100).toFixed(0) + "%";

/* Series, by hand so a lineup change fails loudly rather than silently reshuffling. */
const gas = S.find(s => /natural gas/i.test(s.label));
const crude = S.find(s => /crude oil/i.test(s.label));
const elec = S.find(s => /electricity/i.test(s.label));
const resinMfg = S.find(s => s.label === "PPI: plastics material and resin manufacturing");
const resinsMat = S.find(s => s.label === "PPI: plastics resins and materials");
const prodMfg = S.find(s => s.label === "PPI: plastics and rubber products manufacturing");
const prodRP = S.find(s => s.label === "PPI: rubber and plastic products");
const chem = S.find(s => /industrial chemicals/i.test(s.label));

/* Label strings are editorial text: hand-shortened, never machine-truncated.
   NAMED BY WHAT THEY MEASURE, NOT BY THE ORDER OF THE FEDERAL WORDS. The old short
   labels were "Plastics resins & materials" against "Resin manufacturing", and
   "Rubber & plastic products" against "Plastics & rubber products mfg": each pair a
   word-order shuffle of the other, so a reader could not tell which two of the four fed
   the +14 gap — the exact thing the gap's arithmetic hinges on. The federal statistics
   measure resin twice and finished products twice, once from the industries that make
   them and once as goods traded on the open market, and the labels now say which is
   which. The two "from its/their makers" series are the pair every subtraction on this
   page uses, and the desktop ladder tags them again under the bar. */
const SHORT = {
  "Henry Hub natural gas spot": "Henry Hub natural gas",
  "Crude oil, WTI spot": "Crude oil (WTI)",
  "Ohio industrial electricity price": "Ohio industrial electricity",
  "PPI: plastics resins and materials": "Resin, as a commodity",
  "PPI: plastics material and resin manufacturing": "Resin, from its makers",
  "PPI: rubber and plastic products": "Products, as a commodity",
  "PPI: plastics and rubber products manufacturing": "Products, from their makers",
  /* The comparator. It is never drawn as a level, only subtracted from resin, but it now
     has to name itself in the level table, the spread key and the spread table. */
  "PPI: industrial chemicals": "Industrial chemicals"};
const TINY = {
  "Henry Hub natural gas spot": "Henry Hub gas",
  "Crude oil, WTI spot": "Crude oil (WTI)",
  "Ohio industrial electricity price": "Ohio industrial power",
  "PPI: plastics resins and materials": "Resin, as a commodity",
  "PPI: plastics material and resin manufacturing": "Resin, from its makers",
  "PPI: rubber and plastic products": "Products, as a commodity",
  "PPI: plastics and rubber products manufacturing": "Products, from their makers",
  "PPI: industrial chemicals": "Industrial chemicals"};
/* The two series every subtraction on this page is built from. */
const INGAP = new Set(["PPI: plastics material and resin manufacturing",
                       "PPI: plastics and rubber products manufacturing"]);

/* ------------------------------------------------------------- derived facts */
const byDate = s => Object.fromEntries(s.points.map(p => [p.date, p.index]));
const PM = byDate(prodMfg), RM = byDate(resinMfg), CH = byDate(chem);
const sdates = prodMfg.points.map(p => p.date).filter(d => d in RM);
const spr = sdates.map(d => ({date: d, v: PM[d] - RM[d]}));
const cdates = resinMfg.points.map(p => p.date).filter(d => d in CH);
const comp = cdates.map(d => ({date: d, v: RM[d] - CH[d]}));
const last = spr.at(-1);
const sPeak = spr.reduce((a, b) => b.v > a.v ? b : a);
const sTrough = spr.reduce((a, b) => b.v < a.v ? b : a);
const cPeak = comp.reduce((a, b) => b.v > a.v ? b : a);
/* The near-closure. The cushion this page is about fell to +0.7 in May 2026 and the
   chart drew that while the prose called it "easing"; the month is now derived here so
   the callout, the verdict and the closer all read it off the series rather than off
   each other. `sDip` is the lowest month of the last two years, which is the window the
   reader is looking at on the right of the chart. How thin the whole post-2022 run is
   (three months under a point, the last of them this one) is asserted in claims.json,
   which recomputes it from the shipped file rather than trusting this line. */
const sDip = spr.slice(-24).reduce((a, b) => b.v < a.v ? b : a);
/* What closed it: the resin index's own two-month move into the dip month. */
const sDipResin = RM[sDip.date] - RM[sdates[sdates.indexOf(sDip.date) - 2]];
const rows = S.filter(s => s.retraced !== null && s.stage !== "context")
              .sort((a, b) => b.retraced - a.retraced);

/* ------------------------------------------------------ nominal, and what that costs
   THE OMISSION THIS PAGE SHIPPED FOR TWO DAYS. Every series here is nominal, and the page
   never once said the word. Over 2019 to 2026 consumer prices rose about a quarter, so
   "+40%", "a record high" and "somebody banked it" all read as real gains to a reader
   with no reason to think otherwise, and the moral sentence rested on an unstated
   assumption.

   WE PUBLISH NOMINAL, AND SAY SO. A producer price index is a nominal measure, and both
   of the units this page builds on top of it are defined on the nominal series: the share
   of a rise given back, and the gap between two same-based indexes. Deflating them all
   would be a different page. The reason the comparison still stands is that the finding
   is an ORDERING between links of one chain, and every link is deflated by the same
   general inflation, so the ranking survives. That is checked, not assumed:
   cs-nominal-ordering-holds re-runs the whole ladder in real terms and fails if the
   stage ordering breaks.

   What deflating does change is any single level read as a gain, so the two readings that
   move most are published in the hero, next to the cards that assert them.

   THE DEFLATOR IS COARSE AND THE PAGE SAYS SO. data/scissors.json ships the CPI-U annual
   averages, the same table federal-money uses to restate dollars. Annual, not monthly, and
   it stops at 2025, so a 2026 month is deflated by the 2025 factor. That UNDERSTATES the
   adjustment by whatever prices have done since, which makes every real figure here an
   upper bound: the real gain is at most what is printed, and the real retracement at
   least. Stated that way the coarseness cannot flatter the page. */
const CPI = D.deflator.values;
const CPIB = CPI[D.deflator.base_year];
const CPIL = D.deflator.latest_year;
/* Clamped, not extrapolated: a year past the table takes the last real average rather
   than a guess, and the direction of that error is stated above and on the page. */
const defl = d => CPI[d.slice(0, 4) in CPI ? d.slice(0, 4) : CPIL] / CPIB;
const realPts = s => s.points.filter(p => p.date >= s.base)
                             .map(p => ({date: p.date, v: p.index / defl(p.date)}));
const realNow = s => s.now.index / defl(s.now.date);
const realPeak = s => realPts(s).reduce((a, b) => b.v > a.v ? b : a);
/* The deflated retracement itself is NOT computed here, because nothing on the page
   prints it. It is computed inside cs-nominal-ordering-holds, which is the only place it
   is needed: as an assertion that the stage ordering survives deflation. A second
   implementation in app.js would be a number nobody reads and a check nobody runs. */
const INFL = (CPI[CPIL] / CPIB - 1) * 100;
{
  const pk = realPeak(prodMfg);
  document.getElementById("realnote").innerHTML =
    `<b>These are cash prices, before inflation.</b> Every series here is money actually
     invoiced, indexed to January 2019 and never adjusted for the general rise in prices
     since; on the consumer price index (BLS CPI-U, all items) consumer prices themselves
     rose ${INFL.toFixed(1)}% between the ${D.deflator.base_year} and ${CPIL} annual
     averages. The ordering below survives that, because every link faces the same
     inflation, and it was rechecked on the deflated series rather than assumed. Single
     levels do not survive it: in real terms finished
     products are up about ${(realNow(prodMfg) - 100).toFixed(0)}% rather than
     ${(prodMfg.now.index - 100).toFixed(0)}%, their dearest month was ${monF(pk.date)}
     and not the latest one, and resin is back to roughly its January 2019 price
     (${realNow(resinMfg).toFixed(0)} on the same scale, against
     ${resinMfg.now.index.toFixed(0)} in cash). The deflator, its limits and the arithmetic
     are in the methodology box.`;
}

/* ------------------------------------------------------------------- hero stats
   Plain reading leads; the technical figure is the sub-line. Each card also says which
   way is GOOD, which is a separate obligation from which way is up: a naive reader can
   read "+40%" perfectly and still not know whether it is the page's good news or its
   bad news, and on this page the honest answer is that it depends on the seat. The
   fourth card is the page's hardest number and gets the whole sub-line for its plain
   reading, because this is where a reader meets it first — five screens before the
   section that explains it. */
PV.figures([
  ["key", vsB(gas.now.index), "gas, against January 2019",
   `cheaper than before the 2022 spike: the buyer’s win, the seller’s lost windfall. The
    whole rise given back, and then some (${pct(gas.retraced)})`],
  ["", vsB(resinMfg.now.index), "resin, against January 2019",
   `the middle seat: about a third of the rise given back, the rest still on the
    invoice`],
  ["", vsB(prodMfg.now.index), "products, against January 2019",
   `nothing given back in cash, and this month is the dearest on record here: the
    seller’s win`],
  ["", sp(last.v), "points, products over resin",
   `since 2019 product prices have grown ${Math.abs(last.v).toFixed(1)} percentage points
    more than resin prices; in the 2021 squeeze they trailed by
    ${Math.abs(sTrough.v).toFixed(1)}. A gap between two indexes, not a profit margin.`]
]);

/* The vignette stat band: one part, priced at three moments, from the same indexes. */
document.getElementById("v0").textContent = "$" + (PM["2019-01-01"] / 100).toFixed(2);
document.getElementById("v1").textContent = "$" + (PM["2021-08-01"] / 100).toFixed(2);
/* Both legs of the subtraction, not just the resin one: the band's whole point is the
   distance between what the part billed and what its resin cost, and a reader given only
   one of the two numbers cannot see the gap the rest of the page is about. */
document.getElementById("v1d").textContent =
  `resin up ${(RM["2021-08-01"] - 100).toFixed(0)}%, the part up ` +
  `${(PM["2021-08-01"] - 100).toFixed(0)}%: the squeeze`;
document.getElementById("v2").textContent = "$" + (prodMfg.now.index / 100).toFixed(2);
document.getElementById("v2k").textContent = monF(prodMfg.now.date);
document.getElementById("v2d").textContent =
  `resin up ${(RM[prodMfg.now.date] - 100).toFixed(0)}%, the part up ` +
  `${(prodMfg.now.index - 100).toFixed(0)}%, gas ` +
  `${(100 - gas.now.index).toFixed(0)}% below its 2019 price`;

/* ------------------------------------------------------------- the reconciliation
   The page's second-most-prominent number could not be reproduced from any pair of
   figures the page printed. Product reads 140 on the line chart, +40% on the ladder and
   $1.40 in the vignette; resin reads 125 and +25%; 140 − 125 is 15, and the page said
   14. It was right — 139.76 − 125.44 = 14.32 — but a reader who checks and finds a gap
   stops trusting everything else, and this page's whole standing is that it can be
   checked. So the hidden step is now written out where the subtraction is invited, with
   both legs at the precision that makes it close, both moments the page quotes, and the
   wrong subtraction named before the reader performs it. Every figure here is read off
   the shipped series; nothing is typed. */
{
  /* Typeset minus, not hyphen: the rest of the page signs its numbers with U+2212 and a
     block whose whole job is "check this subtraction" cannot be the one place that
     switches glyph mid-sum. */
  const r2 = v => (v < 0 ? "−" : "") + Math.abs(v).toFixed(2);
  const tD = sTrough.date, nD = last.date;
  const rp = Math.round(PM[nD]), rr = Math.round(RM[nD]);
  document.getElementById("gapmath").innerHTML =
    `<b>Where the ${Math.abs(last.v).toFixed(1)} comes from.</b> In ${monF(nD)} the two
     indexes stand at ${r2(PM[nD])} and ${r2(RM[nD])}: a gap of ${r2(last.v)} points. In
     ${monF(tD)} they stood at ${r2(PM[tD])} and ${r2(RM[tD])}, a gap of ${r2(sTrough.v)}.
     Everywhere else this page rounds those same indexes (to ${rp} and ${rr} today), and
     rounded numbers do not subtract: ${rp} − ${rr} comes to ${rp - rr}, which is a point
     of rounding, not a second measurement. The gap is always taken from the full values.
     One more subtraction the headline invites and does not mean: going from
     ${sp(sTrough.v)} to ${sp(last.v)} is a swing of ${(last.v - sTrough.v).toFixed(1)}
     points in the parts maker’s favour, not a shrinking from
     ${Math.abs(sTrough.v).toFixed(1)} to ${Math.abs(last.v).toFixed(1)}.`;
}

/* --------------------------------------------------------- seat selector + verdict
   Lookup-rung interaction: the page re-tells its story from the reader's seat. The
   selector only re-emphasizes and restates; it never recomputes a chart. */
let SEL = null;
function verdict() {
  const v = document.getElementById("verdict");
  if (!SEL) v.innerHTML = `<b>The whole chain:</b> gas sellers have given back the whole
    rise, resin makers about a third, and product makers none of it. Tap a seat to
    re-read the charts from it.`;
  else if (SEL === "feedstock") v.innerHTML = `<b>Feedstock:</b> the windfall reversed.
    Gas peaked at nearly three times its January 2019 level in ${mon3(gas.peak.date)} and
    now sits ${(100 - gas.now.index).toFixed(0)}% below it: the whole rise given back,
    and then some (${pct(gas.retraced)}). Ohio industrial power is the exception: still up
    ${(elec.now.index - 100).toFixed(0)}%, and its peak was this January.`;
  else if (SEL === "resin") v.innerHTML = `<b>Resin:</b> the middle seat. Your output
    crested at about ${vsB(Math.max(resinsMat.peak.index, resinMfg.peak.index))} across
    2021 and 2022, gave back about a third, and still runs
    ${vsB(resinMfg.now.index)}. Your own version of the gap, resin against industrial
    chemicals, opened to ${sp(cPeak.v)} points of extra price growth in
    ${mon3(cPeak.date)} and has unwound to just below zero: the shortage windfall did not
    keep.`;
  else v.innerHTML = `<b>Finished products:</b> the winning seat, on these two indexes.
    Your main input gave back about a third of its rise; your output gave back none in cash
    and sits at its peak. Your prices have risen ${sp(last.v)} percentage points more than
    resin since 2019, against ${sp(sTrough.v)} at the bottom of the 2021 squeeze, though
    the gap came within a point of closing in ${monF(sDip.date)}, and it is not a margin:
    labor, freight, energy and packaging are in neither series.`;
}
{
  const host = document.getElementById("csel");
  const seats = [["The whole chain", null], ["Feedstock", "feedstock"],
                 ["Resin", "resin"], ["Finished products", "product"]];
  seats.forEach(([label, key]) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label;
    b.setAttribute("aria-pressed", String(key === SEL));
    b.addEventListener("click", () => {
      SEL = (SEL === key) ? null : key;
      host.querySelectorAll("button").forEach((x, i) =>
        x.setAttribute("aria-pressed", String(seats[i][1] === SEL)));
      verdict(); drawAll();
    });
    host.appendChild(b);
  });
}
verdict();

const MOBILE = matchMedia("(max-width: 760px)");
/* A paper plate behind a label that must cross other ink. The text is tagged
   data-pv-plated so the collision gate reads the cover as deliberate. */
const plated = (svg, s, a, fs = 7.4) => {
  el("rect", {x: (a["text-anchor"] === "end" ? a.x - s.length * fs - 3
                 : a["text-anchor"] === "middle" ? a.x - s.length * fs / 2 - 3
                 : a.x - 3),
              y: a.y - 12, width: s.length * fs + 6, height: 15,
              fill: "var(--paper)", opacity: .93, rx: 2}, svg);
  return txt(svg, s, Object.assign({"data-pv-plated": "1"}, a));
};

/* THE PHONE CANVASES ARE SPACED FROM THE MEASURED LINE BOX, NOT FROM A GUESSED LEADING.
   All nine text-over-text pairs the width sweep found on this page were one defect said
   nine times: a label and the line under it, both anchored at the same x, separated by a
   leading constant chosen against the DESKTOP face. Below 760px the shared sheet raises
   .pv-lab to 16px and .pv-labq / .pv-tick to 15.5px, and a face that size occupies a
   measured 18.75 units from ascender to descender. The three mobile draws were carrying
   16, 16 and 13 units of lead, so every stacked pair overlapped by 2.75 to 5.75 units by
   construction, at every width in the band.

   It looked like a narrow-screen bug and is not. These canvases keep a fixed 375-unit
   viewBox against a column of viewport minus 40, so the scale runs 0.85 at 360 up to 1.92
   at 760, and the same overlap in user units arrives as a different pixel count at each
   width: under the gate's 3px floor below about 415px, over it above. Nothing about the
   overlap changed across the band; only whether the gate could see it.

   So nothing below is a constant. face() reports the ascent and descent of a live face in
   the viewBox's own units, and every stacked baseline, row height and canvas height is
   derived from it. A breakpoint here would be a guess about a box nobody had measured.
   Pre-existing; found by collide.mjs --sweep on 2026-08-28. */
/* On the baseline, not parked off-canvas: getBBox reports the box in the viewBox's own
   coordinates, so a probe drawn at y = -999 returns an ascent of 1014. */
const face = (svg, cls) => {
  const n = txt(svg, "Hg$0", {x: 0, y: 0, class: cls});
  const b = n.getBBox();
  svg.removeChild(n);
  return {up: -b.y, down: b.y + b.height};
};
/* Baseline to baseline for a pair of lines that stack, plus a little air. */
const lead = (upper, lower, air = 3) => upper.down + lower.up + air;

const dimStage = stage => SEL && stage !== SEL;

/* ==================================================== 0. THE COLD OPEN, IN THE HERO
   The headline claim, drawn, before a word of explanation. This page opened on 1,886px
   of headline, standfirst, byline and stat cards, so a reader scrolled two full screens
   before meeting a single mark. The stat cards are not the problem and have not moved:
   moving them out was tried on another page here and made the first screen worse, so
   the hero gains a graphic instead of losing its numbers.

   THREE PRICES, ONE AXIS, TWO MOMENTS EACH — and deliberately a POORER view than
   anything below it, never a smaller copy of one. The ladder carries all seven series
   and a different measure entirely (the SHARE of the run-up given back); the line chart
   carries eight series across every month since 2015; the spread chart carries a derived
   difference. This strip has one link per stage — no crude, no electricity, no commodity
   twins, no history, no seat — and says one thing: the ring is where the price got to,
   the dot is where it is now, and the gap between them is how much came back off. Its
   whole job is to put that shape in the first screen and hand the reader on.

   Every value is read off the shipped series (s.peak.index, s.now.index) through the
   page's own vsB(), so a revision to scissors.json moves the marks and their labels
   together. Nothing here is typed, including which row is still sitting at its peak:
   that is a date comparison, so if products ever come off the top the strip stops
   saying they have not.

   IT DOES NOT ANSWER THE SEAT SELECTOR. The selector sits below it and re-reads charts
   the reader has already been shown; a strip met before any explanation has nothing to
   re-emphasize, so drawOpen ignores SEL by construction. */

/* COLOUR ON THE DARK HERO. The ground is var(--ink) #0C6473 and this page's own chart
   inks die on it: feedstock #A32A78 measures 1.02:1, resin #C85F0C 1.65:1, product
   #008BA8 1.70:1 — all three under even the 3:1 floor for a mark, let alone the 4.5:1
   for text. Each is lightened here and nowhere else, keeping its hue so the stage
   mapping a reader learns in the hero is the one the ladder repeats: feedstock #F4C8E6
   at 4.62:1, resin #FFCF8C at 4.72:1, product #A5E6F3 at 4.93:1. Every one clears the
   text floor, because each carries its row's name as well as its marks.

   THE 100 REFERENCE TAKES THE LIME, NOT --hover, AND THAT IS A DELIBERATE DEVIATION
   from the ladder below, where the same reference is plum. Lightened enough to be
   legible on this ground, --hover (#995480) lands within a few points of the lightened
   feedstock plum, and a reference line a reader can mistake for a data series is worse
   than a reference hue that changes between the hero and the first band. Lime is
   already this hero's own emphasis ink (the headline's <em>) and encodes no series
   anywhere on the page. #CFE85C measures 4.97:1; var(--lime) itself is 4.12:1, which
   clears the mark floor but not the text floor its label needs. O_KEY #C6E2E6 is the
   standfirst's own ink at 5.00:1, and white is 6.80:1. */
const O_HUE = {feedstock: "#F4C8E6", resin: "#FFCF8C", product: "#A5E6F3"};
const O_REF = "#CFE85C", O_KEY = "#C6E2E6";
/* One link per stage, in chain order, so the strip reads wellhead to warehouse. The two
   PPI series are the makers' pair — the same two every subtraction on this page uses. */
const OPEN = [gas, resinMfg, prodMfg];
const f0 = v => v.toFixed(0);
const atPeak = s => s.peak.date === s.now.date;
/* One wording for all three rows, so the reader compares three readings of the same
   shape rather than three sentences. On the product row it prints the same number twice,
   which is the finding said in the plainest way the strip can say it; the interpretation
   goes on the chart, next to the mark, rather than into this line. */
const openRead = s => `${f0(s.peak.index)} at its peak, ${f0(s.now.index)} now`;

function drawOpen() {
  const host = document.getElementById("open");
  if (!host) return;
  /* THE VIEWBOX IS THE MEASURED TEXT RAIL IN REAL CSS PIXELS, NOT A CONSTANT. A fixed
     unit count on a fluid rail is a scale factor in disguise: 700 units squeezed into a
     350px column paints a 15-unit label at 7.5px, and a chart built that way passed this
     project's text gate at 1440 AND at 390 while painting 10.0px labels everywhere
     between 761 and 899, because only the two ends were ever sampled. Sizing the box to
     the rail makes the render scale exactly 1, so a 15-unit label is 15px at every
     width by construction. Verify: node tools/textsize.mjs --sweep cost-scissors. */
  const W = Math.round(host.parentElement.getBoundingClientRect().width);
  if (!W) return;
  /* NO LEFT MARGIN, ON PURPOSE. The strip's block sits on the text rail, but its INK is
     what a reader compares to the headline above it, and an inset of even a dozen units
     puts the strip's first word off the rail every other line on this page sits on. The
     marks are kept off the edge by the domain's own padding below, not by a margin, so
     the type and the prose share one left edge exactly. The two units on the right are
     insurance against a right-anchored string ending a hair past the viewBox. */
  const m = {r: 2, l: 0}, w = W - m.l - m.r;
  /* PV.chart is used for its title-safe clear (it keeps the first ELEMENT child, so an
     indented <title> survives the redraw). Its height is provisional: the real one is
     not known until the strings have been measured, so the viewBox is set again below. */
  const {svg} = PV.chart("open", {W, H: 10});

  const HEAD = {"font-size": 16, "font-weight": 900, fill: "#fff"};
  const SUBA = {"font-size": 14, fill: O_KEY};
  const NAME = {"font-size": 15, "font-weight": 900};
  const READ = {"font-size": 14, "font-weight": 700, fill: O_KEY};
  const TICK = {"font-size": 14, "font-weight": 700, fill: O_KEY};

  /* WHETHER TWO STRINGS FIT IS A QUESTION ABOUT RENDERED LENGTHS, NOT ABOUT THE
     VIEWPORT, so nothing below is switched on a hard-coded breakpoint. Every line here
     is packed by measurement, and the row layout stacks or does not stack on the same
     evidence. getComputedTextLength reports user units, which at scale 1 are the pixels
     the reader gets. */
  const measure = (s, a) => {
    const n = txt(svg, s, Object.assign({x: 0, y: -90}, a));
    const len = n.getComputedTextLength();
    svg.removeChild(n);
    return len;
  };
  const wrapText = (s, a, max) => {
    const out = [];
    let cur = "";
    for (const word of s.split(" ")) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && measure(next, a) > max) { out.push(cur); cur = word; }
      else cur = next;
    }
    if (cur) out.push(cur);
    return out;
  };

  const READING = `Gas now costs ${vsB(gas.now.index)} against January 2019. Finished ` +
                  `products, ${vsB(prodMfg.now.index)}.`;
  /* The strip has to be readable cold, so it says what its two marks are and what its
     one axis means in its own labels: a reader meets this before the standfirst has
     explained a single thing, and an index is the most common place a page becomes
     unreadable while every number in it is correct. */
  const SUBTEXT = "The ring is each price at its peak, the dot is today. A long line is " +
                  "a price that came a long way back.";
  const DIRTEXT = "Further left is a lower price: at 100 it is back to what it cost in " +
                  "January 2019.";
  const headL = wrapText(READING, HEAD, w);
  const subL = wrapText(SUBTEXT, SUBA, w);
  const dirL = wrapText(DIRTEXT, SUBA, w);

  /* A row sets its name and its reading on ONE baseline at opposite ends, which is the
     house idiom, and stacks them when the measured pair cannot clear a 24-unit gutter.
     One row deciding for all three: three rows at two different heights would read as
     three different things rather than one comparison. */
  const stack = OPEN.some(s => measure(SHORT[s.label], NAME) + 24 +
                               measure(openRead(s), READ) > w);
  /* PROXIMITY DECIDES WHICH LABEL A MARK BELONGS TO, and the first draft got the grouping
     backwards on the wide rendering: 20 units from a row name down to its own marks, 26
     from those marks on to the NEXT name, and only 24 from the last row's marks to the
     axis rule. A reader reported the products row as a legend rather than as a row, which
     is exactly what that spacing says. The arm is shortened so a mark sits nearer its own
     name than the next one, and the axis is pushed further down so the bottom row's marks
     stop reading as axis furniture. Stacked rows already carry their reading between the
     name and the marks, so their arm is left alone. */
  const rowH = stack ? 62 : 46, ARM = stack ? 48 : 27;
  const top = 18 + (headL.length - 1) * 22 + subL.length * 19 + 14;
  const AXIS = top + 2 * rowH + ARM + 42;
  const H = AXIS + 40 + dirL.length * 18;

  /* Domain from the data, with a little air at each end so no mark is drawn on an edge.
     It is anchored at neither 0 nor 100: these are POSITIONS on a rebased scale, not
     lengths, and 100 — the only anchor that means anything here — is drawn and labelled
     rather than assumed. */
  const vals = OPEN.flatMap(s => [s.peak.index, s.now.index]);
  const LO = Math.min(...vals) - 9, HI = Math.max(...vals) + 11;
  const X = v => m.l + (v - LO) / (HI - LO) * w;

  headL.forEach((s, i) => txt(svg, s, Object.assign({x: m.l, y: 18 + i * 22}, HEAD)));
  subL.forEach((s, i) => txt(svg, s,
    Object.assign({x: m.l, y: 18 + (headL.length - 1) * 22 + 22 + i * 19}, SUBA)));

  OPEN.forEach((s, i) => {
    const y0 = top + i * rowH, c = O_HUE[s.stage], y = y0 + ARM;
    txt(svg, SHORT[s.label], Object.assign({x: m.l, y: y0 + 12}, NAME, {fill: c}));
    txt(svg, openRead(s), stack ? Object.assign({x: m.l, y: y0 + 31}, READ)
      : Object.assign({x: m.l + w, y: y0 + 12, "text-anchor": "end"}, READ));
    const px = X(s.peak.index), nx = X(s.now.index);
    /* The connector is the finding: its length IS how far the price came back. A row
       with no connector is a price that has not moved, which is the other half of the
       headline, so the zero-length case is left empty and named instead of faked. */
    if (Math.abs(nx - px) > 1)
      el("line", {x1: px, y1: y, x2: nx, y2: y, stroke: c, "stroke-width": 2.4,
        "stroke-linecap": "round"}, svg);
    el("circle", {cx: px, cy: y, r: 6.5, fill: "none", stroke: c, "stroke-width": 2}, svg);
    el("circle", {cx: nx, cy: y, r: 4, fill: c}, svg);
    /* The one row whose ring and dot are the same mark, said in words next to it: a
       reader cannot be asked to notice an absence. */
    if (atPeak(s))
      txt(svg, "still at its peak", Object.assign({x: nx + 13, y: y + 5},
        {"font-size": 14, "font-weight": 700, fill: c}));
  });

  /* THE 100 REFERENCE IS DRAWN AS ONE SEGMENT PER ROW, not one full-height rule, and in
     its own pass so it is never buried under a connector. Run edge to edge it would pass
     straight through every row name: the names start at the left margin and 100 lands
     about fifty units in, so here a data-positioned rule and a margin-positioned label
     meet at EVERY width, not merely at some. The last segment carries on down to the
     axis, where the tick it belongs to is labelled in the same ink. */
  OPEN.forEach((_, i) => {
    const y = top + i * rowH + ARM;
    el("line", {x1: X(100), y1: y - 11, x2: X(100),
      y2: i === OPEN.length - 1 ? AXIS : y + 11, stroke: O_REF, "stroke-width": 2}, svg);
  });

  el("line", {x1: m.l, y1: AXIS, x2: m.l + w, y2: AXIS,
    stroke: "rgba(255,255,255,.32)", "stroke-width": 1}, svg);
  /* Ticks come off the shared tick maker rather than a typed list, so a revision that
     moves the domain moves them, and they skip anything near 100: parity has the lime
     rule and its own label, and a grey tick beneath it would print the same number
     twice in two inks. */
  ticks(LO, HI, 5).filter(v => v > LO && v < HI && Math.abs(v - 100) > 20).forEach(v =>
    txt(svg, f0(v), Object.assign({x: X(v), y: AXIS + 20, "text-anchor": "middle"}, TICK)));
  txt(svg, "100", Object.assign({x: X(100), y: AXIS + 20, "text-anchor": "middle"},
    TICK, {fill: O_REF}));
  dirL.forEach((s, i) => txt(svg, s,
    Object.assign({x: m.l, y: AXIS + 44 + i * 18}, SUBA)));

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
}

/* ------------------------------------------------------------ 1. the ladder */
function drawLadder() { MOBILE.matches ? drawLadderMobile() : drawLadderDesktop(); }

function drawLadderDesktop() {
  /* The right gutter is wider than the bars strictly need. The two numbers beside each
     bar answer DIFFERENT questions — how much of the run-up came off, and where the
     price stands now — and at "104% back / now −7% vs 2019" they read as one question
     asked twice. The gutter now carries enough room to say which is which. */
  const {svg, W, m, w, h} = PV.chart("ladder",
    {W: 1100, rows: rows.length, rowH: 42, m: {t: 56, r: 232, b: 56, l: 260}});
  const DOM = 1.08;                       // domain runs past 100% so the gas
  const xs = v => m.l + Math.min(v, DOM) / DOM * w;   // overshoot is drawn, not clipped
  frame(svg, {x: m.l, y: m.t, w, h, xs: v => xs(v), ys: () => 0, yt: [],
    xt: [0, .25, .5, .75, 1], xfmt: pct,
    xlab: "still holds its whole run-up ←   →   gave the whole run-up back"});
  el("line", {x1: xs(1), y1: m.t - 10, x2: xs(1), y2: m.t + h, stroke: "var(--hover)",
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  txt(svg, "100% = back to the January 2019 price; past it, cheaper than before",
    {x: xs(1) + 6, y: m.t - 16, "text-anchor": "end", class: "pv-lab",
     fill: "var(--hover)"});
  rows.forEach((s, i) => {
    const g = el("g", dimStage(s.stage) ? {opacity: .18} : {}, svg);
    const y = m.t + i * 42 + 8, bh = 24, c = STAGE[s.stage].c;
    el("rect", {x: m.l, y, width: xs(1) - m.l, height: bh, fill: "#EDE9E2", rx: 4}, g);
    el("rect", {x: m.l, y, width: Math.max(3, xs(s.retraced) - m.l), height: bh,
      fill: c, rx: 4}, g);
    txt(g, SHORT[s.label], {x: m.l - 14, y: y + bh - 6, "text-anchor": "end",
      class: "pv-lab"});
    /* The stage line also tags the two series the page's arithmetic subtracts, so a
       reader looking at four near-twin names can see which pair makes the +14.3. The tag
       used to read IN THE GAP, which names a thing three sections below it: a reader met
       the term here and could not decode it until the spread chart. It now names the pair
       the lede one paragraph up has just defined. */
    txt(g, STAGE[s.stage].n.toUpperCase() +
           (INGAP.has(s.label) ? " · THE MAKERS’ PAIR" : ""),
      {x: m.l - 14, y: y + bh + 9, "text-anchor": "end", class: "pv-labq", fill: c});
    txt(g, `${pct(s.retraced)} of its rise given back`,
      {x: m.l + w + 12, y: y + bh - 12, class: "pv-lab"});
    txt(g, `price now ${vsB(s.now.index)} vs 2019`,
      {x: m.l + w + 12, y: y + bh + 5, class: "pv-labq"});
    /* The row that breaks the ladder, annotated ON the chart. The section headline
       promises a ladder by chain position and the bars are sorted by value, so this
       FEEDSTOCK row sits below both RESIN rows. The prose named the exception; a reader
       who scans headlines and bars never reached the prose. */
    if (s === elec)
      txt(g, "the exception: peaked in 2026, not 2022",
        {x: xs(s.retraced) + 12, y: y + bh - 7, class: "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 8, width: W, height: bh + 18,
      fill: "transparent"}, g), `<b>${s.label}</b><br>${STAGE[s.stage].n} stage<br>
      peaked at <span class="v">${s.peak.index.toFixed(1)}</span> in ${mon(s.peak.date)}<br>
      now <span class="v">${s.now.index.toFixed(1)}</span> ·
      <span class="v">${pct(s.retraced)}</span> of the rise given back`,
      `${s.label}: ${pct(s.retraced)} of its rise given back`);
  });
}

function drawLadderMobile() {
  /* THREE LINES PER ROW, NOT TWO COLUMNS. The name and the reading were set on one line
     as a left and a right column, and at 375px the longest name ran into its own reading
     — "Products, from their makers" collided with "0% back · now +40%". They are now
     stacked, which also buys the room to say what each number answers instead of hanging
     two unlike figures off the same bar. */
  const W = 375, m = {t: 68, r: 12, l: 12}, bh = 14;
  /* Provisional height: the real one is not known until the faces have been measured. */
  const {svg} = PV.chart("ladder", {W, H: 400});
  const LAB = face(svg, "pv-lab"), Q = face(svg, "pv-labq"), T = face(svg, "pv-tick");
  /* Four row-relative offsets, each hanging off the one above it: the name, its reading,
     the bar, and the height that falls out of them. The name and the reading were 16
     units apart and their boxes are 18.75 tall, which is the whole defect. */
  const nameY = LAB.up;                      // the name's baseline, row-relative
  const subY = nameY + lead(LAB, Q);         // its reading, one measured line below
  const barY = subY + Q.down + 6;            // the bar top, clear of that reading
  const rowH = Math.ceil(barY + bh + 12);    // the air between rows, not inside one
  /* The foot is two more stacked lines, so it is measured on the same terms rather than
     left on the 44 units that happened to clear the smaller desktop face by 3. */
  const tickDrop = T.up + 2;                 // the axis to the percent ticks below it
  const footDrop = tickDrop + lead(T, Q);    // and on to the reading under those
  m.b = Math.ceil(footDrop + Q.down + 4);
  const H = m.t + rows.length * rowH + m.b;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const w = W - m.l - m.r, DOM = 1.08;
  const xs = v => m.l + Math.min(v, DOM) / DOM * w;
  /* The desktop bars carry a FEEDSTOCK/RESIN/PRODUCT sublabel under every series name.
     The mobile re-layout has no room for it, so the stage-to-colour mapping got a key
     of its own here rather than arriving a chart later in the lines legend. */
  {
    let x = m.l;
    ["feedstock", "resin", "product"].forEach(k => {
      el("rect", {x, y: 12, width: 9, height: 9, rx: 2, fill: STAGE[k].c}, svg);
      txt(svg, STAGE[k].n.toUpperCase(), {x: x + 13, y: 20, class: "pv-labq"});
      /* 9.6 user units per uppercase Lato character at this size, measured off the
         render: 7.4 is the mixed-case figure and it ran the three words together. */
      x += 22 + STAGE[k].n.length * 9.6;
    });
  }
  /* The reference line is drawn ACROSS THE BARS ONLY, not the full height. Run edge to
     edge it passed straight through the last two words of every row's reading — "vs
     2019" with a dashed rule inside the digits — and the reading is what the reader is
     here for. It marks the bars, so it belongs on the bars. */
  txt(svg, "100% = back to the 2019 price", {x: xs(1), y: m.t - 10,
    "text-anchor": "end", class: "pv-labq", fill: "var(--hover)"});
  rows.forEach((s, i) => {
    const g = el("g", dimStage(s.stage) ? {opacity: .18} : {}, svg);
    const y = m.t + i * rowH, c = STAGE[s.stage].c;
    txt(g, TINY[s.label] + (INGAP.has(s.label) ? " · the makers’ pair"
                            : s === elec ? " · the exception" : ""),
      {x: m.l, y: y + nameY, class: "pv-lab"});
    txt(g, `${pct(s.retraced)} of its rise given back · now ` +
      `${vsB(s.now.index)} vs 2019`, {x: m.l, y: y + subY, class: "pv-labq"});
    el("rect", {x: m.l, y: y + barY, width: xs(1) - m.l, height: bh, fill: "#EDE9E2",
      rx: 3}, g);
    el("rect", {x: m.l, y: y + barY, width: Math.max(3, xs(s.retraced) - m.l),
      height: bh, fill: c, rx: 3}, g);
    el("line", {x1: xs(1), y1: y + barY - 4, x2: xs(1), y2: y + barY + bh + 4,
      stroke: "var(--hover)", "stroke-width": 1.2, "stroke-dasharray": "4 3"}, g);
    /* The out-of-order row is named here too: the re-layout drops the stage sublabels,
       which is exactly where a mobile reader loses the reason the bars are not a ladder.
       Centred on its own bar off the measured face, so it stays beside the mark it
       explains however tall the row becomes. */
    if (s === elec)
      txt(g, "peaked 2026, not 2022",
        {x: xs(s.retraced) + 8, y: y + barY + bh / 2 + (Q.up - Q.down) / 2,
         class: "pv-labq"});
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, g),
      `<b>${s.label}</b><br><span class="v">${pct(s.retraced)}</span> of the rise given
       back · now <span class="v">${s.now.index.toFixed(1)}</span>`,
      `${s.label}: ${pct(s.retraced)} of its rise given back`);
  });
  const ax = H - m.b;
  el("line", {x1: m.l, y1: ax, x2: W - m.r, y2: ax, stroke: "var(--pv-axis)",
    "stroke-width": 1}, svg);
  [0, .5, 1].forEach(v => txt(svg, pct(v), {x: xs(v), y: ax + tickDrop,
    "text-anchor": v ? "middle" : "start", class: "pv-tick"}));
  txt(svg, "longer bar = more of the run-up given back",
    {x: m.l, y: ax + footDrop, class: "pv-labq"});
}

/* ------------------------------------------------------------- 2. the lines */
const lineSeries = S.filter(s => s.stage !== "context");
const STORY = new Set([gas.label, resinMfg.label, prodMfg.label]);
/* A WEIGHT LADDER, not three hues. The stage colours are near-isoluminant by
   construction — product teal and resin orange differ by 0.008 in relative luminance —
   so in grayscale, in print, or for a reader with deuteranopia the three story lines
   collapse into one gray and the subtitle's "one series per chain link" stops working.
   Each link now also gets its own stroke width, ordered down the chain, and every end
   label carries a rule drawn at its series' own weight. Hue stays the primary read for
   readers who have it; weight is the read that survives when hue does not. */
const STORYWD = {product: 3.4, resin: 2.2, feedstock: 1.9};
/* FOUR GRAY LINES WERE ONE GRAY. Hue separates the three story links and weight backs it
   up, but every context series was drawn in the same 1.1-unit gray, so mid-chart the four
   of them were interchangeable and only their end labels told them apart. Crude keeps the
   solid stroke because the prose leads with it and mobile gives it its own end label; the
   other three take a dash each, so a reader can follow one line across the plot instead
   of only reading where it stops. The key below the chart already names each with the
   value it ends at, and the end-label rules carry the same dash. */
const CTXDASH = {[elec.label]: "6 3",
                 [resinsMat.label]: "2 3",
                 [prodRP.label]: "9 3 2 3"};
const dashed = (a, st) => st.dash ? Object.assign(a, {"stroke-dasharray": st.dash}) : a;
function lineStyle(s) {
  const ctx = {stroke: GRAY, lab: "var(--pv-muted)", dash: CTXDASH[s.label]};
  if (SEL) return s.stage === SEL
    ? {stroke: STAGE[s.stage].c, wd: STORYWD[s.stage] || 2.8, op: 1,
       lab: STAGE[s.stage].c}
    : Object.assign({wd: 1.1, op: .5}, ctx);
  return STORY.has(s.label)
    ? {stroke: STAGE[s.stage].c, wd: STORYWD[s.stage], op: .95, lab: STAGE[s.stage].c}
    : Object.assign({wd: 1.1, op: .75}, ctx);
}

function drawLines() { MOBILE.matches ? drawLinesMobile() : drawLinesDesktop(); }

function drawLinesDesktop() {
  /* r carries the end-label column: 14 units of stroke swatch, 6 of gap, and the widest
     hand-shortened series name. Widened by exactly the swatch so the labels start where
     they always did and nothing runs past the figure's right edge. */
  const {svg, m, w, h} = PV.chart("lines", {W: 1100, H: 460,
    m: {t: 46, r: 246, b: 62, l: 40}});
  const all = lineSeries.flatMap(s => s.points);
  const dates = [...new Set(all.map(p => p.date))].sort();
  const maxV = Math.max(...all.map(p => p.index)) * 1.04;
  const xs = d => m.l + dates.indexOf(d) / (dates.length - 1) * w;
  const ys = v => m.t + h - v / maxV * h;
  const yrs = [...new Set(dates.map(d => d.slice(0, 4)))].filter((_, i) => i % 2 === 0);
  frame(svg, {x: m.l, y: m.t, w, h, xs: d => xs(d), ys,
    xt: yrs.map(y => dates.find(d => d.startsWith(y))).filter(Boolean),
    yt: ticks(0, maxV, 6), xfmt: d => d.slice(0, 4),
    xlab: "", ylab: "cheaper than in January 2019 ↓   100   ↑ more expensive"});
  el("line", {x1: m.l, y1: ys(100), x2: m.l + w, y2: ys(100), stroke: INK,
    "stroke-width": 1.5, "stroke-dasharray": "4 3"}, svg);
  /* Context ink first, story ink over it. */
  const ord = [...lineSeries].sort((a, b) =>
    (STORY.has(a.label) ? 1 : 0) - (STORY.has(b.label) ? 1 : 0));
  const ends = lineSeries.map(s => ({s, y: ys(s.points.at(-1).index)}))
                         .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;
  ord.forEach(s => {
    const st = lineStyle(s);
    el("path", dashed({d: "M" + s.points.map(p => `${xs(p.date)},${ys(p.index)}`).join("L"),
      fill: "none", stroke: st.stroke, "stroke-width": st.wd, opacity: st.op}, st), svg);
  });
  lineSeries.forEach(s => {
    const st = lineStyle(s), e = ends.find(x => x.s === s);
    /* A rule at the series' own stroke weight AND its own dash, in front of its end
       label: the label is then bound to its line by thickness and pattern as well as by
       hue, which is the binding that survives grayscale. */
    el("line", dashed({x1: m.l + w + 4, y1: e.y, x2: m.l + w + 18, y2: e.y,
      stroke: st.stroke, "stroke-width": st.wd, opacity: st.op}, st), svg);
    txt(svg, `${s.points.at(-1).index.toFixed(0)} ${SHORT[s.label]}`,
      {x: m.l + w + 24, y: e.y + 4, class: "pv-labq", fill: st.lab});
  });
  /* Annotations last, so no series paints over them (house smell list). */
  plated(svg, "above this line, costlier than in January 2019", {x: m.l + 8,
    y: ys(100) - 8, class: "pv-lab"}, 8);
  /* Two claims, written on the chart. */
  /* "Gas tripled" was stated twice as fact and once as a chart annotation. The peak is
     283 on a base of 100, which is 2.8 times, and a reader with a ruler on this very
     chart catches it. The annotation now prints the number it is describing. */
  const gp = gas.peak;
  el("circle", {cx: xs(gp.date), cy: ys(gp.index), r: 4.5, fill: STAGE.feedstock.c,
    stroke: "var(--paper)", "stroke-width": 1.5}, svg);
  plated(svg, `${mon3(gp.date)}: gas peaks at ${gp.index.toFixed(0)}`, {x: xs(gp.date) - 10,
    y: ys(gp.index) - 1, "text-anchor": "end", class: "pv-lab",
    fill: STAGE.feedstock.c}, 8);
  plated(svg, "nearly three times its 2019 price", {x: xs(gp.date) - 10,
    y: ys(gp.index) + 13, "text-anchor": "end", class: "pv-labq"}, 7.4);
  /* The product callout sits ON its line, not 70px above it with four gray context
     series passing between the words and their target. It is bound by position first,
     a short leader second, and colour only third. */
  {
    const ad = "2024-03-01", ay = ys(PM[ad]);
    const bx = xs(ad), by = ay - 34;
    el("line", {x1: bx, y1: by + 6, x2: bx, y2: ay - 4, stroke: STAGE.product.c,
      "stroke-width": 1.2}, svg);
    plated(svg, "products plateau near +40%", {x: bx, y: by - 12,
      "text-anchor": "middle", class: "pv-lab", fill: STAGE.product.c}, 8);
    plated(svg, "and never come back down", {x: bx, y: by + 1,
      "text-anchor": "middle", class: "pv-labq"}, 7.5);
  }
  /* The winter spike. It is the second-tallest stroke on the chart after August 2022,
     and a reader tracing the round-trip claim will stop at it, so it is named at
     CONTEXT weight: it is a seasonal excursion, not a second regime. */
  {
    const wd = "2026-01-01", wp = gas.points.find(p => p.date === wd);
    const gone = gas.points.filter(p => p.date > wd).find(p => p.index < 100);
    el("circle", {cx: xs(wd), cy: ys(wp.index), r: 3.5, fill: "var(--paper)",
      stroke: "var(--pv-muted)", "stroke-width": 1.5}, svg);
    plated(svg, `${mon3(wd)}: winter spike,`, {x: xs(wd) - 9, y: ys(wp.index) - 4,
      "text-anchor": "end", class: "pv-labq"}, 7.4);
    plated(svg, `back under 100 by ${mon3(gone.date)}`, {x: xs(wd) - 9,
      y: ys(wp.index) + 10, "text-anchor": "end", class: "pv-labq"}, 7.4);
  }
  dates.forEach(d => hoverable(el("rect", {x: xs(d) - w / dates.length / 2, y: m.t,
    width: Math.max(2, w / dates.length), height: h, fill: "transparent"}, svg),
    `<b>${mon(d)}</b><br>` + lineSeries.map(s => {
      const p = s.points.find(x => x.date === d);
      return p ? `${SHORT[s.label]} <span class="v">${p.index.toFixed(0)}</span>` : "";
    }).filter(Boolean).join("<br>"), mon(d)));
}

function drawLinesMobile() {
  const W = 375, H = 310, m = {t: 42, r: 16, b: 42, l: 30};
  const {svg} = PV.chart("lines", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const all = lineSeries.flatMap(s => s.points);
  const dates = [...new Set(all.map(p => p.date))].sort();
  const maxV = Math.max(...all.map(p => p.index)) * 1.04;
  const xs = d => m.l + dates.indexOf(d) / (dates.length - 1) * w;
  const ys = v => m.t + h - v / maxV * h;
  const yrs = [...new Set(dates.map(d => d.slice(0, 4)))].filter((_, i) => i % 4 === 0);
  frame(svg, {x: m.l, y: m.t, w, h, xs: d => xs(d), ys,
    xt: yrs.map(y => dates.find(d => d.startsWith(y))).filter(Boolean),
    yt: ticks(0, maxV, 4), xfmt: d => d.slice(0, 4), xlab: "", ylab: ""});
  /* THE AXIS CORNER, STAGGERED OFF THE MEASURED BOX. frame() hangs value ticks 4 units
     under their own gridline and year ticks 20 units under the axis, which is 16 units
     between the two that meet in the corner: the zero tick and the first year. They also
     overlap horizontally by construction, because the zero tick is right-anchored 10
     units left of the plot and the first year is centred ON the plot edge, so half of
     "2015" reaches back past it whatever either string says. Vertical separation is
     therefore the only lever, and 16 units cannot hold an 18.75-unit box. The year row
     drops far enough to clear the zero tick's own descender, measured; the axis, the
     plot and every mark stay where they were. */
  {
    const T = face(svg, "pv-tick");
    const yearY = m.t + h + 4 + T.down + T.up + 3;
    svg.querySelectorAll("text.pv-tick").forEach(t => {
      if (t.getAttribute("text-anchor") === "middle") t.setAttribute("y", yearY);
    });
  }
  el("line", {x1: m.l, y1: ys(100), x2: m.l + w, y2: ys(100), stroke: INK,
    "stroke-width": 1.2, "stroke-dasharray": "4 3"}, svg);
  const ord = [...lineSeries].sort((a, b) =>
    (STORY.has(a.label) ? 1 : 0) - (STORY.has(b.label) ? 1 : 0));
  ord.forEach(s => {
    const st = lineStyle(s);
    el("path", dashed({d: "M" + s.points.map(p => `${xs(p.date)},${ys(p.index)}`).join("L"),
      fill: "none", stroke: st.stroke,
      /* Scaled, not decremented: subtracting a constant flattened the desktop weight
         ladder into a 0.2-unit spread and the grayscale separation went with it. */
      "stroke-width": Math.max(.9, st.wd * .78), opacity: st.op}, st), svg);
  });
  plated(svg, "100 = the Jan 2019 price", {x: m.l + 4, y: ys(100) + 14,
    class: "pv-labq"}, 7.6);
  /* End labels for the three chain links, plus crude. Crude is one of the four named
     characters in the opening paragraph and in the ladder lede, and the re-layout used
     to drop it into an anonymous gray squiggle among four others — a series the prose
     leads with may not be untraceable on the width most readers use. The remaining gray
     lines are named, with the value each ends at, in the key below the chart. */
  const marked = [prodMfg, resinMfg, gas, crude].map(s => ({s,
    y: ys(s.points.at(-1).index)})).sort((a, b) => a.y - b.y);
  for (let i = 1; i < marked.length; i++)
    if (marked[i].y - marked[i - 1].y < 15) marked[i].y = marked[i - 1].y + 15;
  const NAME = {[gas.label]: "gas", [resinMfg.label]: "resin",
                [prodMfg.label]: "products", [crude.label]: "crude oil"};
  marked.forEach(({s, y}) => plated(svg,
    `${s.points.at(-1).index.toFixed(0)} ${NAME[s.label]}`,
    {x: m.l + w - 2, y: y + 4, "text-anchor": "end", class: "pv-lab",
     fill: s === crude ? "var(--pv-muted)" : STAGE[s.stage].c}, 8));
  const gp = gas.peak;
  el("circle", {cx: xs(gp.date), cy: ys(gp.index), r: 3.5, fill: STAGE.feedstock.c,
    stroke: "var(--paper)", "stroke-width": 1.2}, svg);
  plated(svg, `Aug 2022: gas at ${gp.index.toFixed(0)}`, {x: xs(gp.date) - 7,
    y: ys(gp.index) + 8, "text-anchor": "end", class: "pv-lab",
    fill: STAGE.feedstock.c}, 8);
  plated(svg, "nearly triple its 2019 price", {x: xs(gp.date) - 7, y: ys(gp.index) + 23,
    "text-anchor": "end", class: "pv-labq"}, 7.4);
  /* The tall magenta stroke at the right edge. Desktop names it; mobile used to drop the
     annotation and leave an unexplained spike as the last thing on the chart, which is
     the one place a reader tracing "gas round-tripped" stops and doubts the claim. It
     hangs below its dot on a leader rather than beside it: level with the spike the
     second line ran straight through the August 2022 callout. */
  {
    const wd = "2026-01-01", wp = gas.points.find(p => p.date === wd);
    const gone = gas.points.filter(p => p.date > wd).find(p => p.index < 100);
    const ly = ys(wp.index) + 27;
    el("circle", {cx: xs(wd), cy: ys(wp.index), r: 3, fill: "var(--paper)",
      stroke: "var(--pv-muted)", "stroke-width": 1.2}, svg);
    el("line", {x1: xs(wd), y1: ys(wp.index) + 5, x2: xs(wd), y2: ly - 9,
      stroke: "var(--pv-muted)", "stroke-width": 1, "stroke-dasharray": "2 2"}, svg);
    plated(svg, "winter spike,", {x: xs(wd) - 6, y: ly, "text-anchor": "end",
      class: "pv-labq"}, 6.6);
    plated(svg, `under 100 by ${mon3(gone.date)}`, {x: xs(wd) - 6, y: ly + 15,
      "text-anchor": "end", class: "pv-labq"}, 6.6);
  }
  hoverable(el("rect", {x: m.l, y: m.t, width: w, height: h, fill: "transparent"}, svg),
    `<b>${mon(dates.at(-1))}</b><br>` + lineSeries.map(s =>
      `${TINY[s.label]} <span class="v">${s.points.at(-1).index.toFixed(0)}</span>`)
      .join("<br>"), "latest values");
}

/* ------------------------------------------------------------ 3. the spread */
function drawSpread() { MOBILE.matches ? drawSpreadMobile() : drawSpreadDesktop(); }

function spreadStyles() {
  return {
    main: SEL === "resin"
      ? {wd: 2, op: .4} : {wd: SEL === "product" ? 3 : 2.6, op: 1},
    area: SEL === "resin" ? .06 : .14,
    cmp: SEL === "resin"
      ? {stroke: CAT[1], wd: 2.6, op: 1, lab: CAT[1]}
      : {stroke: GRAY, wd: 1.8, op: .9, lab: "var(--pv-muted)"}
  };
}

function drawSpreadDesktop() {
  const {svg, m, w, h} = PV.chart("spread", {W: 1100, H: 360,
    m: {t: 48, r: 100, b: 60, l: 44}});
  const lo = Math.min(...spr.map(p => p.v), ...comp.map(p => p.v)) * 1.15;
  const hi = Math.max(...spr.map(p => p.v), ...comp.map(p => p.v)) * 1.25;
  const dates = spr.map(p => p.date);
  const xs = d => m.l + dates.indexOf(d) / (dates.length - 1) * w;
  const ys = v => m.t + h - (v - lo) / (hi - lo) * h;
  const yrs = [...new Set(dates.map(d => d.slice(0, 4)))].filter((_, i) => i % 2 === 0);
  const st = spreadStyles();
  frame(svg, {x: m.l, y: m.t, w, h, xs: d => xs(d), ys,
    xt: yrs.map(y => dates.find(d => d.startsWith(y))).filter(Boolean),
    yt: ticks(lo, hi, 7), xfmt: d => d.slice(0, 4),
    yfmt: v => (v > 0 ? "+" : "") + v.toFixed(0),
    ylab: "resin grew more since 2019 ↓   0   ↑ product prices grew more"});
  el("path", {d: "M" + spr.map(p => `${xs(p.date)},${ys(p.v)}`).join("L") +
    `L${xs(dates.at(-1))},${ys(0)}L${xs(dates[0])},${ys(0)}Z`,
    fill: `rgba(0,139,168,${st.area})`}, svg);
  el("line", {x1: m.l, y1: ys(0), x2: m.l + w, y2: ys(0), stroke: INK,
    "stroke-width": 1.5}, svg);
  plated(svg, "0 = both up the same since 2019", {x: m.l + 6, y: ys(0) - 8,
    class: "pv-labq"}, 7.4);
  el("path", {d: "M" + comp.map(p => `${xs(p.date)},${ys(p.v)}`).join("L"),
    fill: "none", stroke: st.cmp.stroke, "stroke-width": st.cmp.wd,
    opacity: st.cmp.op}, svg);
  plated(svg, `${sp(cPeak.v)} for resin makers in the shortage, unwound since`,
    {x: xs(cPeak.date), y: ys(cPeak.v) - 10, "text-anchor": "middle",
     class: "pv-labq", fill: st.cmp.lab}, 7.4);
  /* The comparator is named at its own line end, not floated in-plot: it frees the
     space under the zero line for the near-closure callout, and it makes both series
     on this chart decode the same way the lines chart's series do. */
  txt(svg, "resin vs", {x: m.l + w + 8, y: ys(comp.at(-1).v) + 1,
    class: "pv-labq", fill: st.cmp.lab});
  txt(svg, "chemicals", {x: m.l + w + 8, y: ys(comp.at(-1).v) + 15,
    class: "pv-labq", fill: st.cmp.lab});
  el("path", {d: "M" + spr.map(p => `${xs(p.date)},${ys(p.v)}`).join("L"),
    fill: "none", stroke: "#008BA8", "stroke-width": st.main.wd,
    opacity: st.main.op}, svg);
  el("circle", {cx: xs(sTrough.date), cy: ys(sTrough.v), r: 5, fill: "#008BA8",
    stroke: "var(--paper)", "stroke-width": 2}, svg);
  plated(svg, `${sp(sTrough.v)} · ${mon3(sTrough.date)}: the squeeze`,
    {x: xs(sTrough.date) + 10, y: ys(sTrough.v) + 5, class: "pv-lab",
     fill: "#008BA8"}, 8);
  el("circle", {cx: xs(sPeak.date), cy: ys(sPeak.v), r: 5, fill: "#008BA8",
    stroke: "var(--paper)", "stroke-width": 2}, svg);
  plated(svg, `${sp(sPeak.v)} · ${mon3(sPeak.date)}`, {x: xs(sPeak.date),
    y: ys(sPeak.v) - 12, "text-anchor": "middle", class: "pv-lab",
    fill: "#008BA8"}, 8);
  /* The near-closure. It is the most violent recent stroke on the chart and the one
     the title's "above zero" claim rests on, so it is annotated at story weight with a
     leader to the dot rather than left for the reader to notice and distrust. */
  el("line", {x1: xs(sDip.date), y1: ys(sDip.v) + 7, x2: xs(sDip.date),
    y2: ys(sDip.v) + 34, stroke: "#008BA8", "stroke-width": 1,
    "stroke-dasharray": "2 2"}, svg);
  el("circle", {cx: xs(sDip.date), cy: ys(sDip.v), r: 5, fill: "var(--paper)",
    stroke: "#008BA8", "stroke-width": 2}, svg);
  plated(svg, `${mon3(sDip.date)}: +${sDip.v.toFixed(1)}`,
    {x: xs(sDip.date) + 6, y: ys(sDip.v) + 46, "text-anchor": "end",
     class: "pv-lab", fill: "#008BA8"}, 8);
  plated(svg, "resin spiked; the cushion nearly closed",
    {x: xs(sDip.date) + 6, y: ys(sDip.v) + 60, "text-anchor": "end",
     class: "pv-labq"}, 7.4);
  txt(svg, `${sp(last.v)} now`, {x: m.l + w + 8, y: ys(last.v) + 4,
    class: "pv-lab", fill: "#008BA8"});
  spr.forEach(p => hoverable(el("rect", {x: xs(p.date) - w / spr.length / 2, y: m.t,
    width: Math.max(2, w / spr.length), height: h, fill: "transparent"}, svg),
    `<b>${mon(p.date)}</b><br>product over resin <span class="v">${p.v > 0 ? "+" : ""}${p.v.toFixed(1)}</span> points<br>
     product <span class="v">${PM[p.date].toFixed(0)}</span> ·
     resin <span class="v">${RM[p.date].toFixed(0)}</span>` +
     (p.date in CH ? `<br>resin over chemicals <span class="v">${(RM[p.date] - CH[p.date]).toFixed(1)}</span>` : ""),
    `${mon(p.date)}: ${p.v.toFixed(1)} points`));
}

function drawSpreadMobile() {
  /* Taller top for the direction cue and a wider right gutter for the comparator's full
     name: the re-layout used to drop the two-headed cue that makes this chart readable
     and abbreviate the gray line to "resin − chem", which decodes only against a desktop
     caption the mobile reader never sees. */
  const W = 375, H = 320, m = {t: 58, r: 84, b: 42, l: 34};
  const {svg} = PV.chart("spread", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const lo = Math.min(...spr.map(p => p.v), ...comp.map(p => p.v)) * 1.15;
  const hi = Math.max(...spr.map(p => p.v), ...comp.map(p => p.v)) * 1.3;
  const dates = spr.map(p => p.date);
  const xs = d => m.l + dates.indexOf(d) / (dates.length - 1) * w;
  const ys = v => m.t + h - (v - lo) / (hi - lo) * h;
  const yrs = [...new Set(dates.map(d => d.slice(0, 4)))].filter((_, i) => i % 4 === 0);
  const st = spreadStyles();
  frame(svg, {x: m.l, y: m.t, w, h, xs: d => xs(d), ys,
    xt: yrs.map(y => dates.find(d => d.startsWith(y))).filter(Boolean),
    yt: ticks(lo, hi, 4), xfmt: d => d.slice(0, 4),
    yfmt: v => (v > 0 ? "+" : "") + v.toFixed(0), ylab: ""});
  txt(svg, "↑ products grew more  ·  ↓ resin grew more", {x: m.l, y: 20,
    class: "pv-labq"});
  el("path", {d: "M" + spr.map(p => `${xs(p.date)},${ys(p.v)}`).join("L") +
    `L${xs(dates.at(-1))},${ys(0)}L${xs(dates[0])},${ys(0)}Z`,
    fill: `rgba(0,139,168,${st.area})`}, svg);
  el("line", {x1: m.l, y1: ys(0), x2: m.l + w, y2: ys(0), stroke: INK,
    "stroke-width": 1.2}, svg);
  el("path", {d: "M" + comp.map(p => `${xs(p.date)},${ys(p.v)}`).join("L"),
    fill: "none", stroke: st.cmp.stroke, "stroke-width": Math.max(1.2, st.cmp.wd - .6),
    opacity: st.cmp.op}, svg);
  el("path", {d: "M" + spr.map(p => `${xs(p.date)},${ys(p.v)}`).join("L"),
    fill: "none", stroke: "#008BA8", "stroke-width": Math.max(1.8, st.main.wd - .6),
    opacity: st.main.op}, svg);
  /* Annotations after the ink they sit on. The zero line carries the whole reading of
     this chart, so it is labeled by what crossing it MEANS on mobile too, and it goes
     above the line, over the gray comparator rather than over the story series. */
  plated(svg, "0 = both up the same", {x: m.l + 2, y: ys(0) - 7, class: "pv-labq"}, 6.6);
  el("circle", {cx: xs(sTrough.date), cy: ys(sTrough.v), r: 4, fill: "#008BA8",
    stroke: "var(--paper)", "stroke-width": 1.5}, svg);
  plated(svg, `${sp(sTrough.v)} · the squeeze`, {x: xs(sTrough.date) + 8,
    y: ys(sTrough.v) + 4, class: "pv-lab", fill: "#008BA8"}, 8);
  el("circle", {cx: xs(sPeak.date), cy: ys(sPeak.v), r: 4, fill: "#008BA8",
    stroke: "var(--paper)", "stroke-width": 1.5}, svg);
  plated(svg, sp(sPeak.v), {x: xs(sPeak.date) - 6, y: ys(sPeak.v) - 8,
    "text-anchor": "end", class: "pv-lab", fill: "#008BA8"}, 8);
  /* The near-closure carries on mobile too: it is the claim the chart title rests on,
     so it may not be the thing that gets dropped in the re-layout. */
  el("circle", {cx: xs(sDip.date), cy: ys(sDip.v), r: 4, fill: "var(--paper)",
    stroke: "#008BA8", "stroke-width": 1.5}, svg);
  /* Above the zero line, not below it: below, the label ran into the gray comparator
     and the right-edge series names, which the desktop-only collision gate cannot see.
     A row higher than the zero-line caption, with a leader down to its dot, because at
     this width the two strings came within twenty units of touching. */
  el("line", {x1: xs(sDip.date), y1: ys(0) - 24, x2: xs(sDip.date), y2: ys(sDip.v) - 6,
    stroke: "#008BA8", "stroke-width": 1, "stroke-dasharray": "2 2"}, svg);
  plated(svg, `+${sDip.v.toFixed(1)} ${mon3(sDip.date)}`, {x: xs(sDip.date) - 5,
    y: ys(0) - 28, "text-anchor": "end", class: "pv-lab", fill: "#008BA8"}, 8);
  txt(svg, `${sp(last.v)} now`, {x: m.l + w + 6, y: ys(last.v) + 4,
    class: "pv-lab", fill: "#008BA8"});
  /* ONE LABEL ON TWO LINES, LED OFF ITS OWN FACE. These two ran on 13 units against a
     box that measures 18.75, so the comparator's name printed on itself at every width
     the page has. The pair now takes the measured leading and the block is centred on
     the line's own end, so the name still sits level with the stroke it names. */
  {
    const Q = face(svg, "pv-labq"), L = lead(Q, Q);
    const cy = ys(comp.at(-1).v) - L / 2 + (Q.up - Q.down) / 2;
    txt(svg, "resin vs", {x: m.l + w + 6, y: cy, class: "pv-labq", fill: st.cmp.lab});
    txt(svg, "chemicals", {x: m.l + w + 6, y: cy + L, class: "pv-labq",
      fill: st.cmp.lab});
  }
  hoverable(el("rect", {x: m.l, y: m.t, width: w, height: h, fill: "transparent"}, svg),
    `<b>${mon(last.date)}</b><br>product over resin <span class="v">${sp(last.v)}</span>
     points<br>resin over chemicals <span class="v">${comp.at(-1).v.toFixed(1)}</span>`,
    "latest gap");
}

/* --------------------------------------------------------------- the lines key
   The gray "context series" used to be one anonymous legend entry covering four lines,
   and on mobile those four lost their end labels entirely: crude oil, Ohio power and the
   second resin and product series became untraceable squiggles. The key now names every
   line and prints the value it ends at, so a reader can match any stroke on the chart to
   a name at either width without hovering. Swatch heights carry the chart's weight
   ladder, so the key decodes the same way the plot does when hue is unavailable. */
{
  const endOf = s => s.points.at(-1).index.toFixed(0);
  const ctx = lineSeries.filter(s => !STORY.has(s.label))
    .sort((a, b) => b.points.at(-1).index - a.points.at(-1).index);
  document.getElementById("lineskey").innerHTML = [
    [STAGE.feedstock.c, 2, `Feedstock &middot; Henry Hub gas, ending at ${endOf(gas)}`],
    [STAGE.resin.c, 3,
     `Resin &middot; what parts makers buy, ending at ${endOf(resinMfg)}`],
    [STAGE.product.c, 4,
     `Products &middot; what they sell, ending at ${endOf(prodMfg)}`],
    [GRAY, 1, "For context, in gray: " +
      ctx.map(s => `${SHORT[s.label]} ${endOf(s)}`).join(" &middot; ")]
  ].map(([c, hgt, s]) =>
    `<span><i class="ln" style="background:${c};height:${hgt}px"></i> ${s}</span>`)
   .join("");
}

/* -------------------------------------------------------- tables + source lines */
/* Source lines carry source, period and the ONE limitation that changes how the number
   reads (page-design, caveat budget: 45 words visible). The retracement formula, the
   rebasing rationale and the missing-comparator note moved into the methodology box,
   which publishes them from this page's own meta: the ink under each figure was saying
   them a second time. Table captions stay short because tableView prints the caption
   into the <summary> as well, so a long one is not a disclosure, it is a third slab of
   apparatus in link blue. */
/* The tables are the crosswalk. The charts label a series by what it measures and the
   federal statistics label it by their own title; a reader who opens the table to check
   a number needs both names in one cell or the two systems never meet. */
const both = s => `${SHORT[s.label]} (${s.label})`;
document.getElementById("laddertable").innerHTML = tableView("ld",
  "Peak, current level and share of the rise given back, by stage (January 2019 = 100)",
  ["Series", "Stage", "Peak", "Peak month", "Now", "Latest month", "Rise given back"],
  rows.map(s => [both(s), STAGE[s.stage].n, s.peak.index.toFixed(1), mon(s.peak.date),
    s.now.index.toFixed(1), mon(s.now.date), pct(s.retraced)]));
/* The formula comes back to the figure it governs. It was moved to the methodology box
   to stop the source line saying things the caption already said, but the caption states
   the READING and never the rule, and the rule then sat five screens below the chart it
   defines — the reader had already decided what the bars meant. Forty-four words. */
document.getElementById("laddersrc").innerHTML =
  `${D.meta.sources}, monthly, 2015 through mid-2026, measured against January 2019
   (midwinter, so gas enters at a seasonal high): the ordering survives that, the exact
   percentages do not. Share of the rise given back = (peak &minus; now) &divide;
   (peak &minus; 100).`;

/* THE LEVEL TABLE CARRIES EVERY SERIES THE PAGE DRAWS, INCLUDING THE ONE IT DRAWS ONLY
   AS A SUBTRACTION. Industrial chemicals is the comparator behind the gray line on the
   spread chart and behind a column in the spread table, and its own level appeared
   nowhere: not here, not in the ladder table, not in a key, not in a source line. A
   reader could see "resin over chemicals" and check no part of it. It is not on the line
   chart, so its row is tagged as the context series it is rather than smuggled in as a
   fourth link. */
{
  const tabled = [...lineSeries, chem];
  const dates = [...new Set(tabled.flatMap(s => s.points.map(p => p.date)))].sort();
  const jans = dates.filter(d => d.endsWith("-01-01"));
  document.getElementById("linestable").innerHTML = tableView("ln",
    "Index level by series, January of each year (January 2019 = 100), including " +
    "industrial chemicals, the comparator subtracted on the next chart",
    ["Series", "Stage", ...jans.map(d => d.slice(0, 4))],
    tabled.map(s => [both(s), STAGE[s.stage].n,
      ...jans.map(d => {
        const p = s.points.find(x => x.date === d);
        return p ? p.index.toFixed(0) : "—";
      })]));
}
document.getElementById("linessrc").innerHTML =
  `${D.meta.sources}, monthly, 2015 through mid-2026. These are national series: Henry
   Hub is not what an Ohio plant pays once pipeline charges and long-term supply
   contracts are settled, and a producer price index is what a whole industry charges at
   the factory gate, not any member&rsquo;s realized price.`;

/* Every January, plus the three months the prose and the chart both name: the peak, the
   near-closure and now. A reader checking "+0.7 in May 2026" should not have to
   interpolate between two Januaries to do it. */
/* BOTH SUBTRACTIONS, WITH BOTH SETS OF LEGS. The table printed the product and resin
   levels that make the first gap and only the ANSWER to the second one, so a reader could
   re-run "product over resin" and had to take "resin over chemicals" on trust. The
   chemicals level now sits beside the resin level it is subtracted from. */
{
  const keyed = new Set([sPeak.date, sDip.date, last.date, sTrough.date]);
  document.getElementById("spreadtable").innerHTML = tableView("sd",
    "Both gaps and the three index levels behind them, every January plus the trough, " +
    "the peak, the May 2026 near-closure and now (January 2019 = 100)",
    ["Month", "Product", "Resin", "Chemicals", "Product over resin",
     "Resin over chemicals"],
    spr.filter(p => p.date.endsWith("-01-01") || keyed.has(p.date)).map(p =>
      [mon(p.date), PM[p.date].toFixed(0), RM[p.date].toFixed(0),
       p.date in CH ? CH[p.date].toFixed(0) : "—",
       (p.v > 0 ? "+" : "") + p.v.toFixed(1),
       p.date in CH ? (RM[p.date] - CH[p.date] > 0 ? "+" : "") +
         (RM[p.date] - CH[p.date]).toFixed(1) : "—"]));
}

/* --------------------------------------------------------------- the spread key
   The gap chart carried two lines and no key: the main line was named by the H2 and the
   how-to-read line, and the gray one by an end label reading "chemicals", which names
   half of a subtraction. Both lines are named here with the levels they are built from,
   which is the only place on the page industrial chemicals states its own value. */
{
  const e0 = v => v.toFixed(0);
  /* One text node per entry, no inline bold: `.legend span` is an inline-flex box, so a
     <b> becomes a second flex item with an 8px gap in front of the comma that follows it
     and its own shrink behaviour. The lines key above is written the same way. */
  document.getElementById("spreadkey").innerHTML = [
    [STAGE.product.c, 3, `Products over resin &middot; the converter&rsquo;s gap:
      products from their makers at ${e0(PM[last.date])} minus resin from its makers at
      ${e0(RM[last.date])}, ${sp(last.v)} in ${monF(last.date)}`],
    [GRAY, 1.5, `Resin over chemicals &middot; the same question one link up: resin at
      ${e0(RM[last.date])} minus industrial chemicals at ${e0(CH[last.date])},
      ${sp(comp.at(-1).v)}. The chemicals index (BLS PPI, WPU06) peaked at
      ${chem.peak.index.toFixed(1)} in ${monF(chem.peak.date)} and stands at
      ${chem.now.index.toFixed(1)}; its level year by year is in the table under the
      previous chart, month by month in the table below`]
  ].map(([c, hgt, s]) =>
    `<span><i class="ln" style="background:${c};height:${hgt}px"></i> ${s}</span>`)
   .join("");
}
/* The footnote used to name its two inputs by their federal titles, which matched none
   of the four labels on the charts above; a reader could not tell which two of the four
   near-twin series made the gap. Both namings now appear, in the page's order. */
document.getElementById("spreadsrc").innerHTML =
  `The two makers&rsquo; indexes, 2015 through July 2026, both set to 100 at January 2019:
   products from their makers (BLS plastics and rubber products manufacturing) minus resin
   from its makers (BLS plastics material and resin manufacturing). Both are nominal:
   deflating them by one consumer price index scales the ${sp(last.v)} to
   ${sp(last.v / defl(last.date))} points and changes neither its sign nor its shape.
   Whether every downstream industry held price this way is a question this page cannot
   answer.`;

/* The closer resolves the hero's question and hands the reader the next thing to watch:
   the cushion the whole page is about came within a point of closing three months ago,
   which is the live question the shipped data can pose but not settle. */
document.getElementById("closersub").innerHTML =
  `<b>The wellhead gave back its whole spike and then some (${pct(gas.retraced)}); resin
   makers about a third; finished products none.</b> The converter&rsquo;s gap ran ${sp(sTrough.v)}
   points at the bottom of the 2021 squeeze and stands ${sp(last.v)} now, and a gap
   between two indexes is not a margin: labor, freight, energy and packaging are in
   neither series.
   It has not been steady either. Resin rose ${sDipResin.toFixed(1)} points in two
   months this spring and the gap closed to +${sDip.v.toFixed(1)}; the next resin move
   decides whether it holds.`;

/* --------------------------------------------------------------------- assemble */
function drawAll() { drawOpen(); drawLadder(); drawLines(); drawSpread(); }
drawAll();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* THE COLD-OPEN STRIP IS THE ONE CHART HERE THAT REDRAWS ON A PLAIN RESIZE, and that is
   the price of sizing it in real pixels. Every chart below is authored in fixed viewBox
   units and only re-lays out when the 760px breakpoint moves; the strip's box IS the
   text rail, which is fluid between about 320px and 678px, so a resize that never
   crosses the breakpoint still changes its geometry and its measured line breaks. Rate
   limited to one redraw per frame. */
let openPending = false;
addEventListener("resize", () => {
  if (openPending) return;
  openPending = true;
  requestAnimationFrame(() => { openPending = false; drawOpen(); });
});

/* This page is national throughout — no county footprint applies. */

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "cost-scissors", meta: D.meta});
})();
