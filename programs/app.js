/* The hollowing of polymer education, 1991-2023.
 *
 * THE THESIS (editorial standard rule 7): "Northeast Ohio wants to rebuild its polymer
 * technician pipeline. Of the three layers of polymer education, it is the only one that
 * did not hold."
 *
 * THE HEADLINE CHANGED ON 2026-08-26, and the reason is worth keeping. It used to end "in
 * 33 years of the federal record, no one has done it" - a universal negative drawn from an
 * administrative dataset that cannot see programs filed under other codes, so the very next
 * sentence had to take it back. A hed the stand has to retract is overclaimed, however true
 * it feels. The claim now in the hed is the one the CONTROL supports and needs no retraction:
 * 27% against 48% and 48%, p=0.0005. "No one has rebuilt one" is still on the page, in its
 * own band, with its own limit attached - which is where a claim that fragile belongs. It is the
 * h1, unqualified; the qualification is the sentence after it. Everything below is the
 * arithmetic behind that sentence, in the order a reader asks for it: is the layer really
 * gone (the spine), what did the whole field do (the series), what happens to new starts
 * (the base rate), what does working look like (the top sixteen), what is the anchor doing
 * (Akron), is the work worth having (earnings), and has anyone ever rebuilt one (no).
 *
 * ORDER. The DOM order in index.html is the reader’s order; the order of the blocks in
 * this file is the author’s, and they are not the same. Every block writes into an id.
 *
 * READER TEST (rule 8). Two constructs before the first chart: the federal filing record,
 * and the technician layer against the trades taught next door. The ten-completion
 * threshold, the CIP codes, the award-level canonicalisation and the "ended is not closed"
 * caution are all real and all ship, in the chart captions and the methodology block, where
 * a reader has a reason to care. The human anchor is Akron in 2023: two undergraduates.
 *
 * THE GATE (web/README.md), answered:
 *   0. Dataset: every (institution, program CIP, award level) that conferred a polymer
 *      completion in IPEDS 1991-2023 (the polymer-programs-db census), the same pull for
 *      six peer technician CIPs as a control, and the College Scorecard field-of-study
 *      earnings for the one polymer CIP it publishes unsuppressed.
 *   1. Benchmark: the control IS the benchmark for the spine - same years, same rule,
 *      same award levels, different field. The earnings panel carries the national
 *      interquartile band for the program code.
 *   2. Encodings: line position = completions per year (axis cropped, floor stated); bar
 *      length = survival rate, program count, lifetime completions (all linear from zero);
 *      dot position = median earnings (linear, axis floor stated).
 *   3. Uncertainty: every count is a floor and the hero says so; "ended" is not "closed"
 *      and no named closure ships without a catalogue check; suppressed Scorecard cells
 *      are absent, never zero, and the small-N is in the lede, not a footnote.
 *   4. Palette: sequential teal for one-hue emphasis (active vs ended, still vs ever);
 *      gray for the control; ink for national reference marks.
 *   7. Dollars are one cohort vintage per measure, stated in the source line. Axes that
 *      do not start at zero say so under the chart title.
 *   9. No em-dashes in rendered prose, here or in index.html. En-dashes in year ranges
 *      are correct typography and stay.
 */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, chart, figures, N, onFill,
       SEQ, GRAY, INK} = PV;
const D = await PV.data("viz-data.json");

/* THE COLD OPEN (guarded by tools/coldopen.mjs). Three survival bars, nothing else: the
   page's whole argument at its coarsest. Deliberately poorer than the spine below — no
   counts, no rule, no table. */
{
  const svg = document.getElementById("open");
  if (svg) {
    const W = Math.round(svg.getBoundingClientRect().width) || 720, H = 132;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const rows = [["Polymer technician", D.layers.technician.survive_pct, "#FFD09A"],
                  ["Polymer degree", D.layers.degree.survive_pct, "#C6E2E6"],
                  ["The trades next door", D.layers.control.survive_pct, "#C6E2E6"]];
    const lab = 214, lo = lab + 10, hi = W - 56;
    rows.forEach(([name, pct, col], i) => {
      const y = 22 + i * 38;
      PV.txt(svg, name, {x: lab, y: y + 5, "text-anchor": "end", "font-size": 13.5,
        fill: "#fff", "font-weight": 700});
      PV.el("rect", {x: lo, y: y - 9, width: (hi - lo) * pct / 100, height: 18,
        fill: col}, svg);
      PV.txt(svg, pct + "%", {x: lo + (hi - lo) * pct / 100 + 8, y: y + 5,
        "font-size": 13.5, fill: "#fff", "font-weight": 700});
    });
    PV.txt(svg, "still conferring in 2023", {x: lo, y: H - 6,
      "font-size": 12.5, fill: "#C6E2E6"});
  }
}
const M = D.marks, L = D.layers;
const pct = v => v == null ? "—" : Math.round(v) + "%";
const money = v => v == null ? "—" : "$" + Math.round(v).toLocaleString("en-US");

