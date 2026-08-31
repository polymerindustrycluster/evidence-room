/* The occupations inside plastics and rubber manufacturing — rebuilt as one argument.
 *
 * THE ARC (each section's lede carries the previous section's conclusion forward):
 *   1. STAFFING  the industry is floor work; the distinctive engineer/scientist share
 *                is 4.2% and small.
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
const {el, txt, ticks, frame, hoverable, tableView, chart, face, figures, N, SEQ, CAT, INK} = PV;
const D = await PV.data("viz-data.json");
const M = D.meta;
const money = v => v == null ? "—" : "$" + Math.round(v).toLocaleString("en-US");
const pct = (v, d = 1) => v == null ? "—" : (v.toFixed(d) + "%").replace(/^-/, "\u2212");
const x = v => v == null ? "—" : v.toFixed(2) + "×";
/* A RATIO IS READ, NOT COMPUTED, AT FIRST CONTACT. 0.93× is a correct number that asks the
   reader to do the subtraction and then to work out which way it points; "7% under" is the
   same number already read. Computed from the same field the × form prints, so the two can
   never disagree, and the arithmetic itself lives in the pay table note. */
const gap = (v, ref = " the nation") => {
  if (v == null) return "—";
  const d = Math.round((v - 1) * 100);
  /* An explicit empty referent is a caller saying "the referent is already in this line"
     — so it suppresses the trailing phrase in BOTH branches, not only the numeric one. A
     second "the nation" in a 375px band note is what pushed it off the figure. */
  return d === 0 ? (ref === "" ? "level" : `level with${ref || " the nation"}`)
                 : `${Math.abs(d)}% ${d < 0 ? "under" : "over"}${ref}`;
};
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

/* ---------------------------------------------------- the staffing mix, ordered and summed
 *
 * ORDER BY JOBS, NOT BY THE ROUNDED SHARE THE BAR PRINTS. A reader counting down the chart
 * found industrial engineers (14,400 jobs) printed ABOVE cutting-and-press setters (14,600),
 * because both round to 2.0% and the file's order breaks the tie by something the page does
 * not show. A "largest first" chart whose rows are not largest-first is a defect a reader
 * can see and no gate was measuring, so the order is now derived from the counts themselves.
 *
 * AND SUM THE JOBS, NOT THE ROUNDED SHARES. The same reader added the fourteen job counts
 * (432,200), divided by the industry's 725,100 and got 59.6%, against a printed 59.4%. They
 * were right: 59.4 is the sum of fourteen shares each rounded to a tenth of a point, and
 * those roundings run 0.2 points net downward. The share is computed here from the counts
 * and the table note prints both numbers with the reason they differ, so a reader who does
 * the arithmetic lands where the page does. */
const MIX = [...D.mix].sort((a, b) => b.emp_2024_k - a.emp_2024_k);
const MIX_EMP_K = MIX.reduce((s, r) => s + r.emp_2024_k, 0);
const topShare = MIX_EMP_K / D.mix_totals.industry_emp_2024_k * 100;
const topShareBars = MIX.reduce((s, r) => s + r.pct_of_industry, 0);   // what the bars print
const mixSoc = Object.fromEntries(MIX.map(r => [r.soc, r]));
const eduAll = D.education.filter(r => r.bins);
const eduSoc = Object.fromEntries(eduAll.map(r => [r.soc, r]));
const eduRows = payRows.map(r => eduSoc[r.soc]).filter(Boolean);
const nDeg = eduRows.filter(r => grp(r.soc) === "deg").length;   // the shaded band, both charts
/* How far the "fourteen largest" and the "fourteen high-school-majority" sets diverge. */
const MIX_NOT_HS = MIX.filter(r => !HS.has(r.soc)).length;
const RB = D.pay_totals.ratio_by_metro;
/* THE BAND SUMMARY IS A MEDIAN OF RATIOS, AND THE MIDDLE BAND HAD NONE. The data file
   carries degree_median_ratio and hs_median_ratio but no "in between" figure, so the one
   band a reader would use to ask where the discount starts carried no summary at all and
   read as an omission. Computed here by the same rule the file uses for the other two:
   the median of that band's own metro-over-nation ratios, disclosed cells only. */
