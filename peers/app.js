/* National position. The design problem here is suppression: a rank computed from what
   BLS discloses omits Chicago, New York and Atlanta. So the state chart (51/51 disclosed)
   carries the claim, the metro chart carries the interest with its bound drawn on it, and
   a third chart shows how much of the country is invisible. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, CAT, GRAY, INK} = PV;
const D = await PV.data("peers.json");
const FP = PV.footprint(D.meta);
const N = n => Math.round(n).toLocaleString("en-US");
const short = v => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : String(Math.round(v));
const S = D.states["326"], M = D.metros["326"];
const AKRON = M.subject;
const shortName = s => s.split(",")[0].split("-")[0];

PV.figures([
  ["key", "#" + S.rank_emp, "Ohio, nationally", `${N(S.subject_emp)} jobs · all ${S.of_disclosed} states disclosed`],
  ["", S.subject_lq.toFixed(2) + "×", "Ohio concentration", "against the national share"],
  ["", `#${M.rank_emp}`, `Akron, of ${M.of_disclosed} disclosed`,
   `${M.suppressed} metros withhold — their rank is unknown, not estimated`],
  ["", M.subject_lq.toFixed(2) + "×", "Akron concentration", `on ${N(M.subject_emp)} jobs`]
]);

/* ------------------------------------------------------------- 1. states */
{
  const rows = S.top.slice(0, 20);
  const {svg, W, H, m, w, h} = PV.chart("states", {W: 1100, rows: rows.length, rowH: 28, m: {t: 40, r: 105, b: 56, l: 100}});
  const maxV = rows[0].emp;
  const xs = v => m.l + (v / maxV) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(0, maxV, 5), yt: [],
    xfmt: short, xlab: "Plastics and rubber products jobs"});
  rows.forEach((r, i) => {
    const y = m.t + i * 28 + 4, bh = 18;
    const isOh = r.area === S.subject;
    // emphasis, not categorical: one bar is the subject, the rest are context
    el("rect", {x: m.l, y, width: Math.max(3, xs(r.emp) - m.l), height: bh,
      fill: isOh ? SEQ[5] : SEQ[2], rx: 4}, svg);
    el("rect", {x: m.l, y, width: 4, height: bh, fill: isOh ? SEQ[5] : SEQ[2]}, svg);
    txt(svg, shortName(r.name), {x: m.l - 12, y: y + bh - 4, "text-anchor": "end",
      class: isOh ? "pv-lab" : "pv-labq"});
    txt(svg, `${N(r.emp)}${r.lq ? `  ·  ${r.lq.toFixed(2)}×` : ""}`,
      {x: xs(r.emp) + 10, y: y + bh - 4, class: isOh ? "pv-lab" : "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 5, width: W, height: bh + 10, fill: "transparent"},
      svg), `<b>${r.name}</b><br><span class="v">${N(r.emp)}</span> jobs<br>
      <span class="v">${r.lq ? r.lq.toFixed(2) : "—"}×</span> the national share<br>
      <span class="v">${N(r.estabs)}</span> establishments`,
      `${r.name}: ${N(r.emp)} jobs`);
  });
  document.getElementById("statetitle").textContent =
    `Every state, plastics and rubber products, ${D.cross_year}`;
  document.getElementById("statesrc").innerHTML =
    `${D.meta.source}, ${D.cross_year}, private ownership. <b>All ${S.of_disclosed} states
     are disclosed and ${S.suppressed} are suppressed</b>, so this ranking is complete —
     the only one on this page that is. Ohio's ${N(S.subject_emp)} jobs are
     ${(S.subject_emp / S.top[1].emp).toFixed(2)}× the second-place state.`;
  document.getElementById("statestable").innerHTML = tableView("s",
    `Plastics and rubber products employment by state, ${D.cross_year}`,
    ["Rank", "State", "Jobs", "Establishments", "Concentration"],
    S.top.map((r, i) => [i + 1, r.name, N(r.emp), N(r.estabs),
      r.lq ? r.lq.toFixed(2) + "×" : "—"]));
}