/* THE COLUMN, 1:1. The svg viewBox is the figure width in page pixels, so 14px inside a
   chart is 14px on the page. A 1100-unit viewBox scaled into a 728px column rendered its
   tick labels at 8px, under the legibility floor. LAYOUT-SPEC rules 2 and 4. */
const COL = 728;
/* A chart’s title is a CLAIM in body weight, ON the page rail, with the units and the axis
   floor as a smaller second line. x=0 in the viewBox IS the rail, because the svg fills the
   column exactly; starting the title at the plot’s left margin puts a second ragged edge
   beside the prose. An all-caps unit string is an axis label, not a title. */
function chartTitle(svg, claim, unit) {
  txt(svg, claim, {x: 0, y: 13, class: "pv-lab", fill: "var(--text)"});
  if (unit) txt(svg, unit, {x: 0, y: 31, class: "pv-tick", fill: "var(--caption)"});
}
/* An axis cropped to its data, with the floor stated under the title. Lines only: a bar’s
   length encodes magnitude from zero and keeps its zero however much canvas that costs. */
const span = (lo, hi) => v => (v - lo) / (hi - lo);

/* IPEDS institution names arrive in whatever case the filing year used - Akron Machining
   Institute is ALL CAPS, Ferris State is not. Presentation only; the data keeps the record. */
const Cap = s => s === s.toUpperCase()
  ? s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/\bIncorporated\b/, "").trim()
  : s;
/* Row labels are short because the column is 728 wide and a truncated name spends a fifth
   of it saying nothing. The full name is in the tooltip and in the table, always. */
const shortInst = s => Cap(s)
  .replace(/ Main Campus$/, "").replace(/^Pennsylvania College of Technology$/, "Penn College")
  .replace(/^Pennsylvania State University.*Behrend.*$/, "Penn State Behrend")
  .replace(/^University of Massachusetts-Lowell$/, "UMass Lowell")
  .replace(/^University of Wisconsin-Stout$/, "UW-Stout")
  .replace(/^Western Washington University$/, "Western Washington")
  .replace(/^Wichita State University.*$/, "Wichita State Tech")
  .replace(/^Ferris State University$/, "Ferris State")
  .replace(/^IYRS School of Technology.*$/, "IYRS")
  .replace(/^Cuyahoga Community College District$/, "Tri-C")
  .replace(/ Community College$/, " CC").replace(/ Technical College$/, " Technical");
/* Two institutions appear twice in the top sixteen, once per award level. Two identical row
   labels read as a rendering bug, so the repeated ones carry their award and the unique
   ones do not: the disambiguator is drawn only where something needs disambiguating. */
const awardWords = a => /<1/.test(a) ? "short cert" : /1-2/.test(a) ? "1-2 yr cert" : "associate";

/* ---------------------------------------------------- the hero stat row.
   The tiles are the finding, not the setup, and the third is the human anchor: a place, a
   year, and a number small enough to picture. The fourth is the thesis as a quantity. */
figures([
  ["key", pct(L.technician.survive_pct), "of technician programs survived",
   `${N(L.technician.still)} of the ${N(L.technician.ever)} that ever got going were still
    awarding a credential in 2023. The trades next door held ${pct(L.control.survive_pct)},
    polymer degrees ${pct(L.degree.survive_pct)}.`],
  ["", pct(D.base.both_pct), "of new starts never took hold",
   `${D.base.both} of the ${D.base.ever} technician programs launched since 1991 were both
    tiny and short-lived: ten or fewer completions ever, and a run of five years or less.`],
  ["", String(D.ua.bachelor_2016_2023.at(-1)), "Akron polymer undergraduates, 2023",
   `At the world’s flagship polymer school, whose polymer completions of every kind are
    ${pct(D.ua.pct_off)} below its own 2016 peak.`],
  ["", "0", "programs rebuilt in 33 years",
   `No substantial technician program in this record died and came back. The one candidate
    turned out to be a change in federal paperwork.`],
]);

