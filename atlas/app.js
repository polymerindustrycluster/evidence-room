/* The Polymer Programs Atlas — teaching layer, v1.
 *
 * THE GATE (web/README.md), answered:
 *   0. Dataset: every institution that ever filed a polymer-group program in IPEDS
 *      1991-2023 (the polymer-programs-db census), aggregated to one row per institution
 *      and joined to IPEDS directory coordinates; plus the four institutions CONFIRMED to
 *      teach polymer science under chemistry codes, as hand rows.
 *   1. Benchmark: none — this is a directory drawn as a map, not a comparison. The one
 *      comparative panel (largest records) is labeled as institution-level and points at
 *      the programs page for the program-level construct.
 *   2. Encodings: dot AREA = lifetime completions (sqrt radius); hue = any program still
 *      conferring in 2023 vs no polymer-coded award that year; hollow diamond = confirmed
 *      census-invisible.
 *   3. Uncertainty: coordinate provenance per dot (seven city centroids named); the one
 *      institution outside the projection named in the caption; 'ever' vs 'still
 *      conferring' stated as different constructs and never shown as a ratio.
 *   4. Palette: sequential teal for the conferred-in-2023 / no-award-in-2023 pair; ink
 *      for the diamonds.
 *   7. No axes on the map; the basemap is pre-projected AlbersUSA at build time.
 *
 * DESK EDIT, 2026-08-22. Converted to the one-column layer (LAYOUT-SPEC 4b) and rewritten
 * against the editorial standard’s rules 7 and 8. Three things changed and none of them is
 * a number:
 *
 *   ORDER. The 147-row directory used to sit inside the map section, where it buried the
 *   second finding under a scrollable table. It is the register the map is drawn from, so
 *   it now sits in the appendix, after the closer, exactly where laborshed puts its matrix.
 *
 *   JARGON BUDGET. Two constructs before the first chart: what the federal record can see
 *   (a floor, not a census), and 'ever' against 'still conferring in 2023'. CIP codes,
 *   coordinate provenance, the AlbersUSA frame and the missing research layer all ship in
 *   the methodology block already, out of the data’s own meta keys, so cutting them from
 *   the hero loses no disclosure at all.
 *
 *   TWO DERIVED FIGURES, computed here rather than asserted. The Great Lakes count and the
 *   top-three share are new statements of the same frozen data; they are computed live so
 *   they cannot drift from the file, but they carry no claims.json assertion yet and should
 *   get one (claims.json is out of a desk editor’s scope).
 *
 * THE MAP’S GEOMETRY. LAYOUT-SPEC rule 2 wants the viewBox at the column width 1:1 so that
 * 14px type renders at 14px. The basemap is pre-projected into the us-atlas 975x610 frame
 * and reprojecting it would change coordinates, so the frame is scaled into the column by a
 * transform instead and every label is drawn OUTSIDE that transform, in true page pixels.
 * The map keeps its own aspect (455px of map under a 46px title block) rather than the
 * ~250px of rule 4: a chart is short when its ink does not fill the box, and a US map’s ink
 * is the frame.
 */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, chart, figures, N, SEQ, INK} = PV;
const D = await PV.data("viz-data.json");