const median = a => {
  const s = [...a].sort((p, q) => p - q), n = s.length;
  return n === 0 ? null : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
const bandRatio = (key, area) => median(GROUPS.find(G => G.key === key).rows
  .filter(r => !r.metros[area].absent).map(r => r.metros[area].median_vs_us));

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
const setters = MIX.find(m => m.soc === "51-4072");
/* Card 1 carries the headline's other half. The hero used to open with a two-clause
   sentence that towered to six lines of display type; the "one job in nine" clause reads
   better as the number it is than as the back half of a headline. */
/* DIRECTION OF MERIT, NOT ONLY DIRECTION OF MAGNITUDE. A naive reader could say which way
   each of these numbers ran and not one of them whether a bigger one was good news for the
   region. The sub-line is the page's first contact with every one of these measures, so it
   is where the reading goes (writing.md, constructed units); card two also carries the
   denominator flip, since 51% is cut from the OCCUPATION and 10.9% from the INDUSTRY. */
/* Card 4 used to read "the jobs the region CLAIMS DISTINCTION IN" under a national share,
   which is the page's whole scope problem in one sub-line: a regional referent hung on a
   number cut from the country. The distinction claim belongs where the regional numbers
   are, and this card now says what 4.2% is a share OF. */
const US = `<span class="scope">United States</span>`;
figures([
  ["key", pct(setters.pct_of_industry), "of the industry’s jobs", `${US}are molding-machine setters, one job in ${WORDS[Math.round(100 / setters.pct_of_industry)]}, 2024. It is the industry’s largest occupation, which makes staffing it the industry’s largest staffing problem`],
  ["", pct(setters.pct_of_occupation, 0), "of the nation’s molding-machine setters", `${US}work in plastics and rubber manufacturing, counted across the country: few other employers bid for them, and few others to hire from`],
  ["", N(D.mix_totals.industry_emp_2024_k * 1000), "jobs in the industry", `${US}in 2024, and the base the ${pct(setters.pct_of_industry)} and ${pct(D.mix_totals.eng_sci_share_pct)} are cut from`],
  ["", pct(D.mix_totals.eng_sci_share_pct), "engineers, scientists, technicians", `${US}of all jobs in the industry: the work a polymer region is known for is a small share of it`],
]);

/* The byline's month is read from the data vintage rather than typed, so it cannot drift
   from the figures it dates. The static copy in index.html is the no-script fallback and
   says the same thing; claim occ-byline holds them to it. */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
                "September", "October", "November", "December"];
{
  const [fy, fm] = M.fetched.split("-");
  document.getElementById("byline").innerHTML =
    `By <b>John Swanson</b>, Polymer Industry Cluster desk &middot; Analysis and graphics by Claude (Anthropic) &middot; Data BLS, O*NET and IPEDS
     &middot; ${MONTHS[+fm - 1]}&nbsp;${fy}`;
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
    /* THE TWO FOURTEENS, DISENTANGLED. The industry's fourteen LARGEST occupations and its
       fourteen HIGH-SCHOOL-MAJORITY ones are different sets that happen to share a count,
       and a reader who fuses them carries away "the industry is 59% high-school work",
       which is false. The overlap is counted from the data, never typed. */
    v.innerHTML = `<b>All ${D.pay_totals.occupations} occupations:</b> the industry’s
      ${WORDS[MIX.length] || MIX.length} largest hold
      ${pct(topShare)} of its national employment, and every metro pays
      the ${WORDS[ET.ba_plus_majority.length]} degree occupations further under the nation
      than the ${WORDS[ET.hs_majority.length]} high-school-majority ones. Those are two
      different fourteens: ${WORDS[MIX_NOT_HS] || MIX_NOT_HS} of the largest occupations are
      not high-school-majority jobs. Pick an occupation to follow its row across the
      charts.`;
    return;
  }
  const p = paySoc[SEL], m = mixSoc[SEL], e = eduSoc[SEL];
  const shareClause = m
    ? `<b>${pct(m.pct_of_industry)}</b> of the industry’s jobs nationally`
    : `outside the industry’s ${WORDS[MIX.length] || MIX.length} largest occupations`;
  const area = AREAS.find(a => !p.metros[a].absent);
  const payClause = area
    ? `${M.metros[area].short} median <b>${money(p.metros[area].median)}</b> against
       ${money(p.national && p.national.median)} nationally, ${gap(p.metros[area].median_vs_us)}`
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
  const rows = MIX;
  const {svg, W, m, w} = chart("mix", {W: 1100, rows: rows.length, rowH: 30,
    m: {t: 66, r: 250, b: 60, l: 290}});
  const maxV = Math.max(...rows.map(r => r.pct_of_industry)) * 1.18;
  const xs = v => m.l + (v / maxV) * w;                     // LINEAR from zero
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * 30, xs, ys: () => 0,
    xt: ticks(0, maxV, 5), yt: [], xfmt: v => v + "%",
    xlab: "Share of everyone employed in plastics and rubber manufacturing, US, 2024"});
  /* THE SECOND SCALE, AND THE WORD THAT BROKE THE PAGE. This column read "how much of this
     job is HERE, NOT ANYWHERE ELSE", where "here" meant this INDUSTRY. On a page whose
     masthead names a regional organisation, a reader took "here" for Ohio and carried away
     that half of America's molding-machine setters work in Northeast Ohio: the figures were
     right and the frame made them false. The column now names its universe (everyone in the
     US who holds the job) and its subject (this industry), and the word "here" is gone from
     the chart at both widths. */
  txt(svg, "US workers in this job:", {x: m.l + w + 12, y: m.t - 46, class: "pv-axlab"});
  txt(svg, "the share employed", {x: m.l + w + 12, y: m.t - 26, class: "pv-axlab"});
  txt(svg, "in this industry", {x: m.l + w + 12, y: m.t - 6, class: "pv-axlab"});
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
  /* Named on the first line, and on the second what crossing it MEANS: the rule is only
     worth drawing because bars pass it, and the count is read off the data, never typed. */
  const past = rows.filter(r => r.pct_of_industry > ES).length;
  txt(svg, `all engineers, scientists and technicians together: ${pct(ES)}`,
    {x: xs(ES) + 8, y: m.t - 28, class: "pv-labq"});
  txt(svg, `${WORDS[past] || past} occupations outweigh them on their own`,
    {x: xs(ES) + 8, y: m.t - 10, class: "pv-labq"});
}

