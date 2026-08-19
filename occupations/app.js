/* The occupations inside plastics and rubber manufacturing.
 *
 * THE GATE (web/README.md), answered:
 *   0. Dataset: one detailed occupation (six-digit federal occupation code) — its share of
 *      the industry nationally (BLS National Employment Matrix), its annual median wage in
 *      four Northeast Ohio metros and nationally (BLS OEWS, May 2024, all industries), the
 *      education its workers report (O*NET 30.3), and, for the degree occupations, the
 *      degrees the region's universities confer (IPEDS by CIP).
 *   1. Benchmark: the SAME occupation nationally — for the staffing share it is the
 *      industry's own total; for the wage it is the national all-industry median.
 *   2. Encodings: bar length = share of industry (linear from zero); dot position = annual
 *      median dollars (linear); stacked bar segment = share of respondents by education
 *      level (100% bars); bar length = degrees a year (linear from zero).
 *   3. Uncertainty: survey RSE in table and hover; withheld cells shown as withheld, never
 *      zero; the regional occupation counts are ESTIMATES and the sentence says so; the
 *      2022-32 openings are a projection and are labeled as one.
 *   4. Palette: the validated categorical for the three metros; a sequential teal ramp for
 *      the ORDINAL education levels; ink for the nation.
 *   7. Dollars are one year (May 2024) — no deflation needed. Bars are linear.
 */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, chart, figures, N, SEQ, CAT, GRAY, INK} = PV;
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

/* ------------------------------------------------------------ hero figures */
const setters = D.mix.find(m => m.soc === "51-4072");
figures([
  ["key", pct(setters.pct_of_industry), "of the industry's jobs", "are molding-machine setters, nationally, 2024"],
  ["", pct(setters.pct_of_occupation, 0), "of the nation's setters", "work in plastics and rubber manufacturing"],
  ["", N(D.mix_totals.industry_emp_2024_k * 1000), "jobs in the industry", "nationally, 2024"],
  ["", pct(D.mix_totals.eng_sci_share_pct), "engineers and scientists", "with technicians — the distinctive share, and a small one"],
]);

/* --------------------------------------------------------- 1. staffing mix */
{
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
    const y = m.t + i * 30 + 6, bh = 18;
    const distinctive = r.pct_of_occupation >= 40;
    el("rect", {x: m.l, y, width: Math.max(2, xs(r.pct_of_industry) - m.l), height: bh,
      fill: distinctive ? SEQ[5] : SEQ[3], rx: 3}, svg);
    txt(svg, name(r), {x: m.l - 12, y: y + bh - 4, "text-anchor": "end", class: "pv-lab"});
    txt(svg, pct(r.pct_of_industry), {x: xs(r.pct_of_industry) + 8, y: y + bh - 4, class: "pv-lab"});
    txt(svg, `${Math.round(r.pct_of_occupation)}%`,
      {x: m.l + w + 12, y: y + bh - 4, class: distinctive ? "pv-lab" : "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 6, width: W, height: bh + 12, fill: "transparent"}, svg),
      `<b>${r.bls_title}</b><br><span class="v">${pct(r.pct_of_industry)}</span> of the industry
       &middot; <span class="v">${N(r.emp_2024_k * 1000)}</span> jobs, US 2024<br>
       <span class="v">${pct(r.pct_of_occupation)}</span> of this occupation, across all
       industries, works in plastics and rubber<br>projected ${r.change_pct_2024_34 >= 0 ? "+" : ""}${r.change_pct_2024_34}%
       in the industry by 2034`,
      `${r.bls_title}: ${pct(r.pct_of_industry)} of the industry; ${pct(r.pct_of_occupation)} of the occupation`);
  });
  document.getElementById("mixtitle").textContent =
    `${rows.length === 14 ? "Fourteen" : rows.length} occupations are ${Math.round(D.mix_totals.top_n_share_pct)}% of the industry, and most of them are on the floor`;
  document.getElementById("mixtable").innerHTML = tableView("mix",
    "The industry's largest occupations, US, 2024",
    ["Occupation", "Share of the industry", "Share of the occupation in this industry",
     "Jobs in the industry, 2024", "Projected change to 2034"],
    rows.map(r => [r.bls_title, pct(r.pct_of_industry), pct(r.pct_of_occupation),
      N(r.emp_2024_k * 1000), (r.change_pct_2024_34 >= 0 ? "+" : "") + r.change_pct_2024_34 + "%"]));
  document.getElementById("mixsrc").innerHTML =
    `Bureau of Labor Statistics Employment Projections, National Employment Matrix, industry
     326000 &rarr; occupation, 2024 base. One row is one detailed occupation employed in the
     industry, nationally. Darker bars are occupations where two-fifths or more of the
     national occupation works in this one industry. The ${rows.length} shown are
     <b>${D.mix_totals.top_n_share_pct}%</b> of the industry's ${N(D.mix_totals.industry_emp_2024_k * 1000)}
     jobs; production occupations of every kind are <b>${D.mix_totals.production_share_pct}%</b>;
     engineers, scientists and technicians together are <b>${pct(D.mix_totals.eng_sci_share_pct)}</b>.`;
  const R = D.region;
  document.getElementById("mixnote").innerHTML =
    `<b>One regional number, and what kind of number it is.</b> The <dfn>twelve counties PIC
     measures against &mdash; its federal-data footprint, from Ashtabula to Wayne &mdash;</dfn>
     reported <b>${N(R.emp)}</b> plastics-and-rubber jobs in ${R.year}. Applying the national
     shares to that total gives an <b>estimate of about ${N(R.setters_estimate)}</b>
     molding-machine setters and about <b>${N(R.eng_sci_estimate)}</b> engineers, scientists
     and technicians in the region's plants &mdash; an estimate under the assumption that the
     region's plants have the national staffing pattern, which a region with unusual research
     intensity may not. Nothing published counts occupations inside the industry by county;
     this is the closest a public source gets, and it is not a measurement.`;
}