/* THE COLD OPEN (guarded by tools/coldopen.mjs). This page opened on 1,124 pixels of
   prose before its first mark. The strip is the record at its coarsest: every
   institution that ever filed, one tick, placed by the size of its lifetime record,
   teal-lime where a polymer-coded award was filed in 2023 and pale where none was, the
   three deep records named. It is deliberately a POORER view than the map below: no
   geography, no hover, no diamonds. Its job is to
   show the shape of the record, many small and three enormous, and hand the reader on. */
{
  const svg = document.getElementById("open");
  if (svg) {
    const W = Math.round(svg.getBoundingClientRect().width) || 720;
    const H = 132;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    /* EVERY institution, not every DOT. The strip places an institution by the size of its
       lifetime record and nothing else, so the one the AlbersUSA frame cannot carry (San
       German, Puerto Rico) belongs here even though it cannot go on the map: a size axis
       has no projection to fall off. Drawing D.dots alone put 146 ticks under a caption
       that said 147 and showed 105 of the record's 106 ended institutions, which is the
       rule stated below `ALL` - any count that says "the record" is taken from ALL, never
       from the dots - broken in the one figure that had no data reason to break it. The
       caption now counts what was drawn, so the two cannot drift apart again. */
    const rows = [...D.dots, ...D.off_projection].sort((a, b) => a.total_awards - b.total_awards);
    const max = rows[rows.length - 1].total_awards;
    const lo = 10, hi = W - 10, y = 84;
    const x = v => lo + Math.sqrt(v / max) * (hi - lo);
    const ACTIVE = "#B8D637", NO_AWARD_2023 = "rgba(255,255,255,.34)";
    /* key before data, in reading order */
    const kA = txt(svg, "still conferring in 2023", {x: lo, y: 18, "font-size": 12.5,
      fill: ACTIVE, "font-weight": 700});
    /* THE KEY NAMES THE MEASUREMENT, NOT AN INFERENCE FROM IT. The pale key said
       "ended", which a reader hears as "closed". The flag behind those ticks is
       active_programs == 0: the institution filed no completion under one of the three
       polymer CIP codes in the single year 2023. Westlawn is still building boats and
       Northwest State still awards a plastics AAS; both are pale here, and both were
       libelled by the old word.

       The honest label is four times the length of the dishonest one, so its position is
       measured rather than the hand-typed offset that carried "ended": both keys sit on
       one line where the column can hold them, and the pale one drops to a second line
       where it cannot. At 360px the old constant would have run the key past the frame,
       which is the collide gate's failure and, worse, a key a narrow reader never sees. */
    const KEY2 = "no polymer-coded award in 2023";
    const wA = kA.getComputedTextLength ? kA.getComputedTextLength() : 148;
    const probe = txt(svg, KEY2, {y: -99, "font-size": 12.5, "font-weight": 700});
    const wB = probe.getComputedTextLength ? probe.getComputedTextLength() : 196;
    probe.remove();
    const inline = lo + wA + 20 + wB <= hi;
    txt(svg, KEY2, {x: inline ? lo + wA + 20 : lo, y: inline ? 18 : 36,
      "font-size": 12.5, fill: "rgba(255,255,255,.62)", "font-weight": 700});
    for (const r of rows)
      el("line", {x1: x(r.total_awards).toFixed(1), y1: y - 16,
        x2: x(r.total_awards).toFixed(1), y2: y + 16,
        stroke: r.active_programs > 0 ? ACTIVE : NO_AWARD_2023, "stroke-width": 2}, svg);
    /* One caption names the trio; per-tick labels collided (the three deep records sit
       within 15% of each other on a sqrt scale, and three 13px names do not fit there). */
    txt(svg, "the three deep records: Lowell, Big Rapids, Akron", {x: hi, y: y - 24,
      "text-anchor": "end", "font-size": 13, fill: "#fff", "font-weight": 700});
    txt(svg, `${rows.length} institutions, placed by lifetime record size`,
      {x: lo, y: H - 8, "font-size": 12.5, fill: "#C6E2E6"});
  }
}
const T = D.totals;
const Cap = s => s === s.toUpperCase()
  ? s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/\bIncorporated\b/, "").trim()
  : s;
const yrs = r => r.first_year === r.last_year ? `${r.first_year}` : `${r.first_year}–${r.last_year}`;
const still = r => r.active_programs > 0;
const pct = v => (v * 100).toFixed(1) + "%";
/* The table prints the postal abbreviation but must answer to the state’s name: the filter
   searches rendered text, and "Ohio" is what a reader types when the cell says "OH". The
   name rides along visually hidden, which also gives a screen reader the full word. */
const STATE = {AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",
  ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",
  ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",
  MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",
  OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",PR:"Puerto Rico",RI:"Rhode Island",
  SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
  DC:"District of Columbia"};
const stateCell = s => `${s}<span class="pv-sr"> ${STATE[s] || ""}</span>`;