function drawMixMobile() {
  const rows = MIX;
  const m = {t: 126, r: 12, b: 44, l: 12}, W = 375, rowH = 42;
  const H = m.t + rows.length * rowH + m.b;
  const {svg} = chart("mix", {W, H});
  const w = W - m.l - m.r;
  const maxV = Math.max(...rows.map(r => r.pct_of_industry)) * 1.18;
  const xs = v => m.l + (v / maxV) * w;
  const ES = D.mix_totals.eng_sci_share_pct;
  const past = rows.filter(r => r.pct_of_industry > ES).length;
  /* THE SCOPE LINE COMES FIRST ON THE PHONE, because the phone's first paint of this chart
     is the reader's first paint of any chart, and the number in the right-hand column is the
     one the hero already showed them. */
  txt(svg, "these figures count the whole country",
    {x: m.l, y: m.t - 100, class: "pv-lab"});
  txt(svg, `rule: all engineers, scientists and technicians, ${pct(ES)}`,
    {x: m.l, y: m.t - 78, class: "pv-labq"});
  txt(svg, `${WORDS[past] || past} occupations outweigh them on their own`,
    {x: m.l, y: m.t - 60, class: "pv-labq"});
  txt(svg, "right of each row: of all US workers", {x: m.l, y: m.t - 32,
    class: "pv-labq"});
  txt(svg, "in the job, the share in this industry", {x: m.l, y: m.t - 14,
    class: "pv-labq"});
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
  const rows = MIX;
  /* "The fourteen LARGEST", never a bare "fourteen": the schooling section has its own
     fourteen and the two sets differ by four members. */
  document.getElementById("mixtitle").textContent =
    `The ${WORDS[rows.length] || rows.length} largest occupations are ${Math.round(topShare)}% of the industry, and most of them are on the floor`;
  document.getElementById("mixtable").innerHTML = withNote(tableView("mix",
    "The industry’s largest occupations, US, 2024",
    ["Occupation", "Share of the industry",
     "Share of everyone in the country with this job who works in this industry",
     "Jobs in the industry, 2024", "Projected change to 2034"],
    rows.map(r => [r.bls_title, pct(r.pct_of_industry), pct(r.pct_of_occupation),
      N(r.emp_2024_k * 1000), (r.change_pct_2024_34 >= 0 ? "+" : "\u2212") + Math.abs(r.change_pct_2024_34) + "%"])),
    /* THE TWO NUMBERS A READER WILL GET, BOTH PRINTED, WITH THE REASON THEY DIFFER. Adding
       the job counts gives one answer and adding the printed bar shares gives another, and
       the page used to publish only the second. Both are stated here on the base a reader
       can see, so the arithmetic closes either way round. */
    `One row is one detailed occupation employed in the industry, from the Employment
     Projections matrix for industry 326000 on a 2024 base. The ${rows.length} shown hold
     ${N(MIX_EMP_K * 1000)} of the industry’s
     ${N(D.mix_totals.industry_emp_2024_k * 1000)} jobs, which is ${pct(topShare)}. Adding
     the shares printed on the bars instead gives ${pct(topShareBars)}, because each of them
     is rounded to a tenth of a point and the roundings run down; the ${pct(topShare)} is
     computed from the job counts. Production occupations of every
     kind are ${D.mix_totals.production_share_pct}%; engineers, scientists and technicians
     together are ${pct(D.mix_totals.eng_sci_share_pct)}. Rows run largest first by job
     count, not by the rounded share, so two occupations that both print 2.0% still sit in
     the right order. The 2034 column is a projection,
     a modelled path with no confidence band.`);
  document.getElementById("mixsrc").innerHTML =
    `Bureau of Labor Statistics Employment Projections, National Employment Matrix, 2024
     base. The staffing shares are national, not regional: this is the shape of the
     industry across the country, not inside Ohio.`;
  const R = D.region;
  document.getElementById("mixnote").innerHTML =
    `<b>One regional number, and what kind of number it is.</b> The <dfn>twelve counties the
     Polymer Industry Cluster (PIC) measures against, the federal-data footprint of the
     Greater Akron Chamber&rsquo;s polymer programme, running from Ashtabula to Wayne,</dfn> reported
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
const bandNote = (key, compact) => {
  const r = key === "deg" ? "degree_median_ratio" : key === "hs" ? "hs_median_ratio" : null;
  const A = r ? RB["10420"][r] : bandRatio(key, "10420");
  const C = r ? RB["17410"][r] : bandRatio(key, "17410");
  if (A == null || C == null) return null;
  const lead = compact || key !== "deg" ? "Akron" : "Akron pays these";
  /* On the phone the × form is the apparatus that goes: 375px holds the reading or the
     arithmetic, not both, and the table twin carries every ratio to two places. */
  return compact
    ? `${lead} ${gap(A)} · Cleveland ${gap(C, "")}`
    : `${lead} ${gap(A)} (${x(A)}) · Cleveland ${gap(C, "")} (${x(C)})`;
};

function drawPay() { MOBILE.matches ? drawPayDesktopish(false) : drawPayDesktopish(true); }

function drawPayDesktopish(desktop) {
  const W = desktop ? 1100 : 375;
  /* MEASURED STACKS, NOT TYPED DROPS. Every pair of lines in this chart that shares an x
     sat on a drop typed against the desktop face: the phone's two reading lines at the
     top (16 apart), each band's label and its note (18), and the two lines under the
     dollar scale at the foot (16). Below 760px the shared sheet raises chart type to a
     face that paints an 18.2-to-18.8-unit line box, so all five pairs overlapped at every
     width in the phone band — the gate's 3px reporting floor showed the two 16s from 480
     up, where the render scale exceeds 1, and never showed the three 18s at all. Nothing
     here is an axis corner; it is the same leading constant five times. The drops below
     are derived from the rendered face. On desktop they come out one to two units tighter
     than the numbers that were typed here (37, 44 and 50 against 38, 46 and 52), because
     a derived drop asks the face what it needs rather than rounding up by eye, and the
     foot line hangs from the last tick row instead of from the canvas bottom. Measured
     clearance between every pair on this chart is now 2.25 units or better at all
     fourteen swept widths. */
  const node = document.getElementById("pay");
  const Q = face(node, "pv-labq"), A = face(node, "pv-axlab");
  const capY = Math.ceil(Q.ascent + 2);                 // phone: first reading line
  const capY2 = capY + PV.lead(node, "pv-labq", "pv-labq");
  const labelDrop = 18;                                 // band label under its header top
  const noteDrop = labelDrop + PV.lead(node, "pv-lab", "pv-labq");
  const ruleDrop = Math.ceil(noteDrop + Q.descent + 4);
  /* The right gutter holds the metro-over-nation column below; the top margin holds its
     header. Both widened from the version that had neither. On the phone the top margin
     is no longer a number at all: it is whatever puts the first band label one measured
     leading under the second reading line. */
  const m = desktop
    ? {t: 78, r: 240, b: 62, l: 290}
    : {t: capY2 + PV.lead(node, "pv-labq", "pv-lab") - labelDrop, r: 60, b: 0, l: 12};
  const rowH = desktop ? 24 : 36;
  /* The scale used to appear once, at the bottom, after twenty-six rows: reading the
     degree band on the desktop page put the dollars roughly seven hundred pixels off
     screen, and the phone showed a field of unscaled dots. Each group now closes with its
     own dollar ticks at BOTH widths, which is what the wider gap buys (chart-craft
     § mobile) — the small screen should not be the easier one to read. */
  const headH = ruleDrop + (desktop ? 6 : 8), gap = desktop ? 44 : 40;
  let cy = m.t;
  const geo = GROUPS.map(G => {
    const headY = cy; cy += headH;
    const y0 = cy; cy += G.rows.length * rowH;
    const y1 = cy; cy += gap;
    return {G, headY, y0, y1};
  });
  const h = cy - gap - m.t;
  /* The last group's dollar ticks are the floor the foot lines have to clear, so the two
     of them are placed from that floor and the phone's bottom margin is whatever putting
     them there costs. The desktop margin keeps its own breathing room. */
  const footTick = m.t + h + 26;
  const wageY = footTick + PV.lead(node, "pv-tick", "pv-axlab");
  const beginY = wageY + PV.lead(node, "pv-axlab", "pv-axlab");        // phone only
  m.b = desktop ? 62 : Math.ceil(beginY + A.descent + 6) - (m.t + h);
  const H = m.t + h + m.b;
  const {svg} = chart("pay", {W, H});
  const w = W - m.l - m.r;
  const {lo, hi} = payDomain();
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;         // LINEAR
  /* THE COLUMN THE DOTS CANNOT DRAW. One dollar scale has to hold a $30 gap and a $16,200
     one, so in the high-school band the three metro dots and the national diamond collapse
     into a single ten-pixel clump and the only question the chart exists to answer — which
     side of the diamond is this metro on — cannot be read off the picture. Position still
     encodes the wage, because the level is worth seeing; the ratio is printed beside it,
     because the comparison is not drawable at this scale. Same measure and same glyph as
     the band notes and the table, so nothing here is a second unit. */
  /* Three columns where the desktop gutter holds three; on the phone the gutter holds one,
     and the header says which metro it is rather than leaving the reader to guess. */
  const COLS = desktop ? ON_CHART : ["10420"];
  const rail = m.l + w + (desktop ? 14 : 8);
  const colX = i => rail + i * 78;
  if (desktop) {
    txt(svg, "metro pay ÷ national pay", {x: rail, y: m.t - 62, class: "pv-axlab"});
    txt(svg, "under 1.00 is below the nation", {x: rail, y: m.t - 44, class: "pv-labq"});
    /* Canton-Massillon does not fit a 74-unit column on one line and ran into Cleveland's
       header, so a hyphenated metro name breaks at its hyphen and the parts bottom-align
       with the single-word names beside them. */
    COLS.forEach((a, i) => short(a).split("-").forEach((part, j, all) =>
      txt(svg, j < all.length - 1 ? part + "-" : part,
        {x: colX(i), y: m.t - 8 - (all.length - 1 - j) * 16,
         class: "pv-lab", fill: COLOR[a]})));
  } else {
    txt(svg, `right of each row: ${short(COLS[0])} pay ÷ national pay`,
      {x: m.l, y: capY, class: "pv-labq"});
    txt(svg, "under 1.00 is below the nation", {x: m.l, y: capY2, class: "pv-labq"});
  }
  geo.forEach(({G, headY, y0, y1}) => {
    /* The story band gets its shading; every band gets its claim written on it. */
    if (G.key === "deg") el("rect", {x: m.l, y: y0 - 2, width: w,
      height: G.rows.length * rowH + 4, fill: "rgba(12,100,115,.055)"}, svg);
    const label = `${G.label} · ${G.rows.length} occupations`;
    if (desktop) {
      /* The note sits UNDER the band label, not opposite it. Right-anchored at the plot's
         right edge it collided with the label once the gutter took 166px of that edge, and
         a summary that overlaps its own band name is worse than no summary. */
      txt(svg, label, {x: m.l, y: headY + labelDrop, class: "pv-lab", fill: INK});
      const note = bandNote(G.key, false);
      if (note) txt(svg, note, {x: m.l, y: headY + noteDrop, class: "pv-labq"});
      el("line", {x1: m.l, y1: headY + ruleDrop, x2: m.l + w, y2: headY + ruleDrop,
        stroke: "var(--pv-grid)", "stroke-width": 1}, svg);
    } else {
      txt(svg, label, {x: m.l, y: headY + labelDrop, class: "pv-lab", fill: INK});
      const note = bandNote(G.key, true);
      if (note) txt(svg, note, {x: m.l, y: headY + noteDrop, class: "pv-labq"});
      el("line", {x1: m.l, y1: headY + ruleDrop, x2: W - m.r, y2: headY + ruleDrop,
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
      COLS.forEach((a, i) => {
        const c = r.metros[a];
        txt(g, c.absent ? "—" : x(c.median_vs_us), {x: colX(i), y: yl + 4,
          class: c.absent ? "pv-labq" : "pv-lab", fill: c.absent ? null : COLOR[a]});
      });
      const cells = AREAS.map(a => {
        const c = r.metros[a];
        return `${short(a)}: ${c.absent ? "<i>withheld</i>" : `<span class="v">${money(c.median)}</span> (${x(c.median_vs_us)}, survey error ${c.mean_rse}%)`}`;
      }).join("<br>");
      const p = r.projection;
      hoverable(el("rect", {x: 0, y: desktop ? y - rowH / 2 : y, width: W, height: rowH,
        fill: "transparent"}, g),
        `<b>${r.occupation}</b><br>US median <span class="v">${money(nat)}</span><br>${cells}
         ${p ? `<br>projected openings, NE Ohio 2022&ndash;32: <span class="v">${N(p.openings_annual)}</span> a year` : ""}`,
        `${r.occupation}: US median ${money(nat)}; ` + AREAS.map(a => `${short(a)} ${r.metros[a].absent ? "withheld" : money(r.metros[a].median)}`).join(", "));
    });
    /* The scale, repeated under each group at both widths, so no group of dots is ever
       read without one. */
    const ax = el("g", {}, svg);
    el("line", {x1: m.l, y1: y1 + 8, x2: m.l + w, y2: y1 + 8,
      stroke: "var(--pv-axis)", "stroke-width": 1}, ax);
    /* Dropped, never clamped: a tick label nudged inward to fit is a number printed at
       the wrong place on its own scale. */
    ticks(lo, hi, 5).filter(v => (desktop || v > lo) && xs(v) <= m.l + w - 18)
      .forEach(v => txt(ax, "$" + Math.round(v / 1000) + "k",
        {x: xs(v), y: y1 + 26, class: "pv-tick", "text-anchor": "middle"}));
  });
  txt(svg, desktop ? "Annual median wage, May 2024 (axis begins at $25,000)"
                   : "annual median wage, May 2024",
    desktop ? {x: m.l + w / 2, y: wageY, "text-anchor": "middle", class: "pv-axlab"}
            : {x: m.l, y: wageY, class: "pv-axlab"});
  if (!desktop) txt(svg, "axis begins at $25,000", {x: m.l, y: beginY, class: "pv-axlab"});
}

/* ------------------------- WHAT "BEATS THE NATION" COUNTS, COUNTED FROM THE DOLLARS
 *
 * The lede used to print a typed 10 for Cleveland. A reader counting the published table
 * got 11 and was right: the stored tally was computed on each row's ratio ROUNDED to two
 * places, so first-line supervisors, at $71,220 against $71,190, read as 1.00 and dropped
 * out. The page's own paycheck band celebrates a $30 lead in Akron as beating the nation,
 * so a $30 lead in Cleveland has to count as one too. Recomputed here from the medians the
 * table prints, with the ties named rather than silently excluded. */
const beatsRows = a => payRows.filter(r => !r.metros[a].absent && r.national &&
  r.metros[a].median > r.national.median);
const levelRows = a => payRows.filter(r => !r.metros[a].absent && r.national &&
  r.metros[a].median === r.national.median);
/* A lead of a few tens of dollars on a survey estimate is a tally entry, not a ranking, and
   the note says how many of them there are rather than leaving a reader to find out. */
const narrowLeads = AREAS.flatMap(a => beatsRows(a)
  .filter(r => r.metros[a].median - r.national.median < 100).map(r => [a, r]));
const LEVEL = AREAS.flatMap(a => levelRows(a).map(r => [a, r]));
/* NAME THE CELLS, DO NOT JUST COUNT THEM. The note said "2 metro figures carry a survey
   error above 10%" beside a column that shows each occupation's WIDEST metro only, so
   exactly one of the two was visible and a reader checking the sentence could not close it.
   Derived and named here, from the same cells the table prints. */
const HIGH_RSE = AREAS.flatMap(a => payRows
  .filter(r => !r.metros[a].absent && r.metros[a].mean_rse > D.pay_totals.high_rse_threshold_pct)
  .map(r => [a, r]))
  .sort((p, q) => q[1].metros[q[0]].mean_rse - p[1].metros[p[0]].mean_rse);
const rowWidestRse = r => Math.max(...AREAS.filter(a => !r.metros[a].absent)
  .map(a => r.metros[a].mean_rse), 0);
const HIGH_RSE_SHOWN = HIGH_RSE.filter(([a, r]) => r.metros[a].mean_rse === rowWidestRse(r)).length;
{
  const [first, ...rest] = AREAS;
  const tail = rest.map(a => `${beatsRows(a).length} of ${D.pay_totals.disclosed[a]} in ${short(a)}`);
  document.getElementById("beats").innerHTML =
    `Only ${beatsRows(first).length} of ${short(first)}’s ${D.pay_totals.disclosed[first]}
     published occupations are paid above the same job nationally,
     ${tail.slice(0, -1).join(", ")} and ${tail[tail.length - 1]}.`;
}

{
  const T = D.pay_totals;
  /* THE FOURTH METRO, IN THE LEGEND. The deck says all four, the lede quotes a
     Youngstown-Warren figure, and the chart draws three — a fact that lived in one
     dependent clause of a five-line subtitle, which readers went hunting past. The absence
     belongs where the presences are named. */
  const OFF = AREAS.filter(a => !ON_CHART.includes(a));
  document.getElementById("paylegend").innerHTML =
    `<span><i style="background:#fff;box-shadow:inset 0 0 0 2px ${INK};transform:rotate(45deg);width:11px;height:11px"></i> United States</span>` +
    ON_CHART.map(a => `<span><i style="background:${COLOR[a]};border-radius:50%"></i> ${M.metros[a].short}</span>`).join("") +
    OFF.map(a => `<span class="off"><i style="background:none;box-shadow:inset 0 0 0 2px #B9B3A9;border-radius:50%"></i> <span>${M.metros[a].short}, not drawn: ${T.disclosed[a]} of ${T.occupations} wages published</span></span>`).join("");
  document.getElementById("paytable").innerHTML = withNote(tableView("pay",
    "Annual median wage by occupation and metro against the nation, May 2024",
    /* RSE arrived here unexpanded and was the page's first and only use of the initials
       before the methodology box, forty screens down, spelled them out. A column header is
       prose and gets the same first-contact translation as a sentence. */
    ["Occupation", "Schooling band", "United States", ...AREAS.map(a => short(a)),
     "Widest survey error in any metro", "Projected openings a year, NE Ohio 2022–32"],
    payRows.map(r => [r.occupation,
      {deg: "Degree", mid: "In between", hs: "High school"}[grp(r.soc)],
      money(r.national && r.national.median),
      ...AREAS.map(a => r.metros[a].absent ? "withheld" : `${money(r.metros[a].median)} (${x(r.metros[a].median_vs_us)})`),
      pct(Math.max(...AREAS.filter(a => !r.metros[a].absent).map(a => r.metros[a].mean_rse), 0)),
      r.projection ? N(r.projection.openings_annual) : "—"])),
    `The metro areas neither sit inside the twelve Polymer Industry Cluster counties nor
     cover them exactly, so the columns sit side by side and are never summed.
     ${Cap(WORDS[D.pay_totals.absent_everywhere.length] || String(D.pay_totals.absent_everywhere.length))}
     occupation is withheld in all four metros, and the rest of the gap between
     ${T.occupations} and each metro&rsquo;s published count is withheld in that metro
     alone: ${AREAS.map(a => `${short(a)} ${T.disclosed[a]}`).join(", ")}.
     ${Cap(WORDS[HIGH_RSE.length] || String(HIGH_RSE.length))} metro figures carry a survey error
     (the relative standard error, the sampling error as a share of the estimate) above
     ${T.high_rse_threshold_pct}% of the average wage, wide enough to move them:
     ${HIGH_RSE.map(([a, r]) => `${name(r)} in ${short(a)} (${pct(r.metros[a].mean_rse)})`).join(" and ")}.
     The column above carries only each occupation&rsquo;s widest metro, so
     ${WORDS[HIGH_RSE.length - HIGH_RSE_SHOWN] || HIGH_RSE.length - HIGH_RSE_SHOWN} of them
     is not visible there. Being paid above the national median means exactly that, a higher
     figure in dollars: ${WORDS[narrowLeads.length] || narrowLeads.length} of the metro
     figures clear their national median by under $100, which on a survey estimate is a tally
     entry and not a ranking, and ${WORDS[LEVEL.length] || LEVEL.length} more are level to
     the dollar and count as neither
     (${LEVEL.map(([a, r]) => `${name(r)} in ${short(a)}`).join(", ")}). Projected
     openings are Ohio Department of Job and Family Services 2022&ndash;2032 modelled paths
     with no confidence band, for the eighteen-county JobsOhio Northeast region, which
     contains all twelve counties and more. What a dollar buys in each metro is the
     <a href="../realwage/">real-wage page</a>&rsquo;s question.`);
  document.getElementById("paysrc").innerHTML =
    `Bureau of Labor Statistics Occupational Employment and Wage Statistics, May 2024,
     metropolitan and national files. Wages the bureau withheld are shown as withheld and
     never as zero: tire builders are published for none of the four metros.`;
}

/* -------------------------------------------------------- 3. what schooling */
const BINS = [["hs_or_less", "High school or less", SEQ[0]],
              ["some_college", "Some college or associate", SEQ[2]],
              ["bachelors", "Bachelor’s degree", SEQ[4]],
              ["graduate", "Graduate degree", SEQ[5]]];
/* THE FOUR COLUMNS ARE TWELVE LEVELS BINNED, AND THE TABLE WAS PRINTING THE TWELVE.
   "Most-reported level" read "Post-Secondary Certificate" and "Some College Courses",
   labels that appear nowhere among the four headings above them, and a reader gave up
   reconciling the row. The database numbers its levels 1 to 12 and the bins are runs of
   that numbering, so the column each modal level belongs to is derivable rather than
   guessable: 1-2 high school or less, 3-5 some college or associate, 6-7 bachelor's,
   8-12 graduate. Printed beside the level, so the row closes on itself. */
const binOfCategory = c => c <= 2 ? BINS[0] : c <= 5 ? BINS[1] : c <= 7 ? BINS[2] : BINS[3];
const modalCell = r => {
  const lvl = tq(r.modal.label.split(" - ")[0]), col = binOfCategory(r.modal.category)[1];
  return lvl.toLowerCase() === col.toLowerCase() ? lvl : `${lvl} (in the ${col} column)`;
};
/* ONE OCCUPATION, ONE NAME, ACROSS EVERY SURFACE. This table printed the database's own
   occupation title, so the row the rest of the page calls "Assemblers and fabricators"
   appeared here as "Team Assemblers" and read as a different job. The page name leads; the
   database occupation is named only where its code is genuinely a different one from the
   federal code the row is filed under, which is the case the reader actually hit. */
const onetCode = r => (r.join.match(/\d{2}-\d{4}/) || [""])[0];

/* WHERE THE DARK BEGINS, DRAWN AS A MARK RATHER THAN LEFT TO THE HUES.
   The section's whole reading is "the earlier the dark begins, the more schooling the
   job's own people say it takes", and on a 16-unit bar four steps of one teal ramp do not
   carry that boundary: a reader reported the shades as near-identical and the reading as
   unusable. Two cheap fixes, both structural rather than chromatic (the ramp is the
   validated sequential one and stays): a paper-coloured hairline at every segment join, so
   all four boundaries are crisp at any size, and a full-height ink tick at the ONE join the
   claim turns on, where bachelor's begins. The tick is drawn from the same bins the
   segments are, so it cannot point at the wrong place. */
const degreeMark = (g, r, xs, y, bh) => {
  const b = r.bins, joins = [b.hs_or_less, b.hs_or_less + b.some_college,
    b.hs_or_less + b.some_college + b.bachelors];
  joins.forEach(v => { if (v > 0.05 && v < 99.95)
    el("line", {x1: xs(v), y1: y, x2: xs(v), y2: y + bh,
      stroke: "var(--paper)", "stroke-width": 1}, g); });
  const start = b.hs_or_less + b.some_college;          // where bachelor's-or-higher begins
  if (start < 99.95) el("line", {x1: xs(start), y1: y - 3, x2: xs(start), y2: y + bh + 3,
    stroke: INK, "stroke-width": 1.6}, g);
};
const eduName = r => onetCode(r) === r.soc ? r.occupation
  : `${r.occupation} (${r.onet_title} in the database, ${r.join.replace("O*NET ", "")})`;

function drawEdu() { MOBILE.matches ? drawEduMobile() : drawEduDesktop(); }

function drawEduDesktop() {
  const rows = eduRows;
  const {svg, W, m, w} = chart("edu", {W: 1100, rows: rows.length, rowH: 24,
    m: {t: 66, r: 200, b: 60, l: 290}});
  const xs = v => m.l + (v / 100) * w;
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * 24, xs, ys: () => 0,
    xt: [0, 25, 50, 75, 100], yt: [], xfmt: v => v + "%",
    xlab: "Share of surveyed workers and experts reporting each level as required"});
  /* The Zone column ran unlabelled: a reader met "Zone 4" with nothing to say whether four
     was a lot, and the term itself was defined in a paragraph most readers reach the chart
     before. The header now names the term AND gives its reading, at the point of use. */
  txt(svg, "Job Zone:", {x: m.l + w + 12, y: m.t - 46, class: "pv-axlab"});
  txt(svg, "preparation needed,", {x: m.l + w + 12, y: m.t - 26, class: "pv-axlab"});
  txt(svg, "1 low, 5 high", {x: m.l + w + 12, y: m.t - 6, class: "pv-axlab"});
  /* Same tint, same six rows, same order as the pay chart's degree band: the reader can
     carry the shape from one chart to the other without re-reading the labels. */
  el("rect", {x: 0, y: m.t, width: W, height: nDeg * 24,
    fill: "rgba(12,100,115,.055)"}, svg);
  /* THE TEST THE SECTION TURNS ON, DRAWN. "Degree-MAJORITY" is a claim about half, and the
     reader had no half to check it against: every bar runs the full width, so the only
     thing that varies is where the dark begins. Labelled by what crossing means. */
  el("line", {x1: xs(50), y1: m.t - 2, x2: xs(50), y2: m.t + rows.length * 24,
    stroke: INK, "stroke-width": 1.5, opacity: .4}, svg);
  txt(svg, "half the reports", {x: xs(50) + 8, y: m.t - 26, class: "pv-labq"});
  txt(svg, "a notch left of this rule: most say a degree",
    {x: xs(50) + 8, y: m.t - 8, class: "pv-labq"});
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
    degreeMark(g, r, xs, y, bh);
    txt(g, name(r), {x: m.l - 12, y: y + bh - 3, "text-anchor": "end", class: "pv-lab"});
    txt(g, r.job_zone ? `Zone ${r.job_zone <= 2 ? "1–2" : r.job_zone}` : "",
      {x: m.l + w + 12, y: y + bh - 3, class: "pv-labq"});
    const desc = (r.description || "").split(". ")[0];
    hoverable(el("rect", {x: 0, y: y - 4, width: W, height: bh + 8, fill: "transparent"}, g),
      `<b>${r.occupation}</b><br>${BINS.map(([k, l]) => `${l}: <span class="v">${pct(r.bins[k])}</span>`).join("<br>")}
       <br>most reported: ${modalCell(r)} (${pct(r.modal.pct)})<br>${r.job_zone_name}
       ${desc ? `<br><i>${desc}.</i>` : ""}<br><span style="font-size:12px">database occupation: ${r.onet_title}, ${r.join}</span>`,
      `${r.occupation}: ${BINS.map(([k, l]) => `${l} ${pct(r.bins[k])}`).join(", ")}; ${r.job_zone_name}`);
  });
}

function drawEduMobile() {
  const rows = eduRows;
  const m = {t: 56, r: 12, b: 44, l: 12}, W = 375, rowH = 40;
  const H = m.t + rows.length * rowH + m.b;
  const {svg} = chart("edu", {W, H});
  const w = W - m.l - m.r;
  const xs = v => m.l + (v / 100) * w;
  txt(svg, "Job Zone: preparation needed, 1 low 5 high →", {x: W - m.r, y: m.t - 30,
    "text-anchor": "end", class: "pv-labq"});
  txt(svg, "notch left of the rule: most reports say a degree",
    {x: m.l, y: m.t - 12, class: "pv-labq"});
  el("rect", {x: 0, y: m.t - 4, width: W, height: nDeg * rowH,
    fill: "rgba(12,100,115,.055)"}, svg);
  /* Segment per row, not one full-height rule: on the phone the labels sit ABOVE their
     bars rather than in a left margin, so a continuous line at 50% struck through half the
     occupation names. It reads as the same rule and crosses nothing. */
  rows.forEach((r, i) => el("line", {x1: xs(50), y1: m.t + i * rowH + 17,
    x2: xs(50), y2: m.t + i * rowH + 33, stroke: INK, "stroke-width": 1.5,
    opacity: .45}, svg));
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
    degreeMark(g, r, xs, y + 18, 14);
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, g),
      `<b>${r.occupation}</b><br>${BINS.map(([k, l]) => `${l}: <span class="v">${pct(r.bins[k])}</span>`).join("<br>")}`,
      `${r.occupation}: ${BINS.map(([k, l]) => `${l} ${pct(r.bins[k])}`).join(", ")}`);
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
    `${Cap(WORDS[ET.ba_plus_majority.length] || String(ET.ba_plus_majority.length))} of these occupations are degree jobs; ${WORDS[ET.hs_majority.length] || ET.hs_majority.length} are high-school-majority; the rest sit between`;
  document.getElementById("edutable").innerHTML = withNote(tableView("edu",
    "Reported required level of education, by occupation",
    ["Occupation", "Job Zone: preparation the work needs, 1 low to 5 high",
     ...BINS.map(b => b[1]), "Most-reported single level, of the twelve the survey uses"],
    eduRows.map(r => [eduName(r), r.job_zone <= 2 ? "1–2" : r.job_zone,
      ...BINS.map(([k]) => pct(r.bins[k])), modalCell(r)])),
    `The Job Zone is the database&rsquo;s rating of overall preparation, 1 for the least and
     5 for the most, with the two lowest steps reported as one band. The survey offers
     twelve levels of education and the four columns here are runs of those twelve: levels
     1 to 2 are high school or less, 3 to 5 some college or associate, 6 to 7
     bachelor&rsquo;s, 8 to 12 graduate. The last column names the single most-reported
     level, so it prints one of the twelve and says which of the four columns holds it.
     Where one federal occupation code holds several database
     occupations, the row is the equal-weight mean of them, and the chart&rsquo;s hover
     names which; where the database files the work under a different code from the federal
     one, the occupation column names both. ${ET.ba_plus_majority.length} of the ${ET.n} occupations have a
     bachelor&rsquo;s-or-higher majority; ${ET.hs_majority.length} have a
     high-school-or-less majority. None of it is regional. The licence for this database is
     in the page footer.`);
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
  const m = phone ? {t: 74, r: 118, b: 58, l: 34} : {t: 58, r: 178, b: 58, l: 50};
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
  /* THE REFERENCE LINE THE CLAIM RESTS ON, labelled by what CROSSING it means and not by
     the arithmetic that put it there (that is in the table note). Its
     label lives in the right margin rather than on the rule: a level line at 71 runs
     under the top of every column before 2022, so any in-plot caption would print on
     solid ink. Outside the plot it is legible and it still reads as the line's own. */
  const RULE = "#A32A78";
  el("line", {x1: m.l, y1: ys(halfEarly), x2: m.l + w, y2: ys(halfEarly),
    stroke: RULE, "stroke-width": 1.5}, svg);
  const rail = m.l + w + 8;
  /* Hand-shortened to the margin each breakpoint actually has. A label that runs past the
     figure is a build error, not a style, so the phone takes four short lines rather than
     three long ones. */
  /* THE BASELINE THE RULE IS HALF OF, PRINTED. The label used to name the window and the
     threshold and nothing in between, so a reader holding the only two figures on the page
     — "between 118 and 179 a year" — could not get to 71 from either of them: half of 118
     is 59 and half of 179 is 90. The average it is actually half of now appears, here and
     in the series annotation, so the arithmetic closes on the figure itself. */
  const rlab = phone
    ? ["under this rule:", "half the", `${EARLY[0]}–${EARLY[EARLY.length - 1]}`,
       `average of ${Math.round(earlyMean)},`, `so ${Math.round(halfEarly)} a year`]
    : ["under this rule:", `half the ${EARLY[0]}–${EARLY[EARLY.length - 1]}`,
       `average of ${Math.round(earlyMean)},`, `so ${Math.round(halfEarly)} a year`];
  /* 19px, not 17: the step was tuned against the fallback face. Shipping Lato
     (2026-08-31) raised the glyph box just past 17px and consecutive lines kissed at
     the 700px sweep width. */
  rlab.forEach((s, i) => txt(svg, s, {x: rail, y: ys(halfEarly) - 8 + i * 19,
    class: i ? "pv-labq" : "pv-lab", fill: i ? null : RULE}));
  /* SWATCHES, LIKE EVERY OTHER LEGEND ON THE PAGE. Coloured text alone was the weakest
     cue here and the only one of its kind, and the materials label was printed in a
     different step of the ramp from the bars it named. */
  const key = (label, col, y) => {
    el("rect", {x: m.l, y: y - 10, width: 11, height: 11, fill: col, rx: 2}, svg);
    txt(svg, label, {x: m.l + 16, y, class: "pv-lab"});
  };
  key("Polymer programs", SEQ[5], m.t - (phone ? 54 : 30));
  key("Materials programs", SEQ[2], m.t - (phone ? 36 : 12));
  txt(svg, `${Math.round(earlyMean)} a year through ${EARLY[EARLY.length - 1]}, then ${LATE.map(y => polyByYear[y]).join(" and ")}`,
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
    txt(svg, r.window_avg.toFixed(1), {x: xs(r.window_avg) + 8, y: y + bh - 4, class: "pv-lab"});
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
    txt(svg, r.window_avg.toFixed(1), {x: xs(r.window_avg) + 6, y: y + 30, class: "pv-lab"});
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
  /* TWO CORRECTIONS IN ONE HEADING, both caught by a reader checking it against the chart
     under it. (1) Three institutions appear on the programs chart, but only two of them
     confer a POLYMER degree; Kent State is in the materials comparison group alone, so a
     reader counting the dark bars contradicted the heading immediately. (2) "More than
     half" did not follow from the annotation beside it: 63 against 124 in 2021 is a 49%
     fall. It IS more than half below the 2014-2021 average, which is what the figure title
     and the rule have always said, so the heading now makes the claim the chart draws. */
  const polyInst = new Set(D.programs.filter(p => p.group === "polymer").map(p => p.institution));
  document.getElementById("progtitle").textContent =
    `${Cap(WORDS[polyInst.size] || String(polyInst.size))} universities confer the polymer degrees, and the count has fallen below half its old pace`;
  document.getElementById("trendtable").innerHTML = withNote(tableView("trend",
    `Polymer and materials degrees conferred a year, ${progYears[0]}–${progYears[progYears.length - 1]}`,
    ["Year", "Polymer programs", "Materials programs"],
    progYears.map(y => [y, polyByYear[y], matByYear[y]])),
    `Polymer programs are polymer engineering 14.3201 and polymer chemistry 40.0507;
     materials programs are 14.1801 and 40.1001. The polymer mean for
     ${EARLY[0]}&ndash;${EARLY[EARLY.length - 1]} is ${earlyMean.toFixed(2)} degrees a year
     and the rule on the chart is half of it, ${halfEarly.toFixed(2)}, which the label
     rounds to ${Math.round(halfEarly)}. A program recoded to a different federal
     program code would leave these counts without leaving the region.`);
  document.getElementById("trendsrc").innerHTML =
    `Integrated Postsecondary Education Data System completions, summed across the
     region&rsquo;s programs each year. The file ends at ${PT.latest_year}, the last year
     available when this page was built, so the fall rests on two observed years.`;
  document.getElementById("progtable").innerHTML = withNote(tableView("prog",
    `Polymer and materials degrees conferred, by program, ${PT.latest_year} and ${WIN[0]}–${WIN[WIN.length - 1]} average`,
    ["Institution", "Program", "Level", String(PT.latest_year), `${WIN[0]}–${WIN[WIN.length - 1]} average`],
    progRows.map(r => [r.institution, `${r.program} (${r.cip.slice(0, 2)}.${r.cip.slice(2)})`, r.award, r.latest, r.window_avg.toFixed(1)])),
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
