/* The occupations inside plastics and rubber manufacturing — rebuilt as one argument.
 *
 * THE ARC (each section's lede carries the previous section's conclusion forward):
 *   1. STAFFING  the industry is floor work; the distinctive engineer/scientist share
 *                is 4.0% and small.
 *   2. PAY       the floor is paid near the national rate; the distinctive degree
 *                group is paid under it in every metro. The chart is grouped by
 *                schooling band and each band's ratio-to-national is written on it.
 *   3. SCHOOLING which jobs those are: every degree-majority occupation is an
 *                engineer or scientist job.
 *   4. PIPELINE  the local polymer-degree count ran 118–179 a year 2014–2021, then
 *                54 and 63 — under half its earlier pace for two straight years.
 *
 * THE GATE (web/README.md), answered:
 *   0. Dataset: one detailed occupation (six-digit federal occupation code) — its share
 *      of the industry nationally (BLS National Employment Matrix), its annual median
 *      wage in four Northeast Ohio metros and nationally (BLS OEWS, May 2024, all
 *      industries), the education its workers report (O*NET 30.3), and, for the degree
 *      occupations, the degrees the region's universities confer (IPEDS by CIP).
 *   1. Benchmark: the SAME occupation nationally — the industry's own total for the
 *      staffing share; the national all-industry median for the wage.
 *   2. Encodings: bar length = share of industry (linear from zero); dot position =
 *      annual median dollars (linear, axis base stated); stacked bar segment = share of
 *      respondents by education level (100% bars); bar length = degrees a year (linear
 *      from zero).
 *   3. Uncertainty: survey RSE in table and hover; withheld cells shown as withheld,
 *      never zero; the regional occupation counts are ESTIMATES and the note says so;
 *      the 2022–32 openings are a projection and are labeled as one; the degree drop is
 *      two observed years and the lede says what could fake it (a program recode).
 *   4. Palette: the validated categorical for the three metros; a sequential teal ramp
 *      for the ORDINAL education levels; ink for the nation. One accent, one job.
 *   5. Interaction: one occupation selector (lookup rung of the ladder) that highlights
 *      the same SOC row across the mix, pay and education charts and recomposes one
 *      templated sentence. Default state tells the full story; claims guard it.
 *   6. Mobile: every chart re-lays out per form below 760px — labels above marks, no
 *      sideways scroll. Evidence in the first paint.
 */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, chart, figures, N, SEQ, CAT, INK} = PV;
const D = await PV.data("viz-data.json");
const M = D.meta;
const money = v => v == null ? "—" : "$" + Math.round(v).toLocaleString("en-US");
const pct = (v, d = 1) => v == null ? "—" : v.toFixed(d) + "%";
const x = v => v == null ? "—" : v.toFixed(2) + "×";
const AREAS = ["10420", "17410", "15940", "49660"];          // Akron, Cleveland, Canton, Youngstown
const ON_CHART = ["10420", "17410", "15940"];                // the three with the most disclosed cells
const COLOR = {"10420": CAT[0], "17410": CAT[1], "15940": CAT[2]};
const short = a => M.metros[a].short;

/* Row labels are presentation, not data: the federal titles run to eleven words. */
const SHORT = {
  "51-4072": "Molding machine setters", "51-2090": "Assemblers and fabricators",
  "51-1011": "Production supervisors", "51-9061": "Inspectors and testers",
  "51-4021": "Extruding machine setters", "53-7062": "Laborers and material movers",
  "51-9041": "Forming and pressing machine setters", "53-7064": "Packers, hand",
  "51-9197": "Tire builders", "49-9041": "Industrial machinery mechanics",
  "49-9071": "Maintenance and repair workers", "43-5071": "Shipping and receiving clerks",
  "17-2112": "Industrial engineers", "51-4031": "Cutting and press machine setters",
  "51-4081": "Multiple machine tool setters", "51-9111": "Packaging machine operators",
  "51-9011": "Chemical equipment operators", "51-9023": "Mixing and blending setters",
  "11-3051": "Industrial production managers", "17-2041": "Chemical engineers",
  "17-2131": "Materials engineers", "19-2031": "Chemists", "19-2032": "Materials scientists",
  "17-2141": "Mechanical engineers", "17-3026": "Industrial engineering technicians",
  "19-4031": "Chemical technicians",
};
const name = r => SHORT[r.soc] || r.occupation;
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen"];
const Cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const tq = s => String(s).replace(/'/g, "\u2019");   // presentation only: data strings keep straight quotes in the file
const MOBILE = matchMedia("(max-width: 760px)");

/* CAVEAT INK GOES IN THE TABLE, NOT UNDER THE CHART.
   The budget is 45 visible words per figure: one source line and one limitation sentence.
   Everything else a reader needs only while reading the numbers themselves \u2014 the code
   lists, the never-sum rule, the per-metro disclosure counts \u2014 belongs inside the
   disclosure that holds those numbers, at footnote scale and one weight. This appends it
   to the table twin the shared builder returns, so there is still exactly one place per
   figure where the apparatus lives. */
const withNote = (html, note) =>
  html.replace("</details>", `<p class="tnote">${note}</p></details>`);

/* --------------------------------------------------- the three schooling groups */
const ET = D.education_totals;
const DEG = new Set(ET.ba_plus_majority), HS = new Set(ET.hs_majority);
const grp = soc => DEG.has(soc) ? "deg" : HS.has(soc) ? "hs" : "mid";
const byMedian = (a, b) => (b.national && b.national.median) - (a.national && a.national.median);
const GROUPS = [
  {key: "deg", label: "Degree jobs", rows: D.pay.filter(r => grp(r.soc) === "deg").sort(byMedian)},
  {key: "mid", label: "In between", rows: D.pay.filter(r => grp(r.soc) === "mid").sort(byMedian)},
  {key: "hs", label: "High-school jobs", rows: D.pay.filter(r => grp(r.soc) === "hs").sort(byMedian)},
];
const payRows = GROUPS.flatMap(G => G.rows);
const paySoc = Object.fromEntries(payRows.map(r => [r.soc, r]));
const mixSoc = Object.fromEntries(D.mix.map(r => [r.soc, r]));
const eduAll = D.education.filter(r => r.bins);
const eduSoc = Object.fromEntries(eduAll.map(r => [r.soc, r]));
const eduRows = payRows.map(r => eduSoc[r.soc]).filter(Boolean);
const nDeg = eduRows.filter(r => grp(r.soc) === "deg").length;   // the shaded band, both charts
const RB = D.pay_totals.ratio_by_metro;

/* Polymer conferrals by year, summed across programs — the pipeline finding. */
const progYears = [...new Set(D.programs.flatMap(p => Object.keys(p.by_year)))].sort();
const polyByYear = Object.fromEntries(progYears.map(y =>
  [y, D.programs.filter(p => p.group === "polymer")
       .reduce((s, p) => s + (p.by_year[y] || 0), 0)]));
const progRows = [...D.programs].sort((a, b) =>
  (a.group === b.group ? b.window_avg - a.window_avg : a.group === "polymer" ? -1 : 1));
const nPoly = progRows.filter(p => p.group === "polymer").length;
const PT = D.program_totals, WIN = PT.window;

/* ------------------------------------------------------------ hero figures */
const setters = D.mix.find(m => m.soc === "51-4072");
/* Card 1 carries the headline's other half. The hero used to open with a two-clause
   sentence that towered to six lines of display type; the "one job in nine" clause reads
   better as the number it is than as the back half of a headline. */
figures([
  ["key", pct(setters.pct_of_industry), "of the industry’s jobs", `are molding-machine setters: one job in ${WORDS[Math.round(100 / setters.pct_of_industry)]}, 2024`],
  ["", pct(setters.pct_of_occupation, 0), "of the nation’s setters", "work in plastics and rubber manufacturing"],
  ["", N(D.mix_totals.industry_emp_2024_k * 1000), "jobs in the industry", "nationally, 2024"],
  ["", pct(D.mix_totals.eng_sci_share_pct), "engineers, scientists, technicians", "the jobs the region claims distinction in, and a small share of the work"],
]);

/* The byline's month is read from the data vintage rather than typed, so it cannot drift
   from the figures it dates. The static copy in index.html is the no-script fallback and
   says the same thing; claim occ-byline holds them to it. */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
                "September", "October", "November", "December"];
{
  const [fy, fm] = M.fetched.split("-");
  document.getElementById("byline").innerHTML =
    `By <b>John Swanson</b>, analysis and graphics &middot; Data BLS, O*NET and IPEDS
     &middot; ${MONTHS[+fm - 1]} ${fy}`;
}

