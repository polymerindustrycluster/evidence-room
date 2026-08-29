/* The PIC scorecard — the organisation's own performance, kept apart from cluster health.
 *
 * THE ONE RULE THIS FILE ENFORCES AT RENDER TIME
 *   A row whose measurement lives in PIC's private registers arrives here with
 *   `current: null`. Nothing below supplies a default, a dash that could be read as a
 *   value, or a zero. It renders an explicit "not published here" state, and `assertEmpty`
 *   throws if a vault row ever turns up carrying a figure. The derive script raises on the
 *   same condition; this is the second of the two locks, because the failure being guarded
 *   against is a plausible-looking number in a cell where nobody ever measured anything.
 *
 * WHAT IS DRAWN, AND WHY THOSE FORMS
 *   1. The scorecard table. Eight columns, four groups, status marked twice (a rule down
 *      the left edge and the current cell itself) so a board member can see at a glance
 *      which rows are real. A table, not a chart, because the argument is which cells are
 *      empty and only a table shows an empty cell as empty.
 *   2. Award delivery: three bars on one dollar scale, each split into money on an
 *      executed line naming its holder and money awarded with no recipient named yet.
 *      Part-to-whole within a magnitude comparison, hatched for the missing half.
 *   3. Talent: ten years of polymer credentials as columns. Change over time, one series.
 *
 *   Group D is drawn nowhere. It is context PIC does not control, it lives in the table's
 *   last group in gray, and putting it in a chart beside groups B and C would be the
 *   averaging this page exists to refuse.
 */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, chart, figures, INK, SEQ} = PV;

const D = await PV.data("scorecard.json");
const MOBILE = matchMedia("(max-width: 760px)");

const usd = v => "$" + Math.round(v).toLocaleString("en-US");
/* Round at the unit, not after dividing: (2650000 / 1e6).toFixed(1) prints "$2.6M"
   because 2.65 has no exact binary form. The house hit this once and published an award
   a hundred thousand dollars light. */
const short = v => v >= 1e6 ? "$" + (Math.round(v / 1e5) / 10).toFixed(1) + "M"
                 : v ? "$" + Math.round(v / 1e3) + "K" : "$0";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* ------------------------------------------------------------------- the second lock */
function assertEmpty(rows) {
  const bad = rows.filter(r => r.status === "vault" && (r.current || r.sub));
  if (bad.length) throw new Error(
    `vault row ${bad[0].id} carries a value — this page must never render one`);
  return rows;
}
const ROWS = assertEmpty(D.rows);
const C = D.counts;
const DEL = D.delivery;
const TAL = D.talent;

/* ============================================================ 0. THE COLD OPEN
   The lead visual, in the first screen, above the stat row. It was already here as a row
   of HTML squares; it is drawn now, because a page whose whole argument is which cells
   are empty cannot make a reader scroll 5,677px to meet its first mark.

   An isotype (chart-craft, MAGNITUDE row): one square is one metric, grouped, so the
   shape a reader takes away is that the blanks are not scattered but concentrated in
   group A. No hue is spent on absence — computed is filled, awaiting the vault is an
   outline, context is a flat wash — which survives greyscale and colour-blind reading.

   DELIBERATELY POORER THAN THE TABLE BELOW IT. One dimension, status per metric. No
   definition, owner, cadence, target, current reading, trend or source: those are eight
   columns and they are the reason the table exists. This strip only has to put the
   coverage shape in the first screen and hand the reader on.

   COLOUR ON THE DARK HERO. The site's chart inks are mixed for #FAF9F7 paper and cannot
   be reused here: INK is #0C6473, which IS this ground, and the dark half of the SEQ
   ramp measures under 3:1 against it. So this strip draws in lightened hero inks — a
   near-white fill, a white dashed outline, a white wash — and the group letters take a
   lightened lime, #CFE85C at 4.97:1, where the page's own --lime (#B8D637) reaches only
   4.12:1 and would fail the 4.5:1 floor for body-size text. */