/* ------------------------------------------------------------ 2. what it pays */
{
  const rows = D.pay;
  const {svg, W, m, w} = chart("pay", {W: 1100, rows: rows.length, rowH: 24,
    m: {t: 50, r: 70, b: 62, l: 290}});
  const vals = rows.flatMap(r => [r.national && r.national.median,
    ...AREAS.map(a => r.metros[a].absent ? null : r.metros[a].median)]).filter(v => v != null);
  /* Position, not length, encodes the wage — a dot plot — so the axis need not start at
     zero, and starting at $25,000 gives the spread between the metros the room the reading
     depends on. Every value on the page is above it; the source line says so. */
  const lo = 25000, hi = Math.max(...vals) * 1.04;
  const xs = v => m.l + ((v - lo) / (hi - lo)) * w;         // LINEAR
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * 24, xs, ys: () => 0,
    xt: [lo, ...ticks(lo, hi, 6).filter(v => v > lo + 5000)], yt: [], xfmt: v => "$" + Math.round(v / 1000) + "k",
    xlab: "Annual median wage, May 2024, all industries — axis begins at $25,000"});
  rows.forEach((r, i) => {
    const y = m.t + i * 24 + 12;
    const marks = ON_CHART.filter(a => !r.metros[a].absent).map(a => r.metros[a].median);
    const nat = r.national && r.national.median;
    const span = [...marks, nat].filter(v => v != null);
    if (span.length > 1) el("line", {x1: xs(Math.min(...span)), y1: y, x2: xs(Math.max(...span)), y2: y,
      stroke: "var(--pv-grid)", "stroke-width": 2}, svg);
    txt(svg, name(r), {x: m.l - 12, y: y + 4, "text-anchor": "end", class: "pv-lab"});
    ON_CHART.forEach(a => {
      const c = r.metros[a];
      if (c.absent) return;
      el("circle", {cx: xs(c.median), cy: y, r: 5, fill: COLOR[a], stroke: "var(--paper)",
        "stroke-width": 1.5}, svg);
    });
    if (nat != null) {
      const s = 6, cx = xs(nat);
      el("path", {d: `M${cx},${y - s}L${cx + s},${y}L${cx},${y + s}L${cx - s},${y}Z`,
        fill: "var(--paper)", stroke: INK, "stroke-width": 2}, svg);
    }
    const allAbsent = AREAS.every(a => r.metros[a].absent);
    if (allAbsent) txt(svg, "withheld in all four metros", {x: xs(nat) + 14, y: y + 4, class: "pv-labq"});
    const cells = AREAS.map(a => {
      const c = r.metros[a];
      return `${short(a)}: ${c.absent ? "<i>withheld</i>" : `<span class="v">${money(c.median)}</span> (${x(c.median_vs_us)}, RSE ${c.mean_rse}%)`}`;
    }).join("<br>");
    const p = r.projection;
    hoverable(el("rect", {x: 0, y: y - 12, width: W, height: 24, fill: "transparent"}, svg),
      `<b>${r.occupation}</b><br>US median <span class="v">${money(nat)}</span><br>${cells}
       ${p ? `<br>projected openings, NE Ohio 2022&ndash;32: <span class="v">${N(p.openings_annual)}</span> a year` : ""}`,
      `${r.occupation}: US median ${money(nat)}; ` + AREAS.map(a => `${short(a)} ${r.metros[a].absent ? "withheld" : money(r.metros[a].median)}`).join(", "));
  });
  document.getElementById("paylegend").innerHTML =
    `<span><i style="background:#fff;box-shadow:inset 0 0 0 2px ${INK};transform:rotate(45deg);width:11px;height:11px"></i> United States</span>` +
    ON_CHART.map(a => `<span><i style="background:${COLOR[a]};border-radius:50%"></i> ${M.metros[a].name}</span>`).join("") +
    `<span><i style="background:${GRAY};border-radius:50%;opacity:.35"></i> ${M.metros["49660"].name} &mdash; table and hover only</span>`;
  const T = D.pay_totals, RB = T.ratio_by_metro;
  document.getElementById("paytitle").textContent =
    "Against the same job nationally, the region's metros mostly pay less — and the gap is widest at the top";
  document.getElementById("paytable").innerHTML = tableView("pay",
    "Annual median wage by occupation and metro against the nation, May 2024",
    ["Occupation", "United States", ...AREAS.map(a => short(a)), "Highest metro RSE",
     "Projected openings a year, NE Ohio 2022–32"],
    rows.map(r => [r.occupation, money(r.national && r.national.median),
      ...AREAS.map(a => r.metros[a].absent ? "withheld" : `${money(r.metros[a].median)} (${x(r.metros[a].median_vs_us)})`),
      pct(Math.max(...AREAS.filter(a => !r.metros[a].absent).map(a => r.metros[a].mean_rse), 0)),
      r.projection ? N(r.projection.openings_annual) : "—"]));
  document.getElementById("paysrc").innerHTML =
    `Bureau of Labor Statistics Occupational Employment and Wage Statistics, May 2024, metropolitan
     and national files. One row is one occupation's annual median across every industry that
     employs it; the axis begins at $25,000 and every value here is above it, so a dot's
     position, not its distance from the edge, is the wage. The metros are shown side by side and <b>never summed</b>: Akron,
     Cleveland, Canton-Massillon and Youngstown-Warren neither nest inside nor tile the twelve
     counties. Youngstown-Warren publishes ${T.disclosed["49660"]} of the ${T.occupations}
     occupations, the fewest, and is in the table. <b>Cells the bureau withheld are absent, not
     zero</b>; tire builders &mdash; the industry's ninth-largest occupation &mdash; are published
     for none of the four metros. RSE is the relative standard error of the mean wage;
     ${T.high_rse_cells} of the metro cells here exceed ${T.high_rse_threshold_pct}%.
     Projected openings are the Ohio Department of Job and Family Services' 2022&ndash;2032
     long-term projection for the eighteen-county JobsOhio Northeast region, a superset of the
     footprint &mdash; a modelled path with no confidence band.`;
  const b = a => `${T.beats_national[a]} of ${T.disclosed[a]}`;
  document.getElementById("paynote").innerHTML =
    `<b>The reading.</b> Above the national median in <b>${b("10420")}</b> published occupations
     in Akron, <b>${b("17410")}</b> in Cleveland, <b>${b("15940")}</b> in Canton-Massillon and
     <b>${b("49660")}</b> in Youngstown-Warren. The shortfall is not even: in every metro the
     six degree occupations sit further under the national median than the fourteen
     high-school occupations. In Akron the median ratio is <b>${x(RB["10420"].degree_median_ratio)}</b>
     for the degree occupations against <b>${x(RB["10420"].hs_median_ratio)}</b> for the
     high-school ones; in Cleveland <b>${x(RB["17410"].degree_median_ratio)}</b> against
     <b>${x(RB["17410"].hs_median_ratio)}</b>. Two things this cannot say. It cannot say what a
     plastics plant pays &mdash; these are all-industry medians &mdash; and it cannot say what
     the dollars buy: a metro whose prices run under the national level narrows a nominal gap,
     and that adjustment is on the real-wage page, not here.`;
}