/* ------------------------------------------- THE HERO GRAPHIC: the spine chart.
   Editorial standard rule 3: one figure carries the finding and gets dominant weight. It
   used to sit inside the hero on the dark ground, which cost it the house chart palette and
   put a chart above the sentence it illustrates; it now opens the story on paper, first
   thing after the stat row. */
{
  const rows = [
    {label: "Polymer technician", full: "Polymer technician (associate + certificate)",
     c: SEQ[5], d: L.technician},
    {label: "The trades next door", full: "The six peer trades, same buildings (control)",
     c: GRAY, d: L.control},
    {label: "Polymer degree", full: "Polymer degree (BS / MS / PhD)", c: SEQ[2], d: L.degree},
  ];
  /* THE HERO GRAPHIC, AND IT IS ALLOWED TO BE BIGGER. Editorial standard rule 3: exactly
     one figure on a page carries the finding and gets dominant weight. Until 2026-08-26
     every chart here was drawn at the same row height, so the three-bar spine that IS the
     thesis and the sixteen-row appendix directory were typographically indistinguishable -
     the defect two independent audits named, five days apart. Three bars at 42px could not
     be seen from the top of the page; at 78 they are the first thing a reader meets after
     the headline, which is what the page is arguing. */
  const ROW = 110;
  const {svg, W, m, w} = chart("spine", {W: COL, rows: rows.length, rowH: ROW,
    m: {t: 72, r: 20, b: 60, l: 170}});
  const maxV = 52;
  const xs = v => m.l + (v / maxV) * w;                      // LINEAR from zero
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * ROW, xs, ys: () => 0,
    xt: [0, 10, 20, 30, 40, 50], yt: [], xfmt: v => v + "%",
    xlab: "Share of programs still conferring in 2023"});
  chartTitle(svg, "Two of these three layers held. The technician layer did not",
    "Programs with more than ten lifetime completions, still conferring in 2023. Bars start at zero.");
  rows.forEach((r, i) => {
    const y = m.t + i * ROW + 8, bh = 54;
    el("rect", {x: m.l, y, width: Math.max(2, xs(r.d.survive_pct) - m.l), height: bh,
      fill: r.c, rx: 3}, svg);
    txt(svg, r.label, {x: m.l - 12, y: y + bh / 2 + 5, "text-anchor": "end", class: "pv-lab"});
    /* The count sits ON the bar, so its colour is derived from the bar it sits on rather
       than picked: teal at SEQ[5] wants white, the gray control and the pale SEQ[2] want
       ink, and a hard-coded choice would be wrong for one of the three. */
    txt(svg, `${N(r.d.still)} of ${N(r.d.ever)}`, {x: m.l + 12, y: y + bh / 2 + 5,
      class: "pv-labq", fill: onFill(r.c)});
    txt(svg, pct(r.d.survive_pct), {x: xs(r.d.survive_pct) + 12, y: y + bh / 2 + 5,
      class: "pv-lab"});
    hoverable(el("rect", {x: 0, y: y - 12, width: W, height: bh + 24, fill: "transparent"}, svg),
      `<b>${r.full}</b><br><span class="v">${N(r.d.ever)}</span> programs past ten completions
       &middot; <span class="v">${N(r.d.still)}</span> still conferring
       &middot; <span class="v">${pct(r.d.survive_pct)}</span> survive`,
      `${r.full}: ${pct(r.d.survive_pct)} survive (${r.d.still} of ${r.d.ever})`);
  });
  document.getElementById("spinesrc").innerHTML =
    `Seventy-three programs is a small number and the gap has to be read with that in mind:
     the technician share could plausibly be anywhere from 19 to 39 percent, and the trades
     and the degrees could differ from each other by ten points either way. What survives
     those margins is the shape. The trades and the polymer degrees are indistinguishable
     from each other; the technician layer sits below both by more than the margins allow.
     Counts are floors, because the record only sees what institutions filed under polymer
     codes, and a program quiet in 2023 is &ldquo;not conferring&rdquo; rather than
     &ldquo;closed&rdquo;. (IPEDS 1991&ndash;2023 via the Urban Institute API, 2020 excluded;
     construct details in the methodology below.)`;
  document.getElementById("spinetable").innerHTML = tableView("spine",
    "Program survival by layer, programs past ten lifetime completions",
    ["Layer", "Programs ever", "Still conferring 2023", "Survive"],
    rows.map(r => [r.full, N(r.d.ever), N(r.d.still), pct(r.d.survive_pct)]));
}

