/* Do the region’s two research universities work together?
 *
 * WHAT ONE ROW IS
 *   Coauthorship: one WORK in a public index whose author affiliations include both
 *   universities. Not one collaboration and not one person — a single long-running lab
 *   partnership can produce many rows, and a co-signed paper is not evidence of a
 *   sustained relationship.
 *   Awards: one federal award, or one Collaborative Research project split across two.
 *
 * THE BENCHMARK
 *   Each university’s OWN output, same source, same years. A joint count falling while both
 *   partners' own output holds is a different fact from a joint count falling because one
 *   partner shrank, and only the control separates them.
 *
 * WHAT IS UNCERTAIN, AND HOW IT SHOWS
 *   These instruments can demonstrate collaboration; they cannot demonstrate its absence.
 *   Affiliation data is incomplete, the NSF co-PI field lists signatories rather than a
 *   coalition, and neither source sees industry work, consortium membership or a meeting.
 *   The page says this in the standfirst, not only in the methodology box, because the
 *   temptation to read a low bar as a zero is the whole reason this page exists.
 */
/* THE COLUMN, 1:1. LAYOUT-SPEC rule 2 — a 1100-unit viewBox scaled into a 728px column
   renders 12px type at 9px. Recipe: _data/LAYOUT-CONVERSION-RECIPE.md */
const COL = 728;

(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, chart, CAT, SEQ, GRAY, INK, N} = PV;
const D = await PV.data("collaboration.json");

/* THE SHAPE, DERIVED FROM THE SERIES INSTEAD OF COUNTED ONCE BY HAND. The standfirst, the
   cold open, the closer and a claim all describe one movement, and until 2026-08-31 three
   of them said "the last three years fall" with the three hard-set. The pull that day
   added 2025, which rose off the floor, and one sentence went false in three places at
   once. What the page says about the run is now computed: the lowest year, the number of
   consecutive falls into it, and whatever the series has done since. */
const TROUGH_I = D.series.reduce((a, r, i) => (r.joint < D.series[a].joint ? i : a), 0);
let FALL_FROM = TROUGH_I;
while (FALL_FROM > 0 && D.series[FALL_FROM - 1].joint > D.series[FALL_FROM].joint) FALL_FROM--;
const FALLS = TROUGH_I - FALL_FROM;            // consecutive falling years into the trough
const TROUGH = D.series[TROUGH_I];
const AFTER = D.series.slice(TROUGH_I + 1);    // years the series has run since the trough
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen", "twenty"];
const word = n => WORDS[n] || String(n);

/* THE COLD OPEN (guarded by tools/coldopen.mjs). One column per year of joint output, no
   numbers but the endpoints. Poorer than the record chart below on purpose. The amber
   columns are the run of consecutive falls into the lowest year, taken from the data
   rather than fixed at three. */
{
  const svg = document.getElementById("open");
  if (svg) {
    const W = Math.round(svg.getBoundingClientRect().width) || 720, H = 128;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const S = D.series, max = Math.max(...S.map(r => r.joint));
    const lo = 10, hi = W - 10, base = H - 26, top = 24;
    const bw = (hi - lo) / S.length;
    S.forEach((r, i) => {
      const h = (base - top) * r.joint / max;
      PV.el("rect", {x: (lo + i * bw + 2).toFixed(1), y: (base - h).toFixed(1),
        width: (bw - 4).toFixed(1), height: h.toFixed(1),
        fill: i > FALL_FROM && i <= TROUGH_I ? "#FFD09A" : "rgba(255,255,255,.42)"}, svg);
    });
    PV.txt(svg, String(S[0].year), {x: lo + bw / 2, y: H - 8, "text-anchor": "middle",
      "font-size": 12.5, fill: "#C6E2E6"});
    PV.txt(svg, String(S[S.length - 1].year), {x: lo + (S.length - .5) * bw, y: H - 8,
      "text-anchor": "middle", "font-size": 12.5, fill: "#C6E2E6"});
    PV.txt(svg, AFTER.length
      ? `coauthored works per year · ${word(FALLS)} falls, then ${AFTER.at(-1).joint}`
      : `coauthored works per year · the last ${word(FALLS)} fall`, {x: lo, y: 16,
      "font-size": 12.5, fill: "#C6E2E6"});
  }
}
const S = D.series, T = D.totals;
const usd = n => "$" + Math.round(n).toLocaleString("en-US");
const pk = S.find(r => r.year === T.peak_year), last = S.at(-1);
/* The years that carry a joint paper in either subject, and the run of empty years before
   the most recent one. The page used to print "the last joint paper in either subject was
   2020", which was a four-year silence stated as a date; the 2025 pull put one polymer
   paper on the board and turned that sentence into its own opposite. The silence is what
   the sentence was about, so the silence is what it now measures. */