/* THE COLUMN, 1:1. The svg viewBox is the figure width in page pixels, so 14px inside a
   chart is 14px on the page (LAYOUT-SPEC rules 2 and 4). */
const COL = 728;
/* A chart’s title is a CLAIM in body weight, ON the page rail, with the units as a smaller
   second line. x=0 in the viewBox IS the rail, because the svg fills the column exactly. */
function chartTitle(svg, claim, unit) {
  txt(svg, claim, {x: 1, y: 13, class: "pv-lab", fill: "var(--text)"});  /* x=1: at 360px several sizes put 1px of the first glyph left of the viewBox edge */
  if (unit) txt(svg, unit, {x: 0, y: 31, class: "pv-tick", fill: "var(--caption)"});
}

/* Every institution in the record, mapped or not: 146 dots plus the one the projection
   cannot place. Any count that says "the record" is taken from this, never from the dots. */
const ALL = [...D.dots, ...D.off_projection];
const ranked = [...D.dots].sort((a, b) => b.total_awards - a.total_awards);
const awardsAll = ALL.reduce((a, d) => a + d.total_awards, 0);
const top3 = ranked.slice(0, 3);
const awards3 = top3.reduce((a, d) => a + d.total_awards, 0);
/* The eight states that touch the Great Lakes. A named, closed list, so the reader can
   check the claim against the map rather than take a region word on trust. */
const GL = ["OH", "MI", "IN", "IL", "WI", "PA", "NY", "MN"];
const glN = ALL.filter(d => GL.includes(d.state)).length;
const solo = D.states_list.filter(s => s.ever === 1).length;
const realStates = D.states_list.filter(s => s.state !== "DC" && s.state !== "PR").length;

/* ------------------------------------------------------------ hero figures */
/* The counts stay exactly as they were; what changed is that each one now says what it is
   in words a reader can hold, and the ban on dividing the first two rides on the second
   tile, which is the sentence that would be false without it. */
figures([
  ["key", N(T.ever), "institutions, ever",
   `have reported at least one polymer degree or certificate since 1991. A floor: the
    record misses programs housed under other headings.`],
  /* THE GUARD-RAIL USED TO SAY SOMETHING FALSE. "It is not the survivors of the 147" was
     written to stop a reader computing 41/147, and it stopped them by denying set
     membership: all 41 of these institutions ARE among the 147, and a reader who checks
     the register finds them there. A guard that can be caught out teaches the reader to
     ignore the next one. What is actually wrong with the ratio is the DENOMINATOR and the
     UNIT, so that is what this now says. */
  ["", N(T.active), "were still awarding in 2023",
   `a single year’s count, taken from the same ${N(T.ever)}. Dividing the two is not a
    survival rate: the denominator is a 33-year union that counts colleges shut for
    decades, and survival on this record is measured program by program and above a size
    threshold, which is a different page. This one never divides one by the other.`],
  ["", N(T.states), "states and territories",
   `${realStates} states, plus the District of Columbia and Puerto Rico. ${solo} of the
    ${N(T.states)} hold exactly one institution.`],
  ["", String(D.invisible.length), "teach it where the record cannot look",
   `confirmed to teach polymer science under a chemistry heading. They are the hollow
    diamonds, and there are certainly more.`],
]);