/* -------------------------------------------------------------- 2. metros */
{
  const pts = D.metro_scatter;
  const {svg, W, H, m, w, h} = PV.chart("scatter", {W: 1100, H: 480, m: {t: 44, r: 5, b: 68, l: 28}});
  const maxE = Math.max(...pts.map(p => p.emp)), maxL = Math.max(...pts.map(p => p.lq)) * 1.05;
  const xs = v => m.l + (Math.sqrt(v) / Math.sqrt(maxE)) * w;
  const ys = v => m.t + h - (v / maxL) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys,
    xt: [0, 500, 2000, 5000, 10000, 17000].filter(v => v <= maxE),
    yt: ticks(0, maxL, 6), xfmt: short, yfmt: v => v.toFixed(0) + "×",
    xlab: "Jobs (square-root scale)", ylab: "Concentration against the national share"});
  pts.forEach(p => {
    const me = p.area === AKRON;
    hoverable(el("circle", {cx: xs(p.emp), cy: ys(p.lq), r: me ? 9 : 5,
      fill: me ? CAT[1] : SEQ[3], stroke: "var(--paper)", "stroke-width": me ? 3 : 1.5},
      svg),
      `<b>${p.name}</b><br><span class="v">${N(p.emp)}</span> jobs ·
       <span class="v">${N(p.estabs)}</span> establishments<br>
       <span class="v">${p.lq.toFixed(2)}×</span> the national share`,
      `${p.name}: ${N(p.emp)} jobs at ${p.lq.toFixed(2)}×`);
  });
  // label Akron and the handful that share its quadrant
  const notable = pts.filter(p => p.area === AKRON ||
    (p.emp >= 4000 && p.lq >= 2.2) || p.emp >= 10000).slice(0, 9);
  notable.forEach(p => {
    const me = p.area === AKRON, off = me ? 14 : 10;
    // flip to the inside when the point is close enough to the right edge that its
    // label would run past it — Los Angeles sits at the far end of the scale
    const flip = xs(p.emp) > m.l + w - 90;
    txt(svg, shortName(p.name),
      {x: xs(p.emp) + (flip ? -off : off), y: ys(p.lq) + 4,
       "text-anchor": flip ? "end" : "start",
       class: me ? "pv-lab" : "pv-labq",
       fill: me ? CAT[1] : "var(--pv-muted)"});
  });
  /* drawn last: the parity rule and its caption must sit ON TOP of the point labels,
     otherwise the backing plate is overpainted and the caption collides again */
  el("line", {x1: m.l, y1: ys(1), x2: m.l + w, y2: ys(1), stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  /* This caption has to sit over a point cloud wherever it goes — above the line it hit
     Detroit, below it hit Los Angeles. A backing plate in the page color makes the
     position a non-issue, which is what a newsroom would do rather than hunt for a gap
     that the next data vintage removes. */
  {
    const LBL = "1.0× — the national share";
    const lw = LBL.length * 6.4, lx = m.l + w - 6, ly = ys(1) - 9;
    el("rect", {x: lx - lw - 6, y: ly - 13, width: lw + 12, height: 19,
      fill: "var(--paper)", opacity: .92, rx: 3}, svg);
    txt(svg, LBL, {x: lx, y: ly, "text-anchor": "end", class: "pv-lab", "data-pv-plated": "1",
      fill: "var(--hover)"});
  }

  document.getElementById("metrotitle").textContent =
    `Akron among the ${M.of_disclosed} metros we can see, ${D.cross_year}`;
  document.getElementById("scattertable").innerHTML = tableView("m",
    `Metro plastics and rubber, ${D.cross_year} — top 25 disclosed by employment`,
    ["Rank", "Metro", "Jobs", "Establishments", "Concentration"],
    M.top.map((r, i) => [i + 1, r.name, N(r.emp), N(r.estabs),
      r.lq ? r.lq.toFixed(2) + "×" : "—"]));
  document.getElementById("bound").innerHTML =
    `<b>Why this says "${M.rank_emp}th of ${M.of_disclosed} disclosed" and not
     "${M.rank_emp}th nationally".</b>
     Akron ranks <b>${M.rank_emp} of the ${M.of_disclosed} metros that disclose</b>.
     <b>${M.suppressed} metros withhold</b> — including
     ${M.could_displace.slice(0, 4).map(x => shortName(x.name)).join(", ")} — and BLS will
     not say how many jobs any of them has.
     <b>An earlier version of this page bounded the rank at ${M.rank_emp}th to
     ${M.rank_emp + M.could_displace_n}th</b> by counting only the suppressed metros with
     more establishments than Akron's ${N(M.subject_estabs)}. Two independent reviews
     killed it, correctly: <b>establishment count does not bound employment.</b> A
     suppressed metro with forty large plants beats Akron on jobs while having fewer
     establishments than Akron does. The true worst case is ${M.rank_emp}th of
     ${M.of_disclosed + M.suppressed}, which is not a useful sentence.
     <b>So the claim is the narrow one: ${M.rank_emp}th among those that disclose.</b>
     Not a national rank, and not dressed up as one.`;
}

/* ---------------------------------------------------------- 3. visibility */
{
  const V = D.visibility, keys = ["state", "metro", "county"];
  const {svg, W, H, m, w, h} = PV.chart("vis", {W: 1100, H: 250, m: {t: 44, r: 97, b: 56, l: 92}});
  const bh = 34, gap = (h - keys.length * bh) / (keys.length - 1);
  keys.forEach((k, i) => {
    const v = V[k], tot = v.disclosed + v.suppressed, y = m.t + i * (bh + gap);
    const dw = (v.disclosed / tot) * w;
    el("rect", {x: m.l, y, width: dw, height: bh, fill: SEQ[4], rx: 4}, svg);
    el("rect", {x: m.l, y, width: 4, height: bh, fill: SEQ[4]}, svg);
    // 2px surface gap, then the suppressed remainder as texture — never a solid block.
    // States are 100% disclosed, so there is no remainder to draw at all.
    const rem = w - dw - 2;
    if (rem > 0)
      el("rect", {x: m.l + dw + 2, y, width: rem, height: bh, fill: "url(#supp)", rx: 4}, svg);
    txt(svg, k === "state" ? "States" : k === "metro" ? "Metro areas" : "Counties",
      {x: m.l - 12, y: y + bh / 2 + 5, "text-anchor": "end", class: "pv-lab"});
    txt(svg, `${v.disclosed} shown`, {x: m.l + 12, y: y + bh / 2 + 5, class: "pv-lab",
      fill: "#fff"});
    txt(svg, `${v.suppressed} withheld`, {x: m.l + w + 12, y: y + bh / 2 + 5,
      class: "pv-labq"});
    hoverable(el("rect", {x: 0, y: y - 4, width: W, height: bh + 8, fill: "transparent"},
      svg), `<b>${k}</b><br><span class="v">${v.disclosed}</span> disclosed of
      <span class="v">${tot}</span> (${Math.round(v.disclosed / tot * 100)}%)<br>
      withheld areas hold <span class="v">${N(v.suppressed_estabs)}</span> establishments`,
      `${k}: ${v.disclosed} of ${tot} disclosed`);
  });
  const defs = el("defs", {}, svg);
  const pat = el("pattern", {id: "supp", width: 8, height: 8,
    patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)"}, defs);
  el("rect", {width: 8, height: 8, fill: "#F2EFE9"}, pat);
  el("line", {x1: 0, y1: 0, x2: 0, y2: 8, stroke: "#C9C3B8", "stroke-width": 3}, pat);
  document.getElementById("vissrc").innerHTML =
    `BLS withholds any cell that could identify an individual employer. For plastics and
     rubber that leaves <b>${V.metro.disclosed} of ${V.metro.disclosed + V.metro.suppressed}
     metros</b> and <b>${V.county.disclosed} of ${V.county.disclosed + V.county.suppressed}
     counties</b> visible. The withheld areas are not empty — they hold
     <b>${N(V.metro.suppressed_estabs)}</b> establishments between them at metro level.
     States are the exception and that is why the first chart on this page is the one to
     quote.`;
  document.getElementById("vistable").innerHTML = tableView("v",
    `Disclosure by geography level, NAICS 326, ${D.cross_year}`,
    ["Level", "Disclosed", "Withheld", "Share visible", "Establishments withheld"],
    keys.map(k => { const v = V[k], t = v.disclosed + v.suppressed;
      return [k, v.disclosed, v.suppressed, Math.round(v.disclosed / t * 100) + "%",
              N(v.suppressed_estabs)]; }));
}

/* -------------------------------------------------------------- 4. trend */
{
  const all = Object.values(D.trend).filter(t => t.naics === "326");
  const akron = all.find(t => t.area === AKRON);
  const peers = all.filter(t => t.area !== AKRON)
    .sort((a, b) => b.series.at(-1).emp - a.series.at(-1).emp).slice(0, 8);
  let picked = peers[0] ? peers[0].area : null;
  const picker = document.getElementById("picker");
  picker.innerHTML = peers.map(p =>
    `<button class="pick" type="button" data-a="${p.area}" aria-pressed="${p.area === picked}">
       ${shortName(p.name)}</button>`).join("");

  function draw() {
    const {svg, W, H, m, w, h} = PV.chart("trend", {W: 1100, H: 400, m: {t: 40, r: 128, b: 62, l: 34}});
    const shown = [akron, ...peers];
    const yrs = [...new Set(shown.flatMap(t => t.series.map(s => s.year)))].sort();
    const maxV = Math.max(...shown.flatMap(t => t.series.map(s => s.emp))) * 1.06;
    const xs = y => m.l + ((y - yrs[0]) / (yrs.at(-1) - yrs[0])) * w;
    const ys = v => m.t + h - (v / maxV) * h;
    frame(svg, {x: m.l, y: m.t, w, h, xs, ys, xt: yrs.filter((_, i) => i % 2 === 0),
      yt: ticks(0, maxV, 5), xfmt: v => v, yfmt: short,
      xlab: "Year", ylab: "Plastics and rubber jobs"});
    const ends = [];
    shown.forEach(t => {
      const on = t.area === AKRON || t.area === picked;
      const s = t.series;
      el("path", {d: "M" + s.map(p => `${xs(p.year)},${ys(p.emp)}`).join("L"), fill: "none",
        stroke: t.area === AKRON ? CAT[1] : (on ? INK : GRAY),
        "stroke-width": on ? 3 : 1.2, opacity: on ? 1 : .35}, svg);
      if (on) ends.push({t, y: ys(s.at(-1).emp), on});
      if (on) s.forEach(p => hoverable(
        el("circle", {cx: xs(p.year), cy: ys(p.emp), r: 4.5,
          fill: t.area === AKRON ? CAT[1] : INK, stroke: "var(--paper)",
          "stroke-width": 1.5}, svg),
        `<b>${t.name}, ${p.year}</b><br><span class="v">${N(p.emp)}</span> jobs<br>
         <span class="v">${p.lq ? p.lq.toFixed(2) : "—"}×</span> the national share`,
        `${t.name} ${p.year}: ${N(p.emp)} jobs`));
    });
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++)
      if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;
    ends.forEach(e => txt(svg, `${shortName(e.t.name)} · ${short(e.t.series.at(-1).emp)}`,
      {x: m.l + w + 12, y: e.y + 4, class: "pv-lab",
       fill: e.t.area === AKRON ? CAT[1] : INK}));
    document.getElementById("trendtitle").textContent =
      `Akron against its real peers, ${yrs[0]}–${yrs.at(-1)}`;
    const p = peers.find(x => x.area === picked);
    document.getElementById("trendtable").innerHTML = tableView("t",
      `Employment over time — Akron and ${p ? shortName(p.name) : "peers"}`,
      ["Year", "Akron", p ? shortName(p.name) : "—"],
      yrs.map(y => [y,
        (akron.series.find(s => s.year === y) || {}).emp
          ? N(akron.series.find(s => s.year === y).emp) : "withheld",
        p && (p.series.find(s => s.year === y) || {}).emp
          ? N(p.series.find(s => s.year === y).emp) : "withheld"]));
  }
  picker.querySelectorAll(".pick").forEach(b => b.addEventListener("click", () => {
    picked = b.dataset.a;
    picker.querySelectorAll(".pick").forEach(x =>
      x.setAttribute("aria-pressed", String(x.dataset.a === picked)));
    draw();
  }));
  draw();
  addEventListener("resize", draw, {passive: true});
}

document.getElementById("closersub").innerHTML =
  `Ohio's first place is complete and quotable &mdash; in <b>NAICS 326, private ownership,
   ${D.cross_year}</b>, and that clause has to travel with it. Akron's placement is
   <b>${M.rank_emp}th among the ${M.of_disclosed} metros that disclose</b>, which is a
   smaller claim than a national rank and is the only one the data supports.
   <b>Both are worth saying; neither survives being said the larger way.</b>`;

/* Footprint banner — stated on the page, not left to the reader to infer. */
PV.footprintBanner(FP);

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "peers", meta: D.meta});
})();