const O_FILL = "#EAF3F4", O_EDGE = "rgba(255,255,255,.66)", O_CTX = "rgba(255,255,255,.30)",
      O_LIME = "#CFE85C", O_MUTE = "#CDE6EA";

/* Each row carries the group's WHOLE title, not its first word. The shorthand this strip
   replaces printed group B as "Federal", and group B's entire finding is that the money
   with no named recipient is state money — so the abbreviation contradicted the page. A
   full title costs a wider label column and nothing else. */
const OPENG = D.groups.map(g => {
  const rs = ROWS.filter(r => r.group === g.key);
  const filled = rs.filter(r => r.status === "public").length;
  return {key: g.key, title: g.title, cells: rs.map(r => r.status),
    tally: g.key === "D" ? `${rs.length} rows, context only`
                         : `${filled} of ${rs.length} computed`};
});

/* One metric. A vault square is inset by half its stroke so the dashed edge lands inside
   the same cell box as a filled one and the four runs stay on one baseline. The dash
   scales with the square: "4 3" on the 13-unit key swatch drew four corners and read as
   a different mark from the 24-unit squares it was the key for. */
function openCell(svg, status, x, y, s) {
  if (status === "vault")
    el("rect", {x: x + .75, y: y + .75, width: s - 1.5, height: s - 1.5, rx: 3,
      fill: "none", stroke: O_EDGE, "stroke-width": 1.5,
      "stroke-dasharray": s < 16 ? "2.4 1.8" : "4 3"}, svg);
  else
    el("rect", {x, y, width: s, height: s, rx: 3,
      fill: status === "public" ? O_FILL : O_CTX}, svg);
}

/* The phone version is NOT this one scaled. A 700-unit viewBox squeezed into a 350px
   column renders every label at 7.5px, well under the 12px floor, so the phone gets its
   own viewBox (358 units, a ~1:1 scale), its own square size, and the tally stacked over
   the squares instead of sitting beside them. Redraw safety is PV.chart's `keep`, which
   counts ELEMENT children rather than childNodes and so cannot eat the <title> the way a
   `childNodes.slice(1)` does on indented markup. */