/* ------------------------------------------------- occupation selector + verdict */
let SEL = null;                                  // selected SOC, or null = all
const dim = soc => SEL && soc !== SEL;
/* On the mix chart, a selection outside the top fourteen dims nothing — the verdict
   sentence says the occupation is outside the list; ghosting all fourteen rows would
   read as a broken chart. */
const dimMix = soc => SEL && mixSoc[SEL] && soc !== SEL;
function verdict() {
  const v = document.getElementById("overdict");
  if (!SEL) {
    v.innerHTML = `<b>All ${D.pay_totals.occupations} occupations:</b> the industry’s
      ${WORDS[D.mix_totals.top_n] || D.mix_totals.top_n} largest hold
      ${pct(D.mix_totals.top_n_share_pct)} of its national employment, and every metro pays
      the ${WORDS[ET.ba_plus_majority.length]} degree occupations further under the nation
      than the ${WORDS[ET.hs_majority.length]} high-school ones. Pick an occupation to
      follow its row across the charts.`;
    return;
  }
  const p = paySoc[SEL], m = mixSoc[SEL], e = eduSoc[SEL];
  const shareClause = m
    ? `<b>${pct(m.pct_of_industry)}</b> of the industry’s jobs nationally`
    : `outside the industry’s ${WORDS[D.mix_totals.top_n] || D.mix_totals.top_n} largest occupations`;
  const area = AREAS.find(a => !p.metros[a].absent);
  const payClause = area
    ? `${M.metros[area].short} median <b>${money(p.metros[area].median)}</b> against
       ${money(p.national && p.national.median)} nationally (${x(p.metros[area].median_vs_us)})`
    : `wages withheld in all four metros (national median ${money(p.national && p.national.median)})`;
  const g = grp(SEL);
  const eduClause = !e ? "" : g === "deg"
    ? "; most surveyed workers report a bachelor’s degree or more"
    : g === "hs" ? "; most surveyed workers report high school or less"
    : "; schooling reports split between high school and college";
  /* Reader words, not the agency's initials: the acronym belongs in the methodology box
     and the table note, where a reader who wants to re-run this can find it. */
  const openClause = p.projection
    ? `; the state projects ${N(p.projection.openings_annual)} openings a year in northeast Ohio through 2032`
    : "";
  v.innerHTML = `<b>${SHORT[SEL] || p.occupation}:</b> ${shareClause}; ${payClause}${eduClause}${openClause}.`;
}
{
  const sel = document.getElementById("osel");
  const all = document.createElement("option");
  all.value = ""; all.textContent = `All ${D.pay_totals.occupations} occupations`;
  sel.appendChild(all);
  GROUPS.forEach(G => {
    const og = document.createElement("optgroup");
    og.label = `${G.label} · ${G.rows.length}`;
    G.rows.forEach(r => {
      const o = document.createElement("option");
      o.value = r.soc; o.textContent = SHORT[r.soc] || r.occupation;
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
  sel.addEventListener("change", () => {
    SEL = sel.value || null;
    verdict(); drawMix(); drawPay(); drawEdu();
  });
}
verdict();

/* --------------------------------------------------------- 1. staffing mix */
function drawMix() { MOBILE.matches ? drawMixMobile() : drawMixDesktop(); }

function drawMixDesktop() {
  const rows = D.mix;
  const {svg, W, m, w} = chart("mix", {W: 1100, rows: rows.length, rowH: 30,
    m: {t: 44, r: 250, b: 60, l: 290}});
  const maxV = Math.max(...rows.map(r => r.pct_of_industry)) * 1.18;
  const xs = v => m.l + (v / maxV) * w;                     // LINEAR from zero
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * 30, xs, ys: () => 0,
    xt: ticks(0, maxV, 5), yt: [], xfmt: v => v + "%",
    xlab: "Share of everyone employed in plastics and rubber manufacturing, US, 2024"});
  txt(svg, "share of the occupation", {x: m.l + w + 12, y: m.t - 26, class: "pv-axlab"});
  txt(svg, "that is in this industry", {x: m.l + w + 12, y: m.t - 6, class: "pv-axlab"});
  rows.forEach((r, i) => {
    const g = el("g", dimMix(r.soc) ? {opacity: .18} : {}, svg);
    const y = m.t + i * 30 + 6, bh = 18;
    const distinctive = r.pct_of_occupation >= 40;
    el("rect", {x: m.l, y, width: Math.max(2, xs(r.pct_of_industry) - m.l), height: bh,
      fill: distinctive ? SEQ[5] : SEQ[3], rx: 3}, g);
    txt(g, name(r), {x: m.l - 12, y: y + bh - 4, "text-anchor": "end", class: "pv-lab"});
    txt(g, pct(r.pct_of_industry), {x: xs(r.pct_of_industry) + 8, y: y + bh - 4, class: "pv-lab"});
    txt(g, `${Math.round(r.pct_of_occupation)}%`,
      {x: m.l + w + 12, y: y + bh - 4, class: distinctive ? "pv-lab" : "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 6, width: W, height: bh + 12, fill: "transparent"}, g),
      `<b>${r.bls_title}</b><br><span class="v">${pct(r.pct_of_industry)}</span> of the industry
       &middot; <span class="v">${N(r.emp_2024_k * 1000)}</span> jobs, US 2024<br>
       <span class="v">${pct(r.pct_of_occupation)}</span> of this occupation, across all
       industries, works in plastics and rubber<br>projected ${r.change_pct_2024_34 >= 0 ? "+" : ""}${r.change_pct_2024_34}%
       in the industry by 2034`,
      `${r.bls_title}: ${pct(r.pct_of_industry)} of the industry; ${pct(r.pct_of_occupation)} of the occupation`);
  });
  /* THE TITLE'S BENCHMARK, DRAWN. The claim is that one floor occupation outweighs every
     engineer and scientist combined, and the engineer/scientist sum is not a row on this
     chart — most of those occupations are too small to be in the top fourteen. So it is a
     reference line on the same share scale, labelled by meaning, and the reader can see
     the top bar clear it. */
  const ES = D.mix_totals.eng_sci_share_pct;
  el("line", {x1: xs(ES), y1: m.t - 2, x2: xs(ES), y2: m.t + rows.length * 30,
    stroke: INK, "stroke-width": 1.5, opacity: .4}, svg);
  txt(svg, `all engineers, scientists and technicians together: ${pct(ES)}`,
    {x: xs(ES) + 8, y: m.t - 10, class: "pv-labq"});
}

function drawMixMobile() {
  const rows = D.mix;
  const m = {t: 68, r: 12, b: 44, l: 12}, W = 375, rowH = 42;
  const H = m.t + rows.length * rowH + m.b;
  const {svg} = chart("mix", {W, H});
  const w = W - m.l - m.r;
  const maxV = Math.max(...rows.map(r => r.pct_of_industry)) * 1.18;
  const xs = v => m.l + (v / maxV) * w;
  const ES = D.mix_totals.eng_sci_share_pct;
  txt(svg, `rule: all engineers, scientists and technicians, ${pct(ES)}`,
    {x: m.l, y: m.t - 32, class: "pv-labq"});
  txt(svg, "% of the occupation in this industry →", {x: W - m.r, y: m.t - 10,
    "text-anchor": "end", class: "pv-labq"});
  rows.forEach((r, i) => {
    const g = el("g", dimMix(r.soc) ? {opacity: .18} : {}, svg);
    const y = m.t + i * rowH;
    const distinctive = r.pct_of_occupation >= 40;
    txt(g, name(r), {x: m.l, y: y + 12, class: "pv-labq"});
    txt(g, `${Math.round(r.pct_of_occupation)}%`, {x: W - m.r, y: y + 12,
      "text-anchor": "end", class: distinctive ? "pv-lab" : "pv-labq"});
    el("rect", {x: m.l, y: y + 18, width: Math.max(2, xs(r.pct_of_industry) - m.l),
      height: 14, fill: distinctive ? SEQ[5] : SEQ[3], rx: 3}, g);
    txt(g, pct(r.pct_of_industry), {x: xs(r.pct_of_industry) + 6, y: y + 30, class: "pv-lab"});
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, g),
      `<b>${r.bls_title}</b><br><span class="v">${pct(r.pct_of_industry)}</span> of the industry
       &middot; <span class="v">${pct(r.pct_of_occupation)}</span> of the occupation`,
      `${r.bls_title}: ${pct(r.pct_of_industry)} of the industry`);
  });
  el("line", {x1: xs(ES), y1: m.t - 4, x2: xs(ES), y2: m.t + rows.length * rowH,
    stroke: INK, "stroke-width": 1.5, opacity: .4}, svg);
  const ax = el("g", {}, svg);
  ticks(0, maxV, 4).forEach(v => txt(ax, v + "%", {x: xs(v), y: H - m.b + 18,
    class: "pv-tick", "text-anchor": "middle"}));
  /* Same case as the desktop axis caption. A label that is small caps on one breakpoint
     and sentence case on the other is the same label rendered two ways, which reads as a
     build difference rather than a design. */
  txt(svg, "share of the industry, US 2024", {x: m.l, y: H - 8, class: "pv-axlab"});
}

{
  const rows = D.mix;
  document.getElementById("mixtitle").textContent =
    `${rows.length === 14 ? "Fourteen" : rows.length} occupations are ${Math.round(D.mix_totals.top_n_share_pct)}% of the industry, and most of them are on the floor`;
  document.getElementById("mixtable").innerHTML = withNote(tableView("mix",
    "The industry’s largest occupations, US, 2024",
    ["Occupation", "Share of the industry", "Share of the occupation in this industry",
     "Jobs in the industry, 2024", "Projected change to 2034"],
    rows.map(r => [r.bls_title, pct(r.pct_of_industry), pct(r.pct_of_occupation),
      N(r.emp_2024_k * 1000), (r.change_pct_2024_34 >= 0 ? "+" : "") + r.change_pct_2024_34 + "%"])),
    `One row is one detailed occupation employed in the industry, from the Employment
     Projections matrix for industry 326000 on a 2024 base. The ${rows.length} shown are
     ${D.mix_totals.top_n_share_pct}% of the industry’s
     ${N(D.mix_totals.industry_emp_2024_k * 1000)} jobs; production occupations of every
     kind are ${D.mix_totals.production_share_pct}%; engineers, scientists and technicians
     together are ${pct(D.mix_totals.eng_sci_share_pct)}. The 2034 column is a projection,
     a modelled path with no confidence band.`);
  document.getElementById("mixsrc").innerHTML =
    `Bureau of Labor Statistics Employment Projections, National Employment Matrix, 2024
     base. The staffing shares are national, not regional: this is the shape of the
     industry across the country, not inside Ohio.`;
  const R = D.region;
  document.getElementById("mixnote").innerHTML =
    `<b>One regional number, and what kind of number it is.</b> The <dfn>twelve counties PIC
     measures against, its federal-data footprint from Ashtabula to Wayne,</dfn> reported
     ${N(R.emp)} plastics-and-rubber jobs in ${R.year}. Applying the national shares gives
     about ${N(R.setters_estimate)} molding-machine setters and about
     ${N(R.eng_sci_estimate)} engineers, scientists and technicians, on the assumption that
     the region&rsquo;s plants staff like the national pattern. Nothing published counts
     occupations inside the industry by county, so this is an estimate, not a measurement.`;
}

/* ------------------------------------------------------------ 2. what it pays */
const payDomain = () => {
  const vals = payRows.flatMap(r => [r.national && r.national.median,
    ...AREAS.map(a => r.metros[a].absent ? null : r.metros[a].median)]).filter(v => v != null);
  /* Position, not length, encodes the wage — a dot plot — so the axis need not start at
     zero; $25,000 gives the metro spread the room the reading depends on. Every value on
     the page is above it; the source line says so. */
  return {lo: 25000, hi: Math.max(...vals) * 1.04};
};
const bandNote = (key, compact) => key === "deg"
  ? (compact
     ? `Akron ${x(RB["10420"].degree_median_ratio)} the nation · Cleveland ${x(RB["17410"].degree_median_ratio)}`
     : `Akron pays these a median ${x(RB["10420"].degree_median_ratio)} the nation · Cleveland ${x(RB["17410"].degree_median_ratio)}`)
  : key === "hs"
  ? `Akron ${x(RB["10420"].hs_median_ratio)} · Cleveland ${x(RB["17410"].hs_median_ratio)}`
  : null;

function drawPay() { MOBILE.matches ? drawPayDesktopish(false) : drawPayDesktopish(true); }

function drawPayDesktopish(desktop) {
  const W = desktop ? 1100 : 375;
  const m = desktop ? {t: 18, r: 70, b: 62, l: 290} : {t: 12, r: 12, b: 86, l: 12};
  const rowH = desktop ? 24 : 36;
  /* On the phone the scale used to appear once, after twenty-six rows of scrolling, so
     the first paint was a field of unscaled dots. Each group now closes with its own
     dollar ticks, which is what the extra mobile gap buys (chart-craft § mobile). */
  const headH = desktop ? 44 : 50, gap = desktop ? 16 : 40;
  let cy = m.t;
  const geo = GROUPS.map(G => {
    const headY = cy; cy += headH;
    const y0 = cy; cy += G.rows.length * rowH;
    const y1 = cy; cy += gap;
    return {G, headY, y0, y1};
  });
  const h = cy - gap - m.t;
  const H = m.t + h + m.b;
  const {svg} = chart("pay", {W, H});
  const w = W - m.l - m.r;
  const {lo, hi} = payDomain();
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;         // LINEAR
  if (desktop) {
    frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0,
      xt: [lo, ...ticks(lo, hi, 6).filter(v => v > lo + 5000)], yt: [],
      xfmt: v => "$" + Math.round(v / 1000) + "k",
      xlab: "Annual median wage, May 2024 (axis begins at $25,000)"});
  }
  geo.forEach(({G, headY, y0, y1}) => {
    /* The story band gets its shading; every band gets its claim written on it. */
    if (G.key === "deg") el("rect", {x: m.l, y: y0 - 2, width: w,
      height: G.rows.length * rowH + 4, fill: "rgba(12,100,115,.055)"}, svg);
    const label = `${G.label} · ${G.rows.length} occupations`;
    if (desktop) {
      txt(svg, label, {x: m.l, y: headY + 20, class: "pv-lab", fill: INK});
      const note = bandNote(G.key, false);
      if (note) txt(svg, note, {x: m.l + w, y: headY + 20, "text-anchor": "end",
        class: "pv-labq"});
      el("line", {x1: m.l, y1: headY + 30, x2: m.l + w, y2: headY + 30,
        stroke: "var(--pv-grid)", "stroke-width": 1}, svg);
    } else {
      txt(svg, label, {x: m.l, y: headY + 18, class: "pv-lab", fill: INK});
      const note = bandNote(G.key, true);
      if (note) txt(svg, note, {x: m.l, y: headY + 36, class: "pv-labq"});
      el("line", {x1: m.l, y1: headY + 42, x2: W - m.r, y2: headY + 42,
        stroke: "var(--pv-grid)", "stroke-width": 1}, svg);
    }
    G.rows.forEach((r, i) => {
      const g = el("g", dim(r.soc) ? {opacity: .16} : {}, svg);
      const y = desktop ? y0 + i * rowH + rowH / 2 : y0 + i * rowH;
      const yl = desktop ? y : y + 24;                       // mark line
      const marks = ON_CHART.filter(a => !r.metros[a].absent).map(a => r.metros[a].median);
      const nat = r.national && r.national.median;
      const span = [...marks, nat].filter(v => v != null);
      if (span.length > 1) el("line", {x1: xs(Math.min(...span)), y1: yl,
        x2: xs(Math.max(...span)), y2: yl, stroke: "var(--pv-grid)", "stroke-width": 2}, g);
      if (desktop) {
        txt(g, name(r), {x: m.l - 12, y: y + 4, "text-anchor": "end", class: "pv-lab"});
      } else {
        txt(g, name(r), {x: m.l, y: y + 11, class: "pv-labq"});
      }
      ON_CHART.forEach(a => {
        const c = r.metros[a];
        if (c.absent) return;
        el("circle", {cx: xs(c.median), cy: yl, r: desktop ? 5 : 4.5, fill: COLOR[a],
          stroke: "var(--paper)", "stroke-width": desktop ? 1.5 : 1}, g);
      });
      if (nat != null) {
        const s = desktop ? 6 : 5, cx = xs(nat);
        el("path", {d: `M${cx},${yl - s}L${cx + s},${yl}L${cx},${yl + s}L${cx - s},${yl}Z`,
          fill: "var(--paper)", stroke: INK, "stroke-width": 2}, g);
      }
      if (AREAS.every(a => r.metros[a].absent))
        txt(g, "withheld in all four metros", {x: xs(nat) + (desktop ? 14 : 10),
          y: yl + 4, class: "pv-labq"});
      const cells = AREAS.map(a => {
        const c = r.metros[a];
        return `${short(a)}: ${c.absent ? "<i>withheld</i>" : `<span class="v">${money(c.median)}</span> (${x(c.median_vs_us)}, RSE ${c.mean_rse}%)`}`;
      }).join("<br>");
      const p = r.projection;
      hoverable(el("rect", {x: 0, y: desktop ? y - rowH / 2 : y, width: W, height: rowH,
        fill: "transparent"}, g),
        `<b>${r.occupation}</b><br>US median <span class="v">${money(nat)}</span><br>${cells}
         ${p ? `<br>projected openings, NE Ohio 2022&ndash;32: <span class="v">${N(p.openings_annual)}</span> a year` : ""}`,
        `${r.occupation}: US median ${money(nat)}; ` + AREAS.map(a => `${short(a)} ${r.metros[a].absent ? "withheld" : money(r.metros[a].median)}`).join(", "));
    });
    /* The scale, repeated under each group on the phone, so no group of dots is ever
       read without one. */
    if (!desktop) {
      const ax = el("g", {}, svg);
      el("line", {x1: m.l, y1: y1 + 8, x2: W - m.r, y2: y1 + 8,
        stroke: "var(--pv-axis)", "stroke-width": 1}, ax);
      /* Dropped, never clamped: a tick label nudged inward to fit is a number printed at
         the wrong place on its own scale. */
      ticks(lo, hi, 5).filter(v => v > lo && xs(v) <= W - m.r - 18).forEach(v => txt(ax,
        "$" + Math.round(v / 1000) + "k", {x: xs(v), y: y1 + 26, class: "pv-tick",
        "text-anchor": "middle"}));
    }
  });
  if (!desktop) {
    txt(svg, "annual median wage, May 2024", {x: m.l, y: H - 22, class: "pv-axlab"});
    txt(svg, "axis begins at $25,000", {x: m.l, y: H - 6, class: "pv-axlab"});
  }
}

