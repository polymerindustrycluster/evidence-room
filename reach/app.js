/* How far the region’s polymer research reaches, and which way the work flows.
 *
 * WHAT ONE ROW IS
 *   One partner institution: the number of 2015-2024 works matching "polymer" that carry
 *   both it and the University of Akron or Case Western Reserve. Works, not projects and
 *   not dollars — one long collaboration produces many rows and a single co-signed paper
 *   produces one.
 *
 * THE BENCHMARK
 *   For impact, the world: field-weighted citation impact is normalised by OpenAlex so 1.0
 *   is the average paper of that field and year. There is no benchmark for the map, and
 *   the page says so rather than implying the network is unusually large.
 *
 * WHAT IS UNCERTAIN, AND HOW IT SHOWS
 *   Affiliation strings are resolved to institutions by a parser that guesses. One guess
 *   was implausible enough to quarantine (see the source note), and the page reports what
 *   the quarantine moved. 627 works name no corresponding author at all and are counted
 *   in the total but assigned to neither direction.
 */
/* THE COLUMN, 1:1. LAYOUT-SPEC rule 2 — a 1100-unit viewBox scaled into a 728px column
   renders 12px type at 9px. Recipe: _data/LAYOUT-CONVERSION-RECIPE.md */
const COL = 728;

(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, chart, CAT, SEQ, GRAY, INK, N} = PV;
const D = await PV.data("reach.json");

/* THE COLD OPEN (guarded by tools/coldopen.mjs). One bar, split three ways: who led the
   region's 1,448 coauthored works. Poorer than everything below — no map, no countries,
   no partners. Its one job is the four-in-five. */
{
  const svg = document.getElementById("open");
  if (svg) {
    const W = Math.round(svg.getBoundingClientRect().width) || 720, H = 118;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const T = D.totals, lo = 10, hi = W - 10, y = 58;
    const parts = [["led from the region", T.led, "#B8D637"],
                   ["led by the partner", T.joined, "rgba(255,255,255,.42)"],
                   ["no corresponding author", T.no_corresponding, "rgba(255,255,255,.18)"]];
    let x = lo;
    const total = parts.reduce((s, p) => s + p[1], 0);
    for (const [name, n, col] of parts) {
      const w = (hi - lo) * n / total;
      PV.el("rect", {x: x.toFixed(1), y: y - 15, width: w.toFixed(1), height: 30,
        fill: col}, svg);
      x += w;
    }
    PV.txt(svg, "led from the region: " + N(T.led) + " of " + N(total) + " works",
      {x: lo, y: 26, "font-size": 13.5, fill: "#B8D637", "font-weight": 700});
    PV.txt(svg, "partner-led " + N(T.joined) + " · no corresponding author " + N(T.no_corresponding),
      {x: lo, y: H - 8, "font-size": 12.5, fill: "#C6E2E6"});
  }
}
const T = D.totals;
const pctf = v => (v * 100).toFixed(0) + "%";

PV.figures([
  ["key", N(T.works), "polymer papers", `${D.meta.home.length} universities, 2015–2024`],
  ["", N(T.partners_shown), "partner institutions", `across ${T.countries} countries`],
  ["", pctf(T.led_share), "led from here", "a corresponding author at Akron or Case Western"],
  ["", pctf(T.top10_share), "in their field’s top tenth", "field- and age-weighted citations"]
]);