/* --------------------------------------------------------- 1. the series */
{
  const rows = D.series;
  const {svg, m, w, h} = chart("series", {W: COL, H: 262, m: {t: 60, r: 16, b: 54, l: 52}});
  const xs = y => m.l + ((y - rows[0].year) / (rows[rows.length - 1].year - rows[0].year)) * w;
  /* CROPPED, AND IT SAYS SO. The series lives between 379 and 970; on a zero axis the whole
     story happened in the top third of the box (LAYOUT-SPEC rule 3). Floor 300, stated
     under the title, and both the fall and the rebound are read from the printed numbers. */
  const lo = 300, hi = 1010, f = span(lo, hi);
  const ys = v => m.t + h - f(v) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, yt: [400, 600, 800, 1000],
    xt: [1991, 2000, 2010, 2016, 2023]});
  chartTitle(svg, "Completions doubled off the 2007 floor, then fell a third from the 2016 peak");
    /* The unit line lives in HTML, not in the svg: at phone widths this sentence runs
       three lines, and an svg <text> neither wraps nor clips politely (collide caught it
       266px past the column). HTML wraps; that is what .fig-sub is for. */
    document.getElementById("seriessub").textContent =
      `US polymer completions per year, all award levels. Axis starts at 300, not zero. ` +
      `The line breaks at 2020: ${D.quarantine_caption}.`;
  /* A BREAK, NOT A BRIDGE. 2020 is quarantined (the federal mirror republished 2019 under
     it), and drawing straight through the hole would assert a value nobody measured - the
     one thing a line chart does that a table cannot. So the path restarts wherever the
     year step is bigger than one, and the subtitle says why. */
  const path = rows.map((r, i) => {
    const jump = i && r.year - rows[i - 1].year > 1;
    return `${(i && !jump) ? "L" : "M"}${xs(r.year)},${ys(r.awards)}`;
  }).join("");
  el("path", {d: path, fill: "none", stroke: SEQ[5], "stroke-width": 2.5}, svg);
  /* Three anchors, not every point: the floor, the peak, and where it stands now. 1991's
     476 is in the caption, where a reader needs it to read the sentence, not on the line. */
  [["trough", 0, 24], ["peak", 0, -12], ["latest", -2, 26]].forEach(([k, dx, dy]) => {
    const p = M[k];
    el("circle", {cx: xs(p.year), cy: ys(p.awards), r: 4.5, fill: SEQ[5],
      stroke: "var(--paper)", "stroke-width": 1.5}, svg);
    txt(svg, `${N(p.awards)} in ${p.year}`, {x: xs(p.year) + dx, y: ys(p.awards) + dy,
      "text-anchor": k === "latest" ? "end" : "middle", class: "pv-lab"});
  });
  rows.forEach(r => {
    hoverable(el("rect", {x: xs(r.year) - 8, y: m.t, width: 16, height: h,
      fill: "transparent"}, svg),
      `<b>${r.year}</b><br><span class="v">${N(r.awards)}</span> completions`,
      `${r.year}: ${N(r.awards)} completions`);
  });
  document.getElementById("seriestable").innerHTML = tableView("series",
    "US polymer completions per year, 1991–2023",
    ["Year", "Completions"], rows.map(r => [r.year, N(r.awards)]));
  document.getElementById("seriessrc").innerHTML =
    `The thing to get right about this line: neither endpoint tells it alone. Two earlier
     tellings cherry-picked it in opposite directions, one reporting that
     &ldquo;235 of 315 programs ended&rdquo; and the other that completions
     &ldquo;rose 476&rarr;807&rdquo;. The first overstates the collapse, the second
     understates the decline. And there is no denominator here: total US conferrals rose over
     the same period, so the polymer <i>share</i> fell further than the count.
     (IPEDS completions, three polymer CIP codes, all levels; ${N(M.first.awards)} in
     ${M.first.year}, a floor of ${N(M.trough.awards)} in ${M.trough.year}, a peak of
     ${N(M.peak.awards)} in ${M.peak.year}, ${N(M.latest.awards)} in ${M.latest.year}.)`;
}

/* --------------------------------------------------------- 3. the base rate */
{
  const B = D.base;
  const rows = [
    {label: "Ten or fewer completions", v: B.le10_awards, p: B.le10_awards_pct, c: SEQ[3]},
    {label: "Five years or less", v: B.le5_years, p: B.le5_years_pct, c: SEQ[3]},
    {label: "Both at once", v: B.both, p: B.both_pct, c: SEQ[5]},
  ];
  const ROW = 42;
  const {svg, W, m, w} = chart("base", {W: COL, rows: rows.length, rowH: ROW,
    m: {t: 66, r: 24, b: 56, l: 190}});
  const xs = v => m.l + (v / B.ever) * w;                    // LINEAR from zero, of 168
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * ROW, xs, ys: () => 0,
    xt: [0, 42, 84, 126, 168], yt: [],
    xlab: `Programs, of all ${B.ever} started since 1991`});
  chartTitle(svg, "Four in every ten technician programs started since 1991 were both tiny and brief",
    `All ${B.ever} associate and certificate programs under the polymer codes, no size threshold. Bars start at zero.`);
  el("line", {x1: xs(B.ever / 2), y1: m.t - 6, x2: xs(B.ever / 2), y2: m.t + rows.length * ROW,
    stroke: "var(--pv-axis)", "stroke-width": 1, opacity: .55}, svg);
  txt(svg, "half", {x: xs(B.ever / 2), y: m.t - 12, "text-anchor": "middle", class: "pv-labq"});
  rows.forEach((r, i) => {
    const y = m.t + i * ROW + 8, bh = 26;
    el("rect", {x: m.l, y, width: Math.max(2, xs(r.v) - m.l), height: bh, fill: r.c, rx: 3}, svg);
    txt(svg, r.label, {x: m.l - 12, y: y + bh - 9, "text-anchor": "end", class: "pv-lab"});
    txt(svg, `${r.v} programs, ${pct(r.p)}`, {x: xs(r.v) + 10, y: y + bh - 9, class: "pv-lab"});
    hoverable(el("rect", {x: 0, y: y - 8, width: W, height: bh + 16, fill: "transparent"}, svg),
      `<b>${r.label}</b><br><span class="v">${r.v}</span> of ${B.ever} programs
       (<span class="v">${pct(r.p)}</span>)`,
      `${r.label}: ${r.v} of ${B.ever} (${pct(r.p)})`);
  });
  document.getElementById("basetable").innerHTML = tableView("base",
    `All ${B.ever} technician programs since 1991, by fate`,
    ["Measure", "Programs", "Share"],
    rows.map(r => [r.label, r.v, pct(r.p)]));
  document.getElementById("basesrc").innerHTML =
    `The half-line is the reading, and &ldquo;both at once&rdquo; is the strict test: ten or
     fewer completions ever AND a run of five years or less, not either. (All ${B.ever}
     associate and certificate programs under the polymer codes, no size threshold;
     certificate award levels canonicalised across the bureau&rsquo;s 2020 renumbering, which
     is the correction described in &ldquo;What we got wrong&rdquo; below.)`;
  const OH = D.ohio;
  document.getElementById("basenote").innerHTML =
    `<b>Ohio makes the base rate concrete.</b> Of the state&rsquo;s <b>${OH.tech_ever}</b>
     technician programs, <b>${OH.never_took_off}</b> never reached ten completions. Edison
     State tried three times; Lakeland launched two certificates in the same year, one
     completion each; Kent State tried twice. <b>The University of Akron itself failed at
     this layer twice</b>, an associate degree and a certificate, nine completions between
     them. The country&rsquo;s flagship polymer school could not make a technician program
     stick, and the record of the attempts is in the table below.`;
  document.getElementById("ohiotable").innerHTML = tableView("ohio",
    `Ohio’s ${OH.tech_ever} technician programs, largest first`,
    ["Institution", "Award", "Run", "Lifetime completions", "Status in the record"],
    OH.programs.map(r => [shortInst(r.institution), r.award, `${r.first_year}–${r.last_year}`,
      N(r.total_awards), r.status]));
}