{
  const T = D.pay_totals;
  document.getElementById("paylegend").innerHTML =
    `<span><i style="background:#fff;box-shadow:inset 0 0 0 2px ${INK};transform:rotate(45deg);width:11px;height:11px"></i> United States</span>` +
    ON_CHART.map(a => `<span><i style="background:${COLOR[a]};border-radius:50%"></i> ${M.metros[a].short}</span>`).join("");
  document.getElementById("paytable").innerHTML = withNote(tableView("pay",
    "Annual median wage by occupation and metro against the nation, May 2024",
    ["Occupation", "Schooling band", "United States", ...AREAS.map(a => short(a)),
     "Highest metro RSE", "Projected openings a year, NE Ohio 2022–32"],
    payRows.map(r => [r.occupation,
      {deg: "Degree", mid: "In between", hs: "High school"}[grp(r.soc)],
      money(r.national && r.national.median),
      ...AREAS.map(a => r.metros[a].absent ? "withheld" : `${money(r.metros[a].median)} (${x(r.metros[a].median_vs_us)})`),
      pct(Math.max(...AREAS.filter(a => !r.metros[a].absent).map(a => r.metros[a].mean_rse), 0)),
      r.projection ? N(r.projection.openings_annual) : "—"])),
    `The metro columns neither nest inside nor tile the twelve PIC counties, so they sit
     side by side and are never summed. Youngstown-Warren publishes ${T.disclosed["49660"]}
     of the ${T.occupations} occupations, the fewest; ${T.high_rse_cells} metro cells exceed
     ${T.high_rse_threshold_pct}% relative standard error of the mean wage. Projected
     openings are Ohio Department of Job and Family Services 2022&ndash;2032 modelled paths
     with no confidence band, for the eighteen-county JobsOhio Northeast region, a superset
     of the footprint. What a dollar buys in each metro is the
     <a href="../realwage/">real-wage page</a>&rsquo;s question.`);
  document.getElementById("paysrc").innerHTML =
    `Bureau of Labor Statistics Occupational Employment and Wage Statistics, May 2024,
     metropolitan and national files. Cells the bureau withheld are shown as withheld and
     never as zero: tire builders are published for none of the four metros.`;
}

