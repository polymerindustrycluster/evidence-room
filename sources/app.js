/* How To Rebuild This — the public replication guide.
 *
 * NOTHING IN THE REGISTER IS TYPED HERE. Every source entry, every filter line, every
 * dependency and every count on this page is read from data/registry.json, which
 * _data/build/derive_sources.py generates from _data/SOURCES.json and _data/catalog.json.
 * That is not a preference. Fourteen sources, sixty filter lines and sixteen pages of
 * dependency is exactly the table a person retypes once and never updates, and every
 * hand-typed inventory on this site has gone stale inside a week. The registry is already
 * policed by verify_consistency.py, so a page generated from it stays true by
 * construction and a typed one would not.
 *
 * WHAT IS HAND-AUTHORED, deliberately: the procedure in index.html, the classification
 * argument, and the code strings printed inside the recipe. Those are editorial text.
 * Each printed code is pinned by a claim asserting it still appears in the registry's own
 * filter values, so the teaching cannot drift from the pull it describes.
 *
 * EVERY CHART IS DRAWN INTO A VIEWBOX MEASURED FROM ITS OWN CONTAINER, so the render
 * scale is exactly 1 and a 14-unit label is 14 real pixels at every width. The house
 * default is a fixed-unit viewBox that pans sideways below 1100px; that hides the
 * evidence on a phone, and on a page whose whole subject is legibility it would be an
 * odd thing to ship. The cost is that every chart re-lays out rather than scaling, which
 * is why each one below has a stacked variant and a redraw on resize.
 */