/* -------------------------------------------------- 4. what working looks like */
{
  /* DRAW EIGHT, TABULATE SIXTEEN. This chart was the tallest figure on the page - 504px
     against the 366px three-bar spine that is the actual thesis - which is rule 3 exactly
     backwards: the directory outweighed the finding. Sixteen rows were never needed to
     make the point, because the point is the FIRST row and the fact that it is in
     Michigan. Eight rows carry that; the table twin below still carries all sixteen, so
     nothing is withheld, only un-shouted. */
  const SHOWN = 8;
  const all = D.top_tech;
  const rows = all.slice(0, SHOWN);
  const seen = {};
  rows.forEach(r => { const k = shortInst(r.institution); seen[k] = (seen[k] || 0) + 1; });
  const rowLabel = r => seen[shortInst(r.institution)] > 1
    ? `${shortInst(r.institution)}, ${awardWords(r.award)}` : shortInst(r.institution);
  const ROW = 24;
  const {svg, W, m, w} = chart("working", {W: COL, rows: rows.length, rowH: ROW,
    m: {t: 66, r: 30, b: 54, l: 214}});
  const maxV = rows[0].total_awards * 1.08;
  const xs = v => m.l + (v / maxV) * w;                      // LINEAR from zero
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * ROW, xs, ys: () => 0,
    xt: ticks(0, maxV, 4), yt: [], xlab: "Lifetime completions, 1991–2023"});
  chartTitle(svg, "One program conferred more than the next two combined, and it is in Michigan");
    document.getElementById("workingsub").textContent =
      `The largest ${SHOWN} of the ${all.length} US polymer technician programs that ever ` +
      `passed one hundred completions. All ${all.length} are in the table. Bars start at zero.`;
  rows.forEach((r, i) => {
    const y = m.t + i * ROW + 4, bh = 16;
    const active = r.status === "active";
    el("rect", {x: m.l, y, width: Math.max(2, xs(r.total_awards) - m.l), height: bh,
      fill: active ? SEQ[5] : SEQ[1], rx: 3}, svg);
    txt(svg, rowLabel(r), {x: m.l - 12, y: y + bh - 3, "text-anchor": "end",
      class: active ? "pv-lab" : "pv-labq"});
    /* "ended" and "unclear" are different states in this record and the chart says so:
       a program quiet for one year is not a program that stopped. */
    const tail = active ? "" : r.status === "ended"
      ? `, ended ${r.last_year}` : `, last conferred ${r.last_year}`;
    txt(svg, `${N(r.total_awards)}${tail}`,
      {x: xs(r.total_awards) + 8, y: y + bh - 3, class: active ? "pv-lab" : "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 4, width: W, height: ROW, fill: "transparent"}, svg),
      `<b>${Cap(r.institution)}</b> (${r.state})<br>${r.award}<br>
       <span class="v">${N(r.total_awards)}</span> completions, ${r.first_year}–${r.last_year}
       <br>status in the record: <span class="v">${r.status}</span>`,
      `${Cap(r.institution)}: ${N(r.total_awards)} completions, ${r.first_year}–${r.last_year}, ${r.status}`);
  });
  document.getElementById("worklegend").innerHTML =
    `<span><i style="background:${SEQ[5]}"></i> still conferring, 2023</span>
     <span><i style="background:${SEQ[1]}"></i> no completion filed in 2023</span>`;
  document.getElementById("worktable").innerHTML = tableView("working",
    `All ${all.length} technician programs with 100+ lifetime completions`,
    ["Institution", "State", "Award", "Run", "Lifetime completions", "Status"],
    all.map(r => [Cap(r.institution), r.state, r.award, `${r.first_year}–${r.last_year}`,
      N(r.total_awards), r.status]));
  const ferris = all[0], next2 = all[1].total_awards + all[2].total_awards;
  document.getElementById("worksrc").innerHTML =
    `A bar is one <i>program</i> (institution &times; code &times; award level), which is why
     two colleges appear twice, and a light bar means the filings stopped, not that the
     school did. Ferris State&rsquo;s <b>${N(ferris.total_awards)}</b> exceed the next two programs
     combined (<b>${N(next2)}</b>). Both Ohio entries were checked against the ground: Akron
     Machining Institute&rsquo;s owner wound down around 2006&ndash;08; Terra State narrowed
     to a single certificate.`;
  const terra = rows.find(r => /TERRA/i.test(r.institution));
  document.getElementById("worknote").innerHTML =
    `<b>The largest ended program at a college that still operates is Terra State</b>:
     <b>${N(terra.total_awards)}</b> completions over
     ${terra.last_year - terra.first_year + 1} unbroken years, ended ${terra.last_year}.
     (Akron Machining Institute&rsquo;s 347 is larger, but the institution itself wound
     down.) Terra State was placed under state fiscal watch in April 2026, and any
     conversation about routing money there needs that fact first.`;
}