/* -------------------------------------------------------- 3. what schooling */
const BINS = [["hs_or_less", "High school or less", SEQ[0]],
              ["some_college", "Some college or associate", SEQ[2]],
              ["bachelors", "Bachelor’s degree", SEQ[4]],
              ["graduate", "Graduate degree", SEQ[5]]];

function drawEdu() { MOBILE.matches ? drawEduMobile() : drawEduDesktop(); }

function drawEduDesktop() {
  const rows = eduRows;
  const {svg, W, m, w} = chart("edu", {W: 1100, rows: rows.length, rowH: 24,
    m: {t: 44, r: 150, b: 60, l: 290}});
  const xs = v => m.l + (v / 100) * w;
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * 24, xs, ys: () => 0,
    xt: [0, 25, 50, 75, 100], yt: [], xfmt: v => v + "%",
    xlab: "Share of surveyed workers and experts reporting each level as required"});
  /* Same tint, same six rows, same order as the pay chart's degree band: the reader can
     carry the shape from one chart to the other without re-reading the labels. */
  el("rect", {x: 0, y: m.t, width: W, height: nDeg * 24,
    fill: "rgba(12,100,115,.055)"}, svg);
  rows.forEach((r, i) => {
    const g = el("g", dim(r.soc) ? {opacity: .18} : {}, svg);
    const y = m.t + i * 24 + 4, bh = 16;
    let acc = 0;
    BINS.forEach(([k, , col]) => {
      const v = r.bins[k] || 0;
      if (v > 0) el("rect", {x: xs(acc), y, width: Math.max(0, xs(acc + v) - xs(acc)),
        height: bh, fill: col}, g);
      acc += v;
    });
    txt(g, name(r), {x: m.l - 12, y: y + bh - 3, "text-anchor": "end", class: "pv-lab"});
    txt(g, r.job_zone ? `Zone ${r.job_zone <= 2 ? "1–2" : r.job_zone}` : "",
      {x: m.l + w + 12, y: y + bh - 3, class: "pv-labq"});
    const desc = (r.description || "").split(". ")[0];
    hoverable(el("rect", {x: 0, y: y - 4, width: W, height: bh + 8, fill: "transparent"}, g),
      `<b>${r.onet_title}</b><br>${BINS.map(([k, l]) => `${l}: <span class="v">${pct(r.bins[k])}</span>`).join("<br>")}
       <br>most reported: ${tq(r.modal.label.split(" - ")[0])} (${pct(r.modal.pct)})<br>${r.job_zone_name}
       ${desc ? `<br><i>${desc}.</i>` : ""}<br><span style="font-size:12px">${r.join}</span>`,
      `${r.onet_title}: ${BINS.map(([k, l]) => `${l} ${pct(r.bins[k])}`).join(", ")}; ${r.job_zone_name}`);
  });
}