(async () => {
"use strict";
const {el, txt, tableView, chart, figures, N, GRAY, INK} = PV;

const D = await PV.data("registry.json");
const T = D.totals, DC = D.doublecount, C = D.classification;

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen", "twenty"];
const word = n => WORDS[n] || String(n);
const Word = n => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };

/* Ink. One accent, one job, for the whole page: teal is a thing you can fetch, orange is
   a thing you cannot, and gray is context. The double-count chart borrows the orange for
   the duplicated jobs, which is the same meaning one level down: ink you should not have
   counted. Lime is never used to encode anything here. */
const TEAL = INK, LIGHT = "#6BB8C4", PALE = "#CFE8EC", WARN = "#C85F0C";

/* ------------------------------------------------------------------ hero figures */
figures([
  /* NOT "public datasets": two of the fourteen are internal records nobody can fetch,
     which the page itself says four sections down. A card that rounds that away is the
     page contradicting itself above the fold. */
  ["key", String(T.n_sources), "datasets behind every page here",
   `${Word(T.n_public)} public. ${Word(T.n_key_required)} need a free key.
    ${Word(T.n_no_endpoint)} have no endpoint at all`],
  ["", String(T.n_filter_lines), "filter lines published, not described",
   "The exact codes, ownership and geography applied to each source"],
  ["", N(DC.doubled), "jobs counted twice if you add a code family to its own parts",
   "The first mistake a replicator makes, drawn below"],
]);

/* ------------------------------------------------------- shared chart scaffolding

   fit() reads the container's real width. An unlaid-out container measures 0, which
   silently pins a chart at whatever constant was authored, so every caller bails on a
   zero rather than drawing at a size nobody chose. */
const fit = id => {
  const host = document.getElementById(id);
  if (!host) return 0;
  return Math.round(host.parentElement.getBoundingClientRect().width);
};
const LAB = {"font-size": 14.5, "font-weight": 700, fill: "#26333A"};
const VAL = {"font-size": 14.5, "font-weight": 700, fill: "#26333A"};

/* Measure a rendered string in viewBox units, which at scale 1 are the pixels the reader
   gets. getComputedTextLength returns 0 on a detached node, so the probe is attached. */
const measure = (svg, s, a) => {
  const n = txt(svg, s, Object.assign({x: 0, y: -60}, a));
  const len = n.getComputedTextLength();
  svg.removeChild(n);
  return len;
};

/* ------------------------------------------------------------- 1. the cold open

   THE RECIPE'S OWN OUTPUT, before a word of explanation. Every concentration reading this
   site publishes, on one scale, against the 1.0 line that is the entire point of the
   measure. It is drawn on a LOG scale and says so in its own axis label: the readings run
   from 0.09 to 22.7, and on a linear axis nine tenths of them would sit in the first
   inch. Dots rather than bars, because these are positions on a ratio scale and not
   lengths from zero.

   Two readings are called out and they are called out for opposite reasons: the worked
   case the recipe below lands on, and the largest reading on the page, which rests on
   fewer than five hundred jobs and is the small-base warning made visible. */
function drawStrip() {
  const host = document.getElementById("lqstrip");
  if (!host) return;
  const W = Math.round(host.parentElement.getBoundingClientRect().width);
  if (!W) return;
  const {svg} = chart("lqstrip", {W, H: 10});

  const L = D.lq, w = W - 2;
  const HEAD = {"font-size": 15.5, "font-weight": 900, fill: "#fff"};
  const NOTE = {"font-size": 13.5, fill: "#B7D9DE"};
  const CALL = {"font-size": 13.5, "font-weight": 700, fill: "#fff"};
  const TICK = {"font-size": 13, fill: "#9FCBD2"};

  const wrap = (s, a, max) => {
    const out = [];
    let cur = "";
    for (const wd of s.split(" ")) {
      const next = cur ? `${cur} ${wd}` : wd;
      if (cur && measure(svg, next, a) > max) { out.push(cur); cur = wd; }
      else cur = next;
    }
    if (cur) out.push(cur);
    return out;
  };

  /* TWO LEVELS OF ONE HIERARCHY, ON ONE AXIS. The 51 is a count of published CELLS, and
     23 of them are three-digit groups with the 28 four-digit parts of those same groups
     drawn beside them. That is not a defect in the chart, which is a distribution of
     readings rather than a total, but it is the exact move this page spends a whole band
     telling a reader never to make with employment, and the count was going out with no
     clause saying which it was. Split here rather than typed, off the same file the dots
     come from, so the two can never disagree. */
  const three = (D.readings || []).filter(r => String(r.naics).length === 3);
  const four = (D.readings || []).filter(r => String(r.naics).length === 4);
  const above = rs => rs.filter(r => r.lq > 1).length;
  const headL = wrap(`${Word(L.n_above_one)} of the ${word(L.n_readings)} concentration ` +
    `readings on this site sit above 1.0.`, HEAD, w);
  const subL = wrap("Each dot is one industry in one county in 2025. The scale is " +
    "logarithmic, because the readings span a factor of 250. These are published cells, " +
    `not independent readings: ${three.length} are three-digit groups and ${four.length} ` +
    "are the four-digit parts inside those same groups, which is a distribution and never " +
    `a total. Apart, ${above(three)} of the groups and ${above(four)} of the parts sit ` +
    "above 1.0.", NOTE, w);

  const LO = Math.log10(0.07), HI = Math.log10(30);
  const X = v => 1 + (Math.log10(v) - LO) / (HI - LO) * w;

  const top = 20 + (headL.length - 1) * 21 + subL.length * 19 + 8;
  const ROW = top + 60;                       // the dot row's baseline
  const H = ROW + 124;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  headL.forEach((s, i) => txt(svg, s, Object.assign({x: 1, y: 20 + i * 21}, HEAD)));
  subL.forEach((s, i) => txt(svg, s,
    Object.assign({x: 1, y: 20 + (headL.length - 1) * 21 + 21 + i * 19}, NOTE)));

  /* The 1.0 reference, drawn before every dot so no mark is buried under it. */
  el("line", {x1: X(1), y1: ROW - 22, x2: X(1), y2: ROW + 22,
    stroke: "#B8D637", "stroke-width": 2}, svg);

  /* Every reading, from the file. Partly transparent so a cluster reads as a cluster;
     the two named cases are drawn again, opaque, on top. */
  (D.readings || []).forEach(r => {
    el("circle", {cx: X(r.lq), cy: ROW, r: 5, fill: "#7FD3E0", opacity: 0.5}, svg);
  });

  const mark = (v, colour) => el("circle", {cx: X(v), cy: ROW, r: 6.5, fill: colour,
    stroke: "#0C6473", "stroke-width": 2}, svg);
  mark(L.worked.lq, "#fff");
  mark(L.fragile.lq, "#F0A45C");

  /* THREE CALLOUTS, ON THREE BASELINES, AND NO LEADER LINES. The first draft ran a
     leader from each named dot to its label, which is the usual idiom and was wrong
     twice over here: the worked case sits at 3.27 and its label sits under the 1.0
     reference, so its leader painted straight through the reference's own caption at
     EVERY width, and the longest label overflowed the left edge of a 390px screen
     because a centred string wider than its box cannot be clamped into it. Each callout
     is coloured to match its mark instead, which is a stronger association than a hairline
     and costs no ink; and each one carries shorter variants, so the label shortens rather
     than escaping the box. */
  const place = (variants, x, y, a) => {
    const list = [].concat(variants);
    let s = list[list.length - 1];
    for (const cand of list) { if (measure(svg, cand, a) <= w - 4) { s = cand; break; } }
    const t = txt(svg, s, Object.assign({y}, a, {x, "text-anchor": "middle"}));
    const half = t.getComputedTextLength() / 2;
    t.setAttribute("x", Math.min(Math.max(x, half + 1), W - half - 1));
    return t;
  };
  const F = L.fragile, K = L.worked;
  place([`${F.county} ${F.short}: ${F.lq} times the national share, on only ${N(F.emp)} jobs`,
         `${F.county} ${F.short}: ${F.lq}, on only ${N(F.emp)} jobs`,
         `${F.lq}, on ${N(F.emp)} jobs`],
    X(F.lq), ROW - 34, Object.assign({}, CALL, {fill: "#F0A45C"}));

  place(["1.0: the same share of local jobs as the country",
         "1.0: the same share as the country", "1.0: the national share"],
    X(1), ROW + 38, NOTE);
  place([`${K.county} ${K.short}: ${K.lq}, on ${N(K.emp)} jobs`,
         `${K.county}: ${K.lq}, on ${N(K.emp)} jobs`],
    X(K.lq), ROW + 62, CALL);

  [0.1, 0.5, 1, 2, 5, 10, 20].forEach(v => {
    place([String(v)], X(v), ROW + 90, TICK);
  });
  /* 13, not 12. The viewBox is the measured container width so the render scale is
     nominally 1, but a scrollbar appearing between the measurement and the paint makes
     it a hair under, and a 12-unit label then lands at 11.9 real pixels: under the floor
     this repo asserts, at one width, intermittently. Headroom is cheaper than a flake. */
  txt(svg, "TIMES THE NATIONAL SHARE", {x: 1, y: ROW + 118, "font-size": 13,
    "font-weight": 700, "letter-spacing": 0.8, fill: "#7FB3BC"});
}

/* --------------------------------------------------------- a ranked-bar renderer

   Three charts on this page are the same object: named rows, one value each, drawn from
   zero. They differ in what a row means and in what gets emphasised, so the shared part
   is the LAYOUT and nothing else. Above a measured threshold the name sits left of the
   bar; below it the name sits above the bar and the bar takes the full width, which is
   the honest re-layout for a phone rather than a shrunken copy of the desktop one. */
function ranked(id, rows, opts) {
  const W = fit(id);
  if (!W) return null;
  /* MEASURED AT THE WEIGHT IT WILL BE DRAWN AT. An emphasised row is set at 900 and is
     wider than the same string at 700, so a gutter sized from the light probe leaves the
     boldest value hanging out of the box: exactly the kind of few-pixel overhang the
     collision sweep exists to catch, on the one row a reader looks at first. */
  const probe = chart(id, {W, H: 10}).svg;
  const at = (r, base) => Object.assign({}, base, r.emphasis ? {"font-weight": 900} : {});
  const nameW = Math.min(opts.nameW || 300,
    Math.max(...rows.map(r => measure(probe, r.label, at(r, LAB)))) + 18);
  const valW = Math.max(...rows.map(r => measure(probe, r.value, at(r, VAL)))) + 16;
  const stack = W - nameW - valW < 210;

  const rowH = stack ? (opts.stackRowH || 62) : (opts.rowH || 38);
  const top = opts.top || 8;
  const H = top + rows.length * rowH + (opts.bottom || 24);
  const {svg} = chart(id, {W, H});
  const x0 = stack ? 1 : nameW;
  const plot = W - x0 - valW;
  const max = opts.max || Math.max(...rows.map(r => r.value0 ?? r.v));
  const X = v => x0 + (v / max) * plot;
  const barH = stack ? 16 : 18;
  const barY = i => top + i * rowH + (stack ? 30 : (rowH - barH) / 2);

  rows.forEach((r, i) => {
    const y = barY(i);
    if (stack) {
      txt(svg, r.label, Object.assign({}, LAB, r.emphasis ? {"font-weight": 900} : {},
        {x: 1, y: top + i * rowH + 15}));
    } else {
      txt(svg, r.label, Object.assign({}, LAB, {x: nameW - 12, y: y + barH - 4,
        "text-anchor": "end"}, r.emphasis ? {"font-weight": 900} : {}));
    }
    (r.segments || [{v: r.v, fill: r.fill || TEAL}]).reduce((acc, seg) => {
      const wpx = Math.max(2, X(acc + seg.v) - X(acc));
      const rect = el("rect", {x: X(acc), y, width: wpx, height: barH,
        fill: seg.fill, rx: 2}, svg);
      if (seg.hint) PV.hoverable(rect, seg.hint, seg.aria || seg.hint.replace(/<[^>]+>/g, " "));
      return acc + seg.v;
    }, 0);
    const end = X((r.segments || [{v: r.v}]).reduce((a, s) => a + s.v, 0));
    txt(svg, r.value, Object.assign({}, VAL, {x: end + 9, y: y + barH - 4},
      r.emphasis ? {"font-weight": 900} : {}));
  });
  return {svg, x0, plot, X, barY, barH, stack, rowH, top, W, H};
}

/* ----------------------------------------------------- 2. the double count, drawn */
function drawTree() {
  const codes = D.codes;
  const by = k => codes.find(c => c.code === k);
  const fam = codes.filter(c => c.level === "family");
  const rows = [
    {label: "The column as printed", v: DC.column_sum, value: N(DC.column_sum),
     emphasis: true,
     segments: [{v: DC.once_counted, fill: GRAY,
                 hint: `<b>Jobs that exist</b><br><span class="v">${N(DC.once_counted)}</span>`},
                {v: DC.doubled, fill: WARN,
                 hint: `<b>Counted a second time</b><br><span class="v">${N(DC.doubled)}</span>`}]},
  ];
  fam.forEach(f => {
    rows.push({label: `${f.code} ${f.name}`, v: f.emp, value: N(f.emp), fill: TEAL,
      code: f.code, kind: "family",
      hint: `<b>${f.code} ${f.name}</b><br><span class="v">${N(f.emp)}</span> jobs, ` +
            `${f.pairings} disclosed county figures`});
    codes.filter(c => c.parent === f.code).forEach(p => {
      rows.push({label: `${p.code} ${p.name}`, v: p.emp, value: N(p.emp), fill: PALE,
        code: p.code, kind: "part", indent: true,
        hint: `<b>${p.code} ${p.name}</b><br><span class="v">${N(p.emp)}</span> jobs, ` +
              `already inside ${f.code}`});
    });
  });
  rows.push({label: "The same jobs, counted once", v: DC.once_counted,
    value: N(DC.once_counted), fill: TEAL, emphasis: true});

  rows.forEach(r => {
    if (r.hint && !r.segments) r.segments = [{v: r.v, fill: r.fill, hint: r.hint}];
    if (r.indent) r.label = "└ " + r.label;
  });

  const g = ranked("tree", rows, {max: DC.column_sum, nameW: 320, rowH: 38,
    stackRowH: 60, top: 38, bottom: 30});
  if (!g) return;
  /* THE OVERHANG, NAMED ON THE CHART, IN THE TOP MARGIN. It is the whole finding and the
     one thing a reader cannot get from the bar lengths alone. It lives above every row
     rather than beside the bar because beside the bar it ran 70px off a 390px screen and
     had nowhere left to go: at that width the first row is a stacked label plus a bar,
     and there is no horizontal gutter to put a sentence in. The string shortens and then
     flips its anchor, in that order, so it is inside the box by construction rather than
     by luck at the widths that happen to get sampled. */
  const NOTE = {"font-size": 13, "font-weight": 700, fill: WARN};
  const x0 = g.X(DC.once_counted);
  let s = `${N(DC.doubled)} of these are the same jobs twice`;
  if (measure(g.svg, s, NOTE) > g.W - 10) s = `${N(DC.doubled)} counted twice`;
  const len = measure(g.svg, s, NOTE);
  const fits = x0 + 6 + len <= g.W - 2;
  txt(g.svg, s, Object.assign({}, NOTE, fits
    ? {x: x0 + 6, y: 16, "text-anchor": "start"}
    : {x: g.W - 2, y: 16, "text-anchor": "end"}));
  el("line", {x1: x0, y1: 22, x2: x0, y2: g.barY(0) - 2, stroke: WARN,
    "stroke-width": 1.5}, g.svg);

  document.getElementById("treetable").innerHTML = tableView("tree",
    `Jobs by industry code across the twelve counties, ${DC.year}`,
    ["Code", "Industry", "Level", "In PIC&rsquo;s register", "Jobs", "Disclosed county figures"],
    D.codes.map(c => [c.code, c.name, c.level, c.in_register ? "yes" : "no",
      N(c.emp), String(c.pairings)]));
  document.getElementById("treesrc").innerHTML =
    `BLS Quarterly Census of Employment and Wages, ${DC.year} annual averages, as the pay ` +
    `page publishes them. A family&rsquo;s published parts do not exhaust it: ` +
    `${N(DC.unsplit_chemistry)} of chemical manufacturing is never split out at this ` +
    `level, and the two halves of plastics and rubber are disclosed in fewer counties ` +
    `than the family is, so they sum to less than it. <b>Neither gap is a reason to add ` +
    `the family to its parts.</b>`;
}

/* ------------------------------------------------------------- 3. suppression */
function drawHide() {
  const S = D.suppression;
  const LEVELS = [["state", "State geographies"], ["metro", "Metropolitan areas"],
                  ["county", "Counties"]];
  const rows = LEVELS.map(([k, label]) => {
    const v = S[k];
    return {label: `${label} (${N(v.total)})`, v: 100, value: `${v.share}% disclosed`,
      segments: [
        {v: v.share, fill: TEAL,
         hint: `<b>${label}: published</b><br><span class="v">${N(v.disclosed)}</span> of ${N(v.total)}`},
        {v: 100 - v.share, fill: "#DED9D0",
         hint: `<b>${label}: withheld</b><br><span class="v">${N(v.suppressed)}</span> of ${N(v.total)}`}]};
  });
  ranked("hide", rows, {max: 100, nameW: 280, rowH: 44, stackRowH: 62, top: 10,
    bottom: 26});

  document.getElementById("hidetable").innerHTML = tableView("hide",
    "Areas with a published plastics and rubber employment figure, against areas where it was withheld",
    ["Geography", "Published", "Withheld", "All areas", "Published share"],
    LEVELS.map(([k, label]) => [label, N(S[k].disclosed), N(S[k].suppressed),
      N(S[k].total), S[k].share + "%"]));
  document.getElementById("hidesrc").innerHTML =
    `BLS Quarterly Census of Employment and Wages, by-industry files, as the peer-ranking ` +
    `page reads them. A withheld cell carries a one-letter disclosure code and no value. ` +
    `<b>It is not a zero, and an area ranking computed over the published half is a rank ` +
    `among disclosed areas rather than a national rank.</b>`;
}

/* ------------------------------------------------ 4. the dependency structure */
function drawDeps() {
  const rows = D.sources.map(s => ({
    label: s.short,
    v: s.n_pages, value: `${s.n_pages} ${s.n_pages === 1 ? "page" : "pages"}`,
    /* ONE ACCENT, ONE JOB. An earlier version also darkened the teal above two pages,
       which encoded a second quantity the chart never named and the legend could not
       decode. Colour here says one thing: orange cannot be fetched, teal can. */
    fill: s.route === "internal" ? WARN : TEAL,
    hint: `<b>${s.name}</b><br>${s.agency}<br><span class="v">${s.n_pages}</span> ` +
          `page${s.n_pages === 1 ? "" : "s"}: ${s.pages.join(", ")}`,
  }));
  rows.forEach(r => { r.segments = [{v: r.v, fill: r.fill, hint: r.hint}]; });
  ranked("deps", rows, {max: T.most_used_pages, nameW: 330, rowH: 32, stackRowH: 56,
    top: 8, bottom: 24});

  document.getElementById("depstable").innerHTML = tableView("deps",
    "Every dataset behind this site, and the pages resting on it",
    ["Dataset", "Agency", "How you get it", "Key", "Pages"],
    D.sources.map(s => [s.name, s.agency, s.route_label,
      s.key_required ? "required" : "none", s.pages.join(", ") || "none"]));
  document.getElementById("depssrc").innerHTML =
    `Read from <span class="mono">_data/SOURCES.json</span>, which maps every page to the ` +
    `sources it rests on. ${Word(T.n_single_source_pages)} of the ${word(T.n_pages)} pages ` +
    `rest on a single dataset, so a change at one agency would take all of ` +
    `${T.n_single_source_pages === 1 ? "it" : "them"} at once.`;
}

/* ---------------------------------------------------- the three classifications */
function drawTax() {
  const host = document.getElementById("tax");
  if (!host) return;
  /* Named by what a reader will see in the register below, not by the registry's own
     keys. "Used by oews, oews_national, onet_education, nem" is the shape of the data
     rather than a sentence, and nothing else on the page ever shows a reader a key. */
  const nameOf = k => (D.sources.find(s => s.key === k) || {}).short || k;
  /* EVERY SET ON THIS CARD IS LISTED, not counted at. A reader replicating this for
     another region needs the codes; "twenty-six occupation codes" tells them the size of
     a decision somebody else made. The education codes were already listed here and the
     occupation codes were not, which is the asymmetry a transfer test found. */
  const t = (k, name, full, body, srcs, extra) =>
    `<div class="t"><h4>${k}</h4><p class="w">${name}</p>
     <p>${body}</p>${extra || ""}
     <p class="s">${full}. Used by ${srcs.map(nameOf).join("; ")}.</p></div>`;
  const socList = `<details class="codes"><summary>All ${C.soc.n_codes} codes</summary>
    <dl>${D.socs.map(s => `<dt>${s.soc}</dt><dd>${s.occupation}</dd>`).join("")}</dl>
    </details>`;
  host.innerHTML =
    t("NAICS", "Which industry", "North American Industry Classification System",
      `This site counts ${word(C.naics.n_register)} codes as its cluster and reads
       ${word(C.naics.n_codes)} in all. Whether paints and coatings belong is a judgement,
       not a fact: this site says yes, and somebody reasonable says no.`,
      C.naics.sources,
      `<details class="codes"><summary>All ${word(C.naics.n_codes)} codes</summary>
       <dl>${D.codes.map(c => `<dt>${c.code}</dt><dd>${c.name}</dd>`).join("")}</dl>
       </details>`) +
    t("SOC", "Which occupation", "Standard Occupational Classification",
      `A chosen set of ${C.soc.n_codes} occupation codes stands for the work this
       industry does. Change the set and the average wage of the industry changes with
       it, because you have changed which jobs are in it.`,
      C.soc.sources, socList) +
    t("CIP", "Which degree", "Classification of Instructional Programs, six digits",
      `${Word(C.cip.n_core)} programme codes are counted as core and
       ${word(C.cip.n_adjacent)} more as adjacent, and the two lists are kept apart
       rather than merged, so the boundary can be argued with.`,
      C.cip.sources,
      `<details class="codes"><summary>All
       ${word(C.cip.n_core + C.cip.n_adjacent)} codes</summary>
       <dl>${C.cip.core.map(c => `<dt>${c.code}</dt><dd>${c.name} &middot; core</dd>`)
              .join("")}
           ${C.cip.adjacent.map(c => `<dt>${c.code}</dt><dd>${c.name} &middot; adjacent</dd>`)
              .join("")}</dl></details>`);
  document.getElementById("cipmath").innerHTML =
    `Counting only the ${word(C.cip.n_core)} core codes, the region&rsquo;s universities
     awarded <b>${N(C.cip.degrees_core)}</b> degrees between ${C.cip.first_year} and
     ${C.cip.last_year}, across ${word(C.cip.programmes_core)} programmes. Count the
     adjacent codes too and it is <b>${N(C.cip.degrees_both)}</b> across
     ${word(C.cip.programmes_core + C.cip.programmes_adjacent)}: a pipeline
     ${C.cip.lift_pct}% larger, from the same institutions in the same years, because a
     line moved.`;
}

/* ------------------------------------------------------------------- vintage */
function drawVintage() {
  const V = D.vintage;
  document.getElementById("vintagemath").innerHTML =
    `This site measured it, on ${word(V.n_series)} producer-price series it publishes:
     <b>${V.n_revised} of the ${V.n_published} published months</b> were changed after
     they were first printed, by a typical <b>${V.median_pct}%</b>. The largest single
     revision on record there was ${V.max_pct}%. Small, and not nothing: it is enough to
     move a figure quoted to one decimal place, and it is why a number here is a number as
     of a date rather than a number.`;
}

/* --------------------------------------------------------------- the register */
function drawRegistry() {
  const host = document.getElementById("registry");
  if (!host) return;
  host.innerHTML = D.sources.map(s => {
    const chips = [`<span class="chip ${s.route}">${s.route_label}</span>`];
    if (s.key_required) chips.push('<span class="chip key">free key required</span>');
    if (s.licence) chips.push(`<span class="chip lic">${s.licence}</span>`);
    const filters = s.filters.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
    return `<div class="entry">
      <div class="hd"><h4>${s.name}</h4>${chips.join("")}</div>
      <p class="agency">${s.agency}</p>
      <div class="lines">
        <p><b>What it is.</b> ${s.is}</p>
        <p><b>What it answers.</b> ${s.good}</p>
        <p class="no"><b>What it cannot tell you.</b> ${s.cannot}</p>
      </div>
      ${s.url ? `<p class="ep">${s.url}</p>`
              : `<p class="ep">No endpoint. This is an internal record and cannot be
                 fetched by anyone, including us. The published file is the artifact.</p>`}
      ${s.terms ? `<p class="terms"><b>Terms.</b> ${s.terms}</p>` : ""}
      ${filters ? `<details><summary>The exact filters applied to it
        (${s.filters.length})</summary><dl>${filters}</dl></details>` : ""}
      <p class="dep">${s.docs ? `<a href="${s.docs}">Agency documentation</a> &middot; ` : ""}
        ${s.script ? `Fetched by <span class="mono">${s.script}</span> &middot; ` : ""}
        Used by ${s.pages.length ? s.pages.map(p => `<a href="../${p}/">${p}</a>`).join(", ")
                                 : "no published page"}</p>
    </div>`;
  }).join("");

  document.getElementById("licencesrc").innerHTML =
    `${Word(T.n_licensed)} of the ${word(T.n_sources)} state a licence that conditions
     use, and both require attribution: ${D.attributions.map(a =>
       `${a.short} under <a href="${a.licence_url}">${a.licence}</a>`)
       .join(" and ")}. Both credits are printed in the footer of this page, because
     describing a licence is not complying with one. ${Word(T.n_terms)} sources state
     TERMS rather than a licence, which is public domain with a citation request, and
     each entry quotes them with the agency page they come from, so no source here should
     be read as publishing no terms at all.`;

  /* THE FOOTER IS THE COMPLIANCE SURFACE, not a description of one. Both licences
     require a LINK to the licence text, and this was set with textContent, so the page
     carried the words "CC BY 4.0" and no link anywhere. The licence name is now the
     anchor, and the trademark symbol travels in the attribution string itself, where
     _data/build/derive_sources.py asserts it rather than hoping for it. */
  document.getElementById("footlicence").innerHTML = D.attributions.map(a => {
    const link = `<a href="${a.licence_url}">${a.licence}</a>`;
    /* The required wording differs per licence and neither is ours to paraphrase, so the
       link goes on the licence name where the text already names it, and is appended
       where it does not, rather than the text being bent to fit one pattern. */
    const linked = a.text.includes(a.licence)
      ? a.text.split(a.licence).join(link)
      : `${a.text} Licence: ${link}.`;
    return `<p class="attr">${linked}</p>`;
  }).join("");
}

/* ------------------------------------------------ the recipe's own worked arithmetic */
/* THE ONE THING THIS PAGE EXISTS TO MAKE POSSIBLE is a reader landing on the number it
   publishes. It failed that test: the rule it stated produced 3.123 against a published
   3.27, because the stated rule held ownership constant and the bureau's does not. Both
   arithmetics are printed here from the same six components, so the gap is explained
   rather than discovered. */
function drawRecipe() {
  const B = D.lq.basis, P = D.lq.provenance, S = B.self_check, F = D.footprint;
  document.getElementById("samebasis").innerHTML =
    `<b>${B.same_basis_2dp}</b> rather than <b>${B.bls_basis_2dp}</b>,
     ${Math.abs(B.gap_pct)}% lower`;

  document.getElementById("lqarith").innerHTML =
    `<b>The worked cell, both ways.</b> ${B.county} County, ${B.naics}, ${B.year}.
     BLS&rsquo;s basis is (${N(B.local_industry_private)} &divide;
     ${N(B.local_all_industry_all_ownerships)}) &divide; (${N(B.national_industry_private)}
     &divide; ${N(B.national_all_industry_all_ownerships)}) =
     <b>${B.bls_basis}</b>, which rounds to the ${B.bls_published} the file prints and this
     page publishes. Holding ownership at private throughout instead gives
     (${N(B.local_industry_private)} &divide; ${N(B.local_all_industry_private)}) &divide;
     (${N(B.national_industry_private)} &divide; ${N(B.national_all_industry_private)}) =
     <b>${B.same_basis}</b>. Same four files, same codes, different measure. Read on
     ${B.read_on}: ${B.rows}`;

  document.getElementById("ownlq").innerHTML =
    `In this file they read ${S.own_5_private_lq} for private,
     ${S.own_3_local_government_lq} for local government,
     ${S.own_2_state_government_lq} for state and ${S.own_1_federal_lq} for federal.`;

  document.getElementById("lqprov").innerHTML =
    `<b>Which of the two this page prints, and how that was settled.</b> The
     ${B.bls_published} above is BLS&rsquo;s own <span class="mono">lq_annual_avg_emplvl</span>
     column, carried through this site&rsquo;s pay page unchanged. That is not an
     assumption: the concentration page computes its own value from components and ships
     BLS&rsquo;s beside it, the two round apart on
     ${P.separating_cells} of ${N(P.cells_compared)} cells, and the printed figure follows
     the bureau&rsquo;s on ${N(P.match_bls_column)} of ${N(P.cells_compared)} and ours on
     ${N(P.match_our_recomputation)}. Our independent recomputation of this cell is
     ${P.our_value_full}, ${Math.abs(P.residual)} away, and across
     ${N(P.verification.cells_checked)} checked cells the two never differ by more than
     ${P.verification.max_abs_residual}, which is half of the last digit the bureau prints.
     So: the number is the bureau&rsquo;s, we can reproduce it, and it is on the bureau&rsquo;s
     mixed-ownership basis rather than the same-basis rule this page used to teach.`;

  document.getElementById("footprint").innerHTML =
    `<b>The footprint behind every regional figure on this site is ${F.label}</b>, and
     these are the ${word(F.n)} counties, named because a reader replicating this needs the
     set and not its size, each with the five-digit FIPS code the filter actually takes:
     ${F.counties.map(c => `${c.name} <b class="code">${c.fips}</b>`).join(", ")}. A wider
     fourteen-county definition is
     also in use in this project, and every page here stamps which footprint it was built
     on in a banner, because two pages on two footprints reconcile with nothing.`;

  const V = D.suppression_vintage;
  document.getElementById("hidehow").insertAdjacentHTML("beforeend",
    ` The figures drawn here are the <b>${V.published_year}</b> annual file, and the year
      is load-bearing: the ${V.comparison_year} file gives ${N(V.comparison_county_disclosed)}
      disclosed counties of ${N(V.comparison_county_total)} and carries no metropolitan
      rows at all yet, read ${V.comparison_read_on}. A reader who pulls the newest year and
      compares it to this chart is looking at a different vintage, not at a disagreement.`);
}

/* ------------------------------------------------------- recipe 2, the pay premium */
/* THE UNIT OF THE MEDIAN, which is the whole reason this recipe exists. Every figure
   is read from the pay page's own shipped file by derive_sources.py, including the cell
   that drags the two statistics apart, so this cannot teach a value that page has
   stopped publishing. */
function drawPay() {
  const W = D.wage;
  if (!W) return;
  const x = v => `${v.toFixed(2)}×`;

  document.getElementById("paydenoms").innerHTML =
    `This site publishes both, for every cell. Against the same industry nationally,
     <b>${W.n_below_us} of the ${W.n_published}</b> published cells pay less than the
     industry pays elsewhere, a middle cell of <b>${x(W.median_vs_us)}</b>. Against the
     average job in the same county, <b>${W.n_above_local} of the ${W.n_published}</b>
     pay more. The same cells, the same year, opposite verdicts, and both are true.`;

  document.getElementById("payunits").innerHTML =
    `The table holds ${W.n_published} published cells out of ${W.n_possible} possible,
     ${word(W.n_industries)} industry codes across ${word(W.n_counties)} counties. Take
     the middle of those ${W.n_published} and the unit is a <b>cell</b>.
     <b>Count each county once and the unit is a county-industry.</b> The rule is to keep
     the finest detail published for that county and drop the family above it: where a
     county publishes ${W.register_naics[0]} or ${W.register_naics[1]}, drop its 325 row;
     where it publishes 3261 or 3262, drop its 326. That leaves
     <b>${W.dedup_rows}</b> rows, of which ${W.dedup_above} pay above their county.
     <b>Weight by employment and the unit is a job</b>, but only a coarser set can carry
     that: the two industry groups taken once per county, ${N(W.cover_jobs)} jobs,
     ${N(W.cover_jobs_above)} of them in a group that out-pays its county.`;

  /* THE POPULATION HAS TO BE NAMED, NOT JUST COUNTED. This recipe's whole lesson is that
     a median is a median OF something; printing 33,528 without saying which codes it is
     would commit the exact fault the section is about, and nearly half of it sits
     outside the register the reader was handed two sections earlier. */
  document.getElementById("paycover").innerHTML =
    `<b>Read the job figure with its boundary attached.</b> The only complete
     non-overlapping set the published data offer is NAICS
     ${W.cover_naics.join(" and ")} taken once per county, so that is what a job weighting
     can run over at all. It is wider than this site&rsquo;s own measurement register of
     ${W.register_naics.join(", ")}, which covers ${N(W.register_jobs)} jobs:
     <b>${N(W.cover_outside_register)}</b> of the ${N(W.cover_jobs)} weighted jobs, about
     ${Math.round(W.cover_outside_register / W.cover_jobs * 100)} percent, are chemistry
     the register calls context rather than cluster. The finer set cannot be weighted
     because it is not published for every county. That is a real limit, not a
     rounding note, and it is the reason the cell median stays the headline.`;

  document.getElementById("paymath").innerHTML =
    `middle of ${W.n_published} cells = ${x(W.median_pairing)} &nbsp;&middot;&nbsp;
     middle of ${N(W.cover_jobs)} jobs = ${x(W.median_job)}`;

  document.getElementById("paydrag").innerHTML =
    `The heaviest cell sitting below the cell median is
     <b>${W.drag.county} County ${W.drag.label.toLowerCase().replace(" & ", " and ")}</b> at
     ${x(W.drag.ratio)} on ${N(W.drag.emp)} jobs, the same cell the first recipe worked.
     One cell in ${W.n_published} by the list count, and ${
       Math.round(W.drag.emp / W.cover_jobs * 100)} percent of the jobs by the other.
     That is the gap between the two statistics, in one row.`;

  document.getElementById("paylands").innerHTML =
    `In ${W.year}, across ${word(W.n_counties)} counties: the middle cell pays
     <b>${x(W.median_pairing)}</b> what the average job in its county pays, the middle
     job <b>${x(W.median_job)}</b>. Against the same industries nationally the region
     pays <b>${x(W.median_vs_us)}</b>, a discount rather than a premium. It is a good
     industry to hold a job in relative to this region, and this region is a cheap place
     to hire for it, and those are the same finding read from two sides.`;
}

/* ------------------------------------------------------- recipe 3, the labour shed */
function drawShed() {
  const S = D.shed;
  if (!S) return;
  const pct = (a, b) => (a / b * 100).toFixed(1);

  document.getElementById("shedrow").innerHTML = S.row_is;

  document.getElementById("shedbases").innerHTML =
    `In ${S.year}, this site&rsquo;s twelve counties held <b>${N(S.all_residents)}</b>
     jobs counting a worker resident in any state, and <b>${N(S.in_state_only)}</b>
     counting ${S.state} residents only. The two are <b>${N(S.gap)}</b> apart. Both were
     published here as the same footprint before anyone noticed they were two different
     measures.`;

  document.getElementById("shedidentity").innerHTML =
    `${N(S.inside)} held from inside &nbsp;+&nbsp; ${N(S.outside_in_state)} from
     elsewhere in ${S.state} &nbsp;=&nbsp; ${N(S.in_state_only)}<br>
     ${N(S.inside)} held from inside &nbsp;+&nbsp; ${N(S.outside_any_state)} from
     anywhere &nbsp;=&nbsp; ${N(S.all_residents)}`;

  const E = S.external_split;
  document.getElementById("shedoutside").innerHTML =
    `${N(S.outside_any_state)} jobs are held from outside the twelve counties, which is
     ${(S.share_imported * 100).toFixed(1)} percent of everything worked here. Of those,
     ${N(S.external_classified)} fall into three groups: ${N(E.adjacent)} from counties
     next door, ${N(E.distant)} from metropolitan areas hours away, and
     <b>${N(E.other)}</b> from counties scattered too thinly to group, which is the
     largest of the three at ${pct(E.other, S.external_classified)} percent and the least
     examined. <b>The other ${N(S.external_unclassified)} are not in the grouping at
     all.</b> That is ${pct(S.external_unclassified, S.outside_any_state)} percent, small
     enough to round away and worth not rounding away: three numbers printed under a
     fourth read as a partition of it, and these are not one.`;
}

/* ------------------------------------------------ recipe 4, federal contracting */
function drawContracting() {
  const C = D.contracting;
  if (!C) return;
  const M = v => `$${(v / 1e6).toFixed(1)}M`;

  document.getElementById("fedyears").innerHTML =
    `This site pulls fiscal ${C.first_fy} to ${C.last_fy}, ${word(C.n_years)} years, of
     which <b>${word(C.closed_years)} are finished</b>. Across the finished years the
     region&rsquo;s polymer manufacturers were obligated <b>${M(C.total_closed)}</b>. Adding
     the part-year brings it to ${M(C.total_all)}, and that larger number is the more
     misleading of the two, because ${M(C.partial_fy_amount)} of it is however much of
     ${C.last_fy} had elapsed when the file was read.`;

  document.getElementById("fedcaution").innerHTML = C.place_caution;

  document.getElementById("fedblind").innerHTML =
    `${C.invisible} This cut sees <b>${word(C.n_codes)} industry codes</b>, led by
     ${C.top.map(t => `${t.name.toLowerCase()} at ${M(t.amount)}`).join(", ")}. Everything
     else in the region&rsquo;s federal money is outside the frame by construction, and the
     total does not know that.`;
}

/* ------------------------------------------------- the basis: nominal against real */
/* Every figure recomputed here from the price page's own shipped table, with that page's
   own clamp: the CPI annuals stop before the current year, so a current-year month
   borrows the last published deflator and every real figure is an upper bound. */
function drawDeflator() {
  const F = D.deflator;
  if (!F) return;
  const yr = d => d.slice(0, 4);
  const MON = ["January","February","March","April","May","June","July","August",
    "September","October","November","December"];
  const month = d => `${MON[+d.slice(5, 7) - 1]} ${yr(d)}`;

  document.getElementById("cpitable").innerHTML =
    `${F.index}, ${F.base_year} to ${F.latest_year}, on a base of ${F.base_year}. The
     index moved from <b>${F.cpi_base}</b> to <b>${F.cpi_latest}</b>, so general prices
     rose <b>${F.inflation_pct} percent</b> across the window and a
     ${F.latest_year} dollar buys what
     ${(100 / (1 + F.inflation_pct / 100)).toFixed(0)} cents bought in ${F.base_year}.
     The divisor for any year is that year&rsquo;s index over
     ${F.base_year}&rsquo;s: ${F.years.filter(y => [F.base_year, "2022", F.latest_year]
       .includes(y.year)).map(y => `${y.year} is ${y.factor}`).join(", ")}.`;

  document.getElementById("deflated").innerHTML =
    `<b>Finished plastics and rubber prices.</b> Up to <b>${F.product.nominal}</b> in
     cash against a ${F.base_year} base of 100, which is the rise of about forty percent
     that page reported. Deflated, <b>${F.product.real}</b>: a real rise of about
     ${Math.round(F.product.real - 100)} percent, not forty. And the dearest month is not
     the same month. In cash it is <b>${month(F.product.cash_peak)}</b>; in real terms it
     was <b>${month(F.product.real_peak)}</b>, nearly four years earlier.
     <b>Resin</b> makes the sharper case: <b>${F.resin.nominal}</b> in cash still reads
     as a lasting increase, and at <b>${F.resin.real}</b> deflated it has given back the
     entire rise and sits essentially back at its ${F.base_year} level.`;

  document.getElementById("deflordering").innerHTML =
    `That page&rsquo;s central finding is an ORDERING, that the cost spike was given back
     at the wellhead, partly at resin, and not at all in finished products. Re-run on the
     deflated series the ordering holds, because every link faces the same general
     inflation. So the page may stay nominal and says that it rechecked. Its
     <em>magnitudes</em> did not survive: forty percent became
     ${Math.round(F.product.real - 100)}, and a record high became a four-year-old peak.
     Both outcomes in one page, which is why the check is worth running rather than
     reasoning about.`;
}

/* --------------------------------------------------- checking one award, including ours */
function drawAwards() {
  const A = D.awards;
  if (!A) return;
  const M = v => `$${(v / 1e6).toFixed(v % 1e6 ? 1 : 0)}M`;
  const full = v => `$${N(v)}`;
  const yr = d => d.slice(0, 4);
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  const day = d => `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;

  document.getElementById("edanote").innerHTML =
    `The ${A.eda.name} is ${word(A.eda.n)} implementation awards from the
     ${A.eda.agency}, ${full(A.eda.total)} between them. Each carries its own identifier,
     and the ${word(A.eda.n)} amounts add to the total, so a reader can check the
     addition as well as the parts.`;

  document.getElementById("edalist").innerHTML =
    /* TWO COLUMNS, NOT THREE. A third column for the identifier forced the table past
       420px, and at 390px the AMOUNT scrolled off the right edge: the reader lost the
       figure while keeping the label for it, and the caption clipped mid-sentence. The
       identifier sits under its lead instead, which fits every phone and costs nothing
       on a desktop. Found by rendering it at 390, not by a gate. */
    `<div class="pv-table awards"><table>
      <caption>The ${word(A.eda.n)} implementation awards, largest first. Look any of
        them up by the identifier under its lead.</caption>
      <thead><tr><th>Lead and award identifier</th><th>Amount</th></tr></thead>
      <tbody>${A.eda.leads.map(l => `<tr>
        <th scope="row">${l.name}<b class="code">${l.id}</b></th>
        <td>${full(l.amount)}</td></tr>`).join("")}
      </tbody>
      <tfoot><tr><th scope="row">Total</th>
        <td><b>${full(A.eda.total)}</b></td></tr></tfoot>
    </table></div>`;

  document.getElementById("nsfnums").innerHTML =
    `NSF award <b class="code">${A.nsf.id}</b>, made ${day(A.nsf.award_date)}, runs
     ${yr(A.nsf.period_start)} to ${yr(A.nsf.period_end)}. Its record gives an estimated
     total of <b>${full(A.nsf.estimated_total)}</b> and
     <b>${full(A.nsf.obligated)}</b> ${A.nsf.obligated_basis}, which is
     ${Math.round(A.nsf.share_obligated * 100)} percent of it. The programme it sits in
     is publicly described with a much larger ten-year ceiling contingent on renewals,
     and no source ties that ceiling to this award.`;

  document.getElementById("awarderr").innerHTML =
    `<b>This site printed ${M(A.error.printed)} for that award.</b> The record says
     ${full(A.error.actual)}. We overstated a federal award by a factor of
     <b>${A.error.factor}</b>, on a site whose premise is that its numbers can be
     checked, and it stood until ${day(A.error.corrected_on)}.`;
}

/* The standfirst counts the recipes rather than asserting a number, so shipping the next
   one from ROADMAP.md updates the opening without anybody remembering to. */
function countRecipes() {
  const n = document.querySelectorAll("section[data-recipe]").length;
  const el = document.getElementById("nrecipes");
  if (el && n) el.textContent = `${Word(n)} worked question${n === 1 ? "" : "s"}`;
}

/* ------------------------------------------------------------------ section nav */
/* Built from the sections themselves, so a section added to this page appears in the
   nav without anybody remembering to add it, and one removed cannot leave a link to
   nothing behind. The METHODOLOGY block is appended separately because picviz.js emits
   it rather than index.html, so it carries no data-nav of its own to read. */
function drawNav() {
  const secs = [...document.querySelectorAll("section[data-nav]")];
  const method = document.querySelector("section.pv-method");
  if (method) {
    method.id ||= "sec-method";
    method.dataset.nav = "Method";
    secs.push(method);
  }
  if (secs.length < 2) return;

  const items = secs.map(x => `<li><a href="#${x.id}">${x.dataset.nav}</a></li>`).join("");
  const rail = document.createElement("nav");
  rail.className = "docnav";
  rail.setAttribute("aria-label", "Sections");
  /* A <p>, not an <h2>: nav chrome is not part of the argument's outline. The old h2
     rendered at 12px uppercase gray — an eyebrow wearing a heading tag — and a screen
     reader announced it as a peer of the section headings. Demoted 2026-08-31. */
  rail.innerHTML = `<p class="docnav-h">On this page</p><ol>${items}</ol>`;

  const bar = document.createElement("nav");
  bar.className = "docbar";
  bar.setAttribute("aria-label", "Sections");
  bar.innerHTML = `<ol>${items}</ol>`;

  /* AFTER THE HERO, both of them. See the note in styles.css: the cold-open gate
     measures where this page's first chart lands and the first chart is in the hero, so
     nothing may be inserted above it. */
  const hero = document.querySelector("section.hero");
  hero.after(bar);
  hero.after(rail);

  /* Scroll spy. The active section is the last one whose top has passed the reading
     line, not the one nearest the middle: a reader at the bottom of a 4,000px section is
     still in it, and highlighting the next one because it is closer to the centre is the
     failure mode of every naive version of this. */
  const links = [...rail.querySelectorAll("a"), ...bar.querySelectorAll("a")];
  const LINE = 90;
  let current = null;
  function spy() {
    let active = secs[0];
    for (const x of secs) if (x.getBoundingClientRect().top <= LINE) active = x;
    /* The last section can be too short to ever reach the line, so the foot of the
       document claims it rather than leaving the previous one lit. */
    if (innerHeight + scrollY >= document.body.scrollHeight - 4) active = secs[secs.length - 1];
    if (active.id === current) return;
    current = active.id;
    for (const a of links) {
      const on = a.getAttribute("href") === "#" + current;
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      /* Keep the active chip in view in the bar, which scrolls sideways.
         SET scrollLeft, do not call scrollIntoView. Even with block:"nearest" that
         method is free to scroll the DOCUMENT, and it did: on a 390px screen the first
         spy() call on load scrolled the page 793px, landing a reader below the headline
         and the standfirst, on the page whose first job is to say what it offers. An
         outside reviewer read that as an editorial failure of the opening. It was this
         line. Moving the container's own scrollLeft cannot move the page. */
      if (on && a.closest(".docbar") && bar.offsetParent) {
        const ol = bar.firstElementChild;
        const want = a.offsetLeft - (ol.clientWidth - a.offsetWidth) / 2;
        ol.scrollLeft = Math.max(0, Math.min(want, ol.scrollWidth - ol.clientWidth));
      }
    }
  }
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; spy(); });
  }, {passive: true});
  spy();
}

/* ------------------------------------------- localisation, and the checks section */
function drawSwaps() {
  const S = D.swaps;
  if (!S) return;
  document.getElementById("swaplist").innerHTML =
    `<div class="pv-table awards"><table>
      <caption>Every value the recipes above depend on. Two of the ${word(S.length)} are
        marked because you have to find them yourself.</caption>
      <thead><tr><th>What it is, and where it appears</th><th>Ours</th></tr></thead>
      <tbody>${S.map(x => `<tr>
        <th scope="row">${x.what}${x.supply
            ? ' <b class="code">you supply</b>' : ""}
          <span class="swapnote">${x.where}. ${x.note}</span></th>
        <td style="text-align:left">${x.ours}<br><em>${x.yours}</em></td></tr>`).join("")}
      </tbody></table></div>`;

  const C = D.checks;
  if (!C) return;
  document.getElementById("checkidea").innerHTML =
    `Across ${word(C.n_pages)} pages this site carries <b>${N(C.n_claims)}</b> of them.
     ${N(C.n_auto)} are re-run against the source data every time the site is built, so a
     figure that stopped being true breaks the build before anybody reads it. The other
     ${C.n_manual} rest on a person having read a document correctly, which is why they
     are labelled and are the place to attack first. This page alone carries
     ${C.this_page}.`;

  document.getElementById("checkcaught").innerHTML =
    `On this page, in one week: a recipe that printed three aggregation codes returning
     nothing from the file it told you to download; a median described over the wrong
     unit; three published figures asserted to sum to a fourth that they miss by 2,552;
     and a source credited on a page that never used it, which had quietly made one
     dataset look more central than it is. The first three were caught by a condition
     written next to the sentence. The last was caught by a person reading the page.`;
}

/* ------------------------------------------------------------------- the gaps */
function drawGaps() {
  const host = document.getElementById("gaps");
  if (!host) return;
  host.innerHTML = D.gaps.map(g => `<div class="gap">
    <h4>${g.what}</h4>
    <p class="pg">${g.page}</p>
    <p>${g.n ? `<b>${Word(g.n)} ${g.unit || "rows"}${g.jobs ? `, ${N(g.jobs)} jobs` : ""}.</b> `
             : ""}${g.why}</p>
    <p class="fix"><b>To close it:</b> ${g.close}</p>
  </div>`).join("");
}

/* --------------------------------------------------------------------- assemble */
/* THE WORKED READING CARRIES ITS AREA CODE, because the recipe's endpoint takes a
   {fips} and a reader who cannot fill it in has been walked to a wall. This is the one
   substitution a replicator has to make to land on the number this page prints. */
document.getElementById("lqworked").innerHTML =
  `${D.lq.worked.county} County, Ohio, which is area <b class="code">${D.lq.worked.area}</b>
   in that endpoint, reads <b>${D.lq.worked.lq}</b> for ${D.lq.worked.short}, NAICS
   ${D.lq.worked.naics}, in ${D.lq.worked.year}, on ${N(D.lq.worked.emp)} jobs`;
document.getElementById("closersub").innerHTML =
  `Every filter on this page is the value the fetch scripts actually apply, extracted from
   them rather than written from memory, and ${T.n_filter_lines} of them are published
   here. ${Word(T.n_no_endpoint)} of the ${word(T.n_sources)} sources cannot be fetched by
   anybody, which is said here rather than left for you to discover.`;

drawTax();
drawVintage();
countRecipes();
drawRecipe();
drawPay();
drawShed();
drawDeflator();
drawContracting();
drawSwaps();
drawAwards();
drawRegistry();
drawGaps();

function drawAll() { drawStrip(); drawTree(); drawHide(); drawDeps(); }
drawAll();

/* One redraw per frame. A resize event fires dozens of times a second and each of these
   re-measures four containers. */
let pending = false;
addEventListener("resize", () => {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; drawAll(); });
}, {passive: true});

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({
  page: "sources",
  meta: D.meta,
  sourcesNote: "This page rests on no federal series of its own: its dataset is the " +
    "source register for the whole site, plus five pages’ shipped files. The endpoints " +
    "and filters for every federal source it describes are in the register above, at " +
    "reader scale, which is where they belong on this page rather than folded into a " +
    "disclosure box.",
  definitions: `<b>NAICS</b> is the North American Industry Classification System, the
    codes that decide which employers count as an industry. <b>SOC</b> is the Standard
    Occupational Classification, the codes that decide which jobs count as an occupation.
    <b>CIP</b> is the Classification of Instructional Programs, the codes that decide
    which degrees count as a field. <b>PIC-12</b> is the twelve-county footprint every
    federal-data page here is built on. A <b>location quotient</b> is a share of a share:
    an industry’s share of local jobs divided by its share of national jobs, where 1.0
    means the two are equal. A <b>withheld cell</b> is a figure an agency suppressed
    because too few employers would be identifiable; it is unknown, never zero.`,
});

/* LAST, because PV.methodology() above is what appends the methodology section and
   the nav is built by reading the sections that exist. */
drawNav();
})();