function drawOpen() {
  const M = MOBILE.matches;
  /* MEASURED, NOT AUTHORED. Fixed at 700 and 358 this held at 1440 and 390 and painted
     10.1px labels at 768, where the rail is narrower than at either. Measuring the rail
     makes the render scale exactly 1.000 at every width, so a label's authored size is
     its real size. The square grid is right-anchored off w, so it follows. */
  const railW = Math.round(
    (document.getElementById("open").parentElement || {getBoundingClientRect: () => ({})})
      .getBoundingClientRect().width || 0);
  const W = Math.max(300, railW || (M ? 358 : 700));
  const H = M ? 348 : 240;
  const m = M ? {t: 62, r: 10, b: 10, l: 10} : {t: 56, r: 14, b: 30, l: 14};
  const {svg, w} = chart("open", {W, H, m});
  const SQ = M ? 18 : 24, CELL = M ? 23 : 31;
  /* the label column keeps its 296 units only while there is room for it */
  const SX = M ? m.l : m.l + Math.min(296, Math.max(150, W - m.l - m.r - 250));
  const TOP = M ? [62, 116, 170, 232] : [56, 90, 124, 168];
  const RULE = M ? 220 : 156;

  /* The finding, in the strip's own words, because this is the only chart a reader meets
     before any explanation. Two lines rather than one: measured, the phone column holds
     about 44 characters at 15 units and the desktop one about 80. */
  txt(svg, M ? `${C.public} of ${C.accountable} rows compute from a public record`
             : `${C.public} of the ${C.accountable} rows PIC answers for compute from `
               + `a public record`,
    {x: m.l, y: M ? 20 : 19, "font-size": M ? 15 : 16, "font-weight": M ? 700 : 900,
     fill: "#fff"});
  txt(svg, `The ${C.vault_in_a} rows on revenue are all blank.`,
    {x: m.l, y: 40, "font-size": 15, "font-weight": 700, fill: O_LIME});

  /* On the phone the title takes its own line above the squares and the tally drops to
     the squares' line. Side by side, group B's title runs 238 units from x=26 and its
     right-aligned tally starts at 228: a 35-unit overlap at 390px, and none at any
     desktop width, which is why this is a re-layout and not a scale. */
  OPENG.forEach((g, i) => {
    const top = TOP[i], label = top + (M ? 12 : 20), tally = top + (M ? 34 : 20);
    txt(svg, g.key, {x: m.l, y: label, "font-size": 15, "font-weight": 900, fill: O_LIME});
    txt(svg, g.title, {x: m.l + (M ? 16 : 18), y: label, "font-size": 15,
      "font-weight": 700, fill: "#fff"});
    txt(svg, g.tally, {x: m.l + w, y: tally, "text-anchor": "end",
      "font-size": 15, "font-weight": 700, fill: g.key === "D" ? O_MUTE
        : g.tally.startsWith("0 ") ? O_LIME : "#fff"});
    g.cells.forEach((s, j) =>
      openCell(svg, s, SX + j * CELL, top + (M ? 20 : 3), SQ));
  });

  /* Group D is ruled off, the same separation the table makes with its own ground: it is
     the regional economy, not PIC's performance, and this page exists partly to refuse
     the averaging of the two. */
  el("line", {x1: m.l, y1: RULE, x2: m.l + w, y2: RULE,
    stroke: "rgba(255,255,255,.24)", "stroke-width": 1}, svg);

  /* The key, so the strip reads cold from its own labels. Three items on one row at 700
     units; stacked on the phone, where one row of three overruns the column. The advance
     is the label's MEASURED width, not a character count times a guessed per-character
     width: this face is proportional, and the estimate that got the first draft here was
     out by a third on the longest of the three. */
  const KEY = [["public", "computed from a public record"],
               ["vault", "not published here"], ["context", "cluster context"]];
  let kx = m.l;
  KEY.forEach(([status, label], i) => {
    const ky = M ? 292 + i * 22 : 220, x = M ? m.l : kx;
    openCell(svg, status, x, ky - 11, 13);
    kx = x + 19 + txt(svg, label,
      {x: x + 19, y: ky, "font-size": 14, fill: O_MUTE}).getComputedTextLength() + 26;
  });
}
drawOpen();
/* The strip re-lays itself out at the breakpoint. The two charts below it are drawn once,
   as they always were; changing that is a separate job and not this one. */
MOBILE.addEventListener ? MOBILE.addEventListener("change", drawOpen)
                        : MOBILE.addListener(drawOpen);
/* A viewBox measured from the rail goes stale when the rail changes, which the
   breakpoint listener alone does not catch. Debounced. */
{ let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(drawOpen, 150); }); }

/* ------------------------------------------------------------------- hero stat row
   Four findings, no apparatus stat. The coverage card carries the accent because
   coverage is the page's single point. */
figures([
  ["key", `${C.public} of ${C.accountable}`, "accountable rows public data can fill",
   `the other ${C.vault} are defined and blank`],
  ["", short(DEL.assigned), `of ${short(DEL.awarded)} awarded has a named recipient`,
   "an assignment test; the register records no payment"],
  ["", short(DEL.unassigned), "awarded with no recipient named yet",
   `all of it inside ${DEL.gaps.length} Ohio workstreams`],
  ["", String(TAL.polymer.at(-1).n), `polymer credentials awarded in ${TAL.year}`,
   `against a ${TAL.window.length}-year average of ` +
   `${Math.round(TAL.polymer_window.reduce((a, b) => a + b, 0) / TAL.window.length)}`],
]);