function drawEduMobile() {
  const rows = eduRows;
  const m = {t: 16, r: 12, b: 44, l: 12}, W = 375, rowH = 40;
  const H = m.t + rows.length * rowH + m.b;
  const {svg} = chart("edu", {W, H});
  const w = W - m.l - m.r;
  const xs = v => m.l + (v / 100) * w;
  el("rect", {x: 0, y: m.t - 4, width: W, height: nDeg * rowH,
    fill: "rgba(12,100,115,.055)"}, svg);
  rows.forEach((r, i) => {
    const g = el("g", dim(r.soc) ? {opacity: .18} : {}, svg);
    const y = m.t + i * rowH;
    txt(g, name(r), {x: m.l, y: y + 12, class: "pv-labq"});
    txt(g, r.job_zone ? `Zone ${r.job_zone <= 2 ? "1–2" : r.job_zone}` : "",
      {x: W - m.r, y: y + 12, "text-anchor": "end", class: "pv-labq"});
    let acc = 0;
    BINS.forEach(([k, , col]) => {
      const v = r.bins[k] || 0;
      if (v > 0) el("rect", {x: xs(acc), y: y + 18, width: Math.max(0, xs(acc + v) - xs(acc)),
        height: 14, fill: col}, g);
      acc += v;
    });
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, g),
      `<b>${r.onet_title}</b><br>${BINS.map(([k, l]) => `${l}: <span class="v">${pct(r.bins[k])}</span>`).join("<br>")}`,
      `${r.onet_title}: ${BINS.map(([k, l]) => `${l} ${pct(r.bins[k])}`).join(", ")}`);
  });
  const ax = el("g", {}, svg);
  [0, 50, 100].forEach(v => txt(ax, v + "%", {x: Math.min(xs(v), W - 16), y: H - m.b + 18,
    class: "pv-tick", "text-anchor": "middle"}));
  txt(svg, "reported required education", {x: m.l, y: H - 8, class: "pv-axlab"});
}