const SUBJ_YEARS = S.filter(r => r.polymer + r.bio).map(r => r.year);
const SUBJ_GAP = SUBJ_YEARS.length > 1 ? SUBJ_YEARS.at(-1) - SUBJ_YEARS.at(-2) - 1 : 0;

PV.figures([
  ["key", N(T.coauthored), "coauthored papers", `since ${S[0].year}, both universities named`],
  /* The bound here is OpenAlex subfield 2507, a classification — see meta.polymer_bound. An
     earlier version of this card said "a keyword in the text, not a subject code", which was
     the exact inverse of the method, and sat directly under a standfirst saying so. */
  ["", N(T.coauthored_polymer), "classified in polymers", "subfield 2507, not a keyword match"],
  ["", String(T.joint_awards), "joint federal awards", usd(T.joint_award_dollars) + " combined"],
  /* Bounded to the window on purpose: the award data ends with the window and cannot speak
     to what started after it. CWRU leads the NEO-SMART NSF Engine, awarded 2026-07-14, and Akron
       is among its core partners — outside this
     series, and BOTH facts are named in the prose. The page used to raise the award twice and
       answer only who led it, which left the one question a reader actually has — are these
       two in it together? — hanging over a page about whether these two work together.
       Disclosing a gap is not the same as closing it. */
  ["", String(T.newest_joint_award_year), "newest joint award", `none since, through ${S.at(-1).year}`]
]);