/* ==================================================================== 1. the scorecard
   Eight columns is a lot, and the DEFINITION column is the reason the page exists: an EOS
   row without an operational definition is a number two people compute differently. It
   gets the widest column and every other column is squeezed around it.

   Each cell carries data-l with its column name. Below 760px the CSS turns every row into
   a card and prints those labels, which is the per-form mobile re-layout for a matrix
   (chart-craft § mobile) — never a sideways scroll, because the evidence is the cells. */
const COLS = [
  ["Metric", "metric"], ["Definition", "def"], ["Owner", "own"], ["Cadence", "cad"],
  ["Target", "tgt"], ["Current", "cur"], ["Trend", "trend"], ["Source", "srcc"],
];
const STATUS = {
  public: {k: "Computed from a public record", cls: "s-public"},
  vault: {k: "Awaiting a private copy of this page", cls: "s-vault"},
  context: {k: "Cluster context, read-only", cls: "s-context"},
};

document.getElementById("boardlegend").innerHTML = [
  `<span><i class="sw-public"></i>Computed from a public federal or state record</span>`,
  `<span><i class="sw-vault"></i>Not published here: the measurement is in PIC&rsquo;s own registers</span>`,
  `<span><i class="sw-context"></i>Cluster context PIC does not control</span>`,
].join("");

function cell(r, key) {
  if (key === "metric") {
    const name = r.href
      ? `<a href="${r.href}">${esc(r.metric)}</a>` : esc(r.metric);
    return `<th scope="row" data-l="Metric"><span class="m">${name}</span></th>`;
  }
  if (key === "cur") {
    /* THE EMPTY STATE. Current and trend are merged into one cell so that no dash sits in
       a trend column where a reader could take it for "flat". The words are the value. */
    if (r.status === "vault")
      return `<td class="cur empty" colspan="2" data-l="Current">
        <span class="chip">Not published here</span>
        <span class="s">no figure exists in this repository</span></td>`;
    return `<td class="cur" data-l="Current"><b>${esc(r.current)}</b>` +
           (r.sub ? `<span class="s">${esc(r.sub)}</span>` : "") + `</td>`;
  }
  if (key === "trend")
    return r.status === "vault" ? "" : `<td class="trend" data-l="Trend">${esc(r.trend)}</td>`;
  const v = {def: r.definition, own: r.owner, cad: r.cadence, tgt: r.target,
             srcc: r.source}[key];
  const label = COLS.find(c => c[1] === key)[0];
  return `<td class="${key}" data-l="${label}">${esc(v)}</td>`;
}

const groupHead = g => {
  const rows = ROWS.filter(r => r.group === g.key);
  const filled = rows.filter(r => r.status === "public").length;
  const tally = g.key === "D"
    ? `${rows.length} rows, none of them PIC&rsquo;s to move`
    : `${filled} of ${rows.length} rows carry a figure`;
  return `<tr class="grp grp-${g.key}"><th colspan="8" scope="colgroup">
    <span class="gk">${g.key}</span>
    <span class="gt">${esc(g.title)}</span>
    <span class="gn">${tally}</span>
    <span class="gb">${g.blurb}</span></th></tr>`;
};

document.getElementById("board").innerHTML = `
  <table class="sc">
    <caption>PIC scorecard, version ${D.version}. Register as of ${D.meta.fetched};
      education data ${TAL.year}.</caption>
    <thead><tr>${COLS.map(([t]) =>
      `<th scope="col" class="h-${t.toLowerCase()}">${t}</th>`).join("")}</tr></thead>
    ${D.groups.map(g => `<tbody class="g-${g.key}">
      ${groupHead(g)}
      ${ROWS.filter(r => r.group === g.key).map(r =>
        `<tr class="r ${STATUS[r.status].cls}">
           ${COLS.map(([, k]) => cell(r, k)).join("")}</tr>`).join("")}
    </tbody>`).join("")}
  </table>`;

