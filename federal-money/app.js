/* Federal obligations. Two different scopes live in this file — polymer-NAICS rows and
   all-industry county rows — and they are an order of magnitude apart. They are never
   summed and never share a chart; the county figures appear only as stated context. */
(async () => {
"use strict";
const {el, txt, ticks, frame, hoverable, tableView, SEQ, CAT, INK} = PV;
const D = await PV.data("federal.json");
const usd = v => "$" + Math.round(v).toLocaleString("en-US");
const short = v => v >= 1e9 ? "$" + (v / 1e9).toFixed(1) + "B"
                 : v >= 1e6 ? "$" + (v / 1e6).toFixed(v % 1e6 ? 1 : 0) + "M"
                 : "$" + Math.round(v / 1e3) + "k";

const byFy = {};
D.naics.forEach(r => byFy[r.fy] = (byFy[r.fy] || 0) + r.amount);
/* Dollars from different years are different dollars. Anything summed across fiscal
   years below uses the CPI-adjusted column; single-year figures stay nominal, because
   restating one year against itself adds nothing. */
const byFyReal = {};
D.naics.forEach(r => byFyReal[r.fy] = (byFyReal[r.fy] || 0) + r.real);
const totalReal = Object.values(byFyReal).reduce((a, b) => a + b, 0);
const fys = Object.keys(byFy).map(Number).sort();
const total = Object.values(byFy).reduce((a, b) => a + b, 0);

const byCode = {};
D.naics.forEach(r => {
  byCode[r.code] = byCode[r.code] || {code: r.code, name: r.name, amount: 0, years: new Set()};
  byCode[r.code].amount += r.amount;
  byCode[r.code].real = (byCode[r.code].real || 0) + r.real;
  byCode[r.code].years.add(r.fy);
});
const codes = Object.values(byCode).sort((a, b) => b.real - a.real);
const top = codes[0];

PV.figures([
  ["key", short(totalReal), `over ${fys.length} years, in ${D.meta.cpi_base} dollars`,
   `${short(total)} as awarded — the nominal sum understates by ${Math.round((totalReal / total - 1) * 100)}%`],
  ["", short(totalReal / fys.length), "a year on average", `across FY${fys[0]}–FY${fys.at(-1)}, ${D.meta.cpi_base} dollars`],
  ["", short(top.real), top.name.split("(")[0].trim().toLowerCase(),
   `${Math.round(top.real / totalReal * 100)}% of the adjusted total`],
  ["", codes.length, "industry codes", "receiving anything at all"]
]);

/* ------------------------------------------------------------- 1. by year */
{
  const {svg, W, H, m, w, h} = PV.chart("fy", {W: 1100, H: 380, m: {t: 40, r: 0, b: 66, l: 44}});
  const maxV = Math.max(...Object.values(byFy)) * 1.08;
  const bw = w / fys.length;
  const xs = i => m.l + i * bw;
  const ys = v => m.t + h - (v / maxV) * h;
  frame(svg, {x: m.l, y: m.t, w, h, xs: i => xs(i) + bw / 2, ys,
    xt: fys.map((_, i) => i), xfmt: i => "FY" + fys[i], yt: ticks(0, maxV, 5),
    yfmt: short, ylab: "Obligations, polymer NAICS"});
  const mean = total / fys.length;
  el("line", {x1: m.l, y1: ys(mean), x2: m.l + w, y2: ys(mean), stroke: "var(--hover)",
    "stroke-width": 1.5}, svg);
  txt(svg, `eight-year average ${short(mean)}`, {x: m.l + 8, y: ys(mean) - 8,
    class: "pv-lab", fill: "var(--hover)"});
  fys.forEach((fy, i) => {
    const v = byFy[fy], x = xs(i) + 7, bwi = bw - 14;
    el("rect", {x, y: ys(v), width: bwi, height: m.t + h - ys(v), fill: SEQ[4], rx: 4}, svg);
    el("rect", {x, y: m.t + h - 5, width: bwi, height: 5, fill: SEQ[4]}, svg);
    txt(svg, short(v), {x: x + bwi / 2, y: ys(v) - 9, "text-anchor": "middle",
      class: "pv-lab"});
    const inFy = D.naics.filter(r => r.fy === fy).sort((a, b) => b.amount - a.amount);
    hoverable(el("rect", {x, y: m.t, width: bwi, height: h, fill: "transparent"}, svg),
      `<b>FY${fy}</b><br>total <span class="v">${usd(v)}</span><br>` +
      inFy.slice(0, 3).map(r => `${r.name.split("(")[0].trim()}:
        <span class="v">${short(r.amount)}</span>`).join("<br>"),
      `FY${fy}: ${usd(v)}`);
  });
  document.getElementById("fysrc").innerHTML =
    `${D.meta.source}. ${D.meta.row}. <b>${D.meta.caution}</b> FY2026 is partial — the
     federal year is not closed, so its bar is a running total and not comparable to the
     others. ${D.meta.scope}`;
  document.getElementById("fytable").innerHTML = tableView("y",
    "Federal polymer obligations by fiscal year", ["Fiscal year", "Obligations"],
    fys.map(fy => ["FY" + fy, usd(byFy[fy])]));
}

/* ------------------------------------------------------------ 2. by NAICS */
{
  const rows = codes.slice(0, 12);
  const {svg, W, H, m, w, h} = PV.chart("na", {W: 1100, rows: rows.length, rowH: 32, m: {t: 36, r: 60, b: 56, l: 455}});
  const maxV = rows[0].amount;
  const xs = v => m.l + (v / maxV) * w;
  frame(svg, {x: m.l, y: m.t, w, h, xs, ys: () => 0, xt: ticks(0, maxV, 5), yt: [],
    xfmt: short, xlab: `Obligations, FY${fys[0]}–FY${fys.at(-1)} combined`});
  rows.forEach((r, i) => {
    const y = m.t + i * 32 + 6, bh = 20;
    // one series, one color — a value ramp here would double-encode bar length
    el("rect", {x: m.l, y, width: Math.max(3, xs(r.amount) - m.l), height: bh,
      fill: SEQ[4], rx: 4}, svg);
    el("rect", {x: m.l, y, width: 4, height: bh, fill: SEQ[4]}, svg);
    txt(svg, r.name.split("(")[0].trim(), {x: m.l - 12, y: y + bh - 4,
      "text-anchor": "end", class: "pv-labq"});
    txt(svg, short(r.amount), {x: xs(r.amount) + 10, y: y + bh - 4, class: "pv-lab"});
    hoverable(el("rect", {x: 0, y: y - 6, width: W, height: bh + 12, fill: "transparent"},
      svg), `<b>${r.code} — ${r.name}</b><br><span class="v">${usd(r.amount)}</span>
      across <span class="v">${r.years.size}</span> fiscal years`,
      `${r.name}: ${usd(r.amount)}`);
  });
  document.getElementById("natitle").textContent =
    `Which industries the money goes to, FY${fys[0]}–FY${fys.at(-1)}`;
  document.getElementById("natable").innerHTML = tableView("n",
    "Federal polymer obligations by industry code",
    ["NAICS", "Industry", "Obligations", "Years active"],
    codes.map(r => [r.code, r.name, usd(r.amount), r.years.size]));

  const counties = {};
  D.counties.forEach(r => counties[r.county] = (counties[r.county] || 0) + r.amount);
  const allInd = Object.values(counties).reduce((a, b) => a + b, 0);
  document.getElementById("caveat").innerHTML =
    `<b>Two scopes, never added together.</b> The bars above are obligations tagged to
     chemical and plastics industry codes: <b>${short(total)}</b> over eight years. The same
     API also returns all-industry totals for these counties, which come to
     <b>${short(allInd)}</b> — dominated by aerospace, defense and health contracting that
     has nothing to do with polymers. Both are on this page's data file; only the polymer
     slice is charted. <b>An obligation is also not an outlay</b> — it is money committed,
     which may be spent over several years or de-obligated.`;
  document.getElementById("closersub").innerHTML =
    `Routine federal polymer contracting in these twelve counties runs about
     <b>${short(total / fys.length)} a year</b>. Set the Tech Hub award beside that and it
     stops being an abstract figure. <b>The comparison needs care</b> — a competitive grant
     and a procurement obligation are different instruments — but the order of magnitude is
     the context every funder conversation is missing.`;
}

/* Standard methodology + AI disclosure. Generated, not written — see picviz.js. */
await PV.methodology({page: "federal-money", meta: D.meta});
})();