{
  document.getElementById("edulegend").innerHTML =
    BINS.map(([, l, c]) => `<span><i style="background:${c}"></i> ${l}</span>`).join("");
  document.getElementById("edutitle").textContent =
    `${Cap(WORDS[ET.ba_plus_majority.length] || String(ET.ba_plus_majority.length))} of these occupations are degree jobs; ${WORDS[ET.hs_majority.length] || ET.hs_majority.length} are high-school jobs; the rest sit between`;
  document.getElementById("edutable").innerHTML = withNote(tableView("edu",
    "Reported required level of education, by occupation",
    ["Occupation", "Job Zone", ...BINS.map(b => b[1]), "Most-reported level"],
    eduRows.map(r => [r.onet_title, r.job_zone <= 2 ? "1–2" : r.job_zone,
      ...BINS.map(([k]) => pct(r.bins[k])), tq(r.modal.label.split(" - ")[0])])),
    `The Job Zone is the database&rsquo;s rating of overall preparation, with the two lowest
     steps reported as one band. Where one federal occupation code holds several database
     occupations, the row is the equal-weight mean of them, and the chart&rsquo;s hover
     names which. ${ET.ba_plus_majority.length} of the ${ET.n} occupations have a
     bachelor&rsquo;s-or-higher majority; ${ET.hs_majority.length} have a
     high-school-or-less majority. The licence for this database is in the page footer.`);
  document.getElementById("edusrc").innerHTML =
    `O*NET 30.3, United States Department of Labor. One row is one occupation&rsquo;s
     distribution of reported required education, twelve federal levels binned to four.
     Neither that distribution nor the Job Zone is a hiring requirement, and none of it is
     regional.`;
}

/* ------------------------------------------------- 4. where degrees are conferred
 *
 * TWO FIGURES, BECAUSE THE BAND MAKES TWO CLAIMS. The section headline says the count has
 * fallen by more than half AND that three universities confer it. Until this pass only the
 * second was drawn: the decline lived in a bracket annotation beside a cross-section of
 * programs, which is a form/claim mismatch — a reader cannot see a time trend in a chart
 * with no time axis. The fall now gets the chart it needs, annual and annotated, and the
 * program bars go back to answering only the question they can answer.
 */
const matByYear = Object.fromEntries(progYears.map(y =>
  [y, D.programs.filter(p => p.group === "materials")
       .reduce((s, p) => s + (p.by_year[y] || 0), 0)]));
const EARLY = progYears.filter(y => +y <= 2021);
const LATE = progYears.filter(y => +y > 2021);
/* Computed, never typed: the reference rule is half the mean of the early window, and the
   claim is that BOTH later years sit under it. */
const earlyMean = EARLY.reduce((s, y) => s + polyByYear[y], 0) / EARLY.length;
const halfEarly = earlyMean / 2;

function drawTrend() { MOBILE.matches ? drawTrendAt(375, true) : drawTrendAt(780, false); }

/* Width 780 and not wider: `.chart.narrow` renders at 720 CSS px, so a bigger viewBox
   scales the 13.6-unit labels below the 12px legibility floor (tools/textsize.mjs). */
