/* EVERY edge on the page, measured as an offset from the content column.
 *
 *   node tools/edges.mjs [name] [width]
 *
 * Previous audits compared the text measure to the chart CONTAINER and declared victory.
 * A reader does not see containers — they see INK. A chart container can start at the
 * column edge while its first drawn pixel sits 200px inside it, and that reads as a
 * misaligned page no matter what the container says.
 *
 * So this reports, for every block and every chart, where the leftmost and rightmost
 * INK actually lands relative to the column. Anything more than a few px inside the
 * column on the left is a ragged edge the reader will see.
 */
import {pathToFileURL} from "url";
import {chromium} from "./_browser.mjs";

const name = process.argv[2] || "laborshed";
const W = Number(process.argv[3] || 1440);
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: W, height: 1000}});
await p.goto(pathToFileURL(process.cwd() + "/dist/" + name + ".html").href);
await p.waitForTimeout(1000);
const rows = await p.evaluate(() => {
  const col = document.querySelector(".band .wrap");
  const cr = col.getBoundingClientRect();
  const L = cr.left + parseFloat(getComputedStyle(col).paddingLeft);
  const R = cr.right - parseFloat(getComputedStyle(col).paddingRight);
  const out = [];
  const push = (label, l, r) =>
    out.push({label, left: Math.round(l - L), right: Math.round(r - L),
              colw: Math.round(R - L)});

  document.querySelectorAll(".band").forEach((band, bi) => {
    const q = s => band.querySelector(s);
    [["takeaway", ".takeaway"], ["h2", "h2"], ["lede", ".lede"],
     ["src", ".src"], ["note", ".note"]].forEach(([n, sel]) => {
      const e = q(sel); if (!e || !e.getClientRects().length) return;
      const r = e.getBoundingClientRect();
      push(`b${bi} ${n}`, r.left, r.right);
    });
    band.querySelectorAll(".chart svg").forEach((svg, si) => {
      // INK, not the box: the extent of everything actually drawn
      let lo = Infinity, hi = -Infinity;
      svg.querySelectorAll("text,rect,circle,path,line").forEach(el => {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;
        if (getComputedStyle(el).fill === "rgba(0, 0, 0, 0)" &&
            getComputedStyle(el).stroke === "none") return;   // hover targets
        lo = Math.min(lo, r.left); hi = Math.max(hi, r.right);
      });
      if (lo < Infinity) push(`b${bi} chart${si} INK`, lo, hi);
    });
  });
  return out;
});
console.log(`${name} at ${W}px — offsets from the content column (col width ${rows[0]?.colw})\n`);
console.log("  block              left   right   ragged?");
for (const r of rows) {
  const flag = r.left > 6 ? `LEFT +${r.left}` : "";
  console.log(`  ${r.label.padEnd(20)}${String(r.left).padStart(4)}` +
              `${String(r.right).padStart(8)}   ${flag}`);
}
await b.close();