document.getElementById("boardsrc").innerHTML =
  `${D.meta.source} One row is ${D.meta.row} <b>${D.meta.caution}</b>`;

/* ============================================================== 2. award delivery
   One dollar scale across all three awards, so the reader sees that the two fully
   assigned awards are also the two largest and smallest. The hatch is the argument. */
function hatch(svg, id) {
  const defs = el("defs", {}, svg);
  const p = el("pattern", {id, width: 7, height: 7, patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)"}, defs);
  el("rect", {width: 7, height: 7, fill: "#EFEAE2"}, p);
  el("line", {x1: 0, y1: 0, x2: 0, y2: 7, stroke: "#9A9284", "stroke-width": 2.6}, p);
}

const maxAward = Math.max(...DEL.sources.map(s => s.award));

function deliveryDesktop() {
  const m = {t: 92, r: 232, b: 68, l: 196}, rowH = 62;
  const {svg, w, h} = chart("delivery", {W: 1100, rows: DEL.sources.length, rowH, m});
  hatch(svg, "schatch");
  const xs = v => m.l + (v / maxAward) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(0, maxAward, 4), yt: [],
    xfmt: short, xlab: "Dollars awarded, all three awards on one scale"});

  DEL.sources.forEach((s, i) => {
    const y = m.t + i * rowH + 13, bh = 26;
    el("rect", {x: m.l, y, width: Math.max(3, xs(s.assigned) - m.l), height: bh,
      fill: INK, rx: 3}, svg);
    if (s.unassigned > 0)
      el("rect", {x: xs(s.assigned), y, width: xs(s.award) - xs(s.assigned), height: bh,
        fill: "url(#schatch)", stroke: "#9A9284", "stroke-width": 1,
        "stroke-dasharray": "4 3", rx: 3}, svg);
  });

  /* Labels after every filled mark, so nothing is drawn over. */
  DEL.sources.forEach((s, i) => {
    const y = m.t + i * rowH + 13, bh = 26;
    txt(svg, s.short, {x: m.l - 14, y: y + 12, "text-anchor": "end", class: "pv-lab"});
    txt(svg, `${short(s.award)} awarded`, {x: m.l - 14, y: y + 29,
      "text-anchor": "end", class: "pv-labq"});
    txt(svg, s.unassigned ? `${short(s.assigned)} named` : "fully assigned",
      {x: xs(s.award) + 14, y: y + 12, class: "pv-lab"});
    txt(svg, s.unassigned ? `${short(s.unassigned)} not yet named`
                          : "every dollar has a recipient",
      {x: xs(s.award) + 14, y: y + 29, class: "pv-labq",
       fill: s.unassigned ? "#7A7263" : "var(--pv-muted)"});
  });

  /* No leader line to the Ohio hatch. The first version drew one and it crossed the EDA
     bar above it, which a screenshot showed and the collision gate did not: collide.mjs
     compares text against text, never a rule against a mark. The Ohio row is already
     labelled at both ends, so the leader was buying nothing. */
  txt(svg, `The whole ${short(DEL.unassigned)} without a named recipient is Ohio money.`,
    {x: m.l - 196, y: 34, class: "pv-lab"});
  txt(svg, DEL.gaps.map(g => `${g.name} holds ${short(g.gap)}`).join("; ") + ".",
    {x: m.l - 196, y: 55, class: "pv-labq"});

  DEL.sources.forEach((s, i) => {
    hoverable(el("rect", {x: 0, y: m.t + i * rowH, width: 1100, height: rowH,
      fill: "transparent"}, svg),
      `<b>${s.name}</b><br><span class="v">${usd(s.award)}</span> awarded<br>
       ${usd(s.assigned)} on an executed line with a named recipient<br>
       ${s.unassigned ? usd(s.unassigned) + " with no recipient named yet"
                      : "every dollar is assigned"}`,
      `${s.name}: ${usd(s.award)} awarded, ${usd(s.assigned)} with a named recipient`);
  });
}