/* ------------------------------------------------------------- 1. the record */
{
  /* BARS, not a line. These are counts of discrete things in a year, small enough that the
     eye should read each year as a quantity rather than as a point on a trajectory — and a
     line through counts this small implies an interpolation between years that does not
     exist. The polymer subset sits INSIDE the bar because it is a part of it, never beside. */
  const {svg, m, w, h} = chart("joint", {W: COL, H: 262, m: {t: 40, r: 8, b: 60, l: 34}});
  const max = Math.max(...S.map(r => r.joint)) * 1.14;
  const xs = i => m.l + (i + 0.5) * (w / S.length);
  const ys = v => m.t + h - (v / max) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs: i => xs(i), ys, yt: ticks(0, max, 5),
    xt: S.map((_, i) => i).filter(i => i % 2 === 0),
    xfmt: i => S[i].year, xlab: "Year", ylab: "Works listing both universities"});
  const bw = Math.min(46, (w / S.length) * 0.68);
  S.forEach((r, i) => {
    const x = xs(i) - bw / 2;
    el("rect", {x, y: ys(r.joint), width: bw, height: m.t + h - ys(r.joint),
      fill: CAT[0]}, svg);
    /* TICKS, not a nested bar. There are eight polymer-classified papers in fourteen years,
       so a proportional sub-bar renders as a one-pixel sliver and reads as zero. One tick per
       paper makes eight papers look like eight papers, which is the honest size. */
    for (let k = 0; k < r.polymer; k++)
      el("rect", {x: x + 2, y: m.t + h - 5 - k * 7, width: bw - 4, height: 4,
        fill: CAT[1]}, svg);
    for (let k = 0; k < r.bio; k++)
      el("rect", {x: x + 2, y: m.t + h - 5 - (r.polymer + k) * 7, width: bw - 4, height: 4,
        fill: SEQ[2]}, svg);
    if (r.year === T.peak_year || r.year === last.year)
      txt(svg, r.joint, {x: xs(i), y: ys(r.joint) - 8, "text-anchor": "middle",
        class: "pv-lab", fill: CAT[0]});
    hoverable(el("rect", {x: xs(i) - w / S.length / 2, y: m.t, width: w / S.length,
      height: h, fill: "transparent"}, svg),
      `<b>${r.year}</b><br><span class="v">${r.joint}</span> coauthored works<br>
       <span class="v">${r.polymer}</span> classified in polymers and plastics,
       <span class="v">${r.bio}</span> in biomaterials<br>
       Akron published <span class="v">${N(r.akron)}</span> that year, Case Western
       <span class="v">${N(r.cwru)}</span>`,
      `${r.year}: ${r.joint} coauthored, ${r.polymer} polymer, ${r.bio} biomaterials`);
  });
  document.getElementById("jointtable").innerHTML = tableView("j",
    "Coauthored works per year",
    ["Year", "Both universities", "Polymers & plastics", "Biomaterials", "Akron total",
     "Case Western total"],
    S.map(r => [r.year, r.joint, r.polymer, r.bio, N(r.akron), N(r.cwru)]));
  document.getElementById("jointsrc").innerHTML =
    `${D.meta.sources} ${D.meta.row} <b>${D.meta.polymer_bound}</b>
     <b>This is the number that changed most when the bound did.</b> Matching the word
     “polymer” in the text returned 24 of these papers; the subject classification returns
     <b>${T.polymer_total}</b>, with ${T.bio_total} more in biomaterials,
     ${T.subject_total} of ${T.coauthored} works, about
     ${Math.round(T.subject_total / T.coauthored * 100)} percent. <b>The ${word(SUBJ_GAP)} years
     from ${SUBJ_YEARS.at(-2) + 1} to ${T.last_subject_year - 1} carry no joint paper in
     either subject, and ${T.last_subject_year} carries one.</b> A coauthored paper is evidence that two
     people worked together, not that two institutions have a relationship;
     ${T.coauthored} works over ${S.length} years is roughly
     ${(T.coauthored / S.length).toFixed(0)} a year between universities that publish
     ${N(S.at(-1).akron + S.at(-1).cwru)} a year between them.`;
}