/* ------------------------------------------------------------------ the map */
{
  /* 975x610 is the us-atlas frame the basemap was projected into at build time. S scales
     that frame into the column; TOP leaves room for the claim title above it. */
  const S = COL / 975, TOP = 46;
  const H = Math.round(TOP + 610 * S);
  const {svg} = chart("map", {W: COL, H});
  chartTitle(svg,
    `${glN} of the ${N(T.ever)} institutions sit in the eight states that touch the Great Lakes`,
    "One dot is one institution, sized by the square root of its 1991–2023 total.");
  const g = el("g", {transform: `translate(0,${TOP}) scale(${S.toFixed(6)})`}, svg);
  el("path", {d: D.basemap.nation, fill: "#F4F2EE", stroke: "none"}, g);
  el("path", {d: D.basemap.states, fill: "none", stroke: "#D8D3CA", "stroke-width": 1}, g);
  const r = v => 2 + Math.sqrt(v) * 0.32;
  /* Light (no award in 2023) dots draw first, then dark (conferring), then the diamonds
     — the marks a reader must be able to find are never buried under the ones they
     outnumber. */
  const order = [...D.dots].sort((a, b) => (still(a) ? 1 : 0) - (still(b) ? 1 : 0) || b.total_awards - a.total_awards);
  order.forEach(d => {
    const node = el("circle", {cx: d.x, cy: d.y, r: r(d.total_awards),
      fill: still(d) ? SEQ[5] : SEQ[1], "fill-opacity": still(d) ? .82 : .6,
      stroke: "var(--paper)", "stroke-width": .8}, g);
    hoverable(node,
      `<b>${Cap(d.name)}</b><br>${d.city}, ${d.state}<br>
       ${d.programs} program${d.programs > 1 ? "s" : ""} · ${d.levels.split(",").join(", ")}<br>
       <span class="v">${N(d.total_awards)}</span> completions, ${yrs(d)}<br>
       ${still(d) ? `<span class="v">${d.active_programs}</span> still conferring, 2023`
                  : `no polymer-coded award in 2023; last one ${d.last_year}`}
       ${d.coord_source.startsWith("hand") ? `<br><span style="font-size:12px">${d.coord_source}</span>` : ""}`,
      `${Cap(d.name)}, ${d.city} ${d.state}: ${N(d.total_awards)} completions, ${yrs(d)}, ` +
      (still(d) ? "still conferring in 2023" : "no polymer-coded award in 2023"));
  });
  D.invisible.forEach(d => {
    const s = 7;
    const node = el("path", {d: `M${d.x},${d.y - s}L${d.x + s},${d.y}L${d.x},${d.y + s}L${d.x - s},${d.y}Z`,
      fill: "var(--paper)", stroke: INK, "stroke-width": 2.2}, g);
    hoverable(node,
      `<b>${d.name}</b><br>${d.city}, ${d.state}<br>Confirmed to teach polymer science under
       chemistry or chemical-engineering codes, and so <b>invisible to this census</b>. No
       completions count exists for it here, which is the point.`,
      `${d.name}: confirmed census-invisible polymer teaching`);
  });
  /* THREE ANCHORS, NOT 147 (LAYOUT-SPEC rule 6). The three places the hero names are the
     three a reader should be able to find without hovering; everything else is the hover
     and the register. Drawn outside the scaled group so the type is true page pixels, with
     a paper-colored halo because a map label sits over ink it does not own. */
  const ANCHORS = [
    {name: "University of Massachusetts-Lowell", label: "Lowell", dx: 0, dy: -26, at: "middle"},
    {name: "Ferris State University", label: "Big Rapids", dx: 0, dy: -20, at: "middle"},
    {name: "University of Akron Main Campus", label: "Akron", dx: 19, dy: 4, at: "start"},
  ];
  ANCHORS.forEach(a => {
    const d = D.dots.find(x => x.name === a.name);
    if (!d) return;
    txt(svg, a.label, {x: d.x * S + a.dx, y: d.y * S + TOP + a.dy, "text-anchor": a.at,
      class: "pv-lab", fill: "var(--text)", stroke: "var(--paper)", "stroke-width": 3.5,
      "paint-order": "stroke", "stroke-linejoin": "round"});
  });
  document.getElementById("maplegend").innerHTML =
    `<span><i style="background:${SEQ[5]};border-radius:50%"></i> still conferring, 2023</span>
     <span><i style="background:${SEQ[1]};border-radius:50%;opacity:.7"></i> no polymer-coded award in 2023</span>
     <span><i style="background:var(--paper);box-shadow:inset 0 0 0 2px ${INK};transform:rotate(45deg)"></i> confirmed invisible to the census</span>`;
  const offp = D.off_projection[0];
  /* The caption’s first sentence is what a reader would otherwise get wrong about THIS
     chart: a big dot is a long record, not a big program now. */
  document.getElementById("mapsrc").innerHTML =
    `<b>A big dot is a long record, not a large program today</b>: a dot&rsquo;s radius
     follows the square root of everything an institution ever conferred across 33 years,
     so a school that stopped in 1998 can outdraw one teaching a full class this term.
     The scale also carries a minimum size so the smallest records stay visible, which
     means the dots rank the record and do not compare areas: the largest is thousands of
     times the smallest and is not drawn thousands of times its size. Seven institutions left the federal
     directory before it carried coordinates in 2009 and sit at their city&rsquo;s
     centroid, and each says so in its hover. <b>Leaving the directory is not closing.</b>
     Three of those seven rows are confirmed closures, Akron Machining Institute in 2007
     and Acme Institute of Technology&rsquo;s two Wisconsin campuses in 1995, which is two
     institutions across three rows; Westlawn Institute of Marine Technology and the Red
     Wing campus of Minnesota State College Southeast are both still operating; the
     remaining two are unestablished. One institution sits outside the frame entirely,
     <b>${Cap(offp.name)}</b> (${offp.city}, PR; ${N(offp.total_awards)} completions, last
     in ${offp.last_year}; the university is open), because the standard AlbersUSA
     projection carries no Puerto Rico inset; it is in the register at the foot of this
     page with everything else. Alaska and Hawaii are drawn in their usual insets and are
     empty because no polymer-coded institution has ever filed from either. IPEDS completions by six-digit program code, 1991&ndash;2023,
     aggregated to institutions, joined to IPEDS directory coordinates.`;
  document.getElementById("mapnote").innerHTML =
    `<b>What the diamonds mean, and what this version leaves out.</b>
     UChicago&rsquo;s molecular engineering school, Dartmouth, Rutgers and Brown are
     <b>confirmed</b> to teach polymer science under headings this census cannot see, so
     they are drawn at the same scale as everything it catches and the blind spot is on the
     map itself. A research layer, institution-level polymer output from OpenAlex, is
     deliberately absent from this version: its candidate list is zero-verified and the API
     is metered, so it is the named next step rather than a silent omission.`;
}