/* --------------------------------------------------------------------- 1. the map */
{
  /* EQUIRECTANGULAR, deliberately. It is the projection that distorts area worst at the
     poles, and it is still the right one here: nothing is being compared BY AREA, the
     marks are points, and a reader locating Sichuan or Oak Ridge is helped by a grid they
     already know. A projection chosen for beauty would cost recognisability for nothing. */
  const W = COL, H = 382;
  const {svg, m, w, h} = chart("map", {W, H, m: {t: 12, r: 0, b: 52, l: 0}});
  // clip the empty Antarctic and high Arctic; no marks live there and they cost 20% of the frame
  const LAT0 = 78, LAT1 = -58;
  const px = lo => m.l + ((lo + 180) / 360) * w;
  const py = la => m.t + ((LAT0 - la) / (LAT0 - LAT1)) * h;

  /* A real clip path, because clipping the LATITUDE RANGE is not clipping the GEOMETRY:
     Antarctica and northern Greenland still draw their full polygons and spill past the
     frame. The land layer is grouped and clipped once. */
  const defs = el("defs", {}, svg);
  const cp = el("clipPath", {id: "map-clip"}, defs);
  el("rect", {x: m.l, y: m.t, width: w, height: h}, cp);
  const land = el("g", {"clip-path": "url(#map-clip)"}, svg);
  /* Clip the DATA, not just the view. A clipPath hides the overflow but the element still
     reports its full geometry, so a shape drawn past the frame is still a shape drawn past
     the frame — and collide.mjs is right to say so. Rings entirely outside the latitude
     window are dropped and the rest are clamped to it, so nothing is drawn that is not
     shown. Clamping flattens Antarctica against the bottom edge, which is exactly what
     clipping it looked like anyway. */
  const clamp = la => Math.max(LAT1, Math.min(LAT0, la));
  D.world.forEach(shape => shape.forEach(ring => {
    if (Math.max(...ring.map(c => c[1])) < LAT1) return;
    if (Math.min(...ring.map(c => c[1])) > LAT0) return;
    el("path", {d: "M" + ring.map(([lo, la]) =>
      `${px(lo).toFixed(1)},${py(clamp(la)).toFixed(1)}`).join("L") + "Z",
      fill: "#EAE6DE", stroke: "#DAD5CB", "stroke-width": 0.5}, land);
  }));

  const max = Math.max(...D.map.map(p => p.t));
  // AREA, not radius, encodes the count — a radius-scaled circle overstates a big value by
  // its square, which is the oldest mistake available on a bubble map.
  const r = t => 2.2 + Math.sqrt(t / max) * 15;
  const pts = D.map.slice().sort((a, b) => b.t - a.t);
  pts.forEach(p => {
    const led = p.l >= p.j;
    el("circle", {cx: px(p.lon), cy: py(p.lat), r: r(p.t),
      fill: led ? CAT[0] : CAT[1], "fill-opacity": 0.42,
      stroke: led ? CAT[0] : CAT[1], "stroke-width": 0.9}, svg);
  });
  /* LABEL BY SEPARATION, not by rank. The seven largest partners are all in Cleveland, so
     labelling the top seven stacked seven names on one dot and produced an unreadable
     smear. Worse, the first version marked them `data-pv-plated`, which is the attribute
     collide.mjs skips — it would have exempted the labels from the very check that exists
     to catch this. Walk the partners largest-first and take one only if it clears every
     label already placed; the hover and the ranked chart below carry the rest. */
  const placed = [];
  pts.forEach(p => {
    if (placed.length >= 3) return;
    const x = px(p.lon), y = py(p.lat);
    if (placed.some(q => Math.abs(q.x - x) < 260 && Math.abs(q.y - y) < 34)) return;
    placed.push({x, y, p});
  });
  /* Cut at a WORD boundary. Slicing at a fixed character count produced "Chinese Academy
     of Scien" and "South China University o", which read as rendering faults rather than
     as abbreviations. */
  const short = n => {
    n = n.replace(/^University of /, "U. ").replace(/ University$/, " U.")
         .replace(/\bUniversity\b/, "U.").replace(/\bNational Laboratory\b/, "Nat. Lab")
         .replace(/\bInstitute\b/, "Inst.").replace(/\bAcademy of Sciences\b/, "Acad. of Sciences");
    if (n.length <= 28) return n;
    const cut = n.slice(0, 28);
    const sp = cut.lastIndexOf(" ");
    return (sp > 12 ? cut.slice(0, sp) : cut) + "…";
  };
  placed.forEach(({x, y, p}) => {
    const right = p.lon <= 40;
    txt(svg, short(p.n),
      {x: x + (right ? r(p.t) + 6 : -r(p.t) - 6), y: y + 4,
       "text-anchor": right ? "start" : "end", class: "pv-labq"});
  });
  pts.forEach(p => hoverable(el("circle", {cx: px(p.lon), cy: py(p.lat),
    r: Math.max(r(p.t), 7), fill: "transparent"}, svg),
    `<b>${p.n}</b>${p.c ? " · " + p.c : ""}<br><span class="v">${p.t}</span> shared papers<br>
     led from here <span class="v">${p.l}</span> · led from there <span class="v">${p.j}</span>`,
    `${p.n}: ${p.t} papers`));

  txt(svg, `${N(D.map.length)} institutions with two or more shared papers`,
    {x: m.l, y: m.t + h + 34, class: "pv-axlab"});

  document.getElementById("maptable").innerHTML = tableView("mp",
    "The forty largest partner institutions",
    ["Institution", "Country", "City", "Led from here", "Led from there", "Total"],
    D.top.map(p => [p.name, p.country || "—", p.city || "—", p.led, p.joined,
      p.total]));
  /* ALL of them, and the count is computed. This read `D.quarantined[0]` beside the
     hardcoded words "One institution", so three of the four exclusions never reached a
     reader — including the only one in China, on a page that publishes a country
     breakdown. The policy here is that excluded work is reported, not dropped, and a
     literal "One" is how that policy was passing while being broken. */
  const Q = D.quarantined || [];
  const qWorks = Q.reduce((s, x) => s + (x.total || 0), 0);
  const qCN = Q.filter(x => x.country === "CN");
  document.getElementById("mapsrc").innerHTML =
    `${D.meta.source} ${D.meta.row} <b>${D.meta.polymer_bound}</b>
     ${D.meta.why_corresponding} <b>The map has no benchmark and does not claim the network
     is unusually large</b>: no comparable region was measured the same way, so read
     it as a description of where the work goes, not as a ranking.
     ${Q.length ? `<b>${Q.length === 1 ? "One institution is" : N(Q.length) + " institutions are"} quarantined</b>, holding ${N(qWorks)} works between them:
     ${Q.map(x => `${x.name} (${x.country}, ${x.total})`).join("; ")}. Every one is a
     library, an archive or a school credited with CORRESPONDING authorship on polymer
     chemistry, which is the signature of an affiliation parser matching the wrong string
     rather than of a real partner. Not one is confirmed against the raw affiliation
     strings, and every one is reversible.${qCN.length ? ` ${qCN.length === 1
       ? `One of them, ${qCN[0].name}, is` : `${N(qCN.length)} of them are`} in China.
     That is named rather than left implicit because this page publishes a country
     breakdown, and a spurious CN row is the first thing a hostile reader would find.` : ""}
     They are excluded from the map and the table and reported here rather than silently
     dropped.` : ""}
     ${N(T.no_corresponding)} of the ${N(T.works)} papers name no corresponding author at
     all; they are in the total and in neither direction.`;
}