/* ------------------------------------------------------------ 2. the control */
{
  /* TWO STACKED PANELS sharing one year axis. The first draft drew the rate band below the
     plot frame using the chart’s bottom margin, which put its label on top of the x-axis
     ticks and its numbers outside the box entirely. Two quantities on two scales get two
     panels — the same rule that governs the talent page, applied here rather than
     rediscovered. */
  const P1 = 132, GAP = 68, P2 = 58;
  const {svg, m, w} = chart("control", {W: COL, H: 46 + P1 + GAP + P2 + 58,
    m: {t: 46, r: 92, b: 58, l: 54}});
  /* l was 46 and the y-axis's own "6,000" (end-anchored at l-10) ran 4px past the left
     edge at every width below 760 — shipped in the promotion because CI runs the fast
     suite, which skips the width sweeps. Found by the full sweep, 2026-09-01. */
  const top2 = m.t + P1 + GAP;
  const maxOwn = Math.max(...S.map(r => Math.max(r.akron, r.cwru))) * 1.1;
  /* 1.18 put the top tick's label in the same box as the panel label one line above it
     at phone text sizes; 1.5 drops the top tick a third of the panel down. 2026-09-01. */
  const maxRate = Math.max(...S.map(r => r.per_1k_akron)) * 1.5;
  const xs = y => m.l + ((y - S[0].year) / (last.year - S[0].year)) * w;
  const yo = v => m.t + P1 - (v / maxOwn) * P1;
  const yr = v => top2 + P2 - (v / maxRate) * P2;
  const XT = S.map(r => r.year).filter((_, i) => i % 2 === 0);

  frame(svg, {x: m.l, y: m.t, w, h: P1, xs, ys: yo, yt: ticks(0, maxOwn, 4), yfmt: N,
    xt: XT, ylab: "Each university’s own works per year"});
  const line = (key, dash) =>
    el("path", {d: "M" + S.map(r => `${xs(r.year)},${yo(r[key])}`).join("L"), fill: "none",
      stroke: GRAY, "stroke-width": 1.5, ...(dash ? {"stroke-dasharray": dash} : {})}, svg);
  line("cwru");
  line("akron", "5 4");
  /* End labels anchor INSIDE the frame: drawn 8px right of the last point they ran 5px
     past the column at the widest breakpoint. Right-anchored at the endpoint, lifted off
     the stroke. */
  txt(svg, `Case Western ${N(last.cwru)}`, {x: xs(last.year), y: yo(last.cwru) - 8,
    "text-anchor": "end", class: "pv-labq"});
  txt(svg, `Akron ${N(last.akron)}`, {x: xs(last.year), y: yo(last.akron) + 16,
    "text-anchor": "end", class: "pv-labq"});

  frame(svg, {x: m.l, y: top2, w, h: P2, xs, ys: yr, yt: ticks(0, maxRate, 3),
    xt: XT, xlab: "Year", ylab: "Joint works per 1,000 of Akron’s own output"});
  S.forEach(r => {
    el("rect", {x: xs(r.year) - 9, y: yr(r.per_1k_akron), width: 18,
      height: Math.max(1, top2 + P2 - yr(r.per_1k_akron)), fill: CAT[0]}, svg);
    hoverable(el("rect", {x: xs(r.year) - 13, y: m.t, width: 26,
      height: top2 + P2 - m.t, fill: "transparent"}, svg),
      `<b>${r.year}</b><br><span class="v">${r.joint}</span> joint works<br>
       <span class="v">${r.per_1k_akron}</span> per 1,000 of Akron’s ${N(r.akron)}<br>
       Case Western published <span class="v">${N(r.cwru)}</span>`,
      `${r.year}: ${r.per_1k_akron} per 1,000`);
  });
  [pk, last].forEach(r => txt(svg, r.per_1k_akron.toFixed(1),
    {x: xs(r.year), y: yr(r.per_1k_akron) - 8, "text-anchor": "middle", class: "pv-lab",
     fill: CAT[0]}));

  document.getElementById("controltable").innerHTML = tableView("c",
    "Own output and the controlled rate",
    ["Year", "Akron works", "Case Western works", "Joint", "Joint per 1,000 of Akron"],
    S.map(r => [r.year, N(r.akron), N(r.cwru), r.joint, r.per_1k_akron]));
  document.getElementById("controlsrc").innerHTML =
    `${D.meta.control} <b>Indexing lag is excluded</b> because Case Western’s own output is
     ${N(pk.cwru)} in ${T.peak_year} and ${N(last.cwru)} in ${last.year}: the index is
     not simply missing recent years. <b>Akron shrinking is not the whole story either:</b>
     Akron’s own output fell from ${N(pk.akron)} to ${N(last.akron)}, about
     ${Math.round((1 - last.akron / pk.akron) * 100)} percent, while joint work per thousand
     of that output fell from ${pk.per_1k_akron} to ${last.per_1k_akron}, about
     ${Math.round((1 - last.per_1k_akron / pk.per_1k_akron) * 100)} percent. The two
     quantities are drawn in separate panels rather than on two y-scales, because where
     lines on different scales cross means nothing. <b>The final year is the least certain
     point on any of these series</b> and should not be read on its own.`;
}