/* ---------------------------------------- the states: table twin only, by design.
   The chart was cut on 2026-08-21 editorial review — a figure whose caption must forbid
   its own inference (per-state counts are filing behaviour) is a figure the page is
   better without. Every value survives in the table, which now sits in the appendix:
   it is the register the page is drawn from, not a step in the argument. */
{
  document.getElementById("statestable").innerHTML = tableView("states",
    `Substantive polymer programs by state, all ${D.states.length} states`,
    ["State", "Ever", "Still conferring 2023"],
    D.states.map(r => [r.state, r.ever, r.still]));
  document.getElementById("statessrc").innerHTML =
    `Ohio leads the table (${D.states[0].ever} substantive programs ever,
     ${D.states[0].still} still conferring). <b>Low numbers are filing behaviour, not
     confirmed absence</b>: Illinois, North Carolina and Texas all teach polymer science
     under chemistry codes this census cannot see, so no per-state &ldquo;no programs&rdquo;
     claim can be built on this table in either direction.`;
}

/* -------------------------------------------------------------- 6. the anchor */
{
  const years = Object.keys(D.ua.series).map(Number).sort((a, b) => a - b);
  const rows = years.map(y => ({year: y, awards: D.ua.series[y]}));
  const {svg, m, w, h} = chart("ua", {W: COL, H: 262, m: {t: 60, r: 16, b: 54, l: 52}});
  const xs = y => m.l + ((y - years[0]) / (years[years.length - 1] - years[0])) * w;
  /* Cropped like the national series, and for the same reason: Akron’s line lives between
     30 and 114, and a zero axis spends half the box on empty paper. Floor stated. */
  const lo = 20, hi = 122, f = span(lo, hi);
  const ys = v => m.t + h - f(v) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys, yt: [25, 50, 75, 100],
    xt: [1991, 2000, 2010, 2016, 2023]});
  chartTitle(svg, `Akron’s polymer completions are ${pct(D.ua.pct_off)} below its own 2016 peak`,
    "University of Akron polymer completions per year, all levels. Axis starts at 20, not zero.");
  const path = rows.map((r, i) => `${i ? "L" : "M"}${xs(r.year)},${ys(r.awards)}`).join("");
  el("path", {d: path, fill: "none", stroke: SEQ[5], "stroke-width": 2.5}, svg);
  const peakAll = rows.reduce((a, r) => r.awards > a.awards ? r : a);
  const last = rows[rows.length - 1];
  [...new Set([peakAll.year, last.year])].forEach(yr => {
    const r = rows.find(q => q.year === yr);
    el("circle", {cx: xs(r.year), cy: ys(r.awards), r: 4.5, fill: SEQ[5],
      stroke: "var(--paper)", "stroke-width": 1.5}, svg);
    txt(svg, `${N(r.awards)} in ${r.year}`, {x: xs(r.year) + (yr === last.year ? 10 : 0),
      y: ys(r.awards) - 12, "text-anchor": yr === last.year ? "end" : "middle",
      class: "pv-lab"});
  });
  rows.forEach(r => {
    hoverable(el("rect", {x: xs(r.year) - 8, y: m.t, width: 16, height: h,
      fill: "transparent"}, svg),
      `<b>${r.year}</b><br><span class="v">${N(r.awards)}</span> polymer completions,
       University of Akron`, `${r.year}: ${N(r.awards)}`);
  });
  document.getElementById("uatable").innerHTML = tableView("ua",
    "University of Akron polymer completions per year",
    ["Year", "Completions"], rows.map(r => [r.year, N(r.awards)]));
  document.getElementById("uasrc").innerHTML =
    `The composition is worse than the total: from ${N(D.ua.peak_recent)} completions in
     2016 to <b>${N(D.ua.latest)}</b> in 2023 (<b>${pct(D.ua.pct_off)}</b> down), with
     master&rsquo;s <b>${D.ua.masters_2016} &rarr; ${D.ua.masters_2023}</b>, doctorates
     <b>${D.ua.doctorate_2016} &rarr; ${D.ua.doctorate_2023}</b>, and an undergraduate line
     across those eight years of <b>${D.ua.bachelor_2016_2023.join(", ")}</b>. That last
     figure is the one to hold: <b>two</b> polymer undergraduates in 2023, at the school the
     field is named for. (IPEDS completions, Akron Main Campus, the three polymer codes, all
     levels.)`;
  document.getElementById("uanote").innerHTML =
    `<b>What the institutional record adds.</b> The 2020 cuts were university-wide, not
     polymer-specific: a $65M gap, 178 positions, six of eleven colleges eliminated; polymer
     survived, downgraded from College to School. In December 2024 a merger proposal would
     have cut ten polymer faculty, and <b>the board voted not to cut</b>, through a formal
     retrenchment committee whose report is public. The completions collapse is real and
     precedes both events, and it ran through the same years in which $7.1M of federal Tech
     Hub money and a share of a $31.25M state Innovation Hub award arrived. Institutional
     investment rose while the academic pipeline fell, at the same institution over the same
     years. The page does not claim the money caused the fall: completions lag enrolment by two to four
     years, so this is a fact about timing.`;
}