/* -------------------------------------------------------- the largest records */
{
  const rows = ranked.slice(0, 12);
  const ROW = 26;
  const {svg, W, m, w} = chart("top", {W: COL, rows: rows.length, rowH: ROW,
    m: {t: 62, r: 52, b: 32, l: 172}});
  const maxV = rows[0].total_awards * 1.06;
  const xs = v => m.l + (v / maxV) * w;                     // LINEAR from zero
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * ROW, xs, ys: () => 0,
    xt: ticks(0, maxV, 4), yt: []});
  chartTitle(svg, "The fourth largest record is just over half the size of the third",
    "Every polymer program the institution ever filed, summed. Axis starts at zero.");
  /* The row label is the institution, short enough to leave the bars room: 330 units of a
     1100-unit box for names was a fifth of the figure saying what the table says in full.
     The full name rides in the tooltip and in both tables. */
  const short = s => Cap(s)
    .replace(/^University of Massachusetts-Lowell$/, "UMass Lowell")
    .replace(/^University of Massachusetts-Amherst$/, "UMass Amherst")
    .replace(/^Pennsylvania State University.*Behrend.*$/, "Penn State Behrend")
    .replace(/^Pennsylvania College of Technology$/, "Penn College")
    .replace(/^Wichita State University-Campus of Applied Sciences and Technology$/, "Wichita State Tech")
    .replace(/^Case Western Reserve University$/, "Case Western")
    .replace(/^Hennepin Technical College$/, "Hennepin Tech")
    .replace(/ Main Campus$/, "")
    .replace(/ Community College$/, " CC")
    .replace(/ University$/, "");
  rows.forEach((d, i) => {
    const y = m.t + i * ROW + 4, bh = 17;
    el("rect", {x: m.l, y, width: Math.max(2, xs(d.total_awards) - m.l), height: bh,
      fill: still(d) ? SEQ[5] : SEQ[1], rx: 3}, svg);
    txt(svg, short(d.name), {x: m.l - 10, y: y + bh - 4, "text-anchor": "end",
      class: still(d) ? "pv-lab" : "pv-labq"});
    txt(svg, N(d.total_awards), {x: xs(d.total_awards) + 8, y: y + bh - 4,
      class: still(d) ? "pv-lab" : "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 4, width: W, height: bh + 8, fill: "transparent"}, svg),
      `<b>${Cap(d.name)}</b> (${d.city}, ${d.state})<br>${d.programs} programs · ${d.levels.split(",").join(", ")}
       <br><span class="v">${N(d.total_awards)}</span> completions, ${yrs(d)}`,
      `${Cap(d.name)}: ${N(d.total_awards)} completions`);
  });
  document.getElementById("toptable").innerHTML = tableView("top",
    "The twelve largest institutional records",
    ["Institution", "State", "Programs", "Lifetime completions", "Years",
     "Polymer-coded award 2023"],
    rows.map(d => [d.url ? `<a href="${d.url}" target="_blank" rel="noopener">${Cap(d.name)}</a>`
                         : Cap(d.name),
      stateCell(d.state), d.programs, N(d.total_awards), yrs(d),
      still(d) ? "yes" : "no"]));
  PV.tableTools("#toptable");
  /* Every one of the twelve is still conferring, so the two-colour legend this chart used
     to carry advertised a category with no marks in it. The fact is worth a sentence
     instead, and it is counted here rather than asserted in the markup. */
  const stillN = rows.filter(still).length;
  document.getElementById("topsrc").innerHTML =
    `${stillN === rows.length
      ? `<b>All ${rows.length} of these institutions still had a polymer program conferring
         in 2023</b>, which is why every bar is the same colour.`
      : `<b>${stillN} of these ${rows.length} still had a polymer program conferring in
         2023</b>; the pale bars are the ones with no polymer-coded award that year.`}
     <b>The three deepest records sum to ${N(awards3)} of the record&rsquo;s ${N(awardsAll)}
     completions, ${pct(awards3 / awardsAll)}</b>: ${Cap(top3[0].name)} in Lowell,
     Massachusetts, Ferris State in Big Rapids, Michigan, and the University of Akron. Each
     bar is an institution-level total, every program it ever filed under the polymer
     headings, summed. The state ranking depends on which unit you pick: Michigan has
     ${D.states_list[0].ever} institutions ever to Ohio&rsquo;s
     ${D.states_list.find(s => s.state === "OH").ever}, while Ohio leads on substantive
     <i>programs</i> over on the programs page. Both are true, and neither substitutes for
     the other.`;
}