/* ------------------------------------------------------------ 2. which direction */
{
  const R = D.top.slice(0, 14);
  const {svg, m, w} = chart("dir", {W: COL, rows: R.length, rowH: 26,
    m: {t: 40, r: 8, b: 54, l: 282}});
  /* l was 244; 'South China University of Technology' ran 26px past the left edge at
     phone text sizes. Same fast-CI ship-route as the rest. 2026-09-01. */
  const max = Math.max(...R.map(p => p.total)) * 1.06;
  const xs = v => m.l + (v / max) * w;
  frame(svg, {x: m.l, y: m.t, w, h: R.length * 26, xs, ys: () => 0,
    xt: ticks(0, max, 5), xlab: "Shared papers", ylab: "Institution"});
  R.forEach((p, i) => {
    const y = m.t + i * 26 + 4;
    txt(svg, p.name.length > 34 ? p.name.slice(0, 33) + "…" : p.name,
      {x: m.l - 12, y: y + 15, "text-anchor": "end", class: "pv-lab"});
    el("rect", {x: m.l, y, width: Math.max(1, xs(p.led) - m.l), height: 20,
      fill: CAT[0]}, svg);
    el("rect", {x: xs(p.led), y, width: Math.max(1, xs(p.total) - xs(p.led)), height: 20,
      fill: CAT[1]}, svg);
    txt(svg, p.total, {x: xs(p.total) + 8, y: y + 15, class: "pv-lab"});
    hoverable(el("rect", {x: m.l, y, width: w, height: 20, fill: "transparent"}, svg),
      `<b>${p.name}</b>${p.country ? " · " + p.country : ""}<br>
       corresponding author here <span class="v">${p.led}</span><br>
       corresponding author there <span class="v">${p.joined}</span>`,
      `${p.name}: ${p.led} led here, ${p.joined} led there`);
  });
  document.getElementById("dirtable").innerHTML = tableView("dr",
    "Direction of collaboration, largest partners",
    ["Institution", "Led from here", "Led from there", "Share led here"],
    R.map(p => [p.name, p.led, p.joined,
      pctf(p.led / (p.led + p.joined))]));
  /* NAMED FROM THE CHART, NOT TYPED. An earlier version of this paragraph said the region
     "joins more than it leads with Michigan and Harvard". Neither institution appears in
     these fourteen bars, in the forty-row table behind them, or anywhere in the data. It
     also listed Brookhaven and Argonne among "the bars" when neither is drawn here. A
     sentence about a chart is now built from the chart, so it cannot describe a chart that
     is not there. */
  const namelist = a => !a.length ? "none of them"
    : a.length === 1 ? a[0]
    : a.slice(0, -1).join(", ") + " and " + a.at(-1);
  const nm = p => p.name.replace(/ \(United States\)$/, "");
  const leads = R.filter(p => p.led > p.joined);
  const joins = R.filter(p => p.joined > p.led);
  const level = R.filter(p => p.joined === p.led);

  document.getElementById("dirsrc").innerHTML =
    `${D.meta.led_joined} Across all attributable papers the region corresponded on
     <b>${N(T.led)} of ${N(T.attributable)}</b>, or ${pctf(T.led_share)}.
     <b>A high led-share is not automatically the better result.</b> It says the region
     originates work; a region that never joins other people’s projects is also a region
     nobody is inviting. The two counts are shown side by side and never differenced,
     because “net leadership” is not a quantity. <b>The pattern in the bars is worth
     naming:</b> of these ${R.length} partners the region corresponds on most of the work
     with ${leads.length} of them, including ${namelist(leads.slice(0, 3).map(nm))}; it is
     level with ${namelist(level.map(nm))}; and it joins more often than it leads with
     ${namelist(joins.map(nm))}. <b>Read that last group carefully rather than as a
     weakness</b>: on this evidence the region is originating nearly everywhere it
     appears, which is the profile of a place that runs its own program and is invited
     into very few of anyone else’s.`;
}