/* THE PHONE ROW IS SPACED FROM THE MEASURED LINE BOX, NOT FROM A GUESSED LEADING.
   Every row here printed its own award name on top of its own dollar figure at all seven
   sweep widths below 761px. The two baselines sat 15 units apart while the shared sheet
   raises .pv-lab to 16 units below 760px, and a 16-unit face occupies about 18.8 units
   from ascender to descender, so the pair could not clear by construction. The overlap
   measured 3.2 rendered px at 360 and 5.6 at 700 (this chart keeps a fixed 375-unit
   viewBox, so the scale runs 0.85 to 1.76 across the band and the same 3.7 units of
   overlap arrive as different pixel counts). It was invisible at 1440 because the desktop
   draw is a different function, with a 14.2-unit face on 17 units of lead, which clears.
   Pre-existing; found by collide.mjs --sweep on 2026-08-28.

   Nothing below is a constant. The two faces are measured, the name and its amount share
   a line when the two rendered strings fit the column and stack when they do not, the bar
   and the status line hang off those measurements, and the row height falls out of the
   arithmetic rather than being asserted ahead of it. A breakpoint here would be a guess
   about strings nobody had measured. */
function deliveryMobile() {
  const m = {t: 70, r: 12, b: 34, l: 12};
  const W = 375, w = W - m.l - m.r;
  const {svg} = chart("delivery", {W, H: 400, m});    // provisional; height known below
  hatch(svg, "schatch");
  const xs = v => m.l + (v / maxAward) * w;

  /* Ascent and descent of the live faces. getBBox reports user units, and the viewBox is
     in those same units, so every gap below is in one currency. */
  const face = cls => {
    const n = txt(svg, "Hg$0", {x: 0, y: 0, class: cls});
    const b = n.getBBox();
    svg.removeChild(n);
    return {up: -b.y, down: b.y + b.height};
  };
  const measure = (s, cls) => {
    const n = txt(svg, s, {x: 0, y: -999, class: cls});
    const v = n.getComputedTextLength();
    svg.removeChild(n);
    return v;
  };
  const LAB = face("pv-lab"), Q = face("pv-labq");
  const GAP = 10;                          // between a name and its amount on one line
  const LEAD = LAB.down + Q.up + 2;        // baseline to baseline when the pair stacks
  const barH = 18, air = 8;                // the bar, and the air above and below it

  const rows = DEL.sources.map(s => {
    const amt = `${short(s.award)} awarded`;
    return {s, amt, nw: measure(s.short, "pv-lab"), aw: measure(amt, "pv-labq")};
  });
  /* One template for all three rows, so the rows stay aligned: if any name and amount
     cannot share a line, every pair stacks. Today all three fit; the widest, "Good Jobs
     Challenge (APEX)" with its amount, uses 340 of the 351 units available. */
  const stack = rows.some(r => r.nw + GAP + r.aw > w);

  const nameY = LAB.up + 2;                          // all four offsets are row-relative
  const amtY = stack ? nameY + LEAD : nameY;
  const barY = amtY + Q.down + air;
  const statY = barY + barH + air + Q.up;
  /* The gap between rows is twice the gap inside one, so a status line reads as belonging
     to the bar above it rather than to the name below it. */
  const rowH = Math.ceil(statY + Q.down + 2 * air);
  const H = m.t + rows.length * rowH + m.b;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  rows.forEach(({s, amt, nw}, i) => {
    const y = m.t + i * rowH;
    el("rect", {x: m.l, y: y + barY, width: Math.max(3, xs(s.assigned) - m.l),
      height: barH, fill: INK, rx: 3}, svg);
    if (s.unassigned > 0)
      el("rect", {x: xs(s.assigned), y: y + barY, width: xs(s.award) - xs(s.assigned),
        height: barH, fill: "url(#schatch)", stroke: "#9A9284", "stroke-width": 1,
        "stroke-dasharray": "4 3", rx: 3}, svg);
    txt(svg, s.short, {x: m.l, y: y + nameY, class: "pv-lab"});
    txt(svg, amt, {x: stack ? m.l : m.l + nw + GAP, y: y + amtY, class: "pv-labq"});
    txt(svg, s.unassigned ? `${short(s.assigned)} named, ${short(s.unassigned)} not yet`
                          : "fully assigned to named recipients",
      {x: m.l, y: y + statY, class: "pv-labq"});
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, svg),
      `<b>${s.name}</b><br><span class="v">${usd(s.award)}</span> awarded<br>
       ${usd(s.assigned)} with a named recipient`,
      `${s.name}: ${usd(s.award)} awarded, ${usd(s.assigned)} with a named recipient`);
  });
  /* The reading pair above the rows takes the same measured leading. It sat on 20 units,
     which cleared by 1.1px at 360 and would have been the next row of this same defect. */
  txt(svg, "Solid is money with a named recipient.",
    {x: m.l, y: LAB.up + 4, class: "pv-lab"});
  txt(svg, `Hatched is the ${short(DEL.unassigned)} without one.`,
    {x: m.l, y: LAB.up + 4 + LEAD, class: "pv-labq"});
}