/* ------------------------------------------------------- the register (appendix)
   THE DIRECTORY IS THE POINT OF THIS PAGE, so its table is a directory and not a
   transcript of a chart: the institution name links out, and a reader can sort and filter
   147 rows instead of reading them. What it links to is bounded by what the record holds.
   IPEDS carries no program-level URLs, so the name goes to the institution’s own site (the
   140 the directory publishes) and a second column goes to that institution’s page in the
   federal record, which lists its programs by code. Nothing here is a guessed deep link. */
{
  const site = d => d.url
    ? `<a href="${d.url}" target="_blank" rel="noopener">${Cap(d.name)}</a>`
    : Cap(d.name);
  const record = d => d.navigator
    ? `<a href="${d.navigator}" target="_blank" rel="noopener">federal record</a>` : "&ndash;";
  document.getElementById("dirlede").innerHTML =
    `Every dot on the map is a row here, largest record first, and so is the one institution
     the projection could not place. Sort any column; filter by institution, city or state.`;
  document.getElementById("maptable").innerHTML = tableView("map",
    "The full directory: every institution, largest record first",
    ["Institution", "City", "State", "Programs", "Levels", "Years", "Lifetime completions",
     "Polymer-coded award 2023", "Programs by code"],
    [...ALL].sort((a, b) => b.total_awards - a.total_awards)
      .map(d => [site(d), d.city, stateCell(d.state), d.programs, d.levels.split(",").join(", "),
        yrs(d), N(d.total_awards), still(d) ? `yes (${d.active_programs})` : "no",
        record(d)]));
  PV.tableTools("#maptable", {placeholder: "institution, city, state…"});
  document.getElementById("dirsrc").innerHTML =
    `Institution names link to the institution&rsquo;s own site wherever the federal
     directory publishes one (140 of ${N(T.ever)}; the seven without a link left the
     directory before the build&rsquo;s coordinate vintage), and the last column links that
     institution&rsquo;s page in the federal record, which lists its programs by code.
     <b>There are no program-level links because the record holds none</b>: a deep link to
     a specific programme page would be a guess. Levels are the award levels the
     institution filed under the polymer headings across the whole span, not what it offers
     today.`;
}