/* ------------------------------------------------------------ 7. what it pays */
{
  const rows = D.pay;
  const ROW = 36;
  const {svg, W, m, w} = chart("pay", {W: COL, rows: rows.length, rowH: ROW,
    m: {t: 78, r: 20, b: 54, l: 150}});
  const lo = 50000;
  const vals = rows.flatMap(r => [r.earn_1yr, r.earn_4yr]).filter(v => v != null);
  const hi = Math.max(...vals, rows[0].earn_4yr_p75_national || 0) * 1.05;
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;          // position, not length
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * ROW, xs, ys: () => 0,
    xt: ticks(lo, hi, 5), yt: [], xfmt: v => "$" + Math.round(v / 1000) + "k",
    band: [rows[0].earn_4yr_p25_national, rows[0].earn_4yr_p75_national],
    xlab: "Median earnings after a polymer engineering bachelor’s degree"});
  chartTitle(svg, "Every institution the Scorecard publishes clears $87,000 four years out",
    "Median earnings by institution, against the national middle half. Axis starts at $50,000.");
  txt(svg, "national middle half, 4 years out", {x: xs(rows[0].earn_4yr_p25_national),
    y: m.t - 8, class: "pv-labq"});
  rows.forEach((r, i) => {
    const y = m.t + i * ROW + 18;
    if (r.earn_1yr != null && r.earn_4yr != null)
      el("line", {x1: xs(r.earn_1yr), y1: y, x2: xs(r.earn_4yr), y2: y,
        stroke: "var(--pv-grid)", "stroke-width": 2}, svg);
    if (r.earn_1yr != null)
      el("circle", {cx: xs(r.earn_1yr), cy: y, r: 5, fill: SEQ[2],
        stroke: "var(--paper)", "stroke-width": 1.5}, svg);
    if (r.earn_4yr != null)
      el("circle", {cx: xs(r.earn_4yr), cy: y, r: 5.5, fill: SEQ[5],
        stroke: "var(--paper)", "stroke-width": 1.5}, svg);
    txt(svg, shortInst(r.institution), {x: m.l - 12, y: y + 4, "text-anchor": "end",
      class: "pv-lab"});
    const nat = rows[0].earn_4yr_national;
    hoverable(el("rect", {x: 0, y: y - 18, width: W, height: ROW, fill: "transparent"}, svg),
      `<b>${r.institution}</b> (${r.state})<br>
       1 year out: <span class="v">${money(r.earn_1yr)}</span> &middot;
       4 years out: <span class="v">${money(r.earn_4yr)}</span><br>
       median federal-loan debt at graduation: <span class="v">${money(r.debt)}</span><br>
       national 4-year median for the program code: <span class="v">${money(nat)}</span>`,
      `${r.institution}: ${money(r.earn_1yr)} at 1 year, ${money(r.earn_4yr)} at 4 years, debt ${money(r.debt)}`);
  });
  document.getElementById("paylegend").innerHTML =
    `<span><i style="background:${SEQ[2]};border-radius:50%"></i> 1 year after graduation</span>
     <span><i style="background:${SEQ[5]};border-radius:50%"></i> 4 years after</span>
     <span><i style="background:rgba(12,100,115,.12)"></i> national p25&ndash;p75, 4 years</span>`;
  document.getElementById("paytable").innerHTML = tableView("pay",
    "Scorecard earnings and debt, polymer engineering bachelor’s",
    ["Institution", "State", "Median 1 year out", "Median 4 years out",
     "Median federal-loan debt"],
    rows.map(r => [r.institution, r.state, money(r.earn_1yr), money(r.earn_4yr),
      money(r.debt)]));
  document.getElementById("paysrc").innerHTML =
    `Five institutions is the <b>complete published record, not a selection from it</b>: 84%
     of this program code&rsquo;s cells are privacy-suppressed, suppression tracks program
     size, and Akron&rsquo;s cells are among the suppressed. So these five are the biggest
     programs rather than a sample, and no average of them describes the field. The vintages
     differ by measure, which is why no debt-to-earnings ratio survives this chart: earnings
     one year out are the pooled 2020 cohorts, four years out the 2022 file, debt the 2019
     file. (College Scorecard field-of-study files, program code 14.32, federally aided
     graduates.)`;
}