function drawTrendAt(W, phone) {
  const m = phone ? {t: 74, r: 104, b: 58, l: 34} : {t: 58, r: 178, b: 58, l: 50};
  const H = phone ? 340 : 350;
  const {svg} = chart("trend", {W, H});
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const maxV = Math.max(...progYears.map(y => polyByYear[y])) * 1.14;
  const ys = v => m.t + h - (v / maxV) * h;                   // LINEAR from zero
  const bandW = w / progYears.length;
  const colW = Math.min(bandW * 0.38, 20);
  frame(svg, {x: m.l, y: m.t, w, h, xs: v => v, ys,
    xt: [], yt: ticks(0, maxV, 4), yfmt: v => v,
    xlab: phone ? "degrees conferred a year"
      : `Degrees conferred a year, ${progYears[0]} to ${progYears[progYears.length - 1]}`});
  progYears.forEach((y, i) => {
    const cx = m.l + bandW * (i + 0.5);
    [[polyByYear[y], SEQ[5], -colW - 1], [matByYear[y], SEQ[2], 1]].forEach(([v, col, dx]) => {
      el("rect", {x: cx + dx, y: ys(v), width: colW, height: Math.max(1, m.t + h - ys(v)),
        fill: col}, svg);
    });
    if (!phone || i % 2 === 1)
      txt(svg, phone ? "’" + y.slice(2) : y, {x: cx, y: m.t + h + 20, class: "pv-tick",
        "text-anchor": "middle"});
    hoverable(el("rect", {x: cx - bandW / 2, y: m.t, width: bandW, height: h,
      fill: "transparent"}, svg),
      `<b>${y}</b><br>polymer <span class="v">${polyByYear[y]}</span> &middot;
       materials <span class="v">${matByYear[y]}</span>`,
      `${y}: polymer ${polyByYear[y]}, materials ${matByYear[y]}`);
  });
  /* THE REFERENCE LINE THE CLAIM RESTS ON, labelled by meaning and not by value. Its
     label lives in the right margin rather than on the rule: a level line at 70 runs
     under the top of every column before 2022, so any in-plot caption would print on
     solid ink. Outside the plot it is legible and it still reads as the line's own. */
  const RULE = "#A32A78";
  el("line", {x1: m.l, y1: ys(halfEarly), x2: m.l + w, y2: ys(halfEarly),
    stroke: RULE, "stroke-width": 1.5}, svg);
  const rail = m.l + w + 8;
  /* Hand-shortened to the margin each breakpoint actually has. A label that runs past the
     figure is a build error, not a style, so the phone takes four short lines rather than
     three long ones. */
  const rlab = phone
    ? ["half the", `${EARLY[0]}–${EARLY[EARLY.length - 1]}`, "average:", `${Math.round(halfEarly)} a year`]
    : [`half the ${EARLY[0]}–${EARLY[EARLY.length - 1]}`, "polymer average:", `${Math.round(halfEarly)} a year`];
  rlab.forEach((s, i) => txt(svg, s, {x: rail, y: ys(halfEarly) - 8 + i * 17,
    class: i ? "pv-labq" : "pv-lab", fill: i ? null : RULE}));
  /* Direct labels above the plot, not a legend: two series, named in their own ink. The
     phone stacks the year annotation onto its own row, because at 375 the two label
     blocks cannot share one. */
  txt(svg, "Polymer programs", {x: m.l, y: m.t - (phone ? 54 : 30), class: "pv-lab",
    fill: SEQ[5]});
  txt(svg, "Materials programs", {x: m.l, y: m.t - (phone ? 36 : 12), class: "pv-lab",
    fill: SEQ[3]});
  txt(svg, `${polyByYear[EARLY[EARLY.length - 1]]} in ${EARLY[EARLY.length - 1]}, then ${LATE.map(y => polyByYear[y]).join(" and ")}`,
    phone ? {x: m.l, y: m.t - 12, class: "pv-labq"}
          : {x: m.l + w, y: m.t - 12, "text-anchor": "end", class: "pv-labq"});
}

function drawProg() { MOBILE.matches ? drawProgMobile() : drawProgDesktop(); }

function drawProgDesktop() {
  const rows = progRows;
  const {svg, W, m, w} = chart("prog", {W: 1100, rows: rows.length, rowH: 30,
    m: {t: 44, r: 214, b: 60, l: 400}});
  const maxV = Math.max(...rows.map(r => r.window_avg)) * 1.1;
  const xs = v => m.l + (v / maxV) * w;                     // LINEAR from zero
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * 30, xs, ys: () => 0,
    xt: ticks(0, maxV, 5), yt: [], xfmt: v => v,
    xlab: `Degrees conferred a year, average of ${WIN[0]}–${WIN[WIN.length - 1]}`});
  const instShort = s => s.replace("University of Akron", "Akron").replace("Case Western Reserve University", "Case Western")
    .replace("Kent State University", "Kent State");
  const progName = s => s === "Polymer/Plastics Engineering" ? "Polymer engineering"
    : s.charAt(0) + s.slice(1).toLowerCase();
  rows.forEach((r, i) => {
    const y = m.t + i * 30 + 6, bh = 18;
    el("rect", {x: m.l, y, width: Math.max(2, xs(r.window_avg) - m.l), height: bh,
      fill: r.group === "polymer" ? SEQ[5] : SEQ[2], rx: 3}, svg);
    txt(svg, `${instShort(r.institution)} · ${progName(r.program)} · ${r.award.toLowerCase()}`,
      {x: m.l - 12, y: y + bh - 4, "text-anchor": "end", class: "pv-lab"});
    txt(svg, String(r.window_avg), {x: xs(r.window_avg) + 8, y: y + bh - 4, class: "pv-lab"});
    const yrs = Object.entries(r.by_year).map(([yy, v]) => `${yy}: ${v}`).join(" · ");
    hoverable(el("rect", {x: 0, y: y - 6, width: W, height: bh + 12, fill: "transparent"}, svg),
      `<b>${r.institution}</b><br>${r.program} (CIP ${r.cip.slice(0, 2)}.${r.cip.slice(2)}), ${r.award}
       <br>${PT.latest_year}: <span class="v">${r.latest}</span> &middot; ${WIN[0]}–${WIN[WIN.length - 1]}
       average <span class="v">${r.window_avg}</span><br><span style="font-size:12px">${yrs}</span>`,
      `${r.institution}, ${r.program}, ${r.award}: ${r.window_avg} a year`);
  });
  /* Group brackets in the right rail: the pipeline finding drawn as group structure
     (the wages-page pattern). */
  const rail = m.l + w + 14;
  const bracket = (i0, i1, color) => el("path",
    {d: `M${rail + 5},${m.t + i0 * 30 + 4} h-5 V${m.t + (i1 + 1) * 30 - 4} h5`,
     fill: "none", stroke: color, "stroke-width": 1.6}, svg);
  const lines = (ls, y0, color) => ls.forEach((s, i) => {
    const a = {x: rail + 12, y: y0 + i * 17, class: i ? "pv-labq" : "pv-lab"};
    if (!i) a.fill = color;
    txt(svg, s, a);
  });
  /* The brackets now name the two groups and nothing else. The decline they used to carry
     in four lines of side text is the chart above, where a time claim belongs. */
  bracket(0, nPoly - 1, SEQ[5]);
  lines(["Polymer programs", `${nPoly} of ${rows.length} rows`], m.t + 22, SEQ[5]);
  bracket(nPoly, rows.length - 1, SEQ[2]);
  lines(["Materials programs", `${rows.length - nPoly} rows`],
    m.t + nPoly * 30 + 22, SEQ[3]);
}