/* -------------------------------------------------------- 3. what schooling */
{
  const rows = D.education.filter(r => r.bins);
  const BINS = [["hs_or_less", "High school or less", SEQ[0]],
                ["some_college", "Some college or an associate degree", SEQ[2]],
                ["bachelors", "Bachelor's degree", SEQ[4]],
                ["graduate", "Graduate degree", SEQ[5]]];
  const {svg, W, m, w} = chart("edu", {W: 1100, rows: rows.length, rowH: 24,
    m: {t: 44, r: 150, b: 60, l: 290}});
  const xs = v => m.l + (v / 100) * w;
  frame(svg, {x: m.l, y: m.t, w, h: rows.length * 24, xs, ys: () => 0,
    xt: [0, 25, 50, 75, 100], yt: [], xfmt: v => v + "%",
    xlab: "Share of surveyed workers and experts reporting each level as required"});
  rows.forEach((r, i) => {
    const y = m.t + i * 24 + 4, bh = 16;
    let acc = 0;
    BINS.forEach(([k, , col]) => {
      const v = r.bins[k] || 0;
      if (v > 0) el("rect", {x: xs(acc), y, width: Math.max(0, xs(acc + v) - xs(acc)), height: bh,
        fill: col}, svg);
      acc += v;
    });
    txt(svg, name(r), {x: m.l - 12, y: y + bh - 3, "text-anchor": "end", class: "pv-lab"});
    txt(svg, r.job_zone ? `Zone ${r.job_zone <= 2 ? "1–2" : r.job_zone}` : "", {x: m.l + w + 12, y: y + bh - 3, class: "pv-labq"});
    const desc = (r.description || "").split(". ")[0];
    hoverable(el("rect", {x: 0, y: y - 4, width: W, height: bh + 8, fill: "transparent"}, svg),
      `<b>${r.onet_title}</b><br>${BINS.map(([k, l]) => `${l}: <span class="v">${pct(r.bins[k])}</span>`).join("<br>")}
       <br>most reported: ${r.modal.label.split(" - ")[0]} (${pct(r.modal.pct)})<br>${r.job_zone_name}
       ${desc ? `<br><i>${desc}.</i>` : ""}<br><span style="font-size:12px">${r.join}</span>`,
      `${r.onet_title}: ${BINS.map(([k, l]) => `${l} ${pct(r.bins[k])}`).join(", ")}; ${r.job_zone_name}`);
  });
  document.getElementById("edulegend").innerHTML =
    BINS.map(([, l, c]) => `<span><i style="background:${c}"></i> ${l}</span>`).join("");
  const ET = D.education_totals;
  document.getElementById("edutitle").textContent =
    `${Cap(WORDS[ET.ba_plus_majority.length] || String(ET.ba_plus_majority.length))} of these occupations are degree jobs; ${WORDS[ET.hs_majority.length] || ET.hs_majority.length} are high-school jobs; the rest sit between`;
  document.getElementById("edutable").innerHTML = tableView("edu",
    "Reported required level of education, by occupation",
    ["Occupation", "Job Zone", ...BINS.map(b => b[1]), "Most-reported level"],
    rows.map(r => [r.onet_title, r.job_zone <= 2 ? "1–2" : r.job_zone, ...BINS.map(([k]) => pct(r.bins[k])),
      r.modal.label.split(" - ")[0]]));
  document.getElementById("edusrc").innerHTML =
    `${D.onet_attribution} One row is one occupation's distribution of reported required
     education, twelve federal levels binned to four; the Job Zone is the database's rating of
     overall preparation, with the two lowest steps reported as one band. Where one federal
     occupation code holds several database occupations, the row is the equal-weight mean of
     them and the chart's hover names which. <b>${ET.ba_plus_majority.length}</b> of the
     ${ET.n} occupations have a bachelor's-or-higher majority; <b>${ET.hs_majority.length}</b>
     have a high-school-or-less majority. Neither figure is a hiring requirement, and none of it
     is regional.`;
}