/* closer */
{
  document.getElementById("closersub").innerHTML =
    `The numbers behind the sentence: <b>${pct(L.technician.survive_pct)}</b> technician
     survival against <b>${pct(L.degree.survive_pct)}</b> for degrees and
     <b>${pct(L.control.survive_pct)}</b> for the peer trades; <b>${pct(D.base.both_pct)}</b>
     of all ${D.base.ever} starts both tiny and short-lived; the anchor
     <b>${pct(D.ua.pct_off)}</b> below its own 2016 peak. The one program with three unbroken
     decades is Ferris State&rsquo;s, and why it held is the first interview, not a fact this
     dataset can supply.`;
}

/* The page’s own corrections, standing together — editorial standard rule 6. */
PV.whatWeGotWrong([
  {when: "2026-08-26 · found by an editorial audit, confirmed against the live API",
   was: "Every chart on this page counted a 2020, and the completions line described a flat pandemic year.",
   is: "There is no 2020 in this record. The federal mirror republishes 2019’s award counts under year=2020 - identical totals and identical institution sets, with the 2020 certificate codes applied over the top. Verified across all six census codes and reproduced nationally and in three states. The year is dropped, the line is drawn broken, and lifetime totals fall slightly because they no longer count 2019 twice: Ferris State 1,282 to 1,253, the started-and-failed base rate 43% to 45%.",
   why: "Every gate here asked whether the prose matched the data. None asked whether the data matched the world, so a duplicated year read as a credible flat spot and passed everything. A fidelity gate now fails any dataset where several series repeat the same year at once."},
  {when: "2026-08-26 · same audit",
   was: "The peer-trades control survived at 35%, against 27% for polymer technician programs - a gap of 8 points.",
   is: "The control survives at 48%, and the gap is 20 points. The control was never given the certificate canonicalisation the polymer side received on 2026-08-21, so one continuous welding certificate was being counted as one program that ended and another that started, inflating the number that ever existed without inflating the number still running.",
   why: "The two sides of a comparison were fixed on different days. A control measured by a different rule is not a control, and this one was quietly making the finding look weaker than it is."},
  {when: "2026-08-21 · caught by the claims harness at build",
   was: "The completions floor was “2006, at 380”, in the census README and an earlier draft of this page.",
   is: "The floor is 2007, at 379. The two years are a near-tie and the wrong one was named.",
   why: "A hand-read of the series picked the year the narrative expected. The deriver now computes the minimum and asserts it."},
  {when: "2026-08-21 · written, investigated, and retracted before publication",
   was: "“Nineteen technician programs ended in 2018–19”, a collapse attributed to a federal grant cycle ending, with what looked like striking corroboration: all nineteen were certificates.",
   is: "There was no 2018–19 wave. IPEDS renumbered certificate award levels in 2020, splitting every continuous certificate into a row that “ended 2018” and one that “started 2020.” The corroborating detail was the signature of the bug: only certificate codes were renumbered.",
   why: "A longitudinal count keyed on an administrative code was not checked for code changes across its span. Codes are now canonicalised before any counting, and the rule travels with the dataset."},
  {when: "2026-08-21 · corrected against the public institutional record",
   was: "An earlier telling said the University of Akron’s December 2024 polymer faculty cuts were carried out.",
   is: "The cuts were proposed and the board voted NOT to make them, through a formal retrenchment committee whose report is public. The threat was real, and the cuts did not happen.",
   why: "A proposal circulated more widely than the vote that rejected it."},
  {when: "2026-08-21 · caught at build",
   was: "Internal notes carried the Akron decline as “62% off peak.”",
   is: "The computed figure is 61% (44 completions against 114).",
   why: "A hand-rounded number outlived the calculation that produced it. The published figure is now computed and asserted."},
]);

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "programs", meta: D.meta});
})();