function drawProgMobile() {
  const rows = progRows;
  const m = {t: 46, r: 12, b: 44, l: 12}, W = 375, rowH = 42;
  const H = m.t + rows.length * rowH + m.b;
  const {svg} = chart("prog", {W, H});
  const w = W - m.l - m.r;
  const maxV = Math.max(...rows.map(r => r.window_avg)) * 1.1;
  const xs = v => m.l + (v / maxV) * w;
  const instShort = s => s.replace("University of Akron", "Akron").replace("Case Western Reserve University", "Case Western")
    .replace("Kent State University", "Kent State");
  const progName = s => s === "Polymer/Plastics Engineering" ? "Polymer eng."
    : s.replace("Polymer Chemistry", "Polymer chem.").replace("Materials Engineering", "Materials eng.")
       .replace("Materials Science", "Materials sci.");
  txt(svg, `Polymer programs dark, materials light`,
    {x: m.l, y: m.t - 12, class: "pv-labq"});
  rows.forEach((r, i) => {
    const y = m.t + i * rowH;
    txt(svg, `${instShort(r.institution)} · ${progName(r.program)} · ${r.award.toLowerCase()}`,
      {x: m.l, y: y + 12, class: "pv-labq"});
    el("rect", {x: m.l, y: y + 18, width: Math.max(2, xs(r.window_avg) - m.l), height: 14,
      fill: r.group === "polymer" ? SEQ[5] : SEQ[2], rx: 3}, svg);
    txt(svg, String(r.window_avg), {x: xs(r.window_avg) + 6, y: y + 30, class: "pv-lab"});
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, svg),
      `<b>${r.institution}</b><br>${r.program}, ${r.award}<br>${WIN[0]}–${WIN[WIN.length - 1]}
       average <span class="v">${r.window_avg}</span> &middot; ${PT.latest_year}:
       <span class="v">${r.latest}</span>`,
      `${r.institution}, ${r.program}, ${r.award}: ${r.window_avg} a year`);
  });
  const ax = el("g", {}, svg);
  ticks(0, maxV, 4).forEach(v => txt(ax, String(v), {x: xs(v), y: H - m.b + 18,
    class: "pv-tick", "text-anchor": "middle"}));
  txt(svg, `degrees a year, ${WIN[0]}–${WIN[WIN.length - 1]} average`,
    {x: m.l, y: H - 8, class: "pv-axlab"});
}

{
  document.getElementById("progtitle").textContent =
    `${WORDS[PT.institutions.length] ? Cap(WORDS[PT.institutions.length]) : PT.institutions.length} universities confer the degrees, and the polymer count has fallen by more than half`;
  document.getElementById("trendtable").innerHTML = withNote(tableView("trend",
    `Polymer and materials degrees conferred a year, ${progYears[0]}–${progYears[progYears.length - 1]}`,
    ["Year", "Polymer programs", "Materials programs"],
    progYears.map(y => [y, polyByYear[y], matByYear[y]])),
    `Polymer programs are polymer engineering 14.3201 and polymer chemistry 40.0507;
     materials programs are 14.1801 and 40.1001. The rule on the chart is half the polymer
     mean for ${EARLY[0]}&ndash;${EARLY[EARLY.length - 1]}, which is
     ${halfEarly.toFixed(1)} degrees a year. A program recoded to a different federal
     program code would leave these counts without leaving the region.`);
  document.getElementById("trendsrc").innerHTML =
    `Integrated Postsecondary Education Data System completions, summed across the
     region&rsquo;s programs each year. The file ends at ${PT.latest_year}, the last year
     available when this page was built, so the fall rests on two observed years.`;
  document.getElementById("progtable").innerHTML = withNote(tableView("prog",
    `Polymer and materials degrees conferred, by program, ${PT.latest_year} and ${WIN[0]}–${WIN[WIN.length - 1]} average`,
    ["Institution", "Program", "Level", String(PT.latest_year), `${WIN[0]}–${WIN[WIN.length - 1]} average`],
    progRows.map(r => [r.institution, `${r.program} (${r.cip.slice(0, 2)}.${r.cip.slice(2)})`, r.award, r.latest, r.window_avg])),
    `One row is one institution, program and award level, first major only, from the Urban
     Institute&rsquo;s copy of the federal completions file. Programs with no completions in
     the window are omitted, which is why the list has ${PT.institutions.length} names.`);
  document.getElementById("progsrc").innerHTML =
    `Integrated Postsecondary Education Data System completions by six-digit program code,
     via the Urban Institute. Degrees count people finishing, not people hired or staying in
     the region.`;
}

/* The O*NET licence is a condition of use, not a caption. It ran inline under the
   education chart, where it was the single largest block of apparatus ink on the page;
   the licence belongs once per page, in the footer, which is where boilerplate lives. */
document.getElementById("footlicense").textContent = D.onet_attribution;

/* --------------------------------------------------------------------- assemble */
function drawAll() { drawMix(); drawPay(); drawEdu(); drawTrend(); drawProg(); }
drawAll();
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawAll)
                        : MOBILE.addListener(drawAll);

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js.
 *
 * The meta strings are prose the METHODOLOGY BOX renders to a reader, so the house
 * punctuation law applies to them (style-bans: no em-dashes in prose, typographer's
 * quotes). They are written by the shared builder and stored in the data file with
 * straight quotes and em-dashes, and the builder is not this page's to edit — so the
 * page normalises them at RENDER time, the same presentation-only move tq() makes for
 * the O*NET label strings above. Punctuation only: the transform never changes a word,
 * and the same keys are passed through, so the shared classifier still sees them all. */
const housePunct = s => s
  .replace(/\s—\s([^—]{1,140}?)\s—\s/g, " ($1) ")   // paired: parenthesise
  .replace(/\s—\s/g, ": ")                                     // lone: colon
  .replace(/(^|[\s(])'([^']+)'(?=[\s.,;:)]|$)/g, "$1‘$2’")
  .replace(/'/g, "’");
const VERBATIM = new Set(["url", "docs", "fetched", "as_of"]);   // machine strings, not prose
/* Rewritten IN PLACE on the loaded object, not into a new one: verify_consistency.py
   resolves `meta:` back through the PV.data() call that produced it, and a fresh object
   reads to that gate as an inline literal with no limitation prose. Same keys, same
   values, house punctuation. The file on disk is untouched. */
for (const [k, v] of Object.entries(D.meta))
  if (typeof v === "string" && !VERBATIM.has(k)) D.meta[k] = housePunct(v);
await PV.methodology({page: "occupations", meta: D.meta});
})();