(MOBILE.matches ? deliveryMobile : deliveryDesktop)();

document.getElementById("deliverytable").innerHTML = tableView("del",
  "Every public award, the dollars on an executed line naming their holder, and the "
  + "balance with no recipient named yet.",
  ["Award", "Awarded", "Named recipient", "Not yet named", "Share named"],
  DEL.sources.map(s => [s.name, usd(s.award), usd(s.assigned),
    s.unassigned ? usd(s.unassigned) : "none", s.pct.toFixed(1) + "%"]));

document.getElementById("deliverysrc").innerHTML =
  `PIC award register as of ${D.meta.fetched}, verified against the signed federal `
  + `Notices of Award and the executed state grant agreement. Match and cost share are `
  + `excluded from these bars: they are committed by partners, not awarded to PIC. `
  + `<b>These are commitments, not payments.</b>`;

/* ================================================================== 3. talent
   One series, ten years, change over time: columns. Two years are drawn pale because the
   file repeats itself across them and this page does not read them. */
const EXCLUDED = [2019, 2020];
const tal = TAL.polymer;

function talentDesktop() {
  const m = {t: 96, r: 34, b: 70, l: 82}, W = 1100, H = 430;
  const {svg, w, h} = chart("talent", {W, H, m});
  const maxV = Math.max(...tal.map(p => p.n)) * 1.2;
  const bw = w / tal.length;
  const xs = i => m.l + i * bw;
  const ys = v => m.t + h - (v / maxV) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs: i => xs(i) + bw / 2, ys,
    xt: tal.map((_, i) => i), xfmt: i => tal[i].year, yt: ticks(0, maxV, 5),
    ylab: "Credentials awarded. Higher is more graduates"});

  tal.forEach((p, i) => {
    const pale = EXCLUDED.includes(p.year);
    el("rect", {x: xs(i) + 9, y: ys(p.n), width: bw - 18, height: m.t + h - ys(p.n),
      fill: pale ? SEQ[1] : INK, rx: 4}, svg);
  });
  tal.forEach((p, i) => {
    txt(svg, String(p.n), {x: xs(i) + bw / 2, y: ys(p.n) - 9, "text-anchor": "middle",
      class: "pv-lab", fill: EXCLUDED.includes(p.year) ? "var(--pv-muted)" : undefined});
  });

  /* The annotation names its own year and both values, so it needs no leader. The first
     version drew one down the right-hand side of the plot and a screenshot showed it
     connecting the text to nothing a reader could follow. */
  const i22 = tal.findIndex(p => p.year === 2022);
  txt(svg, `Credentials more than halved in ${tal[i22].year}, from `
    + `${tal[i22 - 1].n} to ${tal[i22].n}, and ${tal.at(-1).year} recovered only to `
    + `${tal.at(-1).n}.`, {x: m.l + 4, y: 30, class: "pv-lab"});
  txt(svg, `The two pale columns repeat each other in the source file, so this page `
    + `reads ${TAL.window[0]} to ${TAL.window.at(-1)} instead.`,
    {x: m.l + 4, y: 52, class: "pv-labq"});

  tal.forEach((p, i) => {
    hoverable(el("rect", {x: xs(i), y: m.t, width: bw, height: h, fill: "transparent"},
      svg),
      `<b>${p.year}</b><br><span class="v">${p.n}</span> polymer credentials` +
      (EXCLUDED.includes(p.year) ? "<br>repeated in the source file; not read here" : ""),
      `${p.year}: ${p.n} polymer credentials`);
  });
}