/* closer */
{
  document.getElementById("closersub").innerHTML =
    `${N(T.ever)} institutions have reported a polymer degree or certificate since 1991;
     ${N(T.active)} were still awarding one in 2023; the record reaches ${realStates}
     states, the District of Columbia and Puerto Rico; ${D.invisible.length} more teach
     polymer science where the record cannot look. The deepest record is
     ${Cap(D.top.name)}&rsquo;s ${N(D.top.total_awards)} completions. The research layer is
     the named next step.`;
}

/* THE PAGE’S OWN CORRECTIONS, standing together on the page where the error was made
   (editorial standard rule 6, the same block the programs page carries). A reader could
   have quoted the closure sentence at a named college, so the retraction belongs here and
   not only in CORRECTIONS.md. */
PV.whatWeGotWrong([
  {when: "2026-09-01 &middot; found by a documentary check of the institutions themselves",
   was: `This page said <b>&ldquo;Seven institutions closed before the federal directory
     carried coordinates in 2009&rdquo;</b>, described the seven institutions without a
     website link as &ldquo;closures&rdquo;, named the Puerto Rico row as
     &ldquo;ended&rdquo;, and keyed every pale mark on the map, in the opening strip, in
     the hover, in the screen-reader text and in both tables with the single word
     <b>&ldquo;ended&rdquo;</b>.`,
   is: `Three of the seven rows are confirmed closures, which is two institutions: Akron
     Machining Institute in 2007 and Acme Institute of Technology&rsquo;s two Wisconsin
     campuses in 1995. Westlawn Institute of Marine Technology and the Red Wing campus of
     Minnesota State College Southeast are still operating; two are unestablished. The
     Puerto Rico institution&rsquo;s last polymer-coded award was in 1999 and the
     university is open. The pale key now says what the flag measures,
     <b>no polymer-coded award in 2023</b>, because four pale institutions were confirmed
     on 2026-09-01 to be still teaching the subject: Northwest State Community College,
     Mid Michigan College, Davis Technical College and Skagit Valley College.`,
   why: `The flag is one year of federal filings and it was published under a word that
     reads as a verdict on the institution. Every gate on this page asked whether a
     sentence matched the data; none asked whether a word claimed more than the data
     could carry, and a closure is the kind of claim a college notices.`},
  {when: "2026-09-01 &middot; same check",
   was: `The 147 was presented throughout as a count of institutions.`,
   is: `It is a count of federal identifiers. A retired identifier and its successor both
     appear, so Penn State holds two rows and so does New York University, and Acme
     Institute of Technology holds one for each of its two campuses. Collapsing them would
     give about 144 distinct institutions and about 103 without a polymer-coded award in
     2023. The page still prints 147 and 106 because every figure on it is built from
     rows; the collapse is a change to the data rather than to the writing, and it is the
     named next step. The overcount is stated in the methodology so that nobody has to
     find it twice.`,
   why: `The build joined the census to the federal directory by identifier and nothing
     asked whether one institution could arrive under two of them.`},
]);

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
const method = await PV.methodology({page: "atlas", meta: D.meta});

/* THE APPENDIX GOES BEFORE THE METHODOLOGY, NOT AFTER IT. picviz.js inserts the methodology
   block immediately after the closer, which is right for a page whose reference matter is
   only that block; this page also carries the register, and LAYOUT-SPEC rule 8 orders the
   tail story, closer, appendix, methodology. Same move, same reason, as laborshed. */
const appendix = document.querySelector(".appendix");
if (method && appendix) method.parentNode.insertBefore(appendix, method);
})();