/* ------------------------------------------------------------- 3. the awards */
{
  const A = D.joint_awards;
  const {svg, m, w} = chart("awards", {W: COL, rows: A.length, rowH: 48,
    m: {t: 40, r: 24, b: 54, l: 52}});
  /* l was 48: the end-anchored start-year labels at l-12 ran 1.4px past the left edge
     below 760px. Same ship-route as the control chart's clip: CI's fast suite skips
     the width sweeps. 2026-09-01. */
  const max = Math.max(...A.map(r => r.amount)) * 1.06;
  const xs = v => m.l + (v / max) * w;
  frame(svg, {x: m.l, y: m.t, w, h: A.length * 48, xs, ys: () => 0,
    xt: ticks(0, max, 5), xfmt: v => "$" + Math.round(v / 1e6 * 10) / 10 + "M",
    xlab: "Award value", ylab: "Start"});
  A.forEach((r, i) => {
    const y = m.t + i * 48 + 6;
    txt(svg, (r.start || "").slice(-4), {x: m.l - 12, y: y + 20, "text-anchor": "end",
      class: "pv-lab"});
    el("rect", {x: m.l, y, width: Math.max(3, xs(r.amount) - m.l), height: 22,
      fill: SEQ[4]}, svg);
    txt(svg, usd(r.amount), {x: xs(r.amount) + 8, y: y + 16, class: "pv-lab"});
    const t = r.title.replace(/\s+/g, " ").replace(/^Collaborative Research:\s*/i, "");
    txt(svg, t.length > 74 ? t.slice(0, 73) + "…" : t,
      {x: m.l + 2, y: y + 38, class: "pv-labq"});
    hoverable(el("rect", {x: m.l, y: y - 6, width: w, height: 44, fill: "transparent"}, svg),
      `<b>${r.title}</b><br>started ${r.start}<br><span class="v">${usd(r.amount)}</span><br>
       award ${r.id}<br><em>${r.via}</em>`,
      `${(r.start || "").slice(-4)}: ${usd(r.amount)}, ${t}`);
  });
  document.getElementById("awardstable").innerHTML = tableView("a",
    "Joint federal awards",
    ["Start", "Award ID", "Title", "Amount", "How it was found"],
    A.map(r => [r.start, r.id, r.title, usd(r.amount), r.via]));
  document.getElementById("awardssrc").innerHTML =
    `National Science Foundation awards API, every award to either university since
     ${S[0].year}: ${N(T.nsf_akron)} to Akron and ${N(T.nsf_cwru)} to Case Western.
     <b>A shared title is not a shared project</b>: both universities hold awards
     literally titled “Graduate Research Fellowship Program”, an institutional block grant
     every university receives separately, and matching on title alone booked it as a
     $1.1 million joint project across five award IDs. Only awards NSF itself labels
     “Collaborative Research” are counted. <b>This measure sees federal research grants and
     nothing else:</b> no industry contract, no state award, no subaward, and no unfunded
     collaboration.`;
}

document.getElementById("closersub").innerHTML =
  `<b>The claim this page replaces was that nothing suggested the two had ever been in a
   room together.</b> That was false, and it was checkable in an afternoon: ${T.coauthored}
   coauthored papers, ${T.joint_awards} joint federal awards, ${usd(T.joint_award_dollars)}.
   Publishing it would have told two anchor institutions that PIC had not looked.
   <b>What the measurement found instead is harder to dismiss and more useful.</b> The
   collaboration is real and substantial, and it is almost never about polymers.
   <b>Of ${T.coauthored} joint papers, ${T.polymer_total} are classified in polymers and
   plastics and ${T.bio_total} in biomaterials, ${T.subject_total} in all, and
   ${word(SUBJ_GAP)} of the last ${word(SUBJ_GAP + 1)} years carry neither.</b> Two
   universities anchoring a polymer cluster have published
   together ${T.coauthored} times in ${word(S.length)} years and ${Math.round((1 - T.subject_total / T.coauthored) * 100)}
   percent of it was something else. <b>The joint work thinned too, and it thinned
   recently.</b> The controlled rate fell in ${word(FALLS)} straight years, from
   ${S[FALL_FROM].per_1k_akron} joint works per thousand of Akron’s output in
   ${S[FALL_FROM].year} to ${TROUGH.per_1k_akron} in ${TROUGH.year}, and came back to
   ${last.per_1k_akron} in ${last.year} on ${last.joint} papers. One year up from a floor of
   ${TROUGH.joint} is the shape a run of counts this small makes on its own, so the rise is
   recorded here and is not read as a recovery: the rate is still
   ${Math.round((1 - last.per_1k_akron / pk.per_1k_akron) * 100)} percent below the
   ${T.peak_year} peak. No new joint federal award has started since
   ${T.newest_joint_award_year}. <b>That is a live question PIC is positioned to
   ask</b>, and it is a different conversation from the one an unbounded negative would have
   started. <b>The limit stays in force:</b> ${D.meta.what_a_null_would_mean}`;

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "collaboration", meta: D.meta});
})();