function talentMobile() {
  const m = {t: 62, r: 12, b: 30, l: 12}, W = 375, rowH = 36;
  const H = m.t + tal.length * rowH + m.b;
  const {svg, w} = chart("talent", {W, H, m});
  const maxV = Math.max(...tal.map(p => p.n)) * 1.04;
  const xs = v => m.l + (v / maxV) * w;
  tal.forEach((p, i) => {
    const y = m.t + i * rowH, pale = EXCLUDED.includes(p.year);
    el("rect", {x: m.l, y: y + 17, width: Math.max(3, xs(p.n) - m.l), height: 13,
      fill: pale ? SEQ[1] : INK, rx: 3}, svg);
    txt(svg, `${p.year} · ${p.n}${pale ? " · repeated, not read" : ""}`,
      {x: m.l, y: y + 12, class: "pv-labq"});
    hoverable(el("rect", {x: 0, y, width: W, height: rowH, fill: "transparent"}, svg),
      `<b>${p.year}</b><br><span class="v">${p.n}</span> polymer credentials`,
      `${p.year}: ${p.n} polymer credentials`);
  });
  txt(svg, "Polymer credentials, all levels, by year.", {x: m.l, y: 22, class: "pv-lab"});
  txt(svg, `Longer is more graduates. ${tal.at(-1).n} in ${tal.at(-1).year}.`,
    {x: m.l, y: 42, class: "pv-labq"});
}

(MOBILE.matches ? talentMobile : talentDesktop)();

document.getElementById("talenttable").innerHTML = tableView("tal",
  "Credentials awarded by the three regional institutions in polymer CIP codes, by "
  + "federal reporting year. The 2019 and 2020 rows repeat each other in the source file.",
  ["Year", "Polymer credentials"],
  tal.map(p => [String(p.year) + (EXCLUDED.includes(p.year) ? " (repeated)" : ""),
    String(p.n)]));

document.getElementById("talentsrc").innerHTML =
  `IPEDS completions through ${TAL.year}, ${TAL.institutions} regional institutions, `
  + `read from the occupations page&rsquo;s shipped dataset. <b>${D.meta.excludes}</b>`;

/* Generated methodology box, then the closer. The page is not county-scoped as a whole —
   the award rows have no county at all — so no footprint banner is drawn; the two rows
   that are county-scoped name PIC-12 in their own source cell. */
await PV.methodology({
  page: "scorecard",
  meta: D.meta,
  definitions: `A row is accountable when PIC controls what is measured, and context when `
    + `it does not. Of the ${C.rows} rows, ${C.accountable} are accountable and `
    + `${C.context} are context. Public data fills ${C.public} of the accountable rows, `
    + `and the remaining ${C.vault} are published as defined empty slots. `
    + `${C.owners_assigned === 0 ? "No row names an owner"
        : C.owners_assigned + " rows name an owner"}, and ${C.targets_set} carry a `
    + `target, every one of those a ceiling fixed by a signed award document rather `
    + `than an ambition PIC has set.`,
});
})();