/* ------------------------------------------------- 4. where degrees are conferred */
{
  const rows = D.programs;
  const {svg, W, m, w} = chart("prog", {W: 1100, rows: rows.length, rowH: 30,
    m: {t: 44, r: 90, b: 60, l: 420}});
  const maxV = Math.max(...rows.map(r => r.window_avg)) * 1.1;
  const xs = v => m.l + (v / maxV) * w;                     // LINEAR from zero
  const PT = D.program_totals, WIN = PT.window;
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
    const yrs = Object.entries(r.by_year).map(([y, v]) => `${y}: ${v}`).join(" · ");
    hoverable(el("rect", {x: 0, y: y - 6, width: W, height: bh + 12, fill: "transparent"}, svg),
      `<b>${r.institution}</b><br>${r.program} (CIP ${r.cip.slice(0, 2)}.${r.cip.slice(2)}), ${r.award}
       <br>${PT.latest_year}: <span class="v">${r.latest}</span> &middot; ${WIN[0]}–${WIN[WIN.length - 1]}
       average <span class="v">${r.window_avg}</span><br><span style="font-size:12px">${yrs}</span>`,
      `${r.institution}, ${r.program}, ${r.award}: ${r.window_avg} a year`);
  });
  document.getElementById("progtitle").textContent =
    `${PT.institutions.length === 3 ? "Three" : PT.institutions.length} universities confer the region's polymer and materials degrees`;
  document.getElementById("progtable").innerHTML = tableView("prog",
    `Polymer and materials degrees conferred, by program, ${PT.latest_year} and ${WIN[0]}–${WIN[WIN.length - 1]} average`,
    ["Institution", "Program", "Level", String(PT.latest_year), `${WIN[0]}–${WIN[WIN.length - 1]} average`],
    rows.map(r => [r.institution, `${r.program} (${r.cip.slice(0, 2)}.${r.cip.slice(2)})`, r.award, r.latest, r.window_avg]));
  document.getElementById("progsrc").innerHTML =
    `Integrated Postsecondary Education Data System completions by six-digit program code, via
     the Urban Institute's Education Data API; first major only. One row is one (institution,
     program, award level). Darker bars are the polymer programs (polymer engineering 14.3201,
     polymer chemistry 40.0507); lighter are the adjacent materials programs (materials
     engineering 14.1801, materials science 40.1001). Programs with no completions in the
     window are omitted. The latest year loaded is ${PT.latest_year}; the following year was
     not available from the API when this was built.`;
  document.getElementById("prognote").innerHTML =
    `<b>Degrees, not hires.</b> The polymer programs conferred <b>${PT.polymer_awards_latest}</b>
     degrees in ${PT.latest_year} against a three-year average of <b>${PT.polymer_awards_window_avg}</b>
     a year. That is the count of people finishing, not the count who stay in the region or
     take one of the six degree occupations above; degree production and hiring are measured
     on different pages. Only institutions with completions in these program codes appear,
     which is why the list has ${PT.institutions.length} names.`;
}

/* closer */
{
  const RB = D.pay_totals.ratio_by_metro, ET = D.education_totals, PT = D.program_totals;
  document.getElementById("closersub").innerHTML =
    `Nationally, production occupations are <b>${pct(D.mix_totals.production_share_pct)}</b> of the
     industry and engineers, scientists and technicians <b>${pct(D.mix_totals.eng_sci_share_pct)}</b>.
     Akron pays its high-school occupations at a median <b>${x(RB["10420"].hs_median_ratio)}</b>
     the national rate and its degree occupations at <b>${x(RB["10420"].degree_median_ratio)}</b>;
     Cleveland <b>${x(RB["17410"].hs_median_ratio)}</b> and <b>${x(RB["17410"].degree_median_ratio)}</b>.
     The ${WORDS[ET.ba_plus_majority.length] || ET.ba_plus_majority.length} degree occupations draw
     on about <b>${Math.round(PT.polymer_awards_window_avg)}</b> polymer degrees a year from
     ${WORDS[PT.institutions.length] || PT.institutions.length} universities.`;
}

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "occupations", meta: D.meta});
})();