/* ------------------------------------------------------------------- 3. impact */
{
  /* A DISTRIBUTION, not an average. The mean FWCI here is 2.44 and the median is 1.15 —
     a long right tail pulls the mean to more than double the typical paper, so quoting the
     mean would describe a handful of papers and imply it described all of them. */
  const dec = D.fwci_deciles;
  const LAB = ["10th", "25th", "median", "75th", "90th"];
  const {svg, m, w, h} = chart("impact", {W: COL, H: 252, m: {t: 40, r: 8, b: 58, l: 44}});
  const max = Math.max(...dec) * 1.15;
  const bw = w / dec.length;
  const ys = v => m.t + h - (v / max) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs: i => m.l + (i + 0.5) * bw, ys,
    yt: ticks(0, max, 5), yfmt: v => v.toFixed(1) + "×",
    xt: dec.map((_, i) => i), xfmt: i => LAB[i],
    xlab: "Where a paper sits in the region’s own distribution",
    ylab: "Citations against the world average for its field and year"});
  /* The world average is the whole point of a normalised measure, so it is drawn. */
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1),
    stroke: "var(--pv-axis)", "stroke-width": 1.5}, svg);
  txt(svg, "1.0×, the world average", {x: m.l + 8, y: ys(1) - 8,
    class: "pv-labq"});
  dec.forEach((v, i) => {
    const x = m.l + i * bw + bw * 0.18;
    el("rect", {x, y: ys(v), width: bw * 0.64, height: m.t + h - ys(v),
      fill: v >= 1 ? SEQ[4] : GRAY}, svg);
    txt(svg, v.toFixed(2) + "×", {x: x + bw * 0.32, y: ys(v) - 8,
      "text-anchor": "middle", class: "pv-lab"});
  });
  document.getElementById("impacttable").innerHTML = tableView("im",
    "Field-weighted citation impact",
    ["Point in the distribution", "Citations against world average"],
    dec.map((v, i) => [LAB[i], v.toFixed(2) + "×"]));
  document.getElementById("impactsrc").innerHTML =
    `${D.meta.source} <b>${D.meta.no_raw_trends}</b> ${D.meta.impact_is_separate}
     The median paper sits at <b>${T.fwci_median.toFixed(2)}×</b> the world average and
     <b>${pctf(T.top10_share)} of ${N(T.pct_n)} papers land in the top tenth of their
     field</b>, against the ten percent you would expect by definition;
     ${(T.top1_share * 100).toFixed(1)} percent reach the top hundredth.
     <b>The mean is ${T.fwci_mean}× and is not the number to quote</b>: a long
     right tail pulls it to more than double the typical paper. A tenth of the papers have
     never been cited at all, which is the ${dec[0].toFixed(1)}× bar.`;
}

document.getElementById("closersub").innerHTML =
  `<b>${N(T.works)} papers, ${N(T.partners_shown)} institutions, ${T.countries} countries,
   and ${pctf(T.top10_share)} of the work in the top tenth of its field.</b> The reason to
   measure this is not the size of the number. It is that PIC’s case for the cluster rests
   on assets that can be named, and until now the research network was described in
   adjectives. <b>What the page does not say:</b> it has no peer benchmark, so it cannot
   tell you whether ${N(T.partners_shown)} partners is many for a region this size. It counts
   papers, which are not products, patents or hires. <b>And ${pctf(T.us_share)} of the
   collaboration is domestic while ${pctf((D.countries.find(c => c.code === "CN") || {share: 0}).share)}
   is with institutions in China</b>, reported as measured. A looser earlier version of
   this page, bounded by the word “polymer” rather than the subject classification, put the
   domestic share at half and made the international picture look like a footnote. That was
   the bound, not the field.`;

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "reach", meta: D.meta});
})();
